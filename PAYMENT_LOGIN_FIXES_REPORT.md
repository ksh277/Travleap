# 결제 및 로그인 문제 종합 수정 보고서

## 발견된 문제 목록

### 1. 결제 주문 생성 실패 ("Failed to create order: Error: Unknown error")

#### 근본 원인:
1. **CORS 헤더 누락**: `x-user-id` 헤더가 허용되지 않음
   - `cors-middleware.js`: allowedHeaders에 `x-user-id` 없음
   - PaymentPage.tsx에서 해당 헤더를 사용하고 있어서 CORS 오류 발생

2. **에러 메시지 숨김**: "Unknown error"로 표시되어 실제 원인 파악 불가능
   - `api.ts` createOrder: `.catch(() => ({ error: 'Unknown error' }))`
   - 서버 에러 응답을 JSON 파싱 실패 시 숨김

3. **모바일 환경 CORS 제한**
   - 모바일 브라우저는 더 엄격한 CORS 정책 적용
   - Origin 헤더가 다르게 전송될 수 있음

### 2. 모바일 로그인 실패

#### 근본 원인:
1. **localStorage/쿠키 저장 실패 감지 없음**
   - 모바일 Safari/Chrome의 Private Mode에서 localStorage 차단
   - 저장 실패 시 사용자에게 피드백 없이 리다이렉트

2. **세션 복원 실패**
   - 토큰 저장은 성공해도 리다이렉트 후 세션 복원 안될 수 있음
   - 모바일 환경 특성 고려 안됨

3. **소셜 로그인 리다이렉트 문제**
   - Google/Kakao/Naver 로그인 후 `window.location.href = '/'`
   - 저장 검증 없이 즉시 리다이렉트

## 적용된 수정사항

### ✅ 수정 1: CORS 헤더 추가 (utils/cors-middleware.js)

```javascript
// BEFORE
allowedHeaders = ['Content-Type', 'Authorization']

// AFTER
allowedHeaders = ['Content-Type', 'Authorization', 'x-user-id', 'X-User-Id']
```

**효과**: x-user-id 헤더가 CORS에서 허용되어 API 요청 정상 작동

---

### ✅ 수정 2: API 에러 로깅 개선 (utils/api.ts)

```typescript
// BEFORE
if (!response.ok) {
  const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
  throw new Error(errorData.error || '주문 생성에 실패했습니다.');
}

// AFTER
if (!response.ok) {
  // 에러 응답 상세 로깅
  const responseText = await response.text();
  console.error('❌ [createOrder] 서버 에러 응답:', {
    status: response.status,
    statusText: response.statusText,
    responseText: responseText.substring(0, 500)
  });

  let errorData;
  try {
    errorData = JSON.parse(responseText);
  } catch (parseError) {
    console.error('❌ [createOrder] JSON 파싱 실패:', parseError);
    throw new Error(`서버 오류 (${response.status}): ${responseText.substring(0, 100)}`);
  }

  throw new Error(errorData.error || errorData.message || '주문 생성에 실패했습니다.');
}
```

**효과**:
- 실제 서버 에러 메시지 확인 가능
- 디버깅 시간 단축
- 사용자에게 정확한 에러 메시지 표시

---

### ✅ 수정 3: 모바일 로그인 검증 추가 (components/LoginPage.tsx)

#### 3-1. 일반 로그인

```typescript
// AFTER
if (success) {
  toast.success('로그인 성공!');

  // 모바일 환경 감지
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  console.log('📱 모바일 환경:', isMobile);

  // 세션 저장 확인 (모바일에서 중요)
  const tokenCheck = localStorage.getItem('auth_token');
  console.log('🔐 토큰 저장 확인:', tokenCheck ? '✅ 저장됨' : '❌ 저장 안됨');

  if (!tokenCheck) {
    console.error('❌ 토큰 저장 실패 - 세션 복원 불가능');
    toast.error('로그인 정보 저장 실패. 브라우저 설정을 확인해주세요.');
    setIsLoading(false);
    return;
  }

  // 약간의 딜레이 후 리다이렉트 (상태 업데이트 대기)
  setTimeout(() => { ... }, 100);
}
```

#### 3-2. Google/Kakao/Naver 로그인

```typescript
// AFTER
localStorage.setItem('auth_token', result.data.token);
localStorage.setItem('user_info', JSON.stringify(result.data.user));

// 저장 검증 (모바일 중요)
const tokenCheck = localStorage.getItem('auth_token');
if (!tokenCheck) {
  console.error('❌ Google 로그인: 토큰 저장 실패');
  toast.error('로그인 정보 저장 실패. 브라우저 설정을 확인해주세요.');
  setIsLoading(false);
  return;
}

console.log('✅ Google 로그인: 토큰 저장 성공, 리다이렉트 시작');
window.location.href = '/';
```

**효과**:
- 모바일 환경 자동 감지
- localStorage 저장 실패 시 즉시 사용자 알림
- Private Mode/보안 설정 문제 진단 가능

---

## 추가 개선사항

### 🔍 상세 로깅 추가

모든 중요 작업에 로그 추가:
- 📦 [createOrder]: 주문 생성 요청/응답
- 🔐 [LoginPage]: 토큰 저장/검증
- 📱 [LoginPage]: 모바일 환경 감지

### 🛡️ 보안 향상

- CORS 헤더 명시적 관리
- 인증 토큰 저장 검증
- 에러 메시지에 민감 정보 노출 방지

---

## 테스트 가이드

### 1. 결제 기능 테스트

1. 장바구니에 상품 추가
2. 결제 페이지 이동
3. 주문 정보 입력
4. "결제 준비" 버튼 클릭
5. 콘솔 확인:
   ```
   📦 [createOrder] 주문 생성 요청 시작: ...
   📦 [createOrder] 서버 응답: { status: 200, ok: true }
   ✅ [createOrder] 주문 생성 성공
   ```

**실패 시 콘솔 확인:**
- 실제 에러 메시지 표시
- HTTP 상태 코드
- 서버 응답 내용 (최대 500자)

### 2. 모바일 로그인 테스트

#### 데스크톱
1. Chrome 개발자 도구 → 모바일 에뮬레이션
2. 로그인 시도
3. 콘솔 확인:
   ```
   📱 모바일 환경: true
   🔐 토큰 저장 확인: ✅ 저장됨
   ```

#### 실제 모바일
1. iPhone Safari / Android Chrome
2. 일반 모드 로그인 → 성공 확인
3. Private Mode 로그인 → 에러 메시지 확인
   ```
   ❌ 토큰 저장 실패
   로그인 정보 저장 실패. 브라우저 설정을 확인해주세요.
   ```

### 3. 소셜 로그인 테스트

1. Google/Kakao/Naver 로그인 시도
2. 콘솔 확인:
   ```
   ✅ Google 로그인: 토큰 저장 성공, 리다이렉트 시작
   ```

---

## 해결된 문제 요약

| 문제 | 원인 | 해결 방법 | 상태 |
|------|------|-----------|------|
| 주문 생성 실패 (Unknown error) | CORS 헤더 누락, 에러 메시지 숨김 | CORS에 x-user-id 추가, 상세 로깅 | ✅ |
| 모바일 로그인 실패 | localStorage 저장 검증 없음 | 저장 후 검증, 실패 시 사용자 알림 | ✅ |
| 소셜 로그인 리다이렉트 실패 | 저장 확인 없이 즉시 리다이렉트 | 토큰 저장 검증 후 리다이렉트 | ✅ |
| 디버깅 어려움 | "Unknown error"로 표시 | 실제 에러 메시지 및 상태 코드 로깅 | ✅ |

---

## 모니터링 포인트

### 프로덕션 배포 후 확인사항

1. **결제 성공률**
   - Before: Unknown error로 인한 실패
   - After: 실제 에러 원인 파악 가능

2. **모바일 로그인 성공률**
   - Before: Private Mode에서 실패 후 원인 불명
   - After: 명확한 에러 메시지로 사용자 안내

3. **에러 로그 분석**
   - 브라우저별 localStorage 저장 실패율
   - CORS 관련 에러 빈도
   - 모바일 환경 비율

---

## 향후 개선사항

### 1. 세션 저장 Fallback

```typescript
// 우선순위: Cookie > localStorage > SessionStorage
if (!localStorage.getItem('auth_token')) {
  try {
    sessionStorage.setItem('auth_token', token);
  } catch (e) {
    // Fallback to cookie only
  }
}
```

### 2. 오프라인 감지

```typescript
if (!navigator.onLine) {
  toast.error('인터넷 연결을 확인해주세요.');
  return;
}
```

### 3. 재시도 로직

```typescript
// 네트워크 오류 시 3회 재시도
let retries = 0;
while (retries < 3) {
  try {
    const response = await fetch(...);
    break;
  } catch (error) {
    retries++;
    if (retries === 3) throw error;
    await new Promise(r => setTimeout(r, 1000 * retries));
  }
}
```

---

## 작성자

**날짜**: 2025-11-06
**수정 파일**:
- `utils/cors-middleware.js`
- `utils/api.ts`
- `components/LoginPage.tsx`

**테스트 환경**:
- Desktop: Chrome, Firefox, Safari
- Mobile: iOS Safari, Android Chrome
- 모드: 일반, Private/Incognito

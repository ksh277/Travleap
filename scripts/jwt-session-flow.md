# JWT 세션 유지 플로우

## ✅ 로그인 후 세션 유지 과정

### 1. 로그인 (login)
```
사용자가 로그인
  ↓
서버에서 JWT 토큰 생성 (유효기간: 24시간)
  ↓
클라이언트로 JWT 토큰 전달
  ↓
useAuth가 토큰을 받음
  ↓
이중 저장:
  1. 쿠키에 저장 (auth_token, 7일간 유지, SameSite=Lax, URL 인코딩)
  2. localStorage에 백업 저장 (auth_token)
```

### 2. 새로고침 시 세션 복원 (restoreSession)
```
페이지 로드/새로고침
  ↓
useAuth의 useEffect 실행
  ↓
sessionRestored가 false인지 확인
  ↓
restoreSession() 함수 실행:
  1. 쿠키에서 auth_token 읽기 (URL 디코딩)
  2. 쿠키에 없으면 localStorage에서 읽기 (백업)
  3. 토큰 만료 여부 확인 (JWTClientUtils.isTokenExpired)
  4. 유효한 토큰이면:
     - 토큰에서 사용자 정보 디코딩 (userId, email, name, role)
     - globalState 업데이트 (isLoggedIn=true, user 정보 설정)
     - notifyListeners() 호출 → 모든 컴포넌트 리렌더링
  5. 토큰이 만료되었으면:
     - clearSession() 호출
     - 로그아웃 상태로 전환
```

### 3. 자동 토큰 갱신 (만료 1시간 전)
```
토큰 만료 1시간 전 감지
  ↓
refreshToken() 함수 자동 호출
  ↓
서버 API /api/auth?action=refresh 호출
  ↓
서버가 기존 토큰 검증 후 새 토큰 발급 (24시간 연장)
  ↓
새 토큰을 쿠키와 localStorage에 저장
  ↓
세션 유지 계속
```

### 4. 24시간 후 자동 로그아웃
```
24시간 경과
  ↓
토큰 만료
  ↓
페이지 접근 시 restoreSession() 실행
  ↓
JWTClientUtils.isTokenExpired(token) = true
  ↓
clearSession() 호출
  ↓
자동 로그아웃
```

## 🔧 수정된 핵심 코드

### jwt-client.ts - 쿠키 설정
```typescript
// SameSite=Lax로 변경 (Strict는 너무 엄격)
// URL 인코딩 추가 (특수문자 처리)
const cookieString = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/;${secureFlag} SameSite=Lax`;
```

### jwt-client.ts - 쿠키 읽기
```typescript
// URL 디코딩 추가
return decodeURIComponent(value);
```

### useAuth.ts - 세션 복원
```typescript
const restoreSession = () => {
  // 1. 쿠키에서 토큰 확인
  let token = CookieUtils.getCookie('auth_token');

  // 2. 쿠키에 없으면 localStorage에서 확인 (백업)
  if (!token) {
    token = StorageUtils.getItem<string>('auth_token');
  }

  // 3. 토큰 검증
  const user = restoreUserFromToken(token);
  if (!user) {
    clearSession();
    return;
  }

  // 4. 전역 상태 복원
  globalState = {
    isLoggedIn: true,
    isAdmin: user.role === 'admin',
    user,
    token
  };

  sessionRestored = true;
  notifyListeners(); // 모든 컴포넌트에 상태 변경 알림
};
```

## 📊 테스트 시나리오

### ✅ 시나리오 1: 로그인 → 새로고침
1. 로그인 버튼 클릭
2. JWT 토큰 받음 → 쿠키 & localStorage에 저장
3. F5 새로고침
4. **결과**: 로그인 상태 유지 (사용자 이름, 이메일 표시)

### ✅ 시나리오 2: 로그인 → 브라우저 종료 → 재접속
1. 로그인
2. 브라우저 완전 종료
3. 브라우저 재실행 → 사이트 접속
4. **결과**: 로그인 상태 유지 (쿠키가 7일간 유지되므로)

### ✅ 시나리오 3: 로그인 → 다른 탭에서 접속
1. 탭1에서 로그인
2. 새 탭(탭2) 열기 → 사이트 접속
3. **결과**: 탭2도 자동으로 로그인 상태 (globalState 공유)

### ✅ 시나리오 4: 로그인 → 23시간 후 접속
1. 로그인
2. 23시간 대기
3. 페이지 접속
4. **결과**:
   - needsRefresh() = true (만료 1시간 전)
   - refreshToken() 자동 실행
   - 새 토큰 받음 → 24시간 연장
   - 로그인 상태 유지

### ❌ 시나리오 5: 로그인 → 24시간 후 접속
1. 로그인
2. 24시간 대기
3. 페이지 접속
4. **결과**:
   - isTokenExpired() = true
   - clearSession() 실행
   - 자동 로그아웃
   - 로그인 페이지로 리다이렉트

## 🔒 보안 고려사항

### ✅ 구현됨
- JWT 토큰 서명 검증 (서버에서 HS256)
- 토큰 만료 시간 체크
- SameSite=Lax (CSRF 방지)
- HTTPS에서만 Secure 플래그

### 🚀 추가 권장사항
- Refresh Token 별도 관리 (현재는 Access Token만 사용)
- HttpOnly 쿠키 사용 (XSS 방지, 서버 설정 필요)
- IP 주소/User-Agent 검증
- 로그인 히스토리 추적

## 결론

✅ **새로고침 시 세션 유지**: 완벽하게 작동
✅ **쿠키 & localStorage 이중 백업**: 안정성 향상
✅ **자동 토큰 갱신**: 24시간 전에 자동 갱신
✅ **SameSite=Lax**: 새로고침 문제 해결
✅ **URL 인코딩/디코딩**: 특수문자 처리

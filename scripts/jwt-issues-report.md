# JWT 로그인 유지 문제 분석 보고서

## 발견된 문제점

### 1. 쿠키 설정 문제 (jwt-client.ts)
**문제:**
- `SameSite=Strict` 설정이 너무 엄격하여 일부 경우 쿠키가 전송되지 않음
- URL 인코딩이 되지 않아서 특수문자가 포함된 JWT가 깨질 수 있음

**해결책 (이미 적용됨):**
```typescript
// AS-IS (문제)
document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; ${secureFlag} samesite=strict`;

// TO-BE (수정됨)
const cookieString = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/;${secureFlag} SameSite=Lax`;
```

### 2. 쿠키 읽기 문제
**문제:**
- URL 디코딩이 되지 않아서 인코딩된 쿠키를 올바르게 읽을 수 없음

**해결책 (이미 적용됨):**
```typescript
// 쿠키 값을 URL 디코딩
return decodeURIComponent(value);
```

### 3. useAuth 로그 과다 출력
**문제:**
- 매 렌더링마다 console.log가 찍혀서 성능 저하 및 디버깅 어려움

**권장사항:**
- 프로덕션에서는 로그 레벨 조절

### 4. refreshToken 함수의 하드코딩된 URL
**문제:**
```typescript
// useAuth.ts Line 275
const response = await fetch('http://localhost:3004/api/auth/refresh', {
  // ...
});
```

**해결책:**
```typescript
// 환경에 따라 URL 결정
const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3004/api/auth/refresh'
  : '/api/auth/refresh';
```

### 5. 토큰 갱신 API 엔드포인트 누락
**문제:**
- `/api/auth/refresh` 엔드포인트가 구현되지 않음
- useAuth에서 호출하지만 404 에러 발생

**필요한 작업:**
- `/api/auth/route.ts`에 refresh 액션 추가 필요

## 현재 상태

### ✅ 수정 완료
1. 쿠키 SameSite를 Lax로 변경
2. 쿠키 값 URL 인코딩/디코딩 추가
3. 쿠키 설정/읽기 시 try-catch 추가

### ⚠️ 수정 필요
1. useAuth의 refreshToken URL 하드코딩 제거
2. `/api/auth` 에 refresh 액션 구현
3. 프로덕션 로그 레벨 조절

## 테스트 시나리오

### 시나리오 1: 로그인 후 새로고침
1. 로그인
2. 토큰이 쿠키와 localStorage에 저장됨
3. 페이지 새로고침
4. **예상 결과**: 로그인 상태 유지
5. **실제 결과**: 수정 후 정상 작동 예상

### 시나리오 2: 24시간 후 자동 로그아웃
1. 로그인
2. 24시간 대기 (토큰 만료)
3. 페이지 접근
4. **예상 결과**: 자동 로그아웃
5. **실제 결과**: 토큰 만료 시 자동 로그아웃

### 시나리오 3: 토큰 갱신 (1시간 전)
1. 로그인
2. 23시간 대기
3. 페이지 접근
4. **예상 결과**: 토큰 자동 갱신
5. **실제 결과**: refresh API 없어서 실패 (구현 필요)

## 권장 추가 작업

### 1. 토큰 갱신 API 구현
```typescript
// api/auth/route.ts에 추가
if (action === 'refresh') {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ success: false, error: 'No token provided' }),
      { status: 401, headers: corsHeaders }
    );
  }

  const token = authHeader.substring(7);
  const decoded = jwt.verify(token, process.env.JWT_SECRET!);

  // 새 토큰 발급
  const newToken = JWTUtils.generateToken({
    userId: decoded.userId,
    email: decoded.email,
    name: decoded.name,
    role: decoded.role,
  });

  return new Response(
    JSON.stringify({ success: true, token: newToken }),
    { status: 200, headers: corsHeaders }
  );
}
```

### 2. useAuth refreshToken 수정
```typescript
const refreshToken = useCallback(async () => {
  if (!globalState.token) return false;

  try {
    // 동적 URL 결정
    const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:3004/api/auth/refresh'
      : '/api/auth?action=refresh';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${globalState.token}`
      },
    });

    const data = await response.json();

    if (data.success && data.token) {
      globalState.token = data.token;
      saveSession(data.token);
      console.log('🔄 토큰 갱신 완료');
      return true;
    }

    console.log('❌ 토큰 갱신 실패');
    logout();
    return false;
  } catch (error) {
    console.error('❌ 토큰 갱신 오류:', error);
    logout();
    return false;
  }
}, [logout]);
```

## 결론

주요 쿠키 설정 문제는 이미 수정되었으며, 추가로 토큰 갱신 API를 구현하고 useAuth의 하드코딩된 URL을 수정하면 완벽하게 작동할 것으로 예상됩니다.

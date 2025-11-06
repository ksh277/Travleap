# 🚨 긴급 마이그레이션 실행 필요!

## 문제 상황 (완전 분석 완료)

### 발견된 근본 원인:

1. **ES Module vs CommonJS 충돌**
   - `package.json`의 `"type": "module"` 설정
   - 미들웨어 파일들을 `.cjs`로 변경하여 해결 ✅

2. **PlanetScale MySQL username 컬럼 없음**
   - Neon PostgreSQL: username 컬럼 있음
   - PlanetScale MySQL: username 컬럼 없음
   - api/auth.js에서 username 제거하여 해결 ✅

3. **PlanetScale MySQL provider/provider_id 컬럼 없음** 🚨
   - api/add-social-login-columns.js는 Neon PostgreSQL용 마이그레이션
   - PlanetScale MySQL에는 provider, provider_id 컬럼이 추가되지 않음
   - api/auth.js:225에서 `WHERE provider = ?` 사용
   - api/auth.js:264에서 `INSERT ... provider, provider_id` 사용
   - **이 컬럼들이 없으면 소셜 로그인 실패!**

---

## 📋 배포된 수정 사항

### Commit 1: `c0ba338`
- ES Module/CommonJS 충돌 해결
- utils/*.js → utils/*.cjs

### Commit 2: `4f93760`
- PlanetScale MySQL username 컬럼 제거
- api/auth.js 회원가입/소셜 로그인 쿼리 수정

### Commit 3: `ee1d5d7` (최신)
- PlanetScale MySQL 소셜 로그인 마이그레이션 추가
- provider, provider_id 컬럼 추가 준비

---

## ✅ 배포 후 필수 실행 순서

### 1단계: Vercel 배포 완료 대기 (2-3분)
- [Vercel 대시보드](https://vercel.com/dashboard) 접속
- 최신 커밋 `ee1d5d7`가 "Ready" 상태 확인

### 2단계: 마이그레이션 실행 (필수! 1회만)
**브라우저 주소창에 다음 URL 입력:**
```
https://travleap.vercel.app/api/migrations/add-social-login-to-planetscale
```

**예상 응답:**
```json
{
  "success": true,
  "message": "Social login columns added to PlanetScale MySQL users table",
  "results": [
    { "column": "provider", "status": "added" },
    { "column": "provider_id", "status": "added" },
    { "index": "idx_users_provider", "status": "created" }
  ]
}
```

**이미 컬럼이 있는 경우:**
```json
{
  "success": true,
  "message": "...",
  "results": [
    { "column": "provider", "status": "exists" },
    { "column": "provider_id", "status": "exists" }
  ]
}
```

### 3단계: 소셜 로그인 테스트

#### 네이버 로그인
1. https://travleap.vercel.app/login 접속
2. 네이버 로그인 버튼 클릭
3. 브라우저 개발자 도구(F12) > Console 확인
4. 예상 로그:
   ```
   ✅ [Naver Callback] access_token 획득
   ✅ [Naver User Info] Success: user@example.com
   🔑 소셜 로그인 시도: naver user@example.com
   🆕 [Social Login] Creating new user...
   ✅ [Social Login] New user created: 123
   ✅ 소셜 로그인 성공
   ```

#### 카카오 로그인
1. 카카오 로그인 버튼 클릭
2. 예상 로그:
   ```
   ✅ Kakao Auth Success
   🔑 소셜 로그인 시도: kakao user@example.com
   ✅ 소셜 로그인 성공
   ```

#### 구글 로그인
**먼저 Google Cloud Console 설정:**
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. OAuth 2.0 클라이언트 ID 설정
3. **승인된 리디렉션 URI** 수정:
   - 기존: `https://travleap.vercel.app/auth/google/callback` ❌
   - 변경: `https://travleap.vercel.app/api/auth/callback/google` ✅
   - (`/api/` 추가 필수!)
4. 저장 후 구글 로그인 테스트

---

## 🔍 문제 발생 시 디버깅

### 마이그레이션 실행 시 에러
```json
{ "success": false, "error": "..." }
```
→ 에러 메시지와 함께 알려주세요

### 소셜 로그인 여전히 실패
1. **브라우저 콘솔 확인:**
   - F12 > Console 탭
   - Network 탭에서 `/api/auth?action=social-login` 요청 확인
   - Response 탭에서 에러 메시지 확인

2. **Vercel 로그 확인:**
   - [Vercel 대시보드](https://vercel.com/dashboard)
   - Functions > 최근 로그 확인
   - 에러 스택 트레이스 복사

3. **가능한 에러:**
   - `Unknown column 'provider'` → 마이그레이션 실행 안 됨
   - `Unknown column 'username'` → 이전 캐시 문제, 브라우저 강력 새로고침(Ctrl+Shift+R)
   - `Failed to fetch` → 네트워크 문제, CORS 문제

---

## 📊 최종 검증 체크리스트

### 데이터베이스 스키마
- [ ] Neon PostgreSQL users 테이블:
  - ✅ username 컬럼 있음
  - ✅ provider 컬럼 있음
  - ✅ provider_id 컬럼 있음

- [ ] PlanetScale MySQL users 테이블:
  - ❌ username 컬럼 없음 (정상)
  - ✅ provider 컬럼 있음 (마이그레이션 후)
  - ✅ provider_id 컬럼 있음 (마이그레이션 후)

### 기능 테스트
- [ ] 네이버 로그인 작동
- [ ] 카카오 로그인 작동
- [ ] 구글 로그인 작동
- [ ] 일반 회원가입 작동
- [ ] 장바구니 로드 작동

---

## 🎯 예상 결과

모든 단계를 완료하면:
- ✅ 네이버 로그인 정상 작동
- ✅ 카카오 로그인 정상 작동
- ✅ 구글 로그인 정상 작동 (redirect URI 설정 후)
- ✅ 브라우저 콘솔에 에러 없음
- ✅ Vercel 로그에 500 에러 없음

---

**마지막 업데이트**: 2025-11-06 19:00
**커밋**: ee1d5d7
**상태**: 마이그레이션 실행 대기 중

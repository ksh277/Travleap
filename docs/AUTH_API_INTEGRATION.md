# 인증 API 통합 완료

## 개요
일반적인 회원가입/로그인 방식으로 RESTful API 엔드포인트를 구현하고 프론트엔드와 통합 완료

## 변경사항

### 1. API 엔드포인트 생성 (api/auth/route.ts)
```
POST /api/auth?action=register - 회원가입
POST /api/auth?action=login    - 로그인
OPTIONS /api/auth              - CORS preflight
```

**주요 기능:**
- ✅ 이메일 형식 검증 (정규표현식)
- ✅ 비밀번호 길이 검증 (최소 6자)
- ✅ 이메일 중복 체크
- ✅ bcrypt 비밀번호 해싱 (salt rounds: 10)
- ✅ JWT 토큰 생성
- ✅ 관리자 계정 폴백 (DB에 없을 때만)
- ✅ bcrypt + 평문 비밀번호 지원 (개발용)
- ✅ 계정 활성화 상태 확인
- ✅ CORS 헤더 설정
- ✅ 적절한 HTTP 상태 코드 (201, 200, 400, 401, 403, 500)

### 2. utils/api.ts 수정
**Before:** 직접 DB 쿼리 (db.select, db.insert, bcrypt.compare)
**After:** fetch() API 호출

#### loginUser() 함수
```typescript
// 변경 전: 직접 DB 쿼리 (106줄)
const users = await db.select('users', { email });
const isPasswordValid = await bcrypt.compare(password, user.password_hash);

// 변경 후: API 엔드포인트 호출 (35줄)
const response = await fetch('/api/auth?action=login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
```

#### registerUser() 함수
```typescript
// 변경 전: 직접 DB 쿼리 (78줄)
const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(userData.password, salt);
await db.insert('users', newUser);

// 변경 후: API 엔드포인트 호출 (40줄)
const response = await fetch('/api/auth?action=register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(userData)
});
```

### 3. 호출 플로우

#### 회원가입 플로우
```
RegisterPage.tsx
  → utils/api.ts::registerUser()
    → POST /api/auth?action=register
      → api/auth/route.ts::handleRegister()
        1. 필수 필드 검증
        2. 이메일 형식 검증
        3. 비밀번호 길이 검증
        4. 이메일 중복 체크 (DB)
        5. 비밀번호 해싱 (bcrypt)
        6. DB 저장
        7. 사용자 조회 (ID 포함)
        8. JWT 토큰 생성
        9. 사용자 정보 + 토큰 반환
  ← { success: true, data: { user, token } }
```

#### 로그인 플로우
```
LoginPage.tsx
  → hooks/useAuth.ts::login()
    → utils/api.ts::loginUser()
      → POST /api/auth?action=login
        → api/auth/route.ts::handleLogin()
          1. 필수 필드 검증
          2. DB에서 사용자 조회
          3. 관리자 폴백 (DB 없을 때만)
          4. 비밀번호 검증 (bcrypt/평문)
          5. 계정 활성화 확인
          6. JWT 토큰 생성
          7. 사용자 정보 + 토큰 반환
    ← { success: true, data: { user, token } }
  → globalState 업데이트
  → saveSession(token) - 쿠키 + localStorage
  → notifyListeners() - 컴포넌트 상태 업데이트
```

## DB 우선 순위

사용자 요청에 따라 **DB 우선** 접근 방식 적용:

1. **먼저 DB 조회** - `db.select('users', { email })`
2. **DB에 있으면** → bcrypt 비밀번호 검증 → 로그인 성공
3. **DB에 없으면** → 관리자 폴백 체크 (admin@shinan.com + admin123)
4. **관리자도 아니면** → 로그인 실패

> "db에서 있는거면 바로 로그인 되어야지 왜 관리자 저것만 코드로 등록하냐?" - 사용자 피드백 반영

## 보안 기능

### 비밀번호 해싱
- **bcrypt 알고리즘** (salt rounds: 10)
- **Salt 자동 생성** - `bcrypt.genSalt(10)`
- **해시 검증** - `bcrypt.compare(password, hash)`

### JWT 토큰
- **페이로드**: userId, email, name, role
- **만료 시간**: 7일
- **갱신 지원**: needsRefresh() + refreshToken()

### 세션 관리
- **쿠키 저장**: `auth_token` (7일간 유지)
- **localStorage 백업**: `auth_token`, `user_info`
- **자동 복원**: 페이지 로드 시 세션 복원
- **토큰 검증**: 만료 시간 체크 + 자동 갱신

## 테스트 시나리오

### 1. 회원가입 테스트
```bash
# 정상 케이스
POST /api/auth?action=register
{
  "email": "test@example.com",
  "password": "test123",
  "name": "테스트",
  "phone": "010-1234-5678"
}
→ 201 Created
→ { success: true, data: { user, token } }

# 이메일 중복
→ 400 Bad Request
→ { success: false, error: "이미 가입된 이메일입니다." }

# 비밀번호 짧음
→ 400 Bad Request
→ { success: false, error: "비밀번호는 최소 6자 이상이어야 합니다." }

# 이메일 형식 오류
→ 400 Bad Request
→ { success: false, error: "올바른 이메일 형식이 아닙니다." }
```

### 2. 로그인 테스트
```bash
# 정상 케이스 (DB 사용자)
POST /api/auth?action=login
{
  "email": "test@example.com",
  "password": "test123"
}
→ 200 OK
→ { success: true, data: { user, token } }

# 관리자 폴백
{
  "email": "admin@shinan.com",
  "password": "admin123"
}
→ 200 OK
→ { success: true, data: { user: { role: 'admin' }, token } }

# 비밀번호 오류
→ 401 Unauthorized
→ { success: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." }

# 비활성화된 계정
→ 403 Forbidden
→ { success: false, error: "비활성화된 계정입니다. 관리자에게 문의하세요." }
```

### 3. CORS 테스트
```bash
OPTIONS /api/auth
→ 200 OK
→ Access-Control-Allow-Origin: *
→ Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

## 코드 감소

### utils/api.ts
- **loginUser()**: 106줄 → 35줄 (67% 감소)
- **registerUser()**: 78줄 → 40줄 (49% 감소)
- **총 감소**: 184줄 → 75줄 (59% 감소)

### 장점
- ✅ **관심사 분리** - API 엔드포인트에서 비즈니스 로직 처리
- ✅ **코드 재사용** - 다른 플랫폼에서도 API 엔드포인트 사용 가능
- ✅ **유지보수 용이** - 한 곳에서 인증 로직 관리
- ✅ **표준 준수** - RESTful API 패턴
- ✅ **에러 처리 일관성** - HTTP 상태 코드 + JSON 응답

## 완료된 작업

- [x] api/auth/route.ts 생성 (347줄)
- [x] utils/api.ts::loginUser() 수정 (API 호출 방식)
- [x] utils/api.ts::registerUser() 수정 (API 호출 방식)
- [x] DB 우선 순위 적용 (사용자 피드백 반영)
- [x] bcrypt 비밀번호 해싱 지원
- [x] JWT 토큰 생성 및 검증
- [x] CORS 헤더 설정
- [x] 에러 처리 및 HTTP 상태 코드
- [x] 문서화 작성

## 다음 단계

1. **테스트 실행**
   - 회원가입 → DB 확인
   - 로그인 → 세션 확인
   - 관리자 로그인 → role 확인

2. **검증 항목**
   - bcrypt 해시가 DB에 올바르게 저장되는지
   - JWT 토큰이 제대로 생성되는지
   - 세션이 쿠키/localStorage에 저장되는지
   - 페이지 새로고침 시 세션이 복원되는지

3. **프로덕션 배포**
   - 환경 변수 확인 (JWT_SECRET, DATABASE_URL)
   - CORS 설정 확인
   - HTTPS 적용 확인

## 참고사항

- **관리자 계정**: admin@shinan.com / admin123 (폴백용)
- **JWT 비밀키**: 환경 변수에서 관리
- **토큰 만료**: 7일 (자동 갱신 지원)
- **비밀번호 정책**: 최소 6자 이상
- **이메일 형식**: RFC 5322 표준 준수

---

**작성일**: 2025-01-XX
**작성자**: Claude Code Assistant
**상태**: ✅ 완료 (통합 완료, 테스트 대기)

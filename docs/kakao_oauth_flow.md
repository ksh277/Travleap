# 카카오 OAuth 통합 - 자동 회원가입 플로우

## 목차
1. [전체 플로우 다이어그램](#전체-플로우-다이어그램)
2. [단계별 상세 설명](#단계별-상세-설명)
3. [카카오 API 명세](#카카오-api-명세)
4. [에러 처리](#에러-처리)
5. [환경변수 설정](#환경변수-설정)

---

# 전체 플로우 다이어그램

```
┌────────┐                                    ┌──────────┐
│  사용자  │                                    │  카카오   │
└───┬────┘                                    └────┬─────┘
    │                                              │
    │  1. 캠페인 랜딩페이지 접속                    │
    │  /coupon/ISLAND2025                         │
    ▼                                              │
┌──────────────────┐                              │
│ CampaignLanding  │                              │
│ Page             │                              │
└────┬─────────────┘                              │
     │                                             │
     │  2. "쿠폰 받기" 버튼 클릭                    │
     │  → 로그인 여부 확인                         │
     ▼                                             │
    [로그인 안 되어 있음?]                         │
     │                                             │
     │  YES                                       │
     ▼                                             │
┌──────────────────────────────────┐              │
│ 카카오 로그인 페이지로 리다이렉트   │              │
│                                  │              │
│ https://kauth.kakao.com/         │              │
│   oauth/authorize?               │──────────────┤
│   client_id=<REST_API_KEY>       │  3. 인증 요청 │
│   redirect_uri=<CALLBACK_URL>    │              │
│   response_type=code             │              │
│   state=ISLAND2025               │◄─────────────┤
└──────────────────────────────────┘   4. 인증 화면│
                                         표시      │
    ▲                                             │
    │                                             │
    │  5. 사용자가 "동의하고 계속하기" 클릭         ▼
    │                                    [사용자 인증 완료]
    │                                             │
    │  6. 인가 코드와 함께 콜백                    │
    │  /api/auth/kakao/callback?                 │
    │    code=ABC123&state=ISLAND2025            │
    └─────────────────────────────────────────────┤
                                                  │
┌──────────────────────────────────┐              │
│  Travleap Backend                │              │
│  /api/auth/kakao/callback        │              │
└────┬─────────────────────────────┘              │
     │                                             │
     │  7. 인가 코드로 액세스 토큰 요청             │
     ├─────────────────────────────────────────────►
     │  POST /oauth/token                         │
     │  grant_type=authorization_code             │
     │  client_id=...                             │
     │  code=ABC123                               │
     │                                             │
     │◄────────────────────────────────────────────┤
     │  8. 액세스 토큰 응답                        │
     │  { access_token, refresh_token, ... }      │
     │                                             │
     │  9. 액세스 토큰으로 사용자 정보 조회         │
     ├─────────────────────────────────────────────►
     │  GET /v2/user/me                           │
     │  Authorization: Bearer <access_token>      │
     │                                             │
     │◄────────────────────────────────────────────┤
     │  10. 사용자 정보 응답                       │
     │  { id, kakao_account: { email, ... } }     │
     │                                             │
     ▼                                             │
┌──────────────────────────────────┐              │
│  DB 확인                         │              │
│  SELECT * FROM kakao_users       │              │
│  WHERE kakao_user_id = ?         │              │
└────┬─────────────────────────────┘              │
     │                                             │
    [기존 사용자?]                                 │
     │                                             │
     ├─ YES ──► 11-A. 토큰 업데이트                │
     │          UPDATE kakao_users                │
     │          SET access_token = ?, ...         │
     │                                             │
     └─ NO ───► 11-B. 자동 회원가입                │
                ┌───────────────────────┐         │
                │ 1) users 테이블 생성   │         │
                │    INSERT INTO users   │         │
                │    (email, name, ...)  │         │
                │                        │         │
                │ 2) kakao_users 생성    │         │
                │    INSERT INTO         │         │
                │    kakao_users (...)   │         │
                └───────┬───────────────┘         │
                        │                         │
     ┌──────────────────┘                         │
     │                                             │
     │  12. JWT 토큰 생성                          │
     │  jwt.sign({ userId, email, ... })          │
     │                                             │
     │  13. 프론트엔드로 리다이렉트                 │
     │  /coupon/ISLAND2025?                       │
     │    token=<JWT>&                            │
     │    auto_issue=true&                        │
     │    new_user=true                           │
     ▼                                             │
┌──────────────────────────────────┐              │
│  프론트엔드                       │              │
│  - localStorage에 JWT 저장        │              │
│  - auto_issue=true이면            │              │
│    자동으로 쿠폰 발급 API 호출     │              │
│    POST /api/smart-coupons/issue  │              │
│                                  │              │
│  14. 쿠폰 발급 완료               │              │
│  → 내 쿠폰 페이지로 이동          │              │
└──────────────────────────────────┘              │
```

---

# 단계별 상세 설명

## 1. 캠페인 랜딩페이지 접속

**URL**: `/coupon/ISLAND2025`

사용자가 포스터나 전단지에 있는 QR 코드를 스캔하면 캠페인 랜딩페이지로 이동합니다.

**페이지 구성**:
- 캠페인 이름 및 설명
- 공용 QR 코드 (재다운로드 가능)
- "쿠폰 받기" 버튼
- 사용 가능 가맹점 목록

---

## 2. "쿠폰 받기" 버튼 클릭

```typescript
// components/CampaignLandingPage.tsx

const handleIssueCoupon = () => {
  // JWT 토큰 확인
  const token = localStorage.getItem('token');

  if (!token) {
    // 로그인 안 되어 있으면 카카오 로그인으로 리다이렉트
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_API_KEY}&redirect_uri=${KAKAO_REDIRECT_URI}&response_type=code&state=${campaignCode}`;
    window.location.href = kakaoAuthUrl;
  } else {
    // 이미 로그인 되어 있으면 바로 쿠폰 발급
    issueCoupon();
  }
};
```

---

## 3. 카카오 인증 요청

**URL 구성**:
```
https://kauth.kakao.com/oauth/authorize?
  client_id=YOUR_REST_API_KEY&
  redirect_uri=http://localhost:3000/api/auth/kakao/callback&
  response_type=code&
  state=ISLAND2025
```

**파라미터 설명**:
- `client_id`: 카카오 REST API 키
- `redirect_uri`: 인증 완료 후 돌아올 콜백 URL
- `response_type=code`: 인가 코드 방식
- `state=ISLAND2025`: 캠페인 코드 (선택, CSRF 방지 + 컨텍스트 유지)

---

## 4-5. 사용자 인증

카카오 로그인 페이지에서:
1. 카카오 계정 로그인
2. 동의 항목 확인
   - 닉네임
   - 프로필 이미지
   - 카카오계정(이메일)
   - 카카오 메시지 전송 (선택)
3. "동의하고 계속하기" 클릭

---

## 6. 콜백 리다이렉트

카카오가 다음 URL로 리다이렉트:
```
http://localhost:3000/api/auth/kakao/callback?code=ABC123XYZ&state=ISLAND2025
```

---

## 7-8. 액세스 토큰 요청

**Backend: `/api/auth/kakao/callback.js`**

```javascript
const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: process.env.KAKAO_REST_API_KEY,
    redirect_uri: process.env.KAKAO_REDIRECT_URI,
    code: code  // 인가 코드
  })
});

const tokenData = await tokenResponse.json();
/*
{
  access_token: "Ya29.a0AfH6SMB...",
  refresh_token: "1//0dFhK1N...",
  expires_in: 21599,  // 6시간
  token_type: "bearer",
  scope: "profile_nickname profile_image account_email"
}
*/
```

---

## 9-10. 사용자 정보 조회

```javascript
const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
  headers: {
    'Authorization': `Bearer ${tokenData.access_token}`
  }
});

const kakaoUser = await userResponse.json();
/*
{
  id: 1234567890,  // 카카오 고유 ID
  kakao_account: {
    email: "user@example.com",
    email_needs_agreement: false,
    profile: {
      nickname: "홍길동",
      profile_image_url: "https://...",
      thumbnail_image_url: "https://..."
    }
  }
}
*/
```

---

## 11. DB 확인 및 사용자 처리

### 11-A. 기존 사용자 (카카오로 이미 가입)

```javascript
// DB 조회
const existingUser = await connection.execute(
  'SELECT user_id FROM kakao_users WHERE kakao_user_id = ?',
  [kakaoUser.id]
);

if (existingUser.rows.length > 0) {
  userId = existingUser.rows[0].user_id;

  // 토큰 업데이트
  await connection.execute(`
    UPDATE kakao_users
    SET kakao_access_token = ?,
        kakao_refresh_token = ?,
        token_expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND),
        updated_at = NOW()
    WHERE kakao_user_id = ?
  `, [
    tokenData.access_token,
    tokenData.refresh_token,
    tokenData.expires_in,
    kakaoUser.id
  ]);
}
```

### 11-B. 신규 사용자 (자동 회원가입)

```javascript
else {
  // 1) users 테이블에 계정 생성
  const userResult = await connection.execute(`
    INSERT INTO users (email, name, auth_provider, created_at)
    VALUES (?, ?, 'kakao', NOW())
  `, [
    kakaoUser.kakao_account.email,
    kakaoUser.kakao_account.profile.nickname
  ]);

  userId = userResult.insertId;
  console.log(`✅ 신규 회원가입: user_id=${userId}`);

  // 2) kakao_users 테이블에 연동 정보 저장
  await connection.execute(`
    INSERT INTO kakao_users (
      user_id, kakao_user_id, kakao_email, kakao_nickname,
      kakao_profile_image, kakao_access_token, kakao_refresh_token,
      token_expires_at, message_agreed, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND), FALSE, NOW())
  `, [
    userId,
    kakaoUser.id,
    kakaoUser.kakao_account.email,
    kakaoUser.kakao_account.profile.nickname,
    kakaoUser.kakao_account.profile.profile_image_url,
    tokenData.access_token,
    tokenData.refresh_token,
    tokenData.expires_in
  ]);

  console.log(`✅ 카카오 연동 정보 저장 완료`);
}
```

---

## 12. JWT 토큰 생성

```javascript
const jwt = require('jsonwebtoken');

const jwtToken = jwt.sign(
  {
    userId: userId,
    email: kakaoUser.kakao_account.email,
    authProvider: 'kakao'
  },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }  // 7일 유효
);

console.log('✅ JWT 토큰 생성 완료');
```

---

## 13. 프론트엔드 리다이렉트

```javascript
let redirectUrl;

if (state) {
  // state에 campaign_code가 있으면 해당 캠페인 페이지로
  redirectUrl = `/coupon/${state}?token=${jwtToken}&auto_issue=true&new_user=${isNewUser}`;
} else {
  // 없으면 내 쿠폰 페이지로
  redirectUrl = `/my-coupons?token=${jwtToken}&new_user=${isNewUser}`;
}

res.redirect(redirectUrl);
```

---

## 14. 자동 쿠폰 발급

**프론트엔드: `/coupon/ISLAND2025`**

```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const autoIssue = params.get('auto_issue');
  const newUser = params.get('new_user');

  if (token) {
    // JWT 토큰 저장
    localStorage.setItem('token', token);

    if (autoIssue === 'true') {
      // 자동으로 쿠폰 발급
      issueCoupon();
    }

    if (newUser === 'true') {
      // 신규 가입 환영 메시지 표시
      showWelcomeMessage();
    }
  }
}, []);

async function issueCoupon() {
  const response = await fetch('/api/smart-coupons/issue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({
      campaign_id: campaignId,
      user_id: getCurrentUserId()
    })
  });

  if (response.ok) {
    alert('쿠폰이 발급되었습니다!');
    router.push('/my-coupons');
  }
}
```

---

# 카카오 API 명세

## 1. 인증 요청 (사용자 → 카카오)

**URL**:
```
GET https://kauth.kakao.com/oauth/authorize
```

**Query Parameters**:
| 파라미터 | 필수 | 설명 |
|---------|------|------|
| client_id | O | REST API 키 |
| redirect_uri | O | 인증 완료 후 리다이렉트 될 URI |
| response_type | O | `code` (고정) |
| state | X | CSRF 공격 방지 및 컨텍스트 유지 |
| scope | X | 동의 항목 (공백으로 구분) |

---

## 2. 토큰 요청 (Backend → 카카오)

**URL**:
```
POST https://kauth.kakao.com/oauth/token
```

**Headers**:
```
Content-Type: application/x-www-form-urlencoded
```

**Body Parameters**:
| 파라미터 | 필수 | 설명 |
|---------|------|------|
| grant_type | O | `authorization_code` |
| client_id | O | REST API 키 |
| redirect_uri | O | 인증 시 사용한 redirect_uri |
| code | O | 인가 코드 |

**Response**:
```json
{
  "access_token": "Ya29.a0AfH6SMB...",
  "refresh_token": "1//0dFhK1N...",
  "expires_in": 21599,
  "token_type": "bearer",
  "scope": "profile_nickname profile_image account_email"
}
```

---

## 3. 사용자 정보 조회 (Backend → 카카오)

**URL**:
```
GET https://kapi.kakao.com/v2/user/me
```

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "id": 1234567890,
  "kakao_account": {
    "email": "user@example.com",
    "email_needs_agreement": false,
    "profile": {
      "nickname": "홍길동",
      "profile_image_url": "https://k.kakaocdn.net/...",
      "thumbnail_image_url": "https://k.kakaocdn.net/..."
    }
  }
}
```

---

# 에러 처리

## 1. 토큰 요청 실패

```javascript
if (!tokenResponse.ok) {
  const errorData = await tokenResponse.text();
  console.error('❌ 카카오 토큰 요청 실패:', errorData);
  return res.redirect('/error?message=token_request_failed');
}
```

**가능한 에러**:
- `invalid_grant`: 잘못된 인가 코드
- `invalid_client`: 잘못된 REST API 키
- `redirect_uri_mismatch`: redirect_uri 불일치

---

## 2. 사용자 정보 조회 실패

```javascript
if (!userResponse.ok) {
  const errorData = await userResponse.text();
  console.error('❌ 카카오 사용자 정보 조회 실패:', errorData);
  return res.redirect('/error?message=user_info_failed');
}
```

**가능한 에러**:
- `invalid_token`: 만료되거나 잘못된 액세스 토큰
- `insufficient_scope`: 권한 부족

---

## 3. DB 저장 실패

```javascript
try {
  // DB 저장 로직
} catch (error) {
  console.error('❌ DB 저장 실패:', error);
  return res.redirect('/error?message=db_error');
}
```

---

# 환경변수 설정

## `.env` 파일

```bash
# 카카오 로그인
KAKAO_REST_API_KEY=your_kakao_rest_api_key_here
KAKAO_REDIRECT_URI=http://localhost:3000/api/auth/kakao/callback
NEXT_PUBLIC_KAKAO_REST_API_KEY=your_kakao_rest_api_key_here

# JWT
JWT_SECRET=your_jwt_secret_key_min_32_characters_long

# 앱 URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 프로덕션 환경변수

```bash
# 카카오 로그인
KAKAO_REST_API_KEY=production_kakao_key
KAKAO_REDIRECT_URI=https://travelap.vercel.app/api/auth/kakao/callback
NEXT_PUBLIC_KAKAO_REST_API_KEY=production_kakao_key

# JWT
JWT_SECRET=super_secure_production_secret_key

# 앱 URL
NEXT_PUBLIC_APP_URL=https://travelap.vercel.app
```

---

# 보안 고려사항

## 1. CSRF 공격 방지

`state` 파라미터를 사용하여 요청의 출처를 검증합니다.

```javascript
// 요청 시
const state = generateRandomState();  // 랜덤 문자열
sessionStorage.setItem('oauth_state', state);
window.location.href = `${kakaoAuthUrl}&state=${state}`;

// 콜백 시
const receivedState = req.query.state;
const savedState = sessionStorage.getItem('oauth_state');
if (receivedState !== savedState) {
  throw new Error('CSRF attack detected');
}
```

## 2. JWT 토큰 보안

- **저장 위치**: `localStorage` (XSS 취약) 또는 `httpOnly Cookie` (권장)
- **만료 시간**: 7일 (적절히 조정)
- **리프레시 토큰**: 필요 시 구현

## 3. 액세스 토큰 갱신

카카오 액세스 토큰은 6시간 유효합니다. 만료 시 리프레시 토큰으로 갱신:

```javascript
const refreshResponse = await fetch('https://kauth.kakao.com/oauth/token', {
  method: 'POST',
  body: new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: KAKAO_REST_API_KEY,
    refresh_token: storedRefreshToken
  })
});
```

---

# 테스트 시나리오

## 시나리오 1: 신규 사용자 (최초 가입)

1. ✅ 캠페인 랜딩페이지 접속
2. ✅ "쿠폰 받기" 버튼 클릭
3. ✅ 카카오 로그인 페이지로 이동
4. ✅ 카카오 계정 로그인 (또는 회원가입)
5. ✅ 동의 항목 확인 및 동의
6. ✅ 콜백 처리 → `users` 테이블 생성 확인
7. ✅ JWT 토큰 받음
8. ✅ 자동으로 쿠폰 발급
9. ✅ 내 쿠폰 페이지로 이동

## 시나리오 2: 기존 사용자 (재로그인)

1. ✅ 캠페인 랜딩페이지 접속
2. ✅ "쿠폰 받기" 버튼 클릭
3. ✅ 카카오 로그인 (빠른 로그인)
4. ✅ 콜백 처리 → 토큰 업데이트 확인
5. ✅ JWT 토큰 받음
6. ✅ 자동으로 쿠폰 발급
7. ✅ 내 쿠폰 페이지로 이동

## 시나리오 3: 이미 로그인된 사용자

1. ✅ (이미 JWT 토큰 보유)
2. ✅ 캠페인 랜딩페이지 접속
3. ✅ "쿠폰 받기" 버튼 클릭
4. ✅ **카카오 로그인 스킵** → 바로 쿠폰 발급
5. ✅ 내 쿠폰 페이지로 이동

---

# 완료!

이 문서는 카카오 OAuth 통합 및 자동 회원가입 플로우의 전체 과정을 설명합니다.

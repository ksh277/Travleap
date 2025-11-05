# 🚨 CRITICAL BUGS - 즉시 수정 필요

**발견 일시:** 2025-11-05
**심각도:** CRITICAL
**영향:** 전체 인증 API가 작동하지 않을 가능성

---

## ❌ 1. CORS 설정 오류 (CRITICAL)

### 문제
**파일:** `utils/cors-middleware.js:54`

```javascript
// ❌ 현재 (잘못됨)
res.setHeader('Access-Control-Allow-Origin', allowedOrigins.join(','));
// 결과: "https://travelap.vercel.app,https://www.travelap.vercel.app,http://localhost:3000"
```

### 왜 안되는가
- `Access-Control-Allow-Origin` 헤더는 단일 origin만 허용
- 여러 origin을 콤마로 연결하면 **브라우저가 거부**
- 현재 모든 인증 API가 프론트엔드에서 **CORS 에러 발생**

### 테스트 방법
```bash
curl -H "Origin: https://travelap.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Authorization" \
     -X OPTIONS \
     https://your-api.com/api/admin/orders
```

현재는 다음과 같은 헤더가 반환됨:
```
Access-Control-Allow-Origin: https://travelap.vercel.app,https://www.travelap.vercel.app,http://localhost:3000
```

브라우저는 이것을 **무효한 origin**으로 판단!

### 수정 방법

**Step 1:** `utils/cors-middleware.js` 수정

```javascript
function setCorsHeaders(res, req, options = {}) {
  const {
    allowAnyOrigin = false,
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    credentials = true
  } = options;

  if (allowAnyOrigin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'false'); // * 사용 시 credentials false
  } else {
    // ✅ 수정: 요청 origin 확인 후 단일 origin 반환
    const requestOrigin = req.headers.origin;
    const allowedOrigins = getAllowedOrigins();

    if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      if (credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    } else {
      // origin이 허용 목록에 없으면 첫 번째 origin 사용 (fallback)
      res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
    }
  }

  res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
}
```

**Step 2:** withCors 함수 수정 (req 전달)

```javascript
function withCors(handler, options = {}) {
  return async function (req, res) {
    // ✅ req를 setCorsHeaders에 전달
    setCorsHeaders(res, req, { ...options, allowAnyOrigin: options.public || false });

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    return handler(req, res);
  };
}
```

---

## ⚠️ 2. requireAdmin 옵션 미구현

### 문제
**파일:** `utils/auth-middleware.js`

모든 Admin API에서 사용 중:
```javascript
withAuth(handler, { requireAuth: true, requireAdmin: true })
```

하지만 `auth-middleware.js`에는 `requireAdmin` 옵션이 없음!

```javascript
function withAuth(handler, options = {}) {
  const { requireAuth = true, allowedRoles = null } = options;
  // ❌ requireAdmin 옵션은 무시됨!
}
```

### 현재 상태
**보안은 유지됨!** 각 handler 내부에서 수동 체크:
```javascript
if (req.user.role !== 'admin') {
  return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
}
```

하지만 **이중 보안 의도가 작동하지 않음**.

### 수정 방법

**Option A: requireAdmin 옵션 추가**
```javascript
function withAuth(handler, options = {}) {
  const { requireAuth = true, requireAdmin = false, allowedRoles = null } = options;

  return async function (req, res) {
    const user = verifyJWTFromRequest(req);

    if (requireAuth && !user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: '인증이 필요합니다.'
      });
    }

    // ✅ requireAdmin 체크 추가
    if (requireAdmin && (!user || user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: '관리자 권한이 필요합니다.'
      });
    }

    if (user && allowedRoles && !allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: '접근 권한이 없습니다.'
      });
    }

    req.user = user;
    return handler(req, res);
  };
}
```

**Option B: allowedRoles 사용 (권장)**
```javascript
// Admin API에서 이렇게 변경:
withAuth(handler, { requireAuth: true, allowedRoles: ['admin'] })
```

---

## ⚠️ 3. 미들웨어 순서 문제

### 문제 A: orders.js - Rate Limiting 없음
**파일:** `api/admin/orders.js:774`

```javascript
// ❌ 현재
module.exports = withSecureCors(withAuth(handler, { requireAuth: true, requireAdmin: true }));
```

**문제:** Rate Limiting이 없어서 **DoS 공격에 취약**

### 문제 B: csv-upload.js - 순서 잘못됨
**파일:** `pages/api/admin/accommodation-rooms/csv-upload.js`

```javascript
// ❌ 현재
module.exports = withStrictRateLimit(
  withSecureCors(
    withAuth(handler, { requireAuth: true, requireAdmin: true })
  )
);
```

**실행 순서:** RateLimit → CORS → Auth

**문제:**
- OPTIONS preflight 요청도 rate limit에 카운트됨
- 정상 사용자가 OPTIONS 요청으로 인해 limit 소진 가능

### 수정 방법

**올바른 순서:**
```javascript
// ✅ 수정
module.exports = withSecureCors(        // 1. CORS (preflight 먼저)
  withStandardRateLimit(                // 2. Rate Limiting
    withAuth(handler, {                 // 3. Auth
      requireAuth: true,
      allowedRoles: ['admin']           // requireAdmin 대신 사용
    })
  )
);
```

**모든 Admin API에 적용:**
- api/admin/orders.js
- api/admin/cleanup-failed-payments.js
- api/admin/coupons.js
- api/admin/create-vendor-account.js
- api/admin/manual-refund.js
- api/admin/notifications.js
- api/admin/refund-booking.js

---

## 📊 영향도 분석

| 버그 | 영향 범위 | 심각도 | 즉시 수정 필요 |
|------|----------|--------|----------------|
| **CORS 설정 오류** | 전체 인증 API | 🔴 CRITICAL | ✅ YES |
| **requireAdmin 미구현** | Admin API 8개 | 🟡 MEDIUM | ⚠️ 보안은 유지됨 |
| **미들웨어 순서** | Admin API 8개 | 🟡 MEDIUM | ⚠️ 작동은 함 |

---

## 🔧 수정 우선순위

### 1단계 (즉시) - CORS 수정
```bash
# 1. utils/cors-middleware.js 수정
# 2. 로컬 테스트
curl -H "Origin: http://localhost:3000" \
     -H "Authorization: Bearer YOUR_JWT" \
     http://localhost:3000/api/admin/orders

# 3. 배포
git add utils/cors-middleware.js
git commit -m "fix: CORS multiple origin 버그 수정 (CRITICAL)"
git push
```

### 2단계 (1시간 이내) - Auth 미들웨어 수정
```bash
# utils/auth-middleware.js에 requireAdmin 옵션 추가
```

### 3단계 (2시간 이내) - 미들웨어 순서 수정
```bash
# 모든 Admin API 파일 수정
# CORS → RateLimit → Auth 순서로 변경
```

---

## ✅ 테스트 계획

### CORS 테스트
```javascript
// test-cors.js
const fetch = require('node-fetch');

async function testCORS() {
  const response = await fetch('https://your-api.com/api/admin/orders', {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://travelap.vercel.app',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Authorization'
    }
  });

  const origin = response.headers.get('Access-Control-Allow-Origin');
  console.log('CORS Origin:', origin);

  if (origin === 'https://travelap.vercel.app') {
    console.log('✅ CORS 정상');
  } else {
    console.log('❌ CORS 오류:', origin);
  }
}

testCORS();
```

### Auth 테스트
```bash
# 1. 유효한 JWT로 요청
curl -H "Authorization: Bearer VALID_JWT" \
     https://your-api.com/api/admin/orders

# 2. 잘못된 JWT로 요청 (401 예상)
curl -H "Authorization: Bearer INVALID_JWT" \
     https://your-api.com/api/admin/orders

# 3. user role로 요청 (403 예상)
curl -H "Authorization: Bearer USER_JWT" \
     https://your-api.com/api/admin/orders
```

---

**작성자:** Claude Code
**검토 필요:** 즉시
**수정 예상 시간:** 2-3시간

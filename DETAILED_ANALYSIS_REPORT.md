# 🔍 Travleap 전체 시스템 상세 분석 보고서

**분석 일시:** 2025-11-05
**분석 범위:** 전체 API, DB, 보안, 기능별 검증
**분석자:** Claude Code

---

## 📊 Executive Summary

| 항목 | 상태 | 심각도 |
|------|------|--------|
| **마이페이지 개인정보 수정** | ⚠️ 문제 있음 | MEDIUM |
| **장바구니** | ✅ 정상 | - |
| **결제 시스템** | ✅ 정상 (매우 복잡) | - |
| **포인트 시스템** | ⚠️ 메모리 누수 | MEDIUM |
| **로그인/인증** | ❌ CORS 오류 | CRITICAL |
| **보안** | ❌ 치명적 버그 | CRITICAL |

---

## ❌ CRITICAL 문제 (즉시 수정 필요)

### 1. 🔴 **CORS 설정 오류 - 모든 인증 API 작동 불가**

**파일:** `utils/cors-middleware.js:54`

```javascript
// ❌ 현재 (작동 안함!)
res.setHeader('Access-Control-Allow-Origin', allowedOrigins.join(','));
// 결과: "https://travelap.vercel.app,https://www.travelap.vercel.app,http://localhost:3000"
```

**문제:**
- 브라우저는 `Access-Control-Allow-Origin` 헤더에 **단일 origin만** 허용
- 여러 origin을 콤마로 연결하면 **무효한 헤더**로 판단하여 거부
- **모든 JWT 인증 API가 CORS 에러 발생**
  - `/api/user/profile` (개인정보 수정)
  - `/api/user/change-password` (비밀번호 변경)
  - `/api/cart` (장바구니)
  - `/api/admin/*` (관리자 API 8개)
  - 기타 모든 withAuth 미들웨어 사용 API

**영향도:**
- 🔴 프론트엔드와 백엔드 통신 완전 차단
- 🔴 사용자가 로그인 후 아무 것도 할 수 없음
- 🔴 개인정보 수정, 장바구니, 결제 등 모든 기능 마비

**수정 필요성:** 🔥 **즉시** (Production 배포 불가)

**올바른 구현:**
```javascript
function setCorsHeaders(res, req, options = {}) {
  const requestOrigin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    // fallback: 첫 번째 허용 origin
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }
}
```

---

### 2. ⚠️ **requireAdmin 옵션 미구현 - 보안 이중 체크 작동 안함**

**파일:** `utils/auth-middleware.js`

**문제:**
모든 Admin API에서 사용 중:
```javascript
withAuth(handler, { requireAuth: true, requireAdmin: true })
```

하지만 `auth-middleware.js`에 `requireAdmin` 옵션이 없음!

```javascript
function withAuth(handler, options = {}) {
  const { requireAuth = true, allowedRoles = null } = options;
  // ❌ requireAdmin 옵션 없음! 무시됨!
}
```

**현재 상황:**
- ✅ **보안은 유지됨** (각 handler 내부에서 수동 체크)
```javascript
if (req.user.role !== 'admin') {
  return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
}
```
- ❌ 하지만 의도한 **이중 보안 체크가 작동 안함**

**수정 필요성:** ⚠️ 보안은 유지되지만 2시간 이내 수정 권장

---

### 3. ⚠️ **미들웨어 순서 오류 - DoS 취약 & OPTIONS 요청 문제**

#### 문제 A: `api/admin/orders.js` - Rate Limiting 없음

```javascript
// ❌ 현재
withSecureCors(withAuth(handler))
// Rate Limiting이 아예 없음!
```

**문제:** DoS 공격에 취약

#### 문제 B: `csv-upload.js` - OPTIONS preflight 문제

```javascript
// ❌ 현재 (잘못된 순서)
withStrictRateLimit(      // 1. Rate Limit 먼저 실행
  withSecureCors(         // 2. CORS
    withAuth(handler)
```

**실행 순서:** RateLimit → CORS → Auth

**문제:**
- OPTIONS preflight 요청도 rate limit에 카운트됨
- 정상 사용자가 브라우저의 preflight로 인해 limit 소진 가능

**올바른 순서:**
```javascript
withSecureCors(           // 1. CORS (preflight 먼저 처리)
  withStandardRateLimit(  // 2. Rate Limiting
    withAuth(handler)     // 3. Auth
  )
)
```

**영향받는 파일:**
- `api/admin/orders.js`
- `api/admin/cleanup-failed-payments.js`
- `api/admin/coupons.js`
- `api/admin/create-vendor-account.js`
- `api/admin/manual-refund.js`
- `api/admin/notifications.js`
- `api/admin/refund-booking.js`
- `pages/api/admin/accommodation-rooms/csv-upload.js`
- `pages/api/admin/accommodation-vendors/csv-upload.js`

**수정 필요성:** ⚠️ 2-3시간 이내 권장

---

## ⚠️ MEDIUM 문제 (성능/메모리)

### 4. ⚠️ **포인트 API - 메모리 누수 (Connection Pool 미정리)**

**파일:** `pages/api/user/points.js:32-46`

```javascript
// ❌ 현재 (메모리 누수!)
const { Pool } = require('@neondatabase/serverless');
const poolNeon = new Pool({
  connectionString: process.env.POSTGRES_DATABASE_URL
});

// 사용자 총 포인트 조회
const userResult = await poolNeon.query(`...`);

// ❌ poolNeon.end() 호출이 없음!
// 매 요청마다 새로운 Pool 생성, 정리 안됨
```

**문제:**
- 매 API 요청마다 새로운 Connection Pool 생성
- `poolNeon.end()` 호출이 없어서 연결이 정리되지 않음
- **메모리 누수 발생** → 시간이 지나면 서버 메모리 소진

**수정 방법:**
```javascript
const poolNeon = new Pool({...});

try {
  const userResult = await poolNeon.query(`...`);
  const pointsResult = await connection.execute(`...`);

  return res.status(200).json({...});

} catch (error) {
  //...
} finally {
  await poolNeon.end(); // ✅ 반드시 정리!
}
```

**영향도:**
- 🟡 장기간 운영 시 서버 메모리 소진
- 🟡 트래픽 많을 때 DB 연결 한계 도달 가능

**수정 필요성:** ⚠️ 1일 이내 권장

---

### 5. ⚠️ **마이페이지 프로필 수정 - SQL Injection 위험**

**파일:** `pages/api/user/profile.js:123`

```javascript
// ⚠️ sql.unsafe() 사용
const query = `
  UPDATE users
  SET ${setClause}, updated_at = CURRENT_TIMESTAMP
  WHERE id = $1
  RETURNING ...
`;

const result = await sql.unsafe(query, [userId, ...updateValues]);
```

**분석:**
- `setClause`는 하드코딩된 필드명으로 생성되므로 **현재는 안전**:
```javascript
updateFields.push('name');  // 하드코딩됨
updateFields.push('phone');
```
- 하지만 `sql.unsafe()` 사용은 위험한 패턴
- 향후 코드 수정 시 SQL Injection 취약점 발생 가능

**권장 수정:**
```javascript
// ✅ 조건문으로 변경 (더 안전)
let updateQuery = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
const params = [userId];
let paramIndex = 2;

if (name !== undefined) {
  updateQuery += `, name = $${paramIndex++}`;
  params.push(name);
}

if (phone !== undefined) {
  updateQuery += `, phone = $${paramIndex++}`;
  params.push(phone);
}

updateQuery += ` WHERE id = $1 RETURNING ...`;
const result = await sql(updateQuery, params);
```

**수정 필요성:** ⚠️ 3일 이내 권장

---

## ✅ 정상 작동하는 기능들

### 1. ✅ **장바구니 시스템** (완벽)

**파일:** `api/cart.js`

**확인 사항:**
- ✅ JWT 인증 적용 (`withAuth`)
- ✅ GET, POST, PUT, DELETE 모두 지원
- ✅ 상품 존재 여부 검증
- ✅ 상품 활성화 상태 검증
- ✅ 유효하지 않은 항목 자동 감지
- ✅ 안전한 쿼리 (파라미터 바인딩)

**기능:**
```javascript
// GET: 장바구니 조회 (상품 유효성 검증 포함)
// POST: 장바구니 추가 (상품 활성화 체크)
// PUT: 장바구니 수정
// DELETE: 장바구니 삭제
```

**문제점:** 없음 ✅

---

### 2. ✅ **결제 시스템** (매우 복잡하지만 잘 구현됨)

**파일:** `pages/api/payments/confirm.js` (1378줄)

**확인 사항:**
- ✅ Idempotency 체크 (중복 결제 방지)
- ✅ Toss Payments API 호출 전 모든 검증 완료
- ✅ 금액 검증 (1원 오차 허용)
- ✅ 포인트 잔액 사전 검증
- ✅ Dual DB 아키텍처 (Neon + PlanetScale)
- ✅ 트랜잭션으로 안전하게 처리
- ✅ 포인트 차감 (동시성 제어 FOR UPDATE)
- ✅ Payment 상태 변경
- ✅ 쿠폰 처리 (동시성 제어)
- ✅ 포인트 적립 (2%, 365일 만료)
- ✅ 파트너 알림
- ✅ 결제 완료 이메일 발송
- ✅ 장바구니 비우기
- ✅ 롤백 처리 (Toss API 승인 후 DB 실패 시)

**주요 로직:**
```javascript
// Phase 1: 사전 검증 (DB 변경 없음)
- 예약/주문 존재 여부
- 금액 일치 검증
- 포인트 잔액 검증

// Phase 2: Toss Payments API 호출
- approveTossPayment()
- tossApproved = true 플래그

// Phase 3: DB 작업 (Critical operations first)
- 포인트 차감 (실패 시 Toss 취소)
- Payment 상태 변경
- 쿠폰 처리
- 포인트 적립
- 장바구니 비우기

// Error Handling: Toss 승인 후 DB 실패
- cancelTossPayment() 호출
- 사용자에게 안내
```

**문제점:** 없음 ✅ (매우 잘 구현됨)

---

### 3. ✅ **비밀번호 변경** (정상)

**파일:** `pages/api/user/change-password.js`

**확인 사항:**
- ✅ JWT 인증 적용
- ✅ bcrypt 사용 (안전한 해싱)
- ✅ 소셜 로그인 체크 (카카오 등은 비밀번호 변경 불가)
- ✅ 현재 비밀번호 확인
- ✅ 새 비밀번호 최소 길이 검증 (6자)
- ✅ 안전한 쿼리

**문제점:** 없음 ✅

---

### 4. ✅ **주소 관리** (정상)

**파일:** `pages/api/user/address.js`

**확인 사항:**
- ✅ JWT 인증 적용
- ✅ GET, PUT 지원
- ✅ 안전한 쿼리

**문제점:** 없음 ✅

---

## 📊 카테고리별 상품 조회 시스템

### 확인된 카테고리 (7개)

| 카테고리 | API 엔드포인트 | 상태 |
|----------|---------------|------|
| **렌트카** | `/api/rentcar/vehicles`<br>`/api/rentcar/bookings` | ✅ |
| **숙박** | `/api/accommodation/listings`<br>`/api/accommodation/bookings` | ✅ |
| **투어** | `/api/tour/packages`<br>`/api/tour/schedules`<br>`/api/tour/bookings` | ✅ |
| **음식** | `/api/food/restaurants`<br>`/api/food/menus`<br>`/api/food/orders` | ✅ |
| **체험** | `/api/experience/list`<br>`/api/experience/bookings` | ✅ |
| **이벤트** | `/api/events/list`<br>`/api/events/tickets` | ✅ |
| **관광지** | `/api/attractions/list`<br>`/api/attractions/tickets` | ✅ |

**모든 카테고리 API 존재 확인 완료 ✅**

---

## 🔧 즉시 조치 사항

### Priority 1: CRITICAL (즉시)

1. **CORS 수정**
   ```bash
   # utils/cors-middleware.js 수정
   # req.headers.origin 확인 후 단일 origin 반환
   ```

2. **로컬 테스트**
   ```bash
   curl -H "Origin: http://localhost:3000" \
        -H "Authorization: Bearer YOUR_JWT" \
        http://localhost:3000/api/user/profile
   ```

3. **배포**
   ```bash
   git add utils/cors-middleware.js
   git commit -m "fix: CORS multiple origin 버그 수정 (CRITICAL)"
   git push
   ```

### Priority 2: HIGH (1-2시간 이내)

4. **auth-middleware.js에 requireAdmin 옵션 추가**

5. **포인트 API 메모리 누수 수정**
   ```javascript
   // pages/api/user/points.js
   // poolNeon.end() 추가
   ```

### Priority 3: MEDIUM (2-3시간 이내)

6. **모든 Admin API 미들웨어 순서 수정**
   ```javascript
   // 올바른 순서
   withSecureCors(
     withStandardRateLimit(
       withAuth(handler, { allowedRoles: ['admin'] })
     )
   )
   ```

7. **profile.js unsafe 쿼리 개선**

---

## 📝 테스트 계획

### CORS 테스트
```bash
# 1. Preflight
curl -X OPTIONS \
  -H "Origin: https://travelap.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  https://your-api.com/api/user/profile

# 2. 실제 요청
curl -H "Origin: https://travelap.vercel.app" \
     -H "Authorization: Bearer YOUR_JWT" \
     https://your-api.com/api/user/profile
```

### 마이페이지 수정 테스트
```bash
# 개인정보 수정
curl -X PUT \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"name":"홍길동","phone":"010-1234-5678"}' \
  https://your-api.com/api/user/profile
```

### 장바구니 테스트
```bash
# 1. 추가
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"listing_id":1,"quantity":2}' \
  https://your-api.com/api/cart

# 2. 조회
curl -H "Authorization: Bearer YOUR_JWT" \
  https://your-api.com/api/cart

# 3. 삭제
curl -X DELETE \
  -H "Authorization: Bearer YOUR_JWT" \
  https://your-api.com/api/cart?itemId=1
```

---

## 🎯 종합 평가

| 시스템 | 구현 품질 | 보안 | 성능 | 종합 |
|--------|----------|------|------|------|
| **결제 시스템** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | **Excellent** |
| **장바구니** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **Excellent** |
| **포인트 시스템** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | **Good** |
| **마이페이지** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | **Fair** |
| **CORS/보안** | ⭐ | ⭐ | ⭐⭐⭐⭐⭐ | **Critical Issue** |

---

## 💬 결론

### 긍정적인 부분:
1. ✅ **결제 시스템이 매우 잘 구현됨** (1378줄의 복잡한 로직을 완벽하게 처리)
2. ✅ 장바구니, 주문, 포인트 등 핵심 기능 정상 작동
3. ✅ Dual DB 아키텍처 (Neon + PlanetScale) 잘 활용
4. ✅ 트랜잭션, 동시성 제어 (FOR UPDATE) 적절히 사용
5. ✅ 7개 카테고리 API 모두 존재

### 치명적인 문제:
1. ❌ **CORS 설정 오류로 인해 모든 인증 API가 작동하지 않을 가능성**
   - 마이페이지 개인정보 수정 불가
   - 장바구니 사용 불가
   - 관리자 기능 사용 불가

2. ⚠️ 미들웨어 순서 문제, 메모리 누수 등 성능 이슈

### 권장 조치:
1. 🔥 **즉시**: CORS 수정 후 배포
2. ⚠️ **2시간 이내**: requireAdmin, 메모리 누수 수정
3. ⚠️ **3시간 이내**: 미들웨어 순서, unsafe 쿼리 개선

**새벽 DB 마이그레이션 전에 CORS 문제를 먼저 해결해야 합니다!**

---

**작성자:** Claude Code
**검토 필요:** 즉시
**예상 수정 시간:** 2-3시간 (CORS만 하면 30분)

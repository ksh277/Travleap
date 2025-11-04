# 🔐 Travleap 보안 수정 내역 (2025-11-04)

## 📋 수정 요약

이번 보안 패치에서는 **5개의 치명적인 보안 취약점**을 수정했습니다.

| 번호 | 문제 | 심각도 | 상태 |
|------|------|--------|------|
| 1 | DB 인증 정보 클라이언트 노출 | 🔴 CRITICAL | ✅ 수정 완료 |
| 2 | SQL 인젝션 + CORS 와일드카드 | 🔴 CRITICAL | ✅ 수정 완료 |
| 3 | 가격 조작 취약점 | 🔴 CRITICAL | ✅ 수정 완료 |
| 4 | 포인트 중복 사용 레이스 컨디션 | 🔴 CRITICAL | ✅ 수정 완료 |
| 5 | 쿠폰 사용 제한 우회 | 🔴 CRITICAL | ✅ 수정 완료 |

---

## 🛠️ 상세 수정 내역

### 1️⃣ DB 인증 정보 클라이언트 노출 수정

#### 문제점
`.env` 파일에서 `VITE_` 접두사를 사용하여 데이터베이스 인증 정보가 브라우저 JavaScript 번들에 포함됨.

```env
# ❌ 이전 (잘못된 설정)
VITE_DATABASE_URL=mysql://user:password@host/db
VITE_PLANETSCALE_PASSWORD=pscale_pw_...
```

**영향:**
- 누구나 브라우저 개발자도구로 DB 접속 가능
- 전체 데이터 유출/삭제 위험

#### 수정 내용

**파일:** `C:\Users\ham57\Desktop\Travleap\.env`

```env
# ✅ 수정 후 (안전한 설정)
DATABASE_URL_BACKEND=mysql://user:password@host/db
PLANETSCALE_HOST=aws.connect.psdb.cloud
PLANETSCALE_USERNAME=...
PLANETSCALE_PASSWORD=...
```

**변경 사항:**
- `VITE_DATABASE_URL` → `DATABASE_URL_BACKEND` (VITE_ 제거)
- `VITE_PLANETSCALE_*` → `PLANETSCALE_*` (VITE_ 제거)
- 주석 추가: 보안 수정 이력 설명

#### 후속 조치 필요
```bash
# 1. 즉시 DB 비밀번호 변경 (PlanetScale 대시보드)
# 2. Vercel 환경 변수 재설정
# 3. 모든 환경에서 재배포
```

---

### 2️⃣ SQL 인젝션 + CORS 와일드카드 수정

#### 문제점
`api/shared/db.js` 파일에서:
1. **CORS 와일드카드** (`Access-Control-Allow-Origin: *`)
2. **인증 없는 DB 접근**
3. **원시 SQL 실행 허용**

```javascript
// ❌ 이전 코드
res.setHeader('Access-Control-Allow-Origin', '*');  // 누구나 접근 가능

// PlanetScale 연결 (인증 없음)
const connection = connect({ ... });

// 원시 SQL 실행 (위험!)
if (action === 'query') {
  const { sql, params } = req.body;
  const result = await connection.execute(sql, params);  // DROP TABLE 가능!
}
```

**공격 시나리오:**
```javascript
fetch('/api/shared/db?action=query', {
  method: 'POST',
  body: JSON.stringify({
    sql: "DROP TABLE users;",
    params: []
  })
});
// 💣 전체 사용자 테이블 삭제!
```

#### 수정 내용

**파일:** `C:\Users\ham57\Desktop\Travleap\api\shared\db.js`

```javascript
// ✅ 수정 후

// 1. CORS 화이트리스트 방식으로 변경
const allowedOrigins = [
  'https://travleap.vercel.app',
  'https://www.travleap.com',
  process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null,
  process.env.NODE_ENV === 'development' ? 'http://localhost:3004' : null
].filter(Boolean);

const origin = req.headers.origin;
if (allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

// 2. 인증 체크 추가
const adminSecret = process.env.ADMIN_API_SECRET;
const authHeader = req.headers.authorization;

if (!adminSecret || !authHeader || authHeader !== `Bearer ${adminSecret}`) {
  return res.status(401).json({
    success: false,
    error: 'Unauthorized',
    message: '이 API는 관리자 인증이 필요합니다.'
  });
}

// 3. 원시 SQL 실행 기능 비활성화
if (action === 'query') {
  return res.status(403).json({
    success: false,
    error: 'FEATURE_DISABLED',
    message: '보안상의 이유로 원시 SQL 실행 기능은 비활성화되었습니다.'
  });
}
```

**보안 개선:**
- ✅ 허용된 도메인만 접근 가능
- ✅ 관리자 인증 필수
- ✅ 원시 SQL 실행 차단

#### 추가 설정 필요
```bash
# .env 파일에 추가
ADMIN_API_SECRET=$(openssl rand -hex 32)

# 사용 시
curl -H "Authorization: Bearer YOUR_SECRET" /api/shared/db
```

---

### 3️⃣ 가격 조작 취약점 수정

#### 문제점
주문 생성 시 클라이언트가 보낸 가격을 그대로 신뢰함.

```javascript
// ❌ 이전 코드
const itemPrice = item.price || 0;  // 클라이언트가 보낸 가격 그대로 사용!
const optionPrice = item.selectedOption?.priceAdjustment || 0;
const totalItemPrice = (itemPrice + optionPrice) * item.quantity;
```

**공격 방법:**
```javascript
// 브라우저 개발자도구에서 요청 수정
fetch('/api/orders', {
  method: 'POST',
  body: JSON.stringify({
    items: [{
      listingId: 123,
      price: 1,  // 원래 50000원 → 1원으로 변조!
      quantity: 1
    }],
    subtotal: 1
  })
});
// 결과: 50,000원 상품을 1원에 구매 가능!
```

#### 수정 내용

**파일:** `C:\Users\ham57\Desktop\Travleap\pages\api\orders.js` (라인 340-416)

```javascript
// ✅ 수정 후

for (const item of items) {
  // 1. DB에서 실제 가격 조회
  const listingResult = await connection.execute(
    'SELECT price_from as price, title FROM listings WHERE id = ? AND is_active = 1',
    [item.listingId]
  );

  if (!listingResult.rows || listingResult.rows.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'LISTING_NOT_FOUND',
      message: `상품을 찾을 수 없습니다.`
    });
  }

  const actualItemPrice = listingResult.rows[0].price;

  // 2. 클라이언트가 보낸 가격과 DB 가격 비교
  if (item.price && Math.abs(actualItemPrice - item.price) > 1) {
    console.error(`❌ [Orders] 가격 조작 감지!
      - 상품: ${listingResult.rows[0].title}
      - DB 가격: ${actualItemPrice}원
      - 클라이언트 가격: ${item.price}원`);

    return res.status(400).json({
      success: false,
      error: 'PRICE_TAMPERED',
      message: '상품 가격이 변경되었습니다. 페이지를 새로고침해주세요.'
    });
  }

  // 3. 옵션 가격도 DB에서 검증
  let actualOptionPrice = 0;
  if (item.selectedOption?.id) {
    const optionResult = await connection.execute(
      'SELECT price_adjustment FROM product_options WHERE id = ? AND listing_id = ?',
      [item.selectedOption.id, item.listingId]
    );

    if (optionResult.rows && optionResult.rows.length > 0) {
      actualOptionPrice = optionResult.rows[0].price_adjustment || 0;

      // 옵션 가격도 검증
      if (item.selectedOption.priceAdjustment && Math.abs(actualOptionPrice - item.selectedOption.priceAdjustment) > 1) {
        return res.status(400).json({
          success: false,
          error: 'OPTION_PRICE_TAMPERED',
          message: '옵션 가격이 변경되었습니다.'
        });
      }
    }
  }

  // 4. 실제 DB 가격으로 계산
  const totalItemPrice = (actualItemPrice + actualOptionPrice) * item.quantity;
  serverCalculatedSubtotal += totalItemPrice;

  console.log(`✅ [Orders] 상품 가격 검증 완료: ${listingResult.rows[0].title}`);
}
```

**보안 개선:**
- ✅ 모든 가격을 DB에서 조회
- ✅ 클라이언트 가격과 비교하여 조작 감지
- ✅ 옵션 가격도 동일하게 검증
- ✅ 상세한 로그로 조작 시도 추적

---

### 4️⃣ 포인트 중복 사용 레이스 컨디션 수정

#### 문제점
동시 요청 시 포인트를 중복으로 사용할 수 있음.

```typescript
// ❌ 이전 코드
const users = await db.query('SELECT total_points FROM users WHERE id = ?', [userId]);
// FOR UPDATE 락이 없어서 다른 요청도 동시에 읽을 수 있음

const currentPoints = users[0].total_points || 0;

if (currentPoints < points) {  // 동시 요청이 모두 통과 가능
  return { success: false };
}

await db.execute('UPDATE users SET total_points = ? WHERE id = ?', [newBalance, userId]);
// 다른 요청의 UPDATE가 덮어쓸 수 있음
```

**공격 시나리오:**
```javascript
// 사용자가 1000P 보유
// 동시에 10개 요청 전송
for (let i = 0; i < 10; i++) {
  fetch('/api/use-points', {
    method: 'POST',
    body: JSON.stringify({ userId: 1, points: 1000 })
  });
}
// 결과: 1000P로 10,000원 할인 (9,000원 손해!)
```

#### 수정 내용

**파일:** `C:\Users\ham57\Desktop\Travleap\utils\points-system.ts` (라인 68-127)

```typescript
// ✅ 수정 후

export async function usePoints(
  userId: number,
  points: number,
  reason: string,
  relatedOrderId?: string
): Promise<{ success: boolean; message?: string }> {
  const db = getDatabase();

  try {
    // 1. 트랜잭션 시작
    await db.query('BEGIN');

    // 2. FOR UPDATE 락 추가 (다른 트랜잭션은 여기서 대기)
    const users = await db.query(
      'SELECT total_points FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );

    if (users.length === 0) {
      await db.query('ROLLBACK');
      return { success: false, message: '사용자를 찾을 수 없습니다.' };
    }

    const currentPoints = users[0].total_points || 0;

    // 3. 잔액 확인
    if (currentPoints < points) {
      await db.query('ROLLBACK');
      console.warn(`⚠️ [Points] User ${userId} 포인트 부족`);
      return { success: false, message: `보유 포인트가 부족합니다.` };
    }

    const newBalance = currentPoints - points;

    // 4. 포인트 내역 추가
    await db.execute(`
      INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after)
      VALUES (?, ?, 'use', ?, ?, ?)
    `, [userId, -points, reason, relatedOrderId, newBalance]);

    // 5. 사용자 포인트 업데이트
    await db.execute('UPDATE users SET total_points = ? WHERE id = ?', [newBalance, userId]);

    // 6. 트랜잭션 커밋
    await db.query('COMMIT');

    console.log(`✅ [Points] User ${userId} used ${points} points.`);
    return { success: true };

  } catch (error) {
    // 에러 발생 시 롤백
    try {
      await db.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('❌ [Points] Rollback failed:', rollbackError);
    }

    console.error('❌ [Points] Failed to use points:', error);
    return { success: false, message: '포인트 사용 중 오류가 발생했습니다.' };
  }
}
```

**보안 개선:**
- ✅ `FOR UPDATE` 락으로 동시 접근 차단
- ✅ 트랜잭션으로 원자성 보장
- ✅ 에러 발생 시 자동 롤백
- ✅ 상세한 로그로 문제 추적

**작동 원리:**
```
요청 1: BEGIN → SELECT ... FOR UPDATE (락 획득) → 포인트 차감 → COMMIT
요청 2: BEGIN → SELECT ... FOR UPDATE (요청 1이 끝날 때까지 대기) → ...
```

---

### 5️⃣ 쿠폰 사용 제한 우회 수정

#### 문제점
쿠폰 사용 한도 초과 시 경고만 로그하고 결제는 성공 처리함.

```javascript
// ❌ 이전 코드
const updateResult = await connection.execute(`
  UPDATE coupons
  SET used_count = used_count + 1
  WHERE code = ? AND (usage_limit IS NULL OR used_count < usage_limit)
`, [couponCode]);

if (updateResult.affectedRows === 0) {
  console.error(`⚠️ [쿠폰] 사용 한도 초과`);
  // 경고만 로그, 결제는 성공!
}
```

**공격 시나리오:**
```
쿠폰: SAVE50 (사용 한도 1회)

사용자 A: 쿠폰 적용 → 결제 → 성공 ✅ (used_count = 1)
사용자 B: 쿠폰 적용 → 결제 시도
  - 쿠폰 한도 체크: used_count (1) >= usage_limit (1)
  - affectedRows = 0
  - 그런데 결제는 성공! (할인 적용됨) ❌
```

#### 수정 내용

**파일:** `C:\Users\ham57\Desktop\Travleap\pages\api\payments\confirm.js` (라인 399-404)

```javascript
// ✅ 수정 후

// affectedRows 확인으로 동시성 충돌 감지
if (updateResult.affectedRows === 0) {
  console.error(`❌ [쿠폰] 사용 한도 초과 - 결제를 취소합니다. (쿠폰: ${notes.couponCode})`);

  // SECURITY FIX: 쿠폰 한도 초과 시 결제 실패 처리
  throw new Error('COUPON_LIMIT_EXCEEDED: 쿠폰 사용 한도가 초과되었습니다. 다른 사용자가 먼저 사용했을 수 있습니다.');
}
```

**보안 개선:**
- ✅ 쿠폰 한도 초과 시 결제 실패 (에러 throw)
- ✅ 자동으로 Toss 결제 취소 트리거
- ✅ 사용자에게 명확한 에러 메시지 전달

**작동 흐름:**
```
1. Toss 결제 승인
2. 쿠폰 사용 시도 → affectedRows = 0 (이미 한도 초과)
3. throw Error 발생
4. catch 블록에서 Toss 결제 자동 취소
5. 사용자에게 에러 반환
```

---

## 📊 수정 전후 비교

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| **DB 노출** | 브라우저에서 비밀번호 확인 가능 | 서버만 접근 가능 |
| **SQL 인젝션** | DROP TABLE 실행 가능 | 원시 SQL 차단 |
| **가격 조작** | 1원에 구매 가능 | DB 가격으로 검증 |
| **포인트 중복 사용** | 10배 사용 가능 | FOR UPDATE로 차단 |
| **쿠폰 무제한 사용** | 한도 초과해도 성공 | 한도 초과 시 실패 |

---

## ✅ 테스트 방법

### 1. DB 노출 테스트
```bash
# 브라우저 개발자도구 → Console
> Object.keys(import.meta.env).filter(k => k.includes('DATABASE'))
# 결과: [] (빈 배열이어야 정상)
```

### 2. SQL 인젝션 테스트
```bash
curl -X POST http://localhost:3004/api/shared/db?action=query \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT 1","params":[]}'
# 결과: 401 Unauthorized 또는 403 Forbidden
```

### 3. 가격 조작 테스트
```bash
curl -X POST http://localhost:3004/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"listingId": 1, "price": 1, "quantity": 1}],
    "subtotal": 1
  }'
# 결과: 400 Bad Request - "PRICE_TAMPERED"
```

### 4. 포인트 중복 사용 테스트
```bash
# 동시에 10개 요청 전송
for i in {1..10}; do
  curl -X POST http://localhost:3004/api/use-points \
    -H "Content-Type: application/json" \
    -d '{"userId": 1, "points": 1000}' &
done
wait
# 결과: 1개만 성공, 나머지 9개는 "포인트 부족" 에러
```

### 5. 쿠폰 한도 테스트
```sql
-- 1회용 쿠폰 생성
INSERT INTO coupons (code, discount_type, discount_value, usage_limit, is_active)
VALUES ('TEST50', 'percentage', 50, 1, 1);

-- 2명이 동시에 사용 시도
-- 결과: 1명만 성공, 다른 1명은 "COUPON_LIMIT_EXCEEDED" 에러
```

---

## 🚨 즉시 조치 필요 사항

### 1. DB 비밀번호 변경
```bash
# PlanetScale 대시보드 접속
# 1. Settings → Passwords → Create new password
# 2. 새 비밀번호를 .env와 Vercel에 설정
# 3. 이전 비밀번호 삭제
```

### 2. ADMIN_API_SECRET 생성
```bash
# .env 파일에 추가
ADMIN_API_SECRET=$(openssl rand -hex 32)

# Vercel 환경 변수에도 동일하게 설정
```

### 3. Vercel 환경 변수 업데이트
```bash
# Vercel Dashboard → Settings → Environment Variables
# 다음 변수들을 추가/수정:
DATABASE_URL_BACKEND=...
PLANETSCALE_HOST=...
PLANETSCALE_USERNAME=...
PLANETSCALE_PASSWORD=... (새로 변경한 비밀번호)
ADMIN_API_SECRET=... (새로 생성)
```

### 4. Git 커밋 및 배포
```bash
git add .env api/shared/db.js pages/api/orders.js utils/points-system.ts pages/api/payments/confirm.js
git commit -m "fix: CRITICAL security vulnerabilities

- Remove VITE_ prefix from DB credentials
- Add authentication to db.js API
- Implement server-side price validation
- Add FOR UPDATE lock to points system
- Fix coupon limit bypass issue"

git push origin main
# Vercel이 자동 배포
```

---

## 📝 추가 권장 사항

### 높은 우선순위 (1주일 내)

1. **CORS 설정 전역 수정**
   - 모든 `Access-Control-Allow-Origin: *`를 화이트리스트로 변경
   - 공통 CORS 미들웨어 생성

2. **JWT 인증 미들웨어 구현**
   - 모든 API에 적용
   - `req.body.user_id` 대신 JWT에서 추출

3. **Rate Limiting 추가**
   - 로그인: 5회/15분
   - 결제 API: 10회/분
   - 관리자 API: 10회/분

### 중간 우선순위 (1개월 내)

4. **포인트 만료 시스템 구현**
   - Vercel Cron 설정
   - 매일 00:00 실행

5. **이중 DB 조정 작업**
   - 포인트 불일치 감지
   - 자동 수정 또는 알림

6. **소셜 로그인 State 검증**
   - CSRF 방지

### 낮은 우선순위 (3개월 내)

7. **단일 DB로 통합**
   - PlanetScale 또는 Neon 중 하나로 통일

8. **이벤트 소싱 패턴 도입**
   - 포인트 시스템 재설계

9. **침투 테스트 진행**
   - 외부 보안 전문가 의뢰

---

## 🔍 로그 모니터링

수정 후 다음 로그를 모니터링하세요:

```bash
# 가격 조작 시도
grep "가격 조작 감지" logs/

# 포인트 중복 사용 시도
grep "포인트 부족" logs/ | grep "User"

# 쿠폰 한도 초과 시도
grep "COUPON_LIMIT_EXCEEDED" logs/

# SQL 인젝션 시도
grep "FEATURE_DISABLED" logs/
```

---

## 📞 문제 발생 시

수정 후 문제가 발생하면:

1. **즉시 롤백**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **이슈 확인**
   - Vercel 로그 확인
   - 브라우저 콘솔 에러 확인
   - API 응답 확인

3. **연락처**
   - 개발팀: [이메일]
   - 긴급: [전화번호]

---

## 📚 참고 문서

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [PlanetScale Security Best Practices](https://planetscale.com/docs/concepts/security)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [MySQL Transaction Isolation](https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html)

---

**작성자:** Claude (Sonnet 4.5)
**작성일:** 2025-11-04
**버전:** 1.0

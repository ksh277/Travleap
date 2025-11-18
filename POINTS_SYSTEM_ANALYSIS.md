# 포인트 시스템 분석 보고서

## 📊 시스템 구조

### 데이터베이스
- **Neon PostgreSQL**: `users.total_points` (사용자 총 포인트)
- **PlanetScale MySQL**: `user_points` (포인트 내역)

### 포인트 타입 (point_type)
- `earn`: 적립
- `use`: 사용
- `refund`: 환불 (회수)

## ✅ 포인트 적립 (api/payments/confirm.js)

### 적립 규칙
- **적립률**: 2%
- **기준 금액**: 상품 금액 (배송비 제외)
- **최소 금액**: 1원 이상

### 적립 시점
1. **단일 예약** (lines 610-716)
   - 렌트카 예약
   - 일반 예약

2. **장바구니 주문** (lines 754-860)
   - 카테고리별 payment마다 개별 적립
   - FOR UPDATE로 동시성 제어

### 적립 프로세스
```javascript
// 1. 포인트 계산
const pointsToEarn = Math.floor(productAmount * 0.02);

// 2. user_points INSERT (PlanetScale)
INSERT INTO user_points (user_id, points, point_type, reason, balance_after, ...)

// 3. users.total_points UPDATE (Neon)
UPDATE users SET total_points = newBalance WHERE id = userId
```

## 💳 포인트 사용 (api/payments/confirm.js)

### 사용 시점
- 결제 승인 시 (line 374-400)
- 쿠폰 사용 처리 후

### 사용 프로세스
```javascript
// 1. user_points INSERT (차감)
points: -usedPoints  // 음수로 저장
point_type: 'use'

// 2. users.total_points UPDATE
UPDATE users SET total_points = total_points - usedPoints
```

## 🔄 포인트 회수/환불 (api/payments/refund.js)

### 회수 시점
- 주문 취소/환불 시 (lines 850-929)
- Toss Payments 환불 성공 후 실행
- DB 트랜잭션 내에서 처리

### 이중 처리 메커니즘
환불 시 2가지 포인트 처리가 동시에 발생:

#### 1️⃣ 적립 포인트 회수 (deductEarnedPoints - lines 362-508)
```javascript
// 1. 해당 주문으로 적립된 포인트 조회
SELECT points FROM user_points
WHERE user_id = ? AND related_order_id = ? AND point_type = 'earn'

// 2. Neon - 포인트 차감 (음수 허용)
UPDATE users SET total_points = total_points - pointsToDeduct

// 3. PlanetScale - 회수 내역 기록
INSERT INTO user_points (
  points: -pointsToDeduct,  // 음수로 기록
  point_type: 'refund',
  reason: '환불로 인한 포인트 회수',
  balance_after: newBalance
)
```

**특징**:
- 정확한 매칭 실패 시 LIKE 검색 시도
- 여러 적립 내역 합산 지원
- 음수 잔액 허용 (다른 주문에서 이미 사용된 포인트 회수 대응)
- FOR UPDATE로 동시성 제어

#### 2️⃣ 사용 포인트 반환 (refundUsedPoints - lines 518-579)
```javascript
// 1. payment.notes에서 사용한 포인트 추출
const notes = JSON.parse(payment.notes);
const pointsUsed = notes.pointsUsed || 0;

// 2. Neon - 포인트 환불
UPDATE users SET total_points = total_points + pointsUsed

// 3. PlanetScale - 환불 내역 기록
INSERT INTO user_points (
  points: pointsUsed,  // 양수로 기록
  point_type: 'refund',
  reason: '주문 취소로 인한 포인트 환불',
  balance_after: newBalance
)
```

**특징**:
- payment.notes에서 pointsUsed 값 추출
- 포인트 복원 (양수 적립)
- FOR UPDATE로 동시성 제어

## 🔍 동기화 메커니즘

### PlanetScale → Neon 동기화
**api/user/points.js** (lines 49-94):
```javascript
// 1. PlanetScale의 최신 balance_after 사용 (우선순위)
SELECT balance_after FROM user_points
WHERE user_id = ? ORDER BY created_at DESC LIMIT 1

// 2. Neon과 비교 후 자동 동기화
if (neonPoints !== totalPoints) {
  UPDATE users SET total_points = totalPoints WHERE id = userId
}
```

### Race Condition 방어
- `FOR UPDATE` 사용 (장바구니 주문)
- `balance_after` 필드로 정확한 잔액 추적
- PlanetScale을 Single Source of Truth로 사용

### 장바구니 주문 환불 처리 (lines 854-902)
장바구니 주문 환불 시 특별 처리:
- 같은 order_number의 모든 payments 조회
- 각 카테고리별 payment마다 포인트 회수 실행
- 사용 포인트는 첫 번째 payment의 notes에만 기록됨
- 개별 payment 포인트 실패해도 다른 카테고리 계속 처리

## ⚠️ 중요 발견 사항

### ✅ 구현 완료
1. ✅ **환불 시 포인트 회수**: 이중 처리 메커니즘 (회수 + 반환)
2. ✅ **장바구니 주문 지원**: 모든 카테고리 payment의 포인트 처리
3. ✅ **음수 잔액 허용**: 포인트 체인 대응 (A 주문 적립 → 사용 → A 주문 환불)
4. ✅ **동시성 제어**: FOR UPDATE 사용 (Neon PostgreSQL)
5. ✅ **에러 처리**: 관리자 알림 생성 (admin_notifications 테이블)

### 🔍 확인된 엣지 케이스

#### 1. 포인트 체인 시나리오
```
사용자가 1000원 주문 → 20P 적립
20P 사용하여 2000원 주문
1000원 주문 환불 → 20P 회수
```
**결과**: `total_points = -20` (음수 허용)
**이유**: 이미 사용한 포인트를 회수해야 하므로 음수 발생 가능

#### 2. 장바구니 환불 시 포인트 처리
```
장바구니: 렌트카 10만원 + 숙박 5만원 + 여행 3만원
- 렌트카 payment: 2000P 적립
- 숙박 payment: 1000P 적립
- 여행 payment: 600P 적립
- 첫 payment에만 pointsUsed: 1000 기록
```
**환불 시**:
- 총 3600P 회수 (모든 카테고리)
- 1000P 반환 (사용한 포인트)
- **순 변화**: -2600P

#### 3. 부분 환불 시 포인트
**현재 구현**: 부분 환불 시에도 전체 적립 포인트 회수
**이유**: 부분 환불은 금액만 부분 처리, 포인트는 전체 회수/반환
**개선 필요**: 부분 환불 금액 비율만큼만 포인트 회수하도록 수정 고려

### ✅ 포인트 사용 검증 (confirm.js - lines 361-363)
```javascript
// 유일한 검증: 잔액 부족 체크
if (currentPoints < pointsUsed) {
  throw new Error(`포인트가 부족합니다.`);
}
```

**발견**:
- ✅ 잔액 부족 검증만 존재
- ❌ 최대 사용 비율 제한 없음 (결제 금액의 100% 포인트 사용 가능)
- ❌ 최소 금액 제한 없음 (1원까지 포인트 사용 가능)
- ❌ 1회 사용 한도 없음

### ❌ 미구현 사항

1. ❌ **포인트 만료 처리**
   - user_points 테이블에 expires_at 컬럼 존재
   - api/user/points.js에서 expires_at 조회는 하지만 필터링 안 함
   - **만료된 포인트도 여전히 사용 가능**
   - 자동 만료 처리 cron job 없음

2. ❌ **포인트 사용 제한 정책**
   - 최대 사용 비율 제한 없음 (예: 결제 금액의 최대 50%)
   - 최소 결제 금액 제한 없음 (예: 최소 1,000원은 실결제)
   - 1회 최대 사용 한도 없음

3. ⚠️ **부분 환불 비율 계산**
   - 현재는 부분 환불 시에도 전체 적립 포인트 회수
   - 금액 비율에 따른 포인트 회수 미구현

## 📝 개선 권장 사항

### 🔴 높은 우선순위

#### 1. 포인트 만료 처리 구현
```javascript
// api/user/points.js - 만료 포인트 필터링
SELECT balance_after FROM user_points
WHERE user_id = ?
  AND (expires_at IS NULL OR expires_at > NOW())  // ✅ 만료 필터 추가
ORDER BY created_at DESC LIMIT 1
```

```javascript
// 만료 포인트 자동 차감 cron job (매일 실행)
// scripts/expire-points-cron.js
const expiredPoints = await connection.execute(`
  SELECT user_id, SUM(points) as total_expired
  FROM user_points
  WHERE point_type = 'earn'
    AND expires_at < NOW()
    AND expires_at IS NOT NULL
  GROUP BY user_id
`);

for (const { user_id, total_expired } of expiredPoints.rows) {
  // Neon - 포인트 차감
  await poolNeon.query(`UPDATE users SET total_points = total_points - $1 WHERE id = $2`,
    [total_expired, user_id]);

  // PlanetScale - 만료 내역 기록
  await connection.execute(`
    INSERT INTO user_points (user_id, points, point_type, reason, balance_after)
    VALUES (?, ?, 'expire', '포인트 만료', ?)
  `, [user_id, -total_expired, newBalance]);
}
```

#### 2. 포인트 사용 제한 정책 구현
```javascript
// api/payments/confirm.js - 사용 검증 강화
const MAX_POINT_USAGE_RATE = 0.5; // 결제 금액의 최대 50%
const MIN_CASH_PAYMENT = 1000; // 최소 1,000원은 현금 결제

// 1. 최대 사용 비율 검증
const maxPointsAllowed = Math.floor(totalAmount * MAX_POINT_USAGE_RATE);
if (pointsUsed > maxPointsAllowed) {
  throw new Error(`포인트는 결제 금액의 최대 50%까지만 사용 가능합니다. (최대: ${maxPointsAllowed}P)`);
}

// 2. 최소 현금 결제 검증
const cashPayment = totalAmount - pointsUsed;
if (cashPayment < MIN_CASH_PAYMENT) {
  throw new Error(`최소 ${MIN_CASH_PAYMENT.toLocaleString()}원은 현금으로 결제해야 합니다.`);
}
```

#### 3. 부분 환불 포인트 비율 계산
```javascript
// api/payments/refund.js - deductEarnedPoints 수정
async function deductEarnedPoints(connection, userId, orderNumber, refundRatio = 1.0) {
  // ... 기존 코드 ...

  // ✅ 부분 환불 시 비율 적용
  const actualPointsToDeduct = Math.floor(pointsToDeduct * refundRatio);

  console.log(`💰 [포인트 회수] 환불 비율: ${refundRatio * 100}%, 회수: ${actualPointsToDeduct}P (전체 적립: ${pointsToDeduct}P)`);

  // ... Neon/PlanetScale 업데이트 ...
}

// refundPayment 함수에서 호출 시
const refundRatio = cancelAmount ? (cancelAmount / payment.amount) : 1.0;
await deductEarnedPoints(connection, payment.user_id, refundOrderId, refundRatio);
```

### 🟡 중간 우선순위

#### 4. 포인트 음수 모니터링
```javascript
// api/payments/refund.js - deductEarnedPoints 수정
if (newBalance < -10000) {
  // 비정상적으로 큰 음수 (예: -10,000P 이하)
  await connection.execute(`
    INSERT INTO admin_notifications (type, priority, title, message, metadata)
    VALUES (?, ?, ?, ?, ?)
  `, [
    'NEGATIVE_POINTS_ALERT',
    'MEDIUM',
    '⚠️ 사용자 포인트 음수 발생',
    `user_id=${userId}의 포인트가 ${newBalance}P로 음수 상태입니다.`,
    JSON.stringify({ userId, currentBalance: newBalance, orderNumber })
  ]);
}
```

#### 5. 동시성 테스트 시나리오
```javascript
// tests/points-concurrency.test.js
test('동시 환불 시 race condition 방지', async () => {
  const userId = 1;
  const orders = ['ORDER_A', 'ORDER_B', 'ORDER_C'];

  // 3개 주문을 동시에 환불
  const results = await Promise.all(
    orders.map(orderNumber => refundPayment({ orderNumber }))
  );

  // 최종 포인트 잔액 검증
  const finalBalance = await getUserPoints(userId);
  expect(finalBalance).toBe(expectedBalance);
});
```

#### 6. PlanetScale 동기화 검증
```javascript
// api/user/points.js - 동기화 로그 강화
if (neonPoints !== totalPoints) {
  console.warn(`⚠️ [Points Sync] 포인트 불일치 감지 - Neon: ${neonPoints}P, PlanetScale: ${totalPoints}P`);

  // 차이가 크면 관리자 알림
  if (Math.abs(neonPoints - totalPoints) > 1000) {
    await connection.execute(`
      INSERT INTO admin_notifications (type, priority, title, message, metadata)
      VALUES (?, ?, ?, ?, ?)
    `, [
      'POINTS_SYNC_MISMATCH',
      'HIGH',
      '⚠️ 포인트 동기화 불일치',
      `user_id=${userId}의 Neon/PlanetScale 포인트 차이: ${Math.abs(neonPoints - totalPoints)}P`,
      JSON.stringify({ userId, neonPoints, planetScalePoints: totalPoints })
    ]);
  }
}
```

## 📊 최종 평가

### ✅ 잘 구현된 부분
1. **Dual DB 동기화**: PlanetScale을 Single Source of Truth로 사용
2. **동시성 제어**: FOR UPDATE로 race condition 방어
3. **이중 환불 처리**: 적립 포인트 회수 + 사용 포인트 반환
4. **장바구니 지원**: 모든 카테고리 payment의 포인트 처리
5. **에러 처리**: 관리자 알림 생성으로 수동 처리 가능
6. **음수 잔액 허용**: 포인트 체인 시나리오 대응

### ⚠️ 개선 필요 부분
1. **포인트 만료 처리**: expires_at 필드가 있지만 미사용
2. **사용 제한 정책**: 무제한 사용 가능 (100% 포인트 결제 가능)
3. **부분 환불 비율**: 부분 환불 시 전체 포인트 회수
4. **모니터링 부족**: 비정상적인 음수 잔액 감지 안 됨

### 🎯 우선순위 권장
1. **포인트 만료 처리** - 법적 이슈 가능성 (포인트 무기한 유효)
2. **사용 제한 정책** - 비즈니스 리스크 (100% 포인트 결제 허용)
3. **부분 환불 비율** - 사용자 불만 가능성 (부분 환불 시 전체 포인트 회수)
4. **음수 모니터링** - 운영 효율성 (비정상 케이스 조기 감지)

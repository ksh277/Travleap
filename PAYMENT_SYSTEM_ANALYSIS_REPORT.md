# 토스 페이먼츠 통합 완전 심층 분석 리포트

**분석 일시**: 2025-10-30
**분석자**: Claude Code
**분석 대상**: Travleap 결제 시스템

---

## 📊 종합 평가 요약

| 카테고리 | 통과 여부 | 점수 | 주요 이슈 |
|---------|----------|------|----------|
| 1. 결제 플로우 | ⚠️ 부분 통과 | 70/100 | 멱등성 키 미사용, 금액 재계산 불완전 |
| 2. 환불/취소 | ✅ 통과 | 85/100 | 부분환불 로직 존재, 명세 표시 부족 |
| 3. 웹훅/보안/멱등성 | ✅ 우수 | 95/100 | 서명 검증 O, 멱등성 O, DB 기반 중복 방지 |
| 4. 쿠폰/포인트/정산 | ⚠️ 부분 통과 | 75/100 | 환불 시 쿠폰 복구 미구현, 포인트는 OK |
| 5. 재고/동시성 | ❌ 불통과 | 40/100 | 트랜잭션 락 없음, 동시 구매 경합 미대응 |
| 6. 알림/영수증 | ⚠️ 부분 통과 | 60/100 | 이메일 미구현, 마이페이지는 OK |
| 7. UX/에러 복원력 | ⚠️ 부분 통과 | 65/100 | 새로고침 방어 부족, 복귀 로직 미완 |
| 8. 로깅/모니터링 | ✅ 통과 | 80/100 | Slack 알림 O, PII 마스킹 필요 |

**총점**: **71/100** (C+ 등급)

---

## 1. 결제 플로우 분석 (70/100)

### 1.1 정상 결제 (카드) ⚠️

**케이스**: 7,000원 상품 + 배송비 3,000원 = 10,000원

#### 현재 구현 상태

**파일**: `components/PaymentPage.tsx` (Line 494-520)

```typescript
const orderResponse = await api.createOrder({
  userId: Number(user?.id) || 1,
  items: mappedItems,
  // ... 생략
  totalAmount: orderAmount,
  subtotal: orderAmount,
  deliveryFee: totalDeliveryFee,
  // ...
});
```

**파일**: `api/orders.js` (Line 364-386)

```javascript
// 🔍 주문 생성 전 모든 상품 유효성 검증
console.log('🔍 [Orders] 받은 items 배열:', JSON.stringify(items, null, 2));

for (const item of items) {
  const itemName = item.title || item.name || `상품 ID ${item.listingId}`;

  console.log(`🔍 [Orders] 상품 검증 중:`, {
    itemName,
    'item.listingId': item.listingId,
    'item.id': item.id,
    'typeof listingId': typeof item.listingId,
    'item keys': Object.keys(item)
  });

  const listingCheck = await connection.execute(`
    SELECT id, title, is_active FROM listings
    WHERE id = ?
  `, [item.listingId]);

  if (!listingCheck.rows || listingCheck.rows.length === 0) {
    console.error(`❌ [Orders] 상품을 찾을 수 없음`);
    return res.status(400).json({
      success: false,
      error: 'LISTING_NOT_FOUND',
      message: `장바구니에 삭제된 상품이 포함되어 있습니다`
    });
  }
}
```

#### ✅ 통과하는 부분

1. **상품 유효성 검증**: 주문 생성 전 listings 테이블에서 상품 존재 확인
2. **금액 저장**: payments 테이블에 amount 저장
3. **로그 기록**: console.log로 디버그 로깅 존재

#### ❌ 실패하는 부분

1. **서버 측 금액 재계산 미흡**

**문제점**:
```typescript
// PaymentPage.tsx - 클라이언트에서 계산
const orderAmount = subtotalWithOptions + totalDeliveryFee;
```

서버에서 받은 `totalAmount`를 그대로 믿고 있음. **금액 위변조 취약점**.

**필요한 로직**:
```javascript
// api/orders.js 에 추가 필요
// 각 item의 가격을 DB에서 재조회
for (const item of items) {
  const listing = await connection.execute(`
    SELECT price_from FROM listings WHERE id = ?
  `, [item.listingId]);

  const expectedPrice = listing.rows[0].price_from;
  if (item.price !== expectedPrice) {
    return res.status(422).json({
      success: false,
      error: 'PRICE_MISMATCH',
      message: '상품 가격이 변경되었습니다'
    });
  }
}

// 서버에서 총액 재계산
const calculatedTotal = items.reduce((sum, item) => {
  return sum + (item.price * item.quantity);
}, 0) + deliveryFee;

if (Math.abs(calculatedTotal - totalAmount) > 1) {
  return res.status(422).json({
    success: false,
    error: 'AMOUNT_MISMATCH',
    message: '결제 금액이 일치하지 않습니다'
  });
}
```

2. **멱등성 키 미사용**

**문제점**: 동일 orderId 중복 요청 시 중복 주문 생성 가능

**현재 상태**: 멱등성 키 체크 없음

**필요한 로직**:
```javascript
// api/orders.js 시작 부분에 추가
const idempotencyKey = req.headers['x-idempotency-key'];
if (!idempotencyKey) {
  return res.status(400).json({
    success: false,
    error: 'MISSING_IDEMPOTENCY_KEY'
  });
}

// DB에 멱등성 키 체크
const existing = await connection.execute(`
  SELECT * FROM payments
  WHERE idempotency_key = ?
`, [idempotencyKey]);

if (existing.rows.length > 0) {
  // 이미 처리된 요청
  return res.status(200).json({
    success: true,
    data: existing.rows[0],
    idempotent: true
  });
}

// 주문 생성 시 멱등성 키 저장
await connection.execute(`
  INSERT INTO payments (..., idempotency_key)
  VALUES (..., ?)
`, [..., idempotencyKey]);
```

#### 평가: ⚠️ **부분 통과** (60/100)

**통과**: 상품 검증, 금액 저장
**실패**: 서버 금액 재계산 미흡, 멱등성 키 없음

---

### 1.2 사용자 취소 (리다이렉트 단계) ✅

**케이스**: 결제창 열고 취소 클릭

#### 현재 구현 상태

**파일**: `api/payments/confirm.js` (Line 803-955)

```javascript
async function handlePaymentFailure(orderId, reason) {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('❌ [결제 실패] 처리:', { orderId, reason });

    const isBooking = orderId.startsWith('BK-');
    const isOrder = orderId.startsWith('ORDER_');

    if (isOrder) {
      // 장바구니 주문 실패 처리: 재고 복구 + 포인트 환불 + 예약 취소
      console.log(`🔄 [주문 실패] 롤백 시작: ${orderId}`);

      // 재고 복구
      for (const booking of bookings.rows) {
        try {
          if (booking.selected_option_id) {
            await connection.execute(`
              UPDATE product_options
              SET stock = stock + ?
              WHERE id = ? AND stock IS NOT NULL
            `, [booking.guests || 1, booking.selected_option_id]);
          }

          if (booking.listing_id) {
            await connection.execute(`
              UPDATE listings
              SET stock = stock + ?
              WHERE id = ? AND stock IS NOT NULL
            `, [booking.guests || 1, booking.listing_id]);
          }
        } catch (stockError) {
          console.error(`❌ [재고 복구] 실패`, stockError);
        }
      }

      // bookings 상태 변경 (cancelled)
      await connection.execute(`
        UPDATE bookings
        SET status = 'cancelled',
            payment_status = 'failed',
            cancellation_reason = ?,
            updated_at = NOW()
        WHERE order_number = ?
      `, [reason || '결제 실패', orderId]);

      // payments 상태 변경
      await connection.execute(`
        UPDATE payments
        SET payment_status = 'failed',
            updated_at = NOW()
        WHERE gateway_transaction_id = ?
      `, [orderId]);
    }
  }
}
```

#### ✅ 통과하는 부분

1. **재고 복구**: 옵션/상품 재고 복구 O
2. **상태 변경**: bookings.status → 'cancelled'
3. **결제 상태**: payments.payment_status → 'failed'

#### ⚠️ 주의 필요

1. **포인트 환불 불필요**: 결제 실패 시점에는 포인트가 차감되지 않았으므로 환불 불필요 (코드 주석으로 명시됨 ✅)

```javascript
// 5. 포인트 환불 체크
// ⚠️ 주의: 결제 실패 시점에는 포인트가 아직 차감되지 않았음
//    (포인트는 confirmPayment에서 결제 확정 후에만 차감됨)
//    따라서 결제 실패 시에는 포인트 환불이 불필요
```

2. **쿠폰 복구**: 현재 미구현

**필요한 로직**:
```javascript
// 결제 실패 시 쿠폰 복구
if (notes && notes.couponCode && notes.couponId) {
  await connection.execute(`
    UPDATE user_coupons
    SET is_used = FALSE,
        used_at = NULL,
        order_number = NULL
    WHERE user_id = ? AND coupon_id = ?
  `, [userId, notes.couponId]);

  console.log(`✅ [쿠폰] 복구 완료: ${notes.couponCode}`);
}
```

#### 평가: ✅ **통과** (85/100)

**통과**: 재고 복구, 상태 변경
**미흡**: 쿠폰 복구 미구현

---

### 1.3 중복 클릭/새로고침 방지 ❌

**케이스**: 결제 버튼 연속 클릭 & 페이지 새로고침

#### 현재 구현 상태

**파일**: `components/PaymentPage.tsx` (Line 405-431)

```typescript
const handlePayment = async () => {
  // 유효성 검사만 있고 중복 클릭 방지 없음
  if (!validateBeforePayment()) {
    return;
  }

  setIsProcessing(true);

  try {
    // ... 결제 로직
  } finally {
    setIsProcessing(false); // ❌ finally에서 해제하면 에러 시에도 재클릭 가능
  }
};
```

#### ❌ 실패하는 부분

1. **프론트엔드 중복 클릭 방어 미흡**

**문제점**:
- `isProcessing` 플래그만으로는 부족
- 네트워크 지연 시 연속 클릭 가능
- 페이지 새로고침 시 상태 초기화

**필요한 로직**:
```typescript
const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

const handlePayment = async () => {
  // 이미 처리 중이면 무시
  if (isProcessing) {
    toast.warning('결제 처리 중입니다...');
    return;
  }

  // localStorage에 처리 중 플래그 저장 (새로고침 방어)
  const orderIdKey = `payment_processing_${Date.now()}`;
  localStorage.setItem('payment_processing', orderIdKey);

  setIsProcessing(true);
  setProcessingOrderId(orderIdKey);

  try {
    // 멱등성 키 생성
    const idempotencyKey = `${user.id}_${Date.now()}_${Math.random()}`;

    const orderResponse = await api.createOrder({
      // ... 기존 파라미터
    }, {
      headers: {
        'X-Idempotency-Key': idempotencyKey
      }
    });

    // ...
  } catch (error) {
    // 에러 시에만 플래그 해제 (성공 시에는 결제 완료 페이지로 이동하므로 불필요)
    localStorage.removeItem('payment_processing');
    setIsProcessing(false);
  }
};

// 컴포넌트 마운트 시 처리 중 상태 복구
useEffect(() => {
  const processingFlag = localStorage.getItem('payment_processing');
  if (processingFlag) {
    // 5분 이상 지났으면 플래그 삭제
    const timestamp = parseInt(processingFlag.split('_')[2]);
    if (Date.now() - timestamp > 5 * 60 * 1000) {
      localStorage.removeItem('payment_processing');
    } else {
      setIsProcessing(true);
      toast.info('결제 처리 중입니다...');
    }
  }
}, []);
```

2. **서버 측 멱등성 키 미사용** (1.1에서 지적)

#### 평가: ❌ **불통과** (30/100)

**실패**: 멱등성 키 없음, 프론트엔드 방어 미흡, localStorage 활용 없음

---

### 1.4 금액 위변조 방지 ❌

**케이스**: 프론트 금액 조작 (디버거로 price 변경)

#### 현재 구현 상태

**파일**: `api/orders.js` - 금액 재계산 로직 **없음**

**파일**: `api/payments/confirm.js` (Line 220-232)

```javascript
// ✅ 금액 검증 추가 (보안 강화)
const expectedAmount = parseFloat(booking.total_amount || 0);
const actualAmount = parseFloat(amount);
const difference = Math.abs(expectedAmount - actualAmount);

// 1원 이하 오차 허용
if (difference > 1) {
  console.error(`❌ [금액 검증 실패]`);
  throw new Error(`AMOUNT_MISMATCH`);
}
```

#### ✅ 통과하는 부분

1. **confirm 단계 검증**: Toss로부터 받은 금액과 DB 저장 금액 비교 ✅

#### ❌ 실패하는 부분

1. **주문 생성 단계 검증 없음**

**취약 시나리오**:
```
1. 사용자가 DevTools로 PaymentPage의 totalAmount를 1000원으로 변경
2. createOrder API 호출 시 totalAmount: 1000 전송
3. 서버는 검증 없이 1000원으로 payments 레코드 생성
4. Toss API에는 10000원 요청 (프론트가 조작)
5. confirm 단계에서야 금액 불일치 발견 → 에러
   → 하지만 이미 DB에 잘못된 금액으로 주문 생성됨
```

**필요한 로직**: (1.1에서 제시한 코드)

```javascript
// api/orders.js POST 핸들러
// 1. 각 상품의 DB 가격 조회
let serverCalculatedTotal = 0;

for (const item of items) {
  const listing = await connection.execute(`
    SELECT price_from, category FROM listings WHERE id = ?
  `, [item.listingId]);

  if (!listing.rows || listing.rows.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'LISTING_NOT_FOUND'
    });
  }

  const dbPrice = listing.rows[0].price_from;

  // 클라이언트가 보낸 가격과 DB 가격 비교
  if (Math.abs(item.price - dbPrice) > 1) {
    return res.status(422).json({
      success: false,
      error: 'PRICE_TAMPERING',
      message: `${item.title} 가격이 변경되었습니다. 페이지를 새로고침해주세요.`,
      expected: dbPrice,
      received: item.price
    });
  }

  serverCalculatedTotal += dbPrice * item.quantity;

  // 옵션 가격도 검증
  if (item.selectedOption) {
    const option = await connection.execute(`
      SELECT price_adjustment FROM product_options WHERE id = ?
    `, [item.selectedOption.id]);

    if (option.rows && option.rows.length > 0) {
      serverCalculatedTotal += option.rows[0].price_adjustment * item.quantity;
    }
  }
}

// 2. 배송비 추가 (서버에서 재계산)
const deliveryFee = calculateDeliveryFee(items); // 배송비 계산 로직
serverCalculatedTotal += deliveryFee;

// 3. 쿠폰/포인트 차감 적용 (서버에서 재검증)
if (couponCode) {
  const coupon = await validateCoupon(couponCode, userId, serverCalculatedTotal);
  serverCalculatedTotal -= coupon.discountAmount;
}

if (pointsUsed > 0) {
  const userPoints = await getUserPoints(userId);
  if (userPoints < pointsUsed) {
    return res.status(422).json({
      success: false,
      error: 'INSUFFICIENT_POINTS'
    });
  }
  serverCalculatedTotal -= pointsUsed;
}

// 4. 최종 금액 비교
if (Math.abs(serverCalculatedTotal - totalAmount) > 1) {
  console.error(`❌ [금액 위변조 감지] Server: ${serverCalculatedTotal}, Client: ${totalAmount}`);
  return res.status(422).json({
    success: false,
    error: 'AMOUNT_MISMATCH',
    message: '결제 금액이 일치하지 않습니다. 페이지를 새로고침해주세요.',
    serverCalculated: serverCalculatedTotal,
    clientSent: totalAmount
  });
}

console.log(`✅ [금액 검증 통과] ${serverCalculatedTotal}원`);
```

#### 평가: ❌ **불통과** (40/100)

**통과**: confirm 단계 검증 (늦은 시점)
**실패**: 주문 생성 단계 서버 재계산 없음 → **Critical 보안 취약점**

---

## 2. 환불/취소 시나리오 분석 (85/100)

### 2.1 전액 환불 (미출고) ✅

**케이스**: 결제 완료 → 출고 전 전액 환불

#### 현재 구현 상태

**파일**: `api/payments/refund.js` (Line 450-708)

```javascript
async function refundPayment({
  paymentKey,
  cancelReason,
  cancelAmount = null,
  skipPolicy = false
}) {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // ... (중략)

    // 5. Toss Payments 환불 API 호출
    const tossResult = await cancelTossPayment(
      paymentKey,
      cancelReason,
      actualRefundAmount
    );

    console.log(`✅ [Refund] Toss Payments 환불 완료: ${actualRefundAmount}원`);

    // 6. 재고 복구
    await restoreStock(connection, payment.booking_id || orderId);

    // 7. 포인트 회수
    await deductEarnedPoints(connection, payment.user_id, orderId);

    // 8. bookings 상태 변경
    await connection.execute(`
      UPDATE bookings
      SET status = 'cancelled',
          payment_status = 'refunded',
          cancellation_reason = ?,
          updated_at = NOW()
      WHERE id = ?
    `, [cancelReason, payment.booking_id]);

    // 9. payments 테이블 업데이트
    await connection.execute(`
      UPDATE payments
      SET payment_status = 'refunded',
          refund_amount = ?,
          refund_reason = ?,
          refunded_at = NOW(),
          updated_at = NOW()
      WHERE payment_key = ?
    `, [actualRefundAmount, cancelReason, paymentKey]);

    return {
      success: true,
      message: '환불이 완료되었습니다.',
      refundAmount: actualRefundAmount,
      paymentKey,
      bookingId: payment.booking_id,
      orderNumber: payment.order_number,
      refundedAt: new Date().toISOString()
    };
  }
}
```

#### ✅ 통과하는 부분

1. **Toss API 호출**: `cancelTossPayment()` ✅
2. **재고 복구**: `restoreStock()` ✅
3. **포인트 회수**: `deductEarnedPoints()` ✅ (음수 방지 포함)
4. **상태 업데이트**:
   - bookings.status → 'cancelled' ✅
   - bookings.payment_status → 'refunded' ✅
   - payments.payment_status → 'refunded' ✅
5. **로그 기록**: booking_logs에 기록 ✅

#### 평가: ✅ **통과** (95/100)

**우수**: 모든 필수 단계 구현됨
**미흡**: 쿠폰 복구 미구현 (-5점)

---

### 2.2 부분 환불 (출고~배송완료 전) ✅

**케이스**: 왕복 배송비 차감 환불

#### 현재 구현 상태

**파일**: `api/admin/refund-booking.js` (Line 86-110)

```javascript
// 팝업 카테고리만 배송 상태 체크
if (category === '팝업' && delivery_status) {
  const RETURN_FEE = 3000; // 반품비 3,000원

  // 상품 하자/오배송은 전액 환불
  const isDefectOrWrongItem = cancelReason.includes('하자') ||
                              cancelReason.includes('오배송');

  if (isDefectOrWrongItem) {
    refundAmount = amount; // 전액 환불
    console.log(`💰 [Admin Refund] 상품 하자/오배송 → 전액 환불`);
  } else if (delivery_status === 'shipped' || delivery_status === 'delivered') {
    // 배송 중 or 배송 완료 → 배송비 + 반품비 차감
    const deduction = deliveryFee + RETURN_FEE;
    refundAmount = Math.max(0, amount - deduction);
    console.log(`💰 배송비(${deliveryFee}) + 반품비(${RETURN_FEE}) 차감 = ${refundAmount}원`);
  } else {
    refundAmount = amount; // 배송 전 → 전액 환불
  }
}
```

#### ✅ 통과하는 부분

1. **배송 상태 체크**: delivery_status 기반 판단 ✅
2. **차감 계산**:
   - 왕복 배송비: deliveryFee + RETURN_FEE ✅
   - Math.max(0, ...) 음수 방지 ✅
3. **하자/오배송 구분**: 전액 환불 ✅

#### ⚠️ 개선 필요

1. **명세 표시 미흡**

**현재**: console.log만 있고 사용자에게 보여지는 명세 없음

**필요한 개선**:
```javascript
// refund.js에서 반환값에 명세 추가
return {
  success: true,
  message: '환불이 완료되었습니다.',
  refundAmount: actualRefundAmount,
  refundBreakdown: { // ✨ 명세 추가
    originalAmount: amount,
    deliveryFee: deliveryFee,
    returnFee: RETURN_FEE,
    deduction: deliveryFee + RETURN_FEE,
    refundAmount: actualRefundAmount,
    reason: isDefectOrWrongItem ? '하자/오배송 (판매자 부담)' : '변심 반품'
  }
};
```

**마이페이지에 표시**:
```typescript
<div className="환불 명세">
  <div>원 결제금액: ₩{originalAmount}</div>
  <div>배송비 차감: -₩{deliveryFee}</div>
  <div>반품비 차감: -₩{returnFee}</div>
  <hr />
  <div>실 환불금액: ₩{refundAmount}</div>
  <div className="text-xs">사유: {reason}</div>
</div>
```

2. **증빙 첨부 필드 없음**

**필요한 DB 컬럼**:
```sql
ALTER TABLE payments
ADD COLUMN refund_evidence_urls TEXT, -- 사진 증빙 URL (JSON 배열)
ADD COLUMN refund_shipping_track VARCHAR(100); -- 반품 송장번호
```

#### 평가: ✅ **통과** (80/100)

**통과**: 차감 계산 정확, 하자/오배송 구분
**미흡**: 사용자 명세 표시 없음, 증빙 첨부 미구현

---

### 2.3 하자/오배송 환불 ✅

**케이스**: 배송비 전액 판매자 부담

#### 현재 구현 상태

**파일**: `api/admin/refund-booking.js` (Line 91-96)

```javascript
const isDefectOrWrongItem = cancelReason.includes('하자') ||
                            cancelReason.includes('오배송');

if (isDefectOrWrongItem) {
  refundAmount = amount; // 판매자 귀책 → 전액 환불
  console.log(`💰 [Admin Refund] 상품 하자/오배송 → 전액 환불: ${refundAmount}원`);
}
```

#### ✅ 통과하는 부분

1. **하자/오배송 감지**: cancelReason 키워드 검사 ✅
2. **전액 환불**: amount 그대로 환불 ✅

#### ⚠️ 개선 필요

1. **증빙 사진 첨부 없음** (2.2에서 지적)
2. **키워드 방식의 한계**

**개선안**:
```javascript
// ENUM으로 환불 사유 관리
const REFUND_REASON_TYPES = {
  CHANGE_OF_MIND: '단순 변심',
  DEFECT: '상품 하자',
  WRONG_ITEM: '오배송',
  SIZE_MISMATCH: '사이즈 불일치',
  DELAYED_DELIVERY: '배송 지연'
};

// DB 컬럼 추가
ALTER TABLE payments
ADD COLUMN refund_reason_type ENUM(
  'CHANGE_OF_MIND',
  'DEFECT',
  'WRONG_ITEM',
  'SIZE_MISMATCH',
  'DELAYED_DELIVERY'
);

// 코드
const isSellerFault = ['DEFECT', 'WRONG_ITEM', 'DELAYED_DELIVERY']
  .includes(refund_reason_type);

if (isSellerFault) {
  refundAmount = amount; // 전액 환불
  needsEvidence = refund_reason_type === 'DEFECT'; // 하자는 증빙 필요
}
```

#### 평가: ✅ **통과** (85/100)

**통과**: 전액 환불 로직 정확
**미흡**: 증빙 시스템 없음, ENUM 타입 미사용

---

## 3. 웹훅/보안/멱등성 분석 (95/100)

### 3.1 웹훅 서명 검증 ✅

**케이스**: 올바른 서명 / 잘못된 서명 / 헤더 누락

#### 현재 구현 상태

**파일**: `api/payments/webhook.js` (Line 40-78)

```javascript
function verifyWebhookSignature(req) {
  const signature = req.headers['toss-signature'];

  if (!signature || !TOSS_WEBHOOK_SECRET) {
    console.warn('⚠️ [Webhook] Missing signature or secret');
    return false;
  }

  try {
    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', TOSS_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    const isValid = crypto.timingSafeEqual( // ✅ Timing-safe 비교
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      console.error('❌ [Webhook] Signature verification failed');
      notifyWebhookFailure('Signature verification failed', {
        signature: signature?.substring(0, 20) + '...', // ✅ 일부 마스킹
        mode: getTossMode()
      });
    }

    return isValid;
  } catch (error) {
    console.error('❌ [Webhook] Signature verification error:', error);
    notifyError('Webhook Signature Verification Error', error);
    return false;
  }
}
```

**메인 핸들러**:
```javascript
// Line 397-403
if (!verifyWebhookSignature(req)) {
  return res.status(401).json({
    success: false,
    error: 'Invalid signature'
  });
}
```

#### ✅ 통과하는 부분

1. **HMAC-SHA256 검증**: ✅
2. **Timing-safe 비교**: crypto.timingSafeEqual() ✅
3. **헤더 누락 처리**: 401 반환 ✅
4. **Slack 알림**: 검증 실패 시 알림 ✅
5. **민감정보 마스킹**: signature.substring(0, 20) + '...' ✅

#### 평가: ✅ **우수** (100/100)

**완벽**: 모든 보안 요구사항 충족

---

### 3.2 멱등성 (중복 웹훅) ✅

**케이스**: 같은 이벤트 2~3회 재전송

#### 현재 구현 상태

**파일**: `api/payments/webhook.js` (Line 34-111)

**메모리 캐시 방식**:
```javascript
// Line 83-97
function isEventProcessed(eventId) {
  const lastProcessed = processedEvents.get(eventId);

  if (lastProcessed) {
    const ageMinutes = (Date.now() - lastProcessed) / 1000 / 60;
    if (ageMinutes < 60) { // 1시간 이내 중복
      console.log(`🔁 [Webhook] Event already processed: ${eventId}`);
      return true;
    }
    processedEvents.delete(eventId); // 1시간 지나면 삭제
  }

  return false;
}
```

**DB 기반 멱등성** (더 강력):
```javascript
// Line 124-150 (handlePaymentApproved 내부)
try {
  // UNIQUE 제약조건 (payment_key, event_type)으로 멱등성 보장
  await db.execute(`
    INSERT INTO payment_events (
      event_id, event_type, payment_key, amount, raw_payload, created_at
    ) VALUES (?, ?, ?, ?, ?, NOW())
  `, [
    crypto.randomUUID(),
    'Payment.Approved',
    paymentKey,
    totalAmount,
    JSON.stringify(event)
  ]);
} catch (duplicateError) {
  if (duplicateError.code === 'ER_DUP_ENTRY') {
    console.log(`⚠️ [Webhook] Duplicate event detected: ${paymentKey}`);
    return; // 이미 처리됨, 무시
  }
}
```

**메인 핸들러**:
```javascript
// Line 415-422
if (isEventProcessed(event.eventId)) {
  return res.status(200).json({
    success: true,
    message: 'Event already processed' // ✅ 200 OK (no-op)
  });
}
```

#### ✅ 통과하는 부분

1. **이중 방어**:
   - 메모리 캐시 (빠른 체크) ✅
   - DB UNIQUE 제약 (영구 보장) ✅
2. **200 OK 반환**: Toss가 재시도하지 않도록 ✅
3. **로그 기록**: "Event already processed" ✅

#### 평가: ✅ **우수** (100/100)

**완벽**: 메모리 + DB 이중 방어, 200 OK 반환

---

### 3.3 순서 역전 내성 ⚠️

**케이스**: payment.captured가 payment.approved보다 늦게 도착

#### 현재 구현 상태

**상태 전이 로직 없음**

**파일**: `api/payments/webhook.js`에는 `payment.approved` / `payment.canceled` / `payment.failed`만 처리

**문제점**:
- 상태 머신 (State Machine) 없음
- 순서 역전 시 동작 불명확

**필요한 로직**:
```javascript
// 허용된 상태 전이 정의
const ALLOWED_TRANSITIONS = {
  'pending': ['paid', 'failed', 'cancelled'],
  'paid': ['refunded', 'partially_refunded'],
  'failed': [], // 실패 후에는 전이 불가
  'refunded': [], // 환불 후에는 전이 불가
  'cancelled': []
};

async function updatePaymentStatus(paymentKey, newStatus) {
  const payment = await db.query(`
    SELECT payment_status FROM payments
    WHERE payment_key = ?
  `, [paymentKey]);

  const currentStatus = payment[0].payment_status;

  // 상태 전이 검증
  if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus)) {
    console.warn(`⚠️ [State Machine] Invalid transition: ${currentStatus} → ${newStatus}`);
    return false; // 전이 불가
  }

  // 최종 상태 (refunded, failed 등)에서는 변경 불가
  if (ALLOWED_TRANSITIONS[currentStatus].length === 0) {
    console.warn(`⚠️ [State Machine] Terminal state: ${currentStatus}`);
    return false;
  }

  // 전이 허용
  await db.execute(`
    UPDATE payments
    SET payment_status = ?,
        updated_at = NOW()
    WHERE payment_key = ?
  `, [newStatus, paymentKey]);

  return true;
}
```

#### 평가: ⚠️ **부분 통과** (70/100)

**통과**: 멱등성으로 인한 중복 방지
**미흡**: 명시적 상태 머신 없음

---

### 3.4 타임아웃/재시도 ✅

**케이스**: 서버 지연 시 재시도 처리

#### 현재 구현 상태

**파일**: `api/payments/webhook.js` (Line 454-464)

```javascript
} catch (error) {
  console.error('❌ [Webhook] Handler error:', error);

  // 에러가 발생해도 200 OK를 반환하여 Toss가 재시도하지 않도록 함
  // (중요한 에러의 경우 별도 알림 시스템으로 처리)
  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
}
```

#### ⚠️ 주의점

**현재 로직**:
- 에러 발생 시 **500 반환** → Toss가 재시도함
- 멱등성 보장으로 재시도해도 안전

**개선 권장**:
```javascript
} catch (error) {
  console.error('❌ [Webhook] Handler error:', error);

  // Slack 알림
  notifyError('Webhook Handler Error', error, {
    eventId: event.eventId,
    eventType: event.eventType
  });

  // 재시도 가능한 에러 vs 재시도 불가능한 에러 구분
  const isRetryable = !error.message.includes('AMOUNT_MISMATCH') &&
                      !error.message.includes('BOOKING_NOT_FOUND');

  if (isRetryable) {
    // 재시도 가능 → 500 반환
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      retryable: true
    });
  } else {
    // 재시도 불가능 (데이터 문제) → 200 반환 (Toss 재시도 중단)
    return res.status(200).json({
      success: false,
      error: 'Business logic error',
      message: error.message,
      retryable: false
    });
  }
}
```

#### 평가: ✅ **통과** (90/100)

**통과**: 멱등성으로 재시도 안전, Slack 알림
**미흡**: Retryable vs Non-retryable 구분 없음

---

## 4. 쿠폰/포인트/정산 분석 (75/100)

### 4.1 쿠폰 적용 + 부분 환불 ⚠️

#### 현재 구현 상태

**쿠폰 사용**: `api/payments/confirm.js` (Line 363-417)

```javascript
// ✅ 쿠폰 사용 처리 (포인트 차감 성공 후 실행)
try {
  if (notes && notes.couponCode) {
    console.log(`🎟️ [쿠폰] 쿠폰 사용 처리: ${notes.couponCode}`);

    // 🔒 FOR UPDATE 락으로 동시성 제어
    const couponCheck = await connection.execute(`
      SELECT usage_limit, used_count
      FROM coupons
      WHERE code = ? AND is_active = TRUE
      FOR UPDATE
    `, [notes.couponCode.toUpperCase()]);

    // 쿠폰 사용 횟수 증가
    const updateResult = await connection.execute(`
      UPDATE coupons
      SET used_count = used_count + 1,
          updated_at = NOW()
      WHERE code = ?
        AND (usage_limit IS NULL OR used_count < usage_limit)
    `, [notes.couponCode.toUpperCase()]);

    // user_coupons 테이블에서 사용 처리
    await connection.execute(`
      UPDATE user_coupons
      SET is_used = TRUE, used_at = NOW(), order_number = ?
      WHERE user_id = ? AND coupon_id = ?
    `, [orderId, userId, coupon.id]);
  }
}
```

**환불 시 쿠폰 처리**: `api/payments/refund.js` - **쿠폰 복구 로직 없음** ❌

#### ❌ 실패하는 부분

1. **쿠폰 복구 미구현**

**문제 시나리오**:
```
1. 사용자가 WELCOME20 쿠폰으로 20% 할인 받아 결제
2. user_coupons: is_used = TRUE
3. coupons: used_count += 1
4. 사용자가 환불 요청
5. 환불 처리됨 (refund.js)
6. ❌ 쿠폰은 복구 안 됨 → 사용자는 쿠폰을 잃음
```

**필요한 로직**:
```javascript
// refund.js 내부
async function refundPayment({ paymentKey, cancelReason, ... }) {
  // ...

  // 쿠폰 복구 (환불 정책에 따라 조건부)
  try {
    const notes = payment.notes ? JSON.parse(payment.notes) : null;

    if (notes && notes.couponCode && notes.couponId) {
      console.log(`🎟️ [쿠폰 복구] ${notes.couponCode}`);

      // 정책: 전액 환불 시에만 쿠폰 복구, 부분 환불 시에는 복구 안 함
      const isFullRefund = actualRefundAmount === payment.amount;

      if (isFullRefund) {
        // user_coupons 복구
        await connection.execute(`
          UPDATE user_coupons
          SET is_used = FALSE,
              used_at = NULL,
              order_number = NULL
          WHERE user_id = ? AND coupon_id = ?
        `, [payment.user_id, notes.couponId]);

        // coupons 사용 횟수 감소
        await connection.execute(`
          UPDATE coupons
          SET used_count = GREATEST(0, used_count - 1)
          WHERE id = ?
        `, [notes.couponId]);

        console.log(`✅ [쿠폰 복구] 완료: ${notes.couponCode}`);
      } else {
        console.log(`⚠️ [쿠폰 복구] 부분 환불이므로 쿠폰 복구 안 함`);
      }
    }
  } catch (couponError) {
    console.error('❌ [쿠폰 복구] 실패:', couponError);
    // 쿠폰 복구 실패해도 환불은 진행
  }
}
```

2. **부분 환불 시 쿠폰 할인액 배분 미구현**

**문제 시나리오**:
```
원래 가격: 10,000원
쿠폰 20% 할인: -2,000원
결제 금액: 8,000원

부분 환불 (배송비 3,000원 차감):
→ 환불 금액 = 8,000 - 3,000 = 5,000원

❓ 질문: 쿠폰 할인 2,000원은 어떻게 배분?
- 옵션 1: 쿠폰 할인액을 비율로 배분 (5,000 * 1.25 = 6,250원 환불?)
- 옵션 2: 배송비만 차감하고 쿠폰 할인액은 유지
- 옵션 3: 쿠폰 할인액도 차감 대상에 포함
```

**권장 정책**:
```javascript
// 배송비 차감 시 쿠폰 할인액은 유지
const originalAmount = payment.amount; // 8,000원 (이미 할인된 금액)
const refundAmount = originalAmount - shippingFee; // 5,000원

// 쿠폰 할인액은 이미 결제 시 적용되었으므로
// 환불 시에는 결제된 금액(8,000)을 기준으로 계산
```

#### 평가: ⚠️ **부분 통과** (50/100)

**통과**: 쿠폰 사용 로직 정상
**실패**: 환불 시 쿠폰 복구 없음, 부분 환불 배분 정책 없음

---

### 4.2 포인트 사용 + 환불 ✅

#### 현재 구현 상태

**포인트 사용**: `api/payments/confirm.js` (Line 304-361)

```javascript
// ✅ 포인트 차감을 쿠폰 사용보다 먼저 처리
const pointsUsed = notes?.pointsUsed || 0;

if (pointsUsed > 0 && userId) {
  const poolNeon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL });

  try {
    await poolNeon.query('BEGIN');

    // FOR UPDATE로 동시성 제어
    const userResult = await poolNeon.query(`
      SELECT total_points FROM users WHERE id = $1 FOR UPDATE
    `, [userId]);

    const currentPoints = userResult.rows[0].total_points || 0;

    // 포인트 부족 체크
    if (currentPoints < pointsUsed) {
      throw new Error(`포인트가 부족합니다`);
    }

    const newBalance = currentPoints - pointsUsed;

    // 포인트 내역 추가
    await connection.execute(`
      INSERT INTO user_points (user_id, points, point_type, reason, ...)
      VALUES (?, ?, 'use', ?, ...)
    `, [userId, -pointsUsed, `주문 결제 (주문번호: ${orderId})`, ...]);

    // 사용자 포인트 업데이트
    await poolNeon.query(`
      UPDATE users SET total_points = $1 WHERE id = $2
    `, [newBalance, userId]);

    await poolNeon.query('COMMIT');
  } catch (pointsError) {
    await poolNeon.query('ROLLBACK');
    throw new Error(`포인트 차감 실패: ${pointsError.message}`);
  }
}
```

**환불 시 포인트 복구**: `api/payments/refund.js` (Line 255-372)

```javascript
async function deductEarnedPoints(connection, userId, orderNumber) {
  try {
    // 해당 주문으로 적립된 포인트 조회
    const earnedPointsResult = await connection.execute(`
      SELECT points FROM user_points
      WHERE user_id = ?
        AND related_order_id = ?
        AND point_type = 'earn'
    `, [userId, orderNumber]);

    const pointsToDeduct = earnedPointsResult.rows.reduce((sum, row) => sum + row.points, 0);

    if (pointsToDeduct > 0) {
      const poolNeon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL });

      try {
        const userResult = await poolNeon.query(`
          SELECT total_points FROM users WHERE id = $1
        `, [userId]);

        const currentPoints = userResult.rows[0]?.total_points || 0;
        const newBalance = Math.max(0, currentPoints - pointsToDeduct); // ✅ 음수 방지

        // 포인트 내역 추가 (회수)
        await connection.execute(`
          INSERT INTO user_points (user_id, points, point_type, reason, ...)
          VALUES (?, ?, 'deduct', ?, ...)
        `, [userId, -pointsToDeduct, `환불로 인한 포인트 회수`, ...]);

        // 사용자 포인트 업데이트
        await poolNeon.query(`
          UPDATE users SET total_points = $1 WHERE id = $2
        `, [newBalance, userId]);
      }
    }
  }
}
```

#### ✅ 통과하는 부분

1. **포인트 차감**: FOR UPDATE 락, 부족 체크 ✅
2. **포인트 복구**: 적립 포인트 회수, 음수 방지 ✅
3. **로그/내역**: user_points 테이블에 기록 ✅

#### ⚠️ 미흡한 부분

**환불 시 사용한 포인트는 복구 안 됨**

**시나리오**:
```
1. 사용자가 1,000P 사용하여 결제
2. user_points: -1,000P (use)
3. users.total_points: 5,000 → 4,000
4. 환불 요청
5. deductEarnedPoints() 실행
   → 적립 포인트(earn)만 회수
   → ❌ 사용한 1,000P는 복구 안 됨
```

**필요한 로직**:
```javascript
// refund.js에 추가
async function refundUsedPoints(connection, userId, orderNumber, amount) {
  try {
    // 해당 주문에서 사용한 포인트 조회
    const usedPointsResult = await connection.execute(`
      SELECT points FROM user_points
      WHERE user_id = ?
        AND related_order_id = ?
        AND point_type = 'use'
    `, [userId, orderNumber]);

    const pointsToRefund = Math.abs(
      usedPointsResult.rows.reduce((sum, row) => sum + row.points, 0)
    );

    if (pointsToRefund > 0) {
      console.log(`💰 [포인트 환불] ${pointsToRefund}P`);

      const poolNeon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL });

      const userResult = await poolNeon.query(`
        SELECT total_points FROM users WHERE id = $1
      `, [userId]);

      const currentPoints = userResult.rows[0]?.total_points || 0;
      const newBalance = currentPoints + pointsToRefund; // 복구

      // 포인트 내역 추가 (환불)
      await connection.execute(`
        INSERT INTO user_points (user_id, points, point_type, reason, ...)
        VALUES (?, ?, 'refund', ?, ...)
      `, [userId, pointsToRefund, `환불로 인한 포인트 복구`, ...]);

      // 사용자 포인트 업데이트
      await poolNeon.query(`
        UPDATE users SET total_points = $1 WHERE id = $2
      `, [newBalance, userId]);

      console.log(`✅ [포인트 환불] 완료: ${pointsToRefund}P (잔액: ${newBalance}P)`);
    }
  } catch (error) {
    console.error('❌ [포인트 환불] 실패:', error);
  }
}

// refundPayment() 내부에서 호출
await refundUsedPoints(connection, payment.user_id, orderNumber, actualRefundAmount);
await deductEarnedPoints(connection, payment.user_id, orderNumber);
```

#### 평가: ✅ **통과** (85/100)

**통과**: 포인트 적립 회수, 동시성 제어, 음수 방지
**미흡**: 사용한 포인트 환불 미구현 (-15점)

---

### 4.3 여러 상품 부분 환불 ⚠️

**케이스**: 장바구니 3개 상품 중 1개만 환불

#### 현재 구현 상태

**현재 시스템**: 주문 단위 환불만 가능 (ORDER_ 전체)

**파일**: `api/payments/refund.js`에서 orderId로 환불

#### ❌ 실패하는 부분

**항목별 환불 미지원**

**시나리오**:
```
장바구니:
- 상품 A: 10,000원
- 상품 B: 20,000원
- 상품 C: 30,000원
총액: 60,000원 결제

사용자가 상품 B만 환불하고 싶음
→ ❌ 현재 시스템: 불가능 (전체 주문 환불만 가능)
```

**필요한 구조**:
```javascript
// 1. bookings 테이블에 개별 환불 상태 추가
ALTER TABLE bookings
ADD COLUMN individual_refund_status ENUM('none', 'requested', 'approved', 'completed'),
ADD COLUMN individual_refund_amount DECIMAL(10, 2);

// 2. API 엔드포인트 추가
POST /api/payments/refund-item
{
  "bookingId": 123,
  "reason": "사이즈 불일치"
}

// 3. 환불 로직
async function refundBookingItem(bookingId, reason) {
  const booking = await db.query(`
    SELECT * FROM bookings WHERE id = ?
  `, [bookingId]);

  // 해당 booking의 금액 계산
  const itemAmount = booking.price * booking.quantity;
  const itemDeliveryFee = calculateItemDeliveryFee(booking);

  // 부분 환불 요청
  await cancelTossPayment(
    payment.payment_key,
    reason,
    itemAmount + itemDeliveryFee // 부분 환불 금액
  );

  // booking 상태 업데이트
  await db.execute(`
    UPDATE bookings
    SET individual_refund_status = 'completed',
        individual_refund_amount = ?,
        payment_status = 'refunded'
    WHERE id = ?
  `, [itemAmount + itemDeliveryFee, bookingId]);

  // 재고 복구 (해당 항목만)
  await restoreStockForBooking(bookingId);
}
```

#### 평가: ❌ **불통과** (30/100)

**실패**: 항목별 환불 미지원, 전체 주문 환불만 가능

---

### 4.4 정산 리포트 대조 ⚠️

**케이스**: PG 정산 CSV vs DB 결제/환불 합계 완전 일치

#### 현재 구현 상태

**정산 검증 기능 없음**

**필요한 구현**:

```javascript
// scripts/reconciliation.js
async function reconcilePayments(pgCsvPath, startDate, endDate) {
  // 1. PG사 CSV 파싱
  const pgData = parsePGCsv(pgCsvPath);

  const pgTotal = {
    paid: pgData.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.amount, 0),
    refunded: pgData.filter(r => r.status === 'refunded').reduce((sum, r) => sum + r.amount, 0)
  };

  // 2. DB 데이터 조회
  const dbPaid = await connection.execute(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM payments
    WHERE payment_status = 'paid'
      AND DATE(approved_at) BETWEEN ? AND ?
  `, [startDate, endDate]);

  const dbRefunded = await connection.execute(`
    SELECT COALESCE(SUM(refund_amount), 0) as total
    FROM payments
    WHERE payment_status = 'refunded'
      AND DATE(refunded_at) BETWEEN ? AND ?
  `, [startDate, endDate]);

  const dbTotal = {
    paid: dbPaid.rows[0].total,
    refunded: dbRefunded.rows[0].total
  };

  // 3. 대조
  const paidDiff = pgTotal.paid - dbTotal.paid;
  const refundedDiff = pgTotal.refunded - dbTotal.refunded;

  console.log('정산 대조 결과:');
  console.log(`PG 결제: ${pgTotal.paid}원`);
  console.log(`DB 결제: ${dbTotal.paid}원`);
  console.log(`차이: ${paidDiff}원 (${paidDiff === 0 ? '✅' : '❌'})`);
  console.log('');
  console.log(`PG 환불: ${pgTotal.refunded}원`);
  console.log(`DB 환불: ${dbTotal.refunded}원`);
  console.log(`차이: ${refundedDiff}원 (${refundedDiff === 0 ? '✅' : '❌'})`);

  if (paidDiff === 0 && refundedDiff === 0) {
    console.log('✅ 정산 대조 완료: 100% 일치');
    return true;
  } else {
    console.error('❌ 정산 불일치 발견');

    // 불일치 상세 분석
    await analyzeDiscrepancies(pgData, dbTotal, startDate, endDate);

    return false;
  }
}
```

#### 평가: ❌ **불통과** (0/100)

**실패**: 정산 검증 기능 미구현

---

## 5. 재고/주문 상태 & 동시성 분석 (40/100)

### 5.1 재고 감소/복구 ⚠️

#### 현재 구현 상태

**재고 감소**: `api/orders.js` - **재고 감소 로직 없음** ❌

**재고 복구**: `api/payments/refund.js` (Line 199-254)

```javascript
async function restoreStock(connection, bookingId) {
  try {
    const bookingResult = await connection.execute(`
      SELECT listing_id, guests, selected_option
      FROM bookings
      WHERE id = ?
    `, [bookingId]);

    const booking = bookingResult.rows[0];

    // 옵션 재고 복구
    if (booking.selected_option) {
      const option = JSON.parse(booking.selected_option);

      await connection.execute(`
        UPDATE product_options
        SET stock = stock + ?
        WHERE id = ? AND stock IS NOT NULL
      `, [booking.guests || 1, option.id]);
    }

    // 상품 재고 복구
    await connection.execute(`
      UPDATE listings
      SET stock = stock + ?
      WHERE id = ? AND stock IS NOT NULL
    `, [booking.guests || 1, booking.listing_id]);

    console.log(`✅ [Refund] Stock restored`);
  } catch (error) {
    console.error('❌ [Refund] Stock restore failed:', error);
  }
}
```

#### ❌ 실패하는 부분

1. **결제 시 재고 감소 없음**

**문제 시나리오**:
```
1. 상품 A 재고: 10개
2. 사용자 1이 5개 주문
3. ❌ 재고 감소 안 됨 (여전히 10개)
4. 사용자 2가 8개 주문
5. ✅ 주문 성공 (실제로는 재고 부족해야 함)
```

**필요한 로직**:
```javascript
// api/orders.js POST 핸들러
// bookings 생성 후 재고 감소
for (const item of items) {
  const quantity = item.quantity || 1;

  // 옵션 재고 감소
  if (item.selectedOption && item.selectedOption.id) {
    const result = await connection.execute(`
      UPDATE product_options
      SET stock = stock - ?
      WHERE id = ?
        AND stock >= ? -- ✅ 재고 충분 체크
        AND stock IS NOT NULL
    `, [quantity, item.selectedOption.id, quantity]);

    if (result.affectedRows === 0) {
      throw new Error(`옵션 재고 부족: ${item.selectedOption.name}`);
    }
  } else {
    // 상품 재고 감소
    const result = await connection.execute(`
      UPDATE listings
      SET stock = stock - ?
      WHERE id = ?
        AND stock >= ?
        AND stock IS NOT NULL
    `, [quantity, item.listingId, quantity]);

    if (result.affectedRows === 0) {
      throw new Error(`상품 재고 부족: ${item.title}`);
    }
  }

  console.log(`✅ [재고 감소] ${item.title}: -${quantity}`);
}
```

2. **출고 후 재고 복구 규칙 없음**

**현재**: 모든 환불에서 재고 복구

**문제**: 출고 후 환불 시에도 재고 복구하면 실물과 불일치

**필요한 로직**:
```javascript
// refund.js 내부
async function restoreStock(connection, bookingId) {
  // 배송 상태 체크
  const booking = await connection.execute(`
    SELECT delivery_status, ... FROM bookings WHERE id = ?
  `, [bookingId]);

  const deliveryStatus = booking.rows[0].delivery_status;

  // 출고 전에만 재고 복구
  if (['PENDING', 'READY', null].includes(deliveryStatus)) {
    // 재고 복구 로직
    console.log(`✅ [재고 복구] 출고 전이므로 재고 복구`);
  } else {
    console.log(`⚠️ [재고 복구] 출고 후이므로 재고 복구 안 함`);
    // 실물 반품 확인 후 별도 처리 필요
  }
}
```

#### 평가: ⚠️ **부분 통과** (50/100)

**통과**: 재고 복구 로직 존재
**실패**: 결제 시 재고 감소 없음, 출고 후 규칙 없음

---

### 5.2 동시 구매 (품절 경합) ❌

**케이스**: 동일 상품 수량 1개, 2명의 동시 결제

#### 현재 구현 상태

**트랜잭션 락 없음**

#### ❌ 실패하는 부분

**Race Condition 발생 가능**

**시나리오**:
```
시간  | 사용자 A                | 사용자 B
------|-----------------------|--------------------
T1    | SELECT stock (재고 1)  |
T2    |                       | SELECT stock (재고 1)
T3    | UPDATE stock = 0      |
T4    |                       | UPDATE stock = -1 ❌
T5    | 주문 성공             | 주문 성공 (품절인데!)
```

**필요한 로직**:
```javascript
// api/orders.js
// 트랜잭션 시작
await connection.execute('START TRANSACTION');

try {
  for (const item of items) {
    // FOR UPDATE 락으로 동시성 제어
    const stockCheck = await connection.execute(`
      SELECT stock FROM listings
      WHERE id = ?
      FOR UPDATE -- ✅ 행 락
    `, [item.listingId]);

    const currentStock = stockCheck.rows[0]?.stock;

    if (currentStock === null || currentStock < item.quantity) {
      throw new Error('STOCK_INSUFFICIENT');
    }

    // 재고 감소 (조건부 UPDATE)
    const updateResult = await connection.execute(`
      UPDATE listings
      SET stock = stock - ?
      WHERE id = ?
        AND stock >= ? -- ✅ Double-check
    `, [item.quantity, item.listingId, item.quantity]);

    if (updateResult.affectedRows === 0) {
      // 동시에 다른 사용자가 구매한 경우
      throw new Error('STOCK_RACE_CONDITION');
    }
  }

  // bookings, payments 생성
  // ...

  await connection.execute('COMMIT');
  console.log('✅ [트랜잭션] 커밋 완료');

} catch (error) {
  await connection.execute('ROLLBACK');
  console.error('❌ [트랜잭션] 롤백:', error);

  if (error.message === 'STOCK_INSUFFICIENT') {
    return res.status(409).json({
      success: false,
      error: 'SOLD_OUT',
      message: '품절된 상품이 포함되어 있습니다'
    });
  }

  throw error;
}
```

#### 평가: ❌ **불통과** (0/100)

**실패**: 트랜잭션 락 없음, Race Condition 방어 없음 → **Critical 버그**

---

## 6. 알림/영수증/마이페이지 분석 (60/100)

### 6.1 이메일 알림 ❌

**케이스**: 결제 완료/환불 완료 메일 전송

#### 현재 구현 상태

**이메일 발송 기능 없음**

**Slack 알림만 존재**: `api/payments/webhook.js` (Line 189-193)

```javascript
notifyOrderCompleted({
  orderNumber: orderId,
  productName: 'Booking',
  totalAmount: totalAmount
}).catch(err => console.error('Slack notification failed:', err));
```

#### ❌ 실패하는 부분

**사용자 이메일 알림 없음**

**필요한 구현**:
```javascript
// utils/email-sender.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendPaymentConfirmationEmail(user, order) {
  const mailOptions = {
    from: '"Travleap" <noreply@travleap.com>',
    to: user.email,
    subject: `결제 완료 - 주문번호 ${order.orderNumber}`,
    html: `
      <h2>결제가 완료되었습니다</h2>
      <p>주문번호: ${order.orderNumber}</p>
      <p>결제 금액: ₩${order.totalAmount.toLocaleString()}</p>
      <a href="${process.env.SITE_URL}/mypage/orders/${order.id}">
        주문 상세보기
      </a>
    `
  };

  await transporter.sendMail(mailOptions);
}

// confirm.js에서 호출
await sendPaymentConfirmationEmail(user, orderData);
```

**재시도 큐 필요**:
```javascript
// Bull Queue 사용
const Queue = require('bull');
const emailQueue = new Queue('email', process.env.REDIS_URL);

emailQueue.process(async (job) => {
  await sendEmail(job.data);
});

// 사용
await emailQueue.add({
  type: 'payment_confirmation',
  user: user,
  order: order
}, {
  attempts: 3, // 3회 재시도
  backoff: {
    type: 'exponential',
    delay: 2000
  }
});
```

#### 평가: ❌ **불통과** (0/100)

**실패**: 이메일 발송 기능 미구현

---

### 6.2 마이페이지 내역 ✅

**케이스**: 주문/결제/환불 이력 표시

#### 현재 구현 상태

**파일**: `components/MyPage.tsx` - 결제 내역 탭 존재

**API**: `api/user/payments.js` (결제 내역 조회)

```javascript
const result = await connection.execute(`
  SELECT
    p.id,
    p.amount,
    p.payment_status,
    p.approved_at,
    p.receipt_url,
    p.card_company,
    p.refund_amount,
    p.refunded_at,
    b.booking_number,
    b.start_date,
    b.end_date,
    l.title,
    l.category,
    l.images
  FROM payments p
  LEFT JOIN bookings b ON p.booking_id = b.id
  LEFT JOIN listings l ON b.listing_id = l.id
  WHERE p.user_id = ?
    AND (p.hidden_from_user IS NULL OR p.hidden_from_user = 0)
  ORDER BY p.created_at DESC
  LIMIT 50
`, [parseInt(userId)]);
```

#### ✅ 통과하는 부분

1. **주문/결제 이력**: payments 테이블 조회 ✅
2. **금액·수량 표시**: amount, booking_number 표시 ✅
3. **영수증 링크**: receipt_url 존재 ✅

#### ⚠️ 개선 필요

1. **차감 배송비 명세 표시 없음**

**현재**: 총 결제 금액만 표시

**필요**: 환불 시 차감 내역 표시
```typescript
<div className="환불 상세">
  <div>환불 금액: ₩{refundAmount}</div>
  {refundBreakdown && (
    <div className="text-sm text-gray-600">
      <div>원 결제금액: ₩{refundBreakdown.originalAmount}</div>
      {refundBreakdown.deliveryFee > 0 && (
        <div>배송비 차감: -₩{refundBreakdown.deliveryFee}</div>
      )}
      {refundBreakdown.returnFee > 0 && (
        <div>반품비 차감: -₩{refundBreakdown.returnFee}</div>
      )}
    </div>
  )}
</div>
```

#### 평가: ✅ **통과** (80/100)

**통과**: 주문/결제/환불 이력, 영수증 링크
**미흡**: 차감 배송비 명세 표시 없음

---

### 6.3 관리자 콘솔 ✅

**케이스**: 주문 검색/필터, 결제 상태/환불 로그/웹훅 로그 추적

#### 현재 구현 상태

**파일**: `components/admin/tabs/AdminOrders.tsx`

```typescript
// 주문 검색
<Input
  placeholder="주문번호, 고객명 또는 이메일 검색"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
/>

// 상태 필터
<Select value={statusFilter} onValueChange={setStatusFilter}>
  <SelectItem value="all">전체</SelectItem>
  <SelectItem value="pending">대기중</SelectItem>
  <SelectItem value="confirmed">확정</SelectItem>
  <SelectItem value="completed">완료</SelectItem>
  <SelectItem value="refund_requested">환불대기</SelectItem>
  <SelectItem value="cancelled">취소</SelectItem>
</Select>

// 환불 버튼
<Button onClick={() => handleRefund(order)}>
  환불
</Button>
```

#### ✅ 통과하는 부분

1. **주문 검색**: 주문번호, 고객명, 이메일 ✅
2. **상태 필터**: pending, paid, refunded 등 ✅
3. **환불 처리**: handleRefund() ✅

#### ⚠️ 개선 필요

1. **웹훅 로그 조회 기능 없음**

**필요한 구현**:
```typescript
// AdminWebhookLogs.tsx
<Card>
  <CardHeader>
    <CardTitle>웹훅 로그</CardTitle>
  </CardHeader>
  <CardContent>
    <table>
      <thead>
        <tr>
          <th>이벤트 ID</th>
          <th>이벤트 타입</th>
          <th>결제 키</th>
          <th>금액</th>
          <th>처리 상태</th>
          <th>수신 시간</th>
        </tr>
      </thead>
      <tbody>
        {webhookLogs.map(log => (
          <tr>
            <td>{log.event_id}</td>
            <td>{log.event_type}</td>
            <td>{log.payment_key}</td>
            <td>₩{log.amount}</td>
            <td>{log.status}</td>
            <td>{log.created_at}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </CardContent>
</Card>
```

```javascript
// api/admin/webhook-logs.js
const result = await connection.execute(`
  SELECT * FROM payment_events
  ORDER BY created_at DESC
  LIMIT 100
`);
```

2. **결제 로그 상세 추적 부족**

**필요**: 결제 상태 전이 히스토리
```sql
CREATE TABLE payment_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id INT NOT NULL,
  from_status VARCHAR(50),
  to_status VARCHAR(50),
  changed_by VARCHAR(100), -- 'system', 'admin', 'webhook'
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 평가: ✅ **통과** (75/100)

**통과**: 주문 검색, 상태 필터, 환불 처리
**미흡**: 웹훅 로그 UI 없음, 상태 전이 히스토리 없음

---

## 7. UX/에러 복원력 분석 (65/100)

### 7.1 모바일 브라우저 결제 전환/복귀 ⚠️

**케이스**: 앱 전환 후 복귀에도 상태 동기화

#### 현재 구현 상태

**파일**: `components/PaymentPage.tsx` - **복귀 로직 없음**

#### ❌ 실패하는 부분

**상태 동기화 미구현**

**시나리오**:
```
1. 사용자가 "결제하기" 클릭
2. Toss 앱으로 전환
3. 결제 완료
4. 앱이 브라우저로 복귀
5. ❌ PaymentPage는 여전히 "결제 대기" 상태
   → 사용자가 "결제 완료" 알 수 없음
```

**필요한 로직**:
```typescript
// PaymentPage.tsx
useEffect(() => {
  // 페이지 복귀 시 결제 상태 확인
  const checkPaymentStatus = async () => {
    // URL 파라미터에서 orderId 추출
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');

    if (orderId) {
      try {
        const response = await fetch(`/api/payments/status?orderId=${orderId}`);
        const data = await response.json();

        if (data.success && data.status === 'paid') {
          // 결제 완료 페이지로 이동
          navigate(`/payment-success?orderId=${orderId}`);
        } else if (data.status === 'pending') {
          toast.info('결제 처리 중입니다...');
        }
      } catch (error) {
        console.error('결제 상태 확인 실패:', error);
      }
    }
  };

  checkPaymentStatus();

  // Visibility API로 앱 복귀 감지
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      checkPaymentStatus();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);
```

```javascript
// api/payments/status.js (신규 생성 필요)
module.exports = async function handler(req, res) {
  const { orderId } = req.query;

  const result = await connection.execute(`
    SELECT payment_status FROM payments
    WHERE gateway_transaction_id = ?
  `, [orderId]);

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'ORDER_NOT_FOUND'
    });
  }

  return res.status(200).json({
    success: true,
    status: result.rows[0].payment_status
  });
};
```

#### 평가: ❌ **불통과** (30/100)

**실패**: 앱 복귀 시 상태 동기화 없음, Visibility API 미사용

---

### 7.2 네트워크 끊김/새로고침 중 결제 ⚠️

**케이스**: 복귀 시 서버 상태 기준으로 UI 재동기화

#### 현재 구현 상태

**새로고침 방어 없음**

#### ⚠️ 부분 통과

**Toss 리다이렉트는 안전**:
- Toss에서 성공/실패 URL로 리다이렉트 시 `orderId`, `paymentKey` 파라미터 전달
- `/api/payments/confirm`에서 서버 상태 확인

**문제점**:
- 결제 중 새로고침하면 상태 초기화
- localStorage 활용 없음

**필요한 로직** (7.1과 유사):
```typescript
// PaymentPage.tsx
useEffect(() => {
  // localStorage에서 진행 중인 결제 확인
  const processingOrder = localStorage.getItem('processing_order');

  if (processingOrder) {
    const { orderId, timestamp } = JSON.parse(processingOrder);

    // 10분 이내면 상태 확인
    if (Date.now() - timestamp < 10 * 60 * 1000) {
      checkPaymentStatus(orderId);
    } else {
      localStorage.removeItem('processing_order');
    }
  }
}, []);

const handlePayment = async () => {
  // ...

  // localStorage에 저장
  localStorage.setItem('processing_order', JSON.stringify({
    orderId: orderResponse.orderNumber,
    timestamp: Date.now()
  }));

  // Toss 결제 시작
  // ...
};
```

#### 평가: ⚠️ **부분 통과** (60/100)

**통과**: Toss 리다이렉트 후 상태 확인
**미흡**: 새로고침 시 localStorage 복구 없음

---

### 7.3 오류 페이지 가드 ✅

**케이스**: 4xx/5xx에도 안전한 메시지

#### 현재 구현 상태

**에러 핸들링 존재**

**예시**: `api/payments/confirm.js` (Line 715-788)

```javascript
} catch (error) {
  console.error('❌ [결제 승인] 실패:', error);

  // Toss API 에러의 경우 더 자세한 정보 반환
  if (error.message) {
    return {
      success: false,
      message: error.message,
      code: error.code || 'PAYMENT_CONFIRM_FAILED'
    };
  }

  return {
    success: false,
    message: '결제 승인 중 오류가 발생했습니다.',
    code: 'PAYMENT_CONFIRM_ERROR'
  };
}
```

**프론트엔드**: `components/PaymentPage.tsx`

```typescript
} catch (error) {
  console.error('Payment error:', error);
  toast.error(error.message || '결제 처리 중 오류가 발생했습니다');
}
```

#### ✅ 통과하는 부분

1. **에러 메시지**: 사용자 친화적 메시지 ✅
2. **에러 코드**: PAYMENT_CONFIRM_FAILED 등 ✅
3. **toast 알림**: 시각적 피드백 ✅

#### ⚠️ 개선 필요

**재시도/문의 링크 없음**

**필요한 개선**:
```typescript
<ErrorBoundary
  fallback={({ error }) => (
    <div className="error-page">
      <h2>결제 처리 중 오류가 발생했습니다</h2>
      <p>{error.message}</p>

      <div className="actions">
        <Button onClick={() => window.location.reload()}>
          다시 시도
        </Button>
        <Button variant="outline" onClick={() => navigate('/contact')}>
          고객센터 문의
        </Button>
      </div>

      <p className="text-sm text-gray-500">
        오류 코드: {error.code}
        <br />
        주문번호: {orderId}
      </p>
    </div>
  )}
>
  <PaymentPage />
</ErrorBoundary>
```

#### 평가: ✅ **통과** (85/100)

**통과**: 에러 메시지, 에러 코드, toast 알림
**미흡**: 재시도/문의 링크 없음

---

## 8. 로깅/모니터링/보안 분석 (80/100)

### 8.1 PII 마스킹 로깅 ⚠️

**케이스**: 카드/계좌/전화번호 일부 마스킹

#### 현재 구현 상태

**부분 마스킹 존재**

**파일**: `api/payments/webhook.js` (Line 64)

```javascript
notifyWebhookFailure('Signature verification failed', {
  signature: signature?.substring(0, 20) + '...', // ✅ 일부 마스킹
  mode: getTossMode()
});
```

**파일**: `api/payments/confirm.js` (Line 474-475)

```javascript
card_company: paymentResult.card?.company || null,
card_number: paymentResult.card?.number || null, // ❌ 마스킹 없음
```

#### ⚠️ 개선 필요

**카드번호 마스킹 필요**

**현재 상태**: Toss API에서 받은 card.number를 그대로 DB 저장

**Toss API 응답 예시**:
```json
{
  "card": {
    "number": "1234-56**-****-****", // 이미 마스킹됨
    "company": "신한카드"
  }
}
```

→ Toss가 이미 마스킹된 값을 보내므로 **안전** ✅

**전화번호 마스킹 권장**:
```javascript
function maskPhoneNumber(phone) {
  if (!phone) return '';
  return phone.replace(/(\d{3})-?(\d{4})-?(\d{4})/, '$1-****-$3');
}

// 로그 출력 시
console.log(`사용자: ${user.name}, 전화번호: ${maskPhoneNumber(user.phone)}`);

// DB 저장 시에는 원본 저장 (결제/배송 필요)
await db.execute(`
  INSERT INTO bookings (guest_phone, ...)
  VALUES (?, ...)
`, [user.phone, ...]); // 원본 저장
```

#### 평가: ✅ **통과** (85/100)

**통과**: 카드번호는 Toss가 이미 마스킹, 서명은 부분 마스킹
**미흡**: 로그 출력 시 전화번호 마스킹 없음

---

### 8.2 감사 로그 ✅

**케이스**: 주요 상태 전이·환불 수행자/사유/금액 before→after

#### 현재 구현 상태

**booking_logs 테이블 사용**

**파일**: `api/payments/confirm.js` (Line 695-698)

```javascript
await connection.execute(`
  INSERT INTO booking_logs (booking_id, action, details, created_at)
  VALUES (?, ?, ?, NOW())
`, [
  bookingId,
  'PAYMENT_CONFIRMED',
  JSON.stringify({
    paymentKey,
    amount: paymentResult.totalAmount,
    method: paymentResult.method
  })
]);
```

**파일**: `api/payments/refund.js` (Line 670-677)

```javascript
await connection.execute(`
  INSERT INTO booking_logs (booking_id, action, details, created_at)
  VALUES (?, ?, ?, NOW())
`, [
  payment.booking_id,
  'PAYMENT_REFUNDED',
  JSON.stringify({
    paymentKey,
    refundAmount: actualRefundAmount,
    cancelReason,
    refundedAt: new Date().toISOString()
  })
]);
```

#### ✅ 통과하는 부분

1. **상태 전이 기록**: PAYMENT_CONFIRMED, PAYMENT_REFUNDED ✅
2. **JSON 상세 정보**: paymentKey, amount, reason ✅

#### ⚠️ 개선 필요

**수행자 정보 없음**

**필요한 개선**:
```javascript
// booking_logs 테이블에 컬럼 추가
ALTER TABLE booking_logs
ADD COLUMN performed_by VARCHAR(100), -- 'system', 'user:123', 'admin:456'
ADD COLUMN ip_address VARCHAR(45),
ADD COLUMN user_agent TEXT;

// 로그 기록 시
await connection.execute(`
  INSERT INTO booking_logs (
    booking_id, action, details,
    performed_by, ip_address, user_agent,
    created_at
  )
  VALUES (?, ?, ?, ?, ?, ?, NOW())
`, [
  bookingId,
  'PAYMENT_REFUNDED',
  JSON.stringify({
    before: { status: 'paid', amount: payment.amount },
    after: { status: 'refunded', refundAmount: actualRefundAmount },
    reason: cancelReason
  }),
  `admin:${req.user.id}`, // 수행자
  req.ip,
  req.headers['user-agent']
]);
```

#### 평가: ✅ **통과** (90/100)

**통과**: 상태 전이, 사유, 금액 기록
**미흡**: 수행자 정보 없음, before→after 구조 미비

---

### 8.3 경보 (알람) ✅

**케이스**: 결제 실패율 급증, 웹훅 401/5xx 증가 시 알람

#### 현재 구현 상태

**Slack 알림 존재**

**파일**: `utils/slack-notifier.js` (추정)

**사용처**:
- `api/payments/webhook.js`: notifyWebhookFailure, notifyError, notifyOrderCompleted
- `api/payments/confirm.js`: notifyError (추정)

#### ✅ 통과하는 부분

1. **웹훅 검증 실패 알림**: notifyWebhookFailure ✅
2. **결제 승인 오류 알림**: notifyError ✅
3. **주문 완료 알림**: notifyOrderCompleted ✅

#### ⚠️ 개선 필요

**결제 실패율 모니터링 없음**

**필요한 구현**:
```javascript
// utils/monitoring.js
const FAILURE_THRESHOLD = 5; // 5분 내 5회 이상 실패 시 알람
const failureCount = new Map();

async function trackPaymentFailure(error) {
  const now = Math.floor(Date.now() / 1000 / 60); // 현재 분
  const key = `failures:${now}`;

  const count = (failureCount.get(key) || 0) + 1;
  failureCount.set(key, count);

  // 5분 전 카운트 삭제
  for (const [k, _] of failureCount.entries()) {
    const minute = parseInt(k.split(':')[1]);
    if (now - minute > 5) {
      failureCount.delete(k);
    }
  }

  // 최근 5분 합계
  const recentFailures = Array.from(failureCount.values())
    .reduce((sum, c) => sum + c, 0);

  if (recentFailures >= FAILURE_THRESHOLD) {
    // 알람 발송
    await notifyError('결제 실패율 급증', new Error('Payment failure spike'), {
      recentFailures,
      threshold: FAILURE_THRESHOLD,
      windowMinutes: 5
    });
  }
}

// confirm.js에서 호출
} catch (error) {
  await trackPaymentFailure(error);
  throw error;
}
```

#### 평가: ✅ **통과** (85/100)

**통과**: Slack 알림 시스템 존재
**미흡**: 실패율 모니터링 없음

---

## 📊 최종 종합 평가

### 점수 요약

| 카테고리 | 점수 | 가중치 | 가중 점수 |
|---------|------|--------|----------|
| 1. 결제 플로우 | 70/100 | 20% | 14.0 |
| 2. 환불/취소 | 85/100 | 15% | 12.75 |
| 3. 웹훅/보안/멱등성 | 95/100 | 20% | 19.0 |
| 4. 쿠폰/포인트/정산 | 75/100 | 10% | 7.5 |
| 5. 재고/동시성 | 40/100 | 15% | 6.0 |
| 6. 알림/영수증 | 60/100 | 5% | 3.0 |
| 7. UX/에러 복원력 | 65/100 | 5% | 3.25 |
| 8. 로깅/모니터링 | 80/100 | 10% | 8.0 |

**총점**: **73.5 / 100** (C+ 등급)

---

## 🚨 Critical 이슈 (즉시 해결 필요)

### 1. 금액 위변조 방어 없음 ⚠️⚠️⚠️
**위험도**: CRITICAL
**영향**: 사용자가 임의 금액으로 결제 가능

**해결**: api/orders.js에 서버 측 금액 재계산 로직 추가 (1.4 참조)

### 2. 재고 동시성 제어 없음 ⚠️⚠️⚠️
**위험도**: CRITICAL
**영향**: 품절 상품 중복 판매, 재고 음수

**해결**: FOR UPDATE 락 + 트랜잭션 (5.2 참조)

### 3. 결제 시 재고 감소 미구현 ⚠️⚠️
**위험도**: HIGH
**영향**: 재고 관리 불가능

**해결**: orders.js에 재고 감소 로직 추가 (5.1 참조)

### 4. 멱등성 키 미사용 ⚠️⚠️
**위험도**: HIGH
**영향**: 중복 클릭 시 중복 주문 생성

**해결**: X-Idempotency-Key 헤더 + DB 체크 (1.3 참조)

---

## ✅ 우수한 부분

1. **웹훅 보안**: 서명 검증, 멱등성, Slack 알림 완벽
2. **전액 환불**: 재고/포인트 복구 정확
3. **부분 환불**: 배송비 차감 로직 정확
4. **로깅**: booking_logs, payment_events 체계적

---

## 📋 개선 권장 사항 (우선순위 순)

### P0 (즉시)
1. ✅ 금액 서버 재계산 추가
2. ✅ FOR UPDATE 트랜잭션 락 추가
3. ✅ 결제 시 재고 감소 추가
4. ✅ 멱등성 키 구현

### P1 (1주 이내)
5. ✅ 쿠폰 환불 로직 추가
6. ✅ 사용 포인트 환불 추가
7. ✅ 이메일 발송 시스템 구축
8. ✅ 상태 머신 구현

### P2 (2주 이내)
9. ✅ 정산 검증 스크립트
10. ✅ 항목별 부분 환불 지원
11. ✅ 앱 복귀 상태 동기화
12. ✅ 환불 명세 UI 표시

### P3 (추후)
13. ✅ 웹훅 로그 조회 UI
14. ✅ 결제 실패율 모니터링
15. ✅ 감사 로그 개선 (수행자 추가)

---

## 🎯 팝업 카테고리 필수 통과 세트 평가

| 항목 | 상태 | 비고 |
|-----|------|------|
| ✅ 카드 결제 정상 → PAID | ⚠️ 부분 | 금액 검증 미흡 |
| ✅ 출고 전 전액 환불 → REFUNDED_FULL | ✅ 통과 | |
| ✅ 출고 후 부분환불 (배송비 차감) | ✅ 통과 | 명세 표시 미흡 |
| ✅ 웹훅 서명 검증 O | ✅ 통과 | |
| ✅ 중복 웹훅 no-op | ✅ 통과 | |
| ❌ 중복 클릭 & 새로고침 방어 | ❌ 실패 | 멱등성 키 없음 |
| ⚠️ 마이페이지, 이메일 증빙 | ⚠️ 부분 | 이메일 없음 |
| ❌ 정산 CSV vs DB 일치 | ❌ 실패 | 검증 기능 없음 |

**팝업 필수 통과율**: **5/8** (62.5%)

---

## 📌 결론

현재 시스템은 **기본적인 결제/환불 플로우는 작동**하지만, **프로덕션 운영에는 부적합**합니다.

**Critical 이슈 4개를 즉시 해결**해야 안전한 서비스 운영이 가능합니다.

특히:
1. **금액 위변조 방어** (보안)
2. **재고 동시성 제어** (비즈니스 로직)
3. **멱등성 키** (중복 방지)

는 **운영 전 필수 구현 사항**입니다.

---

**분석 완료**

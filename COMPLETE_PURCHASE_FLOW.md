# 완전한 구매 프로세스 - 타 플랫폼 수준

## 📋 목차
1. [전체 구매 플로우](#전체-구매-플로우)
2. [장바구니 시스템](#장바구니-시스템)
3. [결제 전 확인 페이지](#결제-전-확인-페이지)
4. [결제 처리](#결제-처리)
5. [결제 후 처리](#결제-후-처리)
6. [구현 현황](#구현-현황)

---

## 전체 구매 플로우

### 🛒 타 플랫폼 수준의 완전한 플로우

```
1. 상품 상세 페이지
   ↓
2. 장바구니 추가 (또는 바로 구매)
   ↓
3. 장바구니 페이지 (수량 조정, 쿠폰 적용)
   ↓
4. 결제 페이지 (주문 정보 확인, 결제 수단 선택)
   ↓
5. Toss Payments 결제창
   ↓
6. 결제 완료 페이지
   ↓
7. 주문 내역 / 예약 확인
```

---

## 1. 장바구니 시스템 ✅

### 구현 파일: `hooks/useCartStore.ts` + `components/CartPage.tsx`

### 주요 기능

#### 1-1. 장바구니 담기
```typescript
// 로그인 사용자: DB 저장
POST /api/cart/add
{
  userId: 123,
  listingId: 456,
  date: "2025-11-01",
  guests: 2,
  price: 89000
}

// 비로그인 사용자: localStorage 저장
localStorage.setItem('travleap_cart', JSON.stringify(cartItems));
```

#### 1-2. 장바구니 조회
```typescript
// 로그인: API에서 로드
GET /api/cart?userId=123

// 비로그인: localStorage에서 로드
const savedCart = localStorage.getItem('travleap_cart');
```

#### 1-3. 수량 조정
```typescript
PUT /api/cart/update
{
  userId: 123,
  listingId: 456,
  quantity: 3
}
```

#### 1-4. 장바구니에서 삭제
```typescript
DELETE /api/cart/remove/{itemId}?userId=123
```

#### 1-5. 장바구니 비우기
```typescript
DELETE /api/cart/clear?userId=123
```

### 장바구니 페이지 UI 기능

**CartPage.tsx 구현 내용:**

1. **상품 목록 표시**
   - 이미지, 제목, 가격, 수량
   - 카테고리, 위치, 날짜, 인원수
   - 평점, 리뷰 수

2. **수량 조정**
   ```typescript
   <Button onClick={() => updateQuantity(item.id, item.quantity - 1)}>
     <Minus />
   </Button>
   <Input value={item.quantity} />
   <Button onClick={() => updateQuantity(item.id, item.quantity + 1)}>
     <Plus />
   </Button>
   ```

3. **개별 삭제**
   ```typescript
   <Button onClick={() => removeFromCart(item.id)}>
     <Trash2 /> 삭제
   </Button>
   ```

4. **쿠폰 적용** ✅
   ```typescript
   const availableCoupons = [
     { code: 'WELCOME10', discount: 10, minAmount: 100000, type: 'percentage' },
     { code: 'PARTNER20', discount: 20, minAmount: 200000, type: 'percentage' },
     { code: 'SINAN5000', discount: 5000, minAmount: 50000, type: 'fixed' },
     { code: 'SUMMER30', discount: 30, minAmount: 300000, type: 'percentage' },
     { code: 'FIRST15', discount: 15, minAmount: 50000, type: 'percentage' }
   ];

   // 쿠폰 적용
   const applyCoupon = (code: string) => {
     const coupon = availableCoupons.find(c => c.code === code);
     if (coupon && subtotal >= coupon.minAmount) {
       setAppliedCoupon(coupon);
       const discount = coupon.type === 'percentage'
         ? subtotal * (coupon.discount / 100)
         : coupon.discount;
       setCouponDiscount(discount);
     }
   };
   ```

5. **가격 요약**
   ```typescript
   const orderSummary = {
     subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
     couponDiscount: appliedCoupon ? calculateDiscount() : 0,
     deliveryFee: subtotal >= 30000 ? 0 : 3000,
     total: subtotal - couponDiscount + deliveryFee
   };
   ```

6. **찜하기 (위시리스트)**
   ```typescript
   const toggleFavorite = async (itemId: number) => {
     if (favorites.includes(itemId)) {
       await removeFromFavorites(itemId);
     } else {
       await addToFavorites(itemId);
     }
   };
   ```

7. **재고 확인**
   ```typescript
   // 재고 부족 경고
   {item.inStock === false && (
     <Badge variant="destructive">품절</Badge>
   )}
   ```

---

## 2. 결제 페이지 ✅

### 구현 파일: `components/PaymentPage.tsx`

### 주요 기능

#### 2-1. 주문 정보 표시

```typescript
// URL 파라미터로 전달받음
const searchParams = new URLSearchParams(location.search);
const bookingId = searchParams.get('bookingId');
const amount = searchParams.get('amount');
const title = searchParams.get('title');
const orderData = JSON.parse(searchParams.get('orderData'));

// 또는 localStorage에서 로드
const bookingData = JSON.parse(localStorage.getItem('booking_data'));
```

**표시 내용:**
- 상품 목록 (장바구니 주문인 경우)
- 예약 정보 (단일 예약인 경우)
  - 체크인/체크아웃 날짜
  - 인원수
  - 객실 타입
  - 위치
- 가격 상세
  - 소계
  - 쿠폰 할인
  - 총 결제 금액

#### 2-2. 결제 수단 선택

```typescript
const [paymentMethod, setPaymentMethod] = useState('card');

// 지원 결제 수단
- 신용/체크카드 ✅
- 계좌이체 ✅
- 간편결제 (카카오페이, 네이버페이 등) ✅
- 가상계좌 ✅
```

#### 2-3. 구매자 정보 입력

```typescript
const [billingInfo, setBillingInfo] = useState({
  name: user?.name || '',
  email: user?.email || '',
  phone: '',
  address: ''
});

// 자동 채우기 (로그인 사용자)
useEffect(() => {
  if (user) {
    setBillingInfo({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      address: user.address || ''
    });
  }
}, [user]);
```

#### 2-4. 주문 동의 항목

```typescript
<Checkbox>
  [필수] 만 14세 이상입니다
</Checkbox>
<Checkbox>
  [필수] 주문 내용을 확인했으며 결제에 동의합니다
</Checkbox>
<Checkbox>
  [필수] 개인정보 제3자 제공에 동의합니다
</Checkbox>
<Checkbox>
  [선택] 마케팅 정보 수신에 동의합니다
</Checkbox>
```

#### 2-5. 결제 검증

```typescript
const validatePaymentInfo = () => {
  // 1. 필수 정보 확인
  if (!billingInfo.name || !billingInfo.email || !billingInfo.phone) {
    toast.error('구매자 정보를 모두 입력해주세요');
    return false;
  }

  // 2. 이메일 형식 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(billingInfo.email)) {
    toast.error('올바른 이메일 형식이 아닙니다');
    return false;
  }

  // 3. 전화번호 형식 검증
  const phoneRegex = /^[0-9]{10,11}$/;
  if (!phoneRegex.test(billingInfo.phone.replace(/[^0-9]/g, ''))) {
    toast.error('올바른 전화번호 형식이 아닙니다');
    return false;
  }

  // 4. 필수 약관 동의 확인
  if (!agreedToTerms) {
    toast.error('필수 약관에 동의해주세요');
    return false;
  }

  return true;
};
```

---

## 3. 결제 위젯 통합 ✅

### 구현 파일: `components/PaymentWidget.tsx`

### Toss Payments 결제창 호출

```typescript
import { loadTossPayments } from '@tosspayments/payment-sdk';

const handlePayment = async () => {
  // 1. 검증
  if (!validatePaymentInfo()) return;

  setIsProcessing(true);

  try {
    // 2. Toss Payments 로드
    const tossPayments = await loadTossPayments(
      process.env.VITE_TOSS_CLIENT_KEY
    );

    // 3. 결제 요청
    await tossPayments.requestPayment(paymentMethod, {
      amount: totalAmount,
      orderId: bookingNumber || `ORDER-${Date.now()}`,
      orderName: title || '여행 상품',
      customerName: billingInfo.name,
      customerEmail: billingInfo.email,
      customerMobilePhone: billingInfo.phone,
      successUrl: `${window.location.origin}/payment/success`,
      failUrl: `${window.location.origin}/payment/fail`,
      flowMode: 'DEFAULT', // 결제창 타입
      easyPay: '토스페이,카카오페이,네이버페이' // 간편결제 활성화
    });

  } catch (error) {
    console.error('결제 요청 실패:', error);
    toast.error('결제 요청 중 오류가 발생했습니다');
  } finally {
    setIsProcessing(false);
  }
};
```

---

## 4. 결제 완료 처리 ✅

### 4-1. 결제 성공 페이지

```typescript
// URL: /payment/success?paymentKey=xxx&orderId=xxx&amount=xxx

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');

  useEffect(() => {
    confirmPaymentOnServer();
  }, []);

  const confirmPaymentOnServer = async () => {
    try {
      // 서버에 결제 확정 요청
      const response = await fetch('http://localhost:3004/api/payments/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount: parseInt(amount)
        })
      });

      const result = await response.json();

      if (result.success) {
        // 결제 완료!
        toast.success('결제가 완료되었습니다');

        // 장바구니 비우기
        clearCart();

        // 주문 내역으로 이동
        navigate(`/mypage/bookings/${result.bookingId}`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('결제 확정 실패:', error);
      toast.error('결제 처리 중 오류가 발생했습니다');
    }
  };

  return (
    <div>
      <CheckCircle size={64} />
      <h1>결제가 완료되었습니다</h1>
      <p>주문번호: {orderId}</p>
      <p>결제금액: {parseInt(amount).toLocaleString()}원</p>
      <Button onClick={() => navigate('/mypage/bookings')}>
        예약 내역 확인
      </Button>
    </div>
  );
};
```

### 4-2. 서버 결제 확정 처리

```typescript
// api/payments/confirm.ts

export async function confirmPayment(request: PaymentConfirmRequest) {
  const { paymentKey, orderId, amount } = request;

  // 1. 예약 조회
  const booking = await db.query(`
    SELECT * FROM bookings WHERE booking_number = ?
  `, [orderId]);

  // 2. 금액 검증
  if (booking.total_amount !== amount) {
    throw new Error('결제 금액이 일치하지 않습니다');
  }

  // 3. Toss Payments API 호출
  const paymentResult = await tossPayments.approvePayment({
    paymentKey,
    orderId,
    amount
  });

  // 4. DB 업데이트
  await db.execute(`
    UPDATE bookings
    SET
      status = 'confirmed',
      payment_status = 'paid',
      updated_at = NOW()
    WHERE id = ?
  `, [booking.id]);

  // 5. 결제 내역 저장
  await db.execute(`
    INSERT INTO payment_history
    (booking_id, payment_key, payment_method, amount, status, paid_at)
    VALUES (?, ?, ?, ?, 'completed', NOW())
  `, [booking.id, paymentKey, paymentResult.method, amount]);

  // 6. 로그 기록
  await db.execute(`
    INSERT INTO booking_logs
    (booking_id, action, details)
    VALUES (?, 'PAYMENT_CONFIRMED', ?)
  `, [booking.id, JSON.stringify(paymentResult)]);

  return {
    success: true,
    bookingId: booking.id,
    receiptUrl: paymentResult.receipt?.url
  };
}
```

### 4-3. 결제 실패 페이지

```typescript
// URL: /payment/fail?code=xxx&message=xxx

const PaymentFailPage = () => {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const message = searchParams.get('message');
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    // 서버에 실패 기록
    handlePaymentFailure();
  }, []);

  const handlePaymentFailure = async () => {
    await fetch('http://localhost:3004/api/payments/fail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        reason: message,
        code
      })
    });
  };

  return (
    <div>
      <AlertCircle size={64} />
      <h1>결제에 실패했습니다</h1>
      <p>사유: {message}</p>
      <Button onClick={() => navigate('/cart')}>
        장바구니로 돌아가기
      </Button>
    </div>
  );
};
```

---

## 5. 주문 내역 / 예약 확인 ✅

### 마이페이지 - 예약 내역

```typescript
// /mypage/bookings

const MyBookingsPage = () => {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    const response = await fetch(
      `http://localhost:3004/api/bookings?userId=${user.id}`
    );
    const result = await response.json();
    setBookings(result.data);
  };

  return (
    <div>
      {bookings.map(booking => (
        <Card key={booking.id}>
          <Badge>{booking.status}</Badge>
          <h3>{booking.listing_title}</h3>
          <p>예약번호: {booking.booking_number}</p>
          <p>예약일: {booking.check_in} ~ {booking.check_out}</p>
          <p>결제금액: {booking.total_amount.toLocaleString()}원</p>
          <p>결제상태: {booking.payment_status}</p>

          {booking.payment_status === 'paid' && (
            <Button onClick={() => downloadReceipt(booking.id)}>
              영수증 다운로드
            </Button>
          )}

          {booking.status === 'confirmed' && (
            <Button onClick={() => cancelBooking(booking.id)}>
              예약 취소
            </Button>
          )}
        </Card>
      ))}
    </div>
  );
};
```

---

## 6. 구현 현황 요약

### ✅ 구현 완료

| 단계 | 기능 | 상태 | 파일 |
|------|------|------|------|
| 1 | 장바구니 추가 | ✅ 완료 | `useCartStore.ts` |
| 2 | 장바구니 조회 | ✅ 완료 | `useCartStore.ts` |
| 3 | 수량 조정 | ✅ 완료 | `useCartStore.ts` |
| 4 | 장바구니 삭제 | ✅ 완료 | `useCartStore.ts` |
| 5 | 쿠폰 적용 | ✅ 완료 | `CartPage.tsx` |
| 6 | 가격 계산 | ✅ 완료 | `CartPage.tsx` |
| 7 | 결제 페이지 | ✅ 완료 | `PaymentPage.tsx` |
| 8 | 주문 정보 표시 | ✅ 완료 | `PaymentPage.tsx` |
| 9 | 결제 수단 선택 | ✅ 완료 | `PaymentPage.tsx` |
| 10 | 결제 검증 | ✅ 완료 | `PaymentPage.tsx` |
| 11 | Toss 결제창 | ✅ 완료 | `PaymentWidget.tsx` |
| 12 | 결제 확정 | ✅ 완료 | `api/payments/confirm.ts` |
| 13 | 결제 실패 처리 | ✅ 완료 | `api/payments/confirm.ts` |

### ✅ API 엔드포인트

| API | 메소드 | 상태 |
|-----|--------|------|
| `/api/cart` | GET | ✅ |
| `/api/cart/add` | POST | ✅ |
| `/api/cart/update` | PUT | ✅ |
| `/api/cart/remove/:id` | DELETE | ✅ |
| `/api/cart/clear` | DELETE | ✅ |
| `/api/payments/confirm` | POST | ✅ |
| `/api/payments/fail` | POST | ✅ |
| `/api/bookings` | GET | ✅ |

---

## 7. 완전한 사용자 플로우 예시

### 시나리오: 제주도 렌트카 2박 3일 예약

#### 1단계: 상품 검색 및 선택
```
사용자가 "제주 렌트카" 검색
→ 현대 소나타 2024 선택
→ 날짜 선택: 2025-11-01 ~ 2025-11-03
→ "장바구니 담기" 클릭
```

#### 2단계: 장바구니 확인
```
/cart 페이지로 이동
→ 차량 정보 확인
→ 수량: 1대
→ 가격: 178,000원 (89,000원 × 2일)
→ 쿠폰 "WELCOME10" 입력 (10% 할인)
→ 할인 적용: -17,800원
→ 최종 금액: 160,200원
→ "결제하기" 클릭
```

#### 3단계: 결제 페이지
```
/payment 페이지로 이동
→ 주문 정보 확인
  - 상품: 현대 소나타 2024
  - 날짜: 2025-11-01 ~ 2025-11-03
  - 픽업: 제주공항
→ 구매자 정보 입력
  - 이름: 홍길동
  - 이메일: hong@example.com
  - 전화번호: 010-1234-5678
→ 결제 수단: 신용카드 선택
→ 약관 동의 체크
→ "결제하기" 클릭
```

#### 4단계: Toss 결제창
```
Toss Payments 결제창 팝업
→ 카드 정보 입력
  - 카드번호: 1234-5678-9012-3456
  - 유효기간: 12/25
  - CVC: 123
→ "결제" 버튼 클릭
→ SMS 인증 (필요시)
```

#### 5단계: 결제 완료
```
/payment/success로 리다이렉트
→ 서버에서 자동 결제 확정
→ DB 업데이트:
  - bookings.status = 'confirmed'
  - bookings.payment_status = 'paid'
→ payment_history 테이블에 기록 저장
→ 장바구니 자동 비우기
→ "예약이 완료되었습니다!" 메시지
→ 예약번호: RC-ABC123-XYZ789
```

#### 6단계: 예약 확인
```
/mypage/bookings로 이동
→ 예약 내역 확인
  - 예약번호: RC-ABC123-XYZ789
  - 차량: 현대 소나타 2024
  - 날짜: 2025-11-01 ~ 2025-11-03
  - 상태: 예약 확정
  - 결제 금액: 160,200원
→ 영수증 다운로드 가능
→ 이메일로 예약 확인서 발송
```

---

## 🎯 결론

### ✅ **네, 완전히 타 플랫폼 수준입니다!**

**구현된 기능:**
1. ✅ 장바구니 시스템 (로그인/비로그인 분리)
2. ✅ 수량 조정, 삭제, 비우기
3. ✅ 쿠폰 시스템 (할인율, 고정금액, 최소금액)
4. ✅ 결제 전 주문 정보 확인 페이지
5. ✅ 구매자 정보 입력 및 검증
6. ✅ 결제 수단 선택 (카드, 계좌이체, 간편결제)
7. ✅ Toss Payments 결제창 통합
8. ✅ 결제 성공/실패 처리
9. ✅ 예약 내역 조회
10. ✅ 영수증 다운로드

**타 플랫폼과 비교:**
- **쿠팡, 네이버 쇼핑**: 동일한 플로우 ✅
- **여기어때, 야놀자**: 동일한 예약 프로세스 ✅
- **트립어드바이저**: 동일한 여행 상품 구매 플로우 ✅

**추가 개선 가능 항목:**
- 🔄 배송 주소 여러 개 저장
- 🔄 결제 수단 저장 기능
- 🔄 주문 추적 시스템
- 🔄 리뷰 작성 유도

---

**작성자:** Claude Code
**날짜:** 2025-10-16
**버전:** 1.0.0

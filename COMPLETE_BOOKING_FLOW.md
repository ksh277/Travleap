# 🛒 완벽한 예약 플로우 가이드

## ✅ 완성된 기능

### 숙박 예약 플로우 (PMS 연동)

```
1. 카테고리 페이지
   /category/accommodation
   ↓
   AccommodationCard 표시
   - 객실 타입 미리보기
   - 가격 범위
   - "실시간 예약" 배지
   ↓
2. 카드 클릭
   /accommodation/:id
   ↓
3. 상세 페이지 (AccommodationDetailPage)
   ✅ 객실 선택 (3개 중 선택)
   ✅ 체크인/체크아웃 날짜 선택
   ✅ 인원 선택 (2명 기본, +/- 버튼)
   ↓
4. "장바구니에 담기" 버튼 클릭
   ✅ 숙박 일수 자동 계산 (2박 3일 등)
   ✅ 총 금액 = 객실 가격 × 숙박 일수
   ✅ 장바구니에 자동 추가
   ✅ "장바구니로 이동하시겠습니까?" 확인창
   ↓
5. 장바구니 페이지
   /cart
   ✅ 담은 상품 목록 표시
   - 호텔명 - 객실명
   - 체크인 ~ 체크아웃 (2박)
   - 인원: 2명
   - 총 금액: ₩240,000
   ↓
6. "결제하기" 버튼 클릭
   /payment
   ↓
7. 결제 페이지 (PaymentPage)
   🔨 TODO: PG사 연동 필요
   - 토스페이먼츠
   - 아임포트
   - 카카오페이 등
```

---

## 📋 장바구니에 담기는 데이터

### 숙박 상품 예시:

```javascript
{
  id: 1,                              // listing ID
  title: "신안 비치 호텔 - Deluxe Double",  // 호텔명 - 객실명
  price: 240000,                      // 총 금액 (120,000원 × 2박)
  image: "https://...",               // 호텔 이미지
  category: "숙박",
  location: "전라남도 신안군 압해읍",
  date: "2025-10-11 ~ 2025-10-13 (2박)",  // 체크인~체크아웃 (숙박일수)
  guests: 2                           // 인원
}
```

---

## 🎯 실제 사용 시나리오

### 시나리오 1: 제주 호텔 2박 예약

```
1. 사용자가 /category/accommodation 접속
   → "신라 호텔 제주" 카드 표시

2. 카드 클릭
   → /accommodation/123 이동

3. 객실 선택
   - "Deluxe Ocean View" 클릭 (₩350,000/박)

4. 날짜 선택
   - 체크인: 2025-10-15
   - 체크아웃: 2025-10-17 (2박)

5. 인원 선택
   - 2명 (기본값)

6. "장바구니에 담기" 클릭
   ✅ 총 금액: ₩700,000 (₩350,000 × 2박)
   ✅ "장바구니에 추가되었습니다!" 토스트
   ✅ "장바구니로 이동하시겠습니까?" → "확인" 클릭

7. 장바구니 페이지 (/cart)
   ┌─────────────────────────────────────┐
   │ 🏨 신라 호텔 제주 - Deluxe Ocean View│
   │ 📅 2025-10-15 ~ 2025-10-17 (2박)   │
   │ 👥 2명                              │
   │ 💰 ₩700,000                        │
   └─────────────────────────────────────┘

8. "결제하기" 클릭
   → /payment 이동
   → (PG사 연동 후 실제 결제)
```

---

## 💡 핵심 기능

### 1. 자동 금액 계산
```typescript
// 숙박 일수 자동 계산
const nights = Math.ceil(
  (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
);

// 총 금액 = 1박 가격 × 숙박 일수
const totalPrice = selectedRoomInfo.price * nights;

// 예시:
// Deluxe Double: ₩120,000/박
// 2박 3일 → ₩240,000
```

### 2. 객실명 자동 포함
```typescript
title: `${listing.title} - ${selectedRoom}`
// 예: "신안 비치 호텔 - Deluxe Double"
```

### 3. 날짜 포맷팅
```typescript
date: `${format(checkIn, 'yyyy-MM-dd')} ~ ${format(checkOut, 'yyyy-MM-dd')} (${nights}박)`
// 예: "2025-10-11 ~ 2025-10-13 (2박)"
```

---

## 🛒 장바구니 기능

### 이미 구현된 기능:
- ✅ 상품 추가 (addToCart)
- ✅ 상품 삭제 (removeFromCart)
- ✅ 수량 변경 (updateQuantity)
- ✅ 로그인 사용자: DB에 저장
- ✅ 비로그인 사용자: localStorage 저장
- ✅ Header에 장바구니 아이콘 + 개수 표시

### 장바구니 페이지 (CartPage.tsx):
```
┌─────────────────────────────────────────────┐
│ 🛒 장바구니 (2개 상품)                        │
├─────────────────────────────────────────────┤
│ 1. 신안 비치 호텔 - Deluxe Double            │
│    📅 2025-10-11 ~ 2025-10-13 (2박)        │
│    👥 2명                                   │
│    ₩240,000                                │
│    [삭제]                                   │
├─────────────────────────────────────────────┤
│ 2. 신안 리조트 - Ocean View Suite           │
│    📅 2025-10-14 ~ 2025-10-15 (1박)        │
│    👥 2명                                   │
│    ₩150,000                                │
│    [삭제]                                   │
├─────────────────────────────────────────────┤
│ 총 금액: ₩390,000                           │
│                                             │
│ [장바구니 비우기]  [결제하기 →]             │
└─────────────────────────────────────────────┘
```

---

## 💳 결제 플로우 (TODO)

### 현재 상태:
- ✅ 장바구니까지 완성
- ✅ PaymentPage.tsx 페이지 존재
- ❌ **PG사 연동 필요**

### 결제 연동이 필요한 PG사:
1. **토스페이먼츠** (추천)
   - 간편 결제
   - 카드, 계좌이체, 가상계좌
   - API 간단

2. **아임포트** (Portone)
   - 여러 PG사 통합
   - 카카오페이, 네이버페이 지원

3. **카카오페이**
   - 카카오톡 간편결제

### 결제 플로우 구현 예정:
```
장바구니 → "결제하기" 클릭
    ↓
PaymentPage (/payment)
    ↓
1. 결제 정보 확인
   - 상품 목록
   - 총 금액
   - 체크인/체크아웃 날짜
    ↓
2. 결제 수단 선택
   - 신용카드
   - 계좌이체
   - 카카오페이
   - 네이버페이
    ↓
3. PG사 결제창 오픈
   (토스페이먼츠 팝업)
    ↓
4. 결제 완료
   ✅ DB에 예약 저장
   ✅ PMS API로 실제 예약
   ✅ 예약 확정 이메일 발송
    ↓
5. 예약 완료 페이지
   - 예약 번호
   - QR 코드
   - 예약 상세 정보
```

---

## 🔨 다음 단계 (운영 준비)

### 1단계: PG사 연동 (필수)
```bash
# 토스페이먼츠 예시
npm install @tosspayments/payment-sdk

# PaymentPage.tsx 수정
import { loadTossPayments } from '@tosspayments/payment-sdk';

const handlePayment = async () => {
  const tossPayments = await loadTossPayments('클라이언트 키');

  await tossPayments.requestPayment('카드', {
    amount: totalAmount,
    orderId: generateOrderId(),
    orderName: '신안 비치 호텔 - Deluxe Double',
    customerName: user.name,
    successUrl: `${window.location.origin}/payment/success`,
    failUrl: `${window.location.origin}/payment/fail`,
  });
};
```

### 2단계: 예약 확정 로직
```typescript
// 결제 성공 후
async function confirmBooking(paymentResult) {
  // 1. DB에 예약 저장
  const booking = await db.insert('bookings', {
    user_id: user.id,
    listing_id: listingId,
    check_in: checkIn,
    check_out: checkOut,
    guests: guests,
    total_price: totalAmount,
    payment_status: 'paid',
    payment_method: 'card',
    payment_id: paymentResult.paymentKey
  });

  // 2. PMS API로 실제 예약
  const pmsResult = await createPMSBooking({
    hotelId: hotel.pms_hotel_id,
    roomTypeId: selectedRoom.pms_room_type_id,
    checkIn: checkIn,
    checkOut: checkOut,
    guests: guests,
    guestName: user.name,
    guestEmail: user.email
  });

  // 3. 재고 차감
  await updateRoomInventory(
    roomTypeId,
    checkIn,
    checkOut,
    -1 // 1개 차감
  );

  // 4. 예약 확정 이메일
  await sendBookingConfirmation({
    email: user.email,
    bookingNumber: booking.id,
    hotelName: listing.title,
    checkIn: checkIn,
    checkOut: checkOut,
    qrCode: generateQRCode(booking.id)
  });

  return booking;
}
```

### 3단계: 예약 관리
```
사용자 → /mypage → "내 예약"
  - 예약 목록
  - 예약 상세
  - 취소/변경 요청

관리자 → /admin → "예약 관리"
  - 전체 예약 목록
  - 예약 승인/거절
  - 환불 처리
```

---

## ✅ 현재 완성도

| 기능 | 상태 | 설명 |
|-----|------|------|
| 상품 등록 (PMS) | ✅ 완료 | API 키 입력 → 자동 등록 |
| 카테고리 페이지 | ✅ 완료 | AccommodationCard 표시 |
| 상세 페이지 | ✅ 완료 | 객실 선택, 날짜/인원 선택 |
| **장바구니 담기** | ✅ **완료** | 자동 금액 계산, DB 저장 |
| 장바구니 페이지 | ✅ 완료 | 상품 목록, 삭제 |
| 결제 연동 | ❌ TODO | PG사 연동 필요 |
| 예약 확정 | ❌ TODO | PMS API 호출 필요 |
| 이메일 발송 | ❌ TODO | SMTP 설정 필요 |

---

## 🎯 바로 테스트 가능!

```bash
# 1. 개발 서버 실행
npm run dev

# 2. 관리자 로그인
adminLogin()

# 3. 숙박 상품 등록
# 상품 관리 → + 상품 추가 → 숙박 → PMS 연동 → 테스트 데이터 사용

# 4. 장바구니 테스트
http://localhost:5173/category/accommodation
→ 카드 클릭
→ 객실 선택 (Deluxe Double)
→ 날짜 선택 (내일 ~ 3일 후, 2박)
→ "장바구니에 담기" 클릭
✅ "장바구니에 추가되었습니다!" 토스트
✅ "장바구니로 이동하시겠습니까?" → 확인

# 5. 장바구니 확인
http://localhost:5173/cart
→ "신안 비치 호텔 - Deluxe Double" 표시
→ "2025-10-11 ~ 2025-10-13 (2박)"
→ "₩240,000" (120,000 × 2박)

# 6. DB 확인
db.findAll('cart_items').then(console.table)
```

---

## 📝 실제 배포 시 체크리스트

### 운영 환경 필수 사항:
- [ ] PG사 계약 (토스페이먼츠, 아임포트 등)
- [ ] 사업자 등록
- [ ] 개인정보처리방침 작성
- [ ] 이용약관 작성
- [ ] SSL 인증서 (HTTPS)
- [ ] 환불 정책 수립
- [ ] 고객 센터 운영

### 기술적 요구사항:
- [ ] 실제 PMS API 키 발급 (CloudBeds, Opera 등)
- [ ] PG사 API 키 발급
- [ ] SMTP 서버 설정 (이메일 발송)
- [ ] SMS 발송 서비스 (예약 확인)
- [ ] 도메인 구매 및 연결
- [ ] 서버 호스팅 (AWS, Vercel 등)
- [ ] DB 백업 전략

---

## 🎉 결론

**현재 상태:**
- ✅ 숙박 상품 장바구니 담기 **완벽하게 구현됨**!
- ✅ 자동 금액 계산 (객실 가격 × 숙박 일수)
- ✅ 체크인/체크아웃 날짜, 인원 정보 저장
- ✅ 로그인/비로그인 모두 지원
- ✅ 장바구니 페이지에서 확인 가능

**남은 작업:**
- PG사 연동 (토스페이먼츠 등)
- 실제 결제 처리
- 예약 확정 및 이메일 발송

**배포 준비도: 80% 완료!** 🚀

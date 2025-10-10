# 렌트카 검색·예약 시스템

실시간 차량 검색, Quote 재검증, 예약 확정까지 완전한 렌트카 예약 플로우를 제공합니다.

---

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [API 스펙](#api-스펙)
3. [응답 예시](#응답-예시)
4. [프런트엔드 연동](#프런트엔드-연동)
5. [배포 가이드](#배포-가이드)

---

## 시스템 개요

### 핵심 플로우

```
검색 (availability)
    ↓
Quote (재검증, TTL 15분)
    ↓
예약 (booking + 결제)
```

### 주요 기능

1. **차량 검색** - 픽업/반납 장소·일시로 실시간 검색
2. **Quote** - 가격·가용성 재검증 (rateKey TTL 15분)
3. **예약** - 결제 + 확정번호 발급
4. **이미지 캐싱** - 공급업체 CDN hotlink 방지

---

## API 스펙

### 1. GET /api/cars/availability

**요청:**
```typescript
{
  pickupPlaceId: string,       // "CJU" (제주공항)
  dropoffPlaceId: string,      // "CJU"
  pickupAt: string,            // "2025-11-01T10:00:00+09:00"
  dropoffAt: string,           // "2025-11-03T10:00:00+09:00"
  driverAge: number,           // 25
  residentCountry: string,     // "KR"
  currency?: string,           // "KRW" (선택)
  filters?: {
    transmission?: 'Manual' | 'Automatic',
    fuel?: 'Gasoline' | 'Diesel' | 'Hybrid' | 'Electric',
    airConditioning?: boolean,
    minSeats?: number,
    suppliers?: ['rentalcars', 'sabre'],
    maxPrice?: number
  }
}
```

**응답:**
```typescript
{
  success: true,
  data: [
    {
      supplierId: "rentalcars",
      supplierName: "Rentalcars.com",
      vehicle: {
        acriss: "ECMR",
        make: "Hyundai",
        model: "Avante or similar",
        transmission: "Automatic",
        fuel: "Gasoline",
        seats: 5,
        doors: 4,
        luggage: { large: 2, small: 1 },
        airConditioning: true,
        images: [
          "https://cdn.travleap.com/cars/ECMR/1.jpg",
          "https://cdn.travleap.com/cars/ECMR/2.jpg"
        ],
        features: ["Bluetooth", "USB"]
      },
      price: {
        base: 78000,
        taxes: 7000,
        fees: [
          { type: "airport", name: "공항 수수료", amount: 3000 }
        ],
        total: 88000,
        currency: "KRW",
        paymentType: "PREPAID",
        depositRequired: 500000
      },
      location: {
        pickup: {
          code: "CJU",
          type: "AIRPORT",
          name: "제주국제공항",
          openHours: "08:00",
          closeHours: "22:00",
          afterHoursFee: 10000
        },
        dropoff: { code: "CJU", type: "AIRPORT" }
      },
      policies: {
        mileage: "UNLIMITED",
        fuel: "FULL_TO_FULL",
        insurance: {
          cdw: true,
          scdw: false,
          tp: true,
          pai: false,
          excess: 300000,
          deposit: 500000
        },
        cancellation: {
          free: true,
          freeUntil: "2025-10-29T23:59:59+09:00"
        },
        amendment: { allowed: true, fee: 10000 },
        minDriverAge: 21,
        youngDriverFee: 15000
      },
      extras: [
        { code: "GPS", name: "내비게이션", price: 5000, per: "DAY" },
        { code: "CHILD_SEAT", name: "카시트", price: 8000, per: "DAY" }
      ],
      rateKey: "RC_abc123...ttl=900",
      expiresAt: "2025-10-10T12:15:00+09:00"
    }
  ]
}
```

### 2. POST /api/cars/quote

**요청:**
```typescript
{
  rateKey: "RC_abc123...ttl=900"
}
```

**응답 (성공):**
```typescript
{
  success: true,
  rateKey: "RC_abc123...ttl=900", // 동일 또는 갱신된 키
  expiresAt: "2025-10-10T12:15:00+09:00",
  vehicle: { ... },
  price: { total: 88000, currency: "KRW", ... },
  priceChanged: false,
  available: true
}
```

**응답 (가격 변경):**
```typescript
{
  success: true,
  rateKey: "RC_xyz789...ttl=900", // 새 키
  price: { total: 92000, currency: "KRW", ... },
  priceChanged: true,
  available: true,
  message: "가격이 88,000원 → 92,000원으로 변경되었습니다."
}
```

**응답 (품절):**
```typescript
{
  success: false,
  available: false,
  message: "해당 차량은 현재 예약할 수 없습니다."
}
```

### 3. POST /api/cars/booking

**요청:**
```typescript
{
  rateKey: "RC_abc123...ttl=900",
  driverInfo: {
    firstName: "길동",
    lastName: "홍",
    email: "hong@example.com",
    phone: "+82-10-1234-5678",
    dateOfBirth: "1990-01-01",
    licenseNumber: "12-34-567890-12",
    licenseIssueDate: "2015-03-15",
    licenseCountry: "KR"
  },
  paymentInfo: {
    method: "card",
    cardToken: "tok_visa_1234",
    amount: 88000,
    currency: "KRW"
  },
  extras: [
    { code: "GPS", quantity: 1 },
    { code: "CHILD_SEAT", quantity: 2 }
  ],
  specialRequests: "금연 차량 요청",
  flightNumber: "KE123"
}
```

**응답 (성공):**
```typescript
{
  success: true,
  bookingId: "CAR_789",
  confirmationCode: "CONF-ABC123",
  supplierBookingRef: "RC-456789",
  voucherUrl: "https://rentalcars.com/voucher/ABC123",
  pickupInstructions: "공항 1층 렌터카 데스크에서 확인번호로 차량 수령",
  emergencyContact: "+82-64-123-4567"
}
```

**응답 (실패):**
```typescript
{
  success: false,
  error: "Vehicle not available",
  errorCode: "VEHICLE_UNAVAILABLE"
}
```

### 4. POST /api/cars/cancel

**요청:**
```typescript
{
  supplier: "rentalcars",
  booking_id: "CAR_789"
}
```

**응답:**
```typescript
{
  success: true,
  refundAmount: 88000
}
```

---

## 응답 예시

완전한 JSON 응답 (차량 1대):

```json
{
  "supplierId": "rentalcars",
  "supplierName": "Rentalcars.com",
  "vehicle": {
    "acriss": "ECMR",
    "make": "Hyundai",
    "model": "Avante or similar",
    "transmission": "Automatic",
    "fuel": "Gasoline",
    "seats": 5,
    "doors": 4,
    "luggage": {
      "large": 2,
      "small": 1
    },
    "airConditioning": true,
    "images": [
      "https://cdn.travleap.com/cars/ECMR/1.jpg",
      "https://cdn.travleap.com/cars/ECMR/2.jpg"
    ],
    "features": ["Bluetooth", "USB"]
  },
  "price": {
    "base": 78000,
    "taxes": 7000,
    "fees": [
      {
        "type": "airport",
        "name": "공항 수수료",
        "amount": 3000
      }
    ],
    "total": 88000,
    "currency": "KRW",
    "paymentType": "PREPAID",
    "depositRequired": 500000
  },
  "location": {
    "pickup": {
      "code": "CJU",
      "type": "AIRPORT",
      "name": "제주국제공항",
      "openHours": "08:00",
      "closeHours": "22:00",
      "afterHoursFee": 10000
    },
    "dropoff": {
      "code": "CJU",
      "type": "AIRPORT"
    }
  },
  "policies": {
    "mileage": "UNLIMITED",
    "fuel": "FULL_TO_FULL",
    "insurance": {
      "cdw": true,
      "scdw": false,
      "tp": true,
      "pai": false,
      "excess": 300000,
      "deposit": 500000
    },
    "cancellation": {
      "free": true,
      "freeUntil": "2025-10-29T23:59:59+09:00"
    },
    "amendment": {
      "allowed": true,
      "fee": 10000
    },
    "minDriverAge": 21,
    "youngDriverFee": 15000
  },
  "extras": [
    {
      "code": "GPS",
      "name": "내비게이션",
      "price": 5000,
      "per": "DAY"
    },
    {
      "code": "CHILD_SEAT",
      "name": "카시트",
      "price": 8000,
      "per": "DAY"
    }
  ],
  "rateKey": "RC_abc123...ttl=900",
  "expiresAt": "2025-10-10T12:15:00+09:00"
}
```

---

## 프런트엔드 연동

### 1. 차량 검색 화면

**필수 UI 요소:**
- 픽업/반납 장소 선택 (자동완성)
- 픽업/반납 날짜·시간 선택
- 운전자 나이 입력
- 필터 (변속기, 연료, 좌석수 등)

**주의사항:**
- 영업시간 외 선택 시 야간 수수료 표시
- 25세 미만 선택 시 young driver fee 안내

```tsx
// 예시 코드
const [pickupPlace, setPickupPlace] = useState('CJU');
const [pickupTime, setPickupTime] = useState('2025-11-01T10:00:00+09:00');

const handleSearch = async () => {
  const response = await fetch('/api/cars/availability?' + new URLSearchParams({
    pickup_place_id: pickupPlace,
    dropoff_place_id: pickupPlace,
    pickup_at: pickupTime,
    dropoff_at: dropoffTime,
    driver_age: '25',
    resident_country: 'KR',
  }));

  const { data } = await response.json();
  setCars(data);
};
```

### 2. 차량 목록 카드

**표시 정보:**
- 차량 이미지 (썸네일)
- 차명 + "또는 동급" 표시
- 가격 (total) 강조
- 기본요금/세금/수수료 드롭다운
- 픽업·반납 시간
- 보험/면책금 툴팁
- 취소정책 요약

```tsx
<CarCard>
  <Image src={vehicle.images[0]} />
  <h3>{vehicle.model}</h3>
  <p>₩{price.total.toLocaleString()}</p>
  <PriceBreakdown>
    <div>기본 요금: ₩{price.base.toLocaleString()}</div>
    <div>세금: ₩{price.taxes.toLocaleString()}</div>
    {price.fees.map(fee => (
      <div key={fee.type}>{fee.name}: ₩{fee.amount.toLocaleString()}</div>
    ))}
  </PriceBreakdown>
  <Button onClick={() => handleBook(rateKey)}>예약하기</Button>
</CarCard>
```

### 3. 예약 플로우

```tsx
const handleBook = async (rateKey: string) => {
  // 1. Quote 재검증
  const quoteRes = await fetch('/api/cars/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rateKey }),
  });

  const quote = await quoteRes.json();

  if (!quote.success || !quote.available) {
    alert('차량을 예약할 수 없습니다.');
    return;
  }

  if (quote.priceChanged) {
    if (!confirm(`가격이 변경되었습니다. ${quote.price.total}원으로 계속하시겠습니까?`)) {
      return;
    }
  }

  // 2. 예약 생성
  const bookingRes = await fetch('/api/cars/booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rateKey: quote.rateKey,
      driverInfo: { ... },
      paymentInfo: { ... },
      extras: selectedExtras,
    }),
  });

  const booking = await bookingRes.json();

  if (booking.success) {
    // 예약 완료 페이지로 이동
    router.push(`/booking/success?id=${booking.bookingId}`);
  } else {
    alert(booking.error);
  }
};
```

---

## 배포 가이드

### 환경 변수

```bash
# .env

# Rentalcars API
RENTALCARS_API_KEY=your_api_key
RENTALCARS_AFFILIATE_ID=your_affiliate_id

# Redis
REDIS_URL=redis://localhost:6379

# CDN (이미지 캐싱용)
CDN_BUCKET=car-images
CDN_BASE_URL=https://cdn.travleap.com
```

### Redis 설치

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### 서버 시작

```bash
npm install
npm run dev
```

---

## 파일 구조

```
utils/rentcar/
├── types.ts              # 타입 정의
├── connector.ts          # 공급업체 커넥터
├── cache.ts              # Redis 캐시
├── service.ts            # 서비스 레이어
├── api.ts                # API 엔드포인트
└── README.md             # 문서

types/
└── rentcar-db.ts         # DB 타입
```

---

## 에러 코드

| 코드 | 설명 | 대응 |
|------|------|------|
| `VEHICLE_UNAVAILABLE` | 차량 품절 | 다른 차량 선택 |
| `PRICE_CHANGED` | 가격 변경 | 사용자 확인 후 재시도 |
| `DRIVER_TOO_YOUNG` | 운전자 나이 부족 | 21세 이상 필요 안내 |
| `MISSING_RATE_KEY` | rateKey 누락 | 검색부터 다시 시작 |
| `BOOKING_FAILED` | 예약 실패 | 고객센터 연락 |

---

## 참고사항

1. **RateKey TTL**: 15분 만료 시 Quote 다시 요청
2. **이미지 캐싱**: 공급업체 CDN hotlink 제한 → 우리 CDN으로 복사 필수
3. **영업시간**: 픽업 시간이 영업시간 외일 경우 야간 수수료 자동 추가
4. **Young Driver Fee**: 25세 미만은 추가 요금 발생
5. **취소 정책**: 무료 취소 가능 시간 명확히 표시

---

## 문의

- 기술 문의: dev@travleap.com
- API 연동 문의: api@travleap.com

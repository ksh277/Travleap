# PMS 통합 숙박 예약 시스템

숙박업체의 객실 재고를 실시간으로 조회하고, 결제와 함께 예약을 확정하는 시스템입니다.

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [아키텍처](#아키텍처)
3. [주요 기능](#주요-기능)
4. [API 사용법](#api-사용법)
5. [Admin 연동](#admin-연동)
6. [에러 처리](#에러-처리)
7. [배포 가이드](#배포-가이드)

---

## 시스템 개요

### 핵심 원칙

- **읽기는 캐시, 쓰기는 PMS 원장** - 성능과 정확성의 균형
- **오버부킹 방지** - Hold 전략 + 결제 PreAuth
- **장애 대응** - Circuit Breaker + Fallback to Cache

### 시스템 구조

```
┌─────────────┐
│  Frontend   │
│  (Admin)    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│        PMS Integration Layer        │
├─────────────────────────────────────┤
│  ┌────────────┐  ┌──────────────┐  │
│  │   Cache    │  │   Fallback   │  │
│  │  (Redis)   │  │   Strategy   │  │
│  └────────────┘  └──────────────┘  │
├─────────────────────────────────────┤
│  ┌────────────┐  ┌──────────────┐  │
│  │    PMS     │  │   Payment    │  │
│  │ Connector  │  │   Service    │  │
│  └────────────┘  └──────────────┘  │
└─────────────────────────────────────┘
       │                    │
       ▼                    ▼
┌──────────────┐    ┌──────────────┐
│  PMS API     │    │  결제 API    │
│ (CloudBeds)  │    │ (Toss, etc)  │
└──────────────┘    └──────────────┘
```

---

## 아키텍처

### 1. 재고 조회 (읽기)

```typescript
// 캐시 우선 조회
const inventories = await pmsService.getInventory(
  'cloudbeds',
  'hotel_123',
  'room_456',
  '2025-11-01',
  '2025-11-03'
);
```

**플로우:**
1. Redis 캐시 확인 (`inv:{hotelId}:{roomTypeId}:{date}`)
2. 캐시 미스 → PMS API 호출
3. 응답 데이터를 Redis에 저장 (TTL: 60-120초)
4. 결과 반환

### 2. 예약 확정 (쓰기)

```typescript
const result = await bookingCheckout({
  vendor: 'cloudbeds',
  hotelId: 'hotel_123',
  roomTypeId: 'room_456',
  checkIn: '2025-11-01',
  checkOut: '2025-11-03',
  guestInfo: { ... },
  payment: { ... }
});
```

**플로우:**
1. **재고 확인** - 모든 날짜에 재고 있는지 체크
2. **Hold 생성** - PMS에 180초 단기 잠금
3. **결제 PreAuth** - 사전 승인 (실제 결제 X)
4. **예약 확정** - PMS에 Confirm
5. **결제 Capture** - 실제 결제 완료

**실패 시 롤백:**
- Hold 해제
- PreAuth 취소

### 3. 캐시 전략

**Redis 키 구조:**
```
inv:{hotelId}:{roomTypeId}:{date}  → 재고 (TTL: 90초)
rate:{hotelId}:{roomTypeId}:{date} → 요금 (TTL: 300초)
hold:{holdId}                       → Hold (TTL: 180초)
hotel:{hotelId}:rooms               → 호텔 객실 목록 (TTL: 3600초)
```

**웹훅/폴링:**
- PMS에서 웹훅 수신 시 캐시 무효화
- 주기적 폴링(300초, 기본 5분)으로 변경분 동기화

---

## 주요 기능

### 1. PMS Connector

각 PMS 공급업체별 커넥터 구현:

```typescript
// CloudBeds 예시
const connector = PMSConnectorFactory.getConnector('cloudbeds', 'hotel_123');

// 객실 타입 조회
const roomTypes = await connector.getRoomTypes('hotel_123');

// 재고 조회
const inventory = await connector.getInventory(
  'hotel_123',
  ['room_456'],
  '2025-11-01',
  '2025-11-03'
);

// 예약 생성
const hold = await connector.createHold(bookingRequest, 180);
```

### 2. 캐시 레이어

```typescript
const inventoryCache = new InventoryCache();

// 재고 조회
const inventory = await inventoryCache.getInventory(
  'hotel_123',
  'room_456',
  '2025-11-01'
);

// 재고 감소 (예약 시)
await inventoryCache.decrementInventory(
  'hotel_123',
  'room_456',
  '2025-11-01',
  1
);

// 재고 복구 (취소 시)
await inventoryCache.incrementInventory(
  'hotel_123',
  'room_456',
  '2025-11-01',
  1
);
```

### 3. Fallback Strategy

```typescript
const fallbackStrategy = new FallbackStrategy();

// PMS 장애 시 캐시 데이터 사용
const result = await fallbackStrategy.getInventoryWithFallback(
  () => connector.getInventory(...),
  'hotel_123',
  'room_456',
  ['2025-11-01', '2025-11-02']
);

if (result.source === 'cache') {
  console.warn('⚠️ PMS 장애 - 캐시 데이터 사용 중');
}
```

---

## API 사용법

### POST /api/booking/checkout

예약 결제 및 확정 API

**Request:**
```json
{
  "vendor": "cloudbeds",
  "hotelId": "hotel_123",
  "roomTypeId": "room_456",
  "checkIn": "2025-11-01",
  "checkOut": "2025-11-03",
  "guestInfo": {
    "firstName": "홍",
    "lastName": "길동",
    "email": "hong@example.com",
    "phone": "+82-10-1234-5678"
  },
  "adults": 2,
  "children": 0,
  "payment": {
    "cardToken": "tok_visa_1234",
    "amount": 250000,
    "currency": "KRW"
  }
}
```

**Response (성공):**
```json
{
  "success": true,
  "bookingId": "booking_789",
  "confirmationNumber": "CONF-123456"
}
```

**Response (실패):**
```json
{
  "success": false,
  "error": "재고 부족: 2025-11-02",
  "errorCode": "INVENTORY_UNAVAILABLE"
}
```

**Error Codes:**
- `INVENTORY_UNAVAILABLE` - 재고 부족
- `HOLD_FAILED` - Hold 생성 실패
- `PAYMENT_PREAUTH_FAILED` - 결제 사전 승인 실패
- `BOOKING_CONFIRM_FAILED` - 예약 확정 실패
- `PAYMENT_CAPTURE_FAILED` - 결제 승인 실패
- `INTERNAL_ERROR` - 서버 내부 오류

---

## Admin 연동

### 1. PMS 연동 설정

관리자 페이지에서 "숙박 카테고리 상품 추가" 선택 시:

```typescript
// 1. PMS 연동 모달 열기
<PMSIntegrationModal
  isOpen={isPMSModalOpen}
  onClose={() => setIsPMSModalOpen(false)}
  onDataLoaded={handlePMSDataLoaded}
/>

// 2. PMS 정보 입력
const config: PMSConnectionConfig = {
  vendor: 'cloudbeds',
  hotelId: 'hotel_123',
  apiKey: 'your_api_key',
};

// 3. 데이터 불러오기
const result = await fetchHotelDataFromPMS(config);

// 4. 폼에 자동 입력
const formData = convertPMSDataToFormData(result.data, 'cloudbeds');
```

### 2. 자동 생성되는 입력 폼

- 호텔 이름
- 위치
- 객실 타입 목록 (하이라이트로 표시)
- 평균 가격
- 최대 인원
- 현재 재고

### 3. DB 저장

```typescript
await saveProductToDB(formData);
// → listings 테이블 + room_inventory 테이블
```

---

## 에러 처리

### 1. Circuit Breaker

5번 연속 실패 시 60초 동안 PMS 호출 차단:

```typescript
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,
});
```

**상태:**
- `CLOSED` - 정상 동작
- `OPEN` - PMS 호출 차단 (캐시만 사용)
- `HALF_OPEN` - 복구 시도 중

### 2. Retry with Exponential Backoff

일시적 오류 시 재시도 (최대 3회):

```typescript
await retryWithBackoff(
  () => pmsConnector.getInventory(...),
  3,  // 최대 재시도 횟수
  500 // 기본 딜레이 (ms)
);
// 재시도 딜레이: 500ms → 1000ms → 2000ms
```

### 3. Degraded Mode

PMS 장애 시 읽기 전용 모드:

```typescript
const degradedManager = new DegradedModeManager();

// 장애 발생 시
degradedManager.enableDegradedMode('PMS API 다운');

// 예약 시도
const check = degradedManager.checkOperationAllowed('write');
if (!check.allowed) {
  throw new Error(check.message);
  // "Degraded Mode: 현재 예약이 불가능합니다. (PMS API 다운)"
}
```

---

## 배포 가이드

### 1. 환경 변수 설정

```bash
# .env
PMS_hotel_123_API_KEY=your_cloudbeds_api_key
REDIS_URL=redis://localhost:6379
PAYMENT_API_KEY=your_payment_api_key
```

### 2. Redis 설치

```bash
# Docker로 Redis 실행
docker run -d -p 6379:6379 redis:7-alpine
```

### 3. 데이터베이스 마이그레이션

```sql
-- room_inventory 테이블
CREATE TABLE room_inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hotel_id VARCHAR(100) NOT NULL,
  room_type_id VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  available INT NOT NULL,
  total INT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hotel_room_date (hotel_id, room_type_id, date)
);

-- rate_plan 테이블
CREATE TABLE rate_plan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hotel_id VARCHAR(100) NOT NULL,
  room_type_id VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'KRW',
  rules JSON,
  INDEX idx_hotel_room_date (hotel_id, room_type_id, date)
);

-- booking 테이블
CREATE TABLE booking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id VARCHAR(100) UNIQUE NOT NULL,
  hotel_id VARCHAR(100) NOT NULL,
  room_type_id VARCHAR(100) NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  status ENUM('pending', 'confirmed', 'cancelled', 'failed'),
  hold_id VARCHAR(100),
  payment_auth_id VARCHAR(100),
  total_price DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'KRW',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 4. 성능 모니터링

```typescript
// 캐시 히트율 모니터링
const cacheHitRate = cacheHits / (cacheHits + cacheMisses);
console.log(`캐시 히트율: ${(cacheHitRate * 100).toFixed(2)}%`);

// Circuit Breaker 상태 모니터링
const circuitState = fallbackStrategy.getCircuitState();
if (circuitState === 'OPEN') {
  // 알림 발송
  sendAlert('PMS Circuit Breaker OPEN!');
}
```

---

## 파일 구조

```
utils/pms/
├── types.ts              # 타입 정의
├── connector.ts          # PMS 커넥터 (CloudBeds 등)
├── cache.ts              # Redis 캐시 레이어
├── service.ts            # 비즈니스 로직 (재고/예약)
├── booking-api.ts        # 예약 API 엔드포인트
├── admin-integration.ts  # Admin 페이지 연동
├── webhook-handler.ts    # 웹훅 수신 및 처리
├── polling-sync.ts       # 폴링 동기화
├── fallback.ts           # 에러 처리 전략
└── README.md             # 문서 (이 파일)

components/admin/
└── PMSIntegrationModal.tsx  # PMS 연동 모달 UI

types/database.ts
└── PMS 관련 타입 추가:
    - RoomType, RoomMedia, RatePlan, RoomInventory
    - PMSBookingRecord, PMSWebhookEvent, PMSConfig
```

---

## 웹훅 및 폴링 처리

### 1. 웹훅 수신

PMS에서 재고/요금 변경 이벤트를 실시간으로 받습니다.

```typescript
// POST /api/webhooks/pms/:vendor
app.post('/api/webhooks/pms/:vendor', async (req, res) => {
  const vendor = req.params.vendor as PMSVendor;
  const payload = req.body;
  const signature = req.headers['x-pms-signature'] as string;
  const secret = process.env.PMS_WEBHOOK_SECRET || '';

  const result = await handleWebhookRequest(vendor, payload, signature, secret);

  if (result.success) {
    res.status(200).json({ success: true });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});
```

**지원하는 이벤트:**
- `inventory_update` - 재고 변경 → 캐시 무효화
- `rate_update` - 요금 변경 → 캐시 무효화
- `booking_confirm` - 예약 확정 → DB 업데이트
- `booking_cancel` - 예약 취소 → DB 업데이트
- `room_update` - 객실 정보 변경 → DB 업데이트

**보안:**
- HMAC SHA256 서명 검증
- Idempotency Key로 중복 방지

### 2. 폴링 동기화

웹훅을 지원하지 않는 PMS를 위한 주기적 동기화입니다.

```typescript
// 서버 시작 시 모든 폴링 작업 시작
await startAllPollingJobs();

// 특정 호텔 폴링 시작
await startPollingForHotel('cloudbeds', 'hotel_123');

// 폴링 상태 조회
const status = getPollingStatus('cloudbeds', 'hotel_123');
console.log(status);
// {
//   hotelId: 'hotel_123',
//   vendor: 'cloudbeds',
//   isRunning: true,
//   lastSyncAt: '2025-10-10T12:00:00Z',
//   nextSyncAt: '2025-10-10T12:05:00Z',
//   errorCount: 0
// }

// 수동 동기화 트리거
await triggerManualSync('cloudbeds', 'hotel_123');
```

**폴링 설정 (DB):**
```typescript
const pmsConfig = {
  listing_id: 1,
  vendor: 'cloudbeds',
  hotel_id: 'hotel_123',
  polling_enabled: true,
  polling_interval_seconds: 300, // 5분
};
```

**에러 처리:**
- 연속 5회 실패 시 폴링 자동 중지
- 관리자에게 알림 발송 (TODO)

### 3. 데이터 동기화 범위

폴링 시 향후 30일 데이터를 동기화합니다:

```typescript
// 1. 모든 객실 타입 조회
const roomTypes = await db.findAll('room_types', {
  pms_vendor: 'cloudbeds',
  pms_hotel_id: 'hotel_123',
});

// 2. 각 객실 타입별 재고/요금 조회 및 캐시 갱신
for (const roomType of roomTypes) {
  await pmsService.getInventory(
    'cloudbeds',
    'hotel_123',
    roomType.pms_room_type_id,
    '2025-10-10', // 오늘
    '2025-11-09'  // 30일 후
  );

  await pmsService.getRates(
    'cloudbeds',
    'hotel_123',
    roomType.pms_room_type_id,
    '2025-10-10',
    '2025-11-09'
  );
}
```

---

## 추가 개선 사항

### 1. 확장성

- **독립 서비스화** - 숙박업체가 많아지면 PMS 서비스를 별도 마이크로서비스로 분리
- **메시지 큐** - Kafka/SQS로 이벤트 처리 (웹훅 → 캐시 무효화)
- **샤딩** - 호텔별로 Redis 샤딩

### 2. 모니터링

- Prometheus + Grafana로 메트릭 수집
- PMS API 응답 시간, 에러율 추적
- 캐시 히트율, Hold 만료율 추적

### 3. 보안

- API Key 암호화 저장
- Rate Limiting (PMS API 호출 제한)
- 민감 정보 로깅 방지

---

## 문의

구현 관련 문의: travleap-dev@example.com

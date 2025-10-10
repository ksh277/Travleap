# PMS 통합 시스템 아키텍처

## 📖 개요

트래블앱(여행/숙박 예약 플랫폼)의 PMS(Property Management System) 통합 시스템입니다.

**핵심 목표:**
- 숙박업체의 객실 재고를 실시간으로 조회
- 결제와 함께 예약을 확정
- 관리자 페이지에서 PMS API를 통해 객실 정보를 자동으로 불러와 상품 추가

---

## 🏗️ 시스템 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │  상품 검색/    │  │  예약 페이지   │  │ 관리자 페이지│  │
│  │  재고 조회     │  │  (결제)        │  │ (PMS 연동)   │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
└──────────────┬──────────────┬──────────────┬───────────────┘
               │              │              │
               ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend API Layer                         │
├─────────────────────────────────────────────────────────────┤
│  GET  /api/inventory/:hotelId/:roomTypeId                   │
│  POST /api/booking/checkout                                 │
│  POST /api/admin/pms/fetch-hotel-data                       │
│  POST /api/webhooks/pms/:vendor                             │
└──────────────┬──────────────┬──────────────┬───────────────┘
               │              │              │
               ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                 PMS Integration Layer                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  PMSService  │  │ BookingAPI   │  │ AdminIntegration│  │
│  │  (재고/요금) │  │ (예약 처리)  │  │ (상품 추가)     │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ WebhookHandler│ │ PollingSync  │  │ FallbackStrategy│  │
│  │ (실시간 동기화)│ │ (주기 동기화)│  │ (장애 대응)     │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└──────────────┬──────────────┬──────────────┬───────────────┘
               │              │              │
        ┌──────┴──────┐       │       ┌──────┴──────┐
        ▼             ▼       │       ▼             ▼
  ┌─────────┐   ┌─────────┐  │  ┌─────────┐  ┌──────────┐
  │  Redis  │   │Database │  │  │ PMS API │  │ Payment  │
  │ (Cache) │   │ (Supabase)│ │ │CloudBeds│  │ Gateway  │
  └─────────┘   └─────────┘  │  └─────────┘  └──────────┘
                              │
                              ▼
                        ┌──────────┐
                        │ Polling  │
                        │ Scheduler│
                        └──────────┘
```

---

## 🔄 핵심 플로우

### 1. 재고 조회 플로우 (읽기)

```
사용자 검색
    │
    ▼
GET /api/inventory/:hotelId/:roomTypeId?startDate=2025-11-01&endDate=2025-11-03
    │
    ▼
PMSService.getInventory()
    │
    ├─→ Redis 캐시 확인
    │   └─→ 캐시 HIT → 결과 반환
    │
    └─→ 캐시 MISS
        │
        ▼
    PMS API 호출 (CloudBeds, Opera 등)
        │
        ▼
    Redis 캐시 저장 (TTL: 90초)
        │
        ▼
    결과 반환
```

**캐시 키 구조:**
```
inv:{hotelId}:{roomTypeId}:{date}
예: inv:hotel_123:room_456:2025-11-01
```

### 2. 예약 확정 플로우 (쓰기)

```
사용자 예약 요청
    │
    ▼
POST /api/booking/checkout
    │
    ▼
[1단계] 재고 확인
    │
    ▼
[2단계] Hold 생성 (PMS에 180초 잠금)
    │
    ▼
[3단계] 결제 PreAuth (사전 승인)
    │
    ├─→ 실패 → Hold 해제 → 에러 반환
    │
    ▼
[4단계] 예약 확정 (PMS Confirm)
    │
    ├─→ 실패 → Hold 해제 + PreAuth 취소 → 에러 반환
    │
    ▼
[5단계] 결제 Capture (실제 결제)
    │
    └─→ 성공 → 예약 완료 (bookingId 반환)
```

**에러 처리:**
- 각 단계 실패 시 이전 단계 롤백
- Hold 만료 시간: 180초 (3분)
- PreAuth 유효 시간: PG사별 상이 (일반적으로 24시간)

### 3. Admin 상품 추가 플로우

```
관리자 "숙박 상품 추가" 클릭
    │
    ▼
PMSIntegrationModal 열림
    │
    ▼
[입력] PMS Vendor, Hotel ID, API Key
    │
    ▼
fetchHotelDataFromPMS(config)
    │
    ├─→ PMS API: 객실 타입 조회
    │
    ├─→ PMS API: 향후 30일 재고 조회
    │
    └─→ PMS API: 향후 30일 요금 조회
    │
    ▼
convertPMSDataToFormData()
    │
    ▼
자동으로 입력 폼 생성
    - 호텔명, 위치, 객실 타입별 정보
    - 평균 가격, 재고, 이미지 등
    │
    ▼
[관리자 확인/수정]
    │
    ▼
saveProductToDB(formData)
    │
    ├─→ listings 테이블 저장
    ├─→ pms_configs 테이블 저장
    ├─→ room_types 테이블 저장
    ├─→ room_media 테이블 저장
    ├─→ rate_plans 테이블 저장
    └─→ room_inventory 테이블 저장 (30일 분)
    │
    ▼
저장 완료 → listing_id 반환
```

---

## 📊 데이터베이스 스키마

### 1. PMS 관련 테이블

#### `room_types` - 객실 타입 (정적 정보)
```sql
CREATE TABLE room_types (
  id SERIAL PRIMARY KEY,
  listing_id INT NOT NULL,                -- 어떤 숙소에 속하는지
  pms_vendor VARCHAR(50),                 -- 'cloudbeds', 'opera', etc
  pms_hotel_id VARCHAR(100),              -- PMS 측 호텔 ID
  pms_room_type_id VARCHAR(100),          -- PMS 측 객실 타입 ID
  room_type_name VARCHAR(255) NOT NULL,   -- 예: Deluxe Double Room
  description TEXT,
  max_occupancy INT NOT NULL,
  bed_type VARCHAR(50),                   -- King, Queen, Twin
  bed_count INT,
  room_size DECIMAL(10,2),                -- 평방미터
  view_type VARCHAR(50),                  -- Ocean View, City View
  bathroom_type VARCHAR(50),
  amenities JSONB,                        -- ["WiFi", "TV", "Mini Bar"]
  check_in_time TIME,
  check_out_time TIME,
  house_rules TEXT,
  cancellation_policy TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `room_media` - 객실 이미지
```sql
CREATE TABLE room_media (
  id SERIAL PRIMARY KEY,
  room_type_id INT NOT NULL,
  media_type VARCHAR(20) NOT NULL,        -- 'image', 'video', '360_view'
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text VARCHAR(255),
  display_order INT DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `rate_plans` - 요금 플랜
```sql
CREATE TABLE rate_plans (
  id SERIAL PRIMARY KEY,
  room_type_id INT NOT NULL,
  pms_rate_plan_id VARCHAR(100),
  rate_plan_name VARCHAR(255) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'KRW',
  min_stay INT,
  max_stay INT,
  is_refundable BOOLEAN DEFAULT TRUE,
  cancellation_hours INT,                 -- 취소 가능 시간
  cancellation_fee_percent INT,           -- 취소 수수료 (%)
  breakfast_included BOOLEAN DEFAULT FALSE,
  valid_from DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `room_inventory` - 날짜별 재고 (동적 데이터)
```sql
CREATE TABLE room_inventory (
  id SERIAL PRIMARY KEY,
  room_type_id INT NOT NULL,
  date DATE NOT NULL,
  available INT NOT NULL,                 -- 남은 객실 수
  total INT NOT NULL,                     -- 전체 객실 수
  price_override DECIMAL(10,2),           -- 특정 날짜 요금 오버라이드
  min_stay_override INT,
  closed_to_arrival BOOLEAN DEFAULT FALSE,
  closed_to_departure BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(room_type_id, date)
);

CREATE INDEX idx_room_inventory_date ON room_inventory(room_type_id, date);
```

#### `pms_configs` - PMS 설정
```sql
CREATE TABLE pms_configs (
  id SERIAL PRIMARY KEY,
  listing_id INT NOT NULL,
  vendor VARCHAR(50) NOT NULL,
  hotel_id VARCHAR(100) NOT NULL,
  api_key_encrypted TEXT NOT NULL,        -- 암호화된 API 키
  api_base_url TEXT,
  webhook_enabled BOOLEAN DEFAULT FALSE,
  webhook_secret VARCHAR(255),
  polling_enabled BOOLEAN DEFAULT TRUE,
  polling_interval_seconds INT DEFAULT 300,
  last_sync_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `pms_booking_records` - PMS 예약 연동 기록
```sql
CREATE TABLE pms_booking_records (
  id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL,
  pms_vendor VARCHAR(50) NOT NULL,
  pms_hotel_id VARCHAR(100) NOT NULL,
  pms_booking_id VARCHAR(100) NOT NULL,
  pms_confirmation_number VARCHAR(100),
  hold_id VARCHAR(100),
  hold_expires_at TIMESTAMP,
  status VARCHAR(20) NOT NULL,            -- 'hold', 'confirmed', 'cancelled', 'failed'
  payment_auth_id VARCHAR(100),
  payment_transaction_id VARCHAR(100),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `pms_webhook_events` - 웹훅 이벤트 기록
```sql
CREATE TABLE pms_webhook_events (
  id SERIAL PRIMARY KEY,
  vendor VARCHAR(50) NOT NULL,
  event_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(50) NOT NULL,        -- 'inventory_update', 'rate_update', etc
  hotel_id VARCHAR(100) NOT NULL,
  room_type_id VARCHAR(100),
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  error_message TEXT,
  idempotency_key VARCHAR(255) NOT NULL,  -- 중복 방지
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(vendor, event_id, idempotency_key)
);
```

---

## 🔌 API 엔드포인트

### 1. 재고 조회
```
GET /api/inventory/:hotelId/:roomTypeId
Query: startDate, endDate

Response:
{
  "success": true,
  "data": [
    {
      "hotelId": "hotel_123",
      "roomTypeId": "room_456",
      "date": "2025-11-01",
      "available": 5,
      "total": 10,
      "updatedAt": "2025-10-10T12:00:00Z"
    }
  ]
}
```

### 2. 예약 확정
```
POST /api/booking/checkout
Body:
{
  "vendor": "cloudbeds",
  "hotelId": "hotel_123",
  "roomTypeId": "room_456",
  "checkIn": "2025-11-01",
  "checkOut": "2025-11-03",
  "guestInfo": { ... },
  "payment": { ... }
}

Response:
{
  "success": true,
  "bookingId": "booking_789",
  "confirmationNumber": "CONF-123456"
}
```

### 3. Admin - PMS 데이터 불러오기
```
POST /api/admin/pms/fetch-hotel-data
Body:
{
  "vendor": "cloudbeds",
  "hotelId": "hotel_123",
  "apiKey": "your_api_key"
}

Response:
{
  "success": true,
  "data": {
    "hotelName": "Ocean View Hotel",
    "location": "제주시",
    "roomTypes": [ ... ]
  }
}
```

### 4. 웹훅 수신
```
POST /api/webhooks/pms/:vendor
Headers:
  x-pms-signature: <HMAC SHA256 signature>
Body:
{
  "eventId": "evt_123",
  "eventType": "inventory_update",
  "hotelId": "hotel_123",
  "roomTypeId": "room_456",
  "timestamp": "2025-10-10T12:00:00Z",
  "data": { ... }
}

Response:
{
  "success": true
}
```

---

## ⚙️ 환경 변수

```bash
# .env

# PMS API Keys (호텔별)
PMS_hotel_123_API_KEY=your_cloudbeds_api_key
PMS_hotel_456_API_KEY=your_opera_api_key

# Redis
REDIS_URL=redis://localhost:6379

# Payment Gateway
PAYMENT_API_KEY=your_toss_api_key
PAYMENT_SECRET_KEY=your_toss_secret_key

# Webhook
PMS_WEBHOOK_SECRET=your_webhook_secret

# DB
DATABASE_URL=postgresql://user:password@localhost:5432/travleap
```

---

## 🚀 배포 및 실행

### 1. 로컬 개발 환경

```bash
# 1. Redis 시작
docker run -d -p 6379:6379 redis:7-alpine

# 2. 환경 변수 설정
cp .env.example .env

# 3. 의존성 설치
npm install

# 4. 서버 시작
npm run dev

# 5. 폴링 작업 시작 (별도 터미널)
node scripts/start-polling.js
```

### 2. 프로덕션 배포

```bash
# 1. Docker Compose로 Redis + DB 실행
docker-compose up -d

# 2. 빌드
npm run build

# 3. 서버 시작 (PM2)
pm2 start ecosystem.config.js

# 4. 폴링 스케줄러 시작
pm2 start ecosystem.config.js --only polling-scheduler
```

---

## 📈 모니터링 및 로깅

### 주요 메트릭

1. **캐시 히트율**
   ```typescript
   const hitRate = cacheHits / (cacheHits + cacheMisses);
   console.log(`Cache Hit Rate: ${(hitRate * 100).toFixed(2)}%`);
   ```

2. **PMS API 응답 시간**
   ```typescript
   const avgResponseTime = totalResponseTime / totalRequests;
   console.log(`Avg PMS Response Time: ${avgResponseTime}ms`);
   ```

3. **Hold 만료율**
   ```typescript
   const holdExpiredRate = holdExpired / totalHolds;
   console.log(`Hold Expired Rate: ${(holdExpiredRate * 100).toFixed(2)}%`);
   ```

### 알림 설정

- PMS API 5회 연속 실패 → Slack 알림
- Circuit Breaker OPEN → 이메일 알림
- 폴링 5회 연속 실패 → 관리자 알림

---

## 🔒 보안 고려사항

1. **API Key 암호화**
   - DB 저장 시 AES-256으로 암호화
   - 환경 변수는 Vault 사용 권장

2. **웹훅 서명 검증**
   - HMAC SHA256으로 검증
   - Replay Attack 방지 (타임스탬프 체크)

3. **Rate Limiting**
   - PMS API 호출: 분당 100회
   - 사용자 검색: IP당 분당 60회

---

## 🐛 트러블슈팅

### 문제: 캐시 미스가 너무 많음
**원인:** TTL이 너무 짧음
**해결:** `CacheTTL.inventory`를 90초 → 120초로 증가

### 문제: 폴링이 자동 중지됨
**원인:** 연속 5회 실패
**해결:** `pms_configs` 테이블에서 `last_sync_at` 확인, PMS API 키 재확인

### 문제: Hold 만료 에러 빈발
**원인:** 결제 처리가 180초 안에 완료되지 않음
**해결:** Hold TTL을 300초로 증가 또는 결제 프로세스 최적화

---

## 📞 문의

- 기술 문의: dev@travleap.com
- PMS 연동 요청: partnerships@travleap.com

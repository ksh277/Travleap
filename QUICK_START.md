# TravelAP 백엔드 - 빠른 시작 가이드

## 🎯 핵심 기능

### 1. 숙박 예약 시스템 (PMS 연동)

**관리자**: PMS API 키 입력 → 자동으로 객실 정보 불러오기 → 저장
**사용자**: 날짜 검색 → 객실 목록 → 예약 → 결제

```bash
# 숙박 상품 추가 (관리자)
1. 관리자 페이지 → 상품 추가
2. "PMS에서 불러오기" 클릭
3. CloudBeds / Opera API 키 입력
4. 호텔 정보 자동 로드
5. 저장 → DB에 room_types, rate_plans, inventory 생성

# 실시간 재고 조회 (사용자)
GET /api/hotels/:hotelId/availability?checkIn=2025-11-01&checkOut=2025-11-03
→ Redis 캐시 (TTL 90초) 또는 PMS API 호출
```

**DB 테이블:**
- `listings` - 기본 정보
- `pms_configs` - PMS 설정
- `room_types` - 객실 타입
- `room_inventory` - 날짜별 재고
- `rate_plans` - 요금
- `pms_booking_records` - 예약 기록

**파일:**
- `utils/pms/*` - PMS 통합 로직
- `components/admin/PMSIntegrationModal.tsx` - 관리자 UI

---

### 2. 렌트카 검색·예약 시스템

**관리자**: 렌트카 공급업체 API 키 등록
**사용자**: 픽업/반납 장소·일시 입력 → 실시간 검색 → 예약 → 결제

```bash
# 렌트카 공급업체 등록 (관리자)
1. 관리자 페이지 → 설정 → 렌트카
2. Rentalcars.com API 키 입력
3. 저장 → rentcar_suppliers 테이블

# 차량 검색 (사용자)
GET /api/cars/availability?pickup=CJU&dropoff=CJU&pickupAt=2025-11-01T10:00
→ 모든 공급업체 API 병렬 호출 → 결과 합치기

# Quote (가격 재검증)
POST /api/cars/quote { rateKey: "RC_..." }
→ rateKey TTL 15분, 가격 변경 시 알림

# 예약
POST /api/cars/booking { rateKey, driverInfo, paymentInfo }
→ 확정번호 & 바우처 발급
```

**DB 테이블:**
- `rentcar_suppliers` - 공급업체 설정
- `car_bookings` - 예약 기록
- `car_booking_extras` - 추가 옵션 (GPS, 카시트 등)

**파일:**
- `utils/rentcar/*` - 렌트카 통합 로직

---

## 📂 프로젝트 구조

```
Travleap/
├── components/
│   ├── AdminPage.tsx                    # 관리자 페이지
│   └── admin/
│       └── PMSIntegrationModal.tsx      # PMS 연동 모달
│
├── utils/
│   ├── pms/                             # 숙박 (PMS 연동)
│   │   ├── types.ts                     # 타입 정의
│   │   ├── connector.ts                 # PMS API 커넥터
│   │   ├── cache.ts                     # Redis 캐시
│   │   ├── service.ts                   # 비즈니스 로직
│   │   ├── booking-api.ts               # 예약 API
│   │   ├── admin-integration.ts         # 관리자 연동
│   │   ├── webhook-handler.ts           # 웹훅 처리
│   │   ├── polling-sync.ts              # 폴링 동기화
│   │   └── README.md
│   │
│   ├── rentcar/                         # 렌트카
│   │   ├── types.ts
│   │   ├── connector.ts                 # 렌트카 API 커넥터
│   │   ├── cache.ts                     # Redis 캐시
│   │   ├── service.ts                   # 비즈니스 로직
│   │   ├── api.ts                       # API 엔드포인트
│   │   └── README.md
│   │
│   └── admin/
│       └── product-import.ts            # 통합 상품 가져오기
│
├── types/
│   ├── database.ts                      # 전체 DB 타입
│   └── rentcar-db.ts                    # 렌트카 DB 타입
│
└── 문서/
    ├── ADMIN_PRODUCT_IMPORT_GUIDE.md    # 관리자 가이드 ⭐
    └── QUICK_START.md                   # 이 문서
```

---

## 🚀 빠른 시작

### 1. 환경 변수 설정

```bash
# .env

# PMS (숙박)
PMS_hotel_123_API_KEY=your_cloudbeds_api_key
PMS_WEBHOOK_SECRET=your_webhook_secret

# 렌트카
RENTALCARS_API_KEY=your_rentalcars_api_key
RENTALCARS_AFFILIATE_ID=your_affiliate_id

# Redis
REDIS_URL=redis://localhost:6379

# 결제
PAYMENT_API_KEY=your_toss_api_key

# DB
DATABASE_URL=postgresql://...
```

### 2. Redis 시작

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### 3. 서버 시작

```bash
npm install
npm run dev
```

### 4. 폴링 스케줄러 시작 (숙박 재고 동기화)

```bash
# 별도 터미널
node scripts/start-pms-polling.js
```

---

## 🎬 실제 사용 시나리오

### 시나리오 1: 제주도 호텔 추가

```
1. 관리자가 CloudBeds에서 호텔 계정 생성
2. API Key 발급받음
3. TravelAP 관리자 페이지 접속
4. "상품 추가" → 카테고리 "숙박" 선택
5. "PMS에서 불러오기" 클릭
6. 모달에서 입력:
   - PMS: CloudBeds
   - Hotel ID: jeju_ocean_hotel
   - API Key: cb_abc123...
7. "데이터 불러오기" 클릭
8. 자동으로 불러와짐:
   - 호텔명: Ocean View Hotel Jeju
   - 위치: 제주시
   - 객실 3개:
     * Deluxe Double - 120,000원
     * Family Suite - 180,000원
     * Ocean View - 250,000원
9. "폼에 적용하기" → 자동으로 입력됨
10. 관리자가 확인 후 "저장"
11. ✅ DB에 저장 완료!
    - listings 테이블
    - pms_configs (폴링 5분 간격 시작)
    - room_types (3개)
    - room_inventory (30일치)
```

**사용자가 검색할 때:**

```
1. 사용자: 제주도 숙박 검색 (11/1 ~ 11/3)
2. GET /api/hotels/availability
3. Redis 캐시 확인 (TTL 90초)
   - 캐시 HIT → 즉시 반환
   - 캐시 MISS → PMS API 호출 → 캐시 저장
4. 사용자에게 객실 목록 표시
5. 사용자가 "Deluxe Double" 선택
6. 예약 플로우:
   - Hold (180초)
   - 결제 PreAuth
   - PMS Confirm
   - 결제 Capture
7. ✅ 예약 완료! 확정번호 발급
```

---

### 시나리오 2: 렌트카 검색

```
1. 관리자가 Rentalcars.com API Key 등록
   - 설정 → 렌트카 → API 키 입력
   - 저장 → rentcar_suppliers 테이블

2. 사용자: 제주공항 렌트카 검색
   - 픽업: 제주공항 (CJU)
   - 픽업 일시: 2025-11-01 10:00
   - 반납: 제주공항
   - 반납 일시: 2025-11-03 10:00
   - 운전자 나이: 25세

3. GET /api/cars/availability
   → Rentalcars API 호출
   → 결과 캐싱 (5분)

4. 차량 목록 표시:
   - Hyundai Avante (자동) - 88,000원
   - Kia Morning (자동) - 65,000원
   - Hyundai Tucson (SUV) - 120,000원

5. 사용자가 "Avante" 선택 → "예약하기"

6. Quote (가격 재검증):
   POST /api/cars/quote { rateKey: "RC_..." }
   → 가격 변경 없음 ✅

7. 예약:
   POST /api/cars/booking
   {
     rateKey: "RC_...",
     driverInfo: { 이름, 면허번호, ... },
     paymentInfo: { 카드 정보 },
     extras: [{ code: "GPS", quantity: 1 }]
   }

8. ✅ 예약 완료!
   - 확정번호: CONF-ABC123
   - 바우처 URL: https://...
   - 픽업 안내: 공항 1층 렌터카 데스크
```

---

## 📊 API 엔드포인트 요약

### 숙박 (PMS)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/hotels/availability` | 객실 검색 |
| POST | `/api/hotels/booking` | 예약 생성 |
| POST | `/api/webhooks/pms/:vendor` | PMS 웹훅 수신 |
| POST | `/api/admin/pms/fetch-hotel-data` | PMS 데이터 불러오기 |

### 렌트카

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/cars/availability` | 차량 검색 |
| POST | `/api/cars/quote` | Quote (재검증) |
| POST | `/api/cars/booking` | 예약 생성 |
| POST | `/api/cars/cancel` | 예약 취소 |

---

## 🔧 트러블슈팅

### 문제: PMS에서 데이터를 불러올 수 없음

**원인:** API Key가 잘못되었거나 호텔 ID가 틀림
**해결:**
1. PMS 관리자 페이지에서 API Key 재확인
2. 호텔 ID가 정확한지 확인
3. 네트워크 방화벽 확인

### 문제: 렌트카 검색 결과가 없음

**원인:** 공급업체 API Key 미등록
**해결:**
1. 관리자 페이지 → 설정 → 렌트카
2. Rentalcars.com API Key 등록 확인

### 문제: 재고가 실시간으로 업데이트되지 않음

**원인:** 폴링 스케줄러가 실행되지 않음
**해결:**
```bash
# 폴링 상태 확인
curl http://localhost:3000/api/admin/pms/polling-status

# 폴링 재시작
node scripts/start-pms-polling.js
```

---

## 📚 상세 문서

- **관리자 가이드**: [ADMIN_PRODUCT_IMPORT_GUIDE.md](ADMIN_PRODUCT_IMPORT_GUIDE.md)
- **PMS 시스템**: [utils/pms/README.md](utils/pms/README.md)
- **PMS 아키텍처**: [utils/pms/SYSTEM_ARCHITECTURE.md](utils/pms/SYSTEM_ARCHITECTURE.md)
- **렌트카 시스템**: [utils/rentcar/README.md](utils/rentcar/README.md)

---

## 💬 문의

- **기술 문의**: dev@travleap.com
- **PMS 연동**: partners@travleap.com
- **API 지원**: api@travleap.com

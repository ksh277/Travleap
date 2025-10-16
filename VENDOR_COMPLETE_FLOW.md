# 렌트카 벤더 완전 가이드 - 등록부터 운영까지

## 📋 목차
1. [벤더 등록 프로세스](#1-벤더-등록-프로세스)
2. [차량 관리](#2-차량-관리)
3. [예약 관리](#3-예약-관리)
4. [결제 및 정산](#4-결제-및-정산)
5. [대시보드](#5-대시보드)

---

## 1. 벤더 등록 프로세스

### 1-1. 새 계정 생성 및 업체 등록 신청

**API:** `POST /api/rentcar/vendor-register`

벤더가 직접 계정을 생성하고 업체 등록을 신청합니다.

**요청:**
```json
{
  "business_name": "제주렌트카",
  "business_registration_number": "123-45-67890",
  "contact_email": "contact@jejurentcar.com",
  "contact_phone": "064-123-4567",
  "contact_person": "홍길동",
  "account_email": "vendor@jejurentcar.com",
  "account_password": "securePassword123!",
  "address": "제주특별자치도 제주시 중앙로 100",
  "description": "제주도 최고의 렌트카 서비스",
  "website_url": "https://jejurentcar.com",
  "operating_hours": "24시간 운영"
}
```

**응답:**
```json
{
  "success": true,
  "vendorId": 5,
  "userId": 102,
  "message": "등록 신청이 완료되었습니다. 관리자 승인 후 이용 가능합니다."
}
```

**프로세스:**
1. 이메일 중복 확인
2. 사업자등록번호 중복 확인
3. `users` 테이블에 계정 생성 (role: 'vendor', is_active: false)
4. `rentcar_vendors` 테이블에 업체 정보 등록 (status: 'pending')
5. 관리자에게 알림 발송

### 1-2. 관리자 승인

**API:** `POST /api/admin/rentcar/vendor-approve`

**요청:**
```json
{
  "vendor_id": 5
}
```

**응답:**
```json
{
  "success": true,
  "message": "업체가 승인되었습니다."
}
```

**프로세스:**
1. `rentcar_vendors.status`를 'active'로 변경
2. 연결된 `users.is_active`를 true로 변경
3. 업체에게 승인 이메일 발송

### 1-3. 로그인

**API:** `POST /api/auth/login`

**요청:**
```json
{
  "email": "vendor@jejurentcar.com",
  "password": "securePassword123!"
}
```

**응답:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 102,
    "email": "vendor@jejurentcar.com",
    "name": "홍길동",
    "role": "vendor"
  }
}
```

---

## 2. 차량 관리

### 2-1. 차량 목록 조회

**API:** `GET /api/vendor/rentcar/vehicles?vendor_id=5`

**헤더:** `Authorization: Bearer {token}`

**응답:**
```json
{
  "success": true,
  "vehicles": [
    {
      "id": 10,
      "vendor_id": 5,
      "display_name": "현대 소나타 2024",
      "vehicle_type": "sedan",
      "manufacturer": "현대",
      "model": "소나타",
      "year": 2024,
      "passenger_capacity": 5,
      "fuel_type": "gasoline",
      "transmission": "automatic",
      "daily_rate_krw": 89000,
      "features": ["navigation", "bluetooth", "backup_camera"],
      "license_plate": "12가3456",
      "is_active": true,
      "completed_bookings": 45,
      "active_bookings": 2
    }
  ]
}
```

### 2-2. 새 차량 등록

**API:** `POST /api/vendor/rentcar/vehicles`

**헤더:** `Authorization: Bearer {token}`

**요청:**
```json
{
  "vendor_id": 5,
  "display_name": "기아 K5 2024",
  "vehicle_type": "sedan",
  "manufacturer": "기아",
  "model": "K5",
  "year": 2024,
  "passenger_capacity": 5,
  "fuel_type": "gasoline",
  "transmission": "automatic",
  "daily_rate_krw": 79000,
  "features": ["navigation", "bluetooth", "heated_seats"],
  "description": "2024년식 최신 기아 K5, 풀옵션",
  "thumbnail_url": "https://example.com/k5.jpg",
  "images": [
    "https://example.com/k5_1.jpg",
    "https://example.com/k5_2.jpg"
  ],
  "license_plate": "34나5678",
  "is_active": true
}
```

**응답:**
```json
{
  "success": true,
  "message": "차량이 등록되었습니다",
  "vehicle_id": 11
}
```

**권한 체크:**
- 벤더 ID와 사용자 ID 일치 확인
- 벤더 status가 'active'인지 확인
- 차량 번호판 중복 확인

### 2-3. 차량 정보 수정

**API:** `PUT /api/vendor/rentcar/vehicles/:id`

**헤더:** `Authorization: Bearer {token}`

**요청:**
```json
{
  "display_name": "기아 K5 2024 프리미엄",
  "daily_rate_krw": 85000,
  "description": "2024년식 최신 기아 K5, 풀옵션 + 프리미엄 패키지"
}
```

**응답:**
```json
{
  "success": true,
  "message": "차량 정보가 수정되었습니다"
}
```

**권한 체크:**
- 해당 차량이 요청한 벤더 소유인지 확인

### 2-4. 차량 삭제 (비활성화)

**API:** `DELETE /api/vendor/rentcar/vehicles/:id`

**헤더:** `Authorization: Bearer {token}`

**응답:**
```json
{
  "success": true,
  "message": "차량이 비활성화되었습니다"
}
```

**제약사항:**
- 활성 예약(pending, confirmed, in_progress)이 있는 차량은 삭제 불가
- 완전 삭제가 아닌 `is_active = FALSE`로 비활성화
- 데이터는 보존되어 예약 내역 조회 가능

---

## 3. 예약 관리

### 3-1. 특정 차량의 예약 내역

**API:** `GET /api/vendor/rentcar/vehicles/:id/bookings`

**헤더:** `Authorization: Bearer {token}`

**응답:**
```json
{
  "success": true,
  "bookings": [
    {
      "id": 234,
      "booking_number": "RC-ABC123-XYZ789",
      "vehicle_name": "기아 K5 2024",
      "customer_name": "김철수",
      "customer_email": "kim@example.com",
      "pickup_date": "2025-11-05",
      "dropoff_date": "2025-11-10",
      "rental_days": 5,
      "total_krw": 425000,
      "vendor_amount_krw": 382500,
      "status": "confirmed",
      "payment_status": "completed",
      "created_at": "2025-10-20T10:30:00Z"
    }
  ]
}
```

### 3-2. 전체 예약 내역 (모든 차량)

**API:** `GET /api/vendor/rentcar/bookings?vendor_id=5`

**헤더:** `Authorization: Bearer {token}`

**응답:**
```json
{
  "success": true,
  "bookings": [
    {
      "id": 234,
      "booking_number": "RC-ABC123-XYZ789",
      "vehicle_name": "기아 K5 2024",
      "license_plate": "34나5678",
      "customer_name": "김철수",
      "customer_email": "kim@example.com",
      "customer_phone": "010-1234-5678",
      "pickup_date": "2025-11-05",
      "dropoff_date": "2025-11-10",
      "total_krw": 425000,
      "vendor_amount_krw": 382500,
      "status": "confirmed",
      "payment_status": "completed"
    }
  ]
}
```

**최근 200개 예약 조회**

---

## 4. 결제 및 정산

### 4-1. 수수료 구조

```
총 예약 금액: 456,000원
플랫폼 수수료 (10%): 45,600원
벤더 수령액 (90%): 410,400원
```

### 4-2. 결제 프로세스

1. **고객이 예약 생성** → `status: 'pending'`, `payment_status: 'pending'`
2. **고객이 결제 완료** → Toss Payments 처리
3. **결제 확정 API 호출** → `POST /api/rentcar/payment/confirm`
4. **자동 수수료 계산 및 분배**
   ```sql
   platform_fee_krw = total_krw × commission_rate
   vendor_amount_krw = total_krw - platform_fee_krw
   ```
5. **예약 상태 업데이트** → `status: 'confirmed'`, `payment_status: 'completed'`

### 4-3. 환불 프로세스

**취소 수수료 정책:**
- 픽업 당일: 100% (환불 불가)
- 3일 이내: 50%
- 7일 이내: 30%
- 7일 이상: 10%

**예시:**
```
원래 금액: 456,000원
픽업까지 5일 남음 → 30% 수수료
환불 금액: 456,000 × 0.70 = 319,200원
```

---

## 5. 대시보드

### 5-1. 벤더 대시보드

**API:** `GET /api/vendor/rentcar/dashboard?vendor_id=5`

**헤더:** `Authorization: Bearer {token}`

**응답:**
```json
{
  "success": true,
  "dashboard": {
    "vendor": {
      "id": 5,
      "business_name": "제주렌트카"
    },
    "vehicles": {
      "total_vehicles": 15,
      "active_vehicles": 12
    },
    "bookings": {
      "total_bookings": 234,
      "pending_bookings": 5,
      "confirmed_bookings": 12,
      "completed_bookings": 200,
      "cancelled_bookings": 17
    },
    "revenue": {
      "total_revenue": 42500000,
      "this_month_revenue": 3200000
    },
    "recent_bookings": [
      {
        "id": 234,
        "booking_number": "RC-ABC123-XYZ789",
        "pickup_date": "2025-11-05",
        "dropoff_date": "2025-11-10",
        "status": "confirmed",
        "total_krw": 425000,
        "vehicle_name": "기아 K5 2024",
        "customer_name": "김철수"
      }
    ]
  }
}
```

---

## 6. 완전한 시나리오 예시

### 새 벤더 "서울렌트카"의 첫 예약까지

#### Step 1: 업체 등록
```bash
curl -X POST http://localhost:3004/api/rentcar/vendor-register \
  -H "Content-Type: application/json" \
  -d '{
    "business_name": "서울렌트카",
    "contact_email": "contact@seoulrentcar.com",
    "contact_phone": "02-1234-5678",
    "contact_person": "이영희",
    "account_email": "vendor@seoulrentcar.com",
    "account_password": "SecurePass123!"
  }'
```

#### Step 2: 관리자 승인 (관리자가 수행)
```bash
curl -X POST http://localhost:3004/api/admin/rentcar/vendor-approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -d '{
    "vendor_id": 6
  }'
```

#### Step 3: 로그인
```bash
curl -X POST http://localhost:3004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vendor@seoulrentcar.com",
    "password": "SecurePass123!"
  }'
```

응답에서 `token` 받음: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### Step 4: 첫 차량 등록
```bash
curl -X POST http://localhost:3004/api/vendor/rentcar/vehicles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "vendor_id": 6,
    "display_name": "BMW 520i 2024",
    "vehicle_type": "sedan",
    "manufacturer": "BMW",
    "model": "520i",
    "year": 2024,
    "passenger_capacity": 5,
    "fuel_type": "gasoline",
    "transmission": "automatic",
    "daily_rate_krw": 150000,
    "features": ["navigation", "leather_seats", "sunroof"],
    "license_plate": "12서3456",
    "is_active": true
  }'
```

#### Step 5: 고객이 검색 및 예약
```bash
# 고객이 차량 검색
curl -X POST http://localhost:3004/api/rentcar/vehicles/search \
  -H "Content-Type: application/json" \
  -d '{
    "pickup_date": "2025-11-01",
    "dropoff_date": "2025-11-05",
    "vehicle_type": "sedan"
  }'

# 고객이 예약 생성
curl -X POST http://localhost:3004/api/rentcar/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {CUSTOMER_TOKEN}" \
  -d '{
    "vehicle_id": 15,
    "pickup_location_id": 1,
    "dropoff_location_id": 1,
    "pickup_date": "2025-11-01",
    "pickup_time": "10:00",
    "dropoff_date": "2025-11-05",
    "dropoff_time": "18:00",
    "driver_name": "박민수",
    "driver_phone": "010-9876-5432",
    "driver_email": "park@example.com"
  }'
```

#### Step 6: 고객이 결제
```bash
curl -X POST http://localhost:3004/api/rentcar/payment/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {CUSTOMER_TOKEN}" \
  -d '{
    "booking_id": 300,
    "payment_key": "toss_payment_key_...",
    "order_id": "ORDER-300",
    "amount": 600000
  }'
```

**결과:**
- 총 금액: 600,000원
- 플랫폼 수수료 (10%): 60,000원
- 서울렌트카 수령액: 540,000원

#### Step 7: 벤더가 예약 확인
```bash
curl http://localhost:3004/api/vendor/rentcar/bookings?vendor_id=6 \
  -H "Authorization: Bearer {VENDOR_TOKEN}"
```

#### Step 8: 대시보드 확인
```bash
curl http://localhost:3004/api/vendor/rentcar/dashboard?vendor_id=6 \
  -H "Authorization: Bearer {VENDOR_TOKEN}"
```

---

## 7. 권한 및 보안

### 7-1. 벤더 권한 체크
모든 차량 관리 API는 다음을 확인합니다:
```javascript
// 1. 벤더 ID와 사용자 ID 일치 확인
const vendors = await db.query(`
  SELECT id FROM rentcar_vendors
  WHERE id = ? AND user_id = ?
`, [vendorId, userId]);

// 2. 벤더 상태 확인
if (vendor.status !== 'active') {
  return { success: false, message: '승인된 벤더만 사용 가능' };
}
```

### 7-2. 차량 소유권 확인
```javascript
// 차량이 해당 벤더 소유인지 확인
const vehicles = await db.query(`
  SELECT v.id
  FROM rentcar_vehicles v
  JOIN rentcar_vendors vendor ON v.vendor_id = vendor.id
  WHERE v.id = ? AND vendor.user_id = ?
`, [vehicleId, userId]);
```

### 7-3. 중복 방지
- 이메일 중복: 계정 생성 시
- 사업자등록번호 중복: 업체 등록 시
- 차량 번호판 중복: 차량 등록 시

---

## 8. API 엔드포인트 요약

### 벤더 계정
- `POST /api/rentcar/vendor-register` - 업체 등록 신청
- `POST /api/auth/login` - 로그인
- `POST /api/admin/rentcar/vendor-approve` - 관리자 승인

### 차량 관리
- `GET /api/vendor/rentcar/vehicles` - 차량 목록 조회 🔒
- `POST /api/vendor/rentcar/vehicles` - 차량 등록 🔒
- `PUT /api/vendor/rentcar/vehicles/:id` - 차량 수정 🔒
- `DELETE /api/vendor/rentcar/vehicles/:id` - 차량 삭제 🔒

### 예약 관리
- `GET /api/vendor/rentcar/vehicles/:id/bookings` - 특정 차량 예약 내역 🔒
- `GET /api/vendor/rentcar/bookings` - 전체 예약 내역 🔒

### 대시보드
- `GET /api/vendor/rentcar/dashboard` - 대시보드 통계 🔒

🔒 = 인증 필요 (Bearer Token)

---

## 9. 데이터베이스 테이블

### rentcar_vendors
```sql
CREATE TABLE rentcar_vendors (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT, -- users 테이블 연결
  business_name VARCHAR(200),
  business_number VARCHAR(50),
  contact_email VARCHAR(100),
  contact_phone VARCHAR(20),
  contact_name VARCHAR(100),
  address TEXT,
  description TEXT,
  logo_url VARCHAR(500),
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INT DEFAULT 0,
  commission_rate DECIMAL(5,4) DEFAULT 0.10,
  status ENUM('pending', 'active', 'suspended', 'inactive') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### rentcar_vehicles
```sql
CREATE TABLE rentcar_vehicles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vendor_id INT,
  display_name VARCHAR(200),
  vehicle_type VARCHAR(50),
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  year INT,
  passenger_capacity INT,
  fuel_type VARCHAR(50),
  transmission VARCHAR(50),
  daily_rate_krw DECIMAL(10,2),
  features JSON,
  description TEXT,
  thumbnail_url VARCHAR(500),
  images JSON,
  license_plate VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

**작성자:** Claude Code
**날짜:** 2025-10-16
**버전:** 1.0.0

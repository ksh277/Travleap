# 벤더 대시보드 완전한 E2E 테스트 계획

**작성일**: 2025-10-23
**목적**: 벤더 대시보드의 모든 기능을 처음부터 끝까지 검증

---

## 🎯 테스트 범위

### 1. 인증 및 로그인
- [ ] JWT 토큰 인증
- [ ] 로그아웃
- [ ] 권한 체크 (vendor/admin)

### 2. 업체 정보 관리
- [ ] GET `/api/vendors` - 업체 정보 조회
- [ ] PUT `/api/vendors` - 업체 정보 수정
- [ ] 비밀번호 변경
- [ ] 이메일 변경 시 재로그인

### 3. 차량 관리 (CRUD)
- [ ] GET `/api/vendor/vehicles` - 차량 목록 조회
- [ ] POST `/api/vendor/vehicles` - 차량 추가
- [ ] PUT `/api/vendor/vehicles` - 차량 수정
- [ ] DELETE `/api/vendor/vehicles` - 차량 삭제
- [ ] PUT `/api/vendor/vehicles` - 차량 가용성 토글
- [ ] CSV 대량 업로드

### 4. 예약 관리
- [ ] GET `/api/vendor/bookings` - 예약 목록 조회
- [ ] 예약 필터링 (날짜, 차량, 상태, 검색)
- [ ] POST `/api/rentcar/process-return` - 반납 처리
  - [ ] 지연 수수료 계산
  - [ ] 다음 예약 알림
  - [ ] 상태 업데이트 (completed)

### 5. 매출 통계
- [ ] GET `/api/vendor/revenue` - 매출 데이터 조회
- [ ] 7일 매출 차트 표시
- [ ] 월별 매출 합계 표시

### 6. 요금 설정 (별도 페이지)
- [ ] GET `/api/vendor/pricing/policies` - 요금 정책 조회
- [ ] POST `/api/vendor/pricing/policies` - 요금 정책 추가
- [ ] GET `/api/vendor/insurance` - 보험 상품 조회
- [ ] POST `/api/vendor/insurance` - 보험 상품 추가
- [ ] GET `/api/vendor/options` - 추가 옵션 조회
- [ ] POST `/api/vendor/options` - 추가 옵션 추가

---

## 📋 API 및 DB 매핑

### 1. 업체 정보

#### API: GET `/api/vendors`
**사용 파일**: `VendorDashboardPageEnhanced.tsx` (Line 305)

**데이터베이스 테이블**: `rentcar_vendors`

**컬럼**:
```sql
id, vendor_code, business_name (as name), brand_name,
contact_name (as contact_person), contact_email, contact_phone,
address, description, logo_url, images,
cancellation_policy, status, is_verified,
total_vehicles (as vehicle_count), average_rating,
created_at, updated_at
```

**응답 예시**:
```json
{
  "success": true,
  "data": [{
    "id": 165,
    "name": "대림렌트카",
    "contact_email": "vendor@example.com",
    "contact_phone": "010-1234-5678",
    "contact_person": "홍길동",
    "address": "신안군 ...",
    "description": "신안군 최고 렌트카",
    "logo_url": "https://...",
    "is_verified": true,
    "vehicle_count": 5
  }]
}
```

#### API: PUT `/api/vendors`
**사용 파일**: `VendorDashboardPageEnhanced.tsx` (Line 971)

**요청 Body**:
```json
{
  "id": 165,
  "name": "대림렌트카",
  "contact_person": "홍길동",
  "contact_email": "vendor@example.com",
  "contact_phone": "010-1234-5678",
  "address": "신안군 ...",
  "description": "...",
  "logo_url": "https://...",
  "cancellation_policy": "...",
  "old_email": "vendor@example.com",
  "new_password": "newpassword123"  // 선택사항
}
```

---

### 2. 차량 관리

#### API: GET `/api/vendor/vehicles`
**사용 파일**: `VendorDashboardPageEnhanced.tsx` (Line 340)

**데이터베이스 테이블**: `rentcar_vehicles`

**컬럼**:
```sql
id, vendor_id, vehicle_code, brand, model, year,
display_name, vehicle_class, vehicle_type,
fuel_type, transmission, seating_capacity, door_count,
large_bags, small_bags, thumbnail_url, images, features,
age_requirement, license_requirement,
mileage_limit_per_day (as mileage_limit_km),
unlimited_mileage, deposit_amount_krw, smoking_allowed,
daily_rate_krw, hourly_rate_krw,
weekly_rate_krw (calculated as daily_rate_krw * 6),
monthly_rate_krw (calculated as daily_rate_krw * 25),
excess_mileage_fee_krw, fuel_efficiency,
self_insurance_krw, insurance_options, available_options,
is_active (as is_available), is_featured,
total_bookings, average_rating,
created_at, updated_at
```

**응답 예시**:
```json
{
  "success": true,
  "data": [{
    "id": 123,
    "vendor_id": 165,
    "display_name": "현대 그랜저 2024",
    "vehicle_class": "대형",
    "seating_capacity": 5,
    "transmission_type": "자동",
    "fuel_type": "가솔린",
    "daily_rate_krw": 80000,
    "hourly_rate_krw": 5000,
    "weekly_rate_krw": 480000,
    "monthly_rate_krw": 2000000,
    "mileage_limit_km": 200,
    "excess_mileage_fee_krw": 150,
    "is_available": true,
    "images": ["https://...", "https://..."],
    "insurance_included": true,
    "insurance_options": "자차보험, 대인배상, 대물배상",
    "available_options": "GPS, 블랙박스",
    "pickup_location": "신안군 렌트카 본점",
    "dropoff_location": "신안군 렌트카 본점",
    "min_rental_days": 1,
    "max_rental_days": 30,
    "instant_booking": true
  }]
}
```

#### API: POST `/api/vendor/vehicles`
**사용 파일**: `VendorDashboardPageEnhanced.tsx` (Line 550)

**요청 Body**:
```json
{
  "display_name": "현대 그랜저 2024",
  "vehicle_class": "대형",
  "seating_capacity": 5,
  "transmission_type": "자동",
  "fuel_type": "가솔린",
  "daily_rate_krw": 80000,
  "hourly_rate_krw": 5000,
  "weekly_rate_krw": 480000,
  "monthly_rate_krw": 2000000,
  "mileage_limit_km": 200,
  "excess_mileage_fee_krw": 150,
  "is_available": true,
  "image_urls": ["https://...", "https://..."],
  "insurance_included": true,
  "insurance_options": "자차보험, 대인배상, 대물배상",
  "available_options": "GPS, 블랙박스",
  "pickup_location": "신안군 렌트카 본점",
  "dropoff_location": "신안군 렌트카 본점",
  "min_rental_days": 1,
  "max_rental_days": 30,
  "instant_booking": true
}
```

#### API: PUT `/api/vendor/vehicles`
**사용 파일**: `VendorDashboardPageEnhanced.tsx` (Line 528, 623)

**요청 Body** (수정):
```json
{
  "id": 123,
  "display_name": "현대 그랜저 2024",
  ...  // 전체 필드
}
```

**요청 Body** (가용성 토글):
```json
{
  "id": 123,
  "is_available": false
}
```

#### API: DELETE `/api/vendor/vehicles`
**사용 파일**: `VendorDashboardPageEnhanced.tsx` (Line 594)

**Query Parameter**: `?id=123`

---

### 3. 예약 관리

#### API: GET `/api/vendor/bookings`
**사용 파일**: `VendorDashboardPageEnhanced.tsx` (Line 359)

**데이터베이스 테이블**: `rentcar_bookings`

**컬럼**:
```sql
SELECT
  b.id,
  b.booking_number,
  b.vendor_id,
  b.vehicle_id,
  b.user_id,
  b.pickup_date,
  b.pickup_time,
  b.dropoff_date,
  b.dropoff_time,
  b.total_krw as total_amount,
  b.customer_name,
  b.customer_phone,
  b.customer_email,
  b.status,
  b.created_at,
  v.display_name as vehicle_name
FROM rentcar_bookings b
LEFT JOIN rentcar_vehicles v ON b.vehicle_id = v.id
WHERE b.vendor_id = ?
ORDER BY b.created_at DESC
```

**응답 예시**:
```json
{
  "success": true,
  "data": [{
    "id": 456,
    "booking_number": "RC1729700000",
    "vehicle_id": 123,
    "vehicle_name": "현대 그랜저 2024",
    "customer_name": "홍길동",
    "customer_phone": "010-1234-5678",
    "customer_email": "customer@example.com",
    "pickup_date": "2025-11-01",
    "pickup_time": "10:00",
    "dropoff_date": "2025-11-03",
    "dropoff_time": "18:00",
    "total_amount": 160000,
    "status": "confirmed",
    "created_at": "2025-10-23T12:00:00.000Z"
  }]
}
```

#### API: POST `/api/rentcar/process-return`
**사용 파일**: `VendorDashboardPageEnhanced.tsx` (Line 227)

**요청 Body**:
```json
{
  "booking_id": 456,
  "actual_dropoff_time": "2025-11-03T18:30:00",
  "vendor_note": "정상 반납, 연료 만땅"
}
```

**응답 예시**:
```json
{
  "success": true,
  "message": "반납 처리가 완료되었습니다.",
  "data": {
    "booking_id": 456,
    "booking_number": "RC1729700000",
    "scheduled_dropoff": "2025-11-03T18:00:00.000Z",
    "actual_dropoff": "2025-11-03T18:30:00.000Z",
    "is_late": true,
    "late_minutes": 30,
    "late_fee": 10000,
    "new_total": 170000,
    "status": "completed",
    "next_booking_alert": null  // or {...}
  }
}
```

**지연 수수료 정책**:
- 15분 이내: 무료 (관용)
- 15분 ~ 1시간: ₩10,000
- 1시간 ~ 2시간: ₩20,000
- 2시간 초과: 시간당 요금 × 1.5배 × 지연 시간

---

### 4. 매출 통계

#### API: GET `/api/vendor/revenue`
**사용 파일**: `VendorDashboardPageEnhanced.tsx` (Line 375)

**데이터베이스 쿼리**:
```sql
SELECT
  DATE(b.created_at) as date,
  SUM(b.total_krw) as revenue
FROM rentcar_bookings b
WHERE b.vendor_id = ?
  AND b.status IN ('confirmed', 'completed')
  AND b.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(b.created_at)
ORDER BY date ASC
```

**응답 예시**:
```json
{
  "success": true,
  "data": [
    { "date": "2025-10-17", "revenue": 250000 },
    { "date": "2025-10-18", "revenue": 180000 },
    { "date": "2025-10-19", "revenue": 320000 },
    { "date": "2025-10-20", "revenue": 150000 },
    { "date": "2025-10-21", "revenue": 290000 },
    { "date": "2025-10-22", "revenue": 410000 },
    { "date": "2025-10-23", "revenue": 200000 }
  ]
}
```

---

## 🧪 실제 API 테스트

### Test 1: 업체 정보 조회
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3004/api/vendors
```

### Test 2: 차량 목록 조회
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3004/api/vendor/vehicles
```

### Test 3: 차량 추가
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "테스트 차량 2024",
    "vehicle_class": "중형",
    "seating_capacity": 5,
    "transmission_type": "자동",
    "fuel_type": "가솔린",
    "daily_rate_krw": 60000,
    "hourly_rate_krw": 4000,
    "weekly_rate_krw": 360000,
    "monthly_rate_krw": 1500000,
    "mileage_limit_km": 200,
    "excess_mileage_fee_krw": 100,
    "is_available": true,
    "image_urls": ["https://example.com/car.jpg"],
    "insurance_included": true,
    "insurance_options": "자차보험",
    "available_options": "GPS",
    "pickup_location": "본점",
    "dropoff_location": "본점",
    "min_rental_days": 1,
    "max_rental_days": 30,
    "instant_booking": true
  }' \
  http://localhost:3004/api/vendor/vehicles
```

### Test 4: 예약 목록 조회
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3004/api/vendor/bookings
```

### Test 5: 매출 통계 조회
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3004/api/vendor/revenue
```

### Test 6: 반납 처리
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": 456,
    "actual_dropoff_time": "2025-11-03T18:30:00",
    "vendor_note": "정상 반납"
  }' \
  http://localhost:3004/api/rentcar/process-return
```

---

## 🔍 데이터베이스 검증 쿼리

### 1. 업체 정보 확인
```sql
SELECT * FROM rentcar_vendors WHERE id = 165;
```

### 2. 차량 정보 확인
```sql
SELECT * FROM rentcar_vehicles WHERE vendor_id = 165;
```

### 3. 예약 정보 확인
```sql
SELECT
  b.*,
  v.display_name as vehicle_name
FROM rentcar_bookings b
LEFT JOIN rentcar_vehicles v ON b.vehicle_id = v.id
WHERE b.vendor_id = 165
ORDER BY b.created_at DESC;
```

### 4. 매출 통계 확인
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as booking_count,
  SUM(total_krw) as revenue
FROM rentcar_bookings
WHERE vendor_id = 165
  AND status IN ('confirmed', 'completed')
  AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at)
ORDER BY date ASC;
```

### 5. 지연 반납 확인
```sql
SELECT
  id,
  booking_number,
  customer_name,
  dropoff_date,
  dropoff_time,
  actual_dropoff_time,
  is_late_return,
  late_minutes,
  late_fee_krw,
  total_krw
FROM rentcar_bookings
WHERE vendor_id = 165
  AND is_late_return = 1
ORDER BY created_at DESC;
```

---

## ✅ 체크리스트

### Phase 1: 인증
- [ ] JWT 토큰 생성
- [ ] 벤더 로그인 테스트
- [ ] 토큰 검증 테스트

### Phase 2: 업체 정보
- [ ] GET `/api/vendors` 실행
- [ ] 응답 데이터 검증
- [ ] PUT `/api/vendors` 실행
- [ ] DB에서 변경사항 확인

### Phase 3: 차량 관리
- [ ] GET `/api/vendor/vehicles` 실행
- [ ] POST `/api/vendor/vehicles` 실행 (차량 추가)
- [ ] DB에 차량 추가 확인
- [ ] PUT `/api/vendor/vehicles` 실행 (차량 수정)
- [ ] DB에서 수정 확인
- [ ] PUT `/api/vendor/vehicles` 실행 (가용성 토글)
- [ ] DB에서 is_active 변경 확인
- [ ] DELETE `/api/vendor/vehicles` 실행
- [ ] DB에서 삭제 확인

### Phase 4: 예약 관리
- [ ] GET `/api/vendor/bookings` 실행
- [ ] 예약 목록 응답 검증
- [ ] pickup_time, dropoff_time 포함 확인
- [ ] total_amount 컬럼 확인 (total_krw 매핑)
- [ ] POST `/api/rentcar/process-return` 실행
- [ ] 지연 수수료 계산 확인
- [ ] DB에서 상태 업데이트 확인 (completed)
- [ ] late_fee_krw 추가 확인
- [ ] total_krw 업데이트 확인

### Phase 5: 매출 통계
- [ ] GET `/api/vendor/revenue` 실행
- [ ] 7일 매출 데이터 응답 검증
- [ ] total_krw 컬럼 사용 확인
- [ ] 차트 데이터 형식 확인

### Phase 6: CSV 업로드
- [ ] CSV 템플릿 다운로드
- [ ] CSV 파일 준비
- [ ] 헤더 자동 감지 테스트
- [ ] 대량 차량 등록 테스트
- [ ] 유효성 검증 테스트
- [ ] 에러 처리 테스트

### Phase 7: 요금 설정 시스템
- [ ] GET `/api/vendor/pricing/policies` 실행
- [ ] POST `/api/vendor/pricing/policies` 실행
- [ ] GET `/api/vendor/insurance` 실행
- [ ] POST `/api/vendor/insurance` 실행
- [ ] GET `/api/vendor/options` 실행
- [ ] POST `/api/vendor/options` 실행

---

## 🎯 종합 테스트 시나리오

### 시나리오 1: 신규 벤더 차량 등록부터 예약까지
1. 벤더 로그인
2. 차량 1대 추가
3. 차량 정보 확인 (GET /api/vendor/vehicles)
4. 고객이 예약 생성 (다른 API)
5. 벤더가 예약 확인 (GET /api/vendor/bookings)
6. 차량 반납 처리 (POST /api/rentcar/process-return)
7. 매출 통계 확인 (GET /api/vendor/revenue)

### 시나리오 2: 지연 반납 처리
1. 예약 데이터 준비 (dropoff_date/dropoff_time 설정)
2. 지연된 actual_dropoff_time으로 반납 처리
3. 지연 수수료 계산 확인
4. total_krw 업데이트 확인
5. 다음 예약 알림 확인

### 시나리오 3: CSV 대량 업로드
1. CSV 템플릿 다운로드
2. 10대 차량 데이터 작성
3. CSV 업로드
4. 성공/실패 건수 확인
5. DB에서 차량 확인

---

**작성자**: Claude Code
**상태**: 테스트 대기 중

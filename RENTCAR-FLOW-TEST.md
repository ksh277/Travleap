# 렌트카 예약 전체 플로우 테스트 가이드

## 🎯 테스트 목적
렌트카 예약 시스템의 전체 플로우가 정상 작동하는지 검증

## ✅ 테스트 체크리스트

### 1. 사용자 인증 테스트
- [ ] 로그인 없이 예약 시도 → 로그인 페이지로 리다이렉트
- [ ] 로그인 후 원래 페이지로 복귀 (returnUrl)
- [ ] 로그인한 사용자 정보가 예약에 자동 입력됨

### 2. 차량 검색 및 선택
- [ ] `/rentcar` - 렌트카 목록 페이지 접근
- [ ] 업체별 차량 필터링
- [ ] 차량 클래스별 필터링
- [ ] 가격순/인기순 정렬

### 3. 차량 상세 페이지 (RentcarVehicleDetailPage)
#### 접근
- [ ] `/rentcar/vehicle/{vehicleId}` 접근

#### 날짜/시간 선택
- [ ] 픽업 날짜 선택
- [ ] 픽업 시간 선택 (00:00 ~ 23:00)
- [ ] 반납 날짜 선택
- [ ] 반납 시간 선택
- [ ] 최소 4시간 이상 검증
- [ ] 총 대여 시간 계산 표시
- [ ] 시간당 요금 계산 표시

#### 예약하기 버튼
- [ ] 로그인 체크
- [ ] 날짜 미선택 시 에러 메시지
- [ ] 4시간 미만 시 에러 메시지
- [ ] 가용성 확인 API 호출
- [ ] 예약 생성 API 호출
- [ ] bookingId 받음
- [ ] 결제 페이지로 이동

### 4. 업체 상세 페이지 (RentcarVendorDetailPage)
#### 접근
- [ ] `/rentcar/{vendorId}` 접근

#### 차량 목록 표시
- [ ] 업체의 모든 차량 표시
- [ ] 날짜 선택 시 재고 표시
- [ ] 버퍼 타임(60분) 적용된 가용성 체크
- [ ] 예약 불가 차량 표시

#### 차량 선택 및 예약
- [ ] 차량 선택
- [ ] 날짜/시간 선택
- [ ] 예약 정보 미리보기
- [ ] 로그인 체크
- [ ] 예약 생성
- [ ] 결제 페이지 이동

### 5. 가용성 확인 API
#### 엔드포인트
```
GET /api/rentcar/check-availability
```

#### 파라미터
- `vehicle_id`: 차량 ID
- `pickup_date`: 픽업 날짜 (YYYY-MM-DD)
- `pickup_time`: 픽업 시간 (HH:mm)
- `dropoff_date`: 반납 날짜 (YYYY-MM-DD)
- `dropoff_time`: 반납 시간 (HH:mm)

#### 검증 항목
- [ ] 차량 활성 상태 확인 (`is_active = 1`)
- [ ] 기존 예약과 충돌 여부 확인
- [ ] 버퍼 타임 60분 적용
- [ ] 시간 기반 겹침 체크
- [ ] 충돌 시 이유 반환

### 6. 예약 생성 API
#### 엔드포인트
```
POST /api/rentcar/bookings
```

#### 요청 데이터 (snake_case)
```json
{
  "vendor_id": 165,
  "vehicle_id": 123,
  "user_id": 1,
  "customer_name": "홍길동",
  "customer_email": "hong@example.com",
  "customer_phone": "010-1234-5678",
  "pickup_location_id": 1,
  "dropoff_location_id": 1,
  "pickup_date": "2025-01-15",
  "pickup_time": "10:00",
  "dropoff_date": "2025-01-18",
  "dropoff_time": "18:00",
  "special_requests": ""
}
```

#### 검증 항목
- [ ] 최소 4시간 검증
- [ ] 충돌 감지 (버퍼 타임 포함)
- [ ] 시간 기반 요금 계산
- [ ] booking_number 생성 (`RC{timestamp}`)
- [ ] `status = 'pending'`
- [ ] `payment_status = 'pending'`
- [ ] DB에 저장 (`rentcar_bookings`)

### 7. 결제 페이지 (PaymentPage)
#### 접근
```
/payment?bookingId=123&bookingNumber=RC...&amount=150000&title=차량명&customerName=홍길동&customerEmail=hong@example.com
```

#### 검증 항목
- [ ] bookingId 존재 확인
- [ ] bookingNumber 존재 확인
- [ ] PaymentWidget 표시
- [ ] Toss Payments 위젯 로드
- [ ] 예약 정보 표시
- [ ] 결제 금액 표시

### 8. 결제 성공 페이지 (PaymentSuccessPage)
#### 처리 플로우
1. [ ] Toss Payments 승인 요청
2. [ ] `/api/rentcar/bookings/payment` POST - 결제 정보 저장
3. [ ] `/api/rentcar/bookings/{id}` PUT - 예약 상태 업데이트
   - `booking_status = 'confirmed'`
   - `payment_status = 'completed'`
4. [ ] 차량 예약 불가 처리 (`is_active = 0`)
5. [ ] 마이페이지로 이동

### 9. 벤더 대시보드
#### 예약 목록 조회
```
GET /api/vendor/bookings
```

#### 검증 항목
- [ ] JWT 토큰 인증
- [ ] 벤더 권한 확인
- [ ] vendor_id 조회
- [ ] 예약 목록 반환
  - `pickup_time`, `dropoff_time` 포함 ✅
  - `vehicle_name` 포함
  - `customer_info` 포함
- [ ] `total_krw` 컬럼 사용 ✅

### 10. 관리자 페이지
#### 전체 예약 조회
```
GET /api/admin/rentcar/bookings
```

#### 검증 항목
- [ ] 관리자 권한 확인
- [ ] 모든 예약 조회
- [ ] 차량명 포함 (`vehicle_name`)
- [ ] 업체명 포함 (`vendor_name`)
- [ ] 시간 정보 포함 (`pickup_time`, `dropoff_time`) ✅
- [ ] `dropoff_date` 컬럼 사용 ✅
- [ ] `total_krw` 컬럼 사용 ✅

### 11. 차량 반납 처리 (벤더)
#### 엔드포인트
```
POST /api/rentcar/process-return
```

#### 요청 데이터
```json
{
  "booking_id": 123,
  "actual_dropoff_time": "2025-01-18T18:30:00",
  "vendor_note": "정상 반납"
}
```

#### 검증 항목
- [ ] JWT 인증 (벤더)
- [ ] 예약 정보 조회
- [ ] 예정 시간 vs 실제 시간 비교
- [ ] 지연 수수료 계산
  - 15분 이내: 무료
  - 15분~1시간: ₩10,000
  - 1~2시간: ₩20,000
  - 2시간 초과: 시간당 × 1.5배
- [ ] `status = 'completed'`
- [ ] `total_krw` 업데이트 (지연 수수료 추가)
- [ ] 다음 예약 알림 (필요시)

## 🔧 컬럼명 검증

### ✅ 수정 완료 (6개 파일)
1. `api/vendor/revenue.js` - `total_krw` ✅
2. `pages/api/vendor/revenue.js` - `total_krw` ✅
3. `pages/api/vendor/bookings.js` - `total_krw` ✅
4. `api/vendor/bookings.js` - `total_krw` ✅
5. `api/rentcars/[vendorId]/bookings.js` - `dropoff_date` ✅
6. `pages/api/admin/rentcar/bookings.js` - `dropoff_date`, `total_krw` ✅

### 정확한 컬럼명
- ✅ `total_krw` (NOT `total_amount_krw`, `total_price_krw`)
- ✅ `dropoff_date` (NOT `return_date`)
- ✅ `dropoff_time` (NOT `return_time`)
- ✅ `pickup_date`, `pickup_time`

## 📝 데이터 형식

### snake_case 사용 (백엔드 API)
```javascript
{
  vendor_id: 165,
  vehicle_id: 123,
  pickup_date: "2025-01-15",
  pickup_time: "10:00",
  dropoff_date: "2025-01-18",
  dropoff_time: "18:00",
  customer_name: "홍길동",
  customer_email: "hong@example.com",
  customer_phone: "010-1234-5678"
}
```

### 프론트엔드 → 백엔드 변환
- ❌ `pickupTime` → ✅ `pickup_time`
- ❌ `returnDate` → ✅ `dropoff_date`
- ❌ `returnTime` → ✅ `dropoff_time`

## 🎉 사용자 인증 연동

### useAuth 훅 사용
```typescript
import { useAuth } from '../../hooks/useAuth';

const { user, isLoggedIn } = useAuth();

// 로그인 체크
if (!isLoggedIn || !user) {
  toast.error('로그인이 필요한 서비스입니다');
  navigate('/login', { state: { returnUrl: currentPath } });
  return;
}

// 실제 사용자 정보 사용
const bookingPayload = {
  user_id: user.id,
  customer_name: user.name,
  customer_email: user.email,
  customer_phone: user.phone || '',
  // ...
};
```

## 🚨 에러 케이스

### 1. 로그인 안함
- [ ] "로그인이 필요한 서비스입니다"
- [ ] 로그인 페이지로 리다이렉트
- [ ] returnUrl 저장

### 2. 날짜 미선택
- [ ] "대여/반납 날짜를 선택해주세요"

### 3. 최소 시간 미달
- [ ] "최소 4시간 이상 대여 가능합니다"

### 4. 차량 미선택 (업체 페이지)
- [ ] "차량을 선택해주세요"

### 5. 예약 충돌
- [ ] "선택하신 날짜/시간에 이미 예약이 있습니다"
- [ ] 버퍼 타임 60분 안내

### 6. 차량 비활성
- [ ] "차량이 현재 예약 불가 상태입니다"

### 7. API 오류
- [ ] "예약 생성에 실패했습니다"
- [ ] "예약 처리 중 오류가 발생했습니다"

## 📊 통합 테스트 순서

1. ✅ 로그인
2. ✅ 차량 검색/목록
3. ✅ 차량 상세 페이지 접근
4. ✅ 날짜/시간 선택
5. ✅ 가용성 확인
6. ✅ 예약 생성
7. ✅ 결제 페이지 이동
8. ✅ 결제 진행
9. ✅ 예약 확정
10. ✅ 벤더 대시보드 확인
11. ✅ 관리자 페이지 확인
12. ✅ 차량 반납 처리

## 🛠 개발자 도구

### 콘솔 명령어
```javascript
// 현재 인증 상태 확인
window.globalAuthState

// 토큰 확인
document.cookie

// 예약 생성 테스트
fetch('/api/rentcar/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ /* ... */ })
})
```

### 데이터베이스 쿼리
```sql
-- 예약 확인
SELECT * FROM rentcar_bookings WHERE id = 123;

-- 차량 상태 확인
SELECT id, display_name, is_active FROM rentcar_vehicles WHERE id = 123;

-- 충돌 감지 테스트
SELECT * FROM rentcar_bookings
WHERE vehicle_id = 123
  AND status NOT IN ('cancelled', 'failed')
  AND pickup_date <= '2025-01-18'
  AND dropoff_date >= '2025-01-15';
```

## ✅ 최종 검증 완료
- [x] 데이터베이스 컬럼명 통일
- [x] 프론트엔드→백엔드 데이터 형식 통일
- [x] 사용자 인증 연동
- [x] 예약 생성 플로우 완성
- [x] 결제 연동
- [x] 에러 처리
- [x] 빌드 성공

날짜: 2025-10-23
상태: 완료 ✅

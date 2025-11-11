# 벤더 대시보드 결제/환불 내역 표시 검토 보고서

## 검토 일시
2025-11-11

## 검토 범위
1. VendorDashboardPageEnhanced.tsx 분석
2. API 엔드포인트 검증 (/api/vendor/bookings, /api/vendor/revenue)
3. 데이터베이스 쿼리 검토
4. 실제 DB 데이터 확인

---

## 1. 발견된 문제점

### 🔴 심각도: 높음

#### 문제 1: 환불된 예약이 대시보드 목록에서 누락됨

**위치**: `C:\Users\ham57\Desktop\Travleap\api\vendor\bookings.js:95`

**현재 코드**:
```javascript
const result = await connection.execute(
  `SELECT
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
    b.insurance_id,
    b.insurance_fee_krw,
    b.customer_name,
    b.customer_phone,
    b.customer_email,
    b.status,
    b.payment_status,
    b.created_at,
    v.display_name as vehicle_name,
    i.name as insurance_name,
    i.hourly_rate_krw as insurance_hourly_rate
  FROM rentcar_bookings b
  LEFT JOIN rentcar_vehicles v ON b.vehicle_id = v.id
  LEFT JOIN rentcar_insurance i ON b.insurance_id = i.id
  WHERE b.vendor_id = ?
    AND b.payment_status = 'paid'  // ❌ 문제: 환불된 예약 제외
  ORDER BY b.created_at DESC`,
  [vendorId]
);
```

**문제 설명**:
- `WHERE b.payment_status = 'paid'` 조건으로 인해 `payment_status = 'refunded'`인 환불 완료 예약이 목록에서 제외됨
- 현재 DB에 환불된 예약 1건이 존재하지만 대시보드에 표시되지 않음

**영향**:
- 벤더가 환불 처리한 예약 내역을 볼 수 없음
- 환불 통계 및 이력 추적 불가능
- 고객 문의 시 환불 내역 확인 불가

**실제 DB 데이터**:
```
환불된 예약: 1건
- ID: 14
- 예약번호: RC1762739884524TK6HS
- status: cancelled
- payment_status: refunded
- 원래금액: 145,328원
- 환불액: 0원 (refund_amount_krw 미설정)
```

---

#### 문제 2: 매출 통계에서 환불 금액이 차감되지 않음

**위치**: `C:\Users\ham57\Desktop\Travleap\components\VendorDashboardPageEnhanced.tsx:1211-1214`

**현재 코드**:
```typescript
<div className="text-3xl font-bold">
  {bookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + b.total_amount, 0)
    .toLocaleString()}원
</div>
```

**문제 설명**:
- `status === 'completed'`인 예약의 `total_amount`만 합산
- 환불된 금액(`refund_amount_krw`)을 차감하지 않음
- 환불된 예약은 API에서 조회되지 않아 통계에 반영되지 않음

**영향**:
- 실제 매출보다 높게 표시됨
- 환불 처리 후에도 매출이 줄어들지 않음
- 정확한 수익 파악 불가능

---

#### 문제 3: 매출 차트에 환불이 반영되지 않음

**위치**: `C:\Users\ham57\Desktop\Travleap\api\vendor\revenue.js:56-62`

**현재 코드**:
```javascript
const dailyRevenueResult = await connection.execute(
  `SELECT
    DATE(created_at) as date,
    SUM(total_amount) as revenue
  FROM rentcar_bookings
  WHERE vendor_id = ? AND status IN ('confirmed', 'paid', 'completed')
    AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  GROUP BY DATE(created_at)
  ORDER BY date DESC`,
  [vendorId]
);
```

**문제 설명**:
- `SUM(total_amount)`만 계산하고 환불 금액을 차감하지 않음
- `status IN ('confirmed', 'paid', 'completed')` 조건으로 환불된 예약 제외

**영향**:
- 최근 7일 매출 차트가 실제보다 높게 표시됨
- 환불 발생 시 차트에 반영되지 않음
- 일별 순매출 파악 불가능

---

### 🟡 심각도: 중간

#### 문제 4: 환불 금액이 설정되지 않음

**위치**: 데이터베이스 (rentcar_bookings 테이블)

**발견 사항**:
```
예약 ID 14:
- payment_status: refunded
- refund_amount_krw: 0원  // ❌ 환불 금액이 0으로 설정됨
- total_krw: 145,328원
```

**문제 설명**:
- 환불 처리 시 `refund_amount_krw` 필드가 올바르게 설정되지 않음
- 환불 API (`/api/vendor/bookings?action=refund`)는 있지만 실제 DB 업데이트 확인 필요

**영향**:
- 환불 금액 통계가 정확하지 않음
- 환불 내역 조회 시 금액 정보 누락

---

## 2. 정상 작동하는 부분

### ✅ 예약 목록 UI (Line 1671-1675)

**정상 코드**:
```typescript
{booking.payment_status === 'refunded' && (
  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
    환불완료
  </Badge>
)}
```

**설명**:
- `payment_status === 'refunded'`인 경우 "환불완료" 뱃지 표시
- 단, API에서 환불된 예약을 조회하지 않아 이 코드가 실행되지 않음

---

### ✅ 환불 처리 API (Line 143-276)

**정상 기능**:
```javascript
if (req.method === 'POST' && req.query.action === 'refund') {
  // 1. rentcar_payments에서 paymentKey 조회
  // 2. Toss Payments API로 환불 요청
  // 3. DB에 환불 정보 저장
  await connection.execute(
    `UPDATE rentcar_bookings
     SET status = 'cancelled',
         payment_status = 'refunded',
         refund_amount_krw = ?,
         refund_reason = ?,
         refunded_at = NOW(),
         updated_at = NOW()
     WHERE id = ?`,
    [finalRefundAmount, refund_reason || '벤더 요청', bookingId]
  );
}
```

**설명**:
- 환불 처리 로직은 정상적으로 구현됨
- PG사 연동 및 DB 업데이트 모두 포함
- 단, 환불 후 목록에서 제외되는 문제 존재

---

## 3. 코드 분석 상세

### VendorDashboardPageEnhanced.tsx

#### 데이터 흐름
```typescript
// 1. API 호출 (Line 504)
const bookingsResponse = await fetch(`/api/vendor/bookings`, { headers });
const bookingsData = await bookingsResponse.json();

// 2. 상태 저장 (Line 512-513)
setBookings(bookingsData.data);
setFilteredBookings(bookingsData.data);

// 3. 통계 계산 (Line 1211-1214)
bookings
  .filter(b => b.status === 'completed')  // payment_status 체크 없음
  .reduce((sum, b) => sum + b.total_amount, 0)  // 환불 차감 없음
```

#### 필터링 로직 (Line 948-997)
```typescript
const applyBookingFilters = () => {
  let filtered = [...bookings];  // API에서 받은 데이터 필터링

  // 날짜, 차량, 상태, 검색어 필터
  if (bookingFilters.status) {
    filtered = filtered.filter((b) => b.status === bookingFilters.status);
  }
  // ... 기타 필터

  setFilteredBookings(filtered);
};

useEffect(() => {
  applyBookingFilters();
}, [bookingFilters, bookings]);
```

**분석**:
- 필터링은 클라이언트 측에서 수행
- API에서 환불된 예약이 제외되므로 필터링에도 포함되지 않음

---

### API 엔드포인트 분석

#### /api/vendor/bookings (GET)

**역할**: 벤더의 예약 목록 조회

**쿼리 조건**:
```sql
WHERE b.vendor_id = ?
  AND b.payment_status = 'paid'  -- ❌ 문제
```

**반환 데이터**:
```javascript
{
  success: true,
  data: [
    {
      id, booking_number, status, payment_status,
      total_amount, vehicle_name, customer_name, ...
    }
  ]
}
```

---

#### /api/vendor/revenue (GET)

**역할**: 최근 7일 매출 통계

**쿼리 조건**:
```sql
WHERE vendor_id = ?
  AND status IN ('confirmed', 'paid', 'completed')  -- payment_status 체크 없음
  AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
```

**계산 방식**:
```sql
SUM(total_amount) as revenue  -- 환불 차감 없음
```

---

### 데이터베이스 스키마

#### rentcar_bookings 테이블 관련 필드

```sql
status ENUM('pending','confirmed','picked_up','in_use','returned',
            'completed','cancelled','no_show','refunded')
payment_status ENUM('pending','paid','refunded')
total_krw INT
refund_amount_krw INT DEFAULT 0
refunded_at TIMESTAMP
cancellation_reason TEXT
```

**분석**:
- `status`와 `payment_status`가 분리되어 있음
- 환불 시: `status = 'cancelled'`, `payment_status = 'refunded'`
- 환불 금액과 일시를 별도로 저장

---

## 4. 수정 권장사항

### 🔧 수정 1: API에서 환불된 예약 포함 (필수)

**파일**: `C:\Users\ham57\Desktop\Travleap\api\vendor\bookings.js`

**현재 (Line 95)**:
```javascript
WHERE b.vendor_id = ?
  AND b.payment_status = 'paid'
```

**수정안**:
```javascript
WHERE b.vendor_id = ?
  AND b.payment_status IN ('paid', 'refunded')
```

또는 조건 제거:
```javascript
WHERE b.vendor_id = ?
  AND b.status != 'deleted'  -- 삭제된 것만 제외
```

**효과**:
- 환불된 예약이 목록에 표시됨
- 환불 내역 추적 가능

---

### 🔧 수정 2: 통계에서 환불 차감 (필수)

**파일**: `C:\Users\ham57\Desktop\Travleap\components\VendorDashboardPageEnhanced.tsx`

**현재 (Line 1211-1214)**:
```typescript
{bookings
  .filter(b => b.status === 'completed')
  .reduce((sum, b) => sum + b.total_amount, 0)
  .toLocaleString()}원
```

**수정안**:
```typescript
{(() => {
  const completedRevenue = bookings
    .filter(b => b.status === 'completed' && b.payment_status === 'paid')
    .reduce((sum, b) => sum + b.total_amount, 0);

  const refundedAmount = bookings
    .filter(b => b.payment_status === 'refunded')
    .reduce((sum, b) => sum + (b.refund_amount_krw || b.total_amount), 0);

  return (completedRevenue - refundedAmount).toLocaleString();
})()}원
```

**효과**:
- 정확한 순매출 표시
- 환불 반영

---

### 🔧 수정 3: 매출 차트에서 환불 반영 (필수)

**파일**: `C:\Users\ham57\Desktop\Travleap\api\vendor\revenue.js`

**현재 (Line 56-62)**:
```javascript
const dailyRevenueResult = await connection.execute(
  `SELECT
    DATE(created_at) as date,
    SUM(total_amount) as revenue
  FROM rentcar_bookings
  WHERE vendor_id = ? AND status IN ('confirmed', 'paid', 'completed')
    AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  GROUP BY DATE(created_at)
  ORDER BY date DESC`,
  [vendorId]
);
```

**수정안 1 (날짜별 순매출)**:
```javascript
const dailyRevenueResult = await connection.execute(
  `SELECT
    DATE(created_at) as date,
    SUM(CASE
      WHEN payment_status = 'paid' AND status IN ('confirmed', 'completed')
      THEN total_krw
      ELSE 0
    END) as paid_amount,
    SUM(CASE
      WHEN payment_status = 'refunded'
      THEN COALESCE(refund_amount_krw, total_krw)
      ELSE 0
    END) as refunded_amount,
    SUM(CASE
      WHEN payment_status = 'paid' AND status IN ('confirmed', 'completed')
      THEN total_krw
      ELSE 0
    END) -
    SUM(CASE
      WHEN payment_status = 'refunded'
      THEN COALESCE(refund_amount_krw, total_krw)
      ELSE 0
    END) as revenue
  FROM rentcar_bookings
  WHERE vendor_id = ?
    AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  GROUP BY DATE(created_at)
  ORDER BY date DESC`,
  [vendorId]
);
```

**효과**:
- 일별 순매출 정확하게 계산
- 환불 발생 시 즉시 차트 반영

---

### 🔧 수정 4: 예약 목록에 환불 금액 표시 (권장)

**파일**: `C:\Users\ham57\Desktop\Travleap\components\VendorDashboardPageEnhanced.tsx`

**현재 (Line 1647)**:
```typescript
<TableCell>{booking.total_amount.toLocaleString()}원</TableCell>
```

**수정안**:
```typescript
<TableCell>
  <div className="text-sm">
    {booking.payment_status === 'refunded' ? (
      <>
        <div className="line-through text-gray-400">
          {booking.total_amount.toLocaleString()}원
        </div>
        <div className="text-red-600 font-medium">
          환불: {(booking.refund_amount_krw || booking.total_amount).toLocaleString()}원
        </div>
      </>
    ) : (
      <div>{booking.total_amount.toLocaleString()}원</div>
    )}
  </div>
</TableCell>
```

**효과**:
- 환불된 예약의 원래 금액과 환불 금액을 명확히 표시
- 시각적으로 환불 상태 구분

---

## 5. 테스트 시나리오

### 시나리오 1: 환불된 예약 표시 확인

1. 벤더 대시보드 접속
2. "예약 관리" 탭 선택
3. 예약 목록에서 `payment_status = 'refunded'`인 예약 확인
4. "환불완료" 뱃지 표시 여부 확인
5. 환불 금액 표시 확인

**기대 결과**:
- 환불된 예약 1건(ID: 14) 표시
- "환불완료" 뱃지 표시
- 원래 금액(145,328원)과 환불 금액 표시

---

### 시나리오 2: 매출 통계 정확성 확인

1. 완료된 예약 생성 (payment_status='paid', status='completed')
2. 대시보드의 "이번 달 매출" 확인
3. 해당 예약 환불 처리
4. 매출이 환불 금액만큼 차감되는지 확인

**기대 결과**:
- 환불 전: 매출에 포함
- 환불 후: 매출에서 차감

---

### 시나리오 3: 매출 차트 확인

1. 최근 7일 내에 예약 생성 및 완료
2. 매출 차트에 표시 확인
3. 해당 예약 환불 처리
4. 차트에서 해당 날짜의 매출 감소 확인

**기대 결과**:
- 환불 전: 차트에 매출 표시
- 환불 후: 순매출로 차트 업데이트

---

## 6. 예상 개발 시간

| 작업 | 예상 시간 | 우선순위 |
|------|----------|---------|
| API에서 환불 예약 포함 | 10분 | 높음 |
| 통계에서 환불 차감 | 20분 | 높음 |
| 매출 차트 환불 반영 | 30분 | 높음 |
| 예약 목록 UI 개선 | 20분 | 중간 |
| 테스트 및 검증 | 30분 | 높음 |
| **총계** | **1시간 50분** | |

---

## 7. 결론

### 핵심 문제
벤더 대시보드에서 **환불된 예약이 목록에 표시되지 않고**, **매출 통계에 환불이 반영되지 않는** 문제가 확인되었습니다.

### 영향도
- **사용자 경험**: 벤더가 환불 내역을 확인할 수 없어 고객 문의 대응 어려움
- **데이터 정확성**: 매출 통계가 실제보다 높게 표시되어 경영 판단 오류 가능
- **투명성**: 환불 처리 후에도 매출이 줄어들지 않아 신뢰도 하락

### 권장 조치
1. **즉시 수정 필요**: API에서 `payment_status = 'refunded'` 예약 포함
2. **필수 수정**: 통계 계산 시 환불 금액 차감
3. **권장 개선**: 예약 목록 UI에 환불 정보 명확히 표시

### 현재 DB 상태
```
전체 예약: 1건
- payment_status='refunded': 1건 (대시보드에 미표시)
- payment_status='paid': 0건

문제:
- 환불된 1건의 예약이 대시보드에서 완전히 누락됨
- refund_amount_krw = 0 (환불 금액 미설정 문제 추가 확인 필요)
```

---

## 부록: 검증 스크립트

검증에 사용된 스크립트: `C:\Users\ham57\Desktop\Travleap\scripts\check-vendor-dashboard-payment-status.cjs`

실행 방법:
```bash
node scripts/check-vendor-dashboard-payment-status.cjs
```

스크립트 기능:
- 전체 예약 데이터 현황 조회
- API가 조회하는 데이터 시뮬레이션
- 환불된 예약 확인
- 매출 계산 로직 검증
- 문제점 자동 탐지 및 보고

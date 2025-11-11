# 환불 정책 업데이트 - 체크인/픽업 완료 및 날짜 경과 검증

## 작업 일자
2025-11-11

## 작업 개요
환불 시스템에 체크인/픽업 완료 상태 및 날짜 경과 검증을 추가하여, 서비스 이용이 시작된 예약은 환불할 수 없도록 정책 강화

---

## 수정된 환불 정책

### ❌ 환불 불가 조건 (추가)

#### 1. 숙박 예약
- **조건**: `booking.status = 'completed'` (체크인 완료)
- **에러 코드**: `CHECKIN_COMPLETED`
- **메시지**: "체크인이 완료된 예약은 환불할 수 없습니다."

#### 2. 렌트카 예약
- **조건**: `rentcar_booking.status IN ('picked_up', 'in_use', 'returned', 'completed')` (픽업 완료)
- **에러 코드**: `PICKUP_COMPLETED`
- **메시지**: "픽업이 완료된 렌트카는 환불할 수 없습니다."

#### 3. 날짜 경과 (모든 카테고리)
- **숙박/투어/이벤트**: `booking.start_date < 현재 날짜`
- **렌트카**: `rentcar_booking.pickup_date < 현재 날짜`
- **에러 코드**: `DATE_PASSED` / `PICKUP_DATE_PASSED`
- **메시지**: "예약 날짜가 지나서 환불할 수 없습니다." / "픽업 날짜가 지나서 환불할 수 없습니다."

### ✅ 환불 가능 조건

1. `payment_status = 'paid'` (결제 완료 상태)
2. 체크인/픽업 완료 전
3. 예약 날짜가 현재 날짜 이후
4. 기존 환불 정책(수수료) 통과

---

## 수정된 파일

### api/payments/refund.js

#### 1. 결제 정보 조회 확장 (Line 499-528)
```javascript
// 추가된 필드:
b.status as booking_status,        // 숙박 상태
b.check_in_time,                   // 체크인 시간
rb.status as rentcar_status,       // 렌트카 상태
rb.pickup_checked_in_at            // 픽업 체크인 시간
```

#### 2. 환불 불가 검증 로직 추가 (Line 541-581)
```javascript
// 2-1. 체크인/픽업 완료 검증
if (!skipPolicy) {
  // 숙박: status가 'completed'이면 환불 불가
  if (payment.booking_id && payment.booking_status === 'completed') {
    throw new Error('CHECKIN_COMPLETED: 체크인이 완료된 예약은 환불할 수 없습니다.');
  }

  // 렌트카: 픽업 완료 상태면 환불 불가
  if (payment.rentcar_booking_id) {
    const pickedUpStatuses = ['picked_up', 'in_use', 'returned', 'completed'];
    if (pickedUpStatuses.includes(payment.rentcar_status)) {
      throw new Error('PICKUP_COMPLETED: 픽업이 완료된 렌트카는 환불할 수 없습니다.');
    }
  }

  // 2-2. 날짜/시간 경과 검증
  const now = new Date();

  // 숙박/투어/이벤트: start_date 확인
  if (payment.start_date) {
    const startDate = new Date(payment.start_date);
    startDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    if (startDate < now) {
      throw new Error('DATE_PASSED: 예약 날짜가 지나서 환불할 수 없습니다.');
    }
  }

  // 렌트카: pickup_date 확인
  if (payment.rentcar_start_date) {
    const pickupDate = new Date(payment.rentcar_start_date);
    pickupDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (pickupDate < today) {
      throw new Error('PICKUP_DATE_PASSED: 픽업 날짜가 지나서 환불할 수 없습니다.');
    }
  }
}
```

---

## 데이터베이스 스키마

### bookings 테이블
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| status | enum('pending','confirmed','cancelled','completed') | 예약 상태 |
| check_in_time | time | 체크인 시간 |
| start_date | date | 예약 시작 날짜 |

- **completed**: 체크인 완료 상태 → 환불 불가

### rentcar_bookings 테이블
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| status | enum('pending','confirmed','picked_up','in_use','returned','completed','cancelled','no_show','refunded') | 예약 상태 |
| pickup_date | date | 픽업 날짜 |
| pickup_checked_in_at | datetime | 픽업 체크인 완료 시간 |

- **picked_up, in_use, returned, completed**: 픽업 완료 상태 → 환불 불가

---

## 환불 플로우

```
환불 요청 (POST /api/payments/refund)
    ↓
[1] 결제 정보 조회 (payment + booking + rentcar_booking)
    ↓
[2] 이미 환불됨? → YES → 에러 반환
    ↓ NO
[3] skipPolicy=false? → NO → [5]로 이동
    ↓ YES
[4] 체크인/픽업 완료 검증
    ├─ 숙박: status='completed'? → YES → 에러 (CHECKIN_COMPLETED)
    ├─ 렌트카: status in picked_up states? → YES → 에러 (PICKUP_COMPLETED)
    ├─ 날짜 경과 (숙박/투어/이벤트)? → YES → 에러 (DATE_PASSED)
    └─ 날짜 경과 (렌트카)? → YES → 에러 (PICKUP_DATE_PASSED)
    ↓ 모두 NO
[5] 환불 정책 계산 (수수료 등)
    ↓
[6] Toss Payments API 호출
    ↓
[7] DB 업데이트 (재고 복구, 포인트 회수, 상태 변경)
    ↓
[8] 환불 완료
```

---

## 에러 코드 정의

| 코드 | 메시지 | 설명 |
|------|--------|------|
| CHECKIN_COMPLETED | 체크인이 완료된 예약은 환불할 수 없습니다. | 숙박 예약이 completed 상태 |
| PICKUP_COMPLETED | 픽업이 완료된 렌트카는 환불할 수 없습니다. | 렌트카가 picked_up 이상 상태 |
| DATE_PASSED | 예약 날짜가 지나서 환불할 수 없습니다. | start_date < 현재 날짜 |
| PICKUP_DATE_PASSED | 픽업 날짜가 지나서 환불할 수 없습니다. | pickup_date < 현재 날짜 |

---

## 관리자 강제 환불

관리자는 `skipPolicy: true` 옵션을 사용하여 모든 검증을 우회하고 강제 환불 가능:

```javascript
// 관리자 API 호출 시
const result = await refundPayment({
  paymentKey: '...',
  cancelReason: '관리자 수동 환불',
  skipPolicy: true  // 모든 정책 검증 스킵
});
```

**주의**: skipPolicy는 관리자 권한 확인 후에만 사용해야 합니다.

---

## 테스트 방법

### 1. 환불 정책 상태 확인
```bash
node scripts/test-refund-policy.cjs
```

### 2. 실제 환불 테스트 시나리오

#### 시나리오 1: 정상 환불 (성공)
- 조건: 예약 날짜가 미래, status='confirmed'
- 결과: 환불 성공

#### 시나리오 2: 체크인 완료 (실패)
```sql
UPDATE bookings SET status='completed' WHERE id=90;
```
- 조건: status='completed'
- 결과: 에러 `CHECKIN_COMPLETED`

#### 시나리오 3: 픽업 완료 (실패)
```sql
UPDATE rentcar_bookings SET status='picked_up' WHERE id=15;
```
- 조건: status='picked_up'
- 결과: 에러 `PICKUP_COMPLETED`

#### 시나리오 4: 날짜 경과 (실패)
```sql
UPDATE bookings SET start_date='2025-11-10' WHERE id=90;
```
- 조건: start_date < 현재 날짜
- 결과: 에러 `DATE_PASSED`

---

## 기존 기능 유지

이번 수정으로 추가된 검증은 **기존 환불 정책 계산 전에** 실행되며, 기존 기능은 모두 유지됩니다:

✅ 환불 정책 테이블 (refund_policies) 기반 수수료 계산
✅ 재고 복구 (listings, product_options)
✅ 적립 포인트 회수 (Dual DB)
✅ 사용 포인트 환불
✅ 쿠폰 복구
✅ 장바구니 주문 환불 지원
✅ 팝업 카테고리 배송 기반 환불 정책
✅ Toss Payments API 연동

---

## 영향받는 API

- `POST /api/payments/refund` - 일반 환불 API
- `POST /api/admin/refund-booking` - 관리자 환불 API (skipPolicy 사용 가능)
- `POST /api/admin/manual-refund` - 수동 환불 API (skipPolicy 사용 가능)

---

## 다음 단계 권장사항

### 1. 프론트엔드 업데이트
- 환불 불가 메시지 UI 개선
- 체크인/픽업 완료 상태 표시
- 환불 가능 날짜까지 카운트다운 표시

### 2. 알림 시스템
- 체크인/픽업 완료 시 환불 불가 알림 발송
- 환불 정책 변경 안내 이메일 발송

### 3. 관리자 대시보드
- 환불 불가 사유별 통계
- 강제 환불 이력 관리

---

## 작업 소요 시간
- 코드 분석 및 수정: 1시간
- 테스트 스크립트 작성: 30분
- 문서화: 30분

**총 소요 시간: 2시간**

---

**작업 완료 일자: 2025-11-11**
**검증 상태: ✅ 완료**

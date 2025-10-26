# 렌트카 정산 리포트 구조 (6-Column Structure)

## 목적

보증금과 실제 매출을 구분하여 정확한 회계 처리 및 정산 리포트 제공

---

## 핵심 원칙

### 1. 보증금은 매출이 아님 (Deposit ≠ Revenue)

- **보증금 (Deposit)**: 일시적으로 예치한 금액 (부채 계정)
- **매출 (Revenue)**: 실제로 발생한 수익 (수익 계정)

### 2. 보증금은 반환되거나 추가 비용으로 전환됨

- **전액 환불**: 보증금 전액 반환 → 부채 감소
- **부분 환불**: 일부는 반환, 일부는 추가 비용으로 전환 → 부채 감소 + 매출 증가
- **전액 차감**: 보증금 전액이 추가 비용으로 전환 → 부채 감소 + 매출 증가

---

## 6-Column Settlement Report 구조

### 컬럼 정의

| # | 컬럼명 | 설명 | 회계 구분 | 예시 |
|---|--------|------|----------|------|
| 1 | **Rental Revenue** | 렌탈 기본 요금 (대여 요금) | 매출 (Revenue) | 264,000원 (3일 대여) |
| 2 | **Deposit Collected** | 수집된 보증금 (사전승인) | 부채 (Liability) | 100,000원 |
| 3 | **Deposit Refunded** | 환불된 보증금 | 부채 감소 | 84,000원 (정상 반납 시 부분 환불) |
| 4 | **Deposit Converted to Revenue** | 보증금에서 매출로 전환된 금액 (추가 비용) | 부채 감소 + 매출 증가 | 16,000원 (연착료 6,000원 + 연료비 10,000원) |
| 5 | **Additional Revenue** | 추가 매출 (보증금 외 추가 결제) | 매출 (Revenue) | 50,000원 (추가 손상비) |
| 6 | **Total Revenue** | 총 매출 (컬럼 1 + 4 + 5) | 매출 (Revenue) | 330,000원 |

---

## 시나리오별 예시

### 시나리오 1: 정상 반납 (추가 비용 없음)

| 항목 | 금액 | 설명 |
|------|------|------|
| **Rental Revenue** | 264,000원 | 3일 렌탈 요금 |
| **Deposit Collected** | 100,000원 | 보증금 사전승인 |
| **Deposit Refunded** | 100,000원 | 전액 환불 |
| **Deposit Converted to Revenue** | 0원 | 추가 비용 없음 |
| **Additional Revenue** | 0원 | 추가 결제 없음 |
| **Total Revenue** | **264,000원** | 렌탈 요금만 |

**회계 처리:**
- 매출: 264,000원 (렌탈 요금)
- 부채: 0원 (보증금 전액 환불)

---

### 시나리오 2: 추가 비용 발생 (보증금 범위 내)

| 항목 | 금액 | 설명 |
|------|------|------|
| **Rental Revenue** | 264,000원 | 3일 렌탈 요금 |
| **Deposit Collected** | 100,000원 | 보증금 사전승인 |
| **Deposit Refunded** | 84,000원 | 부분 환불 (100,000 - 16,000) |
| **Deposit Converted to Revenue** | 16,000원 | 연착료 6,000 + 연료비 10,000 |
| **Additional Revenue** | 0원 | 추가 결제 없음 |
| **Total Revenue** | **280,000원** | 렌탈 + 추가 비용 |

**회계 처리:**
- 매출: 280,000원 (렌탈 264,000 + 추가 비용 16,000)
- 부채: 0원 (보증금 84,000 환불, 16,000 매출 전환)

---

### 시나리오 3: 추가 비용 > 보증금 (추가 결제 필요)

| 항목 | 금액 | 설명 |
|------|------|------|
| **Rental Revenue** | 264,000원 | 3일 렌탈 요금 |
| **Deposit Collected** | 100,000원 | 보증금 사전승인 |
| **Deposit Refunded** | 0원 | 환불 없음 (전액 차감) |
| **Deposit Converted to Revenue** | 100,000원 | 보증금 전액 매출 전환 |
| **Additional Revenue** | 50,000원 | 추가 결제 (150,000 - 100,000) |
| **Total Revenue** | **414,000원** | 렌탈 + 보증금 전환 + 추가 결제 |

**회계 처리:**
- 매출: 414,000원 (렌탈 264,000 + 추가 비용 150,000)
- 부채: 0원 (보증금 100,000 전액 매출 전환)
- 추가 결제: 50,000원 (고객에게 청구)

---

## API Response 구조

### GET /api/rentcar/vendor/settlement-report?start_date=2025-10-01&end_date=2025-10-31

```json
{
  "success": true,
  "data": {
    "period": {
      "start_date": "2025-10-01",
      "end_date": "2025-10-31"
    },
    "summary": {
      "total_rental_revenue": 5280000,
      "total_deposit_collected": 2000000,
      "total_deposit_refunded": 1720000,
      "total_deposit_converted_to_revenue": 280000,
      "total_additional_revenue": 120000,
      "total_revenue": 5680000
    },
    "bookings": [
      {
        "booking_number": "RC-20251015-ABCD1234",
        "customer_name": "홍길동",
        "vehicle_name": "현대 아반떼",
        "pickup_at": "2025-10-15 10:00:00",
        "return_at": "2025-10-18 18:00:00",
        "rental_revenue": 264000,
        "deposit_collected": 100000,
        "deposit_refunded": 84000,
        "deposit_converted_to_revenue": 16000,
        "additional_revenue": 0,
        "total_revenue": 280000,
        "additional_costs": {
          "late_return_fee": 6000,
          "fuel_deficit_fee": 10000,
          "damage_fee": 0
        }
      }
    ],
    "count": 20
  }
}
```

---

## SQL 쿼리 예시

### 정산 리포트 데이터 조회

```sql
SELECT
  b.booking_number,
  b.customer_name,
  v.display_name AS vehicle_name,
  b.pickup_at_utc,
  b.return_at_utc,

  -- 1. Rental Revenue (렌탈 기본 요금)
  b.total_price_krw AS rental_revenue,

  -- 2. Deposit Collected (수집된 보증금)
  COALESCE(d.deposit_amount_krw, 0) AS deposit_collected,

  -- 3. Deposit Refunded (환불된 보증금)
  COALESCE(d.refunded_amount_krw, 0) AS deposit_refunded,

  -- 4. Deposit Converted to Revenue (보증금에서 매출로 전환)
  CASE
    WHEN d.status IN ('captured', 'partial_refunded') THEN
      COALESCE(d.deposit_amount_krw, 0) - COALESCE(d.refunded_amount_krw, 0)
    ELSE 0
  END AS deposit_converted_to_revenue,

  -- 5. Additional Revenue (추가 결제)
  COALESCE(
    (SELECT SUM(amount_krw)
     FROM rentcar_rental_payments
     WHERE rental_id = b.id
       AND payment_type = 'additional'
       AND status = 'approved'),
    0
  ) AS additional_revenue,

  -- 6. Total Revenue
  b.total_price_krw +
  CASE
    WHEN d.status IN ('captured', 'partial_refunded') THEN
      COALESCE(d.deposit_amount_krw, 0) - COALESCE(d.refunded_amount_krw, 0)
    ELSE 0
  END +
  COALESCE(
    (SELECT SUM(amount_krw)
     FROM rentcar_rental_payments
     WHERE rental_id = b.id
       AND payment_type = 'additional'
       AND status = 'approved'),
    0
  ) AS total_revenue,

  -- 추가 비용 상세
  b.late_return_fee_krw,
  b.fuel_deficit_fee_krw,
  b.damage_fee_krw,
  b.other_fee_krw

FROM rentcar_bookings b
LEFT JOIN rentcar_vehicles v ON b.vehicle_id = v.id
LEFT JOIN rentcar_rental_deposits d ON b.id = d.rental_id

WHERE b.vendor_id = ?
  AND b.status IN ('returned', 'completed')
  AND b.return_checked_out_at >= ?
  AND b.return_checked_out_at < ?

ORDER BY b.return_checked_out_at DESC;
```

---

## UI 구성 (벤더 대시보드)

### 정산 리포트 테이블

| 예약번호 | 고객명 | 차량 | 기간 | 렌탈 요금 | 보증금 수집 | 보증금 환불 | 보증금→매출 | 추가 결제 | **총 매출** |
|---------|-------|------|------|---------|-----------|-----------|----------|----------|----------|
| RC-1234 | 홍길동 | 아반떼 | 10/15-18 | 264,000 | 100,000 | 84,000 | 16,000 | 0 | **280,000** |
| RC-1235 | 김철수 | K5 | 10/16-19 | 280,000 | 100,000 | 0 | 100,000 | 50,000 | **430,000** |
| **합계** | | | | **544,000** | **200,000** | **84,000** | **116,000** | **50,000** | **710,000** |

### 색상 구분

- **녹색**: 매출 (Rental Revenue, Total Revenue)
- **노란색**: 부채 (Deposit Collected)
- **파란색**: 부채 감소 (Deposit Refunded)
- **보라색**: 보증금 매출 전환 (Deposit Converted to Revenue)
- **주황색**: 추가 결제 (Additional Revenue)

---

## 구현 가이드

### 1. API 엔드포인트 생성

```javascript
// api/rentcar/vendor/settlement-report.js
module.exports = async function handler(req, res) {
  const { start_date, end_date } = req.query;
  const vendorId = req.user.vendorId;

  // SQL 쿼리 실행
  const bookings = await db.query(settlementQuery, [vendorId, start_date, end_date]);

  // 집계 계산
  const summary = {
    total_rental_revenue: bookings.reduce((sum, b) => sum + b.rental_revenue, 0),
    total_deposit_collected: bookings.reduce((sum, b) => sum + b.deposit_collected, 0),
    total_deposit_refunded: bookings.reduce((sum, b) => sum + b.deposit_refunded, 0),
    total_deposit_converted_to_revenue: bookings.reduce((sum, b) => sum + b.deposit_converted_to_revenue, 0),
    total_additional_revenue: bookings.reduce((sum, b) => sum + b.additional_revenue, 0),
    total_revenue: bookings.reduce((sum, b) => sum + b.total_revenue, 0)
  };

  return res.json({ success: true, data: { summary, bookings } });
};
```

### 2. UI 컴포넌트 생성 (React)

```tsx
// components/SettlementReportPage.tsx
function SettlementReportPage() {
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    fetchSettlementReport(startDate, endDate).then(setReportData);
  }, [startDate, endDate]);

  return (
    <div>
      <h2>정산 리포트</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-6 gap-4">
        <SummaryCard title="렌탈 요금" value={reportData.summary.total_rental_revenue} color="green" />
        <SummaryCard title="보증금 수집" value={reportData.summary.total_deposit_collected} color="yellow" />
        <SummaryCard title="보증금 환불" value={reportData.summary.total_deposit_refunded} color="blue" />
        <SummaryCard title="보증금→매출" value={reportData.summary.total_deposit_converted_to_revenue} color="purple" />
        <SummaryCard title="추가 결제" value={reportData.summary.total_additional_revenue} color="orange" />
        <SummaryCard title="총 매출" value={reportData.summary.total_revenue} color="green" className="font-bold" />
      </div>

      {/* Table */}
      <SettlementTable bookings={reportData.bookings} />
    </div>
  );
}
```

---

## 회계 원칙

### 복식 부기 (Double-Entry Bookkeeping)

#### 보증금 사전승인 시:
```
차변: 보증금 예치금 (자산)  100,000원
대변: 보증금 예수금 (부채)  100,000원
```

#### 정상 반납 (전액 환불) 시:
```
차변: 보증금 예수금 (부채)  100,000원
대변: 보증금 예치금 (자산)  100,000원
```

#### 추가 비용 발생 (부분 환불) 시:
```
차변: 보증금 예수금 (부채)  100,000원
대변: 보증금 예치금 (자산)   84,000원
대변: 추가 비용 매출 (수익)  16,000원
```

#### 추가 비용 > 보증금 (추가 결제) 시:
```
차변: 보증금 예수금 (부채)   100,000원
차변: 미수금 (자산)          50,000원
대변: 보증금 예치금 (자산)   100,000원
대변: 추가 비용 매출 (수익)  150,000원
```

---

## 결론

6-column 구조를 통해:
1. **보증금과 매출을 명확히 구분** → 정확한 회계 처리
2. **보증금의 흐름 추적** → 투명한 정산
3. **실제 수익 파악** → 올바른 재무 분석

이 구조는 회계 감사 및 세무 신고 시에도 명확한 근거 자료로 활용 가능합니다.

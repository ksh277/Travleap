# 벤더별 환불 정책 적용 가이드

**작성일**: 2025-10-27
**상태**: 구현 필요

## 현재 상황

### ✅ 완료된 작업
1. `rentcar_vendors.cancellation_rules` JSON 컬럼 추가
2. 벤더 대시보드 UI에서 환불 비율 설정 가능
   - 3일 전: X% 환불
   - 1-2일 전: X% 환불
   - 당일: X% 환불

### ⚠️ 미완성 작업
**cancel-rental.js API가 아직 벤더별 환불 정책을 사용하지 않음**

## 현재 API 로직 (cancel-rental.js)

```javascript
// Line 120-137: 전역 cancellation_policies 테이블 사용
const policies = await db.query(`
  SELECT rules_json, no_show_penalty_rate
  FROM cancellation_policies
  WHERE category = ?
  LIMIT 1
`, [policyCode]);

// rules_json 구조: [{hours_before_pickup: 72, refund_rate: 100}, ...]
```

## 수정 필요 사항

### 1. cancel-rental.js 수정 (Line 117-153)

**변경 전:**
```javascript
// 7. 취소 정책 조회
let policyCode = rental.cancel_policy_code || 'moderate';

const policies = await db.query(`
  SELECT rules_json, no_show_penalty_rate
  FROM cancellation_policies
  WHERE category = ?
  LIMIT 1
`, [policyCode]);

let policyRules = [];
// ... 기존 로직
```

**변경 후:**
```javascript
// 7. 벤더별 취소 정책 조회
// 먼저 벤더의 cancellation_rules 확인
const vendorPolicies = await db.query(`
  SELECT cancellation_rules
  FROM rentcar_vendors
  WHERE id = ?
  LIMIT 1
`, [rental.vendor_id]);

let refundRate = 0;
const now = new Date();
const pickupAt = new Date(rental.pickup_at_utc);
const hoursUntilPickup = (pickupAt - now) / 3600000;

// 벤더별 정책이 있으면 사용
if (vendorPolicies.length > 0 && vendorPolicies[0].cancellation_rules) {
  const rules = JSON.parse(vendorPolicies[0].cancellation_rules);

  // 시간 기준으로 환불율 결정
  if (hoursUntilPickup >= 72) { // 3일 = 72시간
    refundRate = rules['3_days_before'] || 100;
  } else if (hoursUntilPickup >= 24) { // 1-2일
    refundRate = rules['1_2_days_before'] || 50;
  } else {
    refundRate = rules['same_day'] || 0;
  }

  console.log(`📋 Using vendor-specific cancellation policy`);
} else {
  // 벤더 정책 없으면 기존 전역 정책 사용
  let policyCode = rental.cancel_policy_code || 'moderate';

  const policies = await db.query(`
    SELECT rules_json
    FROM cancellation_policies
    WHERE category = ?
    LIMIT 1
  `, [policyCode]);

  if (policies.length > 0) {
    const policyRules = JSON.parse(policies[0].rules_json);

    for (const rule of policyRules) {
      if (hoursUntilPickup >= rule.hours_before_pickup) {
        refundRate = rule.refund_rate;
        break;
      }
    }
  }

  console.log(`📋 Using global cancellation policy: ${policyCode}`);
}

console.log(`   📜 Hours until pickup: ${hoursUntilPickup.toFixed(1)}h, Refund rate: ${refundRate}%`);
```

### 2. 수정이 필요한 파일
- ✅ `migrations/add_vendor_fields.sql` - 이미 생성됨
- ⚠️ `api/rentcar/cancel-rental.js` - 수정 필요 (Line 117-153)

### 3. 테스트 시나리오

#### 테스트 1: 벤더별 환불 정책 설정
1. 드림렌트카 대시보드 로그인
2. 업체정보 수정
3. 환불 비율 설정:
   - 3일 전: 80%
   - 1-2일 전: 40%
   - 당일: 10%
4. 저장

#### 테스트 2: 3일 전 취소 (80% 환불)
```bash
# 예약 생성 (픽업일: 4일 후)
POST /api/rentcar/create-rental
{
  "vehicle_id": 1,
  "pickup_at": "2025-10-31 10:00",
  "total_price_krw": 100000
}

# 즉시 취소 (72시간 이상 남음)
POST /api/rentcar/cancel-rental
{
  "booking_number": "RENT-20251027-XXXX"
}

# 예상 결과:
# - refund_rate: 80%
# - refund_amount: 80,000원
# - cancellation_fee: 20,000원
```

#### 테스트 3: 1일 전 취소 (40% 환불)
```bash
# 예약 생성 (픽업일: 1.5일 후)
# 36시간 후 취소 → 1-2일 전 구간
# 예상 환불율: 40%
```

#### 테스트 4: 당일 취소 (10% 환불)
```bash
# 예약 생성 (픽업일: 12시간 후)
# 5시간 후 취소 → 당일 구간
# 예상 환불율: 10%
```

### 4. DB 마이그레이션 실행

**PlanetScale에서 실행:**
```sql
-- migrations/add_vendor_fields.sql 파일 내용 실행
ALTER TABLE rentcar_vendors
ADD COLUMN address_detail VARCHAR(255) DEFAULT NULL COMMENT '상세주소' AFTER address;

ALTER TABLE rentcar_vendors
ADD COLUMN rental_guide TEXT DEFAULT NULL COMMENT '대여 안내사항' AFTER cancellation_policy;

ALTER TABLE rentcar_vendors
ADD COLUMN cancellation_rules JSON DEFAULT NULL COMMENT '환불 정책 비율' AFTER rental_guide;

-- 기본값 설정
UPDATE rentcar_vendors
SET rental_guide = '• 운전면허 취득 1년 이상 필수
• 만 21세 이상 대여 가능
• 대여 시 신분증, 운전면허증, 신용카드 필요
• 보험 가입 필수 (기본 보험 포함)
• 주행거리 제한: 1일 200km (초과 시 km당 ₩100)'
WHERE rental_guide IS NULL;

UPDATE rentcar_vendors
SET cancellation_rules = JSON_OBJECT(
  '3_days_before', 100,
  '1_2_days_before', 50,
  'same_day', 0
)
WHERE cancellation_rules IS NULL;
```

## 다음 단계

1. ✅ 마이그레이션 SQL 실행
2. ⚠️ cancel-rental.js 수정
3. ⚠️ 테스트 시나리오 실행
4. ✅ 커밋 및 배포

## 기대 효과

1. **업체별 맞춤 환불 정책**
   - 각 렌트카 업체가 자체 환불 정책 설정
   - 경쟁력 있는 정책으로 고객 유치

2. **자동 환불 계산**
   - 수동 계산 불필요
   - 환불 분쟁 감소

3. **투명한 정책 공개**
   - 고객이 예약 전 정확한 환불 정책 확인
   - 신뢰도 향상

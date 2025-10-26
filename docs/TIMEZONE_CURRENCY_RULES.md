# Timezone & Currency Rules

## 렌트카 시스템 시간대 및 통화 규칙

---

## Timezone Rules

### 표준 시간대: Asia/Seoul (KST, UTC+9)

모든 시간 데이터는 **Asia/Seoul (한국 표준시)** 기준으로 처리됩니다.

### 1. 데이터베이스 저장 규칙

#### 컬럼 명명 규칙:
- `*_at_utc`: UTC 시간으로 저장 (예: `pickup_at_utc`, `return_at_utc`)
- `*_at`: 로컬 시간 (KST)으로 저장 (예: `created_at`, `updated_at`)

```sql
-- 예약 시간 컬럼
pickup_at_utc DATETIME NOT NULL COMMENT 'UTC 시간',
return_at_utc DATETIME NOT NULL COMMENT 'UTC 시간',

-- 시스템 시간 컬럼
created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'KST 시간',
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'KST 시간'
```

### 2. API 입력/출력 규칙

#### 입력 (Request):
- **형식**: ISO 8601 문자열 또는 `YYYY-MM-DD HH:mm:ss`
- **시간대**: 클라이언트가 KST 시간으로 전송
- **서버 처리**: 입력 받은 KST를 UTC로 변환하여 DB 저장

```javascript
// 클라이언트 요청 (KST)
{
  "pickup_at": "2025-10-27 10:00:00",  // KST
  "return_at": "2025-10-30 18:00:00"   // KST
}

// 서버 DB 저장 (UTC)
INSERT INTO rentcar_bookings (pickup_at_utc, return_at_utc)
VALUES (
  '2025-10-27 01:00:00',  // UTC (KST - 9시간)
  '2025-10-30 09:00:00'   // UTC (KST - 9시간)
);
```

#### 출력 (Response):
- **형식**: ISO 8601 문자열 (타임존 포함)
- **시간대**: UTC 또는 KST (명시적으로 표기)

```javascript
// API 응답
{
  "pickup_at": "2025-10-27T10:00:00+09:00",  // KST (명시적 타임존)
  "pickup_at_utc": "2025-10-27T01:00:00Z",   // UTC
  "pickup_at_local": "2025-10-27 10:00:00"   // KST (타임존 없음, 문서화 필요)
}
```

### 3. JavaScript/Node.js 코드 규칙

```javascript
// ✅ 올바른 방법: moment-timezone 사용
const moment = require('moment-timezone');

// KST 시간을 UTC로 변환
const kstTime = '2025-10-27 10:00:00';
const utcTime = moment.tz(kstTime, 'Asia/Seoul').utc().format('YYYY-MM-DD HH:mm:ss');
// '2025-10-27 01:00:00'

// UTC 시간을 KST로 변환
const utcFromDB = '2025-10-27 01:00:00';
const kstDisplay = moment.utc(utcFromDB).tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss');
// '2025-10-27 10:00:00'

// ❌ 잘못된 방법: new Date() 사용 (서버 로컬 시간에 의존)
const now = new Date(); // 서버 타임존에 따라 다를 수 있음
```

### 4. React/Frontend 코드 규칙

```typescript
// ✅ 올바른 방법: date-fns-tz 사용
import { format, toZonedTime } from 'date-fns-tz';
import { ko } from 'date-fns/locale';

// API에서 받은 UTC 시간을 KST로 표시
const utcTime = '2025-10-27T01:00:00Z';
const kstTime = toZonedTime(utcTime, 'Asia/Seoul');
const formatted = format(kstTime, 'yyyy-MM-dd HH:mm:ss', { timeZone: 'Asia/Seoul', locale: ko });
// '2025-10-27 10:00:00'

// 사용자 입력 (KST)을 UTC로 변환하여 API 전송
const userInput = '2025-10-27 10:00:00';
const utcForAPI = format(
  toZonedTime(userInput, 'Asia/Seoul'),
  "yyyy-MM-dd'T'HH:mm:ss'Z'",
  { timeZone: 'UTC' }
);
// '2025-10-27T01:00:00Z'
```

### 5. 시간 비교 규칙

```javascript
// ✅ 올바른 방법: UTC 기준으로 비교
const now = moment.utc();
const pickupTimeUTC = moment.utc(booking.pickup_at_utc);

if (now.isAfter(pickupTimeUTC)) {
  console.log('픽업 시간이 지났습니다.');
}

// ❌ 잘못된 방법: 로컬 시간 비교
const now = new Date();
const pickupTime = new Date(booking.pickup_at_utc);
if (now > pickupTime) { /* 타임존 차이로 인한 오류 가능 */ }
```

### 6. 크론잡 스케줄

모든 크론잡은 **서버 로컬 시간 (Asia/Seoul)** 기준으로 동작

```javascript
// 크론 표현식: 분 시 일 월 요일
// 예: 매일 오전 9시 (KST)
cron.schedule('0 9 * * *', async () => {
  console.log('Executing at 9 AM KST');
  await sendCheckInReminders();
});

// 주의: 서버 시간대 설정 확인 필요
// process.env.TZ = 'Asia/Seoul'; // 환경 변수로 설정
```

---

## Currency Rules

### 표준 통화: KRW (한국 원화)

모든 금액은 **KRW (한국 원화)** 기준으로 처리됩니다.

### 1. 금액 저장 규칙

#### 데이터 타입: INT (정수)
- **소수점 없음**: 원화는 소수점이 없으므로 INT 사용
- **단위**: 원 (1원 = 1 unit)

```sql
-- 올바른 컬럼 정의
total_price_krw INT NOT NULL COMMENT '총 금액 (원)',
deposit_amount_krw INT NOT NULL COMMENT '보증금 (원)',
daily_rate_krw INT NOT NULL COMMENT '일일 요금 (원)',

-- ❌ 잘못된 예
total_price DECIMAL(10, 2) -- 원화는 소수점 없음
```

### 2. 금액 표시 규칙

#### Frontend 표시:
- **천 단위 콤마**: `toLocaleString('ko-KR')`
- **통화 기호**: "원" 또는 "₩"
- **정수만 표시**: 소수점 없음

```javascript
// ✅ 올바른 방법
const price = 264000;
const formatted = price.toLocaleString('ko-KR') + '원';
// '264,000원'

// 또는 Intl.NumberFormat 사용
const formatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
const formatted = formatter.format(264000);
// '₩264,000'

// ❌ 잘못된 방법
const formatted = `${price.toFixed(2)}원`; // 264000.00원 (불필요한 소수점)
```

### 3. 금액 계산 규칙

#### 반올림 규칙:
- **내림 (Floor)**: 사용자에게 유리한 경우 (환불 금액 등)
- **올림 (Ceil)**: 업체에게 유리한 경우 (최소 요금 등)
- **반올림 (Round)**: 정확한 계산이 필요한 경우

```javascript
// 환불 금액 계산 (사용자에게 유리하게 내림)
const refundRate = 0.85; // 85% 환불
const totalPrice = 264000;
const refundAmount = Math.floor(totalPrice * refundRate);
// 224,400원 (224,400.0원 → 내림)

// 추가 비용 계산 (업체에게 유리하게 올림)
const hourlyRate = 3000;
const hours = 2.3; // 2시간 18분
const additionalFee = Math.ceil(hourlyRate * hours);
// 6,900원 (6,900원 → 올림)

// ❌ 잘못된 방법: 소수점 사용
const refundAmount = (totalPrice * refundRate).toFixed(2);
// "224400.00" (문자열, 원화에 부적합)
```

### 4. API 금액 필드 명명 규칙

모든 금액 필드는 `*_krw` 접미사 사용

```javascript
// ✅ 올바른 필드명
{
  "total_price_krw": 264000,
  "deposit_amount_krw": 100000,
  "hourly_rate_krw": 3000,
  "daily_rate_krw": 80000,
  "refund_amount_krw": 224400
}

// ❌ 잘못된 필드명 (통화 불명확)
{
  "total_price": 264000,  // USD? KRW? 불명확
  "deposit": 100000       // 통화 불명확
}
```

### 5. Toss Payments API 연동

Toss Payments는 **정수 금액 (KRW)**을 요구

```javascript
// ✅ 올바른 Toss Payments 요청
{
  "amount": 264000,  // INT, 원 단위
  "orderId": "ORDER-123",
  "orderName": "렌트카 예약"
}

// ❌ 잘못된 요청
{
  "amount": 264000.00,  // 소수점 불필요
  "amount": "264000"    // 문자열 금지
}
```

### 6. 다국어 지원 (향후)

현재는 KRW만 지원, 향후 다국어 지원 시:

```javascript
// 향후 구조 (다국어 지원 시)
{
  "total_price": {
    "krw": 264000,
    "usd": 198,     // 환율 적용
    "jpy": 29500
  },
  "currency": "KRW",  // 기본 통화
  "exchange_rate": {
    "usd": 0.00075,
    "jpy": 0.112
  }
}
```

---

## 환경 변수 설정

### .env 파일

```bash
# Timezone
TZ=Asia/Seoul

# Currency
DEFAULT_CURRENCY=KRW
CURRENCY_LOCALE=ko-KR
```

### Node.js 서버 시작 시

```javascript
// server-api.ts
process.env.TZ = 'Asia/Seoul';

// 시작 로그
console.log(`🕐 Server timezone: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
console.log(`💰 Default currency: KRW`);
```

---

## 테스트 시나리오

### Timezone 테스트

```javascript
// 1. KST → UTC 변환 테스트
const kst = '2025-10-27 10:00:00';
const utc = convertKSTtoUTC(kst);
expect(utc).toBe('2025-10-27 01:00:00');

// 2. UTC → KST 변환 테스트
const utcTime = '2025-10-27 01:00:00';
const kstTime = convertUTCtoKST(utcTime);
expect(kstTime).toBe('2025-10-27 10:00:00');

// 3. 시간 비교 테스트
const now = moment.utc();
const future = moment.utc().add(1, 'hour');
expect(future.isAfter(now)).toBe(true);
```

### Currency 테스트

```javascript
// 1. 금액 표시 테스트
expect(formatCurrency(264000)).toBe('264,000원');

// 2. 금액 계산 테스트 (내림)
expect(calculateRefund(264000, 0.85)).toBe(224400);

// 3. 금액 계산 테스트 (올림)
expect(calculateAdditionalFee(3000, 2.3)).toBe(6900);
```

---

## 주의사항 (Common Pitfalls)

### ❌ 피해야 할 것들:

1. **new Date() 남용**: 서버 로컬 시간에 의존, 타임존 문제 발생
2. **소수점 금액**: 원화는 소수점 없음, INT 사용
3. **문자열 금액**: "264000" → 264000 (숫자 사용)
4. **타임존 미명시**: "2025-10-27 10:00:00" → "2025-10-27T10:00:00+09:00" (KST 명시)
5. **서머타임 가정**: 한국은 서머타임 없음, UTC+9 고정

### ✅ 올바른 방법:

1. **moment-timezone 사용**: 명시적 타임존 지정
2. **INT 금액**: 소수점 없이 정수로 저장/계산
3. **명시적 통화**: `*_krw` 접미사로 통화 명확히
4. **UTC 기준 비교**: 시간 비교 시 UTC 기준 사용
5. **환경 변수 설정**: `TZ=Asia/Seoul` 명시

---

## 참고 자료

- **Moment.js Timezone**: https://momentjs.com/timezone/
- **date-fns-tz**: https://github.com/marnusw/date-fns-tz
- **Toss Payments API**: https://docs.tosspayments.com/
- **ISO 8601**: https://en.wikipedia.org/wiki/ISO_8601

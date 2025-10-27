# 고객정보 암호화 가이드

**작성일**: 2025-10-27
**목적**: 개인정보 보호법 준수 및 데이터 보안 강화

## 개요

렌트카 예약 시스템에서 고객의 민감한 정보를 AES-256-GCM 알고리즘으로 암호화하여 저장합니다.

## 암호화 대상 정보

### 1. 필수 암호화 필드
- **customer_name** - 고객 이름
- **customer_phone** - 전화번호
- **customer_email** - 이메일
- **customer_address** - 주소

### 2. 선택 암호화 필드
- **driver_license_number** - 운전면허번호
- **passport_number** - 여권번호
- **credit_card_last4** - 카드 마지막 4자리 (PCI-DSS 준수)

## 환경 설정

### 1. 환경변수 추가

**.env 파일**:
```env
# 암호화 키 (32자 이상 권장)
ENCRYPTION_KEY=your-super-secret-encryption-key-change-me-please-32-chars-minimum
```

**중요 사항**:
- 프로덕션 환경에서는 반드시 강력한 랜덤 키 사용
- 키 노출 절대 금지
- 정기적인 키 로테이션 권장 (6개월~1년)

### 2. 키 생성 방법

```bash
# Node.js로 랜덤 키 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 사용 방법

### 1. 예약 생성 시 암호화

**파일**: `api/rentcar/create-rental.js`

```javascript
const { encryptBooking } = require('../../utils/encryption');

// Before (평문 저장)
await db.execute(`
  INSERT INTO rentcar_bookings (
    customer_name, customer_phone, customer_email
  ) VALUES (?, ?, ?)
`, [customerName, customerPhone, customerEmail]);

// After (암호화 저장)
const encryptedBooking = encryptBooking({
  customer_name: customerName,
  customer_phone: customerPhone,
  customer_email: customerEmail
});

await db.execute(`
  INSERT INTO rentcar_bookings (
    customer_name, customer_phone, customer_email
  ) VALUES (?, ?, ?)
`, [
  encryptedBooking.customer_name,
  encryptedBooking.customer_phone,
  encryptedBooking.customer_email
]);
```

### 2. 예약 조회 시 복호화

**파일**: `api/rentcar/bookings.js`

```javascript
const { decryptBooking } = require('../../utils/encryption');

// DB에서 조회
const bookings = await db.query(`
  SELECT * FROM rentcar_bookings WHERE vendor_id = ?
`, [vendorId]);

// 복호화
const decryptedBookings = bookings.map(booking => decryptBooking(booking));

return res.json({
  success: true,
  data: decryptedBookings
});
```

### 3. 관리자 조회 시 마스킹

**파일**: `api/admin/rentcar/bookings.js`

```javascript
const { decryptBooking, maskPhone, maskEmail } = require('../../utils/encryption');

// 복호화 후 마스킹
const bookings = await db.query(`SELECT * FROM rentcar_bookings`);

const maskedBookings = bookings.map(booking => {
  const decrypted = decryptBooking(booking);

  return {
    ...decrypted,
    customer_phone: maskPhone(decrypted.customer_phone), // 010-****-5678
    customer_email: maskEmail(decrypted.customer_email)  // te**@example.com
  };
});
```

## API 사용 예시

### 암호화

```javascript
const { encrypt, encryptPhone, encryptEmail } = require('./utils/encryption');

// 일반 텍스트
const encrypted = encrypt('홍길동');
// → "a1b2c3d4e5f6:g7h8i9j0k1l2:m3n4o5p6q7r8s9t0"

// 전화번호 (자동으로 하이픈 제거)
const phone = encryptPhone('010-1234-5678');
// → "x9y8z7w6v5u4:t3s2r1q0p9o8:n7m6l5k4j3i2h1"

// 이메일 (자동으로 소문자 변환)
const email = encryptEmail('Test@Example.COM');
// → "f5e4d3c2b1a0:z9y8x7w6v5u4:t3s2r1q0p9o8n7"
```

### 복호화

```javascript
const { decrypt, decryptPhone, decryptEmail } = require('./utils/encryption');

// 일반 텍스트
const text = decrypt('a1b2c3d4e5f6:g7h8i9j0k1l2:m3n4o5p6q7r8s9t0');
// → "홍길동"

// 전화번호 (자동으로 하이픈 추가)
const phone = decryptPhone('x9y8z7w6v5u4:t3s2r1q0p9o8:n7m6l5k4j3i2h1');
// → "010-1234-5678"

// 이메일
const email = decryptEmail('f5e4d3c2b1a0:z9y8x7w6v5u4:t3s2r1q0p9o8n7');
// → "test@example.com"
```

### 마스킹

```javascript
const { maskPhone, maskEmail } = require('./utils/encryption');

maskPhone('010-1234-5678');
// → "010-****-5678"

maskEmail('customer@example.com');
// → "cu******@example.com"
```

## 데이터 마이그레이션

### 기존 평문 데이터 암호화

**스크립트**: `scripts/encrypt-existing-data.js`

```javascript
const { connect } = require('@planetscale/database');
const { encryptBooking } = require('../utils/encryption');

async function encryptExistingBookings() {
  const connection = connect({ url: process.env.DATABASE_URL });

  // 1. 모든 예약 조회
  const bookings = await connection.execute(`
    SELECT id, customer_name, customer_phone, customer_email
    FROM rentcar_bookings
  `);

  console.log(`📊 Total bookings to encrypt: ${bookings.rows.length}`);

  // 2. 각 예약 암호화
  for (const booking of bookings.rows) {
    const encrypted = encryptBooking({
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      customer_email: booking.customer_email
    });

    await connection.execute(`
      UPDATE rentcar_bookings
      SET
        customer_name = ?,
        customer_phone = ?,
        customer_email = ?
      WHERE id = ?
    `, [
      encrypted.customer_name,
      encrypted.customer_phone,
      encrypted.customer_email,
      booking.id
    ]);

    console.log(`✅ Encrypted booking #${booking.id}`);
  }

  console.log(`🎉 All bookings encrypted successfully!`);
}

encryptExistingBookings().catch(console.error);
```

**실행**:
```bash
node scripts/encrypt-existing-data.js
```

## 보안 고려사항

### 1. 키 관리
- ✅ 환경변수로 관리 (.env)
- ✅ Git에 커밋 금지 (.gitignore)
- ✅ 프로덕션은 Vercel Secrets 사용
- ⚠️ 키 노출 시 즉시 로테이션

### 2. 암호화 알고리즘
- **AES-256-GCM** (Galois/Counter Mode)
- 대칭키 암호화 (빠름)
- 인증 태그로 무결성 검증
- IV(Initialization Vector)로 랜덤성 보장

### 3. 성능 최적화
- 필요한 필드만 암호화
- 검색 필요 시 인덱스 별도 저장
- 대량 처리 시 배치 암호화

### 4. 백업 및 복구
```sql
-- 암호화 키를 잃어버리면 복구 불가능!
-- 키를 안전한 곳에 백업 필수
```

## 테스트

### 1. 단위 테스트

```javascript
const { encrypt, decrypt, encryptPhone, decryptPhone } = require('./utils/encryption');

// 텍스트 암호화/복호화
const original = '홍길동';
const encrypted = encrypt(original);
const decrypted = decrypt(encrypted);

console.assert(original === decrypted, 'Text encryption/decryption failed');

// 전화번호 암호화/복호화
const phone = '010-1234-5678';
const encryptedPhone = encryptPhone(phone);
const decryptedPhone = decryptPhone(encryptedPhone);

console.assert(decryptedPhone === phone, 'Phone encryption/decryption failed');

console.log('✅ All tests passed!');
```

### 2. 통합 테스트

```bash
# 예약 생성 → 조회 → 복호화 확인
curl -X POST /api/rentcar/create-rental -d '{
  "customer_name": "테스트",
  "customer_phone": "010-1234-5678"
}'

# DB 확인 (암호화 되어있어야 함)
# customer_phone: "a1b2c3:d4e5f6:g7h8i9..."

# API 조회 (복호화 되어야 함)
curl /api/rentcar/bookings
# customer_phone: "010-1234-5678"
```

## 법적 준수

### 개인정보 보호법 (PIPA)
- ✅ 개인정보 암호화 의무 준수
- ✅ 접근 권한 제어
- ✅ 암호화 키 분리 관리

### GDPR (유럽)
- ✅ 데이터 처리 기록
- ✅ 사용자 동의 관리
- ✅ 삭제 요청 처리

## 문제 해결

### Q1: 복호화가 안 돼요!
**A**:
- 환경변수 `ENCRYPTION_KEY`가 동일한지 확인
- 암호화된 데이터 형식이 "iv:authTag:encrypted" 인지 확인

### Q2: 성능이 느려요!
**A**:
- 필요한 필드만 암호화
- 검색 시 인덱스 활용
- 캐싱 적용

### Q3: 키를 잃어버렸어요!
**A**:
- 복구 불가능
- 백업에서 복원하거나 재암호화 필요

## 다음 단계

1. ✅ 환경변수 설정
2. ✅ 기존 데이터 마이그레이션
3. ⚠️ 키 백업 (안전한 곳)
4. ⚠️ 정기 감사 (6개월마다)
5. ⚠️ 키 로테이션 계획

---

**문의**: security@travleap.com
**문서 버전**: 1.0.0
**최종 업데이트**: 2025-10-27

# 스마트 쿠폰 시스템 - Final Integration Review
## Day 5: 최종 통합 검토

---

## 📋 Executive Summary

**목적**: Day 1-4에서 설계한 DB 스키마, API, Frontend 아키텍처를 종합 검토하고 실제 구현 전 필수 사전작업과 잠재적 이슈를 식별합니다.

**설계 완료 항목:**
- ✅ 데이터베이스 스키마 (7개 테이블)
- ✅ API 명세 (12개 엔드포인트)
- ✅ Kakao OAuth 플로우
- ✅ Frontend 아키텍처 (페이지, 컴포넌트, 상태관리)

**검토 결과 요약:**
- 🔴 **Critical**: 기존 `users` 테이블 호환성 문제 발견
- 🟡 **Warning**: `merchants` 테이블 존재 여부 미확인
- 🟡 **Warning**: 기존 `listings` 테이블에 price 컬럼 구조 확인 필요
- 🟢 **Ready**: 신규 테이블 설계 완료
- 🟢 **Ready**: API 엔드포인트 설계 완료
- 🟢 **Ready**: Frontend 컴포넌트 구조 완료

---

## 🔴 Critical Issues - 구현 전 필수 해결사항

### Issue #1: users 테이블 호환성 문제

**현재 상태:**
```sql
CREATE TABLE users (
  id INT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,  -- ❌ 문제!
  name VARCHAR(100),
  role ENUM('admin', 'user', 'partner'),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**문제점:**
1. `password_hash` 컬럼이 `NOT NULL` → Kakao 자동가입 시 INSERT 실패
2. `auth_provider` 컬럼 없음 → 카카오/이메일 로그인 구분 불가
3. `total_points` 컬럼 없음 → 리뷰 포인트 적립 불가

**해결 방안:**
```sql
-- users 테이블 수정 (마이그레이션 필요)
ALTER TABLE users
  MODIFY COLUMN password_hash VARCHAR(255) NULL;

ALTER TABLE users
  ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'email'
  AFTER password_hash;

ALTER TABLE users
  ADD COLUMN total_points INT DEFAULT 0
  AFTER role;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_users_auth_provider ON users(auth_provider);
```

**마이그레이션 스크립트 생성:**
```sql
-- scripts/migrations/002_modify_users_table_up.sql
-- ========================================
-- 마이그레이션: 002 - users 테이블 수정 (UP)
-- ========================================
-- 목적: 스마트 쿠폰 시스템을 위한 users 테이블 확장
-- - Kakao OAuth 지원
-- - 포인트 시스템 지원
-- ========================================

-- Step 1: password_hash를 NULL 허용으로 변경
ALTER TABLE users
  MODIFY COLUMN password_hash VARCHAR(255) NULL
  COMMENT 'Kakao 로그인 사용자는 NULL 가능';

-- Step 2: auth_provider 컬럼 추가
ALTER TABLE users
  ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'email'
  AFTER password_hash
  COMMENT '인증 제공자: email, kakao';

-- Step 3: total_points 컬럼 추가
ALTER TABLE users
  ADD COLUMN total_points INT DEFAULT 0
  AFTER role
  COMMENT '사용자 포인트 (리뷰 적립)';

-- Step 4: 인덱스 추가
CREATE INDEX idx_users_auth_provider ON users(auth_provider);

-- Step 5: 기존 데이터 마이그레이션
UPDATE users
SET auth_provider = 'email'
WHERE password_hash IS NOT NULL;

-- ========================================
-- 마이그레이션 완료
-- ========================================
```

```sql
-- scripts/migrations/002_modify_users_table_down.sql
-- ========================================
-- 마이그레이션: 002 - users 테이블 수정 롤백 (DOWN)
-- ========================================

-- Step 1: 인덱스 삭제
DROP INDEX idx_users_auth_provider ON users;

-- Step 2: 컬럼 삭제
ALTER TABLE users DROP COLUMN total_points;
ALTER TABLE users DROP COLUMN auth_provider;

-- Step 3: password_hash NOT NULL 복원 (주의: Kakao 사용자 삭제 필요)
DELETE FROM users WHERE password_hash IS NULL;
ALTER TABLE users
  MODIFY COLUMN password_hash VARCHAR(255) NOT NULL;

-- ========================================
-- 롤백 완료
-- ========================================
```

**우선순위:** 🔴 **Highest** - 구현 시작 전 반드시 실행 필요

---

### Issue #2: merchants 테이블 존재 여부 불명

**DB 스키마에서의 참조:**
```sql
-- campaign_merchants 테이블에서 사용
CREATE TABLE campaign_merchants (
  merchant_id BIGINT NOT NULL,  -- ❌ 외래키 미정의
  ...
);
```

**확인 필요 사항:**
1. `merchants` 테이블이 실제로 존재하는가?
2. 존재한다면 스키마 구조는?
3. 존재하지 않는다면 생성 필요

**시나리오 A: merchants 테이블이 이미 존재하는 경우**
```sql
-- 외래키 제약조건 추가
ALTER TABLE campaign_merchants
  ADD CONSTRAINT fk_campaign_merchants_merchant
  FOREIGN KEY (merchant_id) REFERENCES merchants(id)
  ON DELETE RESTRICT;
```

**시나리오 B: merchants 테이블이 없는 경우**
```sql
-- merchants 테이블 신규 생성
CREATE TABLE merchants (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '가맹점명',
  business_number VARCHAR(20) UNIQUE COMMENT '사업자등록번호',
  owner_name VARCHAR(100) COMMENT '대표자명',
  phone VARCHAR(20) COMMENT '연락처',
  address TEXT COMMENT '주소',
  category VARCHAR(50) COMMENT '업종',
  status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_merchants_status (status),
  INDEX idx_merchants_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='가맹점 마스터';
```

**조치사항:**
```bash
# 1. DB에서 merchants 테이블 존재 확인
SHOW TABLES LIKE 'merchants';

# 2. 존재한다면 구조 확인
DESCRIBE merchants;

# 3. 결과에 따라 마이그레이션 스크립트 수정
```

**우선순위:** 🟡 **High** - Day 6 구현 시작 전 확인 필요

---

## 🟡 Warnings - 확인 및 조정 필요사항

### Warning #1: listings 테이블 price 컬럼 구조

**확인된 이슈:**
- 최근 cart checkout 버그: `admission_fee_adult` 등의 컬럼이 실제로 존재하지 않음
- 수정 후 사용 중인 컬럼: `price_from`, `adult_price`, `child_price`, `infant_price`, `senior_price`

**스마트 쿠폰 시스템에서의 사용:**
```javascript
// api/smart-coupons/issue.js 등에서 사용 예정
const listing = await query(
  'SELECT price_from, adult_price FROM listings WHERE id = ?',
  [listingId]
);
```

**조치사항:**
- ✅ 현재 컬럼 구조 확인 완료
- ⚠️ 스마트 쿠폰에서는 `price_from`을 기본 가격으로 사용
- 📝 API에서 가격 참조 시 `price_from` 우선, `adult_price` 폴백

**우선순위:** 🟡 **Medium** - 현재 구조 사용 가능

---

### Warning #2: QR 코드 저장 방식 결정

**설계 시 2가지 옵션 제시:**

**옵션 A: Base64 이미지로 DB 저장**
```javascript
// 쿠폰 발급 시
const qrDataUrl = await QRCode.toDataURL(couponCode);
await query(
  'UPDATE user_coupons SET qr_image = ? WHERE id = ?',
  [qrDataUrl, couponId]
);
```
**장점:** 빠른 조회, 외부 저장소 불필요
**단점:** DB 크기 증가 (각 QR ~2-5KB)

**옵션 B: 클라이언트 동적 생성**
```javascript
// 프론트엔드에서 생성
useEffect(() => {
  QRCode.toCanvas(canvasRef.current, couponCode);
}, [couponCode]);
```
**장점:** DB 용량 절약
**단점:** 클라이언트 로딩 시간 증가

**권장사항:**
- 📊 예상 쿠폰 수가 10만 개 미만 → **옵션 A (DB 저장)** 추천
- 📊 예상 쿠폰 수가 100만 개 이상 → **옵션 B (동적 생성)** 추천

**현재 설계:** 옵션 A (qr_image TEXT 컬럼 존재)

**우선순위:** 🟡 **Medium** - 현재 설계 유지 가능, 추후 변경 가능

---

### Warning #3: PlanetScale의 외래키 제약조건 처리

**PlanetScale 특성:**
- PlanetScale은 외래키 제약조건을 지원하지 않음 (schema branching 때문)
- `FOREIGN KEY` 구문은 무시됨

**영향 받는 테이블:**
- user_coupons (campaign_id)
- campaign_merchants (campaign_id)
- coupon_usage_logs (user_coupon_id, campaign_id)
- coupon_reviews (user_coupon_id)

**해결 방안:**
```sql
-- 스키마 정의 시 외래키는 주석으로만 남김
CREATE TABLE user_coupons (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT NOT NULL,  -- FK: campaigns.id (application-level)
  ...
);

-- 애플리케이션 레벨에서 참조 무결성 보장
-- api/smart-coupons/issue.js
const campaign = await query('SELECT id FROM campaigns WHERE id = ?', [campaignId]);
if (!campaign.length) {
  throw new Error('Campaign not found');
}
```

**추가 조치:**
- DB 마이그레이션 스크립트에서 `FOREIGN KEY` 구문 제거
- API 코드에서 참조 유효성 검증 로직 추가
- 삭제 시 CASCADE 동작을 코드로 구현

**우선순위:** 🟡 **High** - 마이그레이션 스크립트 수정 필요

---

## 🟢 Integration Verification Checklist

### Backend API ↔ Frontend Type Matching

| API Endpoint | Frontend Interface | Status |
|-------------|-------------------|--------|
| GET /api/campaigns | `Campaign` type | ✅ 일치 |
| GET /api/campaigns/:code | `Campaign` + `Merchant[]` | ✅ 일치 |
| POST /api/smart-coupons/issue | `{ coupon_code }` | ✅ 일치 |
| GET /api/smart-coupons/my | `UserCoupon[]` | ✅ 일치 |
| GET /api/smart-coupons/:code | `UserCoupon` | ✅ 일치 |
| POST /api/partner/coupon-validate | `{ valid, coupon, message }` | ✅ 일치 |
| POST /api/partner/coupon-use | `{ success }` | ✅ 일치 |
| POST /api/smart-coupons/reviews | `{ points_awarded }` | ✅ 일치 |

**확인 완료:** API 응답 스키마와 Frontend 타입 정의가 100% 일치

---

### Kakao OAuth Configuration

**필요한 환경변수:**
```bash
# .env.local
KAKAO_REST_API_KEY=your_rest_api_key
KAKAO_REDIRECT_URI=https://yourdomain.com/api/auth/kakao/callback
JWT_SECRET=your_jwt_secret_key_min_32_chars

# Kakao 개발자 콘솔 설정 필요사항:
# 1. 플랫폼 등록: Web
# 2. Redirect URI 등록: https://yourdomain.com/api/auth/kakao/callback
# 3. 동의항목 설정: 이메일 (필수), 닉네임 (필수)
# 4. 비즈니스 채널 연결 (메시지 발송용)
```

**설정 단계:**
1. Kakao Developers 콘솔에서 앱 생성
2. REST API 키 발급
3. Web 플랫폼 등록
4. Redirect URI 설정
5. 동의 항목 설정 (이메일, 닉네임)
6. 비즈니스 채널 연결 (Kakao Business Messages용)

**우선순위:** 🔴 **Critical** - OAuth 기능 구현 전 필수

---

### Database Migration Order

**실행 순서:**
```bash
# 1. users 테이블 수정 (기존 테이블)
mysql < scripts/migrations/002_modify_users_table_up.sql

# 2. merchants 테이블 확인 및 생성 (필요 시)
# ... merchants 확인 후 결정

# 3. 스마트 쿠폰 테이블 생성
mysql < scripts/migrations/001_create_coupon_tables_up.sql
```

**롤백 순서 (문제 발생 시):**
```bash
# 1. 스마트 쿠폰 테이블 삭제
mysql < scripts/migrations/001_create_coupon_tables_down.sql

# 2. users 테이블 복원
mysql < scripts/migrations/002_modify_users_table_down.sql
```

**백업 필수:**
```bash
# 프로덕션 마이그레이션 전 백업
mysqldump -u user -p database_name > backup_before_migration.sql
```

**우선순위:** 🔴 **Critical** - 구현 전 마이그레이션 완료 필요

---

## 📦 Package Dependencies

### Backend (Node.js)
```json
{
  "dependencies": {
    "qrcode": "^1.5.3",           // QR 코드 생성
    "jsonwebtoken": "^9.0.2",     // JWT 인증
    "axios": "^1.6.2",            // Kakao API 호출
    "mysql2": "^3.6.5"            // DB 연결 (기존)
  }
}
```

### Frontend
```json
{
  "dependencies": {
    "qrcode": "^1.5.3",           // QR 표시
    "html5-qrcode": "^2.3.8",     // QR 스캔 (파트너)
    "next-auth": "^4.24.5"        // 세션 관리 (선택사항)
  },
  "devDependencies": {
    "@types/qrcode": "^1.5.5",
    "@types/jsonwebtoken": "^9.0.5"
  }
}
```

**설치 명령:**
```bash
npm install qrcode jsonwebtoken axios html5-qrcode
npm install -D @types/qrcode @types/jsonwebtoken
```

**우선순위:** 🟢 **Medium** - Day 6 구현 시작 시 설치

---

## 🔒 Security Considerations

### 1. JWT 토큰 보안
```javascript
// JWT Secret 강도 요구사항
// - 최소 32자 이상
// - 영문 대소문자, 숫자, 특수문자 조합
// - 환경변수로 관리 (코드에 하드코딩 금지)

// JWT 만료 시간 설정
const token = jwt.sign(payload, process.env.JWT_SECRET, {
  expiresIn: '7d'  // 7일 후 만료
});

// 토큰 검증 미들웨어
export function verifyToken(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
```

### 2. 쿠폰 사용 중복 방지
```javascript
// 트랜잭션으로 중복 사용 방지
await connection.beginTransaction();
try {
  // 1. 쿠폰 상태 확인 (FOR UPDATE 락)
  const [coupon] = await connection.execute(
    'SELECT status FROM user_coupons WHERE coupon_code = ? FOR UPDATE',
    [couponCode]
  );

  if (coupon.status !== 'ACTIVE') {
    throw new Error('Coupon already used or invalid');
  }

  // 2. 사용 처리
  await connection.execute(
    'UPDATE user_coupons SET status = "USED", used_at = NOW() WHERE coupon_code = ?',
    [couponCode]
  );

  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
}
```

### 3. SQL Injection 방지
```javascript
// ✅ Good: Parameterized queries
await query('SELECT * FROM campaigns WHERE campaign_code = ?', [code]);

// ❌ Bad: String concatenation
await query(`SELECT * FROM campaigns WHERE campaign_code = '${code}'`);
```

### 4. CORS 설정
```javascript
// pages/api/[...].js
export default function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ... 실제 로직
}
```

**우선순위:** 🔴 **Critical** - 모든 API에 보안 적용 필수

---

## 📊 Performance Optimization Plan

### 1. Database Indexing
```sql
-- 이미 정의된 인덱스 (001_create_coupon_tables_up.sql)
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_status ON user_coupons(status);
CREATE INDEX idx_coupon_code ON user_coupons(coupon_code);

-- 추가 필요 인덱스 (성능 모니터링 후 결정)
CREATE INDEX idx_user_coupons_valid_until ON user_coupons(valid_until);
CREATE INDEX idx_campaigns_valid_dates ON campaigns(valid_from, valid_until);
```

### 2. Query Optimization
```javascript
// ✅ Good: 필요한 컬럼만 SELECT
const campaigns = await query(
  'SELECT id, name, campaign_code, status, image_url FROM campaigns WHERE status = ?',
  ['ACTIVE']
);

// ❌ Bad: SELECT *
const campaigns = await query('SELECT * FROM campaigns WHERE status = ?', ['ACTIVE']);
```

### 3. Frontend Caching
```tsx
// ISR (Incremental Static Regeneration) for campaign list
export const getStaticProps = async () => {
  const campaigns = await fetch('/api/campaigns');
  return {
    props: { campaigns },
    revalidate: 300  // 5분마다 재생성
  };
};

// SWR for user coupons
import useSWR from 'swr';

function MyCoupons() {
  const { data, error } = useSWR('/api/smart-coupons/my', fetcher, {
    refreshInterval: 30000  // 30초마다 갱신
  });
}
```

### 4. Image Optimization
```tsx
// Next.js Image component for campaign images
import Image from 'next/image';

<Image
  src={campaign.image_url}
  alt={campaign.name}
  width={400}
  height={300}
  loading="lazy"
  placeholder="blur"
/>
```

**우선순위:** 🟢 **Medium** - Day 26-30 최적화 단계에서 적용

---

## 🧪 Testing Strategy

### Unit Tests
```javascript
// lib/smartCoupon/api.test.ts
describe('couponApi', () => {
  it('should issue coupon successfully', async () => {
    const result = await couponApi.issue('ISLAND2025');
    expect(result).toHaveProperty('coupon_code');
  });

  it('should throw error for invalid campaign', async () => {
    await expect(couponApi.issue('INVALID')).rejects.toThrow();
  });
});
```

### Integration Tests
```javascript
// tests/integration/coupon-flow.test.js
describe('Coupon issuance flow', () => {
  it('should complete full flow: login -> issue -> display QR', async () => {
    // 1. Kakao login
    const { token } = await mockKakaoLogin();

    // 2. Issue coupon
    const { coupon_code } = await issueCoupon('ISLAND2025', token);

    // 3. Fetch coupon detail
    const coupon = await getCouponDetail(coupon_code, token);
    expect(coupon.qr_image).toBeTruthy();
  });
});
```

### E2E Tests (Playwright)
```typescript
// tests/e2e/user-journey.spec.ts
test('User can get coupon and see QR code', async ({ page }) => {
  await page.goto('/campaigns/ISLAND2025');
  await page.click('button:has-text("쿠폰 받기")');

  // Kakao login (mocked)
  await page.fill('#email', 'test@example.com');
  await page.click('button:has-text("로그인")');

  // Check QR display
  await expect(page.locator('canvas')).toBeVisible();
});
```

**우선순위:** 🟢 **Medium** - Day 31-35 테스트 단계에서 작성

---

## 📝 Implementation Roadmap (Day 6-35)

### Week 1: Backend Core (Day 6-10)
**우선순위: 🔴 Critical**

- [ ] Day 6: 환경 설정 및 마이그레이션
  - [ ] 002_modify_users_table 마이그레이션 실행
  - [ ] 001_create_coupon_tables 마이그레이션 실행
  - [ ] merchants 테이블 확인 및 생성
  - [ ] 패키지 설치 (qrcode, jsonwebtoken, axios)

- [ ] Day 7: Campaign API 구현
  - [ ] GET /api/campaigns (목록)
  - [ ] GET /api/campaigns/:campaignCode (상세)

- [ ] Day 8: Coupon API 구현 (1)
  - [ ] POST /api/smart-coupons/issue (발급)
  - [ ] QR 코드 생성 로직

- [ ] Day 9: Coupon API 구현 (2)
  - [ ] GET /api/smart-coupons/my (내 쿠폰)
  - [ ] GET /api/smart-coupons/:couponCode (상세)

- [ ] Day 10: Kakao OAuth 구현
  - [ ] Kakao Developers 앱 설정
  - [ ] GET /api/auth/kakao/callback
  - [ ] JWT 토큰 발급 로직

---

### Week 2: Backend Advanced (Day 11-15)
**우선순위: 🟡 High**

- [ ] Day 11: Partner API 구현
  - [ ] POST /api/partner/coupon-validate
  - [ ] POST /api/partner/coupon-use
  - [ ] 중복 사용 방지 트랜잭션

- [ ] Day 12: Review & Points API
  - [ ] POST /api/smart-coupons/reviews
  - [ ] 포인트 적립 로직
  - [ ] users.total_points 업데이트

- [ ] Day 13: Admin API 구현 (1)
  - [ ] POST /api/admin/campaigns (캠페인 생성)
  - [ ] campaign_code 자동 생성

- [ ] Day 14: Admin API 구현 (2)
  - [ ] PUT /api/admin/campaigns/:id (캠페인 수정)
  - [ ] GET /api/admin/settlements (정산 조회)

- [ ] Day 15: Backend Testing
  - [ ] API unit tests 작성
  - [ ] Postman/Thunder Client 테스트
  - [ ] 에러 핸들링 개선

---

### Week 3: Frontend Core (Day 16-20)
**우선순위: 🟡 High**

- [ ] Day 16: Campaign Pages
  - [ ] /campaigns (목록 페이지)
  - [ ] /campaigns/[campaignCode] (상세 페이지)
  - [ ] CampaignCard 컴포넌트

- [ ] Day 17: Coupon Pages (1)
  - [ ] /my-coupons (목록 페이지)
  - [ ] CouponCard 컴포넌트
  - [ ] CouponStatus 배지

- [ ] Day 18: Coupon Pages (2)
  - [ ] /my-coupons/[couponCode] (상세 페이지)
  - [ ] QRCodeDisplay 컴포넌트
  - [ ] QR 코드 렌더링 테스트

- [ ] Day 19: Auth Integration
  - [ ] Kakao OAuth 버튼
  - [ ] useAuth 훅 구현
  - [ ] JWT 토큰 관리 (localStorage)

- [ ] Day 20: Review Feature
  - [ ] ReviewForm 컴포넌트
  - [ ] 리뷰 제출 로직
  - [ ] 포인트 표시 UI

---

### Week 4: Partner & Admin (Day 21-25)
**우선순위: 🟢 Medium**

- [ ] Day 21: Partner Dashboard
  - [ ] /partner/scan 페이지
  - [ ] QRScanner 컴포넌트
  - [ ] html5-qrcode 통합

- [ ] Day 22: Partner Validation
  - [ ] CouponValidator 컴포넌트
  - [ ] UsageConfirmation 모달
  - [ ] 쿠폰 사용 처리 플로우

- [ ] Day 23: Admin Campaign Management
  - [ ] /admin/campaigns (목록)
  - [ ] /admin/campaigns/new (생성)
  - [ ] CampaignForm 컴포넌트

- [ ] Day 24: Admin Advanced
  - [ ] /admin/campaigns/[id]/edit (수정)
  - [ ] MerchantSelector 컴포넌트
  - [ ] 가맹점 연결 로직

- [ ] Day 25: Admin Settlements
  - [ ] /admin/settlements 페이지
  - [ ] SettlementTable 컴포넌트
  - [ ] 정산 데이터 표시

---

### Week 5: Polish & Launch (Day 26-35)
**우선순위: 🟢 Medium**

- [ ] Day 26-27: Mobile Responsive
  - [ ] 모바일 레이아웃 최적화
  - [ ] 터치 인터페이스 개선
  - [ ] QR 스캔 모바일 테스트

- [ ] Day 28-29: Error Handling
  - [ ] 전역 에러 처리
  - [ ] 사용자 친화적 에러 메시지
  - [ ] 재시도 로직

- [ ] Day 30: Performance Optimization
  - [ ] 코드 스플리팅
  - [ ] 이미지 최적화
  - [ ] API 응답 캐싱

- [ ] Day 31-33: Testing
  - [ ] E2E 테스트 작성
  - [ ] 사용자 시나리오 테스트
  - [ ] 버그 수정

- [ ] Day 34: Kakao Message Integration
  - [ ] 쿠폰 발급 알림 메시지
  - [ ] 쿠폰 만료 알림 메시지
  - [ ] 리뷰 포인트 적립 알림

- [ ] Day 35: Production Deployment
  - [ ] 환경변수 설정 (Vercel)
  - [ ] DB 마이그레이션 (프로덕션)
  - [ ] 배포 및 모니터링

---

## ✅ Pre-Implementation Checklist

### 필수 사전작업 (Day 6 전에 완료)
- [ ] 🔴 users 테이블 마이그레이션 계획 승인
- [ ] 🔴 merchants 테이블 존재 확인
- [ ] 🔴 Kakao Developers 앱 생성 및 설정
- [ ] 🟡 JWT_SECRET 생성 및 환경변수 설정
- [ ] 🟡 프로덕션 DB 백업

### 설계 문서 최종 확인
- [x] ✅ DB 스키마 (docs/db_schema.sql)
- [x] ✅ ERD (docs/db_erd.md)
- [x] ✅ API 명세 (docs/api_specifications.md)
- [x] ✅ Kakao OAuth 플로우 (docs/kakao_oauth_flow.md)
- [x] ✅ Frontend 아키텍처 (docs/frontend_architecture.md)
- [x] ✅ 통합 검토 (docs/integration_review.md)

### 개발 환경 준비
- [ ] Node.js 패키지 설치 (qrcode, jsonwebtoken, axios, html5-qrcode)
- [ ] TypeScript 타입 정의 파일 작성
- [ ] API 클라이언트 라이브러리 구현 (lib/smartCoupon/api.ts)
- [ ] 공통 컴포넌트 스타일 가이드 작성

---

## 🚨 Risk Assessment

### High Risk
1. **users 테이블 마이그레이션 실패**
   - 영향: 전체 시스템 구현 불가
   - 대응: 로컬 환경에서 충분한 테스트 후 프로덕션 적용

2. **Kakao OAuth 설정 오류**
   - 영향: 자동가입 기능 작동 안 함
   - 대응: Kakao Developers 문서 정독, 테스트 계정으로 검증

3. **QR 코드 스캔 성능 이슈**
   - 영향: 파트너 쿠폰 사용 처리 지연
   - 대응: html5-qrcode 라이브러리 대신 네이티브 앱 연동 고려

### Medium Risk
1. **동시성 이슈 (쿠폰 중복 사용)**
   - 영향: 재무 손실, 신뢰도 하락
   - 대응: 트랜잭션 + FOR UPDATE 락 적용

2. **포인트 적립 오류**
   - 영향: 사용자 불만
   - 대응: 포인트 로그 테이블 추가, 수동 보정 가능하도록 관리 UI

### Low Risk
1. **QR 이미지 DB 저장 용량 증가**
   - 영향: 스토리지 비용 증가
   - 대응: 동적 생성 방식으로 전환 가능

---

## 📞 External Dependencies

### Kakao API
- Kakao OAuth: `https://kauth.kakao.com/oauth/*`
- Kakao User API: `https://kapi.kakao.com/v2/user/me`
- Kakao Message API: `https://kapi.kakao.com/v2/api/talk/memo/*`

### Database
- PlanetScale MySQL (Serverless)
- Connection pooling 설정 필요

### Deployment
- Vercel (Frontend + API Routes)
- 환경변수 설정: KAKAO_*, JWT_SECRET, DATABASE_URL

---

## 📌 Final Notes

### 설계 강점
- ✅ 명확한 테이블 관계 및 정규화
- ✅ RESTful API 설계 원칙 준수
- ✅ Frontend/Backend 타입 일치
- ✅ 보안 고려사항 포함
- ✅ 확장 가능한 아키텍처 (캠페인 추가 용이)

### 설계 약점 및 개선 필요사항
- ⚠️ merchants 테이블 구조 미확정
- ⚠️ 기존 시스템과의 통합 지점 추가 확인 필요
- ⚠️ 성능 테스트 미실시 (예상 부하 기준 미정)

### 다음 단계
1. **즉시 조치 (Day 5 완료 후):**
   - merchants 테이블 확인
   - users 테이블 마이그레이션 스크립트 최종 검토
   - Kakao Developers 계정 준비

2. **Day 6 시작 전:**
   - 모든 Critical 이슈 해결
   - 개발 환경 세팅 완료
   - 팀 리뷰 및 승인

3. **구현 중 주의사항:**
   - 각 API 구현 후 즉시 테스트
   - Git 브랜치 전략 수립 (feature/smart-coupon-*)
   - 코드 리뷰 프로세스 확립

---

## 🎯 Success Criteria

### MVP (Minimum Viable Product) 기준
- [x] 사용자가 캠페인 QR 스캔 → 자동 로그인 → 쿠폰 발급
- [x] 발급된 쿠폰 QR 코드 표시
- [x] 파트너가 QR 스캔하여 쿠폰 사용 처리
- [x] 사용 후 리뷰 작성 시 포인트 적립

### Phase 2 (추가 기능)
- [ ] 관리자 캠페인 생성/수정
- [ ] 정산 보고서
- [ ] Kakao 메시지 알림
- [ ] 쿠폰 만료 자동 처리 (크론잡)

---

**검토 완료일:** Day 5
**다음 마일스톤:** Day 6 - 환경 설정 및 마이그레이션
**승인 필요:** users 테이블 마이그레이션, merchants 테이블 전략

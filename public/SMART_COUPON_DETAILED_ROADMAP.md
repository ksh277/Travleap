# 스마트 쿠폰 시스템 - 초상세 35일 구현 로드맵

## 📋 전체 개요

**목표**: 지역 통합 스마트 쿠폰 시스템 구축 (예: 가고싶은섬 캠페인)
**기간**: 35일 (5주)
**핵심 기능**: 캠페인 생성 → QR 발급 → 사용자 쿠폰 수령 → 가맹점 QR 스캔 → 할인 적용 → 리뷰/포인트 → 정산

---

# Phase 1: 기획 및 설계 (Day 1-5)

## Day 1: 데이터베이스 스키마 설계 및 검토

### 작업 목표
완전한 DB 스키마를 설계하고 모든 테이블 간 관계를 명확히 정의

### 세부 작업

#### 1-1. 테이블 설계 (3시간)

**campaigns (캠페인) 테이블**
```sql
CREATE TABLE campaigns (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '캠페인 ID',
  name VARCHAR(255) NOT NULL COMMENT '캠페인 이름 (예: 2025 가고싶은섬)',
  campaign_code VARCHAR(50) UNIQUE NOT NULL COMMENT '캠페인 코드 (예: ISLAND2025)',
  description TEXT COMMENT '캠페인 설명',
  public_qr_url VARCHAR(500) COMMENT '공용 QR URL (랜딩페이지)',
  public_qr_image TEXT COMMENT 'Base64 QR 이미지',

  -- 기간 설정
  valid_from DATETIME NOT NULL COMMENT '캠페인 시작일시',
  valid_to DATETIME NOT NULL COMMENT '캠페인 종료일시',

  -- 상태 관리
  status ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED') DEFAULT 'DRAFT' COMMENT '캠페인 상태',

  -- 발급/사용 통계
  max_issuance INT DEFAULT NULL COMMENT '최대 발급 수량 (NULL = 무제한)',
  total_issued INT DEFAULT 0 COMMENT '총 발급된 쿠폰 수',
  total_used INT DEFAULT 0 COMMENT '총 사용된 쿠폰 수',

  -- 메타데이터
  created_by BIGINT COMMENT '생성한 관리자 ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_campaign_code (campaign_code),
  INDEX idx_status (status),
  INDEX idx_valid_dates (valid_from, valid_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='쿠폰 캠페인';
```

**user_coupons (사용자 쿠폰) 테이블**
```sql
CREATE TABLE user_coupons (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '사용자 쿠폰 ID',
  user_id BIGINT NOT NULL COMMENT '사용자 ID (users 테이블)',
  campaign_id BIGINT NOT NULL COMMENT '캠페인 ID (campaigns 테이블)',

  -- 쿠폰 고유 정보
  coupon_code VARCHAR(50) UNIQUE NOT NULL COMMENT '개인 쿠폰 코드 (예: ISLAND2025-A3F5D8)',
  qr_url VARCHAR(500) COMMENT '개인 QR URL',
  qr_image TEXT COMMENT 'Base64 QR 이미지',

  -- 상태 관리
  status ENUM('ACTIVE', 'USED', 'EXPIRED', 'REVOKED') DEFAULT 'ACTIVE' COMMENT '쿠폰 상태',

  -- 발급 정보
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '발급 일시',
  expires_at TIMESTAMP NULL COMMENT '만료 일시 (캠페인 종료일)',

  -- 사용 정보
  used_at TIMESTAMP NULL COMMENT '사용 일시',
  used_merchant_id BIGINT NULL COMMENT '사용된 가맹점 ID',
  used_partner_id BIGINT NULL COMMENT '승인한 파트너 ID',
  usage_log_id BIGINT NULL COMMENT '사용 로그 ID',

  -- 리뷰 정보
  review_submitted BOOLEAN DEFAULT FALSE COMMENT '리뷰 작성 여부',
  review_points_awarded INT DEFAULT 0 COMMENT '지급된 리뷰 포인트',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_user_campaign (user_id, campaign_id) COMMENT '1인 1캠페인 1쿠폰',
  INDEX idx_coupon_code (coupon_code),
  INDEX idx_user_id (user_id),
  INDEX idx_campaign_id (campaign_id),
  INDEX idx_status (status),
  INDEX idx_used_merchant (used_merchant_id),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='사용자별 쿠폰';
```

**campaign_merchants (캠페인 가맹점) 테이블**
```sql
CREATE TABLE campaign_merchants (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  campaign_id BIGINT NOT NULL COMMENT '캠페인 ID',
  merchant_id BIGINT NOT NULL COMMENT '가맹점 ID',
  merchant_name VARCHAR(255) NOT NULL COMMENT '가맹점 이름',
  merchant_category VARCHAR(100) COMMENT '가맹점 카테고리 (음식점, 카페, 숙박 등)',

  -- 할인 규칙
  discount_type ENUM('PERCENT', 'AMOUNT') NOT NULL COMMENT '할인 타입 (퍼센트/금액)',
  discount_value DECIMAL(10,2) NOT NULL COMMENT '할인 값 (20 = 20% 또는 5000 = 5000원)',
  max_discount_amount DECIMAL(10,2) NULL COMMENT '최대 할인 금액',
  min_order_amount DECIMAL(10,2) DEFAULT 0 COMMENT '최소 주문 금액',

  -- 활성화 상태
  is_active BOOLEAN DEFAULT TRUE COMMENT '가맹점 활성화 여부',

  -- 사용 통계
  total_usage_count INT DEFAULT 0 COMMENT '총 사용 횟수',
  total_discount_amount DECIMAL(12,2) DEFAULT 0 COMMENT '총 할인 금액',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_campaign_merchant (campaign_id, merchant_id),
  INDEX idx_campaign_id (campaign_id),
  INDEX idx_merchant_id (merchant_id),

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='캠페인별 가맹점 할인 규칙';
```

**coupon_usage_logs (쿠폰 사용 로그) 테이블**
```sql
CREATE TABLE coupon_usage_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_coupon_id BIGINT NOT NULL COMMENT '사용자 쿠폰 ID',
  user_id BIGINT NOT NULL COMMENT '사용자 ID',
  campaign_id BIGINT NOT NULL COMMENT '캠페인 ID',
  merchant_id BIGINT NOT NULL COMMENT '가맹점 ID',

  -- 승인 정보
  approved_by_partner_id BIGINT NOT NULL COMMENT '승인한 파트너 ID',
  approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '승인 일시',

  -- 주문 정보
  order_amount DECIMAL(10,2) NOT NULL COMMENT '주문 금액',
  discount_amount DECIMAL(10,2) NOT NULL COMMENT '할인 금액',
  final_amount DECIMAL(10,2) NOT NULL COMMENT '최종 결제 금액',

  -- 정산 정보
  settlement_status ENUM('PENDING', 'COMPLETED', 'DISPUTED') DEFAULT 'PENDING' COMMENT '정산 상태',
  settlement_date DATE NULL COMMENT '정산 완료일',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_coupon (user_coupon_id),
  INDEX idx_campaign (campaign_id),
  INDEX idx_merchant (merchant_id),
  INDEX idx_approved_at (approved_at),
  INDEX idx_settlement_status (settlement_status),

  FOREIGN KEY (user_coupon_id) REFERENCES user_coupons(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='쿠폰 사용 내역';
```

**kakao_users (카카오 연동) 테이블**
```sql
CREATE TABLE kakao_users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT 'Travleap users.id',
  kakao_user_id BIGINT UNIQUE NOT NULL COMMENT '카카오 고유 ID',
  kakao_email VARCHAR(255) COMMENT '카카오 이메일',
  kakao_nickname VARCHAR(100) COMMENT '카카오 닉네임',
  kakao_profile_image VARCHAR(500) COMMENT '카카오 프로필 이미지',

  -- 토큰 정보
  kakao_access_token TEXT COMMENT '카카오 액세스 토큰',
  kakao_refresh_token TEXT COMMENT '카카오 리프레시 토큰',
  token_expires_at TIMESTAMP NULL COMMENT '토큰 만료 시간',

  -- 메시지 수신 동의
  message_agreed BOOLEAN DEFAULT FALSE COMMENT '카카오 메시지 수신 동의',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_user (user_id),
  INDEX idx_kakao_user_id (kakao_user_id),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='카카오 로그인 연동';
```

**coupon_reviews (쿠폰 리뷰) 테이블**
```sql
CREATE TABLE coupon_reviews (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_coupon_id BIGINT NOT NULL COMMENT '사용자 쿠폰 ID',
  user_id BIGINT NOT NULL COMMENT '작성자 ID',
  merchant_id BIGINT NOT NULL COMMENT '가맹점 ID',
  campaign_id BIGINT NOT NULL COMMENT '캠페인 ID',

  -- 리뷰 내용
  rating INT NOT NULL COMMENT '평점 (1-5)',
  review_text TEXT COMMENT '리뷰 내용',

  -- 포인트 지급
  points_awarded INT DEFAULT 0 COMMENT '지급된 포인트',
  points_awarded_at TIMESTAMP NULL COMMENT '포인트 지급 일시',

  -- 상태
  status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'APPROVED' COMMENT '리뷰 상태',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_user_coupon (user_coupon_id) COMMENT '쿠폰당 1개 리뷰',
  INDEX idx_user_id (user_id),
  INDEX idx_merchant_id (merchant_id),
  INDEX idx_campaign_id (campaign_id),
  INDEX idx_status (status),

  FOREIGN KEY (user_coupon_id) REFERENCES user_coupons(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='쿠폰 사용 후 리뷰';
```

**kakao_message_logs (카카오 메시지 로그) 테이블**
```sql
CREATE TABLE kakao_message_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '수신자 ID',
  kakao_user_id BIGINT NOT NULL COMMENT '카카오 유저 ID',

  -- 메시지 정보
  message_type ENUM('COUPON_ISSUED', 'COUPON_USED', 'REVIEW_REQUEST', 'POINTS_AWARDED') NOT NULL,
  template_id VARCHAR(50) COMMENT '템플릿 ID',

  -- 발송 결과
  status ENUM('SUCCESS', 'FAILED', 'PENDING') DEFAULT 'PENDING',
  error_message TEXT COMMENT '에러 메시지',

  -- 메타데이터
  related_coupon_id BIGINT COMMENT '관련 쿠폰 ID',
  related_campaign_id BIGINT COMMENT '관련 캠페인 ID',

  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_message_type (message_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='카카오 메시지 발송 로그';
```

#### 1-2. ERD 관계도 작성 (2시간)

**핵심 관계**:
- `campaigns` 1:N `user_coupons` (1개 캠페인 → 여러 사용자 쿠폰)
- `campaigns` 1:N `campaign_merchants` (1개 캠페인 → 여러 가맹점)
- `users` 1:N `user_coupons` (1명 사용자 → 여러 쿠폰)
- `user_coupons` 1:1 `coupon_usage_logs` (1개 쿠폰 → 1개 사용 로그)
- `user_coupons` 1:1 `coupon_reviews` (1개 쿠폰 → 1개 리뷰)
- `users` 1:1 `kakao_users` (1명 사용자 → 1개 카카오 연동)

**제약 조건**:
- 1인 1캠페인 1쿠폰: `UNIQUE(user_id, campaign_id)`
- 1쿠폰 1리뷰: `UNIQUE(user_coupon_id)` in `coupon_reviews`
- 쿠폰 코드 유일성: `UNIQUE(coupon_code)` in `user_coupons`

#### 1-3. 인덱스 최적화 계획 (1시간)

**필수 인덱스**:
```sql
-- 쿠폰 코드로 빠른 조회 (QR 스캔 시)
CREATE INDEX idx_coupon_code ON user_coupons(coupon_code);

-- 캠페인별 통계 조회
CREATE INDEX idx_campaign_status ON user_coupons(campaign_id, status);

-- 가맹점별 사용 내역 조회
CREATE INDEX idx_merchant_usage ON coupon_usage_logs(merchant_id, approved_at);

-- 정산 대상 조회
CREATE INDEX idx_settlement ON coupon_usage_logs(settlement_status, approved_at);

-- 사용자 쿠폰 목록 조회
CREATE INDEX idx_user_status ON user_coupons(user_id, status);
```

#### 1-4. 마이그레이션 롤백 계획 (1시간)

**up.sql**:
```sql
-- 전체 테이블 생성 순서 (외래키 의존성 고려)
1. campaigns
2. user_coupons
3. campaign_merchants
4. coupon_usage_logs
5. kakao_users
6. coupon_reviews
7. kakao_message_logs
```

**down.sql**:
```sql
-- 롤백 시 테이블 삭제 순서 (역순)
DROP TABLE IF EXISTS kakao_message_logs;
DROP TABLE IF EXISTS coupon_reviews;
DROP TABLE IF EXISTS kakao_users;
DROP TABLE IF EXISTS coupon_usage_logs;
DROP TABLE IF EXISTS campaign_merchants;
DROP TABLE IF EXISTS user_coupons;
DROP TABLE IF EXISTS campaigns;
```

### 완료 기준 (Definition of Done)
- [ ] 7개 테이블 DDL 작성 완료
- [ ] ERD 다이어그램 작성 완료 (draw.io 또는 dbdiagram.io)
- [ ] 인덱스 전략 문서화
- [ ] 마이그레이션 up/down 스크립트 작성
- [ ] 팀원과 DB 스키마 리뷰 완료

### 산출물
- `docs/db_schema.sql` - 전체 DDL
- `docs/db_erd.png` - ERD 다이어그램
- `scripts/migrations/001_create_coupon_tables_up.sql`
- `scripts/migrations/001_create_coupon_tables_down.sql`

---

## Day 2: API 엔드포인트 설계

### 작업 목표
모든 API 엔드포인트를 설계하고 요청/응답 스키마를 명확히 정의

### 세부 작업

#### 2-1. 캠페인 관리 API (2시간)

**GET /api/campaigns**
- **목적**: 활성 캠페인 목록 조회
- **권한**: Public
- **Query Parameters**:
  ```typescript
  {
    status?: 'ACTIVE' | 'ENDED' | 'ALL',
    page?: number,
    limit?: number
  }
  ```
- **Response**:
  ```typescript
  {
    success: true,
    data: {
      campaigns: [
        {
          id: 1,
          name: "2025 가고싶은섬",
          campaign_code: "ISLAND2025",
          description: "제주도 특별 할인 캠페인",
          valid_from: "2025-01-01T00:00:00Z",
          valid_to: "2025-12-31T23:59:59Z",
          status: "ACTIVE",
          total_issued: 1523,
          total_used: 847,
          merchant_count: 45
        }
      ],
      pagination: {
        total: 3,
        page: 1,
        limit: 10
      }
    }
  }
  ```

**GET /api/campaigns/:campaignCode**
- **목적**: 특정 캠페인 상세 정보 (랜딩페이지용)
- **권한**: Public
- **Response**:
  ```typescript
  {
    success: true,
    data: {
      campaign: {
        id: 1,
        name: "2025 가고싶은섬",
        campaign_code: "ISLAND2025",
        description: "제주도 내 45개 가맹점에서 사용 가능한 할인 쿠폰",
        public_qr_url: "https://travleap.com/coupon/ISLAND2025",
        public_qr_image: "data:image/png;base64,...",
        valid_from: "2025-01-01T00:00:00Z",
        valid_to: "2025-12-31T23:59:59Z",
        status: "ACTIVE",
        merchants: [
          {
            id: 5,
            name: "제주 맛집",
            category: "음식점",
            discount_type: "PERCENT",
            discount_value: 20,
            max_discount_amount: 5000
          }
        ]
      }
    }
  }
  ```

**POST /api/admin/campaigns** (관리자)
- **목적**: 새 캠페인 생성
- **권한**: Admin only
- **Request Body**:
  ```typescript
  {
    name: "2025 가고싶은섬",
    campaign_code: "ISLAND2025",
    description: "제주도 특별 할인",
    valid_from: "2025-01-01T00:00:00",
    valid_to: "2025-12-31T23:59:59",
    max_issuance: 10000,
    merchants: [
      {
        merchant_id: 5,
        merchant_name: "제주 맛집",
        discount_type: "PERCENT",
        discount_value: 20,
        max_discount_amount: 5000,
        min_order_amount: 10000
      }
    ]
  }
  ```
- **Response**:
  ```typescript
  {
    success: true,
    data: {
      campaign_id: 1,
      public_qr_url: "https://travleap.com/coupon/ISLAND2025",
      public_qr_image: "data:image/png;base64,..."
    }
  }
  ```

**PUT /api/admin/campaigns/:id** (관리자)
- **목적**: 캠페인 수정 (상태 변경, 기간 연장 등)
- **권한**: Admin only
- **Request Body**:
  ```typescript
  {
    status?: "ACTIVE" | "PAUSED" | "ENDED",
    valid_to?: "2025-12-31T23:59:59",
    max_issuance?: 15000
  }
  ```

#### 2-2. 쿠폰 발급 API (2시간)

**POST /api/smart-coupons/issue**
- **목적**: 사용자에게 쿠폰 발급 (카카오 로그인 후)
- **권한**: Authenticated user
- **Request Body**:
  ```typescript
  {
    campaign_id: 1,
    user_id: 123
  }
  ```
- **비즈니스 로직**:
  1. 캠페인 유효성 확인 (status=ACTIVE, 기간 내)
  2. 이미 발급 여부 확인 (1인 1캠페인 1쿠폰)
  3. 발급 수량 제한 확인 (max_issuance)
  4. 고유 쿠폰 코드 생성 (`CAMPAIGN_CODE-RANDOM6`)
  5. QR 코드 생성 (URL: `/coupon?code=ISLAND2025-A3F5D8`)
  6. DB 저장 (`user_coupons` INSERT)
  7. 캠페인 통계 업데이트 (`campaigns.total_issued++`)
  8. 카카오 메시지 발송 (선택)
- **Response**:
  ```typescript
  {
    success: true,
    data: {
      coupon_id: 1001,
      coupon_code: "ISLAND2025-A3F5D8",
      qr_url: "https://travleap.com/coupon?code=ISLAND2025-A3F5D8",
      qr_image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      campaign: {
        name: "2025 가고싶은섬",
        valid_from: "2025-01-01T00:00:00Z",
        valid_to: "2025-12-31T23:59:59Z"
      }
    },
    message: "쿠폰이 발급되었습니다!"
  }
  ```
- **에러 케이스**:
  ```typescript
  // 중복 발급
  { success: false, error: "이미 이 캠페인의 쿠폰을 보유하고 있습니다" }

  // 수량 초과
  { success: false, error: "캠페인 쿠폰이 모두 소진되었습니다" }

  // 기간 만료
  { success: false, error: "캠페인 기간이 종료되었습니다" }
  ```

**GET /api/smart-coupons/my**
- **목적**: 내 쿠폰 목록 조회
- **권한**: Authenticated user
- **Query Parameters**:
  ```typescript
  {
    status?: 'ACTIVE' | 'USED' | 'EXPIRED',
    page?: number,
    limit?: number
  }
  ```
- **Response**:
  ```typescript
  {
    success: true,
    data: {
      coupons: [
        {
          id: 1001,
          coupon_code: "ISLAND2025-A3F5D8",
          qr_url: "https://travleap.com/coupon?code=ISLAND2025-A3F5D8",
          qr_image: "data:image/png;base64,...",
          status: "ACTIVE",
          campaign: {
            name: "2025 가고싶은섬",
            description: "제주도 45개 가맹점",
            valid_to: "2025-12-31T23:59:59Z"
          },
          issued_at: "2025-01-15T10:30:00Z",
          expires_at: "2025-12-31T23:59:59Z"
        }
      ],
      pagination: {
        total: 3,
        page: 1,
        limit: 10
      }
    }
  }
  ```

**GET /api/smart-coupons/:couponCode**
- **목적**: 쿠폰 상세 정보 (본인 쿠폰만)
- **권한**: Authenticated user
- **Response**:
  ```typescript
  {
    success: true,
    data: {
      coupon: {
        id: 1001,
        coupon_code: "ISLAND2025-A3F5D8",
        qr_image: "data:image/png;base64,...",
        status: "ACTIVE",
        campaign: {
          name: "2025 가고싶은섬",
          description: "제주도 내 45개 가맹점에서 사용 가능"
        },
        usage_info: null,  // 미사용 시 null
        review_submitted: false
      }
    }
  }

  // 사용된 쿠폰인 경우
  {
    success: true,
    data: {
      coupon: {
        id: 1001,
        status: "USED",
        usage_info: {
          merchant_name: "제주 맛집",
          used_at: "2025-02-01T18:30:00Z",
          order_amount: 25000,
          discount_amount: 5000,
          final_amount: 20000
        },
        review_submitted: true
      }
    }
  }
  ```

#### 2-3. 파트너 쿠폰 사용 API (2시간)

**POST /api/partner/coupon-validate**
- **목적**: QR 스캔 후 쿠폰 유효성 확인 (승인 전)
- **권한**: Partner only
- **Request Body**:
  ```typescript
  {
    coupon_code: "ISLAND2025-A3F5D8",
    merchant_id: 5
  }
  ```
- **비즈니스 로직**:
  1. 쿠폰 존재 여부 확인
  2. 쿠폰 상태 확인 (status=ACTIVE)
  3. 가맹점이 캠페인에 포함되어 있는지 확인
  4. 할인 규칙 조회
- **Response (성공)**:
  ```typescript
  {
    success: true,
    data: {
      valid: true,
      coupon: {
        coupon_code: "ISLAND2025-A3F5D8",
        user_name: "김철수",
        campaign_name: "2025 가고싶은섬"
      },
      discount_rule: {
        discount_type: "PERCENT",
        discount_value: 20,
        max_discount_amount: 5000,
        min_order_amount: 10000
      }
    }
  }
  ```
- **Response (실패)**:
  ```typescript
  // 쿠폰이 이미 사용됨
  {
    success: false,
    data: { valid: false },
    error: "이미 사용된 쿠폰입니다",
    used_at: "2025-02-01T18:30:00Z",
    used_merchant: "다른 식당"
  }

  // 가맹점이 캠페인에 미포함
  {
    success: false,
    data: { valid: false },
    error: "이 가맹점에서는 사용할 수 없는 쿠폰입니다"
  }
  ```

**POST /api/partner/coupon-use**
- **목적**: 쿠폰 사용 승인 (할인 적용)
- **권한**: Partner only
- **Request Body**:
  ```typescript
  {
    coupon_code: "ISLAND2025-A3F5D8",
    merchant_id: 5,
    partner_id: 42,
    order_amount: 23000  // 주문 금액
  }
  ```
- **비즈니스 로직**:
  1. 재검증 (다시 한번 유효성 확인)
  2. 할인 금액 계산
     - PERCENT: `discount = min(order_amount * (discount_value/100), max_discount_amount)`
     - AMOUNT: `discount = discount_value`
  3. 최소 주문 금액 확인
  4. 최종 결제 금액 계산
  5. DB 트랜잭션 시작
     - `user_coupons` UPDATE (status=USED, used_at, used_merchant_id)
     - `coupon_usage_logs` INSERT
     - `campaigns` UPDATE (total_used++)
     - `campaign_merchants` UPDATE (total_usage_count++, total_discount_amount+=)
  6. 카카오 메시지 발송 (사용 확인 + 리뷰 요청)
  7. 트랜잭션 COMMIT
- **Response**:
  ```typescript
  {
    success: true,
    data: {
      order_amount: 23000,
      discount_amount: 4600,  // 20% = 4600원
      final_amount: 18400,
      usage_log_id: 501
    },
    message: "쿠폰이 사용되었습니다"
  }
  ```
- **에러 케이스**:
  ```typescript
  // 최소 주문 금액 미달
  {
    success: false,
    error: "최소 주문 금액은 10,000원입니다",
    min_order_amount: 10000,
    current_amount: 8000
  }
  ```

#### 2-4. 리뷰 및 포인트 API (1시간)

**POST /api/smart-coupons/reviews**
- **목적**: 쿠폰 사용 후 리뷰 작성
- **권한**: Authenticated user
- **Request Body**:
  ```typescript
  {
    user_coupon_id: 1001,
    rating: 5,
    review_text: "음식이 정말 맛있었어요!"
  }
  ```
- **비즈니스 로직**:
  1. 쿠폰 상태 확인 (status=USED)
  2. 이미 리뷰 작성 여부 확인
  3. 리뷰 저장
  4. 포인트 지급 (예: 500P)
  5. `users` 테이블 포인트 업데이트
  6. `user_coupons` UPDATE (review_submitted=TRUE, review_points_awarded=500)
- **Response**:
  ```typescript
  {
    success: true,
    data: {
      review_id: 301,
      points_awarded: 500
    },
    message: "리뷰가 등록되고 500P가 지급되었습니다!"
  }
  ```

### 완료 기준
- [ ] 15개 API 엔드포인트 명세 작성
- [ ] 각 API별 요청/응답 스키마 정의
- [ ] 에러 케이스 정의
- [ ] Postman Collection 생성

### 산출물
- `docs/api_specifications.md` - 전체 API 명세
- `postman/smart_coupons.json` - Postman Collection

---

## Day 3: 카카오 OAuth 통합 설계

### 작업 목표
카카오 로그인 및 자동 회원가입 플로우 설계

### 세부 작업

#### 3-1. 카카오 OAuth 플로우 설계 (3시간)

**기본 플로우**:
```
1. 사용자가 캠페인 랜딩페이지 접속
   URL: /coupon/ISLAND2025

2. "쿠폰 받기" 버튼 클릭
   → 로그인 여부 확인

3-A. 로그인 안 되어 있으면
   → 카카오 로그인 페이지로 리다이렉트
   → URL: https://kauth.kakao.com/oauth/authorize?
           client_id=${KAKAO_REST_API_KEY}&
           redirect_uri=${REDIRECT_URI}&
           response_type=code&
           state=${CAMPAIGN_CODE}

4. 카카오 인증 완료 후 콜백
   → GET /api/auth/kakao/callback?code=ABC123&state=ISLAND2025

5. 백엔드에서 처리:
   a) 인가 코드로 액세스 토큰 요청
   b) 액세스 토큰으로 사용자 정보 조회
   c) kakao_users 테이블에서 기존 사용자 확인

6-A. 신규 사용자인 경우:
   a) users 테이블에 새 계정 생성
      - email: 카카오 이메일
      - name: 카카오 닉네임
      - auth_provider: 'kakao'
   b) kakao_users 테이블에 연동 정보 저장
   c) JWT 토큰 생성

6-B. 기존 사용자인 경우:
   a) 토큰 갱신
   b) JWT 토큰 생성

7. 프론트엔드로 리다이렉트
   → URL: /coupon/ISLAND2025?token=JWT_TOKEN&auto_issue=true

8. 자동으로 쿠폰 발급 API 호출
   → POST /api/smart-coupons/issue

9. 발급 완료 페이지 표시
   → 내 쿠폰 페이지로 이동
```

**카카오 API 엔드포인트**:
```typescript
// 1. 토큰 요청
POST https://kauth.kakao.com/oauth/token
Headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
Body: {
  grant_type: 'authorization_code',
  client_id: KAKAO_REST_API_KEY,
  redirect_uri: REDIRECT_URI,
  code: AUTHORIZATION_CODE
}
Response: {
  access_token: "...",
  refresh_token: "...",
  expires_in: 21599
}

// 2. 사용자 정보 조회
GET https://kapi.kakao.com/v2/user/me
Headers: { 'Authorization': 'Bearer ACCESS_TOKEN' }
Response: {
  id: 1234567890,
  kakao_account: {
    email: "user@example.com",
    profile: {
      nickname: "홍길동",
      profile_image_url: "https://..."
    }
  }
}
```

#### 3-2. 자동 회원가입 로직 (2시간)

**구현 파일**: `api/auth/kakao/callback.js`

```javascript
module.exports = async function handler(req, res) {
  const { code, state } = req.query;  // state = campaign_code

  try {
    // 1. 액세스 토큰 획득
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_REST_API_KEY,
        redirect_uri: process.env.KAKAO_REDIRECT_URI,
        code: code
      })
    });
    const tokenData = await tokenResponse.json();

    // 2. 사용자 정보 조회
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    const kakaoUser = await userResponse.json();

    // 3. DB에서 기존 사용자 확인
    const existingKakaoUser = await connection.execute(
      'SELECT user_id FROM kakao_users WHERE kakao_user_id = ?',
      [kakaoUser.id]
    );

    let userId;

    if (existingKakaoUser.rows.length > 0) {
      // 기존 사용자
      userId = existingKakaoUser.rows[0].user_id;

      // 토큰 업데이트
      await connection.execute(`
        UPDATE kakao_users
        SET kakao_access_token = ?,
            kakao_refresh_token = ?,
            token_expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND)
        WHERE kakao_user_id = ?
      `, [tokenData.access_token, tokenData.refresh_token, tokenData.expires_in, kakaoUser.id]);

    } else {
      // 신규 사용자 - 자동 회원가입

      // users 테이블에 계정 생성
      const userResult = await connection.execute(`
        INSERT INTO users (email, name, auth_provider, created_at)
        VALUES (?, ?, 'kakao', NOW())
      `, [kakaoUser.kakao_account.email, kakaoUser.kakao_account.profile.nickname]);

      userId = userResult.insertId;

      // kakao_users 테이블에 연동 정보 저장
      await connection.execute(`
        INSERT INTO kakao_users (
          user_id, kakao_user_id, kakao_email, kakao_nickname,
          kakao_profile_image, kakao_access_token, kakao_refresh_token,
          token_expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))
      `, [
        userId,
        kakaoUser.id,
        kakaoUser.kakao_account.email,
        kakaoUser.kakao_account.profile.nickname,
        kakaoUser.kakao_account.profile.profile_image_url,
        tokenData.access_token,
        tokenData.refresh_token,
        tokenData.expires_in
      ]);

      console.log(`✅ 카카오 자동 회원가입 완료: user_id=${userId}`);
    }

    // 4. JWT 토큰 생성
    const jwtToken = jwt.sign(
      { userId: userId, email: kakaoUser.kakao_account.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5. 프론트엔드로 리다이렉트 (state에 campaign_code 포함)
    const redirectUrl = state
      ? `/coupon/${state}?token=${jwtToken}&auto_issue=true`
      : `/my-coupons?token=${jwtToken}`;

    res.redirect(redirectUrl);

  } catch (error) {
    console.error('카카오 로그인 오류:', error);
    res.redirect('/error?message=login_failed');
  }
};
```

#### 3-3. 카카오 메시지 전송 설계 (2시간)

**메시지 템플릿 종류**:
1. 쿠폰 발급 알림
2. 쿠폰 사용 완료 알림
3. 리뷰 작성 요청
4. 포인트 지급 알림

**템플릿 1: 쿠폰 발급 알림**
```javascript
// api/kakao/send-message.js
async function sendCouponIssuedMessage(userId, couponData) {
  const kakaoUser = await getKakaoUser(userId);

  const messageData = {
    receiver_uuids: [kakaoUser.kakao_user_id],
    template_object: {
      object_type: 'feed',
      content: {
        title: '🎉 쿠폰이 발급되었습니다!',
        description: `${couponData.campaign_name}\n유효기간: ${couponData.valid_to}까지`,
        image_url: 'https://travleap.com/images/coupon-issued.png',
        link: {
          web_url: `https://travleap.com/my-coupons`,
          mobile_web_url: `https://travleap.com/my-coupons`
        }
      },
      buttons: [
        {
          title: '내 쿠폰 보기',
          link: {
            web_url: `https://travleap.com/my-coupons`,
            mobile_web_url: `https://travleap.com/my-coupons`
          }
        }
      ]
    }
  };

  const response = await fetch('https://kapi.kakao.com/v1/api/talk/friends/message/default/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${kakaoUser.kakao_access_token}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      template_object: JSON.stringify(messageData.template_object)
    })
  });

  // 로그 저장
  await logKakaoMessage(userId, 'COUPON_ISSUED', response.ok ? 'SUCCESS' : 'FAILED');
}
```

**템플릿 3: 리뷰 작성 요청**
```javascript
async function sendReviewRequestMessage(userId, usageData) {
  const messageData = {
    template_object: {
      object_type: 'feed',
      content: {
        title: '⭐ 이용 후기를 남겨주세요!',
        description: `${usageData.merchant_name}에서 쿠폰 사용\n리뷰 작성 시 500P 적립`,
        image_url: 'https://travleap.com/images/review-request.png',
        link: {
          web_url: `https://travleap.com/coupons/${usageData.coupon_id}/review`,
          mobile_web_url: `https://travleap.com/coupons/${usageData.coupon_id}/review`
        }
      },
      buttons: [
        {
          title: '리뷰 작성하고 500P 받기',
          link: {
            web_url: `https://travleap.com/coupons/${usageData.coupon_id}/review`
          }
        }
      ]
    }
  };

  // 전송 로직 동일
}
```

### 완료 기준
- [ ] 카카오 OAuth 플로우 다이어그램 완성
- [ ] 자동 회원가입 로직 설계 완료
- [ ] 카카오 메시지 템플릿 4종 설계
- [ ] 환경변수 목록 정리 (KAKAO_REST_API_KEY, KAKAO_REDIRECT_URI 등)

### 산출물
- `docs/kakao_oauth_flow.md` - 플로우 설명서
- `docs/kakao_message_templates.md` - 메시지 템플릿 명세

---

## Day 4: 프론트엔드 아키텍처 설계

### 작업 목표
전체 페이지 구조, 컴포넌트 계층, 라우팅 설계

### 세부 작업

#### 4-1. 페이지 구조 설계 (3시간)

**전체 페이지 목록**:
```
1. 캠페인 랜딩페이지
   - URL: /coupon/:campaignCode
   - 목적: 캠페인 소개, 쿠폰 발급
   - 컴포넌트: CampaignLandingPage

2. 내 쿠폰 목록
   - URL: /my-coupons
   - 목적: 내가 보유한 쿠폰 목록
   - 컴포넌트: MyCouponsPage

3. 쿠폰 상세
   - URL: /coupons/:couponCode
   - 목적: QR 코드 표시, 사용 내역
   - 컴포넌트: CouponDetailPage

4. 파트너 QR 스캐너
   - URL: /partner/qr-scanner
   - 목적: QR 스캔 및 쿠폰 승인
   - 컴포넌트: PartnerQRScannerPage

5. 파트너 대시보드
   - URL: /partner/dashboard
   - 목적: 쿠폰 사용 내역, 정산 정보
   - 컴포넌트: PartnerDashboardPage

6. 리뷰 작성
   - URL: /coupons/:couponId/review
   - 목적: 쿠폰 사용 후 리뷰 작성
   - 컴포넌트: CouponReviewPage

7. 관리자 캠페인 관리
   - URL: /admin/campaigns
   - 목적: 캠페인 생성/수정/통계
   - 컴포넌트: AdminCampaignsPage

8. 관리자 정산 관리
   - URL: /admin/settlements
   - 목적: 가맹점별 정산 내역
   - 컴포넌트: AdminSettlementsPage
```

**폴더 구조**:
```
pages/
├── coupon/
│   └── [campaignCode].tsx         # 캠페인 랜딩페이지
├── my-coupons.tsx                 # 내 쿠폰 목록
├── coupons/
│   ├── [couponCode].tsx           # 쿠폰 상세
│   └── [couponId]/
│       └── review.tsx             # 리뷰 작성
├── partner/
│   ├── qr-scanner.tsx             # QR 스캐너
│   └── dashboard.tsx              # 파트너 대시보드
└── admin/
    ├── campaigns.tsx              # 캠페인 관리
    └── settlements.tsx            # 정산 관리

components/
├── smart-coupons/
│   ├── CampaignCard.tsx           # 캠페인 카드
│   ├── CouponCard.tsx             # 쿠폰 카드
│   ├── QRCodeDisplay.tsx          # QR 코드 표시
│   ├── QRScanner.tsx              # QR 스캐너 (react-qr-reader)
│   ├── CouponValidationModal.tsx # 쿠폰 검증 모달
│   ├── UsageApprovalModal.tsx    # 사용 승인 모달
│   └── ReviewForm.tsx             # 리뷰 폼
└── admin/
    ├── CampaignForm.tsx           # 캠페인 생성/수정 폼
    ├── MerchantRuleEditor.tsx     # 가맹점 규칙 편집기
    └── SettlementTable.tsx        # 정산 테이블
```

#### 4-2. 컴포넌트 상세 설계 (4시간)

**1. CampaignLandingPage** (`pages/coupon/[campaignCode].tsx`)
```typescript
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import QRCodeDisplay from '@/components/smart-coupons/QRCodeDisplay';

interface Campaign {
  id: number;
  name: string;
  description: string;
  public_qr_url: string;
  public_qr_image: string;
  valid_from: string;
  valid_to: string;
  merchants: Merchant[];
}

interface Merchant {
  name: string;
  category: string;
  discount_type: 'PERCENT' | 'AMOUNT';
  discount_value: number;
}

export default function CampaignLandingPage() {
  const router = useRouter();
  const { campaignCode, auto_issue } = router.query;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 캠페인 정보 로드
    fetchCampaign();

    // 로그인 상태 확인
    checkAuth();

    // auto_issue=true이면 자동 발급
    if (auto_issue === 'true' && isLoggedIn) {
      issueCoupon();
    }
  }, [campaignCode, auto_issue]);

  const fetchCampaign = async () => {
    const res = await fetch(`/api/campaigns/${campaignCode}`);
    const data = await res.json();
    setCampaign(data.data.campaign);
  };

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  };

  const handleIssueCoupon = async () => {
    if (!isLoggedIn) {
      // 카카오 로그인으로 리다이렉트
      const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}&redirect_uri=${process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI}&response_type=code&state=${campaignCode}`;
      window.location.href = kakaoAuthUrl;
      return;
    }

    await issueCoupon();
  };

  const issueCoupon = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/smart-coupons/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          campaign_id: campaign.id,
          user_id: getCurrentUserId()
        })
      });

      const data = await res.json();

      if (data.success) {
        alert('쿠폰이 발급되었습니다!');
        router.push('/my-coupons');
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('쿠폰 발급 실패');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="campaign-landing">
      {/* 헤더 */}
      <header className="bg-blue-600 text-white p-6">
        <h1 className="text-3xl font-bold">{campaign?.name}</h1>
        <p className="text-lg mt-2">{campaign?.description}</p>
      </header>

      {/* 공용 QR 코드 */}
      <section className="qr-section p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">카카오 로그인 후 쿠폰 받기</h2>
        <QRCodeDisplay
          qrImage={campaign?.public_qr_image}
          qrUrl={campaign?.public_qr_url}
        />
      </section>

      {/* 쿠폰 발급 버튼 */}
      <section className="cta-section p-6">
        <button
          onClick={handleIssueCoupon}
          disabled={isLoading}
          className="w-full bg-yellow-400 text-black font-bold py-4 rounded-lg text-xl"
        >
          {isLoggedIn ? '🎫 내 쿠폰 받기' : '🔑 카카오 로그인하고 쿠폰 받기'}
        </button>
      </section>

      {/* 가맹점 목록 */}
      <section className="merchants-section p-6">
        <h2 className="text-2xl font-bold mb-4">사용 가능 가맹점 ({campaign?.merchants.length}곳)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaign?.merchants.map((merchant, idx) => (
            <div key={idx} className="merchant-card border rounded-lg p-4">
              <h3 className="font-semibold text-lg">{merchant.name}</h3>
              <p className="text-gray-600">{merchant.category}</p>
              <p className="text-red-600 font-bold mt-2">
                {merchant.discount_type === 'PERCENT'
                  ? `${merchant.discount_value}% 할인`
                  : `${merchant.discount_value.toLocaleString()}원 할인`
                }
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

**2. PartnerQRScannerPage** (`pages/partner/qr-scanner.tsx`)
```typescript
import { useState } from 'react';
import QRScanner from '@/components/smart-coupons/QRScanner';
import CouponValidationModal from '@/components/smart-coupons/CouponValidationModal';
import UsageApprovalModal from '@/components/smart-coupons/UsageApprovalModal';

interface ValidationResult {
  valid: boolean;
  coupon?: {
    coupon_code: string;
    user_name: string;
    campaign_name: string;
  };
  discount_rule?: {
    discount_type: 'PERCENT' | 'AMOUNT';
    discount_value: number;
    max_discount_amount?: number;
    min_order_amount: number;
  };
  error?: string;
}

export default function PartnerQRScannerPage() {
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const merchantId = getCurrentMerchantId();  // 현재 로그인한 파트너의 가맹점 ID
  const partnerId = getCurrentPartnerId();    // 현재 로그인한 파트너 ID

  const handleQRScanned = async (qrData: string) => {
    // QR URL에서 쿠폰 코드 추출
    // URL 형식: https://travleap.com/coupon?code=ISLAND2025-A3F5D8
    const url = new URL(qrData);
    const couponCode = url.searchParams.get('code');

    if (!couponCode) {
      alert('올바른 쿠폰 QR 코드가 아닙니다');
      return;
    }

    setScannedCode(couponCode);

    // 쿠폰 유효성 검증
    await validateCoupon(couponCode);
  };

  const validateCoupon = async (couponCode: string) => {
    try {
      const res = await fetch('/api/partner/coupon-validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('partner_token')}`
        },
        body: JSON.stringify({
          coupon_code: couponCode,
          merchant_id: merchantId
        })
      });

      const data = await res.json();
      setValidationResult(data.data || data);
      setShowValidationModal(true);

      if (data.success && data.data.valid) {
        // 유효한 쿠폰이면 승인 모달로 진행
        setTimeout(() => {
          setShowValidationModal(false);
          setShowApprovalModal(true);
        }, 2000);
      }
    } catch (error) {
      alert('쿠폰 검증 실패');
    }
  };

  const handleApproveCoupon = async (orderAmount: number) => {
    try {
      const res = await fetch('/api/partner/coupon-use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('partner_token')}`
        },
        body: JSON.stringify({
          coupon_code: scannedCode,
          merchant_id: merchantId,
          partner_id: partnerId,
          order_amount: orderAmount
        })
      });

      const data = await res.json();

      if (data.success) {
        alert(`쿠폰 사용 완료!\n주문 금액: ${data.data.order_amount.toLocaleString()}원\n할인 금액: ${data.data.discount_amount.toLocaleString()}원\n최종 금액: ${data.data.final_amount.toLocaleString()}원`);
        setShowApprovalModal(false);
        setScannedCode(null);
        setValidationResult(null);
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('쿠폰 사용 실패');
    }
  };

  return (
    <div className="qr-scanner-page p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">쿠폰 QR 스캔</h1>
        <p className="text-gray-600">고객의 쿠폰 QR 코드를 스캔해주세요</p>
      </header>

      {/* QR 스캐너 */}
      <div className="scanner-container">
        <QRScanner onScan={handleQRScanned} />
      </div>

      {/* 스캔 결과 안내 */}
      {scannedCode && (
        <div className="scanned-info mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700">스캔된 쿠폰: <strong>{scannedCode}</strong></p>
        </div>
      )}

      {/* 검증 결과 모달 */}
      {showValidationModal && validationResult && (
        <CouponValidationModal
          result={validationResult}
          onClose={() => setShowValidationModal(false)}
        />
      )}

      {/* 사용 승인 모달 */}
      {showApprovalModal && validationResult && validationResult.valid && (
        <UsageApprovalModal
          coupon={validationResult.coupon!}
          discountRule={validationResult.discount_rule!}
          onApprove={handleApproveCoupon}
          onCancel={() => {
            setShowApprovalModal(false);
            setScannedCode(null);
          }}
        />
      )}
    </div>
  );
}
```

**3. UsageApprovalModal** (`components/smart-coupons/UsageApprovalModal.tsx`)
```typescript
import { useState } from 'react';

interface Props {
  coupon: {
    coupon_code: string;
    user_name: string;
    campaign_name: string;
  };
  discountRule: {
    discount_type: 'PERCENT' | 'AMOUNT';
    discount_value: number;
    max_discount_amount?: number;
    min_order_amount: number;
  };
  onApprove: (orderAmount: number) => void;
  onCancel: () => void;
}

export default function UsageApprovalModal({ coupon, discountRule, onApprove, onCancel }: Props) {
  const [orderAmount, setOrderAmount] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [finalAmount, setFinalAmount] = useState<number>(0);

  const calculateDiscount = (amount: number) => {
    let discount = 0;

    if (discountRule.discount_type === 'PERCENT') {
      discount = amount * (discountRule.discount_value / 100);
      if (discountRule.max_discount_amount) {
        discount = Math.min(discount, discountRule.max_discount_amount);
      }
    } else {
      discount = discountRule.discount_value;
    }

    return Math.floor(discount);
  };

  const handleOrderAmountChange = (value: string) => {
    setOrderAmount(value);
    const amount = parseInt(value) || 0;
    const discount = calculateDiscount(amount);
    setDiscountAmount(discount);
    setFinalAmount(amount - discount);
  };

  const handleConfirm = () => {
    const amount = parseInt(orderAmount);

    if (!amount || amount < discountRule.min_order_amount) {
      alert(`최소 주문 금액은 ${discountRule.min_order_amount.toLocaleString()}원입니다`);
      return;
    }

    onApprove(amount);
  };

  return (
    <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="modal-content bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">쿠폰 사용 승인</h2>

        {/* 쿠폰 정보 */}
        <div className="coupon-info mb-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">고객명</p>
          <p className="font-semibold">{coupon.user_name}</p>

          <p className="text-sm text-gray-600 mt-2">캠페인</p>
          <p className="font-semibold">{coupon.campaign_name}</p>

          <p className="text-sm text-gray-600 mt-2">할인 혜택</p>
          <p className="font-semibold text-red-600">
            {discountRule.discount_type === 'PERCENT'
              ? `${discountRule.discount_value}% 할인${discountRule.max_discount_amount ? ` (최대 ${discountRule.max_discount_amount.toLocaleString()}원)` : ''}`
              : `${discountRule.discount_value.toLocaleString()}원 할인`
            }
          </p>
        </div>

        {/* 주문 금액 입력 */}
        <div className="order-amount-input mb-4">
          <label className="block text-sm font-medium mb-2">주문 금액</label>
          <input
            type="number"
            value={orderAmount}
            onChange={(e) => handleOrderAmountChange(e.target.value)}
            placeholder="0"
            className="w-full border rounded-lg px-4 py-2 text-lg"
          />
          <p className="text-xs text-gray-500 mt-1">
            최소 주문 금액: {discountRule.min_order_amount.toLocaleString()}원
          </p>
        </div>

        {/* 계산 결과 */}
        {orderAmount && parseInt(orderAmount) > 0 && (
          <div className="calculation-result mb-4 p-4 bg-blue-50 rounded">
            <div className="flex justify-between mb-2">
              <span>주문 금액</span>
              <span className="font-semibold">{parseInt(orderAmount).toLocaleString()}원</span>
            </div>
            <div className="flex justify-between mb-2 text-red-600">
              <span>할인 금액</span>
              <span className="font-semibold">-{discountAmount.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-blue-200">
              <span className="font-bold">최종 결제 금액</span>
              <span className="font-bold text-lg">{finalAmount.toLocaleString()}원</span>
            </div>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold"
          >
            승인
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 완료 기준
- [ ] 8개 페이지 구조 설계 완료
- [ ] 폴더 구조 정의
- [ ] 핵심 컴포넌트 3개 상세 설계 (CampaignLandingPage, PartnerQRScannerPage, UsageApprovalModal)
- [ ] Props/State 인터페이스 정의

### 산출물
- `docs/frontend_architecture.md` - 프론트엔드 구조 설명서
- `docs/component_specifications.md` - 컴포넌트 명세서

---

## Day 5: 전체 플로우 통합 검토 및 수정

### 작업 목표
Day 1-4의 모든 설계를 검토하고 누락된 부분 보완

### 세부 작업

#### 5-1. 전체 시나리오 워크스루 (4시간)

**시나리오 1: 사용자 쿠폰 발급부터 사용까지**
```
1. 사용자가 포스터/전단지에서 캠페인 QR 스캔
   → URL: /coupon/ISLAND2025

2. 캠페인 랜딩페이지 로드
   → 캠페인 정보, 가맹점 목록 표시

3. "쿠폰 받기" 버튼 클릭
   → 로그인 안 되어 있으면 카카오 로그인으로 리다이렉트

4. 카카오 인증 완료
   → 콜백 처리, 자동 회원가입, JWT 발급
   → /coupon/ISLAND2025?token=xxx&auto_issue=true로 리다이렉트

5. 자동으로 쿠폰 발급 API 호출
   → POST /api/smart-coupons/issue
   → 쿠폰 코드 생성, QR 생성, DB 저장
   → 카카오 메시지 발송 (쿠폰 발급 알림)

6. 내 쿠폰 페이지로 이동
   → /my-coupons
   → 발급받은 쿠폰 목록 표시

7. 쿠폰 카드 클릭
   → /coupons/ISLAND2025-A3F5D8
   → QR 코드 전체 화면 표시

8. 가맹점 방문, QR 코드 제시
   → 파트너가 QR 스캔

9. 파트너 QR 스캐너에서 스캔
   → POST /api/partner/coupon-validate
   → 유효성 확인 (사용 가능 여부, 가맹점 포함 여부)

10. 유효성 확인 완료
    → 주문 금액 입력 화면 표시

11. 파트너가 주문 금액 입력 후 승인
    → POST /api/partner/coupon-use
    → 할인 금액 계산
    → DB 트랜잭션 (쿠폰 상태 변경, 사용 로그 저장)
    → 카카오 메시지 발송 (사용 완료 + 리뷰 요청)

12. 사용자가 카카오 메시지 받음
    → "리뷰 작성하고 500P 받기" 버튼 클릭
    → /coupons/1001/review

13. 리뷰 작성 및 제출
    → POST /api/smart-coupons/reviews
    → 리뷰 저장, 포인트 지급
    → 카카오 메시지 발송 (포인트 지급 알림)
```

**체크포인트**:
- [ ] 각 단계별 API 호출 확인
- [ ] 에러 케이스 처리 확인 (중복 발급, 이미 사용, 최소 주문 금액 미달 등)
- [ ] 카카오 메시지 발송 시점 확인
- [ ] DB 트랜잭션 일관성 확인

#### 5-2. 관리자 시나리오 워크스루 (2시간)

**시나리오 2: 관리자가 캠페인 생성부터 정산까지**
```
1. 관리자 로그인
   → /admin/campaigns

2. "새 캠페인 만들기" 클릭
   → 캠페인 생성 폼 표시

3. 캠페인 정보 입력
   - 이름: "2025 가고싶은섬"
   - 코드: "ISLAND2025"
   - 기간: 2025-01-01 ~ 2025-12-31
   - 최대 발급: 10,000개

4. 가맹점 추가
   - 가맹점 선택 (드롭다운)
   - 할인 규칙 설정 (퍼센트/금액, 최대 할인, 최소 주문)

5. 캠페인 생성 제출
   → POST /api/admin/campaigns
   → DB 저장 (campaigns, campaign_merchants)
   → QR 코드 생성 (공용 QR)

6. 생성 완료
   → 캠페인 목록에 표시
   → 공용 QR 다운로드 가능

7. 캠페인 통계 확인
   → 발급 수량, 사용 수량, 가맹점별 사용 내역

8. 정산 관리 페이지 이동
   → /admin/settlements
   → 가맹점별 정산 대상 조회
   → 월별, 캠페인별 필터링

9. 정산 완료 처리
   → PUT /api/admin/settlements/:id
   → settlement_status = 'COMPLETED'
```

#### 5-3. 누락 사항 체크 및 보완 (2시간)

**체크리스트**:
- [ ] 환경변수 목록 완전성
  - DATABASE_URL
  - KAKAO_REST_API_KEY
  - KAKAO_REDIRECT_URI
  - JWT_SECRET
  - NEXT_PUBLIC_API_URL

- [ ] 에러 처리
  - 네트워크 에러
  - 권한 없음 (401, 403)
  - 리소스 없음 (404)
  - 서버 에러 (500)

- [ ] 보안
  - JWT 토큰 만료 처리
  - XSS 방지 (입력값 sanitize)
  - CSRF 토큰 (필요시)
  - SQL Injection 방지 (prepared statement)

- [ ] 성능
  - DB 인덱스 적용 확인
  - API 페이지네이션 적용 확인
  - 이미지 최적화 (QR 코드 크기)

- [ ] 테스트
  - 단위 테스트 계획
  - 통합 테스트 계획
  - E2E 테스트 시나리오

### 완료 기준
- [ ] 전체 시나리오 2개 워크스루 완료
- [ ] 누락 사항 체크리스트 100% 확인
- [ ] 발견된 문제점 모두 문서화

### 산출물
- `docs/user_flow_scenarios.md` - 전체 플로우 시나리오
- `docs/review_checklist.md` - 검토 체크리스트 및 발견 사항

---

# Phase 2: 백엔드 개발 (Day 6-15)

## Day 6: 데이터베이스 마이그레이션

### 작업 목표
설계한 DB 스키마를 PlanetScale에 실제로 생성

### 세부 작업

#### 6-1. 마이그레이션 스크립트 작성 (2시간)

**파일**: `scripts/migrations/001_create_coupon_tables.cjs`

```javascript
const { connect } = require('@planetscale/database');

async function up() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('🚀 스마트 쿠폰 시스템 마이그레이션 시작...');

  try {
    // 1. campaigns 테이블
    console.log('📝 campaigns 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        campaign_code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        public_qr_url VARCHAR(500),
        public_qr_image TEXT,
        valid_from DATETIME NOT NULL,
        valid_to DATETIME NOT NULL,
        status ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED') DEFAULT 'DRAFT',
        max_issuance INT DEFAULT NULL,
        total_issued INT DEFAULT 0,
        total_used INT DEFAULT 0,
        created_by BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_campaign_code (campaign_code),
        INDEX idx_status (status),
        INDEX idx_valid_dates (valid_from, valid_to)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ campaigns 테이블 생성 완료');

    // 2. user_coupons 테이블
    console.log('📝 user_coupons 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_coupons (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        campaign_id BIGINT NOT NULL,
        coupon_code VARCHAR(50) UNIQUE NOT NULL,
        qr_url VARCHAR(500),
        qr_image TEXT,
        status ENUM('ACTIVE', 'USED', 'EXPIRED', 'REVOKED') DEFAULT 'ACTIVE',
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        used_at TIMESTAMP NULL,
        used_merchant_id BIGINT NULL,
        used_partner_id BIGINT NULL,
        usage_log_id BIGINT NULL,
        review_submitted BOOLEAN DEFAULT FALSE,
        review_points_awarded INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_campaign (user_id, campaign_id),
        INDEX idx_coupon_code (coupon_code),
        INDEX idx_user_id (user_id),
        INDEX idx_campaign_id (campaign_id),
        INDEX idx_status (status),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ user_coupons 테이블 생성 완료');

    // 3. campaign_merchants 테이블
    console.log('📝 campaign_merchants 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS campaign_merchants (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        campaign_id BIGINT NOT NULL,
        merchant_id BIGINT NOT NULL,
        merchant_name VARCHAR(255) NOT NULL,
        merchant_category VARCHAR(100),
        discount_type ENUM('PERCENT', 'AMOUNT') NOT NULL,
        discount_value DECIMAL(10,2) NOT NULL,
        max_discount_amount DECIMAL(10,2) NULL,
        min_order_amount DECIMAL(10,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        total_usage_count INT DEFAULT 0,
        total_discount_amount DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_campaign_merchant (campaign_id, merchant_id),
        INDEX idx_campaign_id (campaign_id),
        INDEX idx_merchant_id (merchant_id),
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ campaign_merchants 테이블 생성 완료');

    // 4. coupon_usage_logs 테이블
    console.log('📝 coupon_usage_logs 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS coupon_usage_logs (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_coupon_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        campaign_id BIGINT NOT NULL,
        merchant_id BIGINT NOT NULL,
        approved_by_partner_id BIGINT NOT NULL,
        approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        order_amount DECIMAL(10,2) NOT NULL,
        discount_amount DECIMAL(10,2) NOT NULL,
        final_amount DECIMAL(10,2) NOT NULL,
        settlement_status ENUM('PENDING', 'COMPLETED', 'DISPUTED') DEFAULT 'PENDING',
        settlement_date DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_coupon (user_coupon_id),
        INDEX idx_campaign (campaign_id),
        INDEX idx_merchant (merchant_id),
        INDEX idx_approved_at (approved_at),
        INDEX idx_settlement_status (settlement_status),
        FOREIGN KEY (user_coupon_id) REFERENCES user_coupons(id) ON DELETE CASCADE,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ coupon_usage_logs 테이블 생성 완료');

    // 5. kakao_users 테이블
    console.log('📝 kakao_users 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS kakao_users (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        kakao_user_id BIGINT UNIQUE NOT NULL,
        kakao_email VARCHAR(255),
        kakao_nickname VARCHAR(100),
        kakao_profile_image VARCHAR(500),
        kakao_access_token TEXT,
        kakao_refresh_token TEXT,
        token_expires_at TIMESTAMP NULL,
        message_agreed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user (user_id),
        INDEX idx_kakao_user_id (kakao_user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ kakao_users 테이블 생성 완료');

    // 6. coupon_reviews 테이블
    console.log('📝 coupon_reviews 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS coupon_reviews (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_coupon_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        merchant_id BIGINT NOT NULL,
        campaign_id BIGINT NOT NULL,
        rating INT NOT NULL,
        review_text TEXT,
        points_awarded INT DEFAULT 0,
        points_awarded_at TIMESTAMP NULL,
        status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'APPROVED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_coupon (user_coupon_id),
        INDEX idx_user_id (user_id),
        INDEX idx_merchant_id (merchant_id),
        INDEX idx_campaign_id (campaign_id),
        INDEX idx_status (status),
        FOREIGN KEY (user_coupon_id) REFERENCES user_coupons(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ coupon_reviews 테이블 생성 완료');

    // 7. kakao_message_logs 테이블
    console.log('📝 kakao_message_logs 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS kakao_message_logs (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        kakao_user_id BIGINT NOT NULL,
        message_type ENUM('COUPON_ISSUED', 'COUPON_USED', 'REVIEW_REQUEST', 'POINTS_AWARDED') NOT NULL,
        template_id VARCHAR(50),
        status ENUM('SUCCESS', 'FAILED', 'PENDING') DEFAULT 'PENDING',
        error_message TEXT,
        related_coupon_id BIGINT,
        related_campaign_id BIGINT,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_message_type (message_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ kakao_message_logs 테이블 생성 완료');

    console.log('');
    console.log('🎉 마이그레이션 완료!');
    console.log('📊 생성된 테이블:');
    console.log('   - campaigns');
    console.log('   - user_coupons');
    console.log('   - campaign_merchants');
    console.log('   - coupon_usage_logs');
    console.log('   - kakao_users');
    console.log('   - coupon_reviews');
    console.log('   - kakao_message_logs');

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    throw error;
  }
}

// 실행
up().catch(console.error);
```

#### 6-2. 마이그레이션 실행 (1시간)

```bash
# 환경변수 확인
echo $DATABASE_URL

# 마이그레이션 실행
node scripts/migrations/001_create_coupon_tables.cjs
```

**실행 결과 확인**:
```javascript
// scripts/check-coupon-tables.cjs
const { connect } = require('@planetscale/database');

async function checkTables() {
  const connection = connect({ url: process.env.DATABASE_URL });

  const tables = [
    'campaigns',
    'user_coupons',
    'campaign_merchants',
    'coupon_usage_logs',
    'kakao_users',
    'coupon_reviews',
    'kakao_message_logs'
  ];

  for (const table of tables) {
    const result = await connection.execute(`SHOW CREATE TABLE ${table}`);
    console.log(`✅ ${table} 존재 확인`);
  }
}

checkTables();
```

#### 6-3. 샘플 데이터 삽입 (2시간)

**파일**: `scripts/seed-coupon-data.cjs`

```javascript
const { connect } = require('@planetscale/database');

async function seed() {
  const connection = connect({ url: process.env.DATABASE_URL });

  // 1. 테스트 캠페인 생성
  const campaignResult = await connection.execute(`
    INSERT INTO campaigns (
      name, campaign_code, description,
      valid_from, valid_to, status, max_issuance
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    '2025 가고싶은섬',
    'ISLAND2025',
    '제주도 내 45개 가맹점에서 사용 가능한 스마트 쿠폰',
    '2025-01-01 00:00:00',
    '2025-12-31 23:59:59',
    'ACTIVE',
    10000
  ]);

  const campaignId = campaignResult.insertId;
  console.log(`✅ 캠페인 생성: ID ${campaignId}`);

  // 2. 가맹점 규칙 추가 (예시 5개)
  const merchants = [
    { id: 1, name: '제주 맛집', category: '음식점', type: 'PERCENT', value: 20, max: 5000, min: 10000 },
    { id: 2, name: '제주 카페', category: '카페', type: 'AMOUNT', value: 3000, max: null, min: 5000 },
    { id: 3, name: '해변 식당', category: '음식점', type: 'PERCENT', value: 15, max: 10000, min: 20000 },
    { id: 4, name: '숙소 A', category: '숙박', type: 'AMOUNT', value: 10000, max: null, min: 50000 },
    { id: 5, name: '렌터카 B', category: '렌터카', type: 'PERCENT', value: 10, max: 20000, min: 30000 }
  ];

  for (const m of merchants) {
    await connection.execute(`
      INSERT INTO campaign_merchants (
        campaign_id, merchant_id, merchant_name, merchant_category,
        discount_type, discount_value, max_discount_amount, min_order_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [campaignId, m.id, m.name, m.category, m.type, m.value, m.max, m.min]);
  }

  console.log(`✅ 가맹점 ${merchants.length}개 추가 완료`);

  // 3. 테스트 사용자에게 쿠폰 발급 (user_id=1 가정)
  await connection.execute(`
    INSERT INTO user_coupons (
      user_id, campaign_id, coupon_code, qr_url, status, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `, [
    1,
    campaignId,
    'ISLAND2025-TEST01',
    'https://travleap.com/coupon?code=ISLAND2025-TEST01',
    'ACTIVE',
    '2025-12-31 23:59:59'
  ]);

  console.log('✅ 테스트 쿠폰 발급 완료');
  console.log('🎉 샘플 데이터 삽입 완료!');
}

seed();
```

### 완료 기준
- [ ] 7개 테이블 모두 PlanetScale에 생성 확인
- [ ] 샘플 데이터 삽입 성공
- [ ] 테이블 구조 확인 (SHOW CREATE TABLE)

### 산출물
- `scripts/migrations/001_create_coupon_tables.cjs`
- `scripts/seed-coupon-data.cjs`
- `scripts/check-coupon-tables.cjs`

---

## Day 7-8: 캠페인 관리 API 구현

### Day 7 작업 목표
GET /api/campaigns, GET /api/campaigns/:campaignCode 구현

### 세부 작업

#### 7-1. 캠페인 목록 조회 API (3시간)

**파일**: `api/campaigns.js`

```javascript
const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    if (req.method === 'GET') {
      const { status, page = 1, limit = 10 } = req.query;

      // 1. 필터 조건 구성
      let query = `
        SELECT
          c.*,
          (SELECT COUNT(*) FROM campaign_merchants WHERE campaign_id = c.id) as merchant_count
        FROM campaigns c
        WHERE 1=1
      `;
      const params = [];

      if (status && status !== 'ALL') {
        query += ` AND c.status = ?`;
        params.push(status);
      }

      query += ` ORDER BY c.created_at DESC`;

      // 2. 페이지네이션
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      const result = await connection.execute(query, params);

      // 3. 전체 개수 조회
      let countQuery = `SELECT COUNT(*) as total FROM campaigns WHERE 1=1`;
      const countParams = [];

      if (status && status !== 'ALL') {
        countQuery += ` AND status = ?`;
        countParams.push(status);
      }

      const countResult = await connection.execute(countQuery, countParams);
      const total = countResult.rows[0].total;

      return res.status(200).json({
        success: true,
        data: {
          campaigns: result.rows || [],
          pagination: {
            total: parseInt(total),
            page: parseInt(page),
            limit: parseInt(limit),
            total_pages: Math.ceil(total / limit)
          }
        }
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ Campaigns API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

#### 7-2. 캠페인 상세 조회 API (3시간)

**파일**: `api/campaigns/[campaignCode].js`

```javascript
const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { campaignCode } = req.query;
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    if (req.method === 'GET') {
      // 1. 캠페인 기본 정보 조회
      const campaignResult = await connection.execute(`
        SELECT * FROM campaigns
        WHERE campaign_code = ?
      `, [campaignCode]);

      if (!campaignResult.rows || campaignResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '캠페인을 찾을 수 없습니다'
        });
      }

      const campaign = campaignResult.rows[0];

      // 2. 가맹점 목록 조회
      const merchantsResult = await connection.execute(`
        SELECT
          merchant_id,
          merchant_name as name,
          merchant_category as category,
          discount_type,
          discount_value,
          max_discount_amount,
          min_order_amount,
          is_active
        FROM campaign_merchants
        WHERE campaign_id = ? AND is_active = TRUE
        ORDER BY merchant_name ASC
      `, [campaign.id]);

      return res.status(200).json({
        success: true,
        data: {
          campaign: {
            ...campaign,
            merchants: merchantsResult.rows || []
          }
        }
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ Campaign detail API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

#### 7-3. API 테스트 (1시간)

**Postman 테스트**:
```
GET http://localhost:3000/api/campaigns
GET http://localhost:3000/api/campaigns?status=ACTIVE
GET http://localhost:3000/api/campaigns?page=1&limit=5
GET http://localhost:3000/api/campaigns/ISLAND2025
```

### Day 8 작업 목표
POST /api/admin/campaigns, PUT /api/admin/campaigns/:id 구현

### 세부 작업

#### 8-1. 캠페인 생성 API (4시간)

**파일**: `api/admin/campaigns.js`

```javascript
const { connect } = require('@planetscale/database');
const QRCode = require('qrcode');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // TODO: 관리자 권한 확인 미들웨어

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    if (req.method === 'POST') {
      const {
        name,
        campaign_code,
        description,
        valid_from,
        valid_to,
        max_issuance,
        merchants
      } = req.body;

      // 1. 필수 필드 검증
      if (!name || !campaign_code || !valid_from || !valid_to) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다'
        });
      }

      // 2. 캠페인 코드 중복 확인
      const existingCampaign = await connection.execute(
        'SELECT id FROM campaigns WHERE campaign_code = ?',
        [campaign_code]
      );

      if (existingCampaign.rows && existingCampaign.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: '이미 존재하는 캠페인 코드입니다'
        });
      }

      // 3. 공용 QR 코드 생성
      const public_qr_url = `${process.env.NEXT_PUBLIC_APP_URL}/coupon/${campaign_code}`;
      const public_qr_image = await QRCode.toDataURL(public_qr_url);

      // 4. 트랜잭션 시작
      // 4-1. 캠페인 생성
      const campaignResult = await connection.execute(`
        INSERT INTO campaigns (
          name, campaign_code, description,
          public_qr_url, public_qr_image,
          valid_from, valid_to, max_issuance,
          status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', NOW())
      `, [
        name,
        campaign_code,
        description,
        public_qr_url,
        public_qr_image,
        valid_from,
        valid_to,
        max_issuance || null
      ]);

      const campaignId = campaignResult.insertId;
      console.log(`✅ 캠페인 생성: ID ${campaignId}`);

      // 4-2. 가맹점 규칙 삽입
      if (merchants && merchants.length > 0) {
        for (const merchant of merchants) {
          await connection.execute(`
            INSERT INTO campaign_merchants (
              campaign_id, merchant_id, merchant_name, merchant_category,
              discount_type, discount_value,
              max_discount_amount, min_order_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            campaignId,
            merchant.merchant_id,
            merchant.merchant_name,
            merchant.merchant_category || null,
            merchant.discount_type,
            merchant.discount_value,
            merchant.max_discount_amount || null,
            merchant.min_order_amount || 0
          ]);
        }

        console.log(`✅ 가맹점 ${merchants.length}개 추가`);
      }

      return res.status(201).json({
        success: true,
        data: {
          campaign_id: campaignId,
          campaign_code,
          public_qr_url,
          public_qr_image
        },
        message: '캠페인이 생성되었습니다'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ Admin campaigns API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

#### 8-2. 캠페인 수정 API (2시간)

**파일**: `api/admin/campaigns/[id].js`

```javascript
const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    if (req.method === 'PUT') {
      const { status, valid_to, max_issuance } = req.body;

      const updates = [];
      const params = [];

      if (status) {
        updates.push('status = ?');
        params.push(status);
      }
      if (valid_to) {
        updates.push('valid_to = ?');
        params.push(valid_to);
      }
      if (max_issuance !== undefined) {
        updates.push('max_issuance = ?');
        params.push(max_issuance);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: '수정할 필드가 없습니다'
        });
      }

      updates.push('updated_at = NOW()');
      params.push(id);

      await connection.execute(`
        UPDATE campaigns
        SET ${updates.join(', ')}
        WHERE id = ?
      `, params);

      console.log(`✅ 캠페인 #${id} 수정 완료`);

      return res.status(200).json({
        success: true,
        message: '캠페인이 수정되었습니다'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ Admin campaign update API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

### 완료 기준
- [ ] 캠페인 목록 조회 API 동작 확인
- [ ] 캠페인 상세 조회 API 동작 확인
- [ ] 캠페인 생성 API 동작 확인 (QR 생성 포함)
- [ ] 캠페인 수정 API 동작 확인
- [ ] Postman 테스트 완료

---

---

## Day 9-10: 쿠폰 발급 API 구현

### Day 9 작업 목표
POST /api/smart-coupons/issue 구현 (쿠폰 발급 로직)

### 세부 작업

#### 9-1. 쿠폰 코드 생성 유틸리티 (1시간)

**파일**: `utils/coupon-code-generator.js`

```javascript
/**
 * 고유 쿠폰 코드 생성
 * 형식: CAMPAIGN_CODE-RANDOM6
 * 예: ISLAND2025-A3F5D8
 */
export function generateCouponCode(campaignCode) {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${campaignCode}-${random}`;
}

/**
 * 쿠폰 코드 중복 확인 및 재생성
 */
export async function generateUniqueCouponCode(connection, campaignCode) {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = generateCouponCode(campaignCode);

    // DB에서 중복 확인
    const result = await connection.execute(
      'SELECT id FROM user_coupons WHERE coupon_code = ?',
      [code]
    );

    if (!result.rows || result.rows.length === 0) {
      return code;  // 중복 없음
    }

    attempts++;
  }

  throw new Error('고유 쿠폰 코드 생성 실패 (10회 시도)');
}
```

#### 9-2. 쿠폰 발급 API 구현 (5시간)

**파일**: `api/smart-coupons/issue.js`

```javascript
const { connect } = require('@planetscale/database');
const QRCode = require('qrcode');
const { generateUniqueCouponCode } = require('@/utils/coupon-code-generator');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { campaign_id, user_id } = req.body;

  // 1. 필수 필드 검증
  if (!campaign_id || !user_id) {
    return res.status(400).json({
      success: false,
      error: '필수 필드가 누락되었습니다: campaign_id, user_id'
    });
  }

  // TODO: JWT 토큰으로 user_id 검증 (현재 요청자와 일치 여부)

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 2. 캠페인 유효성 확인
    const campaignResult = await connection.execute(`
      SELECT id, name, campaign_code, valid_from, valid_to, status, max_issuance, total_issued
      FROM campaigns
      WHERE id = ?
    `, [campaign_id]);

    if (!campaignResult.rows || campaignResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '캠페인을 찾을 수 없습니다'
      });
    }

    const campaign = campaignResult.rows[0];

    // 3. 캠페인 상태 확인
    if (campaign.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: '현재 진행 중이지 않은 캠페인입니다'
      });
    }

    // 4. 캠페인 기간 확인
    const now = new Date();
    const validFrom = new Date(campaign.valid_from);
    const validTo = new Date(campaign.valid_to);

    if (now < validFrom) {
      return res.status(400).json({
        success: false,
        error: '캠페인 시작 전입니다',
        valid_from: campaign.valid_from
      });
    }

    if (now > validTo) {
      return res.status(400).json({
        success: false,
        error: '캠페인 기간이 종료되었습니다',
        valid_to: campaign.valid_to
      });
    }

    // 5. 발급 수량 제한 확인
    if (campaign.max_issuance && campaign.total_issued >= campaign.max_issuance) {
      return res.status(400).json({
        success: false,
        error: '캠페인 쿠폰이 모두 소진되었습니다'
      });
    }

    // 6. 중복 발급 확인 (1인 1캠페인 1쿠폰)
    const existingCouponResult = await connection.execute(`
      SELECT id, coupon_code, status FROM user_coupons
      WHERE user_id = ? AND campaign_id = ?
    `, [user_id, campaign_id]);

    if (existingCouponResult.rows && existingCouponResult.rows.length > 0) {
      const existing = existingCouponResult.rows[0];
      return res.status(400).json({
        success: false,
        error: '이미 이 캠페인의 쿠폰을 보유하고 있습니다',
        existing_coupon: {
          coupon_code: existing.coupon_code,
          status: existing.status
        }
      });
    }

    // 7. 고유 쿠폰 코드 생성
    const couponCode = await generateUniqueCouponCode(connection, campaign.campaign_code);
    console.log(`📝 쿠폰 코드 생성: ${couponCode}`);

    // 8. 쿠폰 QR 코드 생성
    const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL}/coupon?code=${couponCode}`;
    const qrImage = await QRCode.toDataURL(qrUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 400,
      margin: 1
    });
    console.log(`📱 QR 코드 생성 완료`);

    // 9. user_coupons 테이블에 저장
    const couponResult = await connection.execute(`
      INSERT INTO user_coupons (
        user_id, campaign_id, coupon_code,
        qr_url, qr_image,
        status, issued_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', NOW(), ?)
    `, [
      user_id,
      campaign_id,
      couponCode,
      qrUrl,
      qrImage,
      campaign.valid_to
    ]);

    const couponId = couponResult.insertId;
    console.log(`✅ 쿠폰 발급 완료: ID ${couponId}`);

    // 10. campaigns 테이블 통계 업데이트
    await connection.execute(`
      UPDATE campaigns
      SET total_issued = total_issued + 1
      WHERE id = ?
    `, [campaign_id]);

    // 11. 카카오 메시지 발송 (비동기, 실패해도 발급은 성공으로 처리)
    try {
      await sendCouponIssuedMessage(user_id, {
        campaign_name: campaign.name,
        coupon_code: couponCode,
        valid_to: campaign.valid_to
      });
      console.log(`📧 카카오 메시지 발송 완료`);
    } catch (msgError) {
      console.warn('⚠️  카카오 메시지 발송 실패:', msgError.message);
    }

    // 12. 응답
    return res.status(201).json({
      success: true,
      data: {
        coupon_id: couponId,
        coupon_code: couponCode,
        qr_url: qrUrl,
        qr_image: qrImage,
        campaign: {
          name: campaign.name,
          valid_from: campaign.valid_from,
          valid_to: campaign.valid_to
        }
      },
      message: '쿠폰이 발급되었습니다!'
    });

  } catch (error) {
    console.error('❌ 쿠폰 발급 API 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 카카오 메시지 발송 함수 (임시)
async function sendCouponIssuedMessage(userId, couponData) {
  // TODO: 카카오 메시지 발송 로직 (Day 11-12에서 구현)
  console.log(`📧 [TODO] 카카오 메시지 발송: user_id=${userId}`);
}
```

#### 9-3. API 테스트 (1시간)

**Postman 테스트**:
```json
POST http://localhost:3000/api/smart-coupons/issue
Headers: {
  "Authorization": "Bearer YOUR_JWT_TOKEN",
  "Content-Type": "application/json"
}
Body: {
  "campaign_id": 1,
  "user_id": 1
}

Expected Response:
{
  "success": true,
  "data": {
    "coupon_id": 1001,
    "coupon_code": "ISLAND2025-A3F5D8",
    "qr_url": "https://travleap.com/coupon?code=ISLAND2025-A3F5D8",
    "qr_image": "data:image/png;base64,...",
    "campaign": {
      "name": "2025 가고싶은섬",
      "valid_from": "2025-01-01T00:00:00Z",
      "valid_to": "2025-12-31T23:59:59Z"
    }
  },
  "message": "쿠폰이 발급되었습니다!"
}
```

**에러 케이스 테스트**:
```bash
# 중복 발급 테스트 (동일한 user_id, campaign_id로 재요청)
# 예상: 400 에러 + "이미 이 캠페인의 쿠폰을 보유하고 있습니다"

# 발급 수량 초과 테스트 (max_issuance 도달)
# 예상: 400 에러 + "캠페인 쿠폰이 모두 소진되었습니다"

# 기간 만료 테스트 (valid_to를 과거로 설정)
# 예상: 400 에러 + "캠페인 기간이 종료되었습니다"
```

### Day 10 작업 목표
GET /api/smart-coupons/my, GET /api/smart-coupons/:couponCode 구현

### 세부 작업

#### 10-1. 내 쿠폰 목록 조회 API (3시간)

**파일**: `api/smart-coupons/my.js`

```javascript
const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // TODO: JWT에서 user_id 추출
  const userId = req.user?.id || req.query.user_id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: '로그인이 필요합니다'
    });
  }

  const { status, page = 1, limit = 10 } = req.query;
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 1. 쿠폰 목록 조회
    let query = `
      SELECT
        uc.id,
        uc.coupon_code,
        uc.qr_url,
        uc.qr_image,
        uc.status,
        uc.issued_at,
        uc.expires_at,
        uc.used_at,
        uc.used_merchant_id,
        uc.review_submitted,
        c.name as campaign_name,
        c.description as campaign_description,
        c.valid_to as campaign_valid_to
      FROM user_coupons uc
      JOIN campaigns c ON uc.campaign_id = c.id
      WHERE uc.user_id = ?
    `;
    const params = [userId];

    // 상태 필터
    if (status && status !== 'ALL') {
      query += ` AND uc.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY uc.issued_at DESC`;

    // 페이지네이션
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const result = await connection.execute(query, params);

    // 2. 전체 개수
    let countQuery = `
      SELECT COUNT(*) as total
      FROM user_coupons
      WHERE user_id = ?
    `;
    const countParams = [userId];

    if (status && status !== 'ALL') {
      countQuery += ` AND status = ?`;
      countParams.push(status);
    }

    const countResult = await connection.execute(countQuery, countParams);
    const total = countResult.rows[0].total;

    // 3. 사용 정보 추가 (사용된 쿠폰의 경우)
    const coupons = result.rows || [];
    for (const coupon of coupons) {
      if (coupon.status === 'USED' && coupon.used_merchant_id) {
        const usageResult = await connection.execute(`
          SELECT
            cm.merchant_name,
            ul.order_amount,
            ul.discount_amount,
            ul.final_amount,
            ul.approved_at
          FROM coupon_usage_logs ul
          JOIN campaign_merchants cm ON ul.merchant_id = cm.merchant_id
          WHERE ul.user_coupon_id = ?
          LIMIT 1
        `, [coupon.id]);

        if (usageResult.rows && usageResult.rows.length > 0) {
          coupon.usage_info = usageResult.rows[0];
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        coupons,
        pagination: {
          total: parseInt(total),
          page: parseInt(page),
          limit: parseInt(limit),
          total_pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ My coupons API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

#### 10-2. 쿠폰 상세 조회 API (2시간)

**파일**: `api/smart-coupons/[couponCode].js`

```javascript
const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { couponCode } = req.query;
  const userId = req.user?.id || req.query.user_id;  // TODO: JWT

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: '로그인이 필요합니다'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 1. 쿠폰 조회
    const couponResult = await connection.execute(`
      SELECT
        uc.id,
        uc.user_id,
        uc.coupon_code,
        uc.qr_url,
        uc.qr_image,
        uc.status,
        uc.issued_at,
        uc.expires_at,
        uc.used_at,
        uc.review_submitted,
        c.id as campaign_id,
        c.name as campaign_name,
        c.description as campaign_description,
        c.valid_to as campaign_valid_to
      FROM user_coupons uc
      JOIN campaigns c ON uc.campaign_id = c.id
      WHERE uc.coupon_code = ?
    `, [couponCode]);

    if (!couponResult.rows || couponResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '쿠폰을 찾을 수 없습니다'
      });
    }

    const coupon = couponResult.rows[0];

    // 2. 본인 소유 쿠폰인지 확인
    if (coupon.user_id !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        error: '본인의 쿠폰만 조회할 수 있습니다'
      });
    }

    // 3. 사용 내역 조회 (사용된 경우)
    let usage_info = null;
    if (coupon.status === 'USED') {
      const usageResult = await connection.execute(`
        SELECT
          cm.merchant_name,
          ul.order_amount,
          ul.discount_amount,
          ul.final_amount,
          ul.approved_at
        FROM coupon_usage_logs ul
        JOIN campaign_merchants cm ON ul.merchant_id = cm.merchant_id
        WHERE ul.user_coupon_id = ?
        LIMIT 1
      `, [coupon.id]);

      if (usageResult.rows && usageResult.rows.length > 0) {
        usage_info = usageResult.rows[0];
      }
    }

    // 4. 가맹점 목록 조회
    const merchantsResult = await connection.execute(`
      SELECT
        merchant_name as name,
        merchant_category as category,
        discount_type,
        discount_value,
        max_discount_amount,
        min_order_amount
      FROM campaign_merchants
      WHERE campaign_id = ? AND is_active = TRUE
      ORDER BY merchant_name ASC
    `, [coupon.campaign_id]);

    return res.status(200).json({
      success: true,
      data: {
        coupon: {
          id: coupon.id,
          coupon_code: coupon.coupon_code,
          qr_url: coupon.qr_url,
          qr_image: coupon.qr_image,
          status: coupon.status,
          issued_at: coupon.issued_at,
          expires_at: coupon.expires_at,
          used_at: coupon.used_at,
          review_submitted: coupon.review_submitted,
          campaign: {
            name: coupon.campaign_name,
            description: coupon.campaign_description,
            valid_to: coupon.campaign_valid_to
          },
          usage_info,
          merchants: merchantsResult.rows || []
        }
      }
    });

  } catch (error) {
    console.error('❌ Coupon detail API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

### 완료 기준
- [ ] 쿠폰 발급 API 동작 확인 (QR 생성 포함)
- [ ] 중복 발급 방지 확인
- [ ] 발급 수량 제한 확인
- [ ] 내 쿠폰 목록 조회 확인
- [ ] 쿠폰 상세 조회 확인 (본인 확인 포함)

---

## Day 11-12: 카카오 OAuth 구현

### Day 11 작업 목표
카카오 로그인 콜백 처리 및 자동 회원가입

### 세부 작업

#### 11-1. 환경변수 설정 (30분)

**파일**: `.env`

```bash
# 카카오 로그인
KAKAO_REST_API_KEY=your_kakao_rest_api_key
KAKAO_REDIRECT_URI=http://localhost:3000/api/auth/kakao/callback
NEXT_PUBLIC_KAKAO_REST_API_KEY=your_kakao_rest_api_key

# JWT
JWT_SECRET=your_jwt_secret_key_min_32_characters

# 앱 URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### 11-2. 카카오 로그인 콜백 API (4시간)

**파일**: `api/auth/kakao/callback.js`

```javascript
const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  const { code, state } = req.query;  // state = campaign_code (선택)

  if (!code) {
    return res.redirect('/error?message=authorization_failed');
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🔐 카카오 OAuth 콜백 처리 시작...');

    // 1. 인가 코드로 액세스 토큰 요청
    console.log('📝 액세스 토큰 요청 중...');
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_REST_API_KEY,
        redirect_uri: process.env.KAKAO_REDIRECT_URI,
        code: code
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('❌ 카카오 토큰 요청 실패:', errorData);
      return res.redirect('/error?message=token_request_failed');
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ 액세스 토큰 획득 완료');

    // 2. 액세스 토큰으로 사용자 정보 조회
    console.log('📝 사용자 정보 조회 중...');
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.text();
      console.error('❌ 카카오 사용자 정보 조회 실패:', errorData);
      return res.redirect('/error?message=user_info_failed');
    }

    const kakaoUser = await userResponse.json();
    console.log(`✅ 카카오 사용자 정보 조회 완료: kakao_id=${kakaoUser.id}`);

    // 3. DB에서 기존 사용자 확인
    const existingKakaoUserResult = await connection.execute(
      'SELECT user_id FROM kakao_users WHERE kakao_user_id = ?',
      [kakaoUser.id]
    );

    let userId;
    let isNewUser = false;

    if (existingKakaoUserResult.rows && existingKakaoUserResult.rows.length > 0) {
      // 기존 사용자
      userId = existingKakaoUserResult.rows[0].user_id;
      console.log(`✅ 기존 사용자 확인: user_id=${userId}`);

      // 토큰 업데이트
      await connection.execute(`
        UPDATE kakao_users
        SET kakao_access_token = ?,
            kakao_refresh_token = ?,
            token_expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND),
            updated_at = NOW()
        WHERE kakao_user_id = ?
      `, [
        tokenData.access_token,
        tokenData.refresh_token,
        tokenData.expires_in,
        kakaoUser.id
      ]);
      console.log('✅ 카카오 토큰 업데이트 완료');

    } else {
      // 신규 사용자 - 자동 회원가입
      console.log('🆕 신규 사용자 - 자동 회원가입 진행...');
      isNewUser = true;

      const kakaoEmail = kakaoUser.kakao_account?.email || null;
      const kakaoNickname = kakaoUser.kakao_account?.profile?.nickname || '카카오사용자';
      const kakaoProfileImage = kakaoUser.kakao_account?.profile?.profile_image_url || null;

      // users 테이블에 계정 생성
      const userResult = await connection.execute(`
        INSERT INTO users (email, name, auth_provider, created_at)
        VALUES (?, ?, 'kakao', NOW())
      `, [kakaoEmail, kakaoNickname]);

      userId = userResult.insertId;
      console.log(`✅ users 테이블 생성: user_id=${userId}`);

      // kakao_users 테이블에 연동 정보 저장
      await connection.execute(`
        INSERT INTO kakao_users (
          user_id, kakao_user_id, kakao_email, kakao_nickname,
          kakao_profile_image, kakao_access_token, kakao_refresh_token,
          token_expires_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND), NOW())
      `, [
        userId,
        kakaoUser.id,
        kakaoEmail,
        kakaoNickname,
        kakaoProfileImage,
        tokenData.access_token,
        tokenData.refresh_token,
        tokenData.expires_in
      ]);
      console.log('✅ kakao_users 테이블 생성 완료');
    }

    // 4. JWT 토큰 생성
    const jwtToken = jwt.sign(
      {
        userId: userId,
        email: kakaoUser.kakao_account?.email,
        authProvider: 'kakao'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('✅ JWT 토큰 생성 완료');

    // 5. 프론트엔드로 리다이렉트
    let redirectUrl;
    if (state) {
      // state에 campaign_code가 있으면 해당 캠페인 페이지로 (자동 발급 플래그 포함)
      redirectUrl = `/coupon/${state}?token=${jwtToken}&auto_issue=true&new_user=${isNewUser}`;
    } else {
      // 없으면 내 쿠폰 페이지로
      redirectUrl = `/my-coupons?token=${jwtToken}&new_user=${isNewUser}`;
    }

    console.log(`🔄 리다이렉트: ${redirectUrl}`);
    return res.redirect(redirectUrl);

  } catch (error) {
    console.error('❌ 카카오 로그인 처리 오류:', error);
    return res.redirect('/error?message=login_failed');
  }
};
```

#### 11-3. JWT 인증 미들웨어 (2시간)

**파일**: `middleware/auth.js`

```javascript
const jwt = require('jsonwebtoken');

/**
 * JWT 토큰 검증 미들웨어
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];  // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: '인증 토큰이 필요합니다'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      authProvider: decoded.authProvider
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: '토큰이 만료되었습니다',
        expired: true
      });
    }
    return res.status(403).json({
      success: false,
      error: '유효하지 않은 토큰입니다'
    });
  }
}

/**
 * 관리자 권한 확인 미들웨어
 */
export async function requireAdmin(req, res, next) {
  // TODO: users 테이블에 role 컬럼 추가 후 확인
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: '로그인이 필요합니다'
    });
  }

  // 임시: user_id 1-10을 관리자로 간주
  if (userId <= 10) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      error: '관리자 권한이 필요합니다'
    });
  }
}

/**
 * 파트너 권한 확인 미들웨어
 */
export async function requirePartner(req, res, next) {
  // TODO: partners 테이블 확인
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: '로그인이 필요합니다'
    });
  }

  // TODO: 파트너 여부 확인 로직
  next();
}
```

### Day 12 작업 목표
카카오 메시지 발송 구현

### 세부 작업

#### 12-1. 카카오 메시지 발송 유틸리티 (4시간)

**파일**: `utils/kakao-message.js`

```javascript
const { connect } = require('@planetscale/database');

/**
 * 카카오 사용자 정보 조회
 */
async function getKakaoUser(userId) {
  const connection = connect({ url: process.env.DATABASE_URL });

  const result = await connection.execute(`
    SELECT kakao_user_id, kakao_access_token, message_agreed
    FROM kakao_users
    WHERE user_id = ?
  `, [userId]);

  if (!result.rows || result.rows.length === 0) {
    throw new Error('카카오 연동 정보를 찾을 수 없습니다');
  }

  return result.rows[0];
}

/**
 * 카카오 메시지 발송 로그 저장
 */
async function logKakaoMessage(userId, kakaoUserId, messageType, status, errorMessage = null, relatedCouponId = null, relatedCampaignId = null) {
  const connection = connect({ url: process.env.DATABASE_URL });

  await connection.execute(`
    INSERT INTO kakao_message_logs (
      user_id, kakao_user_id, message_type,
      status, error_message,
      related_coupon_id, related_campaign_id,
      sent_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
  `, [userId, kakaoUserId, messageType, status, errorMessage, relatedCouponId, relatedCampaignId]);
}

/**
 * 1. 쿠폰 발급 알림
 */
export async function sendCouponIssuedMessage(userId, couponData) {
  try {
    const kakaoUser = await getKakaoUser(userId);

    // 메시지 수신 동의하지 않은 경우 스킵
    if (!kakaoUser.message_agreed) {
      console.log(`⚠️  사용자 ${userId}는 메시지 수신 동의하지 않음`);
      return;
    }

    const messageData = {
      template_object: {
        object_type: 'feed',
        content: {
          title: '🎉 쿠폰이 발급되었습니다!',
          description: `${couponData.campaign_name}\n\n유효기간: ${new Date(couponData.valid_to).toLocaleDateString('ko-KR')}까지`,
          image_url: 'https://travleap.com/images/coupon-issued.png',
          link: {
            web_url: `${process.env.NEXT_PUBLIC_APP_URL}/my-coupons`,
            mobile_web_url: `${process.env.NEXT_PUBLIC_APP_URL}/my-coupons`
          }
        },
        buttons: [
          {
            title: '내 쿠폰 보기',
            link: {
              web_url: `${process.env.NEXT_PUBLIC_APP_URL}/my-coupons`,
              mobile_web_url: `${process.env.NEXT_PUBLIC_APP_URL}/my-coupons`
            }
          }
        ]
      }
    };

    const response = await fetch('https://kapi.kakao.com/v1/api/talk/friends/message/default/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kakaoUser.kakao_access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        template_object: JSON.stringify(messageData.template_object)
      })
    });

    if (response.ok) {
      console.log(`✅ 쿠폰 발급 알림 발송 성공: user_id=${userId}`);
      await logKakaoMessage(userId, kakaoUser.kakao_user_id, 'COUPON_ISSUED', 'SUCCESS', null, null, couponData.campaign_id);
    } else {
      const errorText = await response.text();
      console.error(`❌ 쿠폰 발급 알림 발송 실패:`, errorText);
      await logKakaoMessage(userId, kakaoUser.kakao_user_id, 'COUPON_ISSUED', 'FAILED', errorText);
    }

  } catch (error) {
    console.error(`❌ sendCouponIssuedMessage 오류:`, error);
  }
}

/**
 * 2. 쿠폰 사용 완료 알림 + 리뷰 요청
 */
export async function sendCouponUsedMessage(userId, usageData) {
  try {
    const kakaoUser = await getKakaoUser(userId);

    if (!kakaoUser.message_agreed) {
      return;
    }

    const messageData = {
      template_object: {
        object_type: 'feed',
        content: {
          title: '✅ 쿠폰 사용 완료',
          description: `${usageData.merchant_name}에서 ${usageData.discount_amount.toLocaleString()}원 할인 받았어요!\n\n⭐ 리뷰 작성하고 500P 받으세요`,
          image_url: 'https://travleap.com/images/coupon-used.png',
          link: {
            web_url: `${process.env.NEXT_PUBLIC_APP_URL}/coupons/${usageData.coupon_id}/review`,
            mobile_web_url: `${process.env.NEXT_PUBLIC_APP_URL}/coupons/${usageData.coupon_id}/review`
          }
        },
        buttons: [
          {
            title: '리뷰 작성하고 500P 받기',
            link: {
              web_url: `${process.env.NEXT_PUBLIC_APP_URL}/coupons/${usageData.coupon_id}/review`,
              mobile_web_url: `${process.env.NEXT_PUBLIC_APP_URL}/coupons/${usageData.coupon_id}/review`
            }
          }
        ]
      }
    };

    const response = await fetch('https://kapi.kakao.com/v1/api/talk/friends/message/default/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kakaoUser.kakao_access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        template_object: JSON.stringify(messageData.template_object)
      })
    });

    if (response.ok) {
      console.log(`✅ 쿠폰 사용 알림 발송 성공: user_id=${userId}`);
      await logKakaoMessage(userId, kakaoUser.kakao_user_id, 'COUPON_USED', 'SUCCESS', null, usageData.coupon_id);
    } else {
      const errorText = await response.text();
      console.error(`❌ 쿠폰 사용 알림 발송 실패:`, errorText);
      await logKakaoMessage(userId, kakaoUser.kakao_user_id, 'COUPON_USED', 'FAILED', errorText);
    }

  } catch (error) {
    console.error(`❌ sendCouponUsedMessage 오류:`, error);
  }
}

/**
 * 3. 포인트 지급 알림
 */
export async function sendPointsAwardedMessage(userId, pointsData) {
  try {
    const kakaoUser = await getKakaoUser(userId);

    if (!kakaoUser.message_agreed) {
      return;
    }

    const messageData = {
      template_object: {
        object_type: 'feed',
        content: {
          title: '🎁 포인트가 지급되었습니다!',
          description: `리뷰 작성 감사합니다!\n${pointsData.points.toLocaleString()}P가 적립되었어요`,
          image_url: 'https://travleap.com/images/points-awarded.png',
          link: {
            web_url: `${process.env.NEXT_PUBLIC_APP_URL}/my-page`,
            mobile_web_url: `${process.env.NEXT_PUBLIC_APP_URL}/my-page`
          }
        },
        buttons: [
          {
            title: '포인트 확인하기',
            link: {
              web_url: `${process.env.NEXT_PUBLIC_APP_URL}/my-page`,
              mobile_web_url: `${process.env.NEXT_PUBLIC_APP_URL}/my-page`
            }
          }
        ]
      }
    };

    const response = await fetch('https://kapi.kakao.com/v1/api/talk/friends/message/default/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kakaoUser.kakao_access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        template_object: JSON.stringify(messageData.template_object)
      })
    });

    if (response.ok) {
      console.log(`✅ 포인트 지급 알림 발송 성공: user_id=${userId}`);
      await logKakaoMessage(userId, kakaoUser.kakao_user_id, 'POINTS_AWARDED', 'SUCCESS');
    } else {
      const errorText = await response.text();
      console.error(`❌ 포인트 지급 알림 발송 실패:`, errorText);
      await logKakaoMessage(userId, kakaoUser.kakao_user_id, 'POINTS_AWARDED', 'FAILED', errorText);
    }

  } catch (error) {
    console.error(`❌ sendPointsAwardedMessage 오류:`, error);
  }
}
```

#### 12-2. 쿠폰 발급 API에 메시지 연동 (1시간)

**파일**: `api/smart-coupons/issue.js` (수정)

```javascript
// ... (기존 코드)

// 11. 카카오 메시지 발송 (수정)
try {
  const { sendCouponIssuedMessage } = require('@/utils/kakao-message');
  await sendCouponIssuedMessage(user_id, {
    campaign_id,
    campaign_name: campaign.name,
    coupon_code: couponCode,
    valid_to: campaign.valid_to
  });
  console.log(`📧 카카오 메시지 발송 완료`);
} catch (msgError) {
  console.warn('⚠️  카카오 메시지 발송 실패:', msgError.message);
}

// ... (기존 코드)
```

### 완료 기준
- [ ] 카카오 로그인 콜백 동작 확인
- [ ] 자동 회원가입 확인 (users, kakao_users 테이블)
- [ ] JWT 토큰 생성 및 검증 확인
- [ ] 카카오 메시지 3종 발송 확인

---

## Day 13-14: 파트너 쿠폰 사용 API 구현

### Day 13 작업 목표
POST /api/partner/coupon-validate 구현 (쿠폰 유효성 검증)

### 세부 작업

#### 13-1. 쿠폰 유효성 검증 API (4시간)

**파일**: `api/partner/coupon-validate.js`

```javascript
const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // TODO: 파트너 인증 확인

  const { coupon_code, merchant_id } = req.body;

  if (!coupon_code || !merchant_id) {
    return res.status(400).json({
      success: false,
      error: '필수 필드가 누락되었습니다: coupon_code, merchant_id'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 1. 쿠폰 조회
    const couponResult = await connection.execute(`
      SELECT
        uc.id,
        uc.coupon_code,
        uc.status,
        uc.campaign_id,
        uc.used_at,
        uc.used_merchant_id,
        u.name as user_name,
        c.name as campaign_name,
        c.status as campaign_status
      FROM user_coupons uc
      JOIN users u ON uc.user_id = u.id
      JOIN campaigns c ON uc.campaign_id = c.id
      WHERE uc.coupon_code = ?
    `, [coupon_code]);

    if (!couponResult.rows || couponResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: { valid: false },
        error: '쿠폰을 찾을 수 없습니다'
      });
    }

    const coupon = couponResult.rows[0];

    // 2. 쿠폰 상태 확인
    if (coupon.status === 'USED') {
      // 사용된 쿠폰 - 언제, 어디서 사용되었는지 알려줌
      const usageResult = await connection.execute(`
        SELECT merchant_id, approved_at
        FROM coupon_usage_logs
        WHERE user_coupon_id = ?
        LIMIT 1
      `, [coupon.id]);

      let usedMerchantName = '다른 가맹점';
      if (usageResult.rows && usageResult.rows.length > 0) {
        const usedMerchantId = usageResult.rows[0].merchant_id;
        const merchantResult = await connection.execute(`
          SELECT merchant_name FROM campaign_merchants
          WHERE merchant_id = ? LIMIT 1
        `, [usedMerchantId]);

        if (merchantResult.rows && merchantResult.rows.length > 0) {
          usedMerchantName = merchantResult.rows[0].merchant_name;
        }
      }

      return res.status(400).json({
        success: false,
        data: { valid: false },
        error: '이미 사용된 쿠폰입니다',
        used_at: coupon.used_at,
        used_merchant: usedMerchantName
      });
    }

    if (coupon.status === 'EXPIRED') {
      return res.status(400).json({
        success: false,
        data: { valid: false },
        error: '만료된 쿠폰입니다'
      });
    }

    if (coupon.status === 'REVOKED') {
      return res.status(400).json({
        success: false,
        data: { valid: false },
        error: '취소된 쿠폰입니다'
      });
    }

    // 3. 캠페인 상태 확인
    if (coupon.campaign_status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        data: { valid: false },
        error: '캠페인이 종료되었거나 일시 중지되었습니다'
      });
    }

    // 4. 가맹점이 캠페인에 포함되어 있는지 확인
    const merchantRuleResult = await connection.execute(`
      SELECT
        discount_type,
        discount_value,
        max_discount_amount,
        min_order_amount,
        is_active
      FROM campaign_merchants
      WHERE campaign_id = ? AND merchant_id = ?
    `, [coupon.campaign_id, merchant_id]);

    if (!merchantRuleResult.rows || merchantRuleResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        data: { valid: false },
        error: '이 가맹점에서는 사용할 수 없는 쿠폰입니다'
      });
    }

    const rule = merchantRuleResult.rows[0];

    if (!rule.is_active) {
      return res.status(400).json({
        success: false,
        data: { valid: false },
        error: '이 가맹점의 할인 혜택이 비활성화되었습니다'
      });
    }

    // 5. 모든 검증 통과 - 유효한 쿠폰
    console.log(`✅ 쿠폰 검증 성공: ${coupon_code} at merchant ${merchant_id}`);

    return res.status(200).json({
      success: true,
      data: {
        valid: true,
        coupon: {
          coupon_code: coupon.coupon_code,
          user_name: coupon.user_name,
          campaign_name: coupon.campaign_name
        },
        discount_rule: {
          discount_type: rule.discount_type,
          discount_value: parseFloat(rule.discount_value),
          max_discount_amount: rule.max_discount_amount ? parseFloat(rule.max_discount_amount) : null,
          min_order_amount: parseFloat(rule.min_order_amount)
        }
      }
    });

  } catch (error) {
    console.error('❌ Coupon validate API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

### Day 14 작업 목표
POST /api/partner/coupon-use 구현 (쿠폰 사용 승인)

### 세부 작업

#### 14-1. 쿠폰 사용 승인 API (5시간)

**파일**: `api/partner/coupon-use.js`

```javascript
const { connect } = require('@planetscale/database');
const { sendCouponUsedMessage } = require('@/utils/kakao-message');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // TODO: 파트너 인증 확인

  const { coupon_code, merchant_id, partner_id, order_amount } = req.body;

  if (!coupon_code || !merchant_id || !partner_id || !order_amount) {
    return res.status(400).json({
      success: false,
      error: '필수 필드가 누락되었습니다: coupon_code, merchant_id, partner_id, order_amount'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log(`🔍 쿠폰 사용 요청: ${coupon_code}, merchant: ${merchant_id}, amount: ${order_amount}`);

    // 1. 쿠폰 재검증 (다시 한번 유효성 확인)
    const couponResult = await connection.execute(`
      SELECT
        uc.id,
        uc.user_id,
        uc.coupon_code,
        uc.status,
        uc.campaign_id,
        c.name as campaign_name
      FROM user_coupons uc
      JOIN campaigns c ON uc.campaign_id = c.id
      WHERE uc.coupon_code = ? AND uc.status = 'ACTIVE'
    `, [coupon_code]);

    if (!couponResult.rows || couponResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 쿠폰이거나 이미 사용되었습니다'
      });
    }

    const coupon = couponResult.rows[0];

    // 2. 가맹점 할인 규칙 조회
    const ruleResult = await connection.execute(`
      SELECT
        discount_type,
        discount_value,
        max_discount_amount,
        min_order_amount,
        is_active
      FROM campaign_merchants
      WHERE campaign_id = ? AND merchant_id = ? AND is_active = TRUE
    `, [coupon.campaign_id, merchant_id]);

    if (!ruleResult.rows || ruleResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: '이 가맹점에서는 사용할 수 없는 쿠폰입니다'
      });
    }

    const rule = ruleResult.rows[0];

    // 3. 최소 주문 금액 확인
    const orderAmountNum = parseFloat(order_amount);
    const minOrderAmount = parseFloat(rule.min_order_amount);

    if (orderAmountNum < minOrderAmount) {
      return res.status(400).json({
        success: false,
        error: `최소 주문 금액은 ${minOrderAmount.toLocaleString()}원입니다`,
        min_order_amount: minOrderAmount,
        current_amount: orderAmountNum
      });
    }

    // 4. 할인 금액 계산
    let discountAmount = 0;

    if (rule.discount_type === 'PERCENT') {
      // 퍼센트 할인
      discountAmount = orderAmountNum * (parseFloat(rule.discount_value) / 100);

      // 최대 할인 금액 제한
      if (rule.max_discount_amount) {
        const maxDiscount = parseFloat(rule.max_discount_amount);
        discountAmount = Math.min(discountAmount, maxDiscount);
      }
    } else {
      // 고정 금액 할인
      discountAmount = parseFloat(rule.discount_value);
    }

    discountAmount = Math.floor(discountAmount);  // 원 단위로 내림
    const finalAmount = orderAmountNum - discountAmount;

    console.log(`💰 할인 계산: 주문 ${orderAmountNum}원 → 할인 ${discountAmount}원 → 최종 ${finalAmount}원`);

    // 5. DB 트랜잭션 시작
    // 5-1. user_coupons 상태 업데이트
    await connection.execute(`
      UPDATE user_coupons
      SET status = 'USED',
          used_at = NOW(),
          used_merchant_id = ?,
          used_partner_id = ?,
          updated_at = NOW()
      WHERE id = ? AND status = 'ACTIVE'
    `, [merchant_id, partner_id, coupon.id]);

    console.log(`✅ user_coupons 업데이트 완료`);

    // 5-2. coupon_usage_logs 삽입
    const logResult = await connection.execute(`
      INSERT INTO coupon_usage_logs (
        user_coupon_id, user_id, campaign_id, merchant_id,
        approved_by_partner_id, approved_at,
        order_amount, discount_amount, final_amount,
        settlement_status
      ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, 'PENDING')
    `, [
      coupon.id,
      coupon.user_id,
      coupon.campaign_id,
      merchant_id,
      partner_id,
      orderAmountNum,
      discountAmount,
      finalAmount
    ]);

    const usageLogId = logResult.insertId;
    console.log(`✅ coupon_usage_logs 생성: ID ${usageLogId}`);

    // 5-3. usage_log_id 업데이트
    await connection.execute(`
      UPDATE user_coupons
      SET usage_log_id = ?
      WHERE id = ?
    `, [usageLogId, coupon.id]);

    // 5-4. campaigns 통계 업데이트
    await connection.execute(`
      UPDATE campaigns
      SET total_used = total_used + 1
      WHERE id = ?
    `, [coupon.campaign_id]);

    console.log(`✅ campaigns 통계 업데이트 완료`);

    // 5-5. campaign_merchants 통계 업데이트
    await connection.execute(`
      UPDATE campaign_merchants
      SET total_usage_count = total_usage_count + 1,
          total_discount_amount = total_discount_amount + ?
      WHERE campaign_id = ? AND merchant_id = ?
    `, [discountAmount, coupon.campaign_id, merchant_id]);

    console.log(`✅ campaign_merchants 통계 업데이트 완료`);

    // 6. 카카오 메시지 발송 (비동기)
    const merchantNameResult = await connection.execute(`
      SELECT merchant_name FROM campaign_merchants
      WHERE merchant_id = ? LIMIT 1
    `, [merchant_id]);

    const merchantName = merchantNameResult.rows && merchantNameResult.rows.length > 0
      ? merchantNameResult.rows[0].merchant_name
      : '가맹점';

    try {
      await sendCouponUsedMessage(coupon.user_id, {
        coupon_id: coupon.id,
        merchant_name: merchantName,
        discount_amount: discountAmount
      });
      console.log(`📧 카카오 메시지 발송 완료`);
    } catch (msgError) {
      console.warn('⚠️  카카오 메시지 발송 실패:', msgError.message);
    }

    // 7. 응답
    console.log(`🎉 쿠폰 사용 승인 완료: ${coupon_code}`);

    return res.status(200).json({
      success: true,
      data: {
        order_amount: orderAmountNum,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        usage_log_id: usageLogId
      },
      message: '쿠폰이 사용되었습니다'
    });

  } catch (error) {
    console.error('❌ Coupon use API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

### 완료 기준
- [ ] 쿠폰 유효성 검증 API 동작 확인
- [ ] 에러 케이스 확인 (이미 사용, 만료, 가맹점 미포함)
- [ ] 쿠폰 사용 승인 API 동작 확인
- [ ] 할인 금액 계산 확인 (퍼센트, 고정 금액, 최대 할인)
- [ ] 최소 주문 금액 검증 확인
- [ ] DB 트랜잭션 확인 (모든 테이블 업데이트)

---

## Day 15: 리뷰 및 포인트 API 구현

### 작업 목표
POST /api/smart-coupons/reviews 구현

### 세부 작업

#### 15-1. 리뷰 작성 API (4시간)

**파일**: `api/smart-coupons/reviews.js`

```javascript
const { connect } = require('@planetscale/database');
const { sendPointsAwardedMessage } = require('@/utils/kakao-message');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // TODO: JWT에서 user_id 추출
  const userId = req.user?.id || req.body.user_id;

  const { user_coupon_id, rating, review_text } = req.body;

  if (!user_coupon_id || !rating) {
    return res.status(400).json({
      success: false,
      error: '필수 필드가 누락되었습니다: user_coupon_id, rating'
    });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      error: '평점은 1-5 사이여야 합니다'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 1. 쿠폰 확인
    const couponResult = await connection.execute(`
      SELECT
        uc.id,
        uc.user_id,
        uc.status,
        uc.used_merchant_id,
        uc.campaign_id,
        uc.review_submitted
      FROM user_coupons uc
      WHERE uc.id = ?
    `, [user_coupon_id]);

    if (!couponResult.rows || couponResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '쿠폰을 찾을 수 없습니다'
      });
    }

    const coupon = couponResult.rows[0];

    // 2. 본인 쿠폰인지 확인
    if (coupon.user_id !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        error: '본인의 쿠폰만 리뷰를 작성할 수 있습니다'
      });
    }

    // 3. 사용된 쿠폰인지 확인
    if (coupon.status !== 'USED') {
      return res.status(400).json({
        success: false,
        error: '사용된 쿠폰만 리뷰를 작성할 수 있습니다'
      });
    }

    // 4. 이미 리뷰 작성 여부 확인
    if (coupon.review_submitted) {
      return res.status(400).json({
        success: false,
        error: '이미 리뷰를 작성한 쿠폰입니다'
      });
    }

    // 5. 리뷰 저장
    const REVIEW_POINTS = 500;  // 리뷰 작성 시 지급 포인트

    const reviewResult = await connection.execute(`
      INSERT INTO coupon_reviews (
        user_coupon_id, user_id, merchant_id, campaign_id,
        rating, review_text,
        points_awarded, points_awarded_at,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 'APPROVED', NOW())
    `, [
      user_coupon_id,
      userId,
      coupon.used_merchant_id,
      coupon.campaign_id,
      rating,
      review_text || null,
      REVIEW_POINTS
    ]);

    const reviewId = reviewResult.insertId;
    console.log(`✅ 리뷰 작성 완료: review_id=${reviewId}`);

    // 6. user_coupons 업데이트
    await connection.execute(`
      UPDATE user_coupons
      SET review_submitted = TRUE,
          review_points_awarded = ?
      WHERE id = ?
    `, [REVIEW_POINTS, user_coupon_id]);

    // 7. users 테이블 포인트 업데이트
    await connection.execute(`
      UPDATE users
      SET points = points + ?
      WHERE id = ?
    `, [REVIEW_POINTS, userId]);

    console.log(`✅ 포인트 지급 완료: ${REVIEW_POINTS}P to user_id=${userId}`);

    // 8. 카카오 메시지 발송
    try {
      await sendPointsAwardedMessage(userId, {
        points: REVIEW_POINTS
      });
      console.log(`📧 카카오 메시지 발송 완료`);
    } catch (msgError) {
      console.warn('⚠️  카카오 메시지 발송 실패:', msgError.message);
    }

    // 9. 응답
    return res.status(201).json({
      success: true,
      data: {
        review_id: reviewId,
        points_awarded: REVIEW_POINTS
      },
      message: `리뷰가 등록되고 ${REVIEW_POINTS}P가 지급되었습니다!`
    });

  } catch (error) {
    console.error('❌ Review API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

#### 15-2. 정산 조회 API (관리자용) (2시간)

**파일**: `api/admin/settlements.js`

```javascript
const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // TODO: 관리자 권한 확인

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    if (req.method === 'GET') {
      const { campaign_id, merchant_id, status, year_month } = req.query;

      let query = `
        SELECT
          cm.merchant_id,
          cm.merchant_name,
          c.name as campaign_name,
          COUNT(ul.id) as usage_count,
          SUM(ul.discount_amount) as total_discount
        FROM coupon_usage_logs ul
        JOIN campaign_merchants cm ON ul.merchant_id = cm.merchant_id AND ul.campaign_id = cm.campaign_id
        JOIN campaigns c ON ul.campaign_id = c.id
        WHERE 1=1
      `;
      const params = [];

      if (campaign_id) {
        query += ` AND ul.campaign_id = ?`;
        params.push(campaign_id);
      }

      if (merchant_id) {
        query += ` AND ul.merchant_id = ?`;
        params.push(merchant_id);
      }

      if (status) {
        query += ` AND ul.settlement_status = ?`;
        params.push(status);
      }

      if (year_month) {
        // 형식: 2025-01
        query += ` AND DATE_FORMAT(ul.approved_at, '%Y-%m') = ?`;
        params.push(year_month);
      }

      query += ` GROUP BY cm.merchant_id, cm.merchant_name, c.name`;
      query += ` ORDER BY total_discount DESC`;

      const result = await connection.execute(query, params);

      return res.status(200).json({
        success: true,
        data: {
          settlements: result.rows || []
        }
      });
    }

    if (req.method === 'PUT') {
      // 정산 완료 처리
      const { usage_log_ids, settlement_date } = req.body;

      if (!usage_log_ids || !Array.isArray(usage_log_ids)) {
        return res.status(400).json({
          success: false,
          error: 'usage_log_ids 배열이 필요합니다'
        });
      }

      for (const logId of usage_log_ids) {
        await connection.execute(`
          UPDATE coupon_usage_logs
          SET settlement_status = 'COMPLETED',
              settlement_date = ?
          WHERE id = ?
        `, [settlement_date || new Date(), logId]);
      }

      console.log(`✅ ${usage_log_ids.length}건 정산 완료`);

      return res.status(200).json({
        success: true,
        message: `${usage_log_ids.length}건의 정산이 완료되었습니다`
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ Settlements API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

### 완료 기준
- [ ] 리뷰 작성 API 동작 확인
- [ ] 포인트 지급 확인 (coupon_reviews, user_coupons, users 테이블)
- [ ] 중복 리뷰 방지 확인
- [ ] 정산 조회 API 동작 확인

---

# Phase 3: 프론트엔드 개발 (Day 16-25)

## Day 16-17: 캠페인 랜딩페이지 개발

*(Day 4에서 설계한 CampaignLandingPage 컴포넌트 구현)*

### 작업 내용 요약
- 캠페인 정보 표시
- 공용 QR 코드 표시
- "쿠폰 받기" 버튼 (로그인 여부에 따라 카카오 로그인 or 발급)
- 가맹점 목록 표시
- 반응형 디자인

## Day 18-19: 내 쿠폰 페이지 & 쿠폰 상세 페이지 개발

### 작업 내용 요약
- 내 쿠폰 목록 표시 (상태별 필터)
- 쿠폰 카드 디자인
- 쿠폰 상세 페이지 (QR 코드 전체 화면)
- 사용 내역 표시 (사용된 경우)

## Day 20-21: 파트너 QR 스캐너 개발

### 작업 내용 요약
- react-qr-reader 라이브러리 사용
- QR 스캔 화면
- 쿠폰 검증 모달
- 사용 승인 모달 (주문 금액 입력, 할인 계산)

## Day 22-23: 파트너 대시보드 개발

### 작업 내용 요약
- 쿠폰 사용 내역 목록
- 일별/월별 통계
- 정산 대상 조회
- 필터링 기능

## Day 24-25: 리뷰 작성 페이지 개발

### 작업 내용 요약
- 별점 입력 (1-5)
- 리뷰 텍스트 입력
- 포인트 지급 안내
- 제출 후 포인트 확인

---

# Phase 4: 카카오 메시징 통합 (Day 26-28)

## Day 26: 카카오 메시지 템플릿 등록

### 작업 내용
- 카카오 비즈니스 계정 생성
- 메시지 템플릿 4종 등록
- 템플릿 승인 대기

## Day 27-28: 메시지 발송 테스트 및 최적화

### 작업 내용
- 실제 메시지 발송 테스트
- 에러 처리 개선
- 발송 로그 확인

---

# Phase 5: 관리자 페이지 개발 (Day 29-31)

## Day 29-30: 캠페인 관리 페이지

### 작업 내용
- 캠페인 목록 표시
- 캠페인 생성 폼
- 가맹점 규칙 편집기
- 캠페인 통계 대시보드

## Day 31: 정산 관리 페이지

### 작업 내용
- 가맹점별 정산 내역
- 월별 필터링
- 정산 완료 처리
- CSV 다운로드

---

# Phase 6: 테스트 및 배포 (Day 32-35)

## Day 32-33: 통합 테스트

### 작업 내용
- 전체 플로우 테스트 (사용자 시나리오)
- 에러 케이스 테스트
- 성능 테스트
- 보안 점검

## Day 34: 배포 준비

### 작업 내용
- 환경변수 설정 (프로덕션)
- DB 마이그레이션 (프로덕션)
- Vercel 배포 설정

## Day 35: 프로덕션 배포 및 모니터링

### 작업 내용
- Vercel 배포
- DNS 설정
- 모니터링 설정
- 최종 확인

---

# 완료!

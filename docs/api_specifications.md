# 스마트 쿠폰 시스템 - API 명세서

## 목차
1. [캠페인 관리 API](#1-캠페인-관리-api)
2. [쿠폰 발급 API](#2-쿠폰-발급-api)
3. [파트너 쿠폰 사용 API](#3-파트너-쿠폰-사용-api)
4. [리뷰 및 포인트 API](#4-리뷰-및-포인트-api)
5. [카카오 OAuth API](#5-카카오-oauth-api)
6. [관리자 API](#6-관리자-api)

---

# 1. 캠페인 관리 API

## 1-1. 활성 캠페인 목록 조회

### `GET /api/campaigns`

**목적**: 활성 캠페인 목록 조회 (Public)

**권한**: Public (인증 불필요)

**Query Parameters**:
```typescript
{
  status?: 'ACTIVE' | 'ENDED' | 'ALL',  // 기본값: 'ACTIVE'
  page?: number,                          // 기본값: 1
  limit?: number                          // 기본값: 10
}
```

**Response (200 OK)**:
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
        merchant_count: 45  // JOIN으로 계산
      }
    ],
    pagination: {
      total: 3,
      page: 1,
      limit: 10,
      total_pages: 1
    }
  }
}
```

**SQL Query**:
```sql
SELECT
  c.*,
  (SELECT COUNT(*) FROM campaign_merchants WHERE campaign_id = c.id) as merchant_count
FROM campaigns c
WHERE status = 'ACTIVE'
ORDER BY c.created_at DESC
LIMIT 10 OFFSET 0;
```

---

## 1-2. 캠페인 상세 조회 (랜딩페이지용)

### `GET /api/campaigns/:campaignCode`

**목적**: 특정 캠페인 상세 정보 + 가맹점 목록

**권한**: Public

**Path Parameters**:
- `campaignCode`: 캠페인 코드 (예: `ISLAND2025`)

**Response (200 OK)**:
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
      public_qr_image: "data:image/png;base64,iVBORw0KG...",
      valid_from: "2025-01-01T00:00:00Z",
      valid_to: "2025-12-31T23:59:59Z",
      status: "ACTIVE",
      total_issued: 1523,
      total_used: 847,
      merchants: [
        {
          id: 5,
          name: "제주 맛집",
          category: "음식점",
          discount_type: "PERCENT",
          discount_value: 20,
          max_discount_amount: 5000,
          min_order_amount: 10000
        },
        {
          id: 7,
          name: "제주 카페",
          category: "카페",
          discount_type: "AMOUNT",
          discount_value: 3000,
          max_discount_amount: null,
          min_order_amount: 5000
        }
      ]
    }
  }
}
```

**Response (404 Not Found)**:
```typescript
{
  success: false,
  error: "캠페인을 찾을 수 없습니다"
}
```

**SQL Query**:
```sql
-- 1) 캠페인 기본 정보
SELECT * FROM campaigns WHERE campaign_code = 'ISLAND2025';

-- 2) 가맹점 목록
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
WHERE campaign_id = 1 AND is_active = TRUE
ORDER BY merchant_name ASC;
```

---

# 2. 쿠폰 발급 API

## 2-1. 쿠폰 발급

### `POST /api/smart-coupons/issue`

**목적**: 사용자에게 쿠폰 발급 (카카오 로그인 후)

**권한**: Authenticated user (JWT 필요)

**Request Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```typescript
{
  campaign_id: 1,
  user_id: 123  // JWT에서 추출 (검증용)
}
```

**비즈니스 로직 순서**:
1. ✅ 캠페인 유효성 확인 (status=ACTIVE, 기간 내)
2. ✅ 이미 발급 여부 확인 (1인 1캠페인 1쿠폰)
3. ✅ 발급 수량 제한 확인 (max_issuance)
4. 🔧 고유 쿠폰 코드 생성 (`CAMPAIGN_CODE-RANDOM6`)
5. 🔧 QR 코드 생성 (URL: `/coupon?code=...`)
6. 💾 DB 저장 (`user_coupons` INSERT)
7. 📊 캠페인 통계 업데이트 (`campaigns.total_issued++`)
8. 📧 카카오 메시지 발송 (선택)

**Response (201 Created)**:
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

**Error Cases**:

### 중복 발급 (400 Bad Request)
```typescript
{
  success: false,
  error: "이미 이 캠페인의 쿠폰을 보유하고 있습니다",
  existing_coupon: {
    coupon_code: "ISLAND2025-B1C2D3",
    status: "ACTIVE"
  }
}
```

### 수량 초과 (400 Bad Request)
```typescript
{
  success: false,
  error: "캠페인 쿠폰이 모두 소진되었습니다"
}
```

### 기간 만료 (400 Bad Request)
```typescript
{
  success: false,
  error: "캠페인 기간이 종료되었습니다",
  valid_to: "2024-12-31T23:59:59Z"
}
```

### 캠페인 없음 (404 Not Found)
```typescript
{
  success: false,
  error: "캠페인을 찾을 수 없습니다"
}
```

---

## 2-2. 내 쿠폰 목록 조회

### `GET /api/smart-coupons/my`

**목적**: 내가 보유한 쿠폰 목록

**권한**: Authenticated user

**Request Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters**:
```typescript
{
  status?: 'ACTIVE' | 'USED' | 'EXPIRED',  // 선택
  page?: number,                             // 기본값: 1
  limit?: number                             // 기본값: 10
}
```

**Response (200 OK)**:
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
        expires_at: "2025-12-31T23:59:59Z",
        usage_info: null,  // 미사용 시 null
        review_submitted: false
      },
      {
        id: 998,
        coupon_code: "ISLAND2025-X7Y8Z9",
        status: "USED",
        campaign: {
          name: "2025 가고싶은섬"
        },
        used_at: "2025-02-01T18:30:00Z",
        usage_info: {
          merchant_name: "제주 맛집",
          order_amount: 25000,
          discount_amount: 5000,
          final_amount: 20000,
          approved_at: "2025-02-01T18:30:00Z"
        },
        review_submitted: true
      }
    ],
    pagination: {
      total: 5,
      page: 1,
      limit: 10,
      total_pages: 1
    }
  }
}
```

**SQL Query**:
```sql
-- 1) 쿠폰 목록
SELECT
  uc.id,
  uc.coupon_code,
  uc.qr_url,
  uc.qr_image,
  uc.status,
  uc.issued_at,
  uc.expires_at,
  uc.used_at,
  uc.review_submitted,
  c.name as campaign_name,
  c.description as campaign_description,
  c.valid_to as campaign_valid_to
FROM user_coupons uc
JOIN campaigns c ON uc.campaign_id = c.id
WHERE uc.user_id = 123
  AND uc.status = 'ACTIVE'  -- 필터 적용 시
ORDER BY uc.issued_at DESC
LIMIT 10 OFFSET 0;

-- 2) 사용 내역 (status='USED'인 경우만)
SELECT
  cm.merchant_name,
  ul.order_amount,
  ul.discount_amount,
  ul.final_amount,
  ul.approved_at
FROM coupon_usage_logs ul
JOIN campaign_merchants cm ON ul.merchant_id = cm.merchant_id
WHERE ul.user_coupon_id = 998;
```

---

## 2-3. 쿠폰 상세 조회

### `GET /api/smart-coupons/:couponCode`

**목적**: 쿠폰 상세 정보 (QR 전체 화면 표시용)

**권한**: Authenticated user (본인 쿠폰만)

**Path Parameters**:
- `couponCode`: 쿠폰 코드 (예: `ISLAND2025-A3F5D8`)

**Response (200 OK)**:
```typescript
{
  success: true,
  data: {
    coupon: {
      id: 1001,
      coupon_code: "ISLAND2025-A3F5D8",
      qr_url: "https://travleap.com/coupon?code=ISLAND2025-A3F5D8",
      qr_image: "data:image/png;base64,...",
      status: "ACTIVE",
      issued_at: "2025-01-15T10:30:00Z",
      expires_at: "2025-12-31T23:59:59Z",
      campaign: {
        name: "2025 가고싶은섬",
        description: "제주도 내 45개 가맹점에서 사용 가능",
        valid_to: "2025-12-31T23:59:59Z"
      },
      usage_info: null,  // 미사용
      review_submitted: false,
      merchants: [
        {
          name: "제주 맛집",
          category: "음식점",
          discount_type: "PERCENT",
          discount_value: 20,
          max_discount_amount: 5000,
          min_order_amount: 10000
        }
      ]
    }
  }
}
```

**Response (403 Forbidden)**:
```typescript
{
  success: false,
  error: "본인의 쿠폰만 조회할 수 있습니다"
}
```

---

# 3. 파트너 쿠폰 사용 API

## 3-1. 쿠폰 유효성 검증

### `POST /api/partner/coupon-validate`

**목적**: QR 스캔 후 쿠폰 유효성 확인 (승인 전)

**권한**: Partner only

**Request Body**:
```typescript
{
  coupon_code: "ISLAND2025-A3F5D8",
  merchant_id: 5
}
```

**비즈니스 로직**:
1. ✅ 쿠폰 존재 여부 확인
2. ✅ 쿠폰 상태 확인 (status=ACTIVE)
3. ✅ 캠페인 상태 확인 (status=ACTIVE)
4. ✅ 가맹점이 캠페인에 포함되어 있는지 확인
5. 📋 할인 규칙 조회

**Response (200 OK) - 유효한 쿠폰**:
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

**Response (400 Bad Request) - 이미 사용됨**:
```typescript
{
  success: false,
  data: { valid: false },
  error: "이미 사용된 쿠폰입니다",
  used_at: "2025-02-01T18:30:00Z",
  used_merchant: "다른 식당"
}
```

**Response (400 Bad Request) - 가맹점 미포함**:
```typescript
{
  success: false,
  data: { valid: false },
  error: "이 가맹점에서는 사용할 수 없는 쿠폰입니다"
}
```

---

## 3-2. 쿠폰 사용 승인

### `POST /api/partner/coupon-use`

**목적**: 쿠폰 사용 승인 (할인 적용)

**권한**: Partner only

**Request Body**:
```typescript
{
  coupon_code: "ISLAND2025-A3F5D8",
  merchant_id: 5,
  partner_id: 42,
  order_amount: 23000  // 주문 금액
}
```

**비즈니스 로직**:
1. ✅ 재검증 (다시 한번 유효성 확인)
2. 🔢 할인 금액 계산
   - PERCENT: `discount = min(order_amount * (discount_value/100), max_discount_amount)`
   - AMOUNT: `discount = discount_value`
3. ✅ 최소 주문 금액 확인
4. 🔢 최종 결제 금액 계산
5. 💾 DB 트랜잭션:
   - `user_coupons` UPDATE (status=USED)
   - `coupon_usage_logs` INSERT
   - `campaigns` UPDATE (total_used++)
   - `campaign_merchants` UPDATE (total_usage_count++, total_discount_amount+=)
6. 📧 카카오 메시지 발송 (사용 확인 + 리뷰 요청)

**Response (200 OK)**:
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

**Error Cases**:

### 최소 주문 금액 미달 (400 Bad Request)
```typescript
{
  success: false,
  error: "최소 주문 금액은 10,000원입니다",
  min_order_amount: 10000,
  current_amount: 8000
}
```

### 이미 사용된 쿠폰 (400 Bad Request)
```typescript
{
  success: false,
  error: "유효하지 않은 쿠폰이거나 이미 사용되었습니다"
}
```

---

# 4. 리뷰 및 포인트 API

## 4-1. 리뷰 작성

### `POST /api/smart-coupons/reviews`

**목적**: 쿠폰 사용 후 리뷰 작성 + 포인트 지급

**권한**: Authenticated user

**Request Body**:
```typescript
{
  user_coupon_id: 1001,
  rating: 5,                      // 1-5
  review_text: "음식이 정말 맛있었어요!"  // 선택
}
```

**비즈니스 로직**:
1. ✅ 쿠폰 상태 확인 (status=USED)
2. ✅ 본인 쿠폰인지 확인
3. ✅ 이미 리뷰 작성 여부 확인
4. 💾 리뷰 저장
5. 💰 포인트 지급 (예: 500P)
6. 📊 통계 업데이트 (users.points, user_coupons.review_submitted)
7. 📧 카카오 메시지 발송 (포인트 지급 알림)

**Response (201 Created)**:
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

**Error Cases**:

### 이미 리뷰 작성 (400 Bad Request)
```typescript
{
  success: false,
  error: "이미 리뷰를 작성한 쿠폰입니다"
}
```

### 미사용 쿠폰 (400 Bad Request)
```typescript
{
  success: false,
  error: "사용된 쿠폰만 리뷰를 작성할 수 있습니다"
}
```

---

# 5. 카카오 OAuth API

## 5-1. 카카오 로그인 콜백

### `GET /api/auth/kakao/callback`

**목적**: 카카오 인증 완료 후 콜백 처리

**Query Parameters**:
```typescript
{
  code: "ABC123...",              // 카카오 인가 코드
  state: "ISLAND2025"             // 캠페인 코드 (선택)
}
```

**비즈니스 로직**:
1. 🔐 인가 코드로 액세스 토큰 요청
2. 👤 액세스 토큰으로 사용자 정보 조회
3. 💾 DB에서 기존 사용자 확인 (`kakao_users`)
4. 🆕 신규 사용자인 경우:
   - `users` INSERT (자동 회원가입)
   - `kakao_users` INSERT
5. 🔄 기존 사용자인 경우:
   - `kakao_users` UPDATE (토큰 갱신)
6. 🎫 JWT 토큰 생성
7. 🔄 프론트엔드로 리다이렉트

**Redirect URL**:
```
/coupon/ISLAND2025?token=JWT_TOKEN&auto_issue=true&new_user=true
```

또는

```
/my-coupons?token=JWT_TOKEN&new_user=false
```

---

# 6. 관리자 API

## 6-1. 캠페인 생성

### `POST /api/admin/campaigns`

**목적**: 새 캠페인 생성

**권한**: Admin only

**Request Body**:
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
      merchant_category: "음식점",
      discount_type: "PERCENT",
      discount_value: 20,
      max_discount_amount: 5000,
      min_order_amount: 10000
    },
    {
      merchant_id: 7,
      merchant_name: "제주 카페",
      merchant_category: "카페",
      discount_type: "AMOUNT",
      discount_value: 3000,
      max_discount_amount: null,
      min_order_amount: 5000
    }
  ]
}
```

**Response (201 Created)**:
```typescript
{
  success: true,
  data: {
    campaign_id: 1,
    campaign_code: "ISLAND2025",
    public_qr_url: "https://travleap.com/coupon/ISLAND2025",
    public_qr_image: "data:image/png;base64,..."
  },
  message: "캠페인이 생성되었습니다"
}
```

---

## 6-2. 정산 조회

### `GET /api/admin/settlements`

**목적**: 가맹점별 정산 내역 조회

**권한**: Admin only

**Query Parameters**:
```typescript
{
  campaign_id?: number,
  merchant_id?: number,
  status?: 'PENDING' | 'COMPLETED',
  year_month?: '2025-01'  // YYYY-MM 형식
}
```

**Response (200 OK)**:
```typescript
{
  success: true,
  data: {
    settlements: [
      {
        merchant_id: 5,
        merchant_name: "제주 맛집",
        campaign_name: "2025 가고싶은섬",
        usage_count: 120,
        total_discount: 580000
      }
    ]
  }
}
```

---

# 요약

## 전체 API 목록

| 번호 | 메서드 | 엔드포인트 | 권한 | 설명 |
|-----|--------|-----------|------|------|
| 1 | GET | /api/campaigns | Public | 캠페인 목록 |
| 2 | GET | /api/campaigns/:code | Public | 캠페인 상세 |
| 3 | POST | /api/smart-coupons/issue | User | 쿠폰 발급 |
| 4 | GET | /api/smart-coupons/my | User | 내 쿠폰 목록 |
| 5 | GET | /api/smart-coupons/:code | User | 쿠폰 상세 |
| 6 | POST | /api/partner/coupon-validate | Partner | 쿠폰 검증 |
| 7 | POST | /api/partner/coupon-use | Partner | 쿠폰 사용 |
| 8 | POST | /api/smart-coupons/reviews | User | 리뷰 작성 |
| 9 | GET | /api/auth/kakao/callback | Public | 카카오 콜백 |
| 10 | POST | /api/admin/campaigns | Admin | 캠페인 생성 |
| 11 | PUT | /api/admin/campaigns/:id | Admin | 캠페인 수정 |
| 12 | GET | /api/admin/settlements | Admin | 정산 조회 |

## 공통 응답 형식

### 성공 응답
```typescript
{
  success: true,
  data: { ... },
  message?: string  // 선택적 메시지
}
```

### 에러 응답
```typescript
{
  success: false,
  error: "에러 메시지",
  details?: { ... }  // 추가 정보
}
```

## HTTP 상태 코드

- `200 OK` - 조회 성공
- `201 Created` - 생성 성공
- `400 Bad Request` - 잘못된 요청
- `401 Unauthorized` - 인증 필요
- `403 Forbidden` - 권한 없음
- `404 Not Found` - 리소스 없음
- `500 Internal Server Error` - 서버 오류

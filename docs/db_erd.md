# 스마트 쿠폰 시스템 - ERD (Entity Relationship Diagram)

## 전체 관계도

```
┌─────────────────┐
│   campaigns     │ (캠페인)
├─────────────────┤
│ id (PK)         │
│ name            │
│ campaign_code   │◄─────────────┐
│ status          │              │
│ valid_from      │              │ 1
│ valid_to        │              │
│ max_issuance    │              │
│ total_issued    │              │
│ total_used      │              │
└─────────────────┘              │
                                 │
                                 │ N
        ┌────────────────────────┴────────────────────────┐
        │                                                  │
        │                                                  │
┌───────▼─────────┐                          ┌────────────▼──────────┐
│ user_coupons    │                          │ campaign_merchants    │
├─────────────────┤                          ├───────────────────────┤
│ id (PK)         │                          │ id (PK)               │
│ user_id (FK)    │◄──────────┐              │ campaign_id (FK)      │
│ campaign_id (FK)│           │              │ merchant_id           │
│ coupon_code     │           │              │ merchant_name         │
│ status          │           │              │ discount_type         │
│ used_merchant_id│           │              │ discount_value        │
│ review_submitted│           │              │ max_discount_amount   │
│ usage_log_id    │           │              │ min_order_amount      │
└────────┬────────┘           │              │ total_usage_count     │
         │                    │              │ total_discount_amount │
         │ 1                  │ N            └───────────────────────┘
         │                    │
         │                    │
         │               ┌────┴─────┐
         │               │  users   │ (기존 테이블)
         │               ├──────────┤
         │               │ id (PK)  │
         │               │ name     │
         │               │ email    │
         │               └────┬─────┘
         │                    │
         │                    │ 1
         │                    │
         │               ┌────▼────────────┐
         │               │  kakao_users    │
         │               ├─────────────────┤
         │               │ id (PK)         │
         │               │ user_id (FK)    │
         │               │ kakao_user_id   │
         │               │ kakao_email     │
         │               │ access_token    │
         │               │ refresh_token   │
         │               └─────────────────┘
         │
         │ 1
         │
         │
         ▼ N
┌─────────────────────┐
│ coupon_usage_logs   │
├─────────────────────┤
│ id (PK)             │
│ user_coupon_id (FK) │
│ user_id             │
│ campaign_id (FK)    │
│ merchant_id         │
│ partner_id          │
│ order_amount        │
│ discount_amount     │
│ final_amount        │
│ settlement_status   │
│ settlement_date     │
└─────────────────────┘
         │
         │
         │ 1
         │
         ▼ 1
┌─────────────────┐
│ coupon_reviews  │
├─────────────────┤
│ id (PK)         │
│ user_coupon_id  │◄─── UNIQUE (1쿠폰 1리뷰)
│ user_id (FK)    │
│ merchant_id     │
│ rating          │
│ review_text     │
│ points_awarded  │
└─────────────────┘


              ┌──────────────────────┐
              │ kakao_message_logs   │
              ├──────────────────────┤
              │ id (PK)              │
              │ user_id              │
              │ kakao_user_id        │
              │ message_type         │
              │ status               │
              │ related_coupon_id    │
              │ related_campaign_id  │
              └──────────────────────┘
```

## 핵심 관계 (Cardinality)

### 1. campaigns ↔ user_coupons (1:N)
- **관계**: 1개 캠페인 → 여러 사용자 쿠폰
- **의미**: "2025 가고싶은섬" 캠페인에서 1,000명에게 쿠폰 발급
- **제약**: UNIQUE(user_id, campaign_id) → 1인 1캠페인 1쿠폰

### 2. campaigns ↔ campaign_merchants (1:N)
- **관계**: 1개 캠페인 → 여러 가맹점
- **의미**: "2025 가고싶은섬" 캠페인에 45개 가맹점 참여
- **제약**: UNIQUE(campaign_id, merchant_id) → 캠페인당 가맹점 1번만 등록

### 3. users ↔ user_coupons (1:N)
- **관계**: 1명 사용자 → 여러 쿠폰
- **의미**: 김철수가 "가고싶은섬", "겨울축제" 등 여러 캠페인 쿠폰 보유

### 4. user_coupons ↔ coupon_usage_logs (1:1)
- **관계**: 1개 쿠폰 → 1개 사용 로그 (최대)
- **의미**: 쿠폰은 1번만 사용 가능
- **구현**: user_coupons.usage_log_id (nullable)

### 5. user_coupons ↔ coupon_reviews (1:1)
- **관계**: 1개 쿠폰 → 1개 리뷰 (최대)
- **의미**: 사용한 쿠폰에 대해 1번만 리뷰 작성
- **제약**: UNIQUE(user_coupon_id)

### 6. users ↔ kakao_users (1:1)
- **관계**: 1명 사용자 → 1개 카카오 연동
- **의미**: Travleap 계정 1개당 카카오 계정 1개 연결
- **제약**: UNIQUE(user_id), UNIQUE(kakao_user_id)

## 데이터 플로우 (쿠폰 생애주기)

```
1. 캠페인 생성
   └─> campaigns INSERT

2. 가맹점 등록
   └─> campaign_merchants INSERT (여러 개)

3. 사용자 쿠폰 발급
   └─> user_coupons INSERT
       └─> campaigns.total_issued++

4. 가맹점에서 쿠폰 사용
   └─> coupon_usage_logs INSERT
       └─> user_coupons UPDATE (status=USED)
           └─> campaigns.total_used++
               └─> campaign_merchants.total_usage_count++

5. 리뷰 작성
   └─> coupon_reviews INSERT
       └─> user_coupons UPDATE (review_submitted=TRUE)
           └─> users UPDATE (points+=500)

6. 정산 완료
   └─> coupon_usage_logs UPDATE (settlement_status=COMPLETED)
```

## 제약 조건 (Constraints)

### UNIQUE 제약
1. **campaigns.campaign_code** - 캠페인 코드 중복 불가
2. **user_coupons.coupon_code** - 쿠폰 코드 중복 불가
3. **user_coupons(user_id, campaign_id)** - 1인 1캠페인 1쿠폰
4. **campaign_merchants(campaign_id, merchant_id)** - 캠페인당 가맹점 1번
5. **coupon_reviews.user_coupon_id** - 쿠폰당 리뷰 1개
6. **kakao_users.user_id** - 사용자당 카카오 연동 1개
7. **kakao_users.kakao_user_id** - 카카오 계정당 Travleap 계정 1개

### FOREIGN KEY 제약 (ON DELETE CASCADE)
- user_coupons → users
- user_coupons → campaigns
- campaign_merchants → campaigns
- coupon_usage_logs → user_coupons
- coupon_usage_logs → campaigns
- kakao_users → users
- coupon_reviews → user_coupons
- coupon_reviews → users

**CASCADE 의미**: 캠페인 삭제 시 해당 캠페인의 모든 쿠폰, 가맹점 규칙도 함께 삭제

## 테이블 크기 예상 (1년 운영 기준)

| 테이블 | 예상 행 수 | 비고 |
|--------|-----------|------|
| campaigns | ~50 | 월 4-5개 캠페인 |
| campaign_merchants | ~2,000 | 캠페인당 평균 40개 가맹점 |
| user_coupons | ~500,000 | 캠페인당 평균 10,000명 발급 |
| coupon_usage_logs | ~350,000 | 사용률 70% 가정 |
| coupon_reviews | ~250,000 | 리뷰 작성률 70% 가정 |
| kakao_users | ~100,000 | 누적 사용자 수 |
| kakao_message_logs | ~2,000,000 | 사용자당 평균 메시지 4건 |

## 성능 고려사항

### 1. 자주 조회되는 쿼리
```sql
-- 1) 내 쿠폰 목록 (user_id)
SELECT * FROM user_coupons WHERE user_id = ? ORDER BY issued_at DESC;
-- → INDEX: idx_user_id

-- 2) QR 스캔 시 쿠폰 조회 (coupon_code)
SELECT * FROM user_coupons WHERE coupon_code = ?;
-- → INDEX: idx_coupon_code (UNIQUE)

-- 3) 캠페인별 통계
SELECT COUNT(*) FROM user_coupons WHERE campaign_id = ? AND status = 'USED';
-- → INDEX: idx_campaign_id, idx_status (복합 인덱스 고려)

-- 4) 정산 대상 조회
SELECT * FROM coupon_usage_logs
WHERE settlement_status = 'PENDING'
  AND approved_at >= '2025-01-01';
-- → INDEX: idx_settlement_status, idx_approved_at
```

### 2. 쓰기 성능 최적화
- 쿠폰 사용 시 여러 테이블 업데이트 → **트랜잭션** 필수
- 통계 컬럼(total_issued, total_used 등) → **원자성** 보장

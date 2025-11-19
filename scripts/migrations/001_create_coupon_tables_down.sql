-- ========================================
-- 마이그레이션: 001 - 스마트 쿠폰 테이블 삭제 (DOWN)
-- ========================================
-- 실행 순서: 외래키 의존성의 역순으로 삭제
-- ========================================

-- 롤백 시 주의사항:
-- 1. 이 스크립트는 모든 쿠폰 데이터를 영구 삭제합니다
-- 2. CASCADE 설정으로 인해 연결된 데이터도 함께 삭제됩니다
-- 3. 프로덕션에서는 반드시 백업 후 실행하세요

-- ========================================
-- Step 1: 종속 테이블 삭제 (외래키 없는 테이블)
-- ========================================

-- 7. kakao_message_logs (독립적)
DROP TABLE IF EXISTS kakao_message_logs;

-- 6. coupon_reviews (user_coupons 참조)
DROP TABLE IF EXISTS coupon_reviews;

-- 5. kakao_users (독립적, users는 남겨둠)
DROP TABLE IF EXISTS kakao_users;

-- ========================================
-- Step 2: 중간 테이블 삭제
-- ========================================

-- 4. coupon_usage_logs (user_coupons, campaigns 참조)
DROP TABLE IF EXISTS coupon_usage_logs;

-- 3. campaign_merchants (campaigns 참조)
DROP TABLE IF EXISTS campaign_merchants;

-- ========================================
-- Step 3: 핵심 테이블 삭제
-- ========================================

-- 2. user_coupons (campaigns 참조)
DROP TABLE IF EXISTS user_coupons;

-- 1. campaigns (최상위 테이블)
DROP TABLE IF EXISTS campaigns;

-- ========================================
-- 롤백 완료
-- ========================================
-- 삭제된 테이블 목록:
-- - kakao_message_logs
-- - coupon_reviews
-- - kakao_users
-- - coupon_usage_logs
-- - campaign_merchants
-- - user_coupons
-- - campaigns
-- ========================================

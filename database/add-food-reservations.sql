-- ============================================
-- 음식점 예약 시스템 추가
-- ============================================

-- food_reservations 테이블 생성
CREATE TABLE IF NOT EXISTS food_reservations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reservation_number VARCHAR(50) UNIQUE NOT NULL COMMENT '예약 번호 (예: FOOD20250115ABC123)',

    -- 관계
    restaurant_id BIGINT NOT NULL COMMENT '식당 ID',
    user_id BIGINT NOT NULL COMMENT '사용자 ID',

    -- 예약 정보
    reservation_date DATE NOT NULL COMMENT '예약 날짜',
    reservation_time TIME NOT NULL COMMENT '예약 시간',
    party_size INT NOT NULL COMMENT '인원 수',
    special_requests TEXT COMMENT '특별 요청사항',

    -- 상태
    status ENUM('confirmed', 'canceled', 'completed', 'no_show') DEFAULT 'confirmed' COMMENT '예약 상태',

    -- 메타데이터
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    canceled_at TIMESTAMP NULL COMMENT '취소 시각',

    INDEX idx_restaurant_date (restaurant_id, reservation_date),
    INDEX idx_user_id (user_id),
    INDEX idx_reservation_number (reservation_number),
    INDEX idx_status (status)
) COMMENT='음식점 예약';

-- ============================================
-- 사용 예시
-- ============================================

-- 1. 예약 생성
INSERT INTO food_reservations (
    reservation_number,
    restaurant_id,
    user_id,
    reservation_date,
    reservation_time,
    party_size,
    special_requests,
    status
) VALUES (
    'FOOD20250115ABC123',
    1,
    123,
    '2025-01-20',
    '18:00:00',
    4,
    '창가 자리 부탁드립니다',
    'confirmed'
);

-- 2. 예약 조회 (사용자별)
SELECT
    fr.*,
    rest.name as restaurant_name,
    rest.address,
    rest.phone
FROM food_reservations fr
JOIN food_restaurants rest ON fr.restaurant_id = rest.id
WHERE fr.user_id = 123
ORDER BY fr.reservation_date DESC, fr.reservation_time DESC;

-- 3. 예약 취소
UPDATE food_reservations
SET status = 'canceled', canceled_at = NOW()
WHERE id = 1 AND user_id = 123;

-- ============================================
-- 완료
-- ============================================
SELECT '음식점 예약 시스템 추가 완료' AS status;

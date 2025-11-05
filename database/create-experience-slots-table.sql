-- ============================================
-- 체험 슬롯 테이블 생성 (슬롯 기반 예약 시스템)
-- ============================================
-- 문제: 체험 예약이 슬롯 기반이 아니어서 시간대별 예약 관리 불가
-- 해결: experience_slots 테이블 생성 및 슬롯 기반 예약 시스템 구현
-- ============================================

-- 1. 체험 슬롯 테이블 생성
CREATE TABLE IF NOT EXISTS experience_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  experience_id INT NOT NULL COMMENT '체험 ID (experiences 테이블 참조)',

  -- 슬롯 시간 정보
  slot_date DATE NOT NULL COMMENT '슬롯 날짜',
  start_time TIME NOT NULL COMMENT '시작 시간',
  end_time TIME NOT NULL COMMENT '종료 시간',

  -- 인원 정보
  max_participants INT NOT NULL DEFAULT 10 COMMENT '최대 참가 인원',
  current_participants INT NOT NULL DEFAULT 0 COMMENT '현재 예약 인원',
  available_spots INT GENERATED ALWAYS AS (max_participants - current_participants) STORED COMMENT '남은 자리',

  -- 가격 정보 (슬롯별 가격 조정 가능)
  price_per_person INT COMMENT '1인당 가격 (NULL이면 experience의 기본 가격 사용)',
  child_price INT COMMENT '어린이 가격 (NULL이면 experience의 기본 가격 사용)',

  -- 상태
  is_available BOOLEAN DEFAULT TRUE COMMENT '예약 가능 여부',
  is_full BOOLEAN GENERATED ALWAYS AS (current_participants >= max_participants) STORED COMMENT '만석 여부',

  -- 특이사항
  notes TEXT COMMENT '슬롯 특이사항 (예: 강사 변경, 장소 변경)',

  -- 타임스탬프
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',

  -- 인덱스
  INDEX idx_experience_id (experience_id),
  INDEX idx_slot_date (slot_date),
  INDEX idx_slot_datetime (slot_date, start_time),
  INDEX idx_available (is_available, is_full),
  UNIQUE KEY unique_slot (experience_id, slot_date, start_time),

  -- 외래키
  FOREIGN KEY (experience_id) REFERENCES experiences(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='체험 슬롯 테이블 (시간대별 예약)';

-- 2. experience_bookings 테이블에 slot_id 컬럼 추가
ALTER TABLE experience_bookings
ADD COLUMN slot_id INT COMMENT '슬롯 ID (experience_slots 참조)',
ADD INDEX idx_slot_id (slot_id),
ADD FOREIGN KEY (slot_id) REFERENCES experience_slots(id) ON DELETE SET NULL;

-- 3. 확인: 테이블 구조 출력
DESCRIBE experience_slots;

-- ============================================
-- 사용 예시
-- ============================================

-- 1. 체험 슬롯 생성 (2025년 2월 한 달간 매일 10:00, 14:00 슬롯)
-- INSERT INTO experience_slots (experience_id, slot_date, start_time, end_time, max_participants, is_available)
-- SELECT
--   1 as experience_id,
--   DATE('2025-02-01') + INTERVAL n DAY as slot_date,
--   '10:00:00' as start_time,
--   '12:00:00' as end_time,
--   10 as max_participants,
--   TRUE as is_available
-- FROM (
--   SELECT 0 as n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL
--   SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL
--   SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL
--   SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL
--   SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24 UNION ALL
--   SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28
-- ) dates
-- WHERE DATE('2025-02-01') + INTERVAL n DAY <= '2025-02-28';

-- 2. 예약 가능한 슬롯 조회 (특정 날짜)
-- SELECT
--   es.*,
--   e.name as experience_name,
--   e.duration_minutes,
--   e.price_per_person_krw
-- FROM experience_slots es
-- JOIN experiences e ON es.experience_id = e.id
-- WHERE es.slot_date = '2025-02-15'
--   AND es.is_available = TRUE
--   AND es.is_full = FALSE
-- ORDER BY es.start_time;

-- 3. 슬롯 예약 시 인원 증가 (동시성 제어 포함)
-- UPDATE experience_slots
-- SET current_participants = current_participants + 2
-- WHERE id = 1
--   AND current_participants + 2 <= max_participants
--   AND is_available = TRUE;

-- 4. 슬롯별 예약 현황 조회
-- SELECT
--   es.slot_date,
--   es.start_time,
--   es.end_time,
--   es.max_participants,
--   es.current_participants,
--   es.available_spots,
--   es.is_full,
--   COUNT(eb.id) as booking_count,
--   SUM(eb.participant_count) as total_participants
-- FROM experience_slots es
-- LEFT JOIN experience_bookings eb ON es.id = eb.slot_id AND eb.status != 'canceled'
-- WHERE es.experience_id = 1
--   AND es.slot_date >= CURDATE()
-- GROUP BY es.id
-- ORDER BY es.slot_date, es.start_time;

-- 5. 특정 체험의 월별 슬롯 통계
-- SELECT
--   DATE_FORMAT(es.slot_date, '%Y-%m') as month,
--   COUNT(*) as total_slots,
--   SUM(CASE WHEN es.is_full THEN 1 ELSE 0 END) as full_slots,
--   SUM(es.current_participants) as total_participants,
--   SUM(es.max_participants) as total_capacity,
--   ROUND(SUM(es.current_participants) / SUM(es.max_participants) * 100, 2) as occupancy_rate
-- FROM experience_slots es
-- WHERE es.experience_id = 1
-- GROUP BY DATE_FORMAT(es.slot_date, '%Y-%m')
-- ORDER BY month;

-- ============================================
-- 완료
-- ============================================
SELECT '체험 슬롯 테이블 생성 완료' AS status;

/**
 * 숙박 캘린더 재고 관리 시스템
 *
 * 목적: 날짜별 객실 가용성 관리, 동적 가격 설정, 실시간 재고 업데이트
 *
 * 실행 방법:
 * PlanetScale 대시보드 > Branches > main > Console > SQL 탭에서 실행
 */

-- 1. 객실 재고 캘린더 테이블
CREATE TABLE IF NOT EXISTS room_availability (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  room_id INT NOT NULL,
  date DATE NOT NULL,

  -- 재고
  total_rooms INT NOT NULL COMMENT '총 객실 수',
  available_rooms INT NOT NULL COMMENT '예약 가능 객실 수',
  booked_rooms INT DEFAULT 0 COMMENT '예약된 객실 수',
  blocked_rooms INT DEFAULT 0 COMMENT '판매 중지 객실 수',

  -- 동적 가격
  base_price_krw INT NOT NULL COMMENT '기본 가격',
  weekend_price_krw INT COMMENT '주말 가격 (금/토)',
  holiday_price_krw INT COMMENT '공휴일 가격',
  special_price_krw INT COMMENT '프로모션 특가',

  -- 최소 숙박일
  min_stay_nights INT DEFAULT 1 COMMENT '최소 숙박 일수',

  -- 판매 제어
  is_available BOOLEAN DEFAULT TRUE COMMENT '예약 가능 여부',
  close_out_reason VARCHAR(200) COMMENT '판매 중지 사유 (청소/수리/이벤트)',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY unique_room_date (room_id, date),
  INDEX idx_date (date),
  INDEX idx_available (is_available, available_rooms),
  INDEX idx_room_date_range (room_id, date),

  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='객실 날짜별 재고 및 가격 관리';

-- 2. 요금 정책 테이블 (시즌별/요일별)
CREATE TABLE IF NOT EXISTS pricing_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,

  room_id INT NOT NULL,
  rule_name VARCHAR(100) NOT NULL COMMENT '정책명 (예: 여름성수기, 크리스마스특가)',

  -- 적용 기간
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- 적용 요일 (비트마스크: 월=1, 화=2, 수=4, 목=8, 금=16, 토=32, 일=64)
  day_of_week_mask INT DEFAULT 127 COMMENT '월-일 전체=127 (1+2+4+8+16+32+64)',

  -- 가격 조정
  price_type ENUM('fixed', 'markup', 'discount') NOT NULL COMMENT 'fixed=고정가, markup=인상, discount=할인',
  price_value INT NOT NULL COMMENT 'fixed: 가격(원), markup/discount: 금액(원) 또는 %',

  priority INT DEFAULT 0 COMMENT '우선순위 (높을수록 우선 적용)',
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_room (room_id),
  INDEX idx_dates (start_date, end_date),
  INDEX idx_active (is_active, priority),

  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='객실 요금 정책 (시즌별/요일별 가격 조정)';

-- 3. 재고 잠금 테이블 (결제 프로세스 중 임시 잠금)
CREATE TABLE IF NOT EXISTS room_inventory_locks (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  room_id INT NOT NULL,
  date DATE NOT NULL,
  quantity INT NOT NULL COMMENT '잠긴 객실 수',

  -- 잠금 정보
  locked_by_session VARCHAR(100) NOT NULL COMMENT '세션 ID',
  locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL COMMENT '잠금 만료 시간 (일반적으로 10분)',

  -- 예약 완료 시
  booking_id INT COMMENT '예약 확정 시 booking ID',
  released_at TIMESTAMP COMMENT '잠금 해제 시간',

  INDEX idx_room_date (room_id, date),
  INDEX idx_expires (expires_at),
  INDEX idx_session (locked_by_session),

  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='결제 중 재고 임시 잠금 (10분)';

-- 테이블 생성 확인
SELECT
  TABLE_NAME,
  TABLE_ROWS,
  CREATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('room_availability', 'pricing_rules', 'room_inventory_locks')
ORDER BY TABLE_NAME;

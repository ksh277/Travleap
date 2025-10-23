-- 반납 지연 추적 컬럼 추가
-- 실행: mysql -u [user] -p [database] < add-late-return-tracking.sql

USE travleap;

-- 1. 실제 픽업 시간 추가
ALTER TABLE rentcar_bookings
ADD COLUMN actual_pickup_time DATETIME NULL COMMENT '실제 차량 인수 시간' AFTER dropoff_time;

-- 2. 실제 반납 시간 추가
ALTER TABLE rentcar_bookings
ADD COLUMN actual_dropoff_time DATETIME NULL COMMENT '실제 차량 반납 시간' AFTER actual_pickup_time;

-- 3. 지연 반납 여부
ALTER TABLE rentcar_bookings
ADD COLUMN is_late_return BOOLEAN DEFAULT FALSE COMMENT '반납 지연 여부' AFTER actual_dropoff_time;

-- 4. 지연 시간 (분 단위)
ALTER TABLE rentcar_bookings
ADD COLUMN late_minutes INT DEFAULT 0 COMMENT '지연 시간(분)' AFTER is_late_return;

-- 5. 지연 수수료
ALTER TABLE rentcar_bookings
ADD COLUMN late_fee_krw INT DEFAULT 0 COMMENT '지연 수수료(원)' AFTER late_minutes;

-- 6. 벤더 메모 (지연 사유 등)
ALTER TABLE rentcar_bookings
ADD COLUMN vendor_note TEXT NULL COMMENT '벤더 메모(지연 사유 등)' AFTER late_fee_krw;

-- 인덱스 추가 (지연 반납 조회 최적화)
CREATE INDEX idx_late_return ON rentcar_bookings(is_late_return, status);
CREATE INDEX idx_actual_dropoff ON rentcar_bookings(actual_dropoff_time);

-- 마이그레이션 로그
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_migration_name (migration_name)
) COMMENT='DB 마이그레이션 실행 기록';

INSERT INTO schema_migrations (migration_name)
VALUES ('add-late-return-tracking')
ON DUPLICATE KEY UPDATE executed_at = CURRENT_TIMESTAMP;

-- 결과 확인
SELECT
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'travleap'
  AND TABLE_NAME = 'rentcar_bookings'
  AND COLUMN_NAME IN (
    'actual_pickup_time',
    'actual_dropoff_time',
    'is_late_return',
    'late_minutes',
    'late_fee_krw',
    'vendor_note'
  );

SELECT '✅ 반납 지연 추적 컬럼 추가 완료!' as status;

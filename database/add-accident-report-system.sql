/**
 * 렌트카 사고 신고 시스템
 *
 * 목적: 렌터카 이용 중 사고 발생 시 앱에서 즉시 신고하고,
 *       보험사/업체/관리자에게 자동 알림
 *
 * 실행 방법:
 * PlanetScale 대시보드 > Branches > main > Console > SQL 탭에서 실행
 */

-- 사고 신고 테이블 생성
CREATE TABLE IF NOT EXISTS accident_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- 예약 정보
  booking_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  vendor_id INT NOT NULL,
  user_id INT NOT NULL,

  -- 사고 기본 정보
  report_number VARCHAR(50) UNIQUE NOT NULL COMMENT '신고번호 (ACC-20250131-0001)',
  accident_datetime DATETIME NOT NULL COMMENT '사고 발생 시각',
  location_address VARCHAR(500) COMMENT '사고 장소',
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),

  -- 사고 상세
  accident_type ENUM('collision', 'scratch', 'breakdown', 'theft', 'other') NOT NULL,
  severity ENUM('minor', 'moderate', 'severe') DEFAULT 'minor',
  description TEXT COMMENT '사고 경위 설명',

  -- 상대방 정보 (있는 경우)
  other_party_name VARCHAR(100),
  other_party_phone VARCHAR(50),
  other_party_vehicle VARCHAR(100),
  police_report_filed BOOLEAN DEFAULT FALSE,
  police_report_number VARCHAR(100),

  -- 증거 자료
  photos JSON COMMENT '사고 사진 URLs',
  videos JSON COMMENT '블랙박스/동영상 URLs',

  -- 보험 처리
  insurance_claim_filed BOOLEAN DEFAULT FALSE,
  insurance_company VARCHAR(200),
  insurance_claim_number VARCHAR(100),
  estimated_damage_krw INT,

  -- 처리 상태
  status ENUM('reported', 'investigating', 'claim_filed', 'resolved', 'closed') DEFAULT 'reported',
  handled_by INT COMMENT '처리 담당자 ID',
  resolution_notes TEXT,

  -- 알림 기록
  vendor_notified_at DATETIME,
  insurance_notified_at DATETIME,
  admin_notified_at DATETIME,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_booking (booking_id),
  INDEX idx_vehicle (vehicle_id),
  INDEX idx_vendor (vendor_id),
  INDEX idx_user (user_id),
  INDEX idx_report_number (report_number),
  INDEX idx_status (status),
  INDEX idx_accident_date (accident_datetime),

  FOREIGN KEY (booking_id) REFERENCES rentcar_bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES rentcar_vehicles(id),
  FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='렌트카 사고 신고 테이블';

-- 테이블 생성 확인
SELECT
  TABLE_NAME,
  TABLE_ROWS,
  CREATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'accident_reports';

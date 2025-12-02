/**
 * listing_options 테이블 생성
 *
 * 용도:
 * - 음식: 메뉴 (예: 한정식 코스, 스테이크 세트 등)
 * - 관광지/체험: 시간대 (예: 오전 10시, 오후 2시 등)
 * - 행사: 좌석 등급 (예: VIP석, 일반석 등)
 * - 기타: 패키지 옵션
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function createListingOptionsTable() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('=== listing_options 테이블 생성 ===\n');

  try {
    // 1. listing_options 테이블 생성
    console.log('1. listing_options 테이블 생성...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS listing_options (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        listing_id BIGINT NOT NULL,

        -- 옵션 타입
        option_type VARCHAR(50) NOT NULL DEFAULT 'menu',

        -- 기본 정보
        name VARCHAR(255) NOT NULL,
        description TEXT,

        -- 가격 정보
        price INT DEFAULT 0,
        original_price INT,
        price_type VARCHAR(20) DEFAULT 'per_person',

        -- 시간대 옵션용
        start_time TIME,
        end_time TIME,
        duration_minutes INT,

        -- 재고/수량
        max_capacity INT DEFAULT NULL,
        available_count INT DEFAULT NULL,
        min_quantity INT DEFAULT 1,
        max_quantity INT DEFAULT 10,

        -- 정렬 및 상태
        sort_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        is_default TINYINT(1) DEFAULT 0,

        -- 추가 정보 (JSON)
        meta JSON,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        -- 인덱스
        INDEX idx_listing_id (listing_id),
        INDEX idx_option_type (option_type),
        INDEX idx_active (is_active)
      )
    `);
    console.log('  -> listing_options 테이블 생성 완료');

    // 2. booking_options 테이블 생성 (예약에 선택된 옵션 저장)
    console.log('\n2. booking_options 테이블 생성...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS booking_options (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        booking_id BIGINT NOT NULL,
        option_id BIGINT NOT NULL,

        quantity INT DEFAULT 1,
        unit_price INT NOT NULL,
        total_price INT NOT NULL,

        -- 시간 옵션인 경우
        selected_time TIME,
        selected_date DATE,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- 인덱스
        INDEX idx_booking_id (booking_id),
        INDEX idx_option_id (option_id)
      )
    `);
    console.log('  -> booking_options 테이블 생성 완료');

    // 3. 테이블 구조 확인
    console.log('\n3. 생성된 테이블 구조 확인...');
    const columns = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'listing_options'
      ORDER BY ORDINAL_POSITION
    `);
    console.table(columns.rows);

    console.log('\n=== 완료 ===');
    console.log('\n사용 예시:');
    console.log('- 음식 메뉴: option_type="menu", price_type="per_person"');
    console.log('- 시간대: option_type="time_slot", start_time="10:00"');
    console.log('- 좌석등급: option_type="seat_class", price_type="per_person"');
    console.log('- 패키지: option_type="package", price_type="per_group"');

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('  -> 테이블이 이미 존재합니다');
    } else {
      console.error('오류:', error.message);
    }
  }
}

createListingOptionsTable();

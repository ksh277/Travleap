/**
 * rentcar_extras 테이블 생성 스크립트
 * 렌트카 벤더가 관리하는 추가 옵션 (GPS, 카시트, 보험 등)
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function createRentcarExtrasTable() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🔧 rentcar_extras 테이블 생성 중...\n');

    // 테이블 생성 SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS rentcar_extras (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        vendor_id BIGINT NOT NULL,

        -- 기본 정보
        name VARCHAR(100) NOT NULL,
        description TEXT,
        category VARCHAR(50) DEFAULT 'misc',

        -- 가격 정보
        price_krw INT NOT NULL,
        price_type VARCHAR(20) NOT NULL DEFAULT 'per_rental',

        -- 재고 관리
        has_inventory BOOLEAN DEFAULT FALSE,
        current_stock INT DEFAULT 0,
        max_quantity INT DEFAULT 10,

        -- 표시 및 활성화
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,

        -- 타임스탬프
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        -- 인덱스
        INDEX idx_vendor_active (vendor_id, is_active),
        INDEX idx_category (category)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await connection.execute(createTableSQL);
    console.log('✅ rentcar_extras 테이블 생성 완료!\n');

    // 테이블 구조 확인
    const descResult = await connection.execute('DESCRIBE rentcar_extras');
    console.log('📋 테이블 구조:');
    descResult.rows.forEach(row => {
      console.log(`  - ${row.Field}: ${row.Type}${row.Null === 'NO' ? ' NOT NULL' : ''}`);
    });

    console.log('\n✅ 모든 작업 완료!');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

createRentcarExtrasTable();

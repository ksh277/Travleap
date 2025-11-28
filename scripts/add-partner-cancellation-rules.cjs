/**
 * partners 테이블에 cancellation_rules 컬럼 추가 마이그레이션
 *
 * 실행: node scripts/add-partner-cancellation-rules.cjs
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

async function migrate() {
  console.log('🔄 partners 테이블 cancellation_rules 컬럼 추가 시작...\n');

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 1. 현재 컬럼 존재 여부 확인
    console.log('📋 현재 partners 테이블 구조 확인 중...');
    const columnsResult = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'partners' AND COLUMN_NAME = 'cancellation_rules'
    `);

    if (columnsResult.rows && columnsResult.rows.length > 0) {
      console.log('✅ cancellation_rules 컬럼이 이미 존재합니다.');
      return;
    }

    // 2. 컬럼 추가
    console.log('➕ cancellation_rules 컬럼 추가 중...');
    await connection.execute(`
      ALTER TABLE partners
      ADD COLUMN cancellation_rules JSON NULL
      COMMENT '환불 정책 규칙 (JSON: rules 배열)'
    `);

    console.log('✅ cancellation_rules 컬럼 추가 완료!\n');

    // 3. 확인
    const verifyResult = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'partners' AND COLUMN_NAME = 'cancellation_rules'
    `);

    if (verifyResult.rows && verifyResult.rows.length > 0) {
      console.log('📊 추가된 컬럼 정보:');
      console.log(verifyResult.rows[0]);
    }

    console.log('\n🎉 마이그레이션 완료!');

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error.message);
    process.exit(1);
  }
}

migrate();

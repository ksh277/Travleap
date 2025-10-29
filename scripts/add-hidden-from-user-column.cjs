/**
 * Add hidden_from_user column to payments table
 * This allows soft-deletion of payment records from user view while keeping them for admin
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function addHiddenColumn() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('📊 payments 테이블에 hidden_from_user 컬럼 추가 중...\n');

    // Check if column already exists
    const checkResult = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'payments'
        AND COLUMN_NAME = 'hidden_from_user'
    `);

    if (checkResult.rows && checkResult.rows.length > 0) {
      console.log('✅ hidden_from_user 컬럼이 이미 존재합니다.');
      return;
    }

    // Add the column
    await connection.execute(`
      ALTER TABLE payments
      ADD COLUMN hidden_from_user TINYINT(1) DEFAULT 0 COMMENT '사용자 화면에서 숨김 여부 (0=표시, 1=숨김)'
    `);

    console.log('✅ hidden_from_user 컬럼이 성공적으로 추가되었습니다.\n');

    // Verify
    const verifyResult = await connection.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'payments'
        AND COLUMN_NAME = 'hidden_from_user'
    `);

    if (verifyResult.rows && verifyResult.rows.length > 0) {
      console.log('컬럼 정보:');
      console.log(verifyResult.rows[0]);
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

addHiddenColumn()
  .then(() => {
    console.log('\n✅ 마이그레이션 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  });

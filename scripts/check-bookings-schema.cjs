const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkBookingsSchema() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n=== bookings 테이블 스키마 확인 ===\n');

  try {
    const result = await connection.execute('DESCRIBE bookings');

    console.log('현재 컬럼 목록:');
    result.rows.forEach(row => {
      console.log(`  - ${row.Field} (${row.Type})`);
    });

    // checked_in_at 컬럼 존재 여부 확인
    const hasCheckedInAt = result.rows.some(row => row.Field === 'checked_in_at');

    console.log('\n확인:');
    console.log(`  checked_in_at: ${hasCheckedInAt ? '✅ 존재' : '❌ 없음'}`);

    if (!hasCheckedInAt) {
      console.log('\n⚠️ checked_in_at 컬럼이 없습니다. refund.js에서 제거해야 합니다.');
    }

  } catch (error) {
    console.error('\n❌ 오류:', error.message);
  }
}

checkBookingsSchema();

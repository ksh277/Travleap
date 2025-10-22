require('dotenv').config();
const { connect } = require('@planetscale/database');

async function showAllTables() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('\n=== 모든 테이블 목록 ===\n');
    const tables = await connection.execute('SHOW TABLES');

    if (tables.rows && tables.rows.length > 0) {
      const tableNames = tables.rows.map(row => Object.values(row)[0]);

      // 숙박 관련 테이블 필터
      const accommodationTables = tableNames.filter(name =>
        name.toLowerCase().includes('accommodation') ||
        name.toLowerCase().includes('room') ||
        name.toLowerCase().includes('hotel')
      );

      console.log('숙박 관련 테이블:');
      if (accommodationTables.length > 0) {
        accommodationTables.forEach(name => console.log(`  ✓ ${name}`));
      } else {
        console.log('  (없음)');
      }

      console.log('\n예약 관련 테이블:');
      const bookingTables = tableNames.filter(name =>
        name.toLowerCase().includes('booking') || name.toLowerCase().includes('order')
      );
      if (bookingTables.length > 0) {
        bookingTables.forEach(name => console.log(`  ✓ ${name}`));
      } else {
        console.log('  (없음)');
      }

      console.log('\n벤더/파트너 관련 테이블:');
      const vendorTables = tableNames.filter(name =>
        name.toLowerCase().includes('vendor') ||
        name.toLowerCase().includes('partner')
      );
      if (vendorTables.length > 0) {
        vendorTables.forEach(name => console.log(`  ✓ ${name}`));
      } else {
        console.log('  (없음)');
      }

      console.log(`\n전체 테이블 수: ${tableNames.length}개\n`);

    } else {
      console.log('테이블이 없습니다.');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

showAllTables();

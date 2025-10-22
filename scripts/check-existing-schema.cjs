require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkSchema() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('\n' + '='.repeat(70));
    console.log('기존 DB 구조 확인');
    console.log('='.repeat(70));

    // 1. partners 테이블
    console.log('\n[1] partners 테이블 (숙박 업체):');
    console.log('-'.repeat(70));
    const partnersSchema = await connection.execute('DESCRIBE partners');
    partnersSchema.rows.forEach(row => {
      console.log(`  ${row.Field.padEnd(30)} ${row.Type.padEnd(20)} ${row.Null === 'NO' ? 'NOT NULL' : ''}`);
    });

    // 2. room_types 테이블
    console.log('\n[2] room_types 테이블:');
    console.log('-'.repeat(70));
    const roomTypesSchema = await connection.execute('DESCRIBE room_types');
    roomTypesSchema.rows.forEach(row => {
      console.log(`  ${row.Field.padEnd(30)} ${row.Type.padEnd(20)} ${row.Null === 'NO' ? 'NOT NULL' : ''}`);
    });

    // 3. room_inventory 테이블
    console.log('\n[3] room_inventory 테이블:');
    console.log('-'.repeat(70));
    const roomInventorySchema = await connection.execute('DESCRIBE room_inventory');
    roomInventorySchema.rows.forEach(row => {
      console.log(`  ${row.Field.padEnd(30)} ${row.Type.padEnd(20)} ${row.Null === 'NO' ? 'NOT NULL' : ''}`);
    });

    // 4. bookings 테이블
    console.log('\n[4] bookings 테이블:');
    console.log('-'.repeat(70));
    const bookingsSchema = await connection.execute('DESCRIBE bookings');
    bookingsSchema.rows.forEach(row => {
      console.log(`  ${row.Field.padEnd(30)} ${row.Type.padEnd(20)} ${row.Null === 'NO' ? 'NOT NULL' : ''}`);
    });

    // 5. listings 테이블
    console.log('\n[5] listings 테이블 (객실 정보):');
    console.log('-'.repeat(70));
    const listingsSchema = await connection.execute('DESCRIBE listings');
    listingsSchema.rows.forEach(row => {
      console.log(`  ${row.Field.padEnd(30)} ${row.Type.padEnd(20)} ${row.Null === 'NO' ? 'NOT NULL' : ''}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('분석 결과:');
    console.log('='.repeat(70));
    console.log(`
숙박 시스템 구조:
  1. partners: 숙박 업체 정보
  2. listings: 객실 상세 정보 (가격, 설명, 이미지)
  3. room_types: 객실 타입 정의
  4. room_inventory: 객실 재고 관리
  5. bookings: 예약 정보

결론:
  - accommodation_vendors 테이블 불필요 → partners 사용
  - accommodation_rooms 테이블 불필요 → listings 사용
  - 새 API를 기존 구조에 맞춰야 함!
`);

  } catch (error) {
    console.error('\nError:', error.message);
  }
}

checkSchema();

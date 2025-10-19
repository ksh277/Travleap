require('dotenv').config();
const { connect } = require('@planetscale/database');

async function test() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // rentcar_bookings 테이블 존재 여부 확인
    try {
      const result = await connection.execute('SELECT COUNT(*) as count FROM rentcar_bookings');
      console.log('✅ rentcar_bookings 테이블 존재:', result.rows[0].count, '개 예약');
    } catch (e) {
      console.log('❌ rentcar_bookings 테이블 없음:', e.message);
    }

    // reviews 테이블 존재 여부 확인
    try {
      const result = await connection.execute('SELECT COUNT(*) as count FROM reviews WHERE review_type = "rentcar"');
      console.log('✅ reviews 테이블 존재 (rentcar):', result.rows[0].count, '개 리뷰');
    } catch (e) {
      console.log('❌ reviews 테이블 문제:', e.message);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

test();

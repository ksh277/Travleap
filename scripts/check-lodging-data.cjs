require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('📊 숙박 카테고리의 listings 샘플 데이터:\n');

    // 숙박 카테고리 ID 조회
    const catResult = await connection.execute(
      "SELECT id FROM categories WHERE slug IN ('stay', 'accommodation') LIMIT 1"
    );

    if (!catResult.rows || catResult.rows.length === 0) {
      console.log('❌ 숙박 카테고리 없음');
      return;
    }

    const categoryId = catResult.rows[0].id;
    console.log('숙박 category_id:', categoryId);
    console.log('='.repeat(80));

    const result = await connection.execute(
      'SELECT id, title, category, partner_id, is_published FROM listings WHERE category_id = ? LIMIT 10',
      [categoryId]
    );

    if (result.rows && result.rows.length > 0) {
      result.rows.forEach(row => {
        console.log(`ID: ${row.id}, Title: "${row.title}", Category: ${row.category}, Partner: ${row.partner_id}, Published: ${row.is_published}`);
      });
    } else {
      console.log('데이터 없음');
    }

    console.log('\n최근 예약 확인:');
    console.log('='.repeat(80));

    const bookings = await connection.execute(
      `SELECT b.id, b.booking_number, b.listing_id, l.title
       FROM bookings b
       LEFT JOIN listings l ON b.listing_id = l.id
       WHERE l.category_id = ?
       ORDER BY b.created_at DESC
       LIMIT 5`,
      [categoryId]
    );

    if (bookings.rows && bookings.rows.length > 0) {
      bookings.rows.forEach(row => {
        console.log(`Booking: ${row.booking_number}, Listing: "${row.title}"`);
      });
    } else {
      console.log('예약 데이터 없음');
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
})();

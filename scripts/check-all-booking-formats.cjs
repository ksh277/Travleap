/**
 * 모든 예약 번호 형식 확인
 */
require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('📊 모든 예약 번호 형식 확인 중...\n');

    // 각 형식별로 확인
    const formats = ['BK-', 'TOUR-', 'EVT-', 'FOOD-', 'ATR-', 'EXP-'];

    for (const format of formats) {
      const result = await connection.execute(
        `SELECT COUNT(*) as count FROM bookings WHERE booking_number LIKE ?`,
        [`${format}%`]
      );

      const count = result.rows[0].count;
      const icon = count > 0 ? '✅' : '❌';

      console.log(`${icon} ${format.padEnd(8)} ${count}건`);

      if (count > 0) {
        // 샘플 1건 조회
        const sample = await connection.execute(
          `SELECT booking_number, listing_id, status, payment_status, total_amount, created_at
           FROM bookings
           WHERE booking_number LIKE ?
           ORDER BY created_at DESC
           LIMIT 1`,
          [`${format}%`]
        );

        if (sample.rows && sample.rows.length > 0) {
          const row = sample.rows[0];
          console.log(`   → 샘플: ${row.booking_number}`);
          console.log(`      listing_id: ${row.listing_id}`);
          console.log(`      status: ${row.status}/${row.payment_status}`);
          console.log(`      amount: ${row.total_amount}원`);

          // listing_id로 카테고리 확인
          if (row.listing_id) {
            try {
              const catResult = await connection.execute(
                `SELECT c.name_ko, c.slug
                 FROM listings l
                 JOIN categories c ON l.category_id = c.id
                 WHERE l.id = ?`,
                [row.listing_id]
              );

              if (catResult.rows && catResult.rows.length > 0) {
                console.log(`      category: ${catResult.rows[0].name_ko} (${catResult.rows[0].slug})`);
              }
            } catch (e) {
              console.log(`      category: (조회 실패)`);
            }
          }
        }
      }

      console.log();
    }

    // 기타 형식 확인
    console.log('\n=== 기타 예약 번호 형식 ===');
    const othersResult = await connection.execute(
      `SELECT booking_number, status, payment_status
       FROM bookings
       WHERE booking_number NOT LIKE 'BK-%'
         AND booking_number NOT LIKE 'TOUR-%'
         AND booking_number NOT LIKE 'EVT-%'
         AND booking_number NOT LIKE 'FOOD-%'
         AND booking_number NOT LIKE 'ATR-%'
         AND booking_number NOT LIKE 'EXP-%'
       ORDER BY created_at DESC
       LIMIT 5`
    );

    if (othersResult.rows && othersResult.rows.length > 0) {
      othersResult.rows.forEach((row, i) => {
        console.log(`[${i + 1}] ${row.booking_number} (${row.status}/${row.payment_status})`);
      });
    } else {
      console.log('기타 형식 없음');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
})();

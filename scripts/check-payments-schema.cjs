/**
 * payments 테이블 스키마 확인
 */
require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('📊 Payments 테이블 스키마 확인 중...\n');

    const result = await connection.execute(`
      DESCRIBE payments
    `);

    console.log('✅ Payments 테이블 컬럼 목록:\n');
    result.rows.forEach((col, index) => {
      console.log(`[${index + 1}] ${col.Field}`);
      console.log(`    Type: ${col.Type}`);
      console.log(`    Null: ${col.Null}`);
      console.log(`    Key: ${col.Key || 'N/A'}`);
      console.log();
    });

    // 최근 결제 데이터 확인
    console.log('\n=== 최근 숙박 결제 (BK-) 데이터 샘플 ===\n');
    const sampleResult = await connection.execute(`
      SELECT
        id,
        order_id_str,
        listing_id,
        booking_id,
        amount,
        payment_status,
        notes,
        created_at
      FROM payments
      WHERE order_id_str LIKE 'BK-%'
      ORDER BY created_at DESC
      LIMIT 3
    `);

    if (sampleResult.rows && sampleResult.rows.length > 0) {
      sampleResult.rows.forEach((row, index) => {
        console.log(`[${index + 1}] ID: ${row.id}, 주문번호: ${row.order_id_str}`);
        console.log(`    Listing ID: ${row.listing_id}`);
        console.log(`    Booking ID: ${row.booking_id}`);

        if (row.notes) {
          try {
            const notes = JSON.parse(row.notes);
            console.log(`    Notes 내용:`);
            console.log(`      - category: "${notes.category || 'N/A'}"`);
            console.log(`      - listingTitle: "${notes.listingTitle || 'N/A'}"`);
            Object.keys(notes).forEach(key => {
              if (!['category', 'listingTitle'].includes(key)) {
                console.log(`      - ${key}: ${JSON.stringify(notes[key])}`);
              }
            });
          } catch (e) {
            console.log(`    Notes: (파싱 오류)`);
          }
        }
        console.log();
      });
    } else {
      console.log('숙박 결제 데이터 없음');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
})();

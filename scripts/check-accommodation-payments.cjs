/**
 * 숙박 예약의 payments 테이블 category 확인
 */
require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('📊 숙박 예약 payments 데이터 확인 중...\n');

    // BK-로 시작하는 결제 데이터 확인 (숙박)
    const result = await connection.execute(`
      SELECT
        p.id,
        p.order_id_str,
        p.category,
        p.listing_id,
        p.booking_id,
        p.amount,
        p.payment_status,
        p.notes,
        p.created_at,
        l.title as listing_title,
        l.category_id as listing_category_id,
        c.name_ko as category_name
      FROM payments p
      LEFT JOIN listings l ON p.listing_id = l.id
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE p.order_id_str LIKE 'BK-%'
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    if (result.rows && result.rows.length > 0) {
      console.log('✅ 숙박 결제 데이터 발견:\n');
      result.rows.forEach((row, index) => {
        console.log(`[${index + 1}] Payment ID: ${row.id}`);
        console.log(`    주문번호: ${row.order_id_str}`);
        console.log(`    Payment.category: "${row.category}" ❗`);
        console.log(`    Listing ID: ${row.listing_id}`);
        console.log(`    Listing Title: ${row.listing_title || 'N/A'}`);
        console.log(`    Listing Category ID: ${row.listing_category_id || 'N/A'}`);
        console.log(`    Category Name: ${row.category_name || 'N/A'}`);
        console.log(`    Amount: ${row.amount}원`);
        console.log(`    Status: ${row.payment_status}`);

        if (row.notes) {
          try {
            const notes = JSON.parse(row.notes);
            console.log(`    Notes.category: "${notes.category || 'N/A'}"`);
          } catch (e) {
            console.log(`    Notes: (파싱 오류)`);
          }
        }

        console.log();
      });

      // category 값 분석
      const categoryValues = result.rows.map(r => r.category).filter(Boolean);
      const uniqueCategories = [...new Set(categoryValues)];

      console.log('=== Category 필드 분석 ===');
      console.log('발견된 category 값:', uniqueCategories);

      if (uniqueCategories.includes('여행')) {
        console.log('\n⚠️ 경고: payment.category에 "여행"이 저장되어 있습니다!');
        console.log('→ 숙박 예약인데 category가 "여행"으로 잘못 저장됨');
        console.log('→ 이로 인해 마이페이지에 "✈️ 여행"으로 표시됨');
      }

    } else {
      console.log('ℹ️ 숙박 결제 데이터 없음');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
})();

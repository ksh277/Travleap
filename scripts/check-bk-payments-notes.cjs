/**
 * BK- 결제의 notes 필드 확인
 */
require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('📊 숙박 결제 (BK-) notes 데이터 확인 중...\n');

    const result = await connection.execute(`
      SELECT
        id,
        order_id_str,
        booking_id,
        amount,
        payment_status,
        notes,
        created_at
      FROM payments
      WHERE order_id_str LIKE 'BK-%'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (result.rows && result.rows.length > 0) {
      console.log('✅ 숙박 결제 데이터 발견:\n');
      result.rows.forEach((row, index) => {
        console.log(`[${index + 1}] Payment ID: ${row.id}`);
        console.log(`    주문번호: ${row.order_id_str}`);
        console.log(`    Booking ID: ${row.booking_id}`);
        console.log(`    Amount: ${row.amount}원`);
        console.log(`    Status: ${row.payment_status}`);
        console.log(`    Created: ${row.created_at}`);

        if (row.notes) {
          try {
            const notes = JSON.parse(row.notes);
            console.log(`    📝 Notes 파싱 성공:`);
            console.log(`       - category: "${notes.category || 'N/A'}" ⚠️`);
            console.log(`       - listingTitle: "${notes.listingTitle || 'N/A'}"`);
            console.log(`       - listingId: ${notes.listingId || 'N/A'}`);
            console.log(`       - categoryId: ${notes.categoryId || 'N/A'}`);
            console.log(`       - 전체 keys: ${Object.keys(notes).join(', ')}`);
          } catch (e) {
            console.log(`    ❌ Notes 파싱 오류`);
            console.log(`    Raw notes: ${row.notes.substring(0, 200)}...`);
          }
        } else {
          console.log(`    Notes: (없음)`);
        }
        console.log();
      });

      // category 값 통계
      const categories = result.rows
        .map(row => {
          if (!row.notes) return null;
          try {
            const notes = JSON.parse(row.notes);
            return notes.category;
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);

      const uniqueCategories = [...new Set(categories)];

      console.log('\n=== Category 필드 분석 ===');
      console.log(`발견된 category 값: [${uniqueCategories.join(', ')}]`);

      if (uniqueCategories.includes('여행')) {
        console.log('\n⚠️⚠️⚠️ 문제 발견! ⚠️⚠️⚠️');
        console.log('숙박 예약(BK-)인데 notes.category가 "여행"으로 저장되어 있습니다!');
        console.log('→ 이로 인해 마이페이지에 "✈️ 여행"으로 표시됨');
        console.log('→ payments/confirm.js에서 notes.category를 잘못 설정하고 있음');
      }

      if (uniqueCategories.includes('숙박')) {
        console.log('\n✅ 일부 데이터는 올바르게 "숙박"으로 저장되어 있습니다.');
      }

    } else {
      console.log('ℹ️ 숙박 결제 데이터 없음');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
})();

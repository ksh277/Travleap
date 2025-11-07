const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

(async () => {
  try {
    const result = await connection.execute(`
      SELECT id, amount, payment_status, notes
      FROM payments
      WHERE (notes LIKE '%팝업%' OR notes LIKE '%popup%') AND payment_status = 'paid'
      ORDER BY created_at DESC
      LIMIT 3
    `);

    console.log('🔍 팝업 결제 notes 구조 분석:\n');
    result.rows.forEach(row => {
      console.log(`Payment ID ${row.id} (${row.payment_status}  - ₩${row.amount})`);

      try {
        const notes = JSON.parse(row.notes);
        console.log('  notes 필드:');
        console.log('    subtotal:', notes.subtotal || 'MISSING!');
        console.log('    category:', notes.category);
        console.log('    items:', notes.items?.length || 0, '개');

        if (notes.subtotal) {
          const pointsToEarn = Math.floor(notes.subtotal * 0.02);
          console.log(`    예상 적립 포인트: ${pointsToEarn}P`);
        } else {
          console.log('    ❌ subtotal 필드 없음 - 포인트 적립 불가!');
        }

        // Items 확인
        if (notes.items && Array.isArray(notes.items)) {
          let totalFromItems = 0;
          notes.items.forEach(item => {
            totalFromItems += item.subtotal || 0;
          });
          console.log(`    items subtotal 합계: ${totalFromItems}원`);
        }
      } catch (e) {
        console.log('  notes 파싱 실패:', e.message);
      }

      console.log('');
    });
  } catch (error) {
    console.error('Error:', error.message);
  }

  process.exit(0);
})();

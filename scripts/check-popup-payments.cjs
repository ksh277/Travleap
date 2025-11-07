const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

(async () => {
  try {
    const result = await connection.execute(`
      SELECT id, payment_status, payment_key, approved_at, created_at
      FROM payments
      WHERE notes LIKE '%팝업%' OR notes LIKE '%popup%'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('🔍 팝업 결제 승인 정보:\n');
    result.rows.forEach(row => {
      console.log(`Payment ID ${row.id}: ${row.payment_status}`);
      console.log(`  payment_key: ${row.payment_key || 'NULL'}`);
      console.log(`  approved_at: ${row.approved_at || 'NULL'}`);
      console.log(`  created_at: ${row.created_at}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error.message);
  }

  process.exit(0);
})();

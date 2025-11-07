const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

(async () => {
  try {
    const result = await connection.execute(`
      SELECT id, user_id, payment_status, gateway_transaction_id
      FROM payments
      WHERE (notes LIKE '%팝업%' OR notes LIKE '%popup%') AND payment_status = 'paid'
      ORDER BY created_at DESC
      LIMIT 3
    `);

    console.log('🔍 팝업 결제 user_id 및 gateway_transaction_id 확인:\n');
    result.rows.forEach(row => {
      console.log(`Payment ID ${row.id}:`);
      console.log(`  user_id: ${row.user_id || 'NULL'}`);
      console.log(`  payment_status: ${row.payment_status}`);
      console.log(`  gateway_transaction_id: ${row.gateway_transaction_id || 'NULL'}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error.message);
  }

  process.exit(0);
})();

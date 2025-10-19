require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkListingsSchema() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('\n=== listings 테이블 구조 ===');
    const schema = await connection.execute('DESCRIBE listings');
    console.log('Columns:', schema.rows.map(r => r.Field).join(', '));

    console.log('\n=== 샘플 listing 데이터 (ID=1) ===');
    const data = await connection.execute('SELECT * FROM listings WHERE id = 1 LIMIT 1');
    if (data.rows.length > 0) {
      console.log(JSON.stringify(data.rows[0], null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkListingsSchema();

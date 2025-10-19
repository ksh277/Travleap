require('dotenv').config();
const { connect } = require('@planetscale/database');

async function showCategories() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const result = await connection.execute('SELECT * FROM categories ORDER BY sort_order LIMIT 1');
    console.log('Categories table columns:', Object.keys(result.rows[0] || {}));
    
    const all = await connection.execute('SELECT * FROM categories ORDER BY sort_order');
    console.log('\nAll categories:');
    all.rows.forEach(row => {
      console.log('   [' + row.id + '] ' + row.slug + ' - ' + row.name_ko + ' (sort: ' + row.sort_order + ')');
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

showCategories().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });

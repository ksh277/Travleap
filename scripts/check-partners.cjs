require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkPartners() {
  const conn = connect({ url: process.env.DATABASE_URL });

  const result = await conn.execute('SELECT COUNT(*) as count FROM partners');
  console.log('Total partners in DB:', result.rows[0].count);

  const activeResult = await conn.execute("SELECT COUNT(*) as count FROM partners WHERE status = 'active'");
  console.log('Active partners:', activeResult.rows[0].count);

  const categoriesResult = await conn.execute('SELECT category, COUNT(*) as count FROM partners GROUP BY category');
  console.log('\nBy category:');
  (categoriesResult.rows || []).forEach(r => {
    console.log(`  - ${r.category}: ${r.count}`);
  });

  // 중복 체크
  const duplicatesResult = await conn.execute(`
    SELECT company_name, email, COUNT(*) as count
    FROM partners
    GROUP BY company_name, email
    HAVING count > 1
  `);

  if (duplicatesResult.rows && duplicatesResult.rows.length > 0) {
    console.log('\n⚠️ Duplicate partners found:');
    duplicatesResult.rows.forEach(r => {
      console.log(`  - ${r.company_name} (${r.email}): ${r.count} times`);
    });
  } else {
    console.log('\n✅ No duplicates found');
  }
}

checkPartners().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });

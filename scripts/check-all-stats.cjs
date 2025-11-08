require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkAll() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('=== Partners Stats ===\n');

  const total = await conn.execute('SELECT COUNT(*) as count FROM partners');
  console.log('Total partners in DB:', total.rows[0].count);

  const byStatus = await conn.execute('SELECT status, COUNT(*) as count FROM partners GROUP BY status');
  console.log('\nBy status:');
  (byStatus.rows || []).forEach(r => {
    console.log(`  - ${r.status || 'NULL'}: ${r.count}`);
  });

  const last10 = await conn.execute('SELECT id, company_name, email, status FROM partners ORDER BY id DESC LIMIT 10');
  console.log('\nLast 10 partners:');
  (last10.rows || []).forEach(r => {
    console.log(`  ID ${r.id}: ${r.company_name} (${r.status})`);
  });

  // Check duplicates
  const dups = await conn.execute(`
    SELECT company_name, COUNT(*) as count
    FROM partners
    GROUP BY company_name
    HAVING count > 1
  `);

  if (dups.rows && dups.rows.length > 0) {
    console.log('\n⚠️ Duplicate company names:');
    dups.rows.forEach(r => {
      console.log(`  - ${r.company_name}: ${r.count} times`);
    });
  }

  // Check accommodation partners
  const accomm = await conn.execute("SELECT COUNT(*) as count FROM partners WHERE LOWER(company_name) LIKE '%숙박%' OR LOWER(company_name) LIKE '%hotel%'");
  console.log(`\nAccommodation partners: ${accomm.rows[0].count}`);
}

checkAll().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });

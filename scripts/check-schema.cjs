require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkSchema() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('🔍 Checking actual database schema...\n');

  try {
    // Check partners table
    console.log('📊 PARTNERS table columns:');
    const partnersDesc = await connection.execute('DESCRIBE partners');
    partnersDesc.rows.forEach(row => {
      console.log(`   - ${row.Field} (${row.Type}) ${row.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${row.Key ? `[${row.Key}]` : ''}`);
    });

    // Check listings table
    console.log('\n📊 LISTINGS table columns:');
    const listingsDesc = await connection.execute('DESCRIBE listings');
    listingsDesc.rows.forEach(row => {
      console.log(`   - ${row.Field} (${row.Type}) ${row.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${row.Key ? `[${row.Key}]` : ''}`);
    });

    // Check categories table
    console.log('\n📊 CATEGORIES table columns:');
    const categoriesDesc = await connection.execute('DESCRIBE categories');
    categoriesDesc.rows.forEach(row => {
      console.log(`   - ${row.Field} (${row.Type}) ${row.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${row.Key ? `[${row.Key}]` : ''}`);
    });

    // Check existing data
    console.log('\n📈 Existing data counts:');
    const partnerCount = await connection.execute('SELECT COUNT(*) as count FROM partners');
    console.log(`   Partners: ${partnerCount.rows[0].count}`);

    const listingCount = await connection.execute('SELECT COUNT(*) as count FROM listings');
    console.log(`   Listings: ${listingCount.rows[0].count}`);

    const categoryCount = await connection.execute('SELECT COUNT(*) as count FROM categories');
    console.log(`   Categories: ${categoryCount.rows[0].count}`);

    const bannerCount = await connection.execute('SELECT COUNT(*) as count FROM home_banners');
    console.log(`   Banners: ${bannerCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSchema()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

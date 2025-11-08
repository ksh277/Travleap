require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkCategories() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('Categories in database:\n');

  try {
    const result = await connection.execute('SELECT * FROM categories ORDER BY id');

    console.log('Columns:', Object.keys(result.rows[0] || {}));
    result.rows.forEach(row => {
      console.log('   [' + row.id + '] ' + row.slug + ' - ' + (row.name_ko || row.name || row.title));
    });

    console.log('\nChecking which categories have listings:');
    const listingCount = await connection.execute('SELECT c.slug, COUNT(l.id) as listing_count FROM categories c LEFT JOIN listings l ON c.id = l.category_id AND l.is_published = 1 AND l.is_active = 1 GROUP BY c.id, c.slug ORDER BY c.id');

    listingCount.rows.forEach(row => {
      console.log('   ' + row.slug + ': ' + row.listing_count + ' listings');
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkCategories().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });

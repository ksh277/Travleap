require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkCategories() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('Categories in database:\n');

  try {
    const result = await connection.execute('SELECT id, slug, name_ko, category_type, sort_order FROM categories ORDER BY sort_order');

    result.rows.forEach(row => {
      console.log('   [' + row.id + '] ' + row.slug + ' - ' + row.name_ko);
      console.log('       type: ' + (row.category_type || 'null') + ', sort: ' + row.sort_order);
    });

    console.log('\nChecking which categories have listings:');
    const listingCount = await connection.execute('SELECT c.slug, c.name_ko, c.category_type, COUNT(l.id) as listing_count FROM categories c LEFT JOIN listings l ON c.id = l.category_id AND l.is_published = 1 AND l.is_active = 1 GROUP BY c.id, c.slug, c.name_ko, c.category_type ORDER BY c.sort_order');

    listingCount.rows.forEach(row => {
      console.log('   ' + row.name_ko + ' (' + row.slug + ') [' + (row.category_type || 'null') + ']: ' + row.listing_count + ' listings');
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkCategories().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });

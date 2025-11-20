/**
 * Check categories table for popup category
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkCategories() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('📊 Checking categories table...\n');

    // Check all categories
    const allResult = await connection.execute('SELECT * FROM categories ORDER BY sort_order');

    console.log('All categories in database:');
    console.log('=' + '='.repeat(80));
    allResult.rows.forEach(cat => {
      console.log(`ID: ${cat.id}, Slug: ${cat.slug}, Name(KO): ${cat.name_ko}, Name(EN): ${cat.name_en || 'N/A'}, Active: ${cat.is_active}, Order: ${cat.sort_order}`);
    });
    console.log('=' + '='.repeat(80) + '\n');

    // Check specifically for popup
    const popupResult = await connection.execute(
      'SELECT * FROM categories WHERE slug = ? OR name_ko LIKE ?',
      ['popup', '%팝업%']
    );

    console.log('Popup category search results:');
    console.log('=' + '='.repeat(80));
    if (popupResult.rows.length === 0) {
      console.log('❌ NO POPUP CATEGORY FOUND IN DATABASE!');
      console.log('This is why it doesn\'t show on some devices.');
    } else {
      popupResult.rows.forEach(cat => {
        console.log(`✅ Found: ID=${cat.id}, slug="${cat.slug}", name_ko="${cat.name_ko}", is_active=${cat.is_active}`);
      });
    }
    console.log('=' + '='.repeat(80) + '\n');

    // Check active categories
    const activeResult = await connection.execute('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order');
    console.log(`Active categories count: ${activeResult.rows.length}`);
    console.log('Active categories:');
    activeResult.rows.forEach(cat => {
      console.log(`  - ${cat.slug} (${cat.name_ko})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCategories();

/**
 * Test the categories API to see what it returns
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function testCategoriesAPI() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🧪 Testing categories API logic...\n');

    // Simulate the exact query from api/categories.js
    const result = await connection.execute(`
      SELECT * FROM categories
      WHERE is_active = 1
      ORDER BY sort_order ASC
    `);

    console.log('✅ API Query Result:');
    console.log('=' + '='.repeat(80));
    console.log(`Total active categories: ${result.rows.length}\n`);

    result.rows.forEach((cat, idx) => {
      console.log(`${idx + 1}. ${cat.name_ko} (${cat.name_en})`);
      console.log(`   - slug: "${cat.slug}"`);
      console.log(`   - id: ${cat.id}`);
      console.log(`   - is_active: ${cat.is_active}`);
      console.log(`   - sort_order: ${cat.sort_order}`);
      if (cat.icon) console.log(`   - icon: ${cat.icon}`);
      console.log('');
    });

    console.log('=' + '='.repeat(80) + '\n');

    // Now test the Header.tsx filtering logic
    console.log('🔍 Testing Header.tsx filtering logic...\n');
    const dbCategories = result.rows;

    // This is the exact filter from Header.tsx line 86-87
    const filteredCategories = dbCategories.filter(cat => cat.slug === 'popup' || cat.name_ko === '팝업');

    console.log('Filter: cat.slug === "popup" || cat.name_ko === "팝업"');
    console.log(`Filtered result: ${filteredCategories.length} categories\n`);

    if (filteredCategories.length === 0) {
      console.log('❌ PROBLEM: Filter returns 0 categories!');
      console.log('This means popup category would NOT appear in navigation.\n');
    } else {
      console.log('✅ Filter returns categories:');
      filteredCategories.forEach(cat => {
        console.log(`   - ${cat.name_ko} (slug: "${cat.slug}", id: ${cat.id})`);
      });
      console.log('\nThis should appear in the navigation dropdown.\n');
    }

    // Check if popup exists in the results
    const popupExists = result.rows.some(cat => cat.slug === 'popup');
    console.log('=' + '='.repeat(80));
    console.log(`Popup category exists in active categories: ${popupExists ? '✅ YES' : '❌ NO'}`);
    console.log('=' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n📝 If API fails, useCategories hook falls back to hardcoded categories.');
    console.error('Hardcoded categories include popup (slug: "popup", name_ko: "팝업")');
  }
}

testCategoriesAPI();

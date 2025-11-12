const { connect } = require('@planetscale/database');

async function main() {
  const connection = connect({ url: process.env.DATABASE_URL });
  
  console.log('🔍 Checking categories in listings table...\n');
  
  // Check all unique categories
  const categoriesResult = await connection.execute(`
    SELECT DISTINCT category, COUNT(*) as count
    FROM listings
    GROUP BY category
    ORDER BY count DESC
  `);
  
  console.log('📊 Categories in listings table:');
  if (categoriesResult.rows && categoriesResult.rows.length > 0) {
    categoriesResult.rows.forEach(row => {
      console.log(`  - "${row.category}": ${row.count} listings`);
    });
  } else {
    console.log('  No categories found');
  }
  
  // Check accommodation listings specifically
  console.log('\n🏠 Accommodation listings:');
  const accommodationResult = await connection.execute(`
    SELECT id, title, category
    FROM listings
    WHERE category IN ('accommodation', 'lodging', '숙박', '여행')
    LIMIT 10
  `);
  
  if (accommodationResult.rows && accommodationResult.rows.length > 0) {
    accommodationResult.rows.forEach(row => {
      console.log(`  ID ${row.id}: "${row.title}" - category: "${row.category}"`);
    });
  } else {
    console.log('  No accommodation listings found');
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

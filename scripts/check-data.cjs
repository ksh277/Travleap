require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkData() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('🔍 Checking actual data...\n');

  try {
    // Check listings by category
    console.log('📦 Listings by category:');
    const listingsByCategory = await connection.execute(`
      SELECT
        c.slug,
        c.name_ko,
        COUNT(l.id) as count
      FROM categories c
      LEFT JOIN listings l ON c.id = l.category_id AND l.is_published = 1 AND l.is_active = 1
      GROUP BY c.id, c.slug, c.name_ko
      ORDER BY c.sort_order
    `);

    listingsByCategory.rows.forEach(row => {
      console.log(`   ${row.name_ko} (${row.slug}): ${row.count} listings`);
    });

    // Check if there are listings with category but no category_id
    console.log('\n🔍 Listings with category VARCHAR but no category_id:');
    const orphanListings = await connection.execute(`
      SELECT COUNT(*) as count
      FROM listings
      WHERE category_id IS NULL OR category_id = 0
    `);
    console.log(`   ${orphanListings.rows[0].count} listings without proper category_id`);

    // Sample listings
    console.log('\n📋 Sample listings (first 5):');
    const sampleListings = await connection.execute(`
      SELECT
        l.id,
        l.title,
        l.category,
        l.category_id,
        c.slug as category_slug,
        c.name_ko as category_name,
        l.price_from,
        l.is_published,
        l.is_active
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      LIMIT 5
    `);

    sampleListings.rows.forEach(row => {
      console.log(`   [${row.id}] ${row.title}`);
      console.log(`       category: "${row.category}" | category_id: ${row.category_id} → ${row.category_slug} (${row.category_name})`);
      console.log(`       price: ₩${row.price_from} | published: ${row.is_published} | active: ${row.is_active}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

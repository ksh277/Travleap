require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkPopupImages() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n🔍 Checking popup category listings images...\n');

  try {
    // Get popup listings
    const result = await connection.execute(`
      SELECT id, title, category, images,
             SUBSTRING(images, 1, 100) as images_preview
      FROM listings
      WHERE category = 'popup'
      LIMIT 5
    `);

    if (result.rows.length === 0) {
      console.log('❌ No popup listings found');
      return;
    }

    console.log(`Found ${result.rows.length} popup listings:\n`);

    result.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ID: ${row.id}`);
      console.log(`   Title: ${row.title}`);
      console.log(`   Category: ${row.category}`);
      console.log(`   Images type: ${typeof row.images}`);
      console.log(`   Images preview: ${row.images_preview}`);

      // Try to determine if it's a JSON string or already parsed
      if (typeof row.images === 'string') {
        console.log(`   ⚠️  Images stored as STRING (needs parsing)`);
        try {
          const parsed = JSON.parse(row.images);
          console.log(`   ✅ Can be parsed to array with ${parsed.length} items`);
          if (parsed.length > 0) {
            console.log(`   First image: ${parsed[0]}`);
          }
        } catch (e) {
          console.log(`   ❌ Cannot parse as JSON: ${e.message}`);
        }
      } else if (Array.isArray(row.images)) {
        console.log(`   ✅ Already an array with ${row.images.length} items`);
        if (row.images.length > 0) {
          console.log(`   First image: ${row.images[0]}`);
        }
      } else {
        console.log(`   ❌ Unknown type: ${typeof row.images}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPopupImages();

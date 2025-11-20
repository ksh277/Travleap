require('dotenv').config();
const { connect } = require('@planetscale/database');

async function resetPopupImages() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('🔧 Resetting popup product images to empty arrays...\n');

  try {
    // 현재 상태 확인
    const current = await connection.execute(`
      SELECT id, title, images
      FROM listings
      WHERE category = 'popup'
    `);

    if (current.rows.length === 0) {
      console.log('❌ No popup products found');
      return;
    }

    console.log(`Found ${current.rows.length} popup products:\n`);
    current.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ID ${row.id}: ${row.title}`);
      const imagesPreview = typeof row.images === 'string'
        ? row.images.substring(0, 80)
        : JSON.stringify(row.images).substring(0, 80);
      console.log(`   Current images: ${imagesPreview}...`);
    });

    console.log('\n⚠️  Updating images to empty arrays...\n');

    // blob URL을 빈 배열로 업데이트
    const result = await connection.execute(`
      UPDATE listings
      SET images = '[]'
      WHERE category = 'popup'
    `);

    console.log(`✅ Successfully updated ${result.rowsAffected} popup products`);
    console.log('✅ All images have been reset to empty arrays');

    // 업데이트 후 확인
    const updated = await connection.execute(`
      SELECT id, title, images
      FROM listings
      WHERE category = 'popup'
    `);

    console.log('\nUpdated state:');
    updated.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ID ${row.id}: ${row.title}`);
      console.log(`   Images: ${row.images}`);
    });

    console.log('\n📝 Next steps:');
    console.log('   1. Go to AdminPage (로그인 필요)');
    console.log('   2. Find and edit each popup product');
    console.log('   3. Upload images using the new Vercel Blob Storage upload');
    console.log('   4. Images will now work on all devices! 🎉');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

resetPopupImages();

require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkUploadedImages() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('🔍 Checking recently uploaded images...\n');

  try {
    // 최근 추가된 popup 상품 확인
    const result = await connection.execute(`
      SELECT
        id,
        title,
        images,
        created_at
      FROM listings
      WHERE category = 'popup'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (result.rows.length === 0) {
      console.log('❌ No popup products found');
      return;
    }

    console.log(`Found ${result.rows.length} popup products:\n`);

    result.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ID ${row.id}: ${row.title}`);
      console.log(`   Created: ${row.created_at}`);

      // 이미지 파싱
      let images;
      try {
        images = typeof row.images === 'string' ? JSON.parse(row.images) : row.images;
      } catch (e) {
        images = [];
      }

      if (!images || images.length === 0) {
        console.log('   Images: [] (비어있음)');
      } else {
        console.log(`   Images: ${images.length}개`);
        images.forEach((img, i) => {
          const imageType = img.startsWith('blob:') ? '❌ BLOB URL (임시)' :
                           img.startsWith('https://') ? '✅ HTTPS URL (영구)' :
                           '❓ UNKNOWN';
          console.log(`     ${i + 1}. ${imageType}`);
          console.log(`        ${img.substring(0, 80)}...`);
        });
      }
      console.log('');
    });

    console.log('\n📋 해석:');
    console.log('   ✅ HTTPS URL = Vercel Blob Storage (모든 기기에서 보임)');
    console.log('   ❌ BLOB URL = 브라우저 메모리 (업로드한 컴퓨터에서만 보임)');
    console.log('   [] = 이미지 없음 (재업로드 필요)');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUploadedImages();

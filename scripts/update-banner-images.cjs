/**
 * 배너 이미지를 실제 이미지로 업데이트하는 스크립트
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function updateBannerImages() {
  console.log('\n' + '='.repeat(80));
  console.log('🖼️  배너 이미지 업데이트');
  console.log('='.repeat(80));

  try {
    const conn = connect({ url: process.env.DATABASE_URL });

    // 실제 멋진 이미지로 업데이트
    console.log('\n📸 배너 이미지 업데이트 중...');

    await conn.execute(`
      UPDATE home_banners
      SET image_url = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=400&fit=crop',
          title = '신안 여름 특별 할인'
      WHERE display_order = 1
    `);

    await conn.execute(`
      UPDATE home_banners
      SET image_url = 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&h=400&fit=crop',
          title = '갯벌 체험 프로그램'
      WHERE display_order = 2
    `);

    await conn.execute(`
      UPDATE home_banners
      SET image_url = 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&h=400&fit=crop',
          title = '홍도 투어 예약 오픈'
      WHERE display_order = 3
    `);

    console.log('✅ 배너 이미지 업데이트 완료');

    // 확인
    const banners = await conn.execute(`
      SELECT id, title, image_url, display_order
      FROM home_banners
      WHERE is_active = TRUE
      ORDER BY display_order ASC
    `);

    console.log('\n📋 업데이트된 배너 목록:');
    console.log('-'.repeat(80));
    banners.rows.forEach((banner) => {
      console.log(`${banner.display_order}. ${banner.title}`);
      console.log(`   ${banner.image_url}`);
      console.log('-'.repeat(80));
    });

    console.log('\n✅ 완료!');

  } catch (error) {
    console.error('\n❌ 에러:', error);
    process.exit(1);
  }
}

updateBannerImages();

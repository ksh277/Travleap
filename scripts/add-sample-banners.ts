import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = connect({ url: process.env.DATABASE_URL });

async function addSampleBanners() {
  console.log('🎨 메인페이지 샘플 배너 추가 중...\n');

  try {
    // 기존 배너 삭제
    await connection.execute('DELETE FROM home_banners');
    console.log('   ✅ 기존 배너 삭제 완료');

    // 샘플 배너 2개 추가
    const banners = [
      {
        title: '신안 여행의 모든 것',
        image_url: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1200&h=400&fit=crop',
        link_url: '/category/tour',
        display_order: 1,
        is_active: 1
      },
      {
        title: '숙박부터 체험까지 한번에',
        image_url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&h=400&fit=crop',
        link_url: '/category/stay',
        display_order: 2,
        is_active: 1
      }
    ];

    for (const banner of banners) {
      await connection.execute(
        `INSERT INTO home_banners (title, image_url, link_url, display_order, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [banner.title, banner.image_url, banner.link_url, banner.display_order, banner.is_active]
      );
      console.log(`   ✅ 배너 추가: ${banner.title}`);
    }

    console.log('\n🎉 샘플 배너 2개 추가 완료!');
    console.log('메인 페이지에서 확인해보세요: http://localhost:5173\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

addSampleBanners();

// 카테고리 데이터 수정 스크립트
import 'dotenv/config';
import { db } from '../utils/database';

async function fixCategories() {
  console.log('🔧 카테고리 데이터 수정 시작...');

  try {
    // 1. 기존 카테고리 모두 삭제
    await db.execute('DELETE FROM categories');
    console.log('✅ 기존 카테고리 삭제 완료');

    // 2. 올바른 8개 카테고리 삽입
    const categories = [
      { slug: 'tour', name_ko: '여행', name_en: 'Travel', icon: '🗺️', color_hex: '#FF6B6B', sort_order: 1 },
      { slug: 'rentcar', name_ko: '렌트카', name_en: 'Car Rental', icon: '🚗', color_hex: '#4ECDC4', sort_order: 2 },
      { slug: 'stay', name_ko: '숙박', name_en: 'Accommodation', icon: '🏨', color_hex: '#45B7D1', sort_order: 3 },
      { slug: 'food', name_ko: '음식', name_en: 'Food', icon: '🍴', color_hex: '#96CEB4', sort_order: 4 },
      { slug: 'tourist', name_ko: '관광지', name_en: 'Tourist Spots', icon: '📸', color_hex: '#FFEAA7', sort_order: 5 },
      { slug: 'popup', name_ko: '팝업', name_en: 'Pop-up', icon: '⭐', color_hex: '#FF9FF3', sort_order: 6 },
      { slug: 'event', name_ko: '행사', name_en: 'Events', icon: '📅', color_hex: '#54A0FF', sort_order: 7 },
      { slug: 'experience', name_ko: '체험', name_en: 'Experience', icon: '❤️', color_hex: '#5F27CD', sort_order: 8 }
    ];

    for (const category of categories) {
      await db.execute(`
        INSERT INTO categories (slug, name_ko, name_en, icon, color_hex, sort_order, is_active)
        VALUES (?, ?, ?, ?, ?, ?, TRUE)
      `, [category.slug, category.name_ko, category.name_en, category.icon, category.color_hex, category.sort_order]);
      console.log(`✅ ${category.name_ko} (${category.slug}) 추가 완료`);
    }

    // 3. 결과 확인
    const result = await db.query('SELECT * FROM categories ORDER BY sort_order');
    console.log('\n📋 최종 카테고리 목록:');
    result.forEach((cat: any) => {
      console.log(`  ${cat.sort_order}. ${cat.name_ko} (${cat.slug}) - ${cat.icon}`);
    });

    console.log('\n✅ 카테고리 데이터 수정 완료!');
  } catch (error) {
    console.error('❌ 카테고리 수정 실패:', error);
    throw error;
  }
}

// 스크립트 실행
fixCategories()
  .then(() => {
    console.log('✅ 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류:', error);
    process.exit(1);
  });

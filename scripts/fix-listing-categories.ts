// 상품 카테고리 매핑 수정 스크립트
import 'dotenv/config';
import { db } from '../utils/database';

async function fixListingCategories() {
  console.log('🔧 상품 카테고리 매핑 수정 시작...\n');

  try {
    // 1. 현재 상품들의 카테고리 확인
    console.log('📋 현재 상품 카테고리 현황:');
    const listings = await db.query(`
      SELECT DISTINCT l.category, COUNT(*) as count
      FROM listings l
      GROUP BY l.category
      ORDER BY count DESC
    `);

    listings.forEach((cat: any) => {
      console.log(`   - ${cat.category}: ${cat.count}개`);
    });

    // 2. 카테고리 매핑
    const categoryMapping: Record<string, number> = {
      'tour': 1,        // 여행
      'rentcar': 2,     // 렌트카
      'stay': 3,        // 숙박
      'food': 4,        // 음식
      'attraction': 5,  // 관광지 (tourist로 변경 예정)
      'tourist': 5,     // 관광지
      'popup': 6,       // 팝업
      'event': 7,       // 행사
      'experience': 8   // 체험
    };

    console.log('\n🔄 카테고리 매핑 업데이트 중...');

    // 3. 각 카테고리별 업데이트
    for (const [oldSlug, categoryId] of Object.entries(categoryMapping)) {
      const result = await db.execute(`
        UPDATE listings
        SET category_id = ?
        WHERE category = ?
      `, [categoryId, oldSlug]);

      if (result.affectedRows > 0) {
        console.log(`   ✅ ${oldSlug} → category_id ${categoryId}: ${result.affectedRows}개 업데이트`);
      }
    }

    // 4. attraction을 tourist로 변경
    console.log('\n🔄 attraction → tourist 변경 중...');
    const attractionUpdate = await db.execute(`
      UPDATE listings
      SET category = 'tourist'
      WHERE category = 'attraction'
    `);
    console.log(`   ✅ ${attractionUpdate.affectedRows}개 상품 업데이트`);

    // 5. 결과 확인
    console.log('\n📊 업데이트 후 상품 카테고리:');
    const updatedListings = await db.query(`
      SELECT c.name_ko, c.slug, COUNT(l.id) as count
      FROM categories c
      LEFT JOIN listings l ON c.id = l.category_id
      GROUP BY c.id, c.name_ko, c.slug
      ORDER BY c.sort_order
    `);

    updatedListings.forEach((cat: any) => {
      console.log(`   ${cat.count > 0 ? '✅' : '⚠️'} ${cat.name_ko} (${cat.slug}): ${cat.count}개`);
    });

    console.log('\n✅ 카테고리 매핑 수정 완료!');
  } catch (error) {
    console.error('❌ 카테고리 매핑 수정 실패:', error);
    throw error;
  }
}

// 스크립트 실행
fixListingCategories()
  .then(() => {
    console.log('\n✅ 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류:', error);
    process.exit(1);
  });

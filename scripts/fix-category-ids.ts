// 카테고리 ID 재매핑 스크립트
import 'dotenv/config';
import { db } from '../utils/database';

async function fixCategoryIds() {
  console.log('🔧 카테고리 ID 재매핑 시작...\n');

  try {
    // 1. 현재 카테고리 ID 확인
    const categories = await db.query('SELECT id, slug, name_ko FROM categories ORDER BY sort_order');
    console.log('📋 현재 카테고리 ID:');
    categories.forEach((cat: any) => {
      console.log(`   ${cat.name_ko} (${cat.slug}): ID ${cat.id}`);
    });

    // 2. 현재 상품의 category 값들 확인
    const currentCategories = await db.query(`
      SELECT DISTINCT category, COUNT(*) as count
      FROM listings
      GROUP BY category
      ORDER BY count DESC
    `);
    console.log('\n📋 현재 상품 category 값:');
    currentCategories.forEach((cat: any) => {
      console.log(`   "${cat.category}": ${cat.count}개`);
    });

    // 3. DB에서 실제 카테고리 ID로 매핑 생성
    const categoryMapping: Record<string, number> = {};

    // DB 카테고리를 기반으로 매핑 생성
    categories.forEach((cat: any) => {
      categoryMapping[cat.slug] = cat.id;
    });

    // 추가 매핑 (한글, 동의어, 잘못된 값들)
    const additionalMapping: Record<string, string> = {
      // 한글 → slug
      '투어': 'tour',
      '여행': 'tour',
      '렌트카': 'rentcar',
      '숙박': 'stay',
      '음식': 'food',
      '관광지': 'tourist',
      '체험': 'experience',
      '팝업': 'popup',
      '행사': 'event',
      // 영문 동의어
      'accommodation': 'stay',
      'restaurant': 'food',
      'attraction': 'tourist',
      'rental': 'rentcar',
      // 잘못된 값들
      'exp': 'experience',
      'pup': 'popup',
      'po': 'popup',
    };

    // 추가 매핑을 실제 카테고리 ID로 변환
    Object.entries(additionalMapping).forEach(([key, slug]) => {
      const categoryId = categoryMapping[slug];
      if (categoryId) {
        categoryMapping[key] = categoryId;
      }
    });

    console.log('\n🔄 상품 category_id 업데이트 중...');

    let totalUpdated = 0;

    // 4. 각 매핑별로 업데이트
    for (const [categoryText, categoryId] of Object.entries(categoryMapping)) {
      const result = await db.execute(`
        UPDATE listings
        SET category_id = ?
        WHERE category = ?
      `, [categoryId, categoryText]);

      if (result.affectedRows > 0) {
        console.log(`   ✅ "${categoryText}" → ID ${categoryId}: ${result.affectedRows}개 업데이트`);
        totalUpdated += result.affectedRows;
      }
    }

    // 5. NULL이거나 매핑되지 않은 값들을 투어(1)로 설정
    const nullResult = await db.execute(`
      UPDATE listings
      SET category_id = 1
      WHERE category_id IS NULL OR category_id = 0
    `);

    if (nullResult.affectedRows > 0) {
      console.log(`   ⚠️ NULL/0 → ID 1 (투어): ${nullResult.affectedRows}개 업데이트`);
      totalUpdated += nullResult.affectedRows;
    }

    console.log(`\n✅ 총 ${totalUpdated}개 상품 업데이트 완료!`);

    // 6. 결과 확인
    console.log('\n📊 업데이트 후 상품 분포:');
    const result = await db.query(`
      SELECT
        c.name_ko,
        c.slug,
        c.id as category_id,
        COUNT(l.id) as count
      FROM categories c
      LEFT JOIN listings l ON c.id = l.category_id
      GROUP BY c.id, c.name_ko, c.slug
      ORDER BY c.sort_order
    `);

    result.forEach((row: any) => {
      const status = row.count > 0 ? '✅' : '⚠️';
      console.log(`   ${status} ${row.name_ko} (${row.slug}): ${row.count}개`);
    });

    // 7. 매핑되지 않은 상품 확인
    const unmapped = await db.query(`
      SELECT id, title, category, category_id
      FROM listings
      WHERE category_id NOT IN (1, 2, 3, 4, 5, 6)
         OR category_id IS NULL
      LIMIT 10
    `);

    if (unmapped.length > 0) {
      console.log('\n⚠️ 아직 매핑되지 않은 상품:');
      unmapped.forEach((item: any) => {
        console.log(`   [${item.id}] ${item.title} - category: "${item.category}", category_id: ${item.category_id}`);
      });
    }

    console.log('\n✅ 카테고리 ID 재매핑 완료!');
  } catch (error) {
    console.error('❌ 재매핑 실패:', error);
    throw error;
  }
}

fixCategoryIds()
  .then(() => {
    console.log('\n✅ 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류:', error);
    process.exit(1);
  });

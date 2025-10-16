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

    // 2. 매핑 생성 (slug → new_id)
    const mapping: Record<string, number> = {};
    categories.forEach((cat: any) => {
      mapping[cat.slug] = cat.id;
    });

    console.log('\n🔄 상품 category_id 업데이트 중...');

    // 3. 각 slug별로 category_id 업데이트
    for (const [slug, newId] of Object.entries(mapping)) {
      const result = await db.execute(`
        UPDATE listings
        SET category_id = ?
        WHERE category = ?
      `, [newId, slug]);

      if (result.affectedRows > 0) {
        console.log(`   ✅ ${slug} → ID ${newId}: ${result.affectedRows}개 업데이트`);
      }
    }

    // 4. 결과 확인
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

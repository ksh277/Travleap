// 카테고리 매핑 검증 스크립트
import 'dotenv/config';
import { db } from '../utils/database';

async function verifyCategories() {
  console.log('🔍 카테고리 매핑 검증...\n');

  try {
    // 1. 상품 데이터 확인
    console.log('📦 상품 카테고리 매핑:');
    const listings = await db.query(`
      SELECT id, title, category, category_id
      FROM listings
      ORDER BY category, title
    `);

    console.log(`총 ${listings.length}개 상품\n`);

    const grouped: Record<string, any[]> = {};
    listings.forEach((l: any) => {
      const key = l.category || 'unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(l);
    });

    Object.entries(grouped).forEach(([cat, items]) => {
      console.log(`[${cat}] - ${items.length}개:`);
      items.forEach((item: any) => {
        console.log(`   - ID:${item.id} category_id:${item.category_id} "${item.title}"`);
      });
      console.log('');
    });

    // 2. 카테고리별 상품 수
    console.log('📊 카테고리별 상품 개수 (category_id 기준):');
    const byCategoryId = await db.query(`
      SELECT
        c.id as category_id,
        c.slug,
        c.name_ko,
        COUNT(l.id) as listing_count
      FROM categories c
      LEFT JOIN listings l ON c.id = l.category_id
      GROUP BY c.id, c.slug, c.name_ko
      ORDER BY c.sort_order
    `);

    byCategoryId.forEach((row: any) => {
      const status = row.listing_count > 0 ? '✅' : '⚠️';
      console.log(`   ${status} ${row.name_ko} (ID: ${row.category_id}, slug: ${row.slug}): ${row.listing_count}개`);
    });

    console.log('\n✅ 검증 완료!');
  } catch (error) {
    console.error('❌ 검증 실패:', error);
    throw error;
  }
}

verifyCategories()
  .then(() => {
    console.log('\n✅ 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류:', error);
    process.exit(1);
  });

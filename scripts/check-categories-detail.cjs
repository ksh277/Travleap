/**
 * Categories 테이블 상세 확인
 */
require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('📊 Categories 테이블 확인 중...\n');

    const result = await connection.execute(`
      SELECT * FROM categories
      ORDER BY id ASC
    `);

    if (result.rows && result.rows.length > 0) {
      console.log('✅ 카테고리 목록:\n');
      result.rows.forEach((category, index) => {
        console.log(`[${index + 1}] ID: ${category.id}`);
        console.log(`    Slug: ${category.slug}`);
        console.log(`    이름(KO): ${category.name_ko}`);
        console.log(`    이름(EN): ${category.name_en}`);
        console.log(`    아이콘: ${category.icon || 'N/A'}`);
        console.log(`    활성화: ${category.is_active ? '✅' : '❌'}`);
        console.log(`    정렬순서: ${category.sort_order}`);
        console.log();
      });

      console.log('\n=== 숙박(Accommodation) 확인 ===');
      const accommodation = result.rows.find(c => c.slug === 'accommodation' || c.name_ko === '숙박');
      if (accommodation) {
        console.log('✅ 숙박 카테고리 발견:');
        console.log(`   ID: ${accommodation.id}`);
        console.log(`   Slug: ${accommodation.slug}`);
        console.log(`   이름: ${accommodation.name_ko}`);
      } else {
        console.log('❌ 숙박 카테고리 없음');
      }

      console.log('\n=== listings 테이블에서 category_id 확인 ===');
      const listingsResult = await connection.execute(`
        SELECT DISTINCT category_id
        FROM listings
        WHERE category_id IN (1, 2, 3, 1857, 1858, 1859, 1861, 1862)
        ORDER BY category_id ASC
      `);

      if (listingsResult.rows && listingsResult.rows.length > 0) {
        console.log('Listings에서 사용 중인 category_id:');
        listingsResult.rows.forEach(row => {
          const cat = result.rows.find(c => c.id === row.category_id);
          console.log(`   - ${row.category_id}: ${cat ? cat.name_ko : '알 수 없음'}`);
        });
      }

    } else {
      console.log('ℹ️ 카테고리 데이터 없음');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
})();

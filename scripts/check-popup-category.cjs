/**
 * 팝업 카테고리 및 listings 확인
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkPopupCategory() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n' + '='.repeat(70));
  console.log('팝업 카테고리 및 상품 데이터 확인');
  console.log('='.repeat(70) + '\n');

  try {
    // 1. categories 테이블에서 팝업 카테고리 확인
    console.log('[1] categories 테이블에서 popup 카테고리 확인:');
    console.log('-'.repeat(70));
    const categoryResult = await connection.execute(
      `SELECT * FROM categories WHERE slug = 'popup' OR name_ko LIKE '%팝업%'`
    );

    if (categoryResult.rows && categoryResult.rows.length > 0) {
      console.log('✅ 팝업 카테고리 발견:');
      categoryResult.rows.forEach(cat => {
        console.log(`   ID: ${cat.id}, slug: ${cat.slug}, name_ko: ${cat.name_ko}, is_active: ${cat.is_active}`);
      });
    } else {
      console.log('❌ 팝업 카테고리가 없습니다!');
    }

    // 2. listings 테이블에서 팝업 상품 확인
    console.log('\n[2] listings 테이블에서 팝업 카테고리 상품 확인:');
    console.log('-'.repeat(70));

    const listingsResult = await connection.execute(`
      SELECT
        l.id,
        l.title,
        l.category_id,
        c.slug as category_slug,
        c.name_ko as category_name,
        l.is_published,
        l.is_active
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE l.is_published = 1 AND l.is_active = 1
      ORDER BY c.slug, l.id
    `);

    if (listingsResult.rows && listingsResult.rows.length > 0) {
      const popupListings = listingsResult.rows.filter(item => item.category_slug === 'popup');

      console.log(`전체 active listings: ${listingsResult.rows.length}개`);
      console.log(`팝업 카테고리 상품: ${popupListings.length}개\n`);

      // 카테고리별 통계
      const categoryStats = {};
      listingsResult.rows.forEach(item => {
        const cat = item.category_slug || 'null';
        categoryStats[cat] = (categoryStats[cat] || 0) + 1;
      });

      console.log('카테고리별 상품 수:');
      Object.entries(categoryStats).forEach(([slug, count]) => {
        console.log(`   ${slug}: ${count}개`);
      });

      if (popupListings.length > 0) {
        console.log('\n팝업 카테고리 상품 목록:');
        popupListings.forEach(item => {
          console.log(`   - [${item.id}] ${item.title}`);
        });
      }
    } else {
      console.log('❌ 상품이 하나도 없습니다!');
    }

    // 3. API 쿼리 시뮬레이션
    console.log('\n[3] API 쿼리 시뮬레이션 (category=popup):');
    console.log('-'.repeat(70));

    const apiResult = await connection.execute(`
      SELECT
        l.id,
        l.title,
        c.name_ko as category_name,
        c.slug as category_slug
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      LEFT JOIN partners p ON l.partner_id = p.id
      WHERE l.is_published = 1 AND l.is_active = 1
      AND c.slug = ?
      ORDER BY l.created_at DESC
    `, ['popup']);

    console.log(`팝업 필터링 결과: ${apiResult.rows?.length || 0}개`);
    if (apiResult.rows && apiResult.rows.length > 0) {
      apiResult.rows.forEach(item => {
        console.log(`   ✓ [${item.id}] ${item.title}`);
      });
    } else {
      console.log('   ⚠️  필터링 결과 없음');
    }

    console.log('\n' + '='.repeat(70));
    console.log('확인 완료');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n✗ 오류 발생:', error.message);
    console.error(error);
  }
}

checkPopupCategory();

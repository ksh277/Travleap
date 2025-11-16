/**
 * 8개 카테고리별 상품 현황 확인 스크립트
 * 팝업, 투어, 음식, 체험, 이벤트, 관광지, 숙박, 렌트카
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkAllCategories() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n=== 8개 카테고리별 상품 현황 ===\n');

  try {
    // 1. 모든 카테고리 조회
    const categoriesResult = await connection.execute(`
      SELECT id, name_ko, slug FROM categories ORDER BY id
    `);

    console.log('📋 전체 카테고리 목록:');
    categoriesResult.rows.forEach(cat => {
      console.log(`  - ID ${cat.id}: ${cat.name_ko} (${cat.slug})`);
    });

    // 2. 각 카테고리별 상품 수 확인
    console.log('\n📊 카테고리별 상품 수:\n');

    // ✅ 실제 DB에서 카테고리 조회
    const categories = categoriesResult.rows.map(cat => ({
      id: cat.id,
      name: cat.name_ko,
      slug: cat.slug
    }));

    for (const category of categories) {
      const countResult = await connection.execute(`
        SELECT COUNT(*) as count
        FROM listings
        WHERE category_id = ? AND is_published = 1
      `, [category.id]);

      const count = countResult.rows[0]?.count || 0;

      // 샘플 상품 조회 (최대 3개)
      const samplesResult = await connection.execute(`
        SELECT id, title, base_price_per_night, is_active
        FROM listings
        WHERE category_id = ? AND is_published = 1
        LIMIT 3
      `, [category.id]);

      console.log(`${category.name} (ID: ${category.id}, slug: ${category.slug}):`);
      console.log(`  ✅ 총 ${count}개 상품`);

      if (samplesResult.rows.length > 0) {
        console.log('  📦 샘플 상품:');
        samplesResult.rows.forEach(product => {
          console.log(`    - [ID: ${product.id}] ${product.title}`);
          console.log(`      가격: ${product.base_price_per_night?.toLocaleString() || 'N/A'}원`);
          console.log(`      활성화: ${product.is_active ? 'YES' : 'NO'}`);
        });
      } else {
        console.log('  ⚠️  등록된 상품 없음');
      }
      console.log('');
    }

    // 3. 팝업 카테고리 상세 분석
    console.log('\n🎯 팝업 카테고리 상세 분석:\n');

    // ✅ 팝업 카테고리 ID 동적 조회
    const popupCategoryResult = await connection.execute(`
      SELECT id FROM categories WHERE slug = 'popup' LIMIT 1
    `);

    const popupCategoryId = popupCategoryResult.rows[0]?.id;

    if (!popupCategoryId) {
      console.log('⚠️  팝업 카테고리를 찾을 수 없습니다.');
    } else {
      const popupProducts = await connection.execute(`
        SELECT
          l.id,
          l.title,
          l.category_id,
          c.name_ko as category_name,
          c.slug as category_slug,
          l.base_price_per_night,
          l.is_active,
          l.is_published,
          l.partner_id
        FROM listings l
        LEFT JOIN categories c ON l.category_id = c.id
        WHERE l.category_id = ?
        ORDER BY l.created_at DESC
      `, [popupCategoryId]);

      if (popupProducts.rows.length > 0) {
        popupProducts.rows.forEach(product => {
          console.log(`[ID: ${product.id}] ${product.title}`);
          console.log(`  category_id: ${product.category_id}`);
          console.log(`  category_name: ${product.category_name}`);
          console.log(`  category_slug: ${product.category_slug}`);
          console.log(`  가격: ${product.base_price_per_night?.toLocaleString() || 'N/A'}원`);
          console.log(`  활성화: ${product.is_active ? 'YES' : 'NO'}`);
          console.log(`  공개: ${product.is_published ? 'YES' : 'NO'}`);
          console.log(`  partner_id: ${product.partner_id || 'NULL (관리자 생성)'}`);
          console.log('');
        });
      } else {
        console.log('⚠️  팝업 상품이 없습니다.');
      }
    }

    // 4. 숙박/렌트카 확인 (별도 테이블 사용)
    console.log('\n🏨 숙박 파트너 현황:\n');

    const lodgingPartners = await connection.execute(`
      SELECT id, business_name, partner_type, status
      FROM partners
      WHERE partner_type = 'lodging'
      LIMIT 5
    `);

    if (lodgingPartners.rows.length > 0) {
      console.log(`✅ 총 ${lodgingPartners.rows.length}개 숙박 파트너`);
      lodgingPartners.rows.forEach(partner => {
        console.log(`  - [ID: ${partner.id}] ${partner.business_name} (${partner.status})`);
      });
    } else {
      console.log('⚠️  숙박 파트너 없음');
    }

    console.log('\n🚗 렌트카 벤더 현황:\n');

    const rentcarVendors = await connection.execute(`
      SELECT id, business_name, brand_name, status
      FROM rentcar_vendors
      LIMIT 5
    `);

    if (rentcarVendors.rows.length > 0) {
      console.log(`✅ 총 ${rentcarVendors.rows.length}개 렌트카 벤더`);
      rentcarVendors.rows.forEach(vendor => {
        console.log(`  - [ID: ${vendor.id}] ${vendor.business_name} ${vendor.brand_name ? '(' + vendor.brand_name + ')' : ''} [${vendor.status}]`);
      });
    } else {
      console.log('⚠️  렌트카 벤더 없음');
    }

  } catch (error) {
    console.error('❌ 오류:', error);
  }

  console.log('\n=== 완료 ===\n');
}

checkAllCategories();

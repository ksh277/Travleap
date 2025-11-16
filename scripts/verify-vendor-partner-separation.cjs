/**
 * 벤더/파트너 완전 분리 검증 스크립트
 *
 * 검증 항목:
 * 1. 상품관리 listings는 partner_id = NULL
 * 2. 파트너 관리는 partners 테이블만 조회
 * 3. 숙박/렌트카는 별도 시스템
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function verifyVendorPartnerSeparation() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n=== 벤더/파트너 완전 분리 검증 ===\n');

  try {
    // 1. 상품 관리 - partner_id = NULL인 상품 확인
    console.log('📦 1. 상품 관리 (Product Management)');
    console.log('   조건: partner_id IS NULL AND category NOT IN (stay, rentcar)\n');

    const productMgmtResult = await connection.execute(`
      SELECT
        l.id,
        l.title,
        l.partner_id,
        c.name_ko as category_name,
        c.slug as category_slug
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE c.slug != 'stay' AND c.slug != 'rentcar'
      AND l.is_published = 1
      ORDER BY l.created_at DESC
      LIMIT 10
    `);

    console.log(`   총 ${productMgmtResult.rows.length}개 상품:`);
    productMgmtResult.rows.forEach(product => {
      const isNull = product.partner_id === null || product.partner_id === undefined;
      const status = isNull ? '✅ NULL' : `⚠️  ${product.partner_id}`;
      console.log(`   - [ID: ${product.id}] ${product.title}`);
      console.log(`     카테고리: ${product.category_name} (${product.category_slug})`);
      console.log(`     partner_id: ${status}`);
    });

    // partner_id가 NULL이 아닌 상품 체크
    const invalidProducts = productMgmtResult.rows.filter(p => p.partner_id !== null && p.partner_id !== undefined);
    if (invalidProducts.length > 0) {
      console.log(`\n   ⚠️  경고: ${invalidProducts.length}개 상품에 partner_id가 설정되어 있습니다!`);
      console.log(`   이 상품들이 파트너 관리에 나타날 수 있습니다.`);
    } else {
      console.log(`\n   ✅ 모든 상품이 partner_id = NULL입니다.`);
    }

    // 2. 파트너 관리 - status='pending'인 신청만 표시
    console.log('\n\n👥 2. 파트너 관리 (Partner Management)');
    console.log('   조건: status = \'pending\' (신청 대기 중)\n');

    const partnerMgmtResult = await connection.execute(`
      SELECT
        p.id,
        p.business_name,
        p.partner_type,
        p.status,
        (SELECT COUNT(*) FROM listings l WHERE l.partner_id = p.id) as listing_count
      FROM partners p
      WHERE p.status = 'pending'
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    console.log(`   총 ${partnerMgmtResult.rows.length}개 신청:`);
    partnerMgmtResult.rows.forEach(partner => {
      console.log(`   - [ID: ${partner.id}] ${partner.business_name || '업체명 없음'}`);
      console.log(`     타입: ${partner.partner_type || 'N/A'}`);
      console.log(`     상태: ${partner.status}`);
      console.log(`     연결된 listings: ${partner.listing_count}개`);
    });

    if (partnerMgmtResult.rows.length === 0) {
      console.log('   ✅ 대기 중인 신청이 없습니다.');
    }

    // 3. 숙박 관리 - partners 테이블 (partner_type='lodging')
    console.log('\n\n🏨 3. 숙박 관리 (Accommodation Management)');
    console.log('   조건: partner_type = \'lodging\' (별도 테이블)\n');

    const accommodationMgmtResult = await connection.execute(`
      SELECT
        p.id,
        p.business_name,
        p.partner_type,
        p.status,
        (SELECT COUNT(*) FROM listings l WHERE l.partner_id = p.id AND l.category_id = (SELECT id FROM categories WHERE slug = 'stay')) as room_count
      FROM partners p
      WHERE p.partner_type = 'lodging'
      ORDER BY p.created_at DESC
      LIMIT 5
    `);

    console.log(`   총 ${accommodationMgmtResult.rows.length}개 숙박 파트너:`);
    accommodationMgmtResult.rows.forEach(partner => {
      console.log(`   - [ID: ${partner.id}] ${partner.business_name}`);
      console.log(`     상태: ${partner.status}`);
      console.log(`     객실 수: ${partner.room_count}개`);
    });

    // 4. 렌트카 관리 - rentcar_vendors 테이블 (완전 별도)
    console.log('\n\n🚗 4. 렌트카 관리 (Rentcar Management)');
    console.log('   조건: 별도 rentcar_vendors 테이블\n');

    const rentcarMgmtResult = await connection.execute(`
      SELECT
        v.id,
        v.business_name,
        v.status,
        (SELECT COUNT(*) FROM rentcar_vehicles rv WHERE rv.vendor_id = v.id) as vehicle_count
      FROM rentcar_vendors v
      ORDER BY v.created_at DESC
      LIMIT 5
    `);

    console.log(`   총 ${rentcarMgmtResult.rows.length}개 렌트카 벤더:`);
    rentcarMgmtResult.rows.forEach(vendor => {
      console.log(`   - [ID: ${vendor.id}] ${vendor.business_name}`);
      console.log(`     상태: ${vendor.status}`);
      console.log(`     차량 수: ${vendor.vehicle_count}개`);
    });

    // 5. 크로스 체크 - 상품관리 상품이 파트너 관리에 나타나는지 확인
    console.log('\n\n🔍 5. 크로스 체크: 상품관리 ↔ 파트너 관리');

    const crossCheck = await connection.execute(`
      SELECT
        l.id as listing_id,
        l.title,
        l.partner_id,
        p.business_name,
        p.status as partner_status,
        c.slug as category_slug
      FROM listings l
      LEFT JOIN partners p ON l.partner_id = p.id
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE c.slug NOT IN ('stay', 'rentcar')
      AND l.partner_id IS NOT NULL
      AND l.is_published = 1
    `);

    if (crossCheck.rows.length > 0) {
      console.log(`\n   ❌ 위반 발견! ${crossCheck.rows.length}개 상품이 파트너에 연결되어 있습니다:`);
      crossCheck.rows.forEach(item => {
        console.log(`   - [Listing ${item.listing_id}] ${item.title}`);
        console.log(`     partner_id: ${item.partner_id}`);
        console.log(`     partner: ${item.business_name || 'N/A'}`);
        console.log(`     category: ${item.category_slug}`);
      });
    } else {
      console.log('   ✅ 완벽! 상품관리 상품이 파트너 관리에 나타나지 않습니다.');
    }

    // 최종 결과
    console.log('\n\n=== 검증 결과 ===');
    console.log(`✅ 상품 관리: ${productMgmtResult.rows.length}개 상품 (partner_id NULL)`);
    console.log(`✅ 파트너 관리: ${partnerMgmtResult.rows.length}개 신청 (status=pending)`);
    console.log(`✅ 숙박 관리: ${accommodationMgmtResult.rows.length}개 파트너 (별도 시스템)`);
    console.log(`✅ 렌트카 관리: ${rentcarMgmtResult.rows.length}개 벤더 (별도 테이블)`);

    if (invalidProducts.length === 0 && crossCheck.rows.length === 0) {
      console.log('\n🎉 완벽한 분리! 벤더와 파트너가 완전히 분리되어 있습니다.\n');
    } else {
      console.log('\n⚠️  경고: 일부 위반 사항이 발견되었습니다. 위 내용을 확인하세요.\n');
    }

  } catch (error) {
    console.error('❌ 오류:', error);
  }

  console.log('=== 완료 ===\n');
}

verifyVendorPartnerSeparation();

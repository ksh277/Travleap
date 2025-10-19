const mysql = require('mysql2/promise');
require('dotenv').config();

async function testAllIssues() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || 'travleap',
      ssl: { rejectUnauthorized: true }
    });

    console.log('\n' + '='.repeat(80));
    console.log('🔍 Travleap 플랫폼 전체 문제점 검사');
    console.log('='.repeat(80));

    let issues = [];

    // 1. 카테고리 매핑 확인
    console.log('\n1️⃣  카테고리 시스템 검증:');
    console.log('-'.repeat(80));

    const [categories] = await connection.execute('SELECT * FROM categories');
    const categoryMap = {};
    categories.forEach(c => {
      categoryMap[c.id] = { slug: c.slug, name: c.name_ko || c.name };
    });

    console.log('카테고리 목록:');
    Object.entries(categoryMap).forEach(([id, info]) => {
      console.log(`   ID ${id}: ${info.name} (slug: ${info.slug})`);
    });

    // 2. listings의 category_id가 올바른지 확인
    console.log('\n2️⃣  Listings 카테고리 ID 검증:');
    console.log('-'.repeat(80));

    const [listingCategories] = await connection.execute(`
      SELECT l.category_id, COUNT(*) as count
      FROM listings l
      GROUP BY l.category_id
      ORDER BY l.category_id
    `);

    listingCategories.forEach(lc => {
      const catInfo = categoryMap[lc.category_id];
      if (catInfo) {
        console.log(`   ✅ Category ID ${lc.category_id} (${catInfo.name}/${catInfo.slug}): ${lc.count}개`);
      } else {
        console.log(`   ❌ Category ID ${lc.category_id}: ${lc.count}개 (카테고리 없음!)`);
        issues.push(`Listings with invalid category_id: ${lc.category_id}`);
      }
    });

    // 3. 이미지 JSON 형식 확인
    console.log('\n3️⃣  이미지 데이터 검증:');
    console.log('-'.repeat(80));

    const [imageTest] = await connection.execute(`
      SELECT id, title, images
      FROM listings
      WHERE category_id = 1857
      LIMIT 5
    `);

    imageTest.forEach(item => {
      try {
        let images = item.images;
        if (typeof images === 'string') {
          images = JSON.parse(images);
        }
        if (Array.isArray(images) && images.length > 0) {
          console.log(`   ✅ ${item.title}: ${images.length}개 이미지`);
        } else {
          console.log(`   ⚠️  ${item.title}: 이미지 없음`);
          issues.push(`No images for listing: ${item.title}`);
        }
      } catch (e) {
        console.log(`   ❌ ${item.title}: 잘못된 JSON 형식`);
        issues.push(`Invalid JSON for listing: ${item.title}`);
      }
    });

    // 4. 가격 데이터 확인
    console.log('\n4️⃣  가격 데이터 검증:');
    console.log('-'.repeat(80));

    const [priceCheck] = await connection.execute(`
      SELECT
        category_id,
        COUNT(*) as total,
        COUNT(CASE WHEN price_from IS NULL OR price_from = 0 THEN 1 END) as no_price
      FROM listings
      WHERE is_published = 1 AND is_active = 1
      GROUP BY category_id
    `);

    priceCheck.forEach(pc => {
      const catInfo = categoryMap[pc.category_id];
      if (pc.no_price > 0) {
        console.log(`   ⚠️  ${catInfo?.name || pc.category_id}: ${pc.no_price}/${pc.total}개 가격 미설정`);
        issues.push(`${pc.no_price} listings without price in category ${catInfo?.name}`);
      } else {
        console.log(`   ✅ ${catInfo?.name || pc.category_id}: 모든 가격 설정됨 (${pc.total}개)`);
      }
    });

    // 5. 활성 상태 확인
    console.log('\n5️⃣  활성/게시 상태 검증:');
    console.log('-'.repeat(80));

    const [statusCheck] = await connection.execute(`
      SELECT
        category_id,
        COUNT(*) as total,
        SUM(is_published) as published,
        SUM(is_active) as active
      FROM listings
      GROUP BY category_id
    `);

    statusCheck.forEach(sc => {
      const catInfo = categoryMap[sc.category_id];
      const inactive = sc.total - sc.active;
      const unpublished = sc.total - sc.published;

      if (inactive > 0 || unpublished > 0) {
        console.log(`   ⚠️  ${catInfo?.name || sc.category_id}: 비활성 ${inactive}개, 미게시 ${unpublished}개`);
      } else {
        console.log(`   ✅ ${catInfo?.name || sc.category_id}: 모두 활성/게시 (${sc.total}개)`);
      }
    });

    // 6. 렌트카 vehicles 테이블 확인
    console.log('\n6️⃣  렌트카 Vehicles 테이블 검증:');
    console.log('-'.repeat(80));

    const [vehicleCheck] = await connection.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN daily_rate_krw IS NULL OR daily_rate_krw = 0 THEN 1 ELSE 0 END) as no_price,
        SUM(CASE WHEN images IS NULL OR images = '[]' THEN 1 ELSE 0 END) as no_images
      FROM rentcar_vehicles
    `);

    const vc = vehicleCheck[0];
    console.log(`   총 차량: ${vc.total}대`);
    console.log(`   활성 차량: ${vc.active}대`);

    if (vc.no_price > 0) {
      console.log(`   ⚠️  가격 미설정: ${vc.no_price}대`);
      issues.push(`${vc.no_price} vehicles without price`);
    } else {
      console.log(`   ✅ 모든 차량 가격 설정됨`);
    }

    if (vc.no_images > 0) {
      console.log(`   ⚠️  이미지 없음: ${vc.no_images}대`);
      issues.push(`${vc.no_images} vehicles without images`);
    } else {
      console.log(`   ✅ 모든 차량 이미지 있음`);
    }

    // 7. 파트너 정보 확인
    console.log('\n7️⃣  파트너 정보 검증:');
    console.log('-'.repeat(80));

    const [partnerCheck] = await connection.execute(`
      SELECT
        l.category_id,
        COUNT(DISTINCT l.partner_id) as partner_count,
        COUNT(CASE WHEN p.id IS NULL THEN 1 END) as orphan_listings
      FROM listings l
      LEFT JOIN partners p ON l.partner_id = p.id
      GROUP BY l.category_id
    `);

    partnerCheck.forEach(pc => {
      const catInfo = categoryMap[pc.category_id];
      console.log(`   ${catInfo?.name || pc.category_id}: ${pc.partner_count}개 파트너`);
      if (pc.orphan_listings > 0) {
        console.log(`     ⚠️  파트너 없는 상품: ${pc.orphan_listings}개`);
        issues.push(`${pc.orphan_listings} orphan listings in ${catInfo?.name}`);
      }
    });

    // 8. PMS 데이터 확인
    console.log('\n8️⃣  PMS 연동 데이터 검증:');
    console.log('-'.repeat(80));

    // CloudBeds PMS 숙박
    const [pmsAccom] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM listings
      WHERE category_id = 1857
      AND partner_id = (SELECT id FROM partners ORDER BY id DESC LIMIT 1)
    `);

    if (pmsAccom[0].count > 0) {
      console.log(`   ✅ CloudBeds 숙박: ${pmsAccom[0].count}개 객실`);
    } else {
      console.log(`   ❌ CloudBeds 숙박 데이터 없음`);
      issues.push('No CloudBeds accommodation data');
    }

    // Turo PMS 렌트카
    const [pmsRentcar] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM rentcar_vehicles v
      LEFT JOIN rentcar_vendors vendor ON v.vendor_id = vendor.id
      WHERE vendor.vendor_code LIKE '%TURO%'
    `);

    if (pmsRentcar[0].count > 0) {
      console.log(`   ✅ Turo 렌트카: ${pmsRentcar[0].count}대`);
    } else {
      console.log(`   ❌ Turo 렌트카 데이터 없음`);
      issues.push('No Turo rentcar data');
    }

    // 9. 재고 수량 확인
    console.log('\n9️⃣  재고 수량 검증:');
    console.log('-'.repeat(80));

    const [stockCheck] = await connection.execute(`
      SELECT
        category_id,
        SUM(available_spots) as total_stock,
        COUNT(CASE WHEN available_spots IS NULL OR available_spots = 0 THEN 1 END) as no_stock
      FROM listings
      WHERE is_published = 1 AND is_active = 1
      GROUP BY category_id
    `);

    stockCheck.forEach(sc => {
      const catInfo = categoryMap[sc.category_id];
      if (sc.no_stock > 0) {
        console.log(`   ⚠️  ${catInfo?.name}: ${sc.no_stock}개 재고 0`);
      } else {
        console.log(`   ✅ ${catInfo?.name}: 총 ${sc.total_stock}개 재고`);
      }
    });

    // 최종 결과
    console.log('\n' + '='.repeat(80));
    if (issues.length === 0) {
      console.log('✅ 모든 검사 통과! 문제 없음');
    } else {
      console.log(`⚠️  발견된 문제: ${issues.length}개`);
      console.log('\n문제 목록:');
      issues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue}`);
      });
    }
    console.log('='.repeat(80));

    console.log('\n📝 다음 단계:');
    console.log('   1. npm run build 실행하여 빌드 확인');
    console.log('   2. 로컬에서 npm run dev로 테스트');
    console.log('   3. GitHub 푸시');
    console.log('   4. Vercel 자동 배포 확인');
    console.log('   5. https://travleap.vercel.app에서 직접 테스트');
    console.log('');

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error);
  } finally {
    if (connection) await connection.end();
  }
}

testAllIssues();

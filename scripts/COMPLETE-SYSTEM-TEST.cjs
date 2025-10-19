/**
 * 🧪 전체 시스템 동작 확인 테스트
 *
 * 확인 항목:
 * 1. 배너 API
 * 2. 숙박 업체 카드 표시
 * 3. 렌트카 업체 카드 표시
 * 4. 숙박 상세페이지 (Partner ID 144)
 * 5. 렌트카 상세페이지 (Vendor ID 9)
 * 6. 테스트 계정 정보
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

console.log('\n' + '='.repeat(80));
console.log('🧪 TRAVLEAP 전체 시스템 동작 확인');
console.log('='.repeat(80));

async function testCompleteSystem() {
  const conn = connect({ url: process.env.DATABASE_URL });

  let allTestsPassed = true;
  const failedTests = [];

  try {
    // ========== 1. 배너 테스트 ==========
    console.log('\n1️⃣  배너 시스템 테스트');
    console.log('-'.repeat(80));

    const bannersResult = await conn.execute(`
      SELECT id, title, image_url, is_active
      FROM home_banners
      WHERE is_active = TRUE
      ORDER BY display_order ASC
    `);

    if (bannersResult.rows.length > 0) {
      console.log(`✅ 배너 ${bannersResult.rows.length}개 활성화됨`);
      bannersResult.rows.forEach((banner, idx) => {
        console.log(`   ${idx + 1}. ${banner.title}`);
      });
    } else {
      console.log('❌ 활성화된 배너가 없습니다!');
      allTestsPassed = false;
      failedTests.push('배너 없음');
    }

    // ========== 2. 숙박 업체 카드 테스트 ==========
    console.log('\n2️⃣  숙박 업체 카드 표시 테스트 (/category/stay)');
    console.log('-'.repeat(80));

    const accommodationsResult = await conn.execute(`
      SELECT
        p.id as partner_id,
        p.business_name,
        COUNT(l.id) as room_count,
        MIN(l.price_from) as min_price,
        MAX(l.price_from) as max_price,
        AVG(l.rating_avg) as avg_rating,
        SUM(l.rating_count) as total_reviews
      FROM partners p
      LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = 1857 AND l.is_published = 1 AND l.is_active = 1
      WHERE p.is_active = 1
      GROUP BY p.id, p.business_name
      HAVING room_count > 0
      ORDER BY p.is_verified DESC, avg_rating DESC
    `);

    if (accommodationsResult.rows.length > 0) {
      console.log(`✅ 숙박 업체 ${accommodationsResult.rows.length}개 표시됨\n`);
      accommodationsResult.rows.forEach((hotel, idx) => {
        console.log(`   ${idx + 1}. ${hotel.business_name}`);
        console.log(`      - Partner ID: ${hotel.partner_id}`);
        console.log(`      - 객실: ${hotel.room_count}개`);
        console.log(`      - 가격: ₩${hotel.min_price?.toLocaleString()} ~ ₩${hotel.max_price?.toLocaleString()}`);
        console.log(`      - 평점: ${hotel.avg_rating ? Number(hotel.avg_rating).toFixed(1) : 'N/A'} (${hotel.total_reviews || 0}개 리뷰)`);
        console.log('');
      });
    } else {
      console.log('❌ 표시할 숙박 업체가 없습니다!');
      allTestsPassed = false;
      failedTests.push('숙박 업체 카드 없음');
    }

    // ========== 3. 렌트카 업체 카드 테스트 ==========
    console.log('\n3️⃣  렌트카 업체 카드 표시 테스트 (/category/rentcar)');
    console.log('-'.repeat(80));

    const rentcarsResult = await conn.execute(`
      SELECT
        v.id as vendor_id,
        v.business_name,
        v.brand_name,
        v.average_rating,
        COUNT(rv.id) as vehicle_count,
        MIN(rv.daily_rate_krw) as min_price,
        MAX(rv.daily_rate_krw) as max_price
      FROM rentcar_vendors v
      LEFT JOIN rentcar_vehicles rv ON v.id = rv.vendor_id AND rv.is_active = 1
      WHERE v.status = 'active'
      GROUP BY v.id, v.business_name, v.brand_name, v.average_rating
      ORDER BY v.is_verified DESC, v.business_name ASC
    `);

    if (rentcarsResult.rows.length > 0) {
      console.log(`✅ 렌트카 업체 ${rentcarsResult.rows.length}개 표시됨\n`);
      rentcarsResult.rows.forEach((vendor, idx) => {
        console.log(`   ${idx + 1}. ${vendor.business_name || vendor.brand_name}`);
        console.log(`      - Vendor ID: ${vendor.vendor_id}`);
        console.log(`      - 차량: ${vendor.vehicle_count}대`);
        console.log(`      - 가격: ₩${vendor.min_price?.toLocaleString()} ~ ₩${vendor.max_price?.toLocaleString()}/일`);
        console.log(`      - 평점: ${vendor.average_rating ? Number(vendor.average_rating).toFixed(1) : 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('❌ 표시할 렌트카 업체가 없습니다!');
      allTestsPassed = false;
      failedTests.push('렌트카 업체 카드 없음');
    }

    // ========== 4. 숙박 상세페이지 테스트 (Partner 144) ==========
    console.log('\n4️⃣  숙박 상세페이지 테스트 (/accommodation/144)');
    console.log('-'.repeat(80));

    const partnerDetailResult = await conn.execute(`
      SELECT * FROM partners WHERE id = 144 LIMIT 1
    `);

    if (partnerDetailResult.rows.length > 0) {
      const partner = partnerDetailResult.rows[0];
      console.log(`✅ 파트너 정보: ${partner.business_name}`);
      console.log(`   - 담당자: ${partner.contact_name}`);
      console.log(`   - 이메일: ${partner.email}`);
      console.log(`   - 전화: ${partner.phone}`);

      // 객실 조회
      const roomsResult = await conn.execute(`
        SELECT
          id,
          title,
          short_description,
          price_from,
          price_to,
          images,
          amenities,
          available_spots,
          rating_avg,
          rating_count,
          is_active,
          is_published
        FROM listings
        WHERE partner_id = 144 AND category_id = 1857
        ORDER BY price_from ASC
      `);

      console.log(`\n   📋 객실 목록: ${roomsResult.rows.length}개\n`);
      roomsResult.rows.forEach((room, idx) => {
        console.log(`      ${idx + 1}. ${room.title}`);
        console.log(`         - 설명: ${room.short_description || 'N/A'}`);
        console.log(`         - 가격: ₩${room.price_from?.toLocaleString()} ~ ₩${room.price_to?.toLocaleString()}`);
        console.log(`         - 인원: ${room.available_spots}명`);
        console.log(`         - 평점: ${room.rating_avg || 0} (${room.rating_count || 0}개)`);
        console.log(`         - 상태: ${room.is_published ? '공개' : '비공개'} / ${room.is_active ? '활성' : '비활성'}`);
        console.log('');
      });

      if (roomsResult.rows.length === 0) {
        console.log('⚠️  객실이 없습니다!');
        failedTests.push('Partner 144 객실 없음');
      }
    } else {
      console.log('❌ Partner ID 144를 찾을 수 없습니다!');
      allTestsPassed = false;
      failedTests.push('Partner 144 없음');
    }

    // ========== 5. 렌트카 상세페이지 테스트 (Vendor 9) ==========
    console.log('\n5️⃣  렌트카 상세페이지 테스트 (/rentcar/9)');
    console.log('-'.repeat(80));

    const vendorDetailResult = await conn.execute(`
      SELECT * FROM rentcar_vendors WHERE id = 9 LIMIT 1
    `);

    if (vendorDetailResult.rows.length > 0) {
      const vendor = vendorDetailResult.rows[0];
      console.log(`✅ 벤더 정보: ${vendor.business_name || vendor.brand_name}`);
      console.log(`   - 벤더 코드: ${vendor.vendor_code}`);
      console.log(`   - 평점: ${vendor.average_rating || 'N/A'}`);

      // 차량 조회
      const vehiclesResult = await conn.execute(`
        SELECT
          id,
          vehicle_code,
          display_name,
          vehicle_class,
          seating_capacity,
          transmission,
          fuel_type,
          daily_rate_krw,
          images,
          is_active
        FROM rentcar_vehicles
        WHERE vendor_id = 9
        ORDER BY daily_rate_krw ASC
      `);

      console.log(`\n   🚗 차량 목록: ${vehiclesResult.rows.length}대\n`);
      vehiclesResult.rows.forEach((vehicle, idx) => {
        console.log(`      ${idx + 1}. ${vehicle.display_name}`);
        console.log(`         - 등급: ${vehicle.vehicle_class}`);
        console.log(`         - 인승: ${vehicle.seating_capacity}명`);
        console.log(`         - 변속기: ${vehicle.transmission} / 연료: ${vehicle.fuel_type}`);
        console.log(`         - 가격: ₩${vehicle.daily_rate_krw?.toLocaleString()}/일`);
        console.log(`         - 상태: ${vehicle.is_active ? '예약 가능' : '예약 불가'}`);
        console.log('');
      });

      if (vehiclesResult.rows.length === 0) {
        console.log('⚠️  차량이 없습니다!');
        failedTests.push('Vendor 9 차량 없음');
      }
    } else {
      console.log('❌ Vendor ID 9를 찾을 수 없습니다!');
      allTestsPassed = false;
      failedTests.push('Vendor 9 없음');
    }

    // ========== 6. 테스트 계정 확인 ==========
    console.log('\n6️⃣  테스트 계정 확인');
    console.log('-'.repeat(80));

    // 숙박 파트너 계정
    const lodgingUserResult = await conn.execute(`
      SELECT id, user_id, email, name, role FROM users WHERE email = 'lodging@test.com' LIMIT 1
    `);

    if (lodgingUserResult.rows.length > 0) {
      const user = lodgingUserResult.rows[0];
      console.log('✅ 숙박 파트너 계정:');
      console.log(`   📧 이메일: lodging@test.com`);
      console.log(`   🔑 비밀번호: test1234`);
      console.log(`   🆔 User ID: ${user.id}`);
      console.log(`   👤 User Code: ${user.user_id}`);
      console.log(`   👔 Role: ${user.role}`);
    } else {
      console.log('❌ lodging@test.com 계정이 없습니다!');
      allTestsPassed = false;
      failedTests.push('숙박 테스트 계정 없음');
    }

    // 렌트카 벤더 계정
    const rentcarUserResult = await conn.execute(`
      SELECT id, user_id, email, name, role FROM users WHERE email = 'rentcar@test.com' LIMIT 1
    `);

    if (rentcarUserResult.rows.length > 0) {
      const user = rentcarUserResult.rows[0];
      console.log('\n✅ 렌트카 벤더 계정:');
      console.log(`   📧 이메일: rentcar@test.com`);
      console.log(`   🔑 비밀번호: test1234`);
      console.log(`   🆔 User ID: ${user.id}`);
      console.log(`   👤 User Code: ${user.user_id}`);
      console.log(`   👔 Role: ${user.role}`);
    } else {
      console.log('❌ rentcar@test.com 계정이 없습니다!');
      allTestsPassed = false;
      failedTests.push('렌트카 테스트 계정 없음');
    }

    // ========== 7. 메인페이지 주변 숙소 테스트 ==========
    console.log('\n7️⃣  메인페이지 "주변 숙소" 표시 테스트');
    console.log('-'.repeat(80));

    const nearbyHotelsResult = await conn.execute(`
      SELECT
        p.id as partner_id,
        p.business_name,
        COUNT(l.id) as room_count,
        MIN(l.price_from) as min_price
      FROM partners p
      LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = 1857 AND l.is_published = 1 AND l.is_active = 1
      WHERE p.is_active = 1
      GROUP BY p.id, p.business_name
      HAVING room_count > 0
      ORDER BY p.is_featured DESC, p.is_verified DESC
      LIMIT 6
    `);

    if (nearbyHotelsResult.rows.length > 0) {
      console.log(`✅ 메인페이지에 표시될 숙소 ${nearbyHotelsResult.rows.length}개\n`);
      nearbyHotelsResult.rows.forEach((hotel, idx) => {
        console.log(`   ${idx + 1}. ${hotel.business_name}`);
        console.log(`      - 객실: ${hotel.room_count}개`);
        console.log(`      - 최저가: ₩${hotel.min_price?.toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('⚠️  메인페이지에 표시할 숙소가 없습니다!');
      failedTests.push('메인페이지 숙소 없음');
    }

    // ========== 최종 요약 ==========
    console.log('\n' + '='.repeat(80));
    console.log('📊 테스트 결과 요약');
    console.log('='.repeat(80));

    if (allTestsPassed && failedTests.length === 0) {
      console.log('\n🎉 모든 테스트 통과! 시스템이 정상 작동합니다!\n');

      console.log('✅ 확인된 기능:');
      console.log('   1. ✅ 배너 시스템');
      console.log('   2. ✅ 숙박 업체 카드 표시');
      console.log('   3. ✅ 렌트카 업체 카드 표시');
      console.log('   4. ✅ 숙박 상세페이지');
      console.log('   5. ✅ 렌트카 상세페이지');
      console.log('   6. ✅ 테스트 계정');
      console.log('   7. ✅ 메인페이지 주변 숙소');

      console.log('\n🚀 이제 다음을 테스트하세요:');
      console.log('   1. npm run dev로 서버 실행');
      console.log('   2. 메인페이지 접속 → 배너 확인');
      console.log('   3. "주변 숙소" 섹션 확인');
      console.log('   4. /category/stay → 숙박 카드 확인');
      console.log('   5. /category/rentcar → 렌트카 카드 확인');
      console.log('   6. 숙박 업체 클릭 → 상세페이지 확인');
      console.log('   7. 렌트카 업체 클릭 → 상세페이지 확인');
      console.log('   8. lodging@test.com 로그인 → 파트너 대시보드');
      console.log('   9. rentcar@test.com 로그인 → 벤더 대시보드');
      console.log('   10. 새로고침 → JWT 세션 유지 확인');

    } else {
      console.log('\n⚠️  일부 테스트 실패!\n');
      console.log('실패한 항목:');
      failedTests.forEach((test, idx) => {
        console.log(`   ${idx + 1}. ❌ ${test}`);
      });

      console.log('\n💡 해결 방법:');
      console.log('   - scripts/create-test-vendors.cjs를 다시 실행하세요.');
      console.log('   - 데이터베이스 연결을 확인하세요.');
    }

    console.log('\n');

  } catch (error) {
    console.error('\n❌ 테스트 중 오류 발생:', error);
    console.error('   Message:', error.message);
  }
}

testCompleteSystem();

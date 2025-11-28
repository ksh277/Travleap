/**
 * 쿠폰 시스템 테스트 데이터 생성
 * - 테스트 쿠폰 캠페인 1개
 * - 쿠폰 ON 테스트 가맹점 3개
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function main() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('🚀 쿠폰 테스트 데이터 생성 시작...\n');

  try {
    // 1. 테스트 쿠폰 캠페인 생성
    console.log('📋 1. 테스트 쿠폰 캠페인 생성...');

    // 기존 테스트 쿠폰 확인
    const existingCoupon = await connection.execute(
      `SELECT id FROM coupons WHERE code = 'TESTCOUPON2024' LIMIT 1`
    );

    let couponId;
    if (existingCoupon.rows && existingCoupon.rows.length > 0) {
      couponId = existingCoupon.rows[0].id;
      console.log(`   ✅ 기존 테스트 쿠폰 발견 (ID: ${couponId})`);
    } else {
      // 새 쿠폰 생성 (기존 스키마에 맞춤)
      const couponResult = await connection.execute(`
        INSERT INTO coupons (
          code,
          title,
          name,
          description,
          discount_type,
          discount_value,
          max_discount,
          max_discount_amount,
          min_amount,
          usage_limit,
          usage_per_user,
          current_usage,
          target_type,
          valid_from,
          valid_until,
          is_active,
          created_at
        ) VALUES (
          'TESTCOUPON2024',
          '신안 가맹점 할인 쿠폰',
          '신안 가맹점 할인 쿠폰',
          '쿠폰 ON 가맹점에서 사용 가능한 10% 할인 쿠폰',
          'percentage',
          10,
          5000,
          5000,
          10000,
          1000,
          1,
          0,
          'ALL',
          NOW(),
          DATE_ADD(NOW(), INTERVAL 1 YEAR),
          1,
          NOW()
        )
      `);
      couponId = couponResult.insertId;
      console.log(`   ✅ 새 쿠폰 생성 완료 (ID: ${couponId})`);
    }

    console.log(`   쿠폰 코드: TESTCOUPON2024`);
    console.log(`   할인: 10% (최대 5,000원)\n`);

    // 2. 기존 가맹점 쿠폰 OFF 확인
    console.log('📋 2. 기존 가맹점 쿠폰 상태 확인...');
    const existingPartners = await connection.execute(
      `SELECT id, business_name, is_coupon_partner FROM partners WHERE status = 'approved'`
    );

    if (existingPartners.rows && existingPartners.rows.length > 0) {
      const couponOnCount = existingPartners.rows.filter(p => p.is_coupon_partner === 1).length;
      console.log(`   총 ${existingPartners.rows.length}개 가맹점 중 ${couponOnCount}개 쿠폰 ON 상태`);

      // 모든 기존 가맹점 쿠폰 OFF로 설정
      await connection.execute(
        `UPDATE partners SET is_coupon_partner = 0 WHERE is_coupon_partner = 1`
      );
      console.log(`   ✅ 기존 가맹점 모두 쿠폰 OFF 처리 완료\n`);
    }

    // 3. 테스트 가맹점 3개 생성 (쿠폰 ON)
    console.log('📋 3. 테스트 가맹점 생성 (쿠폰 ON)...');

    const testPartners = [
      {
        business_name: '[테스트] 신안 맛집',
        services: '음식',
        location: '전남 신안군',
        description: '쿠폰 테스트용 음식점 - 10% 할인',
        discount_type: 'percent',
        discount_value: 10,
        max_discount: 5000
      },
      {
        business_name: '[테스트] 증도 펜션',
        services: '숙박',
        location: '전남 신안군 증도면',
        description: '쿠폰 테스트용 숙박업소 - 3000원 할인',
        discount_type: 'fixed',
        discount_value: 3000,
        max_discount: 3000
      },
      {
        business_name: '[테스트] 신안 투어',
        services: '체험',
        location: '전남 신안군',
        description: '쿠폰 테스트용 체험업소 - 15% 할인',
        discount_type: 'percent',
        discount_value: 15,
        max_discount: 10000
      }
    ];

    for (const partner of testPartners) {
      // 기존 테스트 가맹점 확인
      const existing = await connection.execute(
        `SELECT id FROM partners WHERE business_name = ? LIMIT 1`,
        [partner.business_name]
      );

      if (existing.rows && existing.rows.length > 0) {
        // 업데이트
        await connection.execute(`
          UPDATE partners SET
            is_coupon_partner = 1,
            coupon_discount_type = ?,
            coupon_discount_value = ?,
            coupon_max_discount = ?,
            status = 'approved'
          WHERE id = ?
        `, [
          partner.discount_type,
          partner.discount_value,
          partner.max_discount,
          existing.rows[0].id
        ]);
        console.log(`   ✅ ${partner.business_name} 업데이트 완료`);
      } else {
        // 새로 생성
        await connection.execute(`
          INSERT INTO partners (
            business_name,
            contact_name,
            services,
            location,
            description,
            email,
            phone,
            status,
            is_coupon_partner,
            coupon_discount_type,
            coupon_discount_value,
            coupon_max_discount,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', 1, ?, ?, ?, NOW())
        `, [
          partner.business_name,
          '테스트 담당자',
          partner.services,
          partner.location,
          partner.description,
          'test@example.com',
          '010-0000-0000',
          partner.discount_type,
          partner.discount_value,
          partner.max_discount
        ]);
        console.log(`   ✅ ${partner.business_name} 생성 완료`);
      }

      // 할인 정보 출력
      const discountInfo = partner.discount_type === 'percent'
        ? `${partner.discount_value}% (최대 ${partner.max_discount.toLocaleString()}원)`
        : `${partner.discount_value.toLocaleString()}원`;
      console.log(`      - 할인: ${discountInfo}`);
    }

    console.log('\n✅ 모든 테스트 데이터 생성 완료!\n');

    // 결과 확인
    console.log('📊 결과 확인:');
    const finalCheck = await connection.execute(`
      SELECT id, business_name, services, is_coupon_partner,
             coupon_discount_type, coupon_discount_value, coupon_max_discount
      FROM partners
      WHERE is_coupon_partner = 1
    `);

    console.log(`   쿠폰 ON 가맹점: ${finalCheck.rows?.length || 0}개`);
    finalCheck.rows?.forEach(p => {
      const discountText = p.coupon_discount_type === 'PERCENT'
        ? `${p.coupon_discount_value}%`
        : `${p.coupon_discount_value}원`;
      console.log(`   - ${p.business_name} (${p.services}): ${discountText}`);
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

main();

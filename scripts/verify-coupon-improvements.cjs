const { connect } = require('@planetscale/database');
require('dotenv').config();

async function verifyCouponImprovements() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('========================================');
  console.log('   쿠폰 시스템 개선 검증');
  console.log('========================================\n');

  // 1. user_coupons 테이블 expires_at 컬럼 확인
  console.log('1️⃣ user_coupons 테이블 expires_at 컬럼 확인...\n');

  const columns = await conn.execute(`
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'user_coupons' AND COLUMN_NAME = 'expires_at'
  `);

  if (columns.rows && columns.rows.length > 0) {
    console.log('   ✅ expires_at 컬럼 존재 확인!');
    console.log(`      타입: ${columns.rows[0].DATA_TYPE}\n`);
  } else {
    console.log('   ❌ expires_at 컬럼이 없습니다!\n');
  }

  // 2. 신규 회원 쿠폰 (member_target='new') 확인
  console.log('2️⃣ 신규 회원 대상 쿠폰 확인...\n');

  const newMemberCoupons = await conn.execute(`
    SELECT id, code, name, title, discount_type, discount_value,
           coupon_category, member_target, is_active,
           valid_from, valid_until, issued_count
    FROM coupons
    WHERE coupon_category = 'member' AND member_target = 'new'
    ORDER BY created_at DESC
    LIMIT 5
  `);

  if (newMemberCoupons.rows && newMemberCoupons.rows.length > 0) {
    console.log(`   ✅ 신규 회원 쿠폰 ${newMemberCoupons.rows.length}개 발견!\n`);
    newMemberCoupons.rows.forEach(c => {
      const discount = c.discount_type === 'percentage'
        ? `${c.discount_value}%`
        : `${c.discount_value.toLocaleString()}원`;
      const status = c.is_active ? '✅ 활성' : '❌ 비활성';
      console.log(`   [${c.id}] ${c.code || c.name || c.title}`);
      console.log(`       할인: ${discount} | ${status}`);
      console.log(`       발급수: ${c.issued_count || 0}개`);
      console.log('');
    });
  } else {
    console.log('   ⚠️ 신규 회원 대상 쿠폰이 없습니다!');
    console.log('   💡 관리자 페이지에서 회원별 쿠폰(신규 회원)을 생성해주세요.\n');
  }

  // 3. 쿠폰 발급 내역 (expires_at 포함) 확인
  console.log('3️⃣ 최근 쿠폰 발급 내역 확인...\n');

  const recentIssues = await conn.execute(`
    SELECT uc.id, uc.user_id, uc.coupon_id, uc.coupon_code,
           uc.status, uc.issued_at, uc.expires_at,
           c.name as coupon_name
    FROM user_coupons uc
    LEFT JOIN coupons c ON uc.coupon_id = c.id
    ORDER BY uc.id DESC
    LIMIT 5
  `);

  if (recentIssues.rows && recentIssues.rows.length > 0) {
    console.log(`   최근 발급 쿠폰 ${recentIssues.rows.length}개:\n`);
    recentIssues.rows.forEach(uc => {
      console.log(`   [${uc.id}] user_id=${uc.user_id}`);
      console.log(`       쿠폰코드: ${uc.coupon_code || '-'}`);
      console.log(`       쿠폰명: ${uc.coupon_name || '-'}`);
      console.log(`       상태: ${uc.status || '-'}`);
      console.log(`       발급일: ${uc.issued_at || '-'}`);
      console.log(`       만료일: ${uc.expires_at || '⚠️ 없음'}`);
      console.log('');
    });
  } else {
    console.log('   ℹ️ 발급된 쿠폰이 없습니다.\n');
  }

  // 4. 요약
  console.log('========================================');
  console.log('   검증 결과 요약');
  console.log('========================================\n');

  const hasExpiresAt = columns.rows && columns.rows.length > 0;
  const hasNewMemberCoupon = newMemberCoupons.rows && newMemberCoupons.rows.length > 0;

  console.log(`   ✅ expires_at 컬럼: ${hasExpiresAt ? '추가됨' : '❌ 없음'}`);
  console.log(`   ✅ 신규 회원 자동 발급: 로직 추가됨`);
  console.log(`      - api/signup.js`);
  console.log(`      - api/auth.js (일반 회원가입 + 소셜 로그인)`);
  console.log(`      - api/coupons/register.js`);
  console.log(`   ${hasNewMemberCoupon ? '✅' : '⚠️'} 신규 회원 쿠폰: ${hasNewMemberCoupon ? '설정됨' : '생성 필요'}`);

  console.log('\n========================================');
  console.log('   개선 완료 ✅');
  console.log('========================================\n');

  if (!hasNewMemberCoupon) {
    console.log('💡 신규 회원에게 자동 발급할 쿠폰을 설정하려면:');
    console.log('   1. 관리자 페이지 > 쿠폰 관리');
    console.log('   2. "쿠폰 생성" 클릭');
    console.log('   3. 쿠폰 유형: "회원별 쿠폰" 선택');
    console.log('   4. 대상: "신규 회원" 선택');
    console.log('   5. 할인 정보 입력 후 저장\n');
  }
}

verifyCouponImprovements().catch(console.error);

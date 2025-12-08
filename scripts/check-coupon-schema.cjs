const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkCouponSchema() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('========================================');
  console.log('   쿠폰 시스템 스키마 검증');
  console.log('========================================\n');

  const tables = ['coupons', 'user_coupons', 'coupon_usage', 'user_coupon_usage', 'coupon_master', 'integrated_coupon_usage'];

  for (const table of tables) {
    console.log(`\n📋 ${table} 테이블:`);
    console.log('─'.repeat(50));

    try {
      const columns = await conn.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `, [table]);

      if (columns.rows && columns.rows.length > 0) {
        columns.rows.forEach(c => {
          const key = c.COLUMN_KEY ? ` [${c.COLUMN_KEY}]` : '';
          const nullable = c.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultVal = c.COLUMN_DEFAULT ? ` DEFAULT ${c.COLUMN_DEFAULT}` : '';
          console.log(`   ${c.COLUMN_NAME.padEnd(25)} ${c.DATA_TYPE.padEnd(12)} ${nullable}${key}${defaultVal}`);
        });
        console.log(`   총 ${columns.rows.length}개 컬럼`);
      } else {
        console.log(`   ⚠️ 테이블 없음 또는 접근 불가`);
      }
    } catch (err) {
      console.log(`   ❌ 오류: ${err.message}`);
    }
  }

  // 쿠폰 데이터 통계
  console.log('\n\n📊 쿠폰 데이터 통계:');
  console.log('─'.repeat(50));

  try {
    // coupons 테이블 통계
    const couponsStats = await conn.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN coupon_category = 'product' THEN 1 ELSE 0 END) as product,
        SUM(CASE WHEN coupon_category = 'member' THEN 1 ELSE 0 END) as member,
        SUM(CASE WHEN coupon_category = 'couponbook' THEN 1 ELSE 0 END) as couponbook
      FROM coupons
    `);

    if (couponsStats.rows && couponsStats.rows.length > 0) {
      const s = couponsStats.rows[0];
      console.log(`   coupons: 총 ${s.total}개 (활성: ${s.active})`);
      console.log(`     - product: ${s.product}개`);
      console.log(`     - member: ${s.member}개`);
      console.log(`     - couponbook: ${s.couponbook}개`);
    }

    // user_coupons 테이블 통계
    const userCouponsStats = await conn.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'ISSUED' THEN 1 ELSE 0 END) as issued,
        SUM(CASE WHEN status = 'USED' THEN 1 ELSE 0 END) as used,
        SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN expires_at IS NOT NULL THEN 1 ELSE 0 END) as has_expires_at
      FROM user_coupons
    `);

    if (userCouponsStats.rows && userCouponsStats.rows.length > 0) {
      const s = userCouponsStats.rows[0];
      console.log(`   user_coupons: 총 ${s.total}개`);
      console.log(`     - ISSUED: ${s.issued}개`);
      console.log(`     - USED: ${s.used}개`);
      console.log(`     - EXPIRED: ${s.expired}개`);
      console.log(`     - expires_at 있는 것: ${s.has_expires_at}개`);
    }

    // coupon_master 테이블 (연동 쿠폰)
    const couponMasterStats = await conn.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active
      FROM coupon_master
    `);

    if (couponMasterStats.rows && couponMasterStats.rows.length > 0) {
      const s = couponMasterStats.rows[0];
      console.log(`   coupon_master (연동): 총 ${s.total}개 (활성: ${s.active})`);
    }
  } catch (err) {
    console.log(`   ❌ 통계 조회 오류: ${err.message}`);
  }

  // 문제점 체크
  console.log('\n\n🔍 잠재적 문제점 체크:');
  console.log('─'.repeat(50));

  // 1. expires_at 없는 user_coupons
  try {
    const noExpires = await conn.execute(`
      SELECT COUNT(*) as count FROM user_coupons WHERE expires_at IS NULL AND status = 'ISSUED'
    `);
    const count = noExpires.rows?.[0]?.count || 0;
    if (count > 0) {
      console.log(`   ⚠️ expires_at 없는 ISSUED 쿠폰: ${count}개`);
    } else {
      console.log(`   ✅ 모든 ISSUED 쿠폰에 expires_at 있음`);
    }
  } catch (e) {
    console.log(`   ℹ️ expires_at 체크 불가: ${e.message}`);
  }

  // 2. 만료되었지만 ISSUED 상태인 쿠폰
  try {
    const expiredButIssued = await conn.execute(`
      SELECT COUNT(*) as count FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.status = 'ISSUED' AND c.valid_until < NOW()
    `);
    const count = expiredButIssued.rows?.[0]?.count || 0;
    if (count > 0) {
      console.log(`   ⚠️ 만료되었지만 ISSUED 상태인 쿠폰: ${count}개`);
    } else {
      console.log(`   ✅ 만료된 쿠폰 상태 정상`);
    }
  } catch (e) {
    console.log(`   ℹ️ 만료 체크 불가: ${e.message}`);
  }

  // 3. 신규 회원 쿠폰 확인
  try {
    const newMemberCoupons = await conn.execute(`
      SELECT id, code, name, is_active FROM coupons
      WHERE coupon_category = 'member' AND member_target = 'new' AND is_active = TRUE
    `);
    if (newMemberCoupons.rows && newMemberCoupons.rows.length > 0) {
      console.log(`   ✅ 신규 회원 쿠폰 설정됨: ${newMemberCoupons.rows.length}개`);
      newMemberCoupons.rows.forEach(c => {
        console.log(`      - [${c.id}] ${c.code || c.name}`);
      });
    } else {
      console.log(`   ⚠️ 활성화된 신규 회원 쿠폰 없음`);
    }
  } catch (e) {
    console.log(`   ℹ️ 신규 회원 쿠폰 체크 불가: ${e.message}`);
  }

  console.log('\n========================================');
  console.log('   검증 완료');
  console.log('========================================\n');
}

checkCouponSchema().catch(console.error);

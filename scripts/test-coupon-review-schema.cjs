/**
 * 쿠폰/리뷰 시스템 DB 스키마 검증 스크립트
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

async function testSchema() {
  console.log('🔍 DB 스키마 검증 시작...\n');

  const connection = connect({ url: process.env.DATABASE_URL });
  const poolNeon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL });

  const results = {
    passed: [],
    failed: []
  };

  try {
    // 1. user_coupons 테이블 컬럼 확인
    console.log('📋 1. user_coupons 테이블 검사...');
    const ucColumns = await connection.execute(`DESCRIBE user_coupons`);
    const ucColumnNames = ucColumns.rows.map(r => r.Field);

    const requiredUcColumns = [
      'id', 'user_id', 'coupon_id', 'coupon_code', 'status',
      'used_at', 'used_partner_id', 'order_amount', 'discount_amount', 'final_amount',
      'review_submitted', 'review_points_awarded'
    ];

    for (const col of requiredUcColumns) {
      if (ucColumnNames.includes(col)) {
        results.passed.push(`user_coupons.${col}`);
      } else {
        results.failed.push(`user_coupons.${col} (NOT FOUND)`);
      }
    }
    console.log(`   ✅ 존재하는 컬럼: ${ucColumnNames.join(', ')}\n`);

    // 2. coupon_reviews 테이블 존재 확인
    console.log('📋 2. coupon_reviews 테이블 검사...');
    try {
      const crColumns = await connection.execute(`DESCRIBE coupon_reviews`);
      const crColumnNames = crColumns.rows.map(r => r.Field);

      const requiredCrColumns = [
        'id', 'user_coupon_id', 'user_id', 'partner_id', 'rating', 'comment', 'points_awarded'
      ];

      for (const col of requiredCrColumns) {
        if (crColumnNames.includes(col)) {
          results.passed.push(`coupon_reviews.${col}`);
        } else {
          results.failed.push(`coupon_reviews.${col} (NOT FOUND)`);
        }
      }
      console.log(`   ✅ 존재하는 컬럼: ${crColumnNames.join(', ')}\n`);
    } catch (err) {
      results.failed.push('coupon_reviews 테이블 (NOT EXISTS)');
      console.log(`   ❌ coupon_reviews 테이블이 존재하지 않습니다\n`);
    }

    // 3. partners 테이블 쿠폰 필드 확인
    console.log('📋 3. partners 테이블 쿠폰 필드 검사...');
    const pColumns = await connection.execute(`DESCRIBE partners`);
    const pColumnNames = pColumns.rows.map(r => r.Field);

    const requiredPColumns = [
      'is_coupon_partner', 'coupon_discount_type', 'coupon_discount_value', 'coupon_max_discount'
    ];

    for (const col of requiredPColumns) {
      if (pColumnNames.includes(col)) {
        results.passed.push(`partners.${col}`);
      } else {
        results.failed.push(`partners.${col} (NOT FOUND)`);
      }
    }
    console.log(`   쿠폰 관련 컬럼: ${requiredPColumns.filter(c => pColumnNames.includes(c)).join(', ') || 'NONE'}\n`);

    // 4. coupons 테이블 확인
    console.log('📋 4. coupons 테이블 검사...');
    const cColumns = await connection.execute(`DESCRIBE coupons`);
    const cColumnNames = cColumns.rows.map(r => r.Field);

    const requiredCColumns = [
      'id', 'name', 'description', 'discount_type', 'discount_value', 'max_discount',
      'target_type', 'target_categories', 'target_partner_ids', 'is_active'
    ];

    for (const col of requiredCColumns) {
      if (cColumnNames.includes(col)) {
        results.passed.push(`coupons.${col}`);
      } else {
        results.failed.push(`coupons.${col} (NOT FOUND)`);
      }
    }
    console.log(`   ✅ 존재하는 컬럼: ${cColumnNames.join(', ')}\n`);

    // 5. user_points 테이블 확인
    console.log('📋 5. user_points 테이블 검사...');
    try {
      const upColumns = await connection.execute(`DESCRIBE user_points`);
      const upColumnNames = upColumns.rows.map(r => r.Field);

      const requiredUpColumns = [
        'id', 'user_id', 'points', 'point_type', 'reason', 'related_order_id', 'balance_after'
      ];

      for (const col of requiredUpColumns) {
        if (upColumnNames.includes(col)) {
          results.passed.push(`user_points.${col}`);
        } else {
          results.failed.push(`user_points.${col} (NOT FOUND)`);
        }
      }
      console.log(`   ✅ 존재하는 컬럼: ${upColumnNames.join(', ')}\n`);
    } catch (err) {
      results.failed.push('user_points 테이블 (NOT EXISTS)');
      console.log(`   ❌ user_points 테이블이 존재하지 않습니다\n`);
    }

    // 6. Neon users 테이블 total_points 확인
    console.log('📋 6. Neon users 테이블 total_points 검사...');
    try {
      const neonResult = await poolNeon.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'total_points'
      `);

      if (neonResult.rows.length > 0) {
        results.passed.push('Neon users.total_points');
        console.log('   ✅ total_points 컬럼 존재\n');
      } else {
        results.failed.push('Neon users.total_points (NOT FOUND)');
        console.log('   ❌ total_points 컬럼 없음\n');
      }
    } catch (err) {
      results.failed.push(`Neon users.total_points (ERROR: ${err.message})`);
      console.log(`   ❌ Neon 연결 오류: ${err.message}\n`);
    }

    // 결과 요약
    console.log('═'.repeat(50));
    console.log('📊 검증 결과 요약');
    console.log('═'.repeat(50));
    console.log(`✅ 통과: ${results.passed.length}개`);
    console.log(`❌ 실패: ${results.failed.length}개`);

    if (results.failed.length > 0) {
      console.log('\n❌ 실패한 항목:');
      results.failed.forEach(f => console.log(`   - ${f}`));
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ 스키마 검증 오류:', error);
  } finally {
    await poolNeon.end();
  }
}

testSchema();

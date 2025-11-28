/**
 * 쿠폰/리뷰 시스템 DB 스키마 마이그레이션 (PlanetScale 호환)
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

async function migrate() {
  console.log('🔧 쿠폰/리뷰 시스템 스키마 마이그레이션 시작...\n');

  const connection = connect({ url: process.env.DATABASE_URL });

  // 컬럼 존재 여부 확인 함수
  async function columnExists(table, column) {
    const result = await connection.execute(`DESCRIBE ${table}`);
    return result.rows.some(row => row.Field === column);
  }

  // 안전하게 컬럼 추가
  async function addColumn(table, column, definition) {
    try {
      const exists = await columnExists(table, column);
      if (exists) {
        console.log(`   ⏭️ ${table}.${column} 이미 존재`);
        return;
      }

      await connection.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      console.log(`   ✅ ${table}.${column} 추가 완료`);
    } catch (err) {
      console.log(`   ❌ ${table}.${column} 오류: ${err.message}`);
    }
  }

  try {
    // 1. user_coupons 테이블
    console.log('📋 1. user_coupons 테이블 마이그레이션...');
    await addColumn('user_coupons', 'coupon_code', 'VARCHAR(20) NULL');
    await addColumn('user_coupons', 'status', "VARCHAR(20) DEFAULT 'ISSUED'");
    await addColumn('user_coupons', 'used_partner_id', 'INT NULL');
    await addColumn('user_coupons', 'order_amount', 'DECIMAL(12,2) DEFAULT 0');
    await addColumn('user_coupons', 'discount_amount', 'DECIMAL(12,2) DEFAULT 0');
    await addColumn('user_coupons', 'final_amount', 'DECIMAL(12,2) DEFAULT 0');
    await addColumn('user_coupons', 'review_submitted', 'TINYINT(1) DEFAULT 0');
    await addColumn('user_coupons', 'review_points_awarded', 'INT DEFAULT 0');

    // 2. partners 테이블
    console.log('\n📋 2. partners 테이블 마이그레이션...');
    await addColumn('partners', 'is_coupon_partner', 'TINYINT(1) DEFAULT 0');
    await addColumn('partners', 'coupon_discount_type', "VARCHAR(20) DEFAULT 'percent'");
    await addColumn('partners', 'coupon_discount_value', 'DECIMAL(10,2) DEFAULT 0');
    await addColumn('partners', 'coupon_max_discount', 'INT DEFAULT 0');

    // 3. coupons 테이블
    console.log('\n📋 3. coupons 테이블 마이그레이션...');
    await addColumn('coupons', 'name', 'VARCHAR(100) NULL');
    await addColumn('coupons', 'max_discount', 'INT DEFAULT 0');
    await addColumn('coupons', 'target_type', "VARCHAR(20) DEFAULT 'ALL'");
    await addColumn('coupons', 'target_categories', 'JSON NULL');
    await addColumn('coupons', 'target_partner_ids', 'JSON NULL');

    // 4. coupon_reviews 테이블
    console.log('\n📋 4. coupon_reviews 테이블 마이그레이션...');
    await addColumn('coupon_reviews', 'partner_id', 'INT NULL');
    await addColumn('coupon_reviews', 'comment', 'TEXT NULL');

    // 5. 기존 데이터 동기화
    console.log('\n📋 5. 기존 데이터 동기화...');

    // coupons: title → name
    if (await columnExists('coupons', 'name') && await columnExists('coupons', 'title')) {
      try {
        await connection.execute(`UPDATE coupons SET name = title WHERE name IS NULL`);
        console.log('   ✅ coupons.name 동기화 완료');
      } catch (err) {
        console.log(`   ⚠️ coupons.name 동기화: ${err.message}`);
      }
    }

    // coupons: max_discount_amount → max_discount
    if (await columnExists('coupons', 'max_discount') && await columnExists('coupons', 'max_discount_amount')) {
      try {
        await connection.execute(`UPDATE coupons SET max_discount = max_discount_amount WHERE max_discount = 0`);
        console.log('   ✅ coupons.max_discount 동기화 완료');
      } catch (err) {
        console.log(`   ⚠️ coupons.max_discount 동기화: ${err.message}`);
      }
    }

    // coupon_reviews: merchant_id → partner_id
    if (await columnExists('coupon_reviews', 'partner_id') && await columnExists('coupon_reviews', 'merchant_id')) {
      try {
        await connection.execute(`UPDATE coupon_reviews SET partner_id = merchant_id WHERE partner_id IS NULL`);
        console.log('   ✅ coupon_reviews.partner_id 동기화 완료');
      } catch (err) {
        console.log(`   ⚠️ coupon_reviews.partner_id 동기화: ${err.message}`);
      }
    }

    // coupon_reviews: review_text → comment
    if (await columnExists('coupon_reviews', 'comment') && await columnExists('coupon_reviews', 'review_text')) {
      try {
        await connection.execute(`UPDATE coupon_reviews SET comment = review_text WHERE comment IS NULL`);
        console.log('   ✅ coupon_reviews.comment 동기화 완료');
      } catch (err) {
        console.log(`   ⚠️ coupon_reviews.comment 동기화: ${err.message}`);
      }
    }

    console.log('\n' + '═'.repeat(50));
    console.log('✅ 마이그레이션 완료!');
    console.log('═'.repeat(50));

  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error);
  }
}

migrate();

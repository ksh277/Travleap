/**
 * coupon_master 테이블에 coupon_type 필드 추가
 *
 * 쿠폰 유형:
 * - INTEGRATED: 통합 쿠폰 (기존 기본값, 상품 결제 시 발급되어 여러 가맹점에서 사용)
 * - SINGLE: 단일 쿠폰 (특정 가맹점 1곳에서만 사용 가능)
 * - PRODUCT: 상품 쿠폰 (특정 상품에만 적용, listing_id 연동)
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

async function addCouponTypeField() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('🚀 coupon_type 필드 추가 시작...\n');

  try {
    // 1. coupon_type 컬럼 추가
    console.log('1️⃣ coupon_type 컬럼 추가...');
    try {
      await conn.execute(`
        ALTER TABLE coupon_master
        ADD COLUMN coupon_type ENUM('INTEGRATED', 'SINGLE', 'PRODUCT') DEFAULT 'INTEGRATED'
        COMMENT '쿠폰 유형: INTEGRATED(통합), SINGLE(단일 가맹점), PRODUCT(특정 상품)'
        AFTER status
      `);
      console.log('✅ coupon_type 컬럼 추가 완료\n');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('ℹ️ coupon_type 컬럼 이미 존재\n');
      } else {
        throw e;
      }
    }

    // 2. listing_id 컬럼 추가 (PRODUCT 타입용)
    console.log('2️⃣ listing_id 컬럼 추가...');
    try {
      await conn.execute(`
        ALTER TABLE coupon_master
        ADD COLUMN listing_id BIGINT NULL
        COMMENT '특정 상품 ID (PRODUCT 타입일 때 사용)'
        AFTER coupon_type
      `);
      console.log('✅ listing_id 컬럼 추가 완료\n');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('ℹ️ listing_id 컬럼 이미 존재\n');
      } else {
        throw e;
      }
    }

    // 3. target_merchant_id 컬럼 추가 (SINGLE 타입용)
    console.log('3️⃣ target_merchant_id 컬럼 추가...');
    try {
      await conn.execute(`
        ALTER TABLE coupon_master
        ADD COLUMN target_merchant_id BIGINT NULL
        COMMENT '특정 가맹점 ID (SINGLE 타입일 때 사용)'
        AFTER listing_id
      `);
      console.log('✅ target_merchant_id 컬럼 추가 완료\n');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('ℹ️ target_merchant_id 컬럼 이미 존재\n');
      } else {
        throw e;
      }
    }

    // 4. 인덱스 추가
    console.log('4️⃣ 인덱스 추가...');
    try {
      await conn.execute(`
        ALTER TABLE coupon_master
        ADD INDEX idx_coupon_type (coupon_type)
      `);
      console.log('✅ idx_coupon_type 인덱스 추가 완료');
    } catch (e) {
      if (e.message.includes('Duplicate key name')) {
        console.log('ℹ️ idx_coupon_type 인덱스 이미 존재');
      } else {
        console.log('⚠️ 인덱스 추가 실패:', e.message);
      }
    }

    try {
      await conn.execute(`
        ALTER TABLE coupon_master
        ADD INDEX idx_listing_id (listing_id)
      `);
      console.log('✅ idx_listing_id 인덱스 추가 완료');
    } catch (e) {
      if (e.message.includes('Duplicate key name')) {
        console.log('ℹ️ idx_listing_id 인덱스 이미 존재');
      } else {
        console.log('⚠️ 인덱스 추가 실패:', e.message);
      }
    }

    try {
      await conn.execute(`
        ALTER TABLE coupon_master
        ADD INDEX idx_target_merchant_id (target_merchant_id)
      `);
      console.log('✅ idx_target_merchant_id 인덱스 추가 완료\n');
    } catch (e) {
      if (e.message.includes('Duplicate key name')) {
        console.log('ℹ️ idx_target_merchant_id 인덱스 이미 존재\n');
      } else {
        console.log('⚠️ 인덱스 추가 실패:', e.message);
      }
    }

    // 5. 기존 쿠폰들을 INTEGRATED로 업데이트 (NULL인 경우)
    console.log('5️⃣ 기존 쿠폰 타입 업데이트...');
    const updateResult = await conn.execute(`
      UPDATE coupon_master
      SET coupon_type = 'INTEGRATED'
      WHERE coupon_type IS NULL
    `);
    console.log(`✅ ${updateResult.rowsAffected || 0}개 쿠폰 타입 업데이트 완료\n`);

    // 6. 결과 확인
    console.log('📊 coupon_master 테이블 구조 확인:');
    const columns = await conn.execute(`
      SHOW COLUMNS FROM coupon_master
      WHERE Field IN ('coupon_type', 'listing_id', 'target_merchant_id')
    `);

    for (const col of columns.rows || []) {
      console.log(`  - ${col.Field}: ${col.Type} (Default: ${col.Default})`);
    }

    // 7. 쿠폰 타입별 통계
    console.log('\n📈 쿠폰 타입별 통계:');
    const stats = await conn.execute(`
      SELECT coupon_type, COUNT(*) as count
      FROM coupon_master
      GROUP BY coupon_type
    `);

    for (const row of stats.rows || []) {
      console.log(`  - ${row.coupon_type || 'NULL'}: ${row.count}개`);
    }

    console.log('\n🎉 coupon_type 필드 추가 완료!');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    throw error;
  }
}

addCouponTypeField()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

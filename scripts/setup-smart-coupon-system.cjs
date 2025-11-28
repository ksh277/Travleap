/**
 * 스마트 쿠폰 시스템 설정 스크립트
 *
 * 파트너 중심 패러다임:
 * - 파트너(가맹점)가 쿠폰 참여 ON/OFF
 * - 쿠폰은 정책만 정의, 사용처는 파트너가 결정
 * - 개인 쿠폰 코드는 랜덤 생성 + 중복 방지
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function setupSmartCouponSystem() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('🚀 스마트 쿠폰 시스템 설정 시작...\n');

  try {
    // ========================================
    // 1. partners 테이블에 쿠폰 관련 필드 추가
    // ========================================
    console.log('1️⃣ partners 테이블 쿠폰 필드 추가...');

    // 컬럼 존재 여부 확인 후 추가
    const partnerColumns = [
      { name: 'is_coupon_partner', sql: 'ALTER TABLE partners ADD COLUMN is_coupon_partner BOOLEAN DEFAULT FALSE COMMENT "쿠폰 참여 여부"' },
      { name: 'coupon_discount_type', sql: 'ALTER TABLE partners ADD COLUMN coupon_discount_type ENUM("PERCENT", "AMOUNT") DEFAULT NULL COMMENT "파트너별 할인 타입"' },
      { name: 'coupon_discount_value', sql: 'ALTER TABLE partners ADD COLUMN coupon_discount_value INT DEFAULT NULL COMMENT "파트너별 할인 값"' },
      { name: 'coupon_max_discount', sql: 'ALTER TABLE partners ADD COLUMN coupon_max_discount INT DEFAULT NULL COMMENT "파트너별 최대 할인액"' },
      { name: 'coupon_min_order', sql: 'ALTER TABLE partners ADD COLUMN coupon_min_order INT DEFAULT 0 COMMENT "파트너별 최소 주문액"' },
      { name: 'total_coupon_usage', sql: 'ALTER TABLE partners ADD COLUMN total_coupon_usage INT DEFAULT 0 COMMENT "총 쿠폰 사용 횟수"' },
      { name: 'total_discount_given', sql: 'ALTER TABLE partners ADD COLUMN total_discount_given INT DEFAULT 0 COMMENT "총 할인 제공액"' }
    ];

    for (const col of partnerColumns) {
      try {
        await connection.execute(col.sql);
        console.log(`   ✅ ${col.name} 컬럼 추가됨`);
      } catch (e) {
        if (e.message.includes('Duplicate column')) {
          console.log(`   ⏭️ ${col.name} 컬럼 이미 존재`);
        } else {
          console.log(`   ⚠️ ${col.name}: ${e.message}`);
        }
      }
    }

    // ========================================
    // 2. coupons 테이블에 target_type 필드 추가
    // ========================================
    console.log('\n2️⃣ coupons 테이블 target_type 필드 추가...');

    const couponColumns = [
      { name: 'name', sql: 'ALTER TABLE coupons ADD COLUMN name VARCHAR(255) COMMENT "쿠폰 이름"' },
      { name: 'target_type', sql: 'ALTER TABLE coupons ADD COLUMN target_type ENUM("ALL", "CATEGORY", "SPECIFIC") DEFAULT "ALL" COMMENT "대상 타입"' },
      { name: 'target_categories', sql: 'ALTER TABLE coupons ADD COLUMN target_categories JSON DEFAULT NULL COMMENT "대상 카테고리 (CATEGORY일 때)"' },
      { name: 'default_discount_type', sql: 'ALTER TABLE coupons ADD COLUMN default_discount_type ENUM("PERCENT", "AMOUNT") DEFAULT "PERCENT" COMMENT "기본 할인 타입"' },
      { name: 'default_discount_value', sql: 'ALTER TABLE coupons ADD COLUMN default_discount_value INT DEFAULT 10 COMMENT "기본 할인 값"' },
      { name: 'default_max_discount', sql: 'ALTER TABLE coupons ADD COLUMN default_max_discount INT DEFAULT NULL COMMENT "기본 최대 할인액"' },
      { name: 'valid_from', sql: 'ALTER TABLE coupons ADD COLUMN valid_from DATETIME DEFAULT NULL COMMENT "유효 시작일"' },
      { name: 'valid_to', sql: 'ALTER TABLE coupons ADD COLUMN valid_to DATETIME DEFAULT NULL COMMENT "유효 종료일"' },
      { name: 'max_issues_per_user', sql: 'ALTER TABLE coupons ADD COLUMN max_issues_per_user INT DEFAULT 1 COMMENT "1인당 발급 제한"' }
    ];

    for (const col of couponColumns) {
      try {
        await connection.execute(col.sql);
        console.log(`   ✅ ${col.name} 컬럼 추가됨`);
      } catch (e) {
        if (e.message.includes('Duplicate column')) {
          console.log(`   ⏭️ ${col.name} 컬럼 이미 존재`);
        } else {
          console.log(`   ⚠️ ${col.name}: ${e.message}`);
        }
      }
    }

    // ========================================
    // 3. user_coupons 테이블 생성 (개인 쿠폰)
    // ========================================
    console.log('\n3️⃣ user_coupons 테이블 생성...');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_coupons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '사용자 ID',
        coupon_id INT NOT NULL COMMENT '쿠폰 ID (coupons.id)',
        coupon_code VARCHAR(20) NOT NULL COMMENT '개인 쿠폰 코드 (랜덤)',
        status ENUM('ISSUED', 'USED', 'EXPIRED', 'REVOKED') DEFAULT 'ISSUED' COMMENT '쿠폰 상태',
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '발급 일시',
        expires_at DATETIME NULL COMMENT '만료 일시',
        used_at TIMESTAMP NULL COMMENT '사용 일시',
        used_partner_id INT NULL COMMENT '사용된 가맹점 ID',
        order_amount INT NULL COMMENT '주문 금액',
        discount_amount INT NULL COMMENT '할인 금액',
        final_amount INT NULL COMMENT '최종 결제 금액',
        review_submitted BOOLEAN DEFAULT FALSE COMMENT '리뷰 작성 여부',
        review_points_awarded INT DEFAULT 0 COMMENT '지급된 리뷰 포인트',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_coupon_code (coupon_code),
        INDEX idx_user_id (user_id),
        INDEX idx_coupon_id (coupon_id),
        INDEX idx_status (status),
        INDEX idx_used_partner (used_partner_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='사용자별 개인 쿠폰'
    `);
    console.log('   ✅ user_coupons 테이블 생성 완료');

    // ========================================
    // 4. coupon_targets 테이블 생성 (SPECIFIC 대상)
    // ========================================
    console.log('\n4️⃣ coupon_targets 테이블 생성...');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS coupon_targets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        coupon_id INT NOT NULL COMMENT '쿠폰 ID',
        partner_id INT NOT NULL COMMENT '파트너 ID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_coupon_partner (coupon_id, partner_id),
        INDEX idx_coupon_id (coupon_id),
        INDEX idx_partner_id (partner_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='쿠폰 대상 파트너 (SPECIFIC용)'
    `);
    console.log('   ✅ coupon_targets 테이블 생성 완료');

    // ========================================
    // 5. coupon_reviews 테이블 생성
    // ========================================
    console.log('\n5️⃣ coupon_reviews 테이블 확인...');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS coupon_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_coupon_id INT NOT NULL COMMENT '사용자 쿠폰 ID',
        user_id INT NOT NULL COMMENT '작성자 ID',
        partner_id INT NOT NULL COMMENT '가맹점 ID',
        rating INT NOT NULL COMMENT '평점 (1-5)',
        comment TEXT COMMENT '리뷰 내용',
        points_awarded INT DEFAULT 0 COMMENT '지급된 포인트',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_coupon (user_coupon_id),
        INDEX idx_user_id (user_id),
        INDEX idx_partner_id (partner_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='쿠폰 사용 후 리뷰'
    `);
    console.log('   ✅ coupon_reviews 테이블 확인 완료');

    // ========================================
    // 6. 테스트용 쿠폰 생성
    // ========================================
    console.log('\n6️⃣ 테스트용 쿠폰 생성...');

    // 기존 테스트 쿠폰 확인
    const existingCoupon = await connection.execute(
      "SELECT id FROM coupons WHERE code = 'SHINAN2025' LIMIT 1"
    );

    if (!existingCoupon.rows || existingCoupon.rows.length === 0) {
      await connection.execute(`
        INSERT INTO coupons (
          code, name, description,
          discount_type, discount_value, min_amount, max_discount_amount,
          target_type, target_categories,
          default_discount_type, default_discount_value, default_max_discount,
          valid_from, valid_to,
          usage_limit, max_issues_per_user,
          is_active
        ) VALUES (
          'SHINAN2025',
          '2025 신안 섬여행 할인 쿠폰',
          '신안 지역 가맹점에서 사용 가능한 15% 할인 쿠폰입니다.',
          'percentage', 15, 10000, 10000,
          'ALL', NULL,
          'PERCENT', 15, 10000,
          '2025-01-01 00:00:00', '2025-12-31 23:59:59',
          1000, 1,
          TRUE
        )
      `);
      console.log('   ✅ SHINAN2025 테스트 쿠폰 생성됨');
    } else {
      console.log('   ⏭️ SHINAN2025 쿠폰 이미 존재');
    }

    // ========================================
    // 7. 파트너 쿠폰 ON 설정 (테스트용)
    // ========================================
    console.log('\n7️⃣ 테스트용 파트너 쿠폰 ON 설정...');

    // 승인된 파트너 중 일부를 쿠폰 참여로 설정
    const updateResult = await connection.execute(`
      UPDATE partners
      SET is_coupon_partner = TRUE,
          coupon_discount_type = 'PERCENT',
          coupon_discount_value = 15,
          coupon_max_discount = 10000,
          coupon_min_order = 10000
      WHERE status = 'approved'
        AND is_coupon_partner IS NULL OR is_coupon_partner = FALSE
      LIMIT 5
    `);
    console.log(`   ✅ ${updateResult.rowsAffected || 0}개 파트너 쿠폰 ON 설정됨`);

    // ========================================
    // 결과 확인
    // ========================================
    console.log('\n========================================');
    console.log('📊 설정 결과 확인');
    console.log('========================================\n');

    // 쿠폰 확인
    const coupons = await connection.execute(
      "SELECT id, code, name, target_type, is_active FROM coupons WHERE is_active = TRUE LIMIT 5"
    );
    console.log('🎫 활성 쿠폰:');
    (coupons.rows || []).forEach(c => {
      console.log(`   - [${c.id}] ${c.code}: ${c.name} (target: ${c.target_type})`);
    });

    // 쿠폰 참여 파트너 확인
    const couponPartners = await connection.execute(
      "SELECT id, business_name, is_coupon_partner, coupon_discount_value FROM partners WHERE is_coupon_partner = TRUE LIMIT 5"
    );
    console.log('\n🏪 쿠폰 참여 가맹점:');
    (couponPartners.rows || []).forEach(p => {
      console.log(`   - [${p.id}] ${p.business_name}: ${p.coupon_discount_value}% 할인`);
    });

    console.log('\n✅ 스마트 쿠폰 시스템 설정 완료!');
    console.log('\n다음 단계:');
    console.log('1. 관리자 페이지에서 쿠폰 생성');
    console.log('2. 파트너 관리에서 쿠폰 ON/OFF 설정');
    console.log('3. /coupon-test 페이지에서 테스트');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 실행
setupSmartCouponSystem()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

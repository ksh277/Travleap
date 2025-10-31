require('dotenv').config();
const { connect } = require('@planetscale/database');

async function createTestCoupon() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL 환경 변수가 설정되지 않았습니다.');
    console.log('💡 .env 파일에 DATABASE_URL을 설정해주세요.');
    process.exit(1);
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🎟️ 테스트 쿠폰 생성 시작...');

    // 1. coupons 테이블 생성 (없으면)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS coupons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255),
        description TEXT,
        discount_type ENUM('percentage', 'fixed') NOT NULL,
        discount_value INT NOT NULL,
        min_amount INT DEFAULT 0,
        target_category VARCHAR(50),
        valid_from TIMESTAMP NULL,
        valid_until TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE,
        usage_limit INT NULL,
        current_usage INT DEFAULT 0,
        usage_per_user INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_code (code),
        INDEX idx_is_active (is_active),
        INDEX idx_valid_until (valid_until)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ coupons 테이블 확인 완료');

    // 2. user_coupons 테이블 생성 (없으면)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_coupons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        coupon_id INT NOT NULL,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_used BOOLEAN DEFAULT FALSE,
        used_at TIMESTAMP NULL,
        order_number VARCHAR(100) NULL,
        UNIQUE KEY unique_user_coupon (user_id, coupon_id),
        INDEX idx_user_id (user_id),
        INDEX idx_coupon_id (coupon_id),
        INDEX idx_is_used (is_used)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ user_coupons 테이블 확인 완료');

    // 3. coupon_usage 테이블 생성 (없으면)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS coupon_usage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        coupon_id INT NOT NULL,
        user_id INT,
        order_id INT,
        payment_id VARCHAR(100),
        discount_amount INT DEFAULT 0,
        used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_coupon_id (coupon_id),
        INDEX idx_user_id (user_id),
        INDEX idx_order_id (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ coupon_usage 테이블 확인 완료');

    // 4. 테스트 쿠폰 생성 (10% 할인, 최소 10,000원)
    const couponCode = 'WELCOME2025';

    // 기존 쿠폰 확인
    const existingCoupon = await connection.execute(
      'SELECT id FROM coupons WHERE code = ?',
      [couponCode]
    );

    let couponId;

    if (existingCoupon.rows && existingCoupon.rows.length > 0) {
      couponId = existingCoupon.rows[0].id;
      console.log(`⚠️ 쿠폰 "${couponCode}"이(가) 이미 존재합니다 (ID: ${couponId})`);
    } else {
      // MySQL DATETIME 형식으로 변환
      const now = new Date();
      const validFrom = now.toISOString().slice(0, 19).replace('T', ' ');
      const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        .toISOString().slice(0, 19).replace('T', ' ');

      const result = await connection.execute(`
        INSERT INTO coupons (
          code,
          title,
          description,
          discount_type,
          discount_value,
          min_amount,
          target_category,
          valid_from,
          valid_until,
          is_active,
          usage_limit,
          current_usage,
          usage_per_user
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        couponCode,
        '신규 회원 환영 쿠폰',
        '첫 구매 시 10% 할인 (최대 5,000원)',
        'percentage',
        10,
        10000,
        null,
        validFrom,
        validUntil,
        true,
        1000,
        0,
        1
      ]);

      couponId = result.insertId;
      console.log(`✅ 테스트 쿠폰 생성 완료!`);
    }

    // 5. 모든 사용자에게 쿠폰 등록
    const users = await connection.execute('SELECT id FROM users LIMIT 10');

    if (users.rows && users.rows.length > 0) {
      console.log(`\n👥 ${users.rows.length}명의 사용자에게 쿠폰 등록 중...`);

      for (const user of users.rows) {
        try {
          await connection.execute(`
            INSERT IGNORE INTO user_coupons (user_id, coupon_id)
            VALUES (?, ?)
          `, [user.id, couponId]);
          console.log(`✅ 사용자 ${user.id}에게 쿠폰 등록 완료`);
        } catch (e) {
          if (e.message.includes('Duplicate')) {
            console.log(`⚠️ 사용자 ${user.id}는 이미 이 쿠폰을 보유하고 있습니다`);
          } else {
            console.error(`❌ 사용자 ${user.id} 등록 실패:`, e.message);
          }
        }
      }
    } else {
      console.log('⚠️ 사용자가 없습니다. 쿠폰은 생성되었지만 등록되지 않았습니다.');
    }

    console.log('\n🎉 테스트 쿠폰 생성 완료!');
    console.log('\n📋 쿠폰 정보:');
    console.log(`   코드: ${couponCode}`);
    console.log(`   할인: 10% (최대 5,000원)`);
    console.log(`   최소 주문 금액: 10,000원`);
    console.log(`   유효 기간: 30일`);
    console.log(`   사용 제한: 1인 1회`);
    console.log('\n💡 사용 방법:');
    console.log(`   1. 장바구니에 10,000원 이상 담기`);
    console.log(`   2. 결제 페이지에서 쿠폰 코드 "${couponCode}" 입력`);
    console.log(`   3. 할인 적용 확인 후 결제`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    console.error('Stack:', error.stack);
  }
}

createTestCoupon();

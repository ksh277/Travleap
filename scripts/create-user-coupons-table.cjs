/**
 * user_coupons 테이블 생성
 * 사용자별 보유 쿠폰을 관리하는 테이블
 */

const { connect } = require('@planetscale/database');
require('dotenv').config({ path: '.env.local' });

async function createUserCouponsTable() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('📦 [DB] user_coupons 테이블 생성 시작...\n');

    // user_coupons 테이블 생성
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

    console.log('✅ user_coupons 테이블 생성 완료\n');

    // 테이블 구조 확인
    const result = await connection.execute('DESCRIBE user_coupons');
    console.log('📋 테이블 구조:');
    console.table(result.rows);

    console.log('\n✨ user_coupons 테이블이 성공적으로 생성되었습니다!');
    console.log('\n📌 테이블 설명:');
    console.log('   - user_id: 사용자 ID (Neon PostgreSQL users 테이블 참조)');
    console.log('   - coupon_id: 쿠폰 ID (coupons 테이블 참조)');
    console.log('   - registered_at: 쿠폰 등록 시간');
    console.log('   - is_used: 사용 여부');
    console.log('   - used_at: 사용 시간');
    console.log('   - order_number: 사용된 주문 번호');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

createUserCouponsTable();

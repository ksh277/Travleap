/**
 * exchange_payments 테이블 생성 스크립트
 *
 * 교환 배송비 결제 정보를 저장하는 테이블
 */

const { connect } = require('@planetscale/database');

async function createExchangePaymentsTable() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('📦 exchange_payments 테이블 생성 중...');

  try {
    // exchange_payments 테이블 생성
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS exchange_payments (
        id VARCHAR(36) PRIMARY KEY,
        original_payment_id BIGINT NOT NULL COMMENT '원본 결제 ID',
        original_booking_id BIGINT NULL COMMENT '원본 예약 ID (단일 상품인 경우)',
        user_id BIGINT NOT NULL COMMENT '고객 ID',
        amount INT NOT NULL DEFAULT 6000 COMMENT '교환 배송비 (6,000원)',
        payment_key VARCHAR(255) NULL COMMENT 'Toss Payments 결제 키',
        payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' COMMENT '결제 상태: pending, paid, failed, cancelled',
        exchange_reason TEXT NULL COMMENT '교환 사유',
        new_payment_id BIGINT NULL COMMENT '새로 생성된 주문의 payment ID',
        new_booking_id BIGINT NULL COMMENT '새로 생성된 주문의 booking ID',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시각',
        paid_at TIMESTAMP NULL COMMENT '결제 완료 시각',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 시각',

        INDEX idx_original_payment (original_payment_id),
        INDEX idx_original_booking (original_booking_id),
        INDEX idx_user (user_id),
        INDEX idx_payment_status (payment_status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='교환 배송비 결제 정보'
    `);

    console.log('✅ exchange_payments 테이블 생성 완료');

    // 테이블 구조 확인
    const result = await connection.execute('DESCRIBE exchange_payments');
    console.log('\n📋 테이블 구조:');
    console.table(result.rows);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

createExchangePaymentsTable();

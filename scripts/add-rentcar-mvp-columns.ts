/**
 * 렌트카 MVP 완전 구현 마이그레이션 스크립트
 *
 * 추가되는 기능:
 * - 운전자 검증 (만나이, 면허 만료일)
 * - 시간제 요금 계산 (일+시간 혼합)
 * - 차량 차단 관리
 * - 결제/보증금 처리
 * - 상태 전이 검증
 * - 취소/환불 정책
 */

import 'dotenv/config';
import { getDatabase } from '../utils/database';

async function addRentcarMVPColumns() {
  const db = getDatabase();

  console.log('🚗 렌트카 MVP 시스템 마이그레이션 시작\n');
  console.log('='.repeat(60));

  try {
    // Step 1: 기존 컬럼 확인
    console.log('\n📋 Step 1: 기존 rentcar_bookings 컬럼 확인');

    const existingColumns = await db.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'rentcar_bookings'
    `);

    const columnNames = existingColumns.map((col: any) => col.COLUMN_NAME);
    console.log(`   현재 컬럼 개수: ${columnNames.length}개`);

    // Step 2: MVP 필수 컬럼 추가
    console.log('\n🔧 Step 2: MVP 필수 컬럼 추가');

    const columnsToAdd = [
      // 운전자 검증
      { name: 'driver_name', sql: "ADD COLUMN driver_name VARCHAR(100) COMMENT '운전자 이름'" },
      { name: 'driver_birth', sql: "ADD COLUMN driver_birth DATE COMMENT '운전자 생년월일'" },
      { name: 'driver_license_no', sql: "ADD COLUMN driver_license_no VARCHAR(50) COMMENT '운전면허 번호'" },
      { name: 'driver_license_exp', sql: "ADD COLUMN driver_license_exp DATE COMMENT '운전면허 만료일'" },
      { name: 'driver_age_at_pickup', sql: "ADD COLUMN driver_age_at_pickup INT COMMENT '픽업 시점 만나이'" },

      // 예약 시간 (UTC 기준)
      { name: 'pickup_at_utc', sql: "ADD COLUMN pickup_at_utc TIMESTAMP NULL COMMENT '인수 예정 시각 (UTC)'" },
      { name: 'return_at_utc', sql: "ADD COLUMN return_at_utc TIMESTAMP NULL COMMENT '반납 예정 시각 (UTC)'" },
      { name: 'actual_return_at_utc', sql: "ADD COLUMN actual_return_at_utc TIMESTAMP NULL COMMENT '실제 반납 시각 (UTC)'" },

      // 시간제 요금
      { name: 'rental_hours', sql: "ADD COLUMN rental_hours INT COMMENT '총 대여 시간'" },
      { name: 'rental_days', sql: "ADD COLUMN rental_days INT COMMENT '대여 일수'" },
      { name: 'rental_hours_remainder', sql: "ADD COLUMN rental_hours_remainder INT COMMENT '나머지 시간'" },
      { name: 'hourly_rate_krw', sql: "ADD COLUMN hourly_rate_krw INT COMMENT '시간당 요금'" },
      { name: 'daily_rate_krw', sql: "ADD COLUMN daily_rate_krw INT COMMENT '일일 요금'" },

      // Toss Payments
      { name: 'payment_key', sql: "ADD COLUMN payment_key VARCHAR(200) COMMENT 'Toss paymentKey'" },
      { name: 'toss_order_id', sql: "ADD COLUMN toss_order_id VARCHAR(100) COMMENT 'Toss orderId'" },
      { name: 'approved_at', sql: "ADD COLUMN approved_at TIMESTAMP NULL COMMENT '결제 승인 시각'" },
      { name: 'refunded_at', sql: "ADD COLUMN refunded_at TIMESTAMP NULL COMMENT '환불 완료 시각'" },
      { name: 'refund_amount_krw', sql: "ADD COLUMN refund_amount_krw INT DEFAULT 0 COMMENT '환불 금액'" },

      // 보증금
      { name: 'deposit_amount_krw', sql: "ADD COLUMN deposit_amount_krw INT DEFAULT 0 COMMENT '보증금'" },
      { name: 'deposit_payment_key', sql: "ADD COLUMN deposit_payment_key VARCHAR(200) COMMENT '보증금 결제 키'" },
      { name: 'deposit_status', sql: "ADD COLUMN deposit_status ENUM('none','held','released','partially_released','forfeited') DEFAULT 'none'" },
      { name: 'deposit_released_at', sql: "ADD COLUMN deposit_released_at TIMESTAMP NULL COMMENT '보증금 환급 시각'" },

      // 지연 반납
      { name: 'late_return_hours', sql: "ADD COLUMN late_return_hours INT DEFAULT 0 COMMENT '지연 시간'" },
      { name: 'late_return_fee_krw', sql: "ADD COLUMN late_return_fee_krw INT DEFAULT 0 COMMENT '지연 요금'" },
      { name: 'grace_minutes', sql: "ADD COLUMN grace_minutes INT DEFAULT 30 COMMENT '유예시간'" },

      // 추가 요금
      { name: 'fuel_deficit_liters', sql: "ADD COLUMN fuel_deficit_liters DECIMAL(5,2) DEFAULT 0 COMMENT '연료 부족량'" },
      { name: 'fuel_fee_krw', sql: "ADD COLUMN fuel_fee_krw INT DEFAULT 0 COMMENT '연료 차액'" },
      { name: 'mileage_overage_km', sql: "ADD COLUMN mileage_overage_km INT DEFAULT 0 COMMENT '주행거리 초과'" },
      { name: 'overage_fee_krw', sql: "ADD COLUMN overage_fee_krw INT DEFAULT 0 COMMENT '초과 주행 요금'" },
      { name: 'damage_fee_krw', sql: "ADD COLUMN damage_fee_krw INT DEFAULT 0 COMMENT '손상 비용'" },
      { name: 'total_additional_fee_krw', sql: "ADD COLUMN total_additional_fee_krw INT DEFAULT 0 COMMENT '총 추가 요금'" },

      // 취소 정책
      { name: 'cancel_policy_code', sql: "ADD COLUMN cancel_policy_code VARCHAR(50) COMMENT '취소 정책 코드'" },
      { name: 'refund_rate_pct', sql: "ADD COLUMN refund_rate_pct DECIMAL(5,2) COMMENT '환불율'" },
      { name: 'cancellation_fee_krw', sql: "ADD COLUMN cancellation_fee_krw INT DEFAULT 0 COMMENT '취소 수수료'" },
      { name: 'no_show_penalty_fee_krw', sql: "ADD COLUMN no_show_penalty_fee_krw INT DEFAULT 0 COMMENT 'No-show 위약금'" }
    ];

    let addedCount = 0;
    let skippedCount = 0;

    for (const col of columnsToAdd) {
      if (columnNames.includes(col.name)) {
        console.log(`   ⏭️  ${col.name} - 이미 존재 (스킵)`);
        skippedCount++;
      } else {
        await db.execute(`ALTER TABLE rentcar_bookings ${col.sql}`);
        console.log(`   ✅ ${col.name} - 추가 완료`);
        addedCount++;
      }
    }

    console.log(`\n   결과: ${addedCount}개 추가, ${skippedCount}개 스킵`);

    // Step 3: 인덱스 추가
    console.log('\n📊 Step 3: 인덱스 추가');

    const indexesToAdd = [
      { name: 'idx_driver_birth', sql: 'CREATE INDEX idx_driver_birth ON rentcar_bookings(driver_birth)' },
      { name: 'idx_driver_license_exp', sql: 'CREATE INDEX idx_driver_license_exp ON rentcar_bookings(driver_license_exp)' },
      { name: 'idx_payment_key', sql: 'CREATE INDEX idx_payment_key ON rentcar_bookings(payment_key)' },
      { name: 'idx_rental_hours', sql: 'CREATE INDEX idx_rental_hours ON rentcar_bookings(rental_hours)' },
      { name: 'idx_deposit_status', sql: 'CREATE INDEX idx_deposit_status ON rentcar_bookings(deposit_status)' }
    ];

    let indexAddedCount = 0;
    let indexSkippedCount = 0;

    for (const idx of indexesToAdd) {
      try {
        await db.execute(idx.sql);
        console.log(`   ✅ ${idx.name} - 생성 완료`);
        indexAddedCount++;
      } catch (error: any) {
        if (error.message.includes('Duplicate key name') || error.message.includes('already exists')) {
          console.log(`   ⏭️  ${idx.name} - 이미 존재 (스킵)`);
          indexSkippedCount++;
        } else {
          console.warn(`   ⚠️  ${idx.name} - 생성 실패: ${error.message}`);
        }
      }
    }

    console.log(`\n   결과: ${indexAddedCount}개 생성, ${indexSkippedCount}개 스킵`);

    // Step 4: vehicle_blocks 테이블 생성
    console.log('\n🚧 Step 4: rentcar_vehicle_blocks 테이블 생성');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS rentcar_vehicle_blocks (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        vendor_id BIGINT NOT NULL,
        vehicle_id BIGINT NOT NULL,
        starts_at TIMESTAMP NOT NULL,
        ends_at TIMESTAMP NOT NULL,
        block_type ENUM('maintenance', 'damage', 'cleaning', 'reserved', 'seasonal', 'other') DEFAULT 'maintenance',
        reason TEXT,
        blocked_by VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_vehicle_period (vehicle_id, starts_at, ends_at),
        INDEX idx_vendor_active (vendor_id, is_active),
        INDEX idx_block_type (block_type)
      )
    `);

    console.log('   ✅ rentcar_vehicle_blocks 테이블 생성 완료');

    // Step 5: rental_payments 테이블 생성
    console.log('\n💳 Step 5: rentcar_rental_payments 테이블 생성');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS rentcar_rental_payments (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        rental_id BIGINT NOT NULL,
        payment_type ENUM('rental', 'deposit', 'additional', 'refund') NOT NULL,
        payment_key VARCHAR(200),
        order_id VARCHAR(100),
        method VARCHAR(50),
        amount_krw INT NOT NULL,
        status ENUM('pending', 'approved', 'canceled', 'failed') DEFAULT 'pending',
        approved_at TIMESTAMP NULL,
        canceled_at TIMESTAMP NULL,
        cancel_reason TEXT,
        provider_response JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_rental (rental_id),
        INDEX idx_payment_key (payment_key),
        INDEX idx_type_status (payment_type, status),
        INDEX idx_approved_at (approved_at)
      )
    `);

    console.log('   ✅ rentcar_rental_payments 테이블 생성 완료');

    // Step 6: rental_deposits 테이블 생성
    console.log('\n💰 Step 6: rentcar_rental_deposits 테이블 생성');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS rentcar_rental_deposits (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        rental_id BIGINT NOT NULL,
        deposit_type ENUM('charge', 'pre_auth') DEFAULT 'charge',
        payment_key VARCHAR(200),
        amount_krw INT NOT NULL,
        status ENUM('held', 'released', 'partially_released', 'forfeited') DEFAULT 'held',
        held_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        released_at TIMESTAMP NULL,
        released_amount_krw INT DEFAULT 0,
        forfeited_amount_krw INT DEFAULT 0,
        forfeit_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_rental (rental_id),
        INDEX idx_payment_key (payment_key),
        INDEX idx_status (status)
      )
    `);

    console.log('   ✅ rentcar_rental_deposits 테이블 생성 완료');

    // Step 7: rental_events 테이블 생성
    console.log('\n📡 Step 7: rentcar_rental_events 테이블 생성');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS rentcar_rental_events (
        event_id VARCHAR(100) PRIMARY KEY,
        rental_id BIGINT,
        event_type VARCHAR(50) NOT NULL,
        payment_key VARCHAR(200),
        payload JSON NOT NULL,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_rental (rental_id),
        INDEX idx_payment_key (payment_key),
        INDEX idx_event_type (event_type)
      )
    `);

    console.log('   ✅ rentcar_rental_events 테이블 생성 완료');

    // Step 8: state_transitions 테이블 생성
    console.log('\n🔄 Step 8: rentcar_state_transitions 테이블 생성');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS rentcar_state_transitions (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        rental_id BIGINT NOT NULL,
        from_status VARCHAR(50) NOT NULL,
        to_status VARCHAR(50) NOT NULL,
        transition_reason TEXT,
        transitioned_by VARCHAR(100),
        transitioned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_rental (rental_id),
        INDEX idx_status_transition (from_status, to_status),
        INDEX idx_transitioned_at (transitioned_at)
      )
    `);

    console.log('   ✅ rentcar_state_transitions 테이블 생성 완료');

    // Step 9: 취소 정책 삽입
    console.log('\n📜 Step 9: 렌트카 취소 정책 삽입');

    await db.execute(`
      INSERT INTO cancellation_policies (policy_name, category, rules_json, no_show_penalty_rate, description)
      VALUES
        ('렌트카 유연 취소', 'flexible',
         '[{"hours_before_pickup": 24, "refund_rate": 100}, {"hours_before_pickup": 0, "refund_rate": 0}]',
         100,
         '픽업 24시간 전까지 무료 취소 가능. 이후 환불 불가.'),

        ('렌트카 중간 취소', 'moderate',
         '[{"hours_before_pickup": 72, "refund_rate": 100}, {"hours_before_pickup": 24, "refund_rate": 50}, {"hours_before_pickup": 0, "refund_rate": 0}]',
         100,
         '픽업 72시간 전: 100% 환불, 24시간 전: 50% 환불, 이후: 환불 불가.'),

        ('렌트카 엄격 취소', 'strict',
         '[{"hours_before_pickup": 168, "refund_rate": 100}, {"hours_before_pickup": 72, "refund_rate": 50}, {"hours_before_pickup": 0, "refund_rate": 0}]',
         100,
         '픽업 7일 전: 100% 환불, 3일 전: 50% 환불, 이후: 환불 불가.'),

        ('렌트카 환불 불가', 'non_refundable',
         '[{"hours_before_pickup": 0, "refund_rate": 0}]',
         100,
         '예약 후 취소 시 환불 불가. No-show 시 100% 위약금 부과.')
      ON DUPLICATE KEY UPDATE updated_at = NOW()
    `);

    const policies = await db.query('SELECT * FROM cancellation_policies WHERE policy_name LIKE "렌트카%"');
    console.log(`   ✅ ${policies.length}개 정책 삽입/업데이트 완료`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ 렌트카 MVP 시스템 마이그레이션 완료!');
    console.log('='.repeat(60));

    console.log('\n📊 마이그레이션 요약:');
    console.log(`   - 검증 컬럼: ${addedCount}개 추가 (${skippedCount}개 스킵)`);
    console.log(`   - 인덱스: ${indexAddedCount}개 생성 (${indexSkippedCount}개 스킵)`);
    console.log(`   - 취소 정책: ${policies.length}개 등록`);
    console.log('   - 신규 테이블: 5개 (blocks, payments, deposits, events, transitions)');

    console.log('\n🎯 다음 단계:');
    console.log('   1. API 구현 (search, create, confirm, cancel, pickup, return)');
    console.log('   2. 서버 라우트 등록');
    console.log('   3. 통합 테스트 실행');

  } catch (error) {
    console.error('\n❌ 마이그레이션 실패:', error);
    throw error;
  }
}

// 실행
addRentcarMVPColumns()
  .then(() => {
    console.log('\n✅ 스크립트 정상 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });

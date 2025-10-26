/**
 * 숙박(Lodging) 검증 시스템 마이그레이션 스크립트
 *
 * 추가되는 기능:
 * - 바우처 코드 및 QR 코드 생성
 * - 체크인/체크아웃 검증
 * - 객실 상태 기록
 * - 미니바 및 추가 요금 관리
 * - 취소 정책 시스템
 */

import 'dotenv/config';
import { getDatabase } from '../utils/database';

async function addLodgingVerificationColumns() {
  const db = getDatabase();

  console.log('🏨 숙박 검증 시스템 마이그레이션 시작\n');
  console.log('='.repeat(60));

  try {
    // Step 1: 기존 컬럼 확인
    console.log('\n📋 Step 1: 기존 lodging_bookings 컬럼 확인');

    const existingColumns = await db.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'lodging_bookings'
    `);

    const columnNames = existingColumns.map((col: any) => col.COLUMN_NAME);
    console.log(`   현재 컬럼 개수: ${columnNames.length}개`);

    // Step 2: 검증 컬럼 추가
    console.log('\n🔧 Step 2: 검증 컬럼 추가');

    const columnsToAdd = [
      {
        name: 'voucher_code',
        sql: "ADD COLUMN voucher_code VARCHAR(50) UNIQUE COMMENT '예약 확인 코드 (6자리 영숫자)'"
      },
      {
        name: 'qr_code',
        sql: "ADD COLUMN qr_code TEXT COMMENT 'QR 코드 데이터 (Base64 인코딩)'"
      },
      {
        name: 'checked_in_at',
        sql: "ADD COLUMN checked_in_at TIMESTAMP NULL COMMENT '실제 체크인 완료 시각'"
      },
      {
        name: 'checked_in_by',
        sql: "ADD COLUMN checked_in_by VARCHAR(200) COMMENT '체크인 처리자 (프론트 데스크 직원)'"
      },
      {
        name: 'room_condition_checkin',
        sql: "ADD COLUMN room_condition_checkin JSON COMMENT '체크인 시 객실 상태'"
      },
      {
        name: 'checked_out_at',
        sql: "ADD COLUMN checked_out_at TIMESTAMP NULL COMMENT '실제 체크아웃 완료 시각'"
      },
      {
        name: 'checked_out_by',
        sql: "ADD COLUMN checked_out_by VARCHAR(200) COMMENT '체크아웃 처리자'"
      },
      {
        name: 'room_condition_checkout',
        sql: "ADD COLUMN room_condition_checkout JSON COMMENT '체크아웃 시 객실 상태'"
      },
      {
        name: 'minibar_charges',
        sql: "ADD COLUMN minibar_charges JSON COMMENT '미니바 소비 내역'"
      },
      {
        name: 'additional_charges_detail',
        sql: "ADD COLUMN additional_charges_detail JSON COMMENT '추가 요금 상세'"
      },
      {
        name: 'total_additional_charges',
        sql: "ADD COLUMN total_additional_charges INT DEFAULT 0 COMMENT '총 추가 요금'"
      },
      {
        name: 'used_at',
        sql: "ADD COLUMN used_at TIMESTAMP NULL COMMENT '바우처 최초 사용 시각'"
      },
      {
        name: 'cancellation_policy_id',
        sql: "ADD COLUMN cancellation_policy_id INT COMMENT '적용된 취소 정책 ID'"
      }
    ];

    let addedCount = 0;
    let skippedCount = 0;

    for (const col of columnsToAdd) {
      if (columnNames.includes(col.name)) {
        console.log(`   ⏭️  ${col.name} - 이미 존재 (스킵)`);
        skippedCount++;
      } else {
        await db.execute(`ALTER TABLE lodging_bookings ${col.sql}`);
        console.log(`   ✅ ${col.name} - 추가 완료`);
        addedCount++;
      }
    }

    console.log(`\n   결과: ${addedCount}개 추가, ${skippedCount}개 스킵`);

    // Step 3: 인덱스 추가
    console.log('\n📊 Step 3: 인덱스 추가');

    const indexesToAdd = [
      { name: 'idx_voucher_code', sql: 'CREATE INDEX idx_voucher_code ON lodging_bookings(voucher_code)' },
      { name: 'idx_checked_in_at', sql: 'CREATE INDEX idx_checked_in_at ON lodging_bookings(checked_in_at)' },
      { name: 'idx_checked_out_at', sql: 'CREATE INDEX idx_checked_out_at ON lodging_bookings(checked_out_at)' },
      { name: 'idx_used_at', sql: 'CREATE INDEX idx_used_at ON lodging_bookings(used_at)' },
      { name: 'idx_cancellation_policy', sql: 'CREATE INDEX idx_cancellation_policy ON lodging_bookings(cancellation_policy_id)' }
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

    // Step 4: 취소 정책 테이블 생성
    console.log('\n📜 Step 4: lodging_cancellation_policies 테이블 생성');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS lodging_cancellation_policies (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        policy_name VARCHAR(100) NOT NULL COMMENT '정책 이름',
        category VARCHAR(50) NOT NULL COMMENT '카테고리',
        rules_json JSON NOT NULL COMMENT '환불 규칙',
        no_show_penalty_rate INT DEFAULT 100 COMMENT 'No-show 위약금 비율',
        description TEXT COMMENT '정책 설명',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_active (is_active)
      )
    `);

    console.log('   ✅ lodging_cancellation_policies 테이블 생성 완료');

    // Step 5: 기본 취소 정책 데이터 삽입
    console.log('\n📝 Step 5: 기본 취소 정책 데이터 삽입');

    await db.execute(`
      INSERT INTO lodging_cancellation_policies (policy_name, category, rules_json, no_show_penalty_rate, description)
      VALUES
        ('유연한 취소', 'flexible',
         '[{"hours_before_checkin": 24, "refund_rate": 100}, {"hours_before_checkin": 0, "refund_rate": 0}]',
         100,
         '체크인 24시간 전까지 무료 취소 가능. 이후 취소 시 환불 불가.'),

        ('중간 취소', 'moderate',
         '[{"hours_before_checkin": 72, "refund_rate": 100}, {"hours_before_checkin": 24, "refund_rate": 50}, {"hours_before_checkin": 0, "refund_rate": 0}]',
         100,
         '체크인 72시간 전: 100% 환불, 24시간 전: 50% 환불, 이후: 환불 불가.'),

        ('엄격한 취소', 'strict',
         '[{"hours_before_checkin": 168, "refund_rate": 100}, {"hours_before_checkin": 72, "refund_rate": 50}, {"hours_before_checkin": 0, "refund_rate": 0}]',
         100,
         '체크인 7일 전: 100% 환불, 3일 전: 50% 환불, 이후: 환불 불가.'),

        ('환불 불가', 'non_refundable',
         '[{"hours_before_checkin": 0, "refund_rate": 0}]',
         100,
         '예약 후 취소 시 환불 불가. No-show 시에도 100% 요금 부과.')
      ON DUPLICATE KEY UPDATE updated_at = NOW()
    `);

    const policies = await db.query('SELECT * FROM lodging_cancellation_policies');
    console.log(`   ✅ ${policies.length}개 정책 삽입/업데이트 완료`);

    // Step 6: 히스토리 테이블 생성
    console.log('\n📚 Step 6: lodging_booking_history 테이블 생성');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS lodging_booking_history (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL COMMENT 'lodging_bookings.id 참조',
        action VARCHAR(50) NOT NULL COMMENT '액션 타입',
        details JSON COMMENT '액션 상세',
        created_by VARCHAR(200) COMMENT '작업자',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_booking (booking_id),
        INDEX idx_action (action),
        INDEX idx_created (created_at)
      )
    `);

    console.log('   ✅ lodging_booking_history 테이블 생성 완료');

    // Step 7: Foreign Key 추가 시도 (PlanetScale에서는 스킵될 수 있음)
    console.log('\n🔗 Step 7: Foreign Key 제약 조건 추가 시도');

    try {
      await db.execute(`
        ALTER TABLE lodging_bookings
        ADD CONSTRAINT fk_lodging_cancellation_policy
        FOREIGN KEY (cancellation_policy_id)
        REFERENCES lodging_cancellation_policies(id)
      `);
      console.log('   ✅ Foreign Key 제약 조건 추가 완료');
    } catch (error: any) {
      if (error.message.includes('VT10001') || error.message.includes('foreign key')) {
        console.log('   ⚠️  Foreign Key 제약 조건은 PlanetScale에서 지원하지 않음 (스킵)');
      } else {
        console.warn(`   ⚠️  Foreign Key 추가 실패: ${error.message}`);
      }
    }

    // Step 8: 최종 컬럼 확인
    console.log('\n✅ Step 8: 최종 컬럼 확인');

    const finalColumns = await db.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'lodging_bookings'
      AND COLUMN_NAME IN (
        'voucher_code', 'qr_code', 'checked_in_at', 'checked_in_by',
        'room_condition_checkin', 'checked_out_at', 'checked_out_by',
        'room_condition_checkout', 'minibar_charges', 'additional_charges_detail',
        'total_additional_charges', 'used_at', 'cancellation_policy_id'
      )
    `);

    console.log(`   발견된 검증 컬럼: ${finalColumns.length}/13개`);
    finalColumns.forEach((col: any) => console.log(`   - ${col.COLUMN_NAME}`));

    console.log('\n' + '='.repeat(60));
    console.log('✅ 숙박 검증 시스템 마이그레이션 완료!');
    console.log('='.repeat(60));

    console.log('\n📊 마이그레이션 요약:');
    console.log(`   - 검증 컬럼: ${addedCount}개 추가 (${skippedCount}개 스킵)`);
    console.log(`   - 인덱스: ${indexAddedCount}개 생성 (${indexSkippedCount}개 스킵)`);
    console.log(`   - 취소 정책: ${policies.length}개 등록`);
    console.log('   - 히스토리 테이블: 생성 완료');

    console.log('\n🎯 다음 단계:');
    console.log('   1. API 구현 (generate-voucher, verify, check-in, check-out)');
    console.log('   2. 서버 라우트 등록');
    console.log('   3. 통합 테스트 실행');

  } catch (error) {
    console.error('\n❌ 마이그레이션 실패:', error);
    throw error;
  }
}

// 실행
addLodgingVerificationColumns()
  .then(() => {
    console.log('\n✅ 스크립트 정상 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });

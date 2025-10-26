/**
 * 렌트카 검증 시스템 컬럼 추가 마이그레이션
 *
 * 목적:
 * - QR 코드/바우처 기반 예약 확인
 * - 차량 인수/반납 체크인/체크아웃
 * - 차량 상태 점검 기록
 * - 취소 정책 및 노쇼 관리
 */

import 'dotenv/config';
import { getDatabase } from '../utils/database';

async function addRentcarVerificationColumns() {
  const db = getDatabase();

  console.log('🚗 렌트카 검증 시스템 컬럼 추가 시작...\n');

  try {
    // 1. 기존 컬럼 확인
    console.log('📋 1단계: 기존 컬럼 확인 중...');
    const existingColumns = await db.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'rentcar_bookings'
    `);

    const columnNames = existingColumns.map((col: any) => col.COLUMN_NAME);
    console.log(`   현재 rentcar_bookings 테이블 컬럼 수: ${columnNames.length}개`);

    // 2. 각 컬럼 개별 추가
    const columnsToAdd = [
      {
        name: 'voucher_code',
        sql: "ADD COLUMN voucher_code VARCHAR(50) UNIQUE COMMENT '예약 확인 코드'"
      },
      {
        name: 'qr_code',
        sql: "ADD COLUMN qr_code TEXT COMMENT 'QR 코드 데이터'"
      },
      {
        name: 'pickup_checked_in_at',
        sql: "ADD COLUMN pickup_checked_in_at DATETIME COMMENT '차량 인수 시각'"
      },
      {
        name: 'pickup_checked_in_by',
        sql: "ADD COLUMN pickup_checked_in_by VARCHAR(100) COMMENT '인수 처리자'"
      },
      {
        name: 'pickup_vehicle_condition',
        sql: "ADD COLUMN pickup_vehicle_condition JSON COMMENT '인수 시 차량 상태'"
      },
      {
        name: 'return_checked_out_at',
        sql: "ADD COLUMN return_checked_out_at DATETIME COMMENT '차량 반납 시각'"
      },
      {
        name: 'return_checked_out_by',
        sql: "ADD COLUMN return_checked_out_by VARCHAR(100) COMMENT '반납 처리자'"
      },
      {
        name: 'return_vehicle_condition',
        sql: "ADD COLUMN return_vehicle_condition JSON COMMENT '반납 시 차량 상태'"
      },
      {
        name: 'used_at',
        sql: "ADD COLUMN used_at DATETIME COMMENT '바우처 사용 시각'"
      },
      {
        name: 'cancellation_reason',
        sql: "ADD COLUMN cancellation_reason TEXT COMMENT '취소/노쇼 사유'"
      },
      {
        name: 'no_show_at',
        sql: "ADD COLUMN no_show_at DATETIME COMMENT '노쇼 기록 시각'"
      },
      {
        name: 'cancellation_policy_id',
        sql: "ADD COLUMN cancellation_policy_id BIGINT COMMENT '취소 정책 ID'"
      }
    ];

    console.log('\n📦 2단계: 검증 컬럼 추가 중...');
    let addedCount = 0;
    let skippedCount = 0;

    for (const col of columnsToAdd) {
      if (columnNames.includes(col.name)) {
        console.log(`   ⏭️  ${col.name} - 이미 존재 (스킵)`);
        skippedCount++;
      } else {
        try {
          await db.execute(`ALTER TABLE rentcar_bookings ${col.sql}`);
          console.log(`   ✅ ${col.name} - 추가 완료`);
          addedCount++;
        } catch (error: any) {
          // 컬럼이 이미 존재하는 경우 에러 무시
          if (error.message?.includes('Duplicate column')) {
            console.log(`   ⏭️  ${col.name} - 이미 존재 (스킵)`);
            skippedCount++;
          } else {
            throw error;
          }
        }
      }
    }

    // 3. 인덱스 추가
    console.log('\n🔍 3단계: 인덱스 추가 중...');

    const indexesToAdd = [
      { name: 'idx_voucher_code', sql: 'ADD INDEX idx_voucher_code (voucher_code)' },
      { name: 'idx_used_at', sql: 'ADD INDEX idx_used_at (used_at)' },
      { name: 'idx_pickup_checked_in', sql: 'ADD INDEX idx_pickup_checked_in (pickup_checked_in_at)' },
      { name: 'idx_return_checked_out', sql: 'ADD INDEX idx_return_checked_out (return_checked_out_at)' },
      { name: 'idx_no_show', sql: 'ADD INDEX idx_no_show (no_show_at, status)' }
    ];

    for (const idx of indexesToAdd) {
      try {
        await db.execute(`ALTER TABLE rentcar_bookings ${idx.sql}`);
        console.log(`   ✅ ${idx.name} - 추가 완료`);
      } catch (error: any) {
        if (error.message?.includes('Duplicate key name')) {
          console.log(`   ⏭️  ${idx.name} - 이미 존재 (스킵)`);
        } else {
          console.warn(`   ⚠️  ${idx.name} - 추가 실패 (무시):`, error.message);
        }
      }
    }

    // 4. 취소 정책 테이블 생성
    console.log('\n📜 4단계: 취소 정책 테이블 생성 중...');

    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS cancellation_policies (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          policy_name VARCHAR(100) NOT NULL COMMENT '정책명',
          category VARCHAR(50) NOT NULL COMMENT '카테고리',
          rules_json JSON NOT NULL COMMENT '환불 규칙 JSON',
          no_show_penalty_rate INT DEFAULT 100 COMMENT '노쇼 페널티 비율',
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_category_active (category, is_active)
        ) COMMENT '취소 정책 테이블'
      `);
      console.log('   ✅ cancellation_policies 테이블 생성 완료');

      // 기본 정책 삽입
      const existingPolicies = await db.query(`
        SELECT COUNT(*) as count FROM cancellation_policies WHERE category = 'rentcar'
      `);

      if (existingPolicies[0].count === 0) {
        await db.execute(`
          INSERT INTO cancellation_policies (policy_name, category, rules_json, no_show_penalty_rate)
          VALUES (
            '렌트카 표준 취소 정책',
            'rentcar',
            JSON_ARRAY(
              JSON_OBJECT('hours_before', 72, 'refund_rate', 100, 'description', '3일 전: 100% 환불'),
              JSON_OBJECT('hours_before', 48, 'refund_rate', 80, 'description', '2일 전: 80% 환불'),
              JSON_OBJECT('hours_before', 24, 'refund_rate', 50, 'description', '1일 전: 50% 환불'),
              JSON_OBJECT('hours_before', 0, 'refund_rate', 0, 'description', '당일 취소: 환불 불가')
            ),
            100
          )
        `);
        console.log('   ✅ 기본 렌트카 취소 정책 추가됨');
      } else {
        console.log('   ⏭️  기본 정책 이미 존재 (스킵)');
      }

    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log('   ⏭️  cancellation_policies 테이블 이미 존재');
      } else {
        console.warn('   ⚠️  테이블 생성 실패 (무시):', error.message);
      }
    }

    // 5. 외래키 추가 (선택적)
    console.log('\n🔗 5단계: 외래키 제약 조건 추가 중...');

    try {
      await db.execute(`
        ALTER TABLE rentcar_bookings
        ADD CONSTRAINT fk_rentcar_booking_policy
        FOREIGN KEY (cancellation_policy_id)
        REFERENCES cancellation_policies(id)
        ON DELETE SET NULL
      `);
      console.log('   ✅ 외래키 제약 조건 추가 완료');
    } catch (error: any) {
      if (error.message?.includes('Duplicate') || error.message?.includes('already exists')) {
        console.log('   ⏭️  외래키 이미 존재 (스킵)');
      } else {
        console.warn('   ⚠️  외래키 추가 실패 (무시):', error.message);
      }
    }

    // 6. 최종 스키마 확인
    console.log('\n🔍 6단계: 최종 스키마 확인 중...');

    const finalColumns = await db.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'rentcar_bookings'
      AND COLUMN_NAME IN (
        'voucher_code', 'qr_code', 'pickup_checked_in_at', 'pickup_checked_in_by',
        'pickup_vehicle_condition', 'return_checked_out_at', 'return_checked_out_by',
        'return_vehicle_condition', 'used_at', 'cancellation_reason', 'no_show_at',
        'cancellation_policy_id'
      )
    `);

    console.log('\n📊 검증 관련 컬럼 목록:');
    finalColumns.forEach((col: any) => {
      console.log(`   - ${col.COLUMN_NAME} (${col.COLUMN_TYPE}) ${col.COLUMN_COMMENT ? '// ' + col.COLUMN_COMMENT : ''}`);
    });

    console.log('\n✅ 마이그레이션 완료!');
    console.log(`   추가된 컬럼: ${addedCount}개`);
    console.log(`   스킵된 컬럼: ${skippedCount}개`);
    console.log(`   총 검증 관련 컬럼: ${finalColumns.length}개\n`);

  } catch (error) {
    console.error('\n❌ 마이그레이션 실패:', error);
    throw error;
  }
}

// 실행
addRentcarVerificationColumns()
  .then(() => {
    console.log('🎉 렌트카 검증 시스템 DB 구성 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 실행 실패:', error);
    process.exit(1);
  });

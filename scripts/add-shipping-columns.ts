/**
 * 배송 정보 컬럼 추가 마이그레이션 실행 스크립트
 *
 * PG사 심사 및 전자상거래법 대응:
 * - 배송지 정보 저장
 * - 배송 상태 관리
 * - 송장번호 추적
 */

import 'dotenv/config';
import { getDatabase } from '../utils/database';
import fs from 'fs';
import path from 'path';

async function addShippingColumns() {
  const db = getDatabase();

  console.log('🚀 배송 정보 컬럼 추가 시작...\n');

  try {
    // 1. 기존 컬럼 확인
    console.log('📋 1단계: 기존 컬럼 확인 중...');
    const existingColumns = await db.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
    `);

    const columnNames = existingColumns.map((col: any) => col.COLUMN_NAME);
    console.log(`   현재 bookings 테이블 컬럼 수: ${columnNames.length}개`);

    // 2. 각 컬럼 개별 추가 (이미 존재하면 스킵)
    const columnsToAdd = [
      {
        name: 'shipping_name',
        sql: "ADD COLUMN shipping_name VARCHAR(100) COMMENT '수령인 이름'"
      },
      {
        name: 'shipping_phone',
        sql: "ADD COLUMN shipping_phone VARCHAR(20) COMMENT '수령인 전화번호'"
      },
      {
        name: 'shipping_address',
        sql: "ADD COLUMN shipping_address VARCHAR(255) COMMENT '배송지 기본 주소'"
      },
      {
        name: 'shipping_address_detail',
        sql: "ADD COLUMN shipping_address_detail VARCHAR(255) COMMENT '배송지 상세 주소'"
      },
      {
        name: 'shipping_zipcode',
        sql: "ADD COLUMN shipping_zipcode VARCHAR(10) COMMENT '우편번호'"
      },
      {
        name: 'shipping_memo',
        sql: "ADD COLUMN shipping_memo VARCHAR(255) COMMENT '배송 요청사항'"
      },
      {
        name: 'tracking_number',
        sql: "ADD COLUMN tracking_number VARCHAR(50) COMMENT '택배 송장번호'"
      },
      {
        name: 'courier_company',
        sql: "ADD COLUMN courier_company VARCHAR(50) COMMENT '택배사명'"
      },
      {
        name: 'delivery_status',
        sql: "ADD COLUMN delivery_status ENUM('PENDING', 'READY', 'SHIPPING', 'DELIVERED', 'CANCELED') DEFAULT 'PENDING' COMMENT '배송 상태'"
      },
      {
        name: 'shipped_at',
        sql: "ADD COLUMN shipped_at DATETIME COMMENT '발송 처리 시각'"
      },
      {
        name: 'delivered_at',
        sql: "ADD COLUMN delivered_at DATETIME COMMENT '배송 완료 시각'"
      }
    ];

    console.log('\n📦 2단계: 배송 컬럼 추가 중...');
    let addedCount = 0;
    let skippedCount = 0;

    for (const column of columnsToAdd) {
      if (columnNames.includes(column.name)) {
        console.log(`   ⏭️  ${column.name} - 이미 존재 (스킵)`);
        skippedCount++;
      } else {
        try {
          await db.execute(`ALTER TABLE bookings ${column.sql}`);
          console.log(`   ✅ ${column.name} - 추가 완료`);
          addedCount++;
        } catch (error: any) {
          console.error(`   ❌ ${column.name} - 추가 실패:`, error.message);
        }
      }
    }

    // 3. 인덱스 추가
    console.log('\n🔍 3단계: 인덱스 추가 중...');

    const indexes = [
      {
        name: 'idx_delivery_status',
        sql: 'ADD INDEX idx_delivery_status (delivery_status, created_at)'
      },
      {
        name: 'idx_tracking_number',
        sql: 'ADD INDEX idx_tracking_number (tracking_number)'
      },
      {
        name: 'idx_delivered_at',
        sql: 'ADD INDEX idx_delivered_at (delivered_at)'
      }
    ];

    for (const index of indexes) {
      try {
        await db.execute(`ALTER TABLE bookings ${index.sql}`);
        console.log(`   ✅ ${index.name} - 추가 완료`);
      } catch (error: any) {
        if (error.message.includes('Duplicate key name')) {
          console.log(`   ⏭️  ${index.name} - 이미 존재 (스킵)`);
        } else {
          console.error(`   ⚠️  ${index.name} - 추가 실패:`, error.message);
        }
      }
    }

    // 4. 최종 확인
    console.log('\n🔍 4단계: 최종 스키마 확인 중...');
    const finalColumns = await db.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      AND COLUMN_NAME LIKE '%shipping%' OR COLUMN_NAME LIKE '%delivery%' OR COLUMN_NAME LIKE '%tracking%' OR COLUMN_NAME LIKE '%courier%' OR COLUMN_NAME LIKE '%shipped%' OR COLUMN_NAME LIKE '%delivered%'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\n📊 배송 관련 컬럼 목록:');
    finalColumns.forEach((col: any) => {
      console.log(`   - ${col.COLUMN_NAME} (${col.COLUMN_TYPE}) ${col.COLUMN_COMMENT ? '// ' + col.COLUMN_COMMENT : ''}`);
    });

    console.log('\n✅ 마이그레이션 완료!');
    console.log(`   추가된 컬럼: ${addedCount}개`);
    console.log(`   스킵된 컬럼: ${skippedCount}개`);
    console.log(`   총 배송 관련 컬럼: ${finalColumns.length}개\n`);

  } catch (error) {
    console.error('\n❌ 마이그레이션 실패:', error);
    throw error;
  }
}

// 실행
addShippingColumns()
  .then(() => {
    console.log('🎉 배송 시스템 DB 구성 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 실행 중 오류 발생:', error);
    process.exit(1);
  });

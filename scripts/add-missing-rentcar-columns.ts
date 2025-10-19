import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = connect({ url: process.env.DATABASE_URL });

async function addMissingColumns() {
  console.log('🔧 렌트카 테이블에 부족한 컬럼 추가 시작...\n');

  try {
    // 1. rentcar_vendors 테이블에 컬럼 추가
    console.log('1. rentcar_vendors 테이블 업데이트...');

    // cancellation_policy 컬럼 추가
    try {
      await connection.execute(`
        ALTER TABLE rentcar_vendors
        ADD COLUMN cancellation_policy TEXT DEFAULT NULL
      `);
      console.log('   ✅ cancellation_policy 컬럼 추가됨');
    } catch (e: any) {
      if (e.message.includes('Duplicate column')) {
        console.log('   ⚠️  cancellation_policy 컬럼 이미 존재');
      } else {
        throw e;
      }
    }

    // address 컬럼 추가
    try {
      await connection.execute(`
        ALTER TABLE rentcar_vendors
        ADD COLUMN address VARCHAR(500) DEFAULT NULL
      `);
      console.log('   ✅ address 컬럼 추가됨');
    } catch (e: any) {
      if (e.message.includes('Duplicate column')) {
        console.log('   ⚠️  address 컬럼 이미 존재');
      } else {
        throw e;
      }
    }

    // description 컬럼 추가
    try {
      await connection.execute(`
        ALTER TABLE rentcar_vendors
        ADD COLUMN description TEXT DEFAULT NULL
      `);
      console.log('   ✅ description 컬럼 추가됨');
    } catch (e: any) {
      if (e.message.includes('Duplicate column')) {
        console.log('   ⚠️  description 컬럼 이미 존재');
      } else {
        throw e;
      }
    }

    // logo_url 컬럼 추가
    try {
      await connection.execute(`
        ALTER TABLE rentcar_vendors
        ADD COLUMN logo_url VARCHAR(500) DEFAULT NULL
      `);
      console.log('   ✅ logo_url 컬럼 추가됨');
    } catch (e: any) {
      if (e.message.includes('Duplicate column')) {
        console.log('   ⚠️  logo_url 컬럼 이미 존재');
      } else {
        throw e;
      }
    }

    // images 컬럼 추가
    try {
      await connection.execute(`
        ALTER TABLE rentcar_vendors
        ADD COLUMN images TEXT DEFAULT NULL COMMENT 'JSON array of image URLs'
      `);
      console.log('   ✅ images 컬럼 추가됨');
    } catch (e: any) {
      if (e.message.includes('Duplicate column')) {
        console.log('   ⚠️  images 컬럼 이미 존재');
      } else {
        throw e;
      }
    }

    // 2. rentcar_vehicles 테이블에 컬럼 추가
    console.log('\n2. rentcar_vehicles 테이블 업데이트...');

    // insurance_options 컬럼 추가
    try {
      await connection.execute(`
        ALTER TABLE rentcar_vehicles
        ADD COLUMN insurance_options TEXT DEFAULT NULL
      `);
      console.log('   ✅ insurance_options 컬럼 추가됨');
    } catch (e: any) {
      if (e.message.includes('Duplicate column')) {
        console.log('   ⚠️  insurance_options 컬럼 이미 존재');
      } else {
        throw e;
      }
    }

    // available_options 컬럼 추가
    try {
      await connection.execute(`
        ALTER TABLE rentcar_vehicles
        ADD COLUMN available_options TEXT DEFAULT NULL
      `);
      console.log('   ✅ available_options 컬럼 추가됨');
    } catch (e: any) {
      if (e.message.includes('Duplicate column')) {
        console.log('   ⚠️  available_options 컬럼 이미 존재');
      } else {
        throw e;
      }
    }

    // excess_mileage_fee_krw 컬럼 추가
    try {
      await connection.execute(`
        ALTER TABLE rentcar_vehicles
        ADD COLUMN excess_mileage_fee_krw INT DEFAULT 100
      `);
      console.log('   ✅ excess_mileage_fee_krw 컬럼 추가됨');
    } catch (e: any) {
      if (e.message.includes('Duplicate column')) {
        console.log('   ⚠️  excess_mileage_fee_krw 컬럼 이미 존재');
      } else {
        throw e;
      }
    }

    // fuel_efficiency 컬럼 추가
    try {
      await connection.execute(`
        ALTER TABLE rentcar_vehicles
        ADD COLUMN fuel_efficiency DECIMAL(5,2) DEFAULT NULL COMMENT 'km/L'
      `);
      console.log('   ✅ fuel_efficiency 컬럼 추가됨');
    } catch (e: any) {
      if (e.message.includes('Duplicate column')) {
        console.log('   ⚠️  fuel_efficiency 컬럼 이미 존재');
      } else {
        throw e;
      }
    }

    // self_insurance_krw 컬럼 추가 (자기부담금)
    try {
      await connection.execute(`
        ALTER TABLE rentcar_vehicles
        ADD COLUMN self_insurance_krw INT DEFAULT 500000 COMMENT '사고 시 자기부담금'
      `);
      console.log('   ✅ self_insurance_krw 컬럼 추가됨');
    } catch (e: any) {
      if (e.message.includes('Duplicate column')) {
        console.log('   ⚠️  self_insurance_krw 컬럼 이미 존재');
      } else {
        throw e;
      }
    }

    console.log('\n✅ 모든 컬럼 추가 완료!');

    // 3. 기본값 설정
    console.log('\n3. 기본값 설정 중...');
    await connection.execute(`
      UPDATE rentcar_vendors
      SET cancellation_policy = '예약 3일 전: 전액 환불\n예약 1-2일 전: 50% 환불\n예약 당일: 환불 불가'
      WHERE cancellation_policy IS NULL
    `);
    console.log('   ✅ 업체 취소 정책 기본값 설정');

    await connection.execute(`
      UPDATE rentcar_vehicles
      SET
        insurance_options = '자차보험, 대인배상, 대물배상',
        available_options = 'GPS, 블랙박스, 하이패스',
        excess_mileage_fee_krw = 100,
        fuel_efficiency = 12.5,
        self_insurance_krw = 500000
      WHERE insurance_options IS NULL
    `);
    console.log('   ✅ 차량 기본값 설정');

    console.log('\n🎉 완료!');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

addMissingColumns();

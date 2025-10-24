import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function addUserAddressColumns() {
  const conn = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🔧 users 테이블에 주소 컬럼 추가 중...');

    // postal_code 컬럼 추가
    try {
      await conn.execute(`
        ALTER TABLE users
        ADD COLUMN postal_code VARCHAR(10)
      `);
      console.log('✅ postal_code 컬럼 추가 완료');
    } catch (error: any) {
      if (error.message?.includes('Duplicate column')) {
        console.log('ℹ️  postal_code 컬럼이 이미 존재합니다');
      } else {
        throw error;
      }
    }

    // address 컬럼 추가
    try {
      await conn.execute(`
        ALTER TABLE users
        ADD COLUMN address VARCHAR(500)
      `);
      console.log('✅ address 컬럼 추가 완료');
    } catch (error: any) {
      if (error.message?.includes('Duplicate column')) {
        console.log('ℹ️  address 컬럼이 이미 존재합니다');
      } else {
        throw error;
      }
    }

    // detail_address 컬럼 추가
    try {
      await conn.execute(`
        ALTER TABLE users
        ADD COLUMN detail_address VARCHAR(500)
      `);
      console.log('✅ detail_address 컬럼 추가 완료');
    } catch (error: any) {
      if (error.message?.includes('Duplicate column')) {
        console.log('ℹ️  detail_address 컬럼이 이미 존재합니다');
      } else {
        throw error;
      }
    }

    console.log('🎉 모든 주소 컬럼 추가 완료!');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

addUserAddressColumns();

// contacts 테이블 구조 확인
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

async function checkContactsTable() {
  try {
    const conn = connect(config);

    console.log('🔍 contacts 테이블 구조 확인 중...\n');

    const result = await conn.execute('DESCRIBE contacts');

    console.log('📋 contacts 테이블 컬럼:');
    console.table(result.rows);

  } catch (error) {
    console.error('❌ 오류:', error);
  }

  process.exit(0);
}

checkContactsTable();

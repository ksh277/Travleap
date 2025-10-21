// reviews 테이블 구조 확인
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

async function checkReviewsTable() {
  try {
    const conn = connect(config);

    console.log('🔍 reviews 테이블 구조 확인 중...\n');

    const result = await conn.execute('DESCRIBE reviews');

    console.log('📋 reviews 테이블 컬럼:');
    console.table(result.rows);

    // 샘플 데이터 1개 조회
    const sampleResult = await conn.execute('SELECT * FROM reviews LIMIT 1');
    console.log('\n📝 샘플 데이터:');
    console.log(JSON.stringify(sampleResult.rows[0], null, 2));

  } catch (error) {
    console.error('❌ 오류:', error);
  }

  process.exit(0);
}

checkReviewsTable();

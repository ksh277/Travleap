/**
 * listings 테이블 스키마 확인
 */
import dotenv from 'dotenv';
dotenv.config();

import { db } from './utils/database.js';

async function showSchema() {
  console.log('\n📋 listings 테이블 스키마');
  console.log('='.repeat(50));

  try {
    // DESCRIBE listings 실행
    const columns = await db.query('DESCRIBE listings');

    console.log('\n컬럼 정보:');
    columns.forEach((col: any) => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? '필수' : '선택'}`);
    });

    // 샘플 데이터 1개 조회
    console.log('\n\n샘플 데이터:');
    console.log('='.repeat(50));
    const sample = await db.query('SELECT * FROM listings LIMIT 1');

    if (sample.length > 0) {
      console.log(JSON.stringify(sample[0], null, 2));
    }

    return columns;

  } catch (error: any) {
    console.error('❌ 스키마 조회 실패:', error.message);
    return [];
  }
}

showSchema().then(() => process.exit(0));

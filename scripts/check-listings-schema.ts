import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

async function checkListingsSchema() {
  const conn = connect(config);

  console.log('🔍 listings 테이블 스키마 확인\n');

  // 테이블 스키마 확인
  const schema = await conn.execute('DESCRIBE listings');

  console.log('📋 listings 테이블 컬럼 정보:');
  console.log('─'.repeat(80));
  schema.rows.forEach((col: any) => {
    const defaultValue = col.Default === null ? 'NULL' : col.Default;
    console.log(`  ${col.Field.padEnd(20)} ${col.Type.padEnd(20)} Default: ${defaultValue}`);

    if (col.Field === 'rating_count' || col.Field === 'rating_avg') {
      console.log(`  👆 ${col.Field === 'rating_count' ? 'rating_count' : 'rating_avg'} - 기본값: ${defaultValue}`);
    }
  });
  console.log('─'.repeat(80));

  // rating 관련 컬럼의 기본값 확인
  const ratingCountCol = schema.rows.find((col: any) => col.Field === 'rating_count');
  const ratingAvgCol = schema.rows.find((col: any) => col.Field === 'rating_avg');

  console.log('\n✅ rating 컬럼 기본값 검증:');

  if (ratingCountCol) {
    const defaultValue = ratingCountCol.Default;
    if (defaultValue === '0' || defaultValue === 0) {
      console.log('  ✅ rating_count 기본값: 0 (정상)');
    } else {
      console.log(`  ❌ rating_count 기본값: ${defaultValue} (문제: 0이어야 함)`);
    }
  } else {
    console.log('  ❌ rating_count 컬럼이 없습니다!');
  }

  if (ratingAvgCol) {
    const defaultValue = ratingAvgCol.Default;
    if (defaultValue === '0' || defaultValue === 0 || defaultValue === '0.00') {
      console.log('  ✅ rating_avg 기본값: 0 (정상)');
    } else {
      console.log(`  ❌ rating_avg 기본값: ${defaultValue} (문제: 0이어야 함)`);
    }
  } else {
    console.log('  ❌ rating_avg 컬럼이 없습니다!');
  }

  // 새로 추가된 상품 중 rating이 제대로 초기화된 것 확인
  console.log('\n📊 최근 추가된 상품 5개의 rating 상태:');
  const recent = await conn.execute(`
    SELECT id, title, rating_count, rating_avg, created_at
    FROM listings
    ORDER BY created_at DESC
    LIMIT 5
  `);

  recent.rows.forEach((row: any) => {
    const status = (row.rating_count === 0 && row.rating_avg === 0) ? '✅' : '❌';
    console.log(`  ${status} [ID: ${row.id}] ${row.title}`);
    console.log(`     rating_count: ${row.rating_count}, rating_avg: ${row.rating_avg}`);
  });

  process.exit(0);
}

checkListingsSchema().catch(error => {
  console.error('❌ 에러:', error);
  process.exit(1);
});

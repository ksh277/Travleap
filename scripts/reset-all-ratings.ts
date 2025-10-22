import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

async function resetAllRatings() {
  const conn = connect(config);

  console.log('🔄 모든 listings의 rating을 0으로 초기화 중...\n');

  const result = await conn.execute(`
    UPDATE listings
    SET rating_count = 0, rating_avg = 0
    WHERE rating_count > 0 OR rating_avg > 0
  `);

  console.log(`✅ ${result.rowsAffected}개 상품의 rating이 0으로 초기화되었습니다.\n`);

  // 확인
  const check = await conn.execute(`
    SELECT COUNT(*) as count
    FROM listings
    WHERE rating_count > 0 OR rating_avg > 0
  `);

  console.log(`🔍 초기화 후 확인: rating_count > 0인 상품 = ${check.rows[0].count}개`);

  if (check.rows[0].count === 0) {
    console.log('✅ 모든 상품의 rating이 정상적으로 0으로 초기화되었습니다!');
  } else {
    console.log('❌ 일부 상품의 rating이 초기화되지 않았습니다.');
  }

  process.exit(0);
}

resetAllRatings().catch(error => {
  console.error('❌ 에러:', error);
  process.exit(1);
});

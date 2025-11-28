/**
 * user_coupons 테이블에서 coupon_code가 NULL인 오래된 테스트 데이터 정리
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function cleanup() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 1. 확인: coupon_code가 NULL인 레코드
    console.log('🔍 coupon_code가 NULL인 레코드 확인...\n');

    const nullRecords = await connection.execute(`
      SELECT id, user_id, coupon_id, status
      FROM user_coupons
      WHERE coupon_code IS NULL
    `);

    if (nullRecords.rows.length === 0) {
      console.log('✅ coupon_code가 NULL인 레코드 없음');
      return;
    }

    console.log(`⚠️ coupon_code가 NULL인 레코드: ${nullRecords.rows.length}개`);
    console.table(nullRecords.rows);

    // 2. 삭제
    console.log('\n🗑️ 삭제 중...');

    const deleteResult = await connection.execute(`
      DELETE FROM user_coupons WHERE coupon_code IS NULL
    `);

    console.log(`✅ ${deleteResult.rowsAffected}개 레코드 삭제 완료`);

    // 3. 확인
    const afterCount = await connection.execute(`
      SELECT COUNT(*) as count FROM user_coupons
    `);

    console.log(`\n📊 남은 user_coupons 레코드: ${afterCount.rows[0].count}개`);

  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

cleanup();

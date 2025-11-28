/**
 * 테스트 데이터 정리 스크립트
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

async function cleanup() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('🧹 테스트 데이터 정리 시작...\n');

  // 첫 번째 테스트에서 실패한 user_coupon_id=11 정리
  try {
    await conn.execute('DELETE FROM user_coupons WHERE id = 11');
    console.log('✅ user_coupon_id=11 정리 완료');
  } catch (e) {
    console.log('⚠️ user_coupon_id=11 이미 없음 또는 오류');
  }

  // 대기 리뷰 상태 확인
  const pending = await conn.execute(`
    SELECT uc.id, uc.coupon_code, uc.status, uc.review_submitted, uc.used_at
    FROM user_coupons uc
    WHERE uc.status = 'USED' AND uc.review_submitted = 0
  `);

  console.log('\n📋 대기 리뷰 현황:', pending.rows?.length || 0, '개');
  if (pending.rows?.length > 0) {
    pending.rows.forEach(r => console.log(`  - ID: ${r.id}, code: ${r.coupon_code}, used_at: ${r.used_at}`));
  }

  console.log('\n✅ 정리 완료');
}

cleanup();

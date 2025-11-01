/**
 * 포인트 사용 내역 확인 스크립트
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function check() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // point_type별 통계
    const statsResult = await connection.execute(`
      SELECT point_type, COUNT(*) as count, SUM(points) as total
      FROM user_points
      GROUP BY point_type
    `);

    console.log('\n📊 포인트 타입별 통계:\n');
    for (const row of (statsResult.rows || [])) {
      let typeLabel = row.point_type;
      if (row.point_type === 'earn') typeLabel = '적립 (earn)';
      else if (row.point_type === 'use') typeLabel = '사용 (use)';
      else if (row.point_type === 'refund') typeLabel = '회수 (refund)';

      console.log(`   ${typeLabel}: ${row.count}건, 합계 ${row.total}P`);
    }

    // 'use' 타입 최근 10건
    const useResult = await connection.execute(`
      SELECT user_id, points, reason, related_order_id, created_at
      FROM user_points
      WHERE point_type = 'use'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`\n💰 포인트 사용 내역 (최근 10건):\n`);
    if (useResult.rows && useResult.rows.length > 0) {
      for (const row of useResult.rows) {
        console.log(`   [${row.created_at}]`);
        console.log(`   사용자 ID: ${row.user_id}`);
        console.log(`   포인트: ${row.points}P`);
        console.log(`   사유: ${row.reason}`);
        console.log(`   주문 ID: ${row.related_order_id}\n`);
      }
    } else {
      console.log('   ⚠️  포인트 사용 내역이 없습니다.');
      console.log('   → 아직 아무도 포인트를 사용해서 결제하지 않았습니다.\n');
    }

    // 환불 시 포인트 회수 내역
    const refundResult = await connection.execute(`
      SELECT user_id, points, reason, related_order_id, created_at
      FROM user_points
      WHERE point_type = 'refund'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`\n🔄 포인트 회수 내역 (최근 10건):\n`);
    if (refundResult.rows && refundResult.rows.length > 0) {
      for (const row of refundResult.rows) {
        console.log(`   [${row.created_at}]`);
        console.log(`   사용자 ID: ${row.user_id}`);
        console.log(`   포인트: ${row.points}P`);
        console.log(`   사유: ${row.reason}\n`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 오류:', error);
    process.exit(1);
  }
}

check();

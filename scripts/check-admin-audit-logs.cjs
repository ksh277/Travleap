require('dotenv').config();
const { connect } = require('@planetscale/database');

console.log('🔍 admin_audit_logs 조회\n');

(async () => {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 최근 10개 감사 로그 조회
    const result = await connection.execute(`
      SELECT
        aal.id,
        aal.admin_id,
        aal.action,
        aal.target_type,
        aal.target_id,
        aal.details,
        aal.ip_address,
        aal.created_at
      FROM admin_audit_logs aal
      ORDER BY aal.created_at DESC
      LIMIT 10
    `);

    if (!result.rows || result.rows.length === 0) {
      console.log('📋 감사 로그가 없습니다.');
      console.log('\nℹ️ 관리자가 환불 등의 작업을 수행하면 여기에 기록됩니다.');
      return;
    }

    console.log(`📋 최근 ${result.rows.length}개 감사 로그:\n`);

    result.rows.forEach((log, i) => {
      console.log(`${i + 1}. [${log.id}] ${log.action.toUpperCase()}`);
      console.log(`   관리자 ID: ${log.admin_id}`);
      console.log(`   대상: ${log.target_type} (ID: ${log.target_id})`);
      console.log(`   IP: ${log.ip_address}`);
      console.log(`   시간: ${new Date(log.created_at).toLocaleString('ko-KR')}`);

      if (log.details) {
        try {
          const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
          console.log('   상세 정보:');
          if (details.payment_key) console.log(`     - Payment Key: ${details.payment_key.substring(0, 20)}...`);
          if (details.original_amount) console.log(`     - 원금액: ₩${details.original_amount.toLocaleString()}`);
          if (details.refund_amount) console.log(`     - 환불금액: ₩${details.refund_amount.toLocaleString()}`);
          if (details.cancel_reason) console.log(`     - 사유: ${details.cancel_reason}`);
          if (details.admin_email) console.log(`     - 관리자: ${details.admin_email}`);
          if (details.toss_success !== undefined) console.log(`     - Toss 처리: ${details.toss_success ? '✅' : '❌'}`);
        } catch (e) {
          console.log('   상세 정보: (파싱 실패)');
        }
      }

      console.log('');
    });

    // 통계
    const statsResult = await connection.execute(`
      SELECT
        action,
        COUNT(*) as count,
        MAX(created_at) as last_action
      FROM admin_audit_logs
      GROUP BY action
      ORDER BY count DESC
    `);

    if (statsResult.rows && statsResult.rows.length > 0) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 작업 통계:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      statsResult.rows.forEach(stat => {
        console.log(`${stat.action.padEnd(10)}: ${stat.count}회 (최근: ${new Date(stat.last_action).toLocaleString('ko-KR')})`);
      });
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error);
  }
})();

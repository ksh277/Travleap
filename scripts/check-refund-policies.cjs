const { connect } = require('@planetscale/database');
require('dotenv').config();

(async () => {
  const db = connect({ url: process.env.DATABASE_URL });

  console.log('📋 refund_policies 테이블 조회:\n');

  try {
    const result = await db.execute('SELECT * FROM refund_policies WHERE is_active = 1 ORDER BY priority DESC, category');

    if (result.rows && result.rows.length > 0) {
      console.log(`✅ ${result.rows.length}개의 활성화된 환불 정책 발견:\n`);
      result.rows.forEach(policy => {
        console.log(`  ID: ${policy.id}`);
        console.log(`  정책명: ${policy.policy_name}`);
        console.log(`  카테고리: ${policy.category || '기본'}`);
        console.log(`  상품ID: ${policy.listing_id || 'null'}`);
        console.log(`  우선순위: ${policy.priority}`);
        console.log(`  환불가능: ${policy.is_refundable}`);
        console.log(`  정책: ${JSON.stringify(policy.refund_policy_json, null, 2)}`);
        console.log('');
      });
    } else {
      console.log('⚠️  refund_policies 테이블에 활성화된 정책이 없습니다.');
      console.log('   → API는 하드코딩된 기본 정책을 사용합니다.');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
})();

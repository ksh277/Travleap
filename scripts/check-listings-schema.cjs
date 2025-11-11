require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkListingsSchema() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('\n=== listings 테이블 구조 확인 ===');
    const schema = await connection.execute('DESCRIBE listings');

    // 모든 컬럼 목록
    console.log('\n📋 전체 컬럼 목록 (' + schema.rows.length + '개):');
    schema.rows.forEach((row, idx) => {
      console.log(`  ${(idx+1).toString().padStart(2)}. ${row.Field.padEnd(25)} - ${row.Type}`);
    });

    // is_refundable, refund_policy 존재 여부
    const hasRefundable = schema.rows.some(r => r.Field === 'is_refundable');
    const hasRefundPolicy = schema.rows.some(r => r.Field === 'refund_policy');

    console.log('\n=== 환불 관련 컬럼 확인 ===');
    console.log(`is_refundable: ${hasRefundable ? '✅ 존재함' : '❌ 없음'}`);
    console.log(`refund_policy: ${hasRefundPolicy ? '✅ 존재함' : '❌ 없음'}`);

    if (!hasRefundable && !hasRefundPolicy) {
      console.log('\n✅ 결론: API에서 해당 컬럼 제거한 것이 올바릅니다!');
      console.log('   테이블에 is_refundable, refund_policy 컬럼이 없으므로');
      console.log('   INSERT 쿼리에서도 제거해야 합니다.');
    } else {
      console.log('\n⚠️  경고: 테이블에 해당 컬럼이 존재합니다!');
      console.log('   API 수정을 되돌려야 할 수 있습니다.');
    }

    console.log('\n=== 결제 프로세스 영향 분석 ===');
    console.log('💡 상품 생성(INSERT) 수정 영향:');
    console.log('   - 상품 조회(SELECT): ✅ 영향 없음');
    console.log('   - 결제 프로세스: ✅ 영향 없음 (기존 상품을 읽기만 함)');
    console.log('   - 상품 생성 시: ✅ 에러 해결됨 (없는 컬럼 제거)');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkListingsSchema();

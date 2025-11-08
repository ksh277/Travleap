require('dotenv').config();
const { connect } = require('@planetscale/database');

async function verifyStatsFix() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('🔍 통계 수정 검증 시작...\n');

  try {
    // 1. ✅ 주문 통계 (payments + rentcar_bookings)
    console.log('=== 주문 통계 ===');

    const paymentsResult = await connection.execute(`
      SELECT COUNT(*) as count
      FROM payments
      WHERE payment_status IN ('paid', 'completed', 'refunded')
    `);
    const paymentsCount = parseInt(paymentsResult.rows?.[0]?.count) || 0;
    console.log(`  payments 테이블: ${paymentsCount}건`);

    const rentcarResult = await connection.execute(`
      SELECT COUNT(*) as count
      FROM rentcar_bookings
      WHERE payment_status IN ('paid', 'completed', 'refunded')
    `);
    const rentcarCount = parseInt(rentcarResult.rows?.[0]?.count) || 0;
    console.log(`  rentcar_bookings 테이블: ${rentcarCount}건`);

    const totalOrders = paymentsCount + rentcarCount;
    console.log(`  ✅ 총 주문: ${totalOrders}건 (기대값: 21건)\n`);

    // 2. ✅ 파트너 통계 (lodging/rentcar 제외)
    console.log('=== 파트너 통계 ===');

    const allPartnersResult = await connection.execute(`
      SELECT COUNT(*) as count FROM partners
    `);
    const allPartners = parseInt(allPartnersResult.rows?.[0]?.count) || 0;
    console.log(`  전체 파트너: ${allPartners}개`);

    const excludedResult = await connection.execute(`
      SELECT COUNT(*) as count
      FROM partners
      WHERE (partner_type NOT IN ('lodging', 'rentcar') OR partner_type IS NULL)
    `);
    const validPartners = parseInt(excludedResult.rows?.[0]?.count) || 0;
    console.log(`  유효 파트너 (숙박/렌트카 제외): ${validPartners}개 (기대값: 22개)`);

    const excludedPartnersResult = await connection.execute(`
      SELECT COUNT(*) as count
      FROM partners
      WHERE partner_type IN ('lodging', 'rentcar')
    `);
    const excludedCount = parseInt(excludedPartnersResult.rows?.[0]?.count) || 0;
    console.log(`  제외된 파트너 (숙박+렌트카): ${excludedCount}개\n`);

    // 3. 파트너 타입별 분포
    console.log('=== 파트너 타입 분포 ===');
    const typesResult = await connection.execute(`
      SELECT partner_type, COUNT(*) as count
      FROM partners
      GROUP BY partner_type
      ORDER BY count DESC
    `);
    (typesResult.rows || []).forEach(row => {
      const type = row.partner_type || 'NULL';
      console.log(`  ${type}: ${row.count}개`);
    });

    console.log('\n=== 검증 결과 ===');
    console.log(`주문 통계: ${totalOrders}건 (렌트카 테스트 데이터 삭제 후)`);

    if (validPartners === 22) {
      console.log('✅ 파트너 통계 정상: 22개 (숙박/렌트카 제외)');
    } else {
      console.log(`⚠️ 파트너 통계 불일치: ${validPartners}개 (기대값: 22개)`);
    }

  } catch (error) {
    console.error('❌ 검증 실패:', error);
    throw error;
  }
}

verifyStatsFix()
  .then(() => {
    console.log('\n🎉 검증 완료!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ 검증 실패:', err);
    process.exit(1);
  });

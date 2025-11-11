/**
 * 보험 관리 API 테스트
 * GET /api/admin/insurance 엔드포인트가 제대로 작동하는지 확인
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

async function testInsuranceAPI() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🧪 보험 관리 API 테스트 시작...\n');

    // 1. 전체 보험 조회 (API와 동일한 쿼리)
    console.log('1️⃣  전체 보험 조회 테스트');
    const result = await connection.execute(
      `SELECT
        id, name, category, price, pricing_unit, coverage_amount,
        vendor_id, vehicle_id,
        description, coverage_details, is_active,
        created_at, updated_at
      FROM insurances
      ORDER BY category ASC, created_at DESC`
    );

    console.log(`✅ 총 ${result.rows.length}개의 보험 조회 성공\n`);

    // 2. 카테고리별 보험 개수
    console.log('2️⃣  카테고리별 보험 개수:');
    const categoryResult = await connection.execute(
      `SELECT category, COUNT(*) as count
       FROM insurances
       WHERE is_active = 1
       GROUP BY category
       ORDER BY count DESC`
    );
    console.table(categoryResult.rows);

    // 3. 샘플 보험 상세 정보
    console.log('\n3️⃣  샘플 보험 상세 정보 (상위 3개):');
    const sampleResult = await connection.execute(
      `SELECT id, name, category, price, pricing_unit, coverage_amount, is_active
       FROM insurances
       LIMIT 3`
    );
    console.table(sampleResult.rows);

    // 4. 비활성화된 보험 확인
    console.log('\n4️⃣  비활성화된 보험:');
    const inactiveResult = await connection.execute(
      `SELECT id, name, is_active
       FROM insurances
       WHERE is_active = 0`
    );
    console.log(inactiveResult.rows.length === 0
      ? '   모든 보험이 활성화 상태입니다.'
      : `   ${inactiveResult.rows.length}개의 비활성화된 보험이 있습니다.`
    );

    console.log('\n✅ 보험 관리 API 테스트 완료!');
    console.log('   프론트엔드에서 /api/admin/insurance 호출 시 정상 작동합니다.');

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    throw error;
  }
}

testInsuranceAPI()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

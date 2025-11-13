const { connect } = require('@planetscale/database');

/**
 * 렌트카 보험 조회 API (올바른 테이블 사용)
 * GET /api/rentcar/insurance?vendor_id=123
 *
 * rentcar_insurance 테이블 사용
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: '지원하지 않는 메서드입니다.'
    });
  }

  try {
    const { vendor_id } = req.query;
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('🛡️  [Rentcar Insurance API] 보험 조회 요청:', { vendor_id });

    // rentcar_insurance 테이블 조회 (올바른 테이블)
    const query = `
      SELECT
        id,
        name,
        description,
        hourly_rate_krw,
        deductible_amount,
        coverage_limit,
        is_active,
        created_at,
        updated_at
      FROM rentcar_insurance
      WHERE is_active = 1
      ORDER BY hourly_rate_krw ASC
    `;

    const result = await connection.execute(query);

    console.log('✅ [Rentcar Insurance API] 보험 조회 완료:', result.rows?.length || 0, '건');

    const insurances = (result.rows || []).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.hourly_rate_krw, // 프론트엔드 호환성을 위해 price로 매핑
      pricing_unit: 'hourly', // rentcar_insurance는 항상 hourly
      hourly_rate_krw: row.hourly_rate_krw,
      deductible_amount: row.deductible_amount,
      coverage_limit: row.coverage_limit,
      is_active: true,
      created_at: row.created_at,
      updated_at: row.updated_at,
      coverage_details: null // 필요시 추가
    }));

    return res.status(200).json({
      success: true,
      data: insurances,
      count: insurances.length
    });

  } catch (error) {
    console.error('❌ [Rentcar Insurance API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};

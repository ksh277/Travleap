const { connect } = require('@planetscale/database');

/**
 * 공개 렌트카 보험 조회 API
 * GET /api/rentcar/insurances?vendor_id=123
 *
 * 인증 불필요, 활성화된 렌트카 보험만 조회
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
    const { vendor_id, vehicle_id } = req.query;
    const connection = connect({ url: process.env.DATABASE_URL });

    // 렌트카 카테고리의 활성 보험만 조회
    let query = `
      SELECT
        id, name, category, price, pricing_unit, coverage_amount,
        vendor_id, vehicle_id,
        description, coverage_details,
        created_at, updated_at
      FROM insurances
      WHERE category = 'rentcar'
        AND is_active = 1
    `;

    const params = [];

    // vendor_id 필터링: null(공용) 또는 특정 벤더
    if (vendor_id) {
      query += ` AND (vendor_id IS NULL OR vendor_id = ?)`;
      params.push(parseInt(vendor_id));
    } else {
      // vendor_id가 없으면 공용 보험만
      query += ` AND vendor_id IS NULL`;
    }

    // vehicle_id 필터링: null(전체 차량) 또는 특정 차량
    if (vehicle_id) {
      query += ` AND (vehicle_id IS NULL OR vehicle_id = ?)`;
      params.push(parseInt(vehicle_id));
    } else {
      // vehicle_id가 없으면 벤더 전체 차량용 보험만
      query += ` AND vehicle_id IS NULL`;
    }

    query += ` ORDER BY price ASC`;

    const result = await connection.execute(query, params);

    const insurances = (result.rows || []).map(row => ({
      ...row,
      coverage_details: row.coverage_details ? JSON.parse(row.coverage_details) : { items: [], exclusions: [] },
      is_active: true, // 이미 필터링했으므로 항상 true
      vendor_id: row.vendor_id || null,
      vehicle_id: row.vehicle_id || null
    }));

    return res.status(200).json({
      success: true,
      data: insurances,
      count: insurances.length
    });

  } catch (error) {
    console.error('❌ [Rentcar Insurances API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};

const { connect } = require('@planetscale/database');

/**
 * 렌트카 보험 상품 조회 API (공개)
 * GET /api/rentcar/insurance?vendor_id={vendorId}
 *
 * 고객이 예약 시 선택할 수 있는 보험 상품 목록 조회
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
      error: 'Method not allowed'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { vendor_id } = req.query;

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        error: '업체 ID가 필요합니다.'
      });
    }

    // 활성화된 보험 상품만 조회
    const result = await connection.execute(
      `SELECT
        id,
        name,
        description,
        coverage_details,
        hourly_rate_krw,
        display_order
       FROM rentcar_insurance
       WHERE vendor_id = ? AND is_active = TRUE
       ORDER BY display_order ASC, created_at ASC`,
      [vendor_id]
    );

    return res.status(200).json({
      success: true,
      data: result.rows || []
    });

  } catch (error) {
    console.error('❌ [Insurance API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

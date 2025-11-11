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

    // insurances 테이블에서 렌트카 보험 조회
    // vendor_id가 일치하거나 null인 경우 (공통 보험)
    const result = await connection.execute(
      `SELECT
        id,
        name,
        description,
        coverage_details,
        price,
        pricing_unit,
        0 as is_required,
        id as display_order
       FROM insurances
       WHERE category = 'rentcar'
         AND pricing_unit IN ('hourly', 'daily')
         AND is_active = 1
         AND (vendor_id IS NULL OR vendor_id = ?)
       ORDER BY id ASC`,
      [vendor_id]
    );

    // coverage_details를 문자열로 변환 + 시간당 요금 계산
    const insurances = (result.rows || []).map(insurance => {
      let coverageText = '';

      // PlanetScale이 JSON을 객체로 반환하는 경우
      if (insurance.coverage_details && typeof insurance.coverage_details === 'object') {
        if (insurance.coverage_details.items && Array.isArray(insurance.coverage_details.items)) {
          coverageText = insurance.coverage_details.items.join('\n');
        }
      }
      // 문자열인 경우 파싱 시도
      else if (typeof insurance.coverage_details === 'string') {
        try {
          const parsed = JSON.parse(insurance.coverage_details);
          if (parsed.items && Array.isArray(parsed.items)) {
            coverageText = parsed.items.join('\n');
          }
        } catch (e) {
          coverageText = insurance.coverage_details;
        }
      }

      // 시간당 요금 계산
      let hourlyRate = parseFloat(insurance.price);
      if (insurance.pricing_unit === 'daily') {
        // 일 단위 요금을 시간당으로 변환 (24시간으로 나눔)
        hourlyRate = Math.round(hourlyRate / 24);
      } else if (insurance.pricing_unit === 'fixed') {
        // 고정 요금은 시간당 적용 불가 - 스킵
        return null;
      }

      return {
        id: insurance.id,
        name: insurance.name,
        description: insurance.description,
        coverage_details: coverageText || null,
        hourly_rate_krw: hourlyRate,
        is_required: insurance.is_required === 1 || insurance.is_required === true,
        display_order: insurance.display_order
      };
    }).filter(Boolean); // null 제거

    return res.status(200).json({
      success: true,
      data: insurances
    });

  } catch (error) {
    console.error('❌ [Insurance API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

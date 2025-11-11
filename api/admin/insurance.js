const { connect } = require('@planetscale/database');

/**
 * Admin Insurance Management API
 * GET /api/admin/insurance - Fetch all insurances
 * POST /api/admin/insurance - Create new insurance
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {

    // GET: 모든 보험 조회
    if (req.method === 'GET') {
      const result = await connection.execute(
        `SELECT
          id, name, category, price, pricing_unit, coverage_amount,
          vendor_id, vehicle_id,
          description, coverage_details, is_active,
          created_at, updated_at
        FROM insurances
        ORDER BY category ASC, created_at DESC`
      );

      const insurances = (result.rows || []).map(row => ({
        ...row,
        coverage_details: row.coverage_details ? JSON.parse(row.coverage_details) : { items: [], exclusions: [] },
        is_active: row.is_active === 1 || row.is_active === true,
        vendor_id: row.vendor_id || null,
        vehicle_id: row.vehicle_id || null
      }));

      return res.status(200).json({
        success: true,
        data: insurances
      });
    }

    // POST: 새 보험 추가
    if (req.method === 'POST') {
      const {
        name,
        category,
        price,
        pricing_unit,
        coverage_amount,
        vendor_id,
        vehicle_id,
        description,
        coverage_details,
        is_active
      } = req.body;

      // 필수 필드 검증
      if (!name || !category || price === undefined || !pricing_unit) {
        return res.status(400).json({
          success: false,
          message: '필수 항목을 모두 입력해주세요. (보험명, 카테고리, 보험료, 가격단위)'
        });
      }

      // pricing_unit 유효성 검사
      if (!['fixed', 'hourly', 'daily'].includes(pricing_unit)) {
        return res.status(400).json({
          success: false,
          message: '가격단위는 fixed, hourly, daily 중 하나여야 합니다.'
        });
      }

      await connection.execute(
        `INSERT INTO insurances (
          name, category, price, pricing_unit, coverage_amount,
          vendor_id, vehicle_id,
          description, coverage_details, is_active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          name,
          category,
          price,
          pricing_unit,
          coverage_amount || 0,
          vendor_id || null,
          vehicle_id || null,
          description || null,
          coverage_details ? JSON.stringify(coverage_details) : null,
          is_active !== undefined ? (is_active ? 1 : 0) : 1
        ]
      );

      return res.status(201).json({
        success: true,
        message: '보험이 추가되었습니다.'
      });
    }

    return res.status(405).json({
      success: false,
      message: '지원하지 않는 메서드입니다.'
    });

  } catch (error) {
    console.error('❌ [Insurance API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};

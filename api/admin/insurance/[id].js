const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * Admin Insurance Management API - Individual Insurance
 * PUT /api/admin/insurance/[id] - Update insurance
 * DELETE /api/admin/insurance/[id] - Delete insurance
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // JWT 인증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다.'
      });
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 토큰입니다.'
      });
    }

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '관리자 권한이 필요합니다.'
      });
    }

    const { id } = req.query;
    const connection = connect({ url: process.env.DATABASE_URL });

    // PUT: 보험 수정
    if (req.method === 'PUT') {
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
          message: '필수 항목을 모두 입력해주세요.'
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
        `UPDATE insurances SET
          name = ?,
          category = ?,
          price = ?,
          pricing_unit = ?,
          coverage_amount = ?,
          vendor_id = ?,
          vehicle_id = ?,
          description = ?,
          coverage_details = ?,
          is_active = ?,
          updated_at = NOW()
        WHERE id = ?`,
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
          is_active !== undefined ? (is_active ? 1 : 0) : 1,
          id
        ]
      );

      return res.status(200).json({
        success: true,
        message: '보험이 수정되었습니다.'
      });
    }

    // DELETE: 보험 삭제
    if (req.method === 'DELETE') {
      await connection.execute(
        'DELETE FROM insurances WHERE id = ?',
        [id]
      );

      return res.status(200).json({
        success: true,
        message: '보험이 삭제되었습니다.'
      });
    }

    // GET: 개별 보험 조회
    if (req.method === 'GET') {
      const result = await connection.execute(
        `SELECT
          id, name, category, price, pricing_unit, coverage_amount,
          vendor_id, vehicle_id,
          description, coverage_details, is_active,
          created_at, updated_at
        FROM insurances
        WHERE id = ?`,
        [id]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '보험을 찾을 수 없습니다.'
        });
      }

      const insurance = result.rows[0];
      insurance.coverage_details = insurance.coverage_details ? JSON.parse(insurance.coverage_details) : { items: [], exclusions: [] };
      insurance.is_active = insurance.is_active === 1 || insurance.is_active === true;

      return res.status(200).json({
        success: true,
        data: insurance
      });
    }

    return res.status(405).json({
      success: false,
      message: '지원하지 않는 메서드입니다.'
      });

  } catch (error) {
    console.error('❌ [Insurance ID API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};

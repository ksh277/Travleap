const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 렌트카 보험 상품 활성화/비활성화 토글 API
 * PATCH /api/vendor/insurance/:id/toggle
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({
      success: false,
      message: '지원하지 않는 메서드입니다.'
    });
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

    if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '벤더 권한이 필요합니다.'
      });
    }

    const connection = connect({ url: process.env.DATABASE_URL });
    const { id } = req.query;
    const { is_active } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: '보험 ID가 필요합니다.'
      });
    }

    if (is_active === undefined) {
      return res.status(400).json({
        success: false,
        message: 'is_active 값이 필요합니다.'
      });
    }

    // 벤더 ID 조회 및 권한 확인
    if (decoded.role === 'admin') {
      await connection.execute(
        'UPDATE rentcar_insurance_products SET is_active = ?, updated_at = NOW() WHERE id = ?',
        [is_active, id]
      );
    } else {
      const vendorResult = await connection.execute(
        'SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
        [decoded.userId]
      );

      if (!vendorResult.rows || vendorResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '등록된 벤더 정보가 없습니다.'
        });
      }

      const vendorId = vendorResult.rows[0].id;

      await connection.execute(
        'UPDATE rentcar_insurance_products SET is_active = ?, updated_at = NOW() WHERE id = ? AND vendor_id = ?',
        [is_active, id, vendorId]
      );
    }

    return res.status(200).json({
      success: true,
      message: '상태가 변경되었습니다.'
    });

  } catch (error) {
    console.error('❌ [Insurance Toggle API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};

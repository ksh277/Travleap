const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 렌트카 요금 정책 개별 관리 API
 * PATCH /api/vendor/pricing/policies/[id]/toggle - 활성화/비활성화 토글
 * DELETE /api/vendor/pricing/policies/[id] - 정책 삭제
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, DELETE, OPTIONS');
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

    if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '벤더 권한이 필요합니다.'
      });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // 벤더 ID 조회
    let vendorId;
    if (decoded.role === 'admin') {
      vendorId = req.query.vendorId || req.body?.vendorId;
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

      vendorId = vendorResult.rows[0].id;
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: '정책 ID가 필요합니다.'
      });
    }

    // 소유권 확인
    const ownerCheck = await connection.execute(
      'SELECT vendor_id FROM rentcar_pricing_policies WHERE id = ?',
      [id]
    );

    if (!ownerCheck.rows || ownerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '정책을 찾을 수 없습니다.'
      });
    }

    if (ownerCheck.rows[0].vendor_id !== vendorId) {
      return res.status(403).json({
        success: false,
        message: '권한이 없습니다.'
      });
    }

    // PATCH: 활성화/비활성화 토글
    if (req.method === 'PATCH') {
      const { is_active } = req.body;

      await connection.execute(
        'UPDATE rentcar_pricing_policies SET is_active = ?, updated_at = NOW() WHERE id = ?',
        [is_active ? 1 : 0, id]
      );

      return res.status(200).json({
        success: true,
        message: '상태가 변경되었습니다.'
      });
    }

    // DELETE: 정책 삭제
    if (req.method === 'DELETE') {
      await connection.execute(
        'DELETE FROM rentcar_pricing_policies WHERE id = ?',
        [id]
      );

      return res.status(200).json({
        success: true,
        message: '정책이 삭제되었습니다.'
      });
    }

    return res.status(405).json({
      success: false,
      message: '지원하지 않는 메서드입니다.'
    });

  } catch (error) {
    console.error('❌ [Pricing Policy Detail API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};

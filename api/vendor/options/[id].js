const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 렌트카 추가 옵션 삭제 API
 * DELETE /api/vendor/options/:id
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
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

    if (!id) {
      return res.status(400).json({
        success: false,
        message: '옵션 ID가 필요합니다.'
      });
    }

    // 벤더 ID 조회 및 권한 확인
    let vendorId;
    if (decoded.role === 'admin') {
      // 관리자는 모든 옵션 삭제 가능
      await connection.execute(
        'DELETE FROM rentcar_additional_options WHERE id = ?',
        [id]
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

      vendorId = vendorResult.rows[0].id;

      // 본인 업체의 옵션만 삭제 가능
      await connection.execute(
        'DELETE FROM rentcar_additional_options WHERE id = ? AND vendor_id = ?',
        [id, vendorId]
      );
    }

    return res.status(200).json({
      success: true,
      message: '추가 옵션이 삭제되었습니다.'
    });

  } catch (error) {
    console.error('❌ [Options Delete API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};

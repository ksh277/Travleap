const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 렌트카 추가 옵션 API
 * GET /api/vendor/options - 추가 옵션 목록 조회
 * POST /api/vendor/options - 추가 옵션 추가
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

      if (!vendorResult || vendorResult.length === 0) {
        return res.status(403).json({
          success: false,
          message: '등록된 벤더 정보가 없습니다.'
        });
      }

      vendorId = vendorResult[0].id;
    }

    // GET: 추가 옵션 목록 조회
    if (req.method === 'GET') {
      const result = await connection.execute(
        `SELECT * FROM rentcar_additional_options
         WHERE vendor_id = ?
         ORDER BY display_order ASC, created_at DESC`,
        [vendorId]
      );

      return res.status(200).json({
        success: true,
        data: result || []
      });
    }

    // POST: 추가 옵션 추가
    if (req.method === 'POST') {
      const {
        option_name,
        option_type,
        description,
        daily_price,
        one_time_price,
        quantity_available,
        is_active,
        display_order,
        image_url
      } = req.body;

      if (!option_name || !option_type || !daily_price) {
        return res.status(400).json({
          success: false,
          message: '필수 항목이 누락되었습니다.'
        });
      }

      await connection.execute(
        `INSERT INTO rentcar_additional_options (
          vendor_id, option_name, option_type, description,
          daily_price, one_time_price, quantity_available,
          is_active, display_order, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          vendorId, option_name, option_type, description || null,
          daily_price, one_time_price || 0, quantity_available || 999,
          is_active !== undefined ? is_active : true,
          display_order || 0, image_url || null
        ]
      );

      return res.status(201).json({
        success: true,
        message: '추가 옵션이 등록되었습니다.'
      });
    }

    return res.status(405).json({
      success: false,
      message: '지원하지 않는 메서드입니다.'
    });

  } catch (error) {
    console.error('❌ [Options API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};

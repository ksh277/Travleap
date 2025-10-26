const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 렌트카 요금 정책 API
 * GET /api/vendor/pricing/policies - 요금 정책 목록 조회
 * POST /api/vendor/pricing/policies - 요금 정책 추가
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

    // GET: 요금 정책 목록 조회
    if (req.method === 'GET') {
      const result = await connection.execute(
        `SELECT * FROM rentcar_pricing_policies
         WHERE vendor_id = ?
         ORDER BY created_at DESC`,
        [vendorId]
      );

      return res.status(200).json({
        success: true,
        data: result || []
      });
    }

    // POST: 요금 정책 추가
    if (req.method === 'POST') {
      const {
        policy_type,
        min_days,
        max_days,
        discount_percentage,
        day_of_week,
        price_multiplier,
        season_name,
        start_date,
        end_date,
        season_multiplier,
        days_before_pickup,
        early_bird_discount,
        is_active
      } = req.body;

      if (!policy_type) {
        return res.status(400).json({
          success: false,
          message: '정책 유형이 필요합니다.'
        });
      }

      await connection.execute(
        `INSERT INTO rentcar_pricing_policies (
          vendor_id, policy_type, min_days, max_days, discount_percentage,
          day_of_week, price_multiplier, season_name, start_date, end_date,
          season_multiplier, days_before_pickup, early_bird_discount, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          vendorId, policy_type, min_days, max_days, discount_percentage,
          day_of_week, price_multiplier, season_name, start_date, end_date,
          season_multiplier, days_before_pickup, early_bird_discount,
          is_active !== undefined ? is_active : 1
        ]
      );

      return res.status(201).json({
        success: true,
        message: '요금 정책이 추가되었습니다.'
      });
    }

    return res.status(405).json({
      success: false,
      message: '지원하지 않는 메서드입니다.'
    });

  } catch (error) {
    console.error('❌ [Pricing Policies API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};

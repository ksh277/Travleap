/**
 * 렌트카 벤더 - 차량 목록 조회 API
 * GET /api/vendor/rentcar/vehicles - 벤더의 차량 목록 조회 (재고 포함)
 */

const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });
  }

  try {
    // JWT 토큰 검증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    } catch (error) {
      return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
    }

    if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: '벤더 권한이 필요합니다.' });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // user_id로 렌트카 벤더 ID 조회
    let vendorId = req.query.vendorId;

    if (!vendorId) {
      const vendorResult = await connection.execute(
        `SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`,
        [decoded.userId]
      );

      if (!vendorResult.rows || vendorResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '렌트카 벤더 정보를 찾을 수 없습니다.'
        });
      }

      vendorId = vendorResult.rows[0].id;
    }

    // 벤더의 차량 목록 조회 (재고 포함)
    const vehiclesResult = await connection.execute(
      `SELECT
        id,
        vendor_id,
        vehicle_code,
        brand,
        model,
        year,
        display_name,
        vehicle_class,
        vehicle_type,
        fuel_type,
        transmission,
        seating_capacity,
        door_count,
        thumbnail_url,
        images,
        daily_rate_krw,
        hourly_rate_krw,
        weekly_rate_krw,
        monthly_rate_krw,
        stock,
        stock AS current_stock,
        is_active,
        is_featured,
        created_at,
        updated_at
      FROM rentcar_vehicles
      WHERE vendor_id = ?
      ORDER BY id ASC`,
      [vendorId]
    );

    return res.status(200).json({
      success: true,
      data: vehiclesResult.rows || []
    });

  } catch (error) {
    console.error('❌ [Rentcar Vendor API] Get vehicles error:', error);
    return res.status(500).json({
      success: false,
      message: '차량 목록을 불러오는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

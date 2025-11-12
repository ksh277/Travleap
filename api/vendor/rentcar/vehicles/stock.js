/**
 * 렌트카 벤더 - 차량 재고 업데이트 API
 * PUT /api/vendor/rentcar/vehicles/stock - 차량 재고 수정
 */

const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT') {
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

    const { vehicle_id, stock } = req.body;

    if (!vehicle_id || stock === undefined || stock === null) {
      return res.status(400).json({
        success: false,
        message: 'vehicle_id와 stock은 필수 항목입니다.'
      });
    }

    if (typeof stock !== 'number' || stock < 0) {
      return res.status(400).json({
        success: false,
        message: '재고는 0 이상의 숫자여야 합니다.'
      });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // user_id로 렌트카 벤더 ID 조회
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

    const vendorId = vendorResult.rows[0].id;

    // 해당 차량이 벤더의 것인지 확인
    const vehicleCheck = await connection.execute(
      `SELECT id FROM rentcar_vehicles WHERE id = ? AND vendor_id = ? LIMIT 1`,
      [vehicle_id, vendorId]
    );

    if (!vehicleCheck.rows || vehicleCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: '해당 차량에 대한 권한이 없습니다.'
      });
    }

    // 재고 업데이트
    await connection.execute(
      `UPDATE rentcar_vehicles SET stock = ?, updated_at = NOW() WHERE id = ?`,
      [stock, vehicle_id]
    );

    console.log(`✅ [Rentcar Vendor] Vehicle ${vehicle_id} stock updated to ${stock} by vendor ${vendorId}`);

    return res.status(200).json({
      success: true,
      message: '재고가 성공적으로 업데이트되었습니다.',
      data: {
        vehicle_id,
        stock
      }
    });

  } catch (error) {
    console.error('❌ [Rentcar Vendor API] Update vehicle stock error:', error);
    return res.status(500).json({
      success: false,
      message: '재고 업데이트 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

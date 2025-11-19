/**
 * 렌트카 차량 재고 업데이트 API
 * PUT /api/vendor/rentcar/vehicles/stock
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

    if (!vehicle_id) {
      return res.status(400).json({
        success: false,
        message: '차량 ID가 필요합니다.'
      });
    }

    if (typeof stock !== 'number' || stock < 0) {
      return res.status(400).json({
        success: false,
        message: '유효한 재고 수량을 입력하세요. (0 이상의 숫자)'
      });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // user_id로 렌트카 벤더 ID 조회
    let vendorId;

    if (decoded.role === 'admin') {
      // 관리자는 차량의 vendor_id 확인
      const vehicleCheck = await connection.execute(
        `SELECT vendor_id FROM rentcar_vehicles WHERE id = ?`,
        [vehicle_id]
      );

      if (!vehicleCheck.rows || vehicleCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '차량을 찾을 수 없습니다.'
        });
      }

      vendorId = vehicleCheck.rows[0].vendor_id;
    } else {
      const vendorResult = await connection.execute(
        `SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`,
        [decoded.userId]
      );

      if (!vendorResult.rows || vendorResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '등록된 렌트카 업체 정보가 없습니다.'
        });
      }

      vendorId = vendorResult.rows[0].id;
    }

    console.log('✅ [Vehicle Stock Update API] vendorId:', vendorId, 'vehicle_id:', vehicle_id, 'stock:', stock);

    // 차량이 해당 벤더의 것인지 확인하고 재고 업데이트
    const result = await connection.execute(
      `UPDATE rentcar_vehicles
       SET stock = ?, updated_at = NOW()
       WHERE id = ? AND vendor_id = ?`,
      [stock, vehicle_id, vendorId]
    );

    if (result.rowsAffected === 0) {
      return res.status(400).json({
        success: false,
        message: '재고를 업데이트할 수 없습니다. (차량이 존재하지 않거나 권한이 없습니다)'
      });
    }

    console.log(`✅ [Vehicle Stock Update API] 차량 #${vehicle_id} 재고 업데이트 완료: ${stock}대`);

    // 업데이트된 차량 정보 조회
    const updatedVehicle = await connection.execute(
      `SELECT
        id,
        display_name,
        brand,
        model,
        stock,
        is_active
      FROM rentcar_vehicles
      WHERE id = ?`,
      [vehicle_id]
    );

    return res.status(200).json({
      success: true,
      message: '재고가 업데이트되었습니다.',
      data: updatedVehicle.rows[0] ? {
        id: updatedVehicle.rows[0].id,
        display_name: updatedVehicle.rows[0].display_name || `${updatedVehicle.rows[0].brand} ${updatedVehicle.rows[0].model}`,
        stock: Number(updatedVehicle.rows[0].stock)
      } : null
    });

  } catch (error) {
    console.error('❌ [Vehicle Stock Update API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '재고 업데이트 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

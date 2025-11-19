/**
 * 렌트카 예약 픽업 처리 API
 * POST /api/vendor/rentcar/bookings/pickup
 * confirmed -> picked_up 상태로 변경
 */

const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
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

    const {
      booking_id,
      staff_name,
      notes,
      vehicle_condition
    } = req.body;

    if (!booking_id) {
      return res.status(400).json({
        success: false,
        message: '예약 ID가 필요합니다.'
      });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // user_id로 렌트카 벤더 ID 조회
    let vendorId;

    if (decoded.role === 'admin') {
      // 관리자는 예약의 vendor_id 확인
      const bookingCheck = await connection.execute(
        `SELECT vendor_id FROM rentcar_bookings WHERE id = ?`,
        [booking_id]
      );

      if (!bookingCheck.rows || bookingCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '예약을 찾을 수 없습니다.'
        });
      }

      vendorId = bookingCheck.rows[0].vendor_id;
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

    console.log('✅ [Pickup API] vendorId:', vendorId, 'booking_id:', booking_id);

    // 차량 상태를 JSON으로 변환
    const vehicleConditionJson = vehicle_condition ? JSON.stringify(vehicle_condition) : null;

    // 예약이 해당 벤더의 것인지 확인하고 상태 변경
    // pending 또는 confirmed 상태일 때 픽업 가능
    const result = await connection.execute(
      `UPDATE rentcar_bookings
       SET
         status = 'picked_up',
         pickup_checked_in_at = NOW(),
         pickup_checked_in_by = ?,
         pickup_vehicle_condition = ?,
         updated_at = NOW()
       WHERE id = ?
         AND vendor_id = ?
         AND status IN ('pending', 'confirmed')`,
      [staff_name || decoded.email || 'Unknown', vehicleConditionJson, booking_id, vendorId]
    );

    if (result.rowsAffected === 0) {
      return res.status(400).json({
        success: false,
        message: '픽업 처리할 수 없습니다. (이미 픽업되었거나 권한이 없습니다)'
      });
    }

    // 메모가 있으면 별도 기록 (notes 컬럼이 있다면)
    if (notes) {
      console.log(`📝 [Pickup Notes] ${notes}`);
      // TODO: 필요시 별도 notes 테이블에 기록
    }

    console.log(`✅ [Pickup API] 예약 #${booking_id} 픽업 처리 완료`);

    return res.status(200).json({
      success: true,
      message: '픽업 처리가 완료되었습니다.'
    });

  } catch (error) {
    console.error('❌ [Pickup API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '픽업 처리 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 렌트카 예약 반납 처리 API
 * POST /api/vendor/rentcar/bookings/return
 * picked_up -> completed 상태로 변경
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
      vehicle_condition,
      late_return_hours,
      late_return_fee_krw,
      damage_fee_krw,
      fuel_fee_krw
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

    console.log('✅ [Return API] vendorId:', vendorId, 'booking_id:', booking_id);

    // 차량 상태를 JSON으로 변환
    const vehicleConditionJson = vehicle_condition ? JSON.stringify(vehicle_condition) : null;

    // 추가 비용 계산
    const totalAdditionalFee =
      (late_return_fee_krw || 0) +
      (damage_fee_krw || 0) +
      (fuel_fee_krw || 0);

    // 예약이 해당 벤더의 것인지 확인하고 상태 변경
    // picked_up 상태일 때만 반납 가능
    const result = await connection.execute(
      `UPDATE rentcar_bookings
       SET
         status = 'completed',
         return_checked_out_at = NOW(),
         return_checked_out_by = ?,
         return_vehicle_condition = ?,
         late_return_hours = ?,
         late_return_fee_krw = ?,
         damage_fee_krw = ?,
         fuel_fee_krw = ?,
         total_additional_fee_krw = ?,
         actual_return_at_utc = NOW(),
         updated_at = NOW()
       WHERE id = ?
         AND vendor_id = ?
         AND status = 'picked_up'`,
      [
        staff_name || decoded.email || 'Unknown',
        vehicleConditionJson,
        late_return_hours || 0,
        late_return_fee_krw || 0,
        damage_fee_krw || 0,
        fuel_fee_krw || 0,
        totalAdditionalFee,
        booking_id,
        vendorId
      ]
    );

    if (result.rowsAffected === 0) {
      return res.status(400).json({
        success: false,
        message: '반납 처리할 수 없습니다. (픽업 상태가 아니거나 권한이 없습니다)'
      });
    }

    // 메모가 있으면 별도 기록
    if (notes) {
      console.log(`📝 [Return Notes] ${notes}`);
      // TODO: 필요시 별도 notes 테이블에 기록
    }

    console.log(`✅ [Return API] 예약 #${booking_id} 반납 처리 완료`);
    if (totalAdditionalFee > 0) {
      console.log(`  추가 비용: ${totalAdditionalFee.toLocaleString()}원`);
    }

    return res.status(200).json({
      success: true,
      message: '반납 처리가 완료되었습니다.',
      data: {
        total_additional_fee_krw: totalAdditionalFee
      }
    });

  } catch (error) {
    console.error('❌ [Return API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '반납 처리 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

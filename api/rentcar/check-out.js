const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 렌트카 체크아웃 API
 * POST /api/rentcar/check-out
 * Body: {
 *   booking_number: string,
 *   vehicle_condition: string,
 *   fuel_level: string,
 *   mileage: number,
 *   damage_notes?: string,
 *   return_images?: string[]
 * }
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'POST 메서드만 지원합니다.' });
  }

  try {
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

    const { booking_number, vehicle_condition, fuel_level, mileage, damage_notes, return_images } = req.body;

    if (!booking_number || !vehicle_condition || !fuel_level || !mileage) {
      return res.status(400).json({ success: false, message: '필수 항목을 모두 입력해주세요.' });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    let vendorId;
    if (decoded.role === 'admin') {
      vendorId = req.body.vendorId;
    } else {
      const vendorResult = await connection.execute(
        'SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
        [decoded.userId]
      );

      if (!vendorResult.rows || vendorResult.rows.length === 0) {
        return res.status(403).json({ success: false, message: '등록된 벤더 정보가 없습니다.' });
      }

      vendorId = vendorResult.rows[0].id;
    }

    const bookingResult = await connection.execute(
      'SELECT id, vendor_id, status, payment_status, pickup_checked_in_at, return_checked_out_at, dropoff_date, dropoff_time FROM rentcar_bookings WHERE booking_number = ? LIMIT 1',
      [booking_number]
    );

    if (!bookingResult.rows || bookingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '예약을 찾을 수 없습니다.' });
    }

    const booking = bookingResult.rows[0];

    if (decoded.role !== 'admin' && booking.vendor_id !== vendorId) {
      return res.status(403).json({ success: false, message: '해당 예약에 대한 권한이 없습니다.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: '취소된 예약입니다.' });
    }

    if (!booking.pickup_checked_in_at) {
      return res.status(400).json({ success: false, message: '체크인되지 않은 예약입니다.' });
    }

    if (booking.return_checked_out_at) {
      return res.status(400).json({ success: false, message: '이미 체크아웃된 예약입니다.' });
    }

    // 연체료 계산
    const now = new Date();
    const dropoffTime = booking.dropoff_time || '18:00:00';
    const plannedReturnTime = new Date(booking.dropoff_date + 'T' + dropoffTime);
    let lateReturnHours = 0;
    let lateReturnFee = 0;

    if (now > plannedReturnTime) {
      const lateMs = now.getTime() - plannedReturnTime.getTime();
      lateReturnHours = Math.ceil(lateMs / (1000 * 60 * 60));
      lateReturnFee = lateReturnHours * 10000;
    }

    // 반납 차량 상태 JSON 생성 (check-in.js와 동일한 구조)
    const returnVehicleConditionData = {
      condition: vehicle_condition,
      fuel_level: fuel_level,
      mileage: parseInt(mileage),
      damage_notes: damage_notes || '',
      images: return_images || []
    };

    await connection.execute(
      `UPDATE rentcar_bookings
       SET status = 'completed',
           return_checked_out_at = NOW(),
           return_vehicle_condition = ?,
           late_return_hours = ?,
           late_return_fee_krw = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [JSON.stringify(returnVehicleConditionData), lateReturnHours, lateReturnFee, booking.id]
    );

    console.log('✅ 체크아웃 완료:', { bookingId: booking.id, bookingNumber: booking_number, lateReturnHours, lateReturnFee });

    // 보증금 정산
    const depositAmount = 100000;
    const depositSettlement = {
      status: lateReturnFee > 0 ? (lateReturnFee >= depositAmount ? 'additional_payment_required' : 'partial_refunded') : 'refunded',
      deposit_captured: Math.min(lateReturnFee, depositAmount),
      deposit_refunded: Math.max(0, depositAmount - lateReturnFee),
      additional_payment_required: Math.max(0, lateReturnFee - depositAmount)
    };

    return res.status(200).json({
      success: true,
      message: '체크아웃이 완료되었습니다.',
      data: {
        booking_id: booking.id,
        booking_number: booking_number,
        checked_out_at: now.toISOString(),
        late_return_hours: lateReturnHours,
        late_return_fee_krw: lateReturnFee,
        deposit_settlement: depositSettlement
      }
    });

  } catch (error) {
    console.error('❌ [Check-out API] 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.', error: error.message });
  }
};

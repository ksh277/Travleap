const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 렌트카 체크인 API
 * POST /api/rentcar/check-in
 * Body: {
 *   booking_number: string,
 *   vehicle_condition: string (good/fair/damaged),
 *   fuel_level: string (0-100),
 *   mileage: number,
 *   damage_notes?: string,
 *   actual_pickup_time?: string (ISO datetime, 입력하지 않으면 현재 시간 사용),
 *   pickup_images?: string[] (차량 상태/파손 이미지 URL 배열)
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

    const {
      booking_number,
      vehicle_condition,
      fuel_level,
      mileage,
      damage_notes,
      actual_pickup_time,  // 실제 픽업 시간 (옵션)
      pickup_images        // 픽업 시 차량 이미지 배열 (옵션)
    } = req.body;

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
      'SELECT id, vendor_id, status, payment_status, pickup_checked_in_at FROM rentcar_bookings WHERE booking_number = ? LIMIT 1',
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

    if (booking.payment_status !== 'paid' && booking.payment_status !== 'pending') {
      return res.status(400).json({ success: false, message: '결제가 완료되거나 대기중인 예약만 체크인할 수 있습니다.' });
    }

    if (booking.pickup_checked_in_at) {
      return res.status(400).json({ success: false, message: '이미 체크인된 예약입니다.' });
    }

    // JSON 형식으로 차량 상태 저장
    const vehicleConditionData = {
      condition: vehicle_condition,
      fuel_level: fuel_level,
      mileage: parseInt(mileage),
      damage_notes: damage_notes || '',
      images: pickup_images || []
    };

    // 실제 픽업 시간 결정 (입력된 시간이 있으면 사용, 없으면 NOW())
    const pickupTimeValue = actual_pickup_time || null;

    await connection.execute(
      `UPDATE rentcar_bookings
       SET status = 'picked_up',
           pickup_checked_in_at = ${pickupTimeValue ? '?' : 'NOW()'},
           pickup_vehicle_condition = ?,
           pickup_checked_in_by = ?,
           updated_at = NOW()
       WHERE id = ?`,
      pickupTimeValue
        ? [pickupTimeValue, JSON.stringify(vehicleConditionData), decoded.username || decoded.email || 'vendor', booking.id]
        : [JSON.stringify(vehicleConditionData), decoded.username || decoded.email || 'vendor', booking.id]
    );

    console.log('✅ 체크인 완료:', {
      bookingId: booking.id,
      bookingNumber: booking_number,
      actualPickupTime: pickupTimeValue || 'NOW()',
      hasImages: (pickup_images && pickup_images.length > 0)
    });

    return res.status(200).json({
      success: true,
      message: '체크인이 완료되었습니다.',
      data: {
        booking_id: booking.id,
        booking_number: booking_number,
        checked_in_at: pickupTimeValue || new Date().toISOString(),
        images_count: pickup_images ? pickup_images.length : 0
      }
    });

  } catch (error) {
    console.error('❌ [Check-in API] 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.', error: error.message });
  }
};

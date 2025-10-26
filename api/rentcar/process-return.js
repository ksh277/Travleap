const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 차량 반납 처리 API (벤더 전용)
 *
 * 기능:
 * - 실제 반납 시간 기록
 * - 지연 여부 확인 및 수수료 자동 계산
 * - 예약 상태 업데이트 (completed)
 * - 다음 예약 알림 트리거 (선택)
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // JWT 인증
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

    const {
      booking_id,
      actual_dropoff_time, // ISO 8601 형식: "2025-01-15T16:30:00"
      vendor_note
    } = req.body;

    if (!booking_id || !actual_dropoff_time) {
      return res.status(400).json({
        success: false,
        error: '예약 ID와 실제 반납 시간이 필요합니다.'
      });
    }

    // 1. 예약 정보 조회
    const bookingResult = await connection.execute(
      `SELECT
        b.*,
        v.vendor_id,
        v.hourly_rate_krw,
        v.daily_rate_krw
      FROM rentcar_bookings b
      JOIN rentcar_vehicles v ON b.vehicle_id = v.id
      WHERE b.id = ?`,
      [booking_id]
    );

    if (!bookingResult || bookingResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: '예약을 찾을 수 없습니다.'
      });
    }

    const booking = bookingResult[0];

    // 2. 벤더 권한 확인
    if (decoded.role === 'vendor') {
      const vendorResult = await connection.execute(
        'SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
        [decoded.userId]
      );

      if (!vendorResult || vendorResult.length === 0) {
        return res.status(403).json({ success: false, message: '등록된 벤더 정보가 없습니다.' });
      }

      const vendorId = vendorResult[0].id;
      if (booking.vendor_id !== vendorId) {
        return res.status(403).json({ success: false, message: '본인 업체의 예약만 처리할 수 있습니다.' });
      }
    }

    // 3. 예약 상태 확인
    if (!['confirmed', 'in_progress'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        error: `현재 예약 상태(${booking.status})에서는 반납 처리를 할 수 없습니다.`
      });
    }

    // 4. 예정 반납 시간 계산
    const scheduledDropoffTime = new Date(booking.dropoff_date + ' ' + booking.dropoff_time);
    const actualDropoffTime = new Date(actual_dropoff_time);

    // 5. 지연 여부 및 지연 시간 계산
    const lateMs = actualDropoffTime.getTime() - scheduledDropoffTime.getTime();
    const lateMinutes = Math.max(0, Math.floor(lateMs / (1000 * 60)));
    const isLateReturn = lateMinutes > 0;

    // 6. 지연 수수료 계산
    let lateFee = 0;
    if (isLateReturn) {
      // 지연 수수료 정책:
      // - 15분 이내: 무료 (용인)
      // - 15분 ~ 1시간: 10,000원
      // - 1시간 ~ 2시간: 20,000원
      // - 2시간 초과: 시간당 요금 × 1.5배 × 지연 시간

      if (lateMinutes <= 15) {
        lateFee = 0; // 무료 (관용)
      } else if (lateMinutes <= 60) {
        lateFee = 10000;
      } else if (lateMinutes <= 120) {
        lateFee = 20000;
      } else {
        // 2시간 초과: 시간당 요금의 1.5배
        const hourlyRate = booking.hourly_rate_krw || Math.ceil(booking.daily_rate_krw / 24);
        const lateHours = lateMinutes / 60;
        lateFee = Math.ceil(hourlyRate * lateHours * 1.5);
      }
    }

    // 7. 다음 예약 확인 (알림 필요 여부)
    const nextBookingResult = await connection.execute(
      `SELECT
        id, booking_number, customer_name, customer_phone, customer_email,
        pickup_date, pickup_time
      FROM rentcar_bookings
      WHERE vehicle_id = ?
        AND status NOT IN ('cancelled', 'failed', 'completed')
        AND CONCAT(pickup_date, ' ', pickup_time) > ?
      ORDER BY CONCAT(pickup_date, ' ', pickup_time) ASC
      LIMIT 1`,
      [booking.vehicle_id, booking.dropoff_date + ' ' + booking.dropoff_time]
    );

    let nextBookingAlert = null;
    let shouldAlertNextCustomer = false;

    if (nextBookingResult && nextBookingResult.length > 0) {
      const nextBooking = nextBookingResult[0];
      const nextPickupTime = new Date(nextBooking.pickup_date + ' ' + nextBooking.pickup_time);

      // 버퍼 타임 60분 고려
      const BUFFER_TIME_MS = 60 * 60 * 1000;
      const availableTime = new Date(actualDropoffTime.getTime() + BUFFER_TIME_MS);

      // 다음 예약 시작 시간까지 여유가 없으면 알림 필요
      if (availableTime.getTime() > nextPickupTime.getTime()) {
        shouldAlertNextCustomer = true;
        nextBookingAlert = {
          booking_number: nextBooking.booking_number,
          customer_name: nextBooking.customer_name,
          customer_phone: nextBooking.customer_phone,
          customer_email: nextBooking.customer_email,
          scheduled_pickup: nextPickupTime.toISOString(),
          estimated_available: availableTime.toISOString(),
          delay_minutes: Math.ceil((availableTime.getTime() - nextPickupTime.getTime()) / (1000 * 60))
        };
      }
    }

    // 8. DB 업데이트
    await connection.execute(
      `UPDATE rentcar_bookings
       SET
         actual_dropoff_time = ?,
         is_late_return = ?,
         late_minutes = ?,
         late_fee_krw = ?,
         vendor_note = ?,
         status = 'completed',
         total_krw = total_krw + ?,
         updated_at = NOW()
       WHERE id = ?`,
      [
        actualDropoffTime.toISOString().slice(0, 19).replace('T', ' '),
        isLateReturn,
        lateMinutes,
        lateFee,
        vendor_note || null,
        lateFee,
        booking_id
      ]
    );

    // 9. 로그 출력
    console.log(`✅ [반납 처리] 예약 ${booking.booking_number}`);
    console.log(`   - 예정: ${scheduledDropoffTime.toISOString()}`);
    console.log(`   - 실제: ${actualDropoffTime.toISOString()}`);
    console.log(`   - 지연: ${lateMinutes}분`);
    console.log(`   - 수수료: ₩${lateFee.toLocaleString()}`);
    if (shouldAlertNextCustomer) {
      console.log(`   ⚠️ 다음 예약자 알림 필요: ${nextBookingAlert.booking_number}`);
    }

    // 10. 응답
    return res.status(200).json({
      success: true,
      message: '반납 처리가 완료되었습니다.',
      data: {
        booking_id: booking_id,
        booking_number: booking.booking_number,
        scheduled_dropoff: scheduledDropoffTime.toISOString(),
        actual_dropoff: actualDropoffTime.toISOString(),
        is_late: isLateReturn,
        late_minutes: lateMinutes,
        late_fee: lateFee,
        new_total: booking.total_krw + lateFee,
        status: 'completed',
        next_booking_alert: shouldAlertNextCustomer ? nextBookingAlert : null
      }
    });

  } catch (error) {
    console.error('❌ [반납 처리] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const { connect } = require('@planetscale/database');

/**
 * 예약 연장 API
 *
 * 사용자가 현재 예약을 연장하려 할 때:
 * 1. 다음 예약과 충돌하지 않는지 확인 (버퍼 타임 포함)
 * 2. 추가 요금 계산
 * 3. 예약 정보 업데이트
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const {
      booking_id,
      new_dropoff_date,
      new_dropoff_time,
      user_id // 인증용
    } = req.body;

    if (!booking_id || !new_dropoff_date || !new_dropoff_time) {
      return res.status(400).json({
        success: false,
        error: '필수 정보가 누락되었습니다.'
      });
    }

    // 1. 기존 예약 정보 조회
    const bookingResult = await connection.execute(
      `SELECT
        b.*,
        v.daily_rate_krw,
        v.hourly_rate_krw
      FROM rentcar_bookings b
      JOIN rentcar_vehicles v ON b.vehicle_id = v.id
      WHERE b.id = ?`,
      [booking_id]
    );

    if (!bookingResult.rows || bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '예약을 찾을 수 없습니다.'
      });
    }

    const booking = bookingResult.rows[0];

    // 2. 권한 확인 (예약자 본인만 연장 가능)
    if (booking.user_id !== user_id) {
      return res.status(403).json({
        success: false,
        error: '본인의 예약만 연장할 수 있습니다.'
      });
    }

    // 3. 예약 상태 확인 (confirmed 또는 in_progress만 연장 가능)
    if (!['confirmed', 'in_progress'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        error: `현재 예약 상태(${booking.status})에서는 연장할 수 없습니다.`
      });
    }

    // 4. 새 반납 시간 계산
    const [newDropoffHour, newDropoffMinute] = new_dropoff_time.split(':').map(Number);
    const newDropoffDateObj = new Date(new_dropoff_date);
    newDropoffDateObj.setHours(newDropoffHour, newDropoffMinute, 0, 0);

    // 기존 반납 시간
    const [oldDropoffHour, oldDropoffMinute] = booking.dropoff_time.split(':').map(Number);
    const oldDropoffDateObj = new Date(booking.dropoff_date);
    oldDropoffDateObj.setHours(oldDropoffHour, oldDropoffMinute, 0, 0);

    // 5. 연장 시간 검증
    if (newDropoffDateObj.getTime() <= oldDropoffDateObj.getTime()) {
      return res.status(400).json({
        success: false,
        error: '연장 시간은 기존 반납 시간보다 이후여야 합니다.'
      });
    }

    // 최대 24시간까지만 연장 가능
    const maxExtensionMs = 24 * 60 * 60 * 1000;
    const extensionMs = newDropoffDateObj.getTime() - oldDropoffDateObj.getTime();
    if (extensionMs > maxExtensionMs) {
      return res.status(400).json({
        success: false,
        error: '한 번에 최대 24시간까지만 연장할 수 있습니다.'
      });
    }

    // 6. 충돌 감지 (다음 예약과 겹치는지 확인)
    const BUFFER_TIME_MINUTES = 60;

    const conflictCheck = await connection.execute(
      `SELECT
        id, booking_number, pickup_date, pickup_time
      FROM rentcar_bookings
      WHERE vehicle_id = ?
        AND id != ?
        AND status NOT IN ('cancelled', 'failed')
        AND pickup_date >= ?`,
      [booking.vehicle_id, booking_id, booking.dropoff_date]
    );

    // 다음 예약과 충돌 체크
    for (const nextBooking of conflictCheck || []) {
      const [nextPickupHour, nextPickupMinute] = nextBooking.pickup_time.split(':').map(Number);
      const nextPickupDateObj = new Date(nextBooking.pickup_date);
      nextPickupDateObj.setHours(nextPickupHour, nextPickupMinute, 0, 0);

      // 새 반납 시간 + 버퍼 타임이 다음 픽업 시간을 넘으면 충돌
      const newDropoffWithBuffer = new Date(newDropoffDateObj.getTime() + BUFFER_TIME_MINUTES * 60 * 1000);

      if (newDropoffWithBuffer.getTime() > nextPickupDateObj.getTime()) {
        return res.status(409).json({
          success: false,
          error: `다음 예약(${nextBooking.booking_number})과 충돌합니다.\n\n다음 예약 시작: ${nextPickupDateObj.toLocaleString('ko-KR')}\n최대 연장 가능 시간: ${new Date(nextPickupDateObj.getTime() - BUFFER_TIME_MINUTES * 60 * 1000).toLocaleString('ko-KR')}`,
          next_booking: {
            booking_number: nextBooking.booking_number,
            pickup_time: nextPickupDateObj.toISOString(),
            max_extension_time: new Date(nextPickupDateObj.getTime() - BUFFER_TIME_MINUTES * 60 * 1000).toISOString()
          }
        });
      }
    }

    // 7. 추가 요금 계산
    const extensionHours = extensionMs / (1000 * 60 * 60);
    const hourlyRate = booking.hourly_rate_krw || Math.ceil(booking.daily_rate_krw / 24);
    const additionalCharge = Math.ceil(hourlyRate * extensionHours);
    const additionalTax = Math.round(additionalCharge * 0.1);
    const additionalTotal = additionalCharge + additionalTax;

    // 8. 예약 정보 업데이트
    const newTotalKrw = booking.total_krw + additionalTotal;
    const newRentalHours = Math.ceil(
      (newDropoffDateObj.getTime() - new Date(booking.pickup_date + ' ' + booking.pickup_time).getTime()) / (1000 * 60 * 60)
    );

    await connection.execute(
      `UPDATE rentcar_bookings
       SET dropoff_date = ?,
           dropoff_time = ?,
           rental_days = ?,
           subtotal_krw = subtotal_krw + ?,
           tax_krw = tax_krw + ?,
           total_krw = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        new_dropoff_date,
        new_dropoff_time,
        newRentalHours,
        additionalCharge,
        additionalTax,
        newTotalKrw,
        booking_id
      ]
    );

    // 9. 연장 내역 로그 (선택적 - 별도 테이블에 기록)
    console.log(`✅ 예약 연장 완료: ${booking.booking_number}`);
    console.log(`   - 기존 반납: ${oldDropoffDateObj.toISOString()}`);
    console.log(`   - 새 반납: ${newDropoffDateObj.toISOString()}`);
    console.log(`   - 추가 요금: ₩${additionalTotal.toLocaleString()}`);

    return res.status(200).json({
      success: true,
      message: '예약이 연장되었습니다.',
      data: {
        booking_id: booking_id,
        booking_number: booking.booking_number,
        old_dropoff: oldDropoffDateObj.toISOString(),
        new_dropoff: newDropoffDateObj.toISOString(),
        extension_hours: Math.round(extensionHours * 10) / 10,
        additional_charge: additionalCharge,
        additional_tax: additionalTax,
        additional_total: additionalTotal,
        new_total: newTotalKrw,
        payment_required: additionalTotal
      }
    });

  } catch (error) {
    console.error('❌ 예약 연장 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const { connect } = require('@planetscale/database');

/**
 * 투어 바우처 검증 API
 * POST /api/tour/verify-voucher
 *
 * QR 코드 스캔 시 바우처 유효성 검증
 *
 * Body:
 * - voucher_code: 바우처 코드
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { voucher_code } = req.body;

    if (!voucher_code) {
      return res.status(400).json({
        success: false,
        error: '바우처 코드가 필요합니다.'
      });
    }

    // 바우처 조회
    const result = await connection.execute(
      `SELECT
        tb.*,
        ts.departure_date,
        ts.departure_time,
        ts.guide_name,
        tp.package_name,
        tp.duration_days,
        l.title as listing_title
       FROM tour_bookings tb
       INNER JOIN tour_schedules ts ON tb.schedule_id = ts.id
       INNER JOIN tour_packages tp ON ts.package_id = tp.id
       INNER JOIN listings l ON tp.listing_id = l.id
       WHERE tb.voucher_code = ?`,
      [voucher_code]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: '유효하지 않은 바우처입니다.'
      });
    }

    const booking = result.rows[0];

    // 상태별 검증
    const validationResult = {
      booking_number: booking.booking_number,
      package_name: booking.package_name,
      departure_date: booking.departure_date,
      departure_time: booking.departure_time,
      participants: booking.adult_count + booking.child_count + booking.infant_count,
      adult_count: booking.adult_count,
      child_count: booking.child_count,
      infant_count: booking.infant_count
    };

    // 1. 취소된 예약
    if (booking.status === 'canceled') {
      return res.status(200).json({
        success: true,
        valid: false,
        message: '취소된 예약입니다.',
        reason: 'CANCELED',
        data: validationResult
      });
    }

    // 2. 결제 미완료
    if (booking.payment_status !== 'paid') {
      return res.status(200).json({
        success: true,
        valid: false,
        message: '결제가 완료되지 않은 예약입니다.',
        reason: 'PAYMENT_PENDING',
        data: validationResult
      });
    }

    // 3. 이미 체크인됨
    if (booking.status === 'checked_in' || booking.status === 'completed') {
      return res.status(200).json({
        success: true,
        valid: true,
        message: '이미 체크인된 바우처입니다.',
        reason: 'ALREADY_CHECKED_IN',
        checked_in_at: booking.checked_in_at,
        data: validationResult
      });
    }

    // 4. No-show
    if (booking.status === 'no_show') {
      return res.status(200).json({
        success: true,
        valid: false,
        message: 'No-show 처리된 예약입니다.',
        reason: 'NO_SHOW',
        data: validationResult
      });
    }

    // 5. 유효한 바우처
    return res.status(200).json({
      success: true,
      valid: true,
      message: '유효한 바우처입니다. 체크인 가능합니다.',
      reason: 'VALID',
      data: validationResult
    });

  } catch (error) {
    console.error('❌ [Tour Verify Voucher API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

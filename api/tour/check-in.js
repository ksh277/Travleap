const { connect } = require('@planetscale/database');

/**
 * 투어 체크인 API (가이드용)
 * POST /api/tour/check-in
 *
 * Body:
 * - booking_id: 예약 ID
 * - voucher_code: 바우처 코드
 * - guide_name: 가이드 이름
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
    const { booking_id, voucher_code, guide_name } = req.body;

    if (!booking_id && !voucher_code) {
      return res.status(400).json({
        success: false,
        error: '예약 ID 또는 바우처 코드가 필요합니다.'
      });
    }

    // 예약 조회
    const query = booking_id
      ? 'SELECT * FROM tour_bookings WHERE id = ?'
      : 'SELECT * FROM tour_bookings WHERE voucher_code = ?';
    const param = booking_id || voucher_code;

    const result = await connection.execute(query, [param]);

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '예약을 찾을 수 없습니다.'
      });
    }

    const booking = result.rows[0];

    // 예약 상태 확인
    if (booking.status === 'canceled') {
      return res.status(400).json({
        success: false,
        error: '취소된 예약입니다.'
      });
    }

    if (booking.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: '결제가 완료되지 않은 예약입니다.'
      });
    }

    if (booking.status === 'checked_in') {
      return res.status(400).json({
        success: false,
        error: '이미 체크인된 예약입니다.',
        checked_in_at: booking.checked_in_at
      });
    }

    // 체크인 처리
    await connection.execute(
      `UPDATE tour_bookings
       SET status = 'checked_in',
           checked_in_at = NOW(),
           checked_in_by = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [guide_name || 'Unknown', booking.id]
    );

    console.log(`✅ [Tour Check-in] 예약 ${booking.booking_number} 체크인 완료`);

    return res.status(200).json({
      success: true,
      message: '체크인이 완료되었습니다.',
      data: {
        booking_number: booking.booking_number,
        participants: booking.adult_count + booking.child_count + booking.infant_count,
        checked_in_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [Tour Check-in API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const { connect } = require('@planetscale/database');

/**
 * 투어 바우처 조회 API
 * GET /api/tour/voucher/[bookingId]
 *
 * 예약 확정 후 바우처와 QR 코드 조회
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { bookingId } = req.query;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: '예약 ID가 필요합니다.'
      });
    }

    const result = await connection.execute(
      `SELECT
        tb.id,
        tb.booking_number,
        tb.voucher_code,
        tb.qr_code,
        tb.adult_count,
        tb.child_count,
        tb.infant_count,
        tb.total_price_krw,
        tb.status,
        tb.payment_status,
        tb.created_at,
        ts.departure_date,
        ts.departure_time,
        ts.guide_name,
        ts.guide_phone,
        tp.package_name,
        tp.duration_days,
        tp.duration_nights,
        tp.meeting_point,
        tp.meeting_time,
        l.title as listing_title,
        l.location,
        l.images as listing_images
       FROM tour_bookings tb
       INNER JOIN tour_schedules ts ON tb.schedule_id = ts.id
       INNER JOIN tour_packages tp ON ts.package_id = tp.id
       INNER JOIN listings l ON tp.listing_id = l.id
       WHERE tb.id = ?`,
      [bookingId]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '예약을 찾을 수 없습니다.'
      });
    }

    const voucher = result.rows[0];

    // 결제 완료되지 않은 경우
    if (voucher.payment_status !== 'paid') {
      return res.status(403).json({
        success: false,
        error: '결제가 완료되지 않아 바우처를 조회할 수 없습니다.'
      });
    }

    // 취소된 예약
    if (voucher.status === 'canceled') {
      return res.status(403).json({
        success: false,
        error: '취소된 예약입니다.'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...voucher,
        listing_images: voucher.listing_images ? JSON.parse(voucher.listing_images) : [],
        total_participants: voucher.adult_count + voucher.child_count + voucher.infant_count
      }
    });

  } catch (error) {
    console.error('❌ [Tour Voucher API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

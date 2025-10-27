import { db } from '../../utils/database';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { voucher_code } = req.body;

    if (!voucher_code) {
      return res.status(400).json({
        success: false,
        message: '바우처 코드를 입력해주세요.'
      });
    }

    // Find booking by voucher code
    const [bookings] = await db.query(`
      SELECT
        rb.id,
        rb.booking_number,
        rb.status,
        rb.vehicle_id,
        rb.customer_name,
        rb.customer_phone,
        rb.driver_name,
        rb.driver_license_no,
        rb.pickup_at_utc,
        rb.return_at_utc,
        rb.pickup_location,
        rb.total_price_krw,
        rb.voucher_code,
        rv.model as vehicle_model,
        rv.vehicle_code,
        rv.primary_image as vehicle_image
      FROM rentcar_bookings rb
      LEFT JOIN rentcar_vehicles rv ON rb.vehicle_id = rv.id
      WHERE rb.voucher_code = ?
      LIMIT 1
    `, [voucher_code]);

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: '유효하지 않은 바우처 코드입니다.'
      });
    }

    const booking = bookings[0];

    // Check if booking is in valid status for voucher verification
    if (!['confirmed', 'in_progress'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `이 바우처는 사용할 수 없는 상태입니다. (현재 상태: ${booking.status})`
      });
    }

    // Log voucher verification event
    await db.execute(`
      INSERT INTO rentcar_rental_events
      (rental_id, event_type, event_data, created_at)
      VALUES (?, 'voucher_verified', ?, NOW())
    `, [
      booking.id,
      JSON.stringify({
        voucher_code,
        verified_at: new Date().toISOString()
      })
    ]);

    return res.status(200).json({
      success: true,
      message: '바우처 인증 완료',
      data: booking
    });

  } catch (error) {
    console.error('Voucher verification error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}

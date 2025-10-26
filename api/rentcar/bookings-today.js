import db from '../../utils/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: '시작 시간과 종료 시간을 제공해주세요.'
      });
    }

    // Get all bookings that have pickup or return scheduled for today
    const [bookings] = await db.query(`
      SELECT
        rb.id,
        rb.booking_number,
        rb.status,
        rb.vehicle_id,
        rb.customer_name,
        rb.customer_phone,
        rb.driver_name,
        rb.driver_birth,
        rb.driver_license_no,
        rb.driver_license_exp,
        rb.pickup_at_utc,
        rb.return_at_utc,
        rb.actual_return_at_utc,
        rb.pickup_location,
        rb.total_price_krw,
        rb.late_return_hours,
        rb.late_return_fee_krw,
        rb.voucher_code,
        rv.model as vehicle_model,
        rv.vehicle_code,
        rv.primary_image as vehicle_image
      FROM rentcar_bookings rb
      LEFT JOIN rentcar_vehicles rv ON rb.vehicle_id = rv.id
      WHERE rb.status IN ('confirmed', 'in_progress')
      AND (
        (rb.pickup_at_utc >= ? AND rb.pickup_at_utc <= ?)
        OR
        (rb.return_at_utc >= ? AND rb.return_at_utc <= ?)
      )
      ORDER BY rb.pickup_at_utc ASC
    `, [start, end, start, end]);

    return res.status(200).json({
      success: true,
      message: `오늘 예약 ${bookings.length}건 조회 완료`,
      data: bookings
    });

  } catch (error) {
    console.error('Today bookings fetch error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}

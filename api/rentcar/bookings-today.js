import { db } from '../../utils/database';

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
        rb.customer_email,
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
        rb.insurance_id,
        rb.insurance_fee_krw,
        rv.model as vehicle_model,
        rv.vehicle_code,
        rv.primary_image as vehicle_image,
        ri.name as insurance_name
      FROM rentcar_bookings rb
      LEFT JOIN rentcar_vehicles rv ON rb.vehicle_id = rv.id
      LEFT JOIN rentcar_insurance ri ON rb.insurance_id = ri.id
      WHERE rb.status IN ('confirmed', 'in_progress')
      AND (
        (rb.pickup_at_utc >= ? AND rb.pickup_at_utc <= ?)
        OR
        (rb.return_at_utc >= ? AND rb.return_at_utc <= ?)
      )
      ORDER BY rb.pickup_at_utc ASC
    `, [start, end, start, end]);

    // 예약 ID 목록 추출
    const bookingIds = bookings.map(b => b.id);

    // extras 정보 조회 (있는 경우만)
    let extrasData = [];
    if (bookingIds.length > 0) {
      try {
        const [extrasResult] = await db.query(
          `SELECT
            rbe.booking_id,
            rbe.extra_id,
            rbe.quantity,
            rbe.unit_price_krw,
            rbe.total_price_krw,
            re.name as extra_name,
            re.category,
            re.price_type
          FROM rentcar_booking_extras rbe
          LEFT JOIN rentcar_extras re ON rbe.extra_id = re.id
          WHERE rbe.booking_id IN (${bookingIds.map(() => '?').join(',')})`,
          bookingIds
        );

        extrasData = extrasResult || [];
      } catch (extrasError) {
        // rentcar_booking_extras 테이블이 없을 수 있음
        console.warn('⚠️  [Today Bookings API] extras 조회 실패 (테이블 없음):', extrasError.message);
      }
    }

    // extras를 각 예약에 매핑
    const bookingsWithExtras = bookings.map(booking => {
      const bookingExtras = extrasData
        .filter(e => e.booking_id === booking.id)
        .map(e => ({
          extra_id: e.extra_id,
          name: e.extra_name || '(삭제된 옵션)',
          category: e.category,
          price_type: e.price_type,
          quantity: e.quantity,
          unit_price: Number(e.unit_price_krw || 0),
          total_price: Number(e.total_price_krw || 0)
        }));

      return {
        ...booking,
        extras: bookingExtras,
        extras_count: bookingExtras.length,
        extras_total: bookingExtras.reduce((sum, e) => sum + e.total_price, 0)
      };
    });

    return res.status(200).json({
      success: true,
      message: `오늘 예약 ${bookingsWithExtras.length}건 조회 완료`,
      data: bookingsWithExtras
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

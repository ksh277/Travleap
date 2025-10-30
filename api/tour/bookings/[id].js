const { connect } = require('@planetscale/database');

/**
 * 투어 예약 조회/수정 API
 * GET /api/tour/bookings/[id] - 예약 상세 조회
 * PATCH /api/tour/bookings/[id] - 예약 상태 업데이트
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: '예약 ID가 필요합니다.'
      });
    }

    // GET: 예약 조회
    if (req.method === 'GET') {
      const result = await connection.execute(
        `SELECT
          tb.*,
          ts.departure_date,
          ts.departure_time,
          ts.guide_name,
          tp.package_name,
          tp.duration_days,
          tp.duration_nights,
          tp.meeting_point,
          tp.meeting_time,
          l.title as listing_title,
          l.location
         FROM tour_bookings tb
         INNER JOIN tour_schedules ts ON tb.schedule_id = ts.id
         INNER JOIN tour_packages tp ON ts.package_id = tp.id
         INNER JOIN listings l ON tp.listing_id = l.id
         WHERE tb.id = ?`,
        [id]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '예약을 찾을 수 없습니다.'
        });
      }

      const booking = result.rows[0];

      // JSON 필드 파싱
      return res.status(200).json({
        success: true,
        data: {
          ...booking,
          participants: booking.participants ? JSON.parse(booking.participants) : []
        }
      });
    }

    // PATCH: 예약 상태 업데이트
    if (req.method === 'PATCH') {
      const { status, payment_status } = req.body;

      const updates = [];
      const values = [];

      if (status) {
        updates.push('status = ?');
        values.push(status);
      }

      if (payment_status) {
        updates.push('payment_status = ?');
        values.push(payment_status);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: '업데이트할 정보가 없습니다.'
        });
      }

      updates.push('updated_at = NOW()');
      values.push(id);

      await connection.execute(
        `UPDATE tour_bookings SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      // 결제 완료 시 예약 상태를 confirmed로 변경
      if (payment_status === 'paid' && status === 'pending') {
        await connection.execute(
          `UPDATE tour_bookings SET status = 'confirmed' WHERE id = ?`,
          [id]
        );
      }

      console.log(`✅ [Tour Booking Update] 예약 ID ${id} 상태 업데이트 완료`);

      return res.status(200).json({
        success: true,
        message: '예약 상태가 업데이트되었습니다.'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ [Tour Booking Detail API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

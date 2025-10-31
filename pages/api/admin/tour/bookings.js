/**
 * 관리자 - 투어 예약 관리 API
 * GET /api/admin/tour/bookings - 투어 예약 목록 조회
 * PUT /api/admin/tour/bookings - 예약 상태 수정
 * DELETE /api/admin/tour/bookings - 예약 취소 (환불 처리)
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  // GET: 투어 예약 목록 조회
  if (req.method === 'GET') {
    try {
      const { booking_id, user_id, package_id, schedule_id, status, from_date, to_date } = req.query;

      let query = `
        SELECT
          tb.*,
          tp.package_name,
          tp.thumbnail_url,
          ts.departure_date,
          ts.departure_time,
          ts.guide_name,
          u.username,
          u.email as user_email,
          u.phone as user_phone
        FROM tour_bookings tb
        LEFT JOIN tour_schedules ts ON tb.schedule_id = ts.id
        LEFT JOIN tour_packages tp ON ts.package_id = tp.id
        LEFT JOIN users u ON tb.user_id = u.id
        WHERE 1=1
      `;

      const params = [];

      if (booking_id) {
        query += ` AND tb.id = ?`;
        params.push(booking_id);
      }

      if (user_id) {
        query += ` AND tb.user_id = ?`;
        params.push(user_id);
      }

      if (package_id) {
        query += ` AND ts.package_id = ?`;
        params.push(package_id);
      }

      if (schedule_id) {
        query += ` AND tb.schedule_id = ?`;
        params.push(schedule_id);
      }

      if (status) {
        query += ` AND tb.status = ?`;
        params.push(status);
      }

      if (from_date) {
        query += ` AND ts.departure_date >= ?`;
        params.push(from_date);
      }

      if (to_date) {
        query += ` AND ts.departure_date <= ?`;
        params.push(to_date);
      }

      query += `
        ORDER BY tb.created_at DESC
      `;

      const result = await connection.execute(query, params);

      return res.status(200).json({
        success: true,
        bookings: result.rows || []
      });

    } catch (error) {
      console.error('❌ [Tour Bookings GET] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // PUT: 예약 상태 수정
  if (req.method === 'PUT') {
    try {
      const {
        booking_id,
        status,
        admin_note
      } = req.body;

      if (!booking_id) {
        return res.status(400).json({
          success: false,
          error: 'booking_id가 필요합니다.'
        });
      }

      // 기존 예약 정보 확인
      const bookingCheck = await connection.execute(`
        SELECT tb.*, ts.current_participants, ts.id as schedule_id
        FROM tour_bookings tb
        LEFT JOIN tour_schedules ts ON tb.schedule_id = ts.id
        WHERE tb.id = ?
      `, [booking_id]);

      if (!bookingCheck.rows || bookingCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '예약을 찾을 수 없습니다.'
        });
      }

      const currentBooking = bookingCheck.rows[0];

      // 업데이트할 필드
      const updates = [];
      const values = [];

      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);

        // 예약 취소 시 일정의 참가자 수 감소
        if (status === 'canceled' && currentBooking.status !== 'canceled') {
          const totalParticipants =
            (currentBooking.adult_count || 0) +
            (currentBooking.child_count || 0) +
            (currentBooking.infant_count || 0);

          await connection.execute(`
            UPDATE tour_schedules
            SET current_participants = GREATEST(0, current_participants - ?)
            WHERE id = ?
          `, [totalParticipants, currentBooking.schedule_id]);

          console.log(`✅ [Tour Schedule] 참가자 수 감소: -${totalParticipants}`);
        }

        // 취소된 예약을 다시 확정으로 변경 시 참가자 수 증가
        if (status === 'confirmed' && currentBooking.status === 'canceled') {
          const totalParticipants =
            (currentBooking.adult_count || 0) +
            (currentBooking.child_count || 0) +
            (currentBooking.infant_count || 0);

          await connection.execute(`
            UPDATE tour_schedules
            SET current_participants = current_participants + ?
            WHERE id = ?
          `, [totalParticipants, currentBooking.schedule_id]);

          console.log(`✅ [Tour Schedule] 참가자 수 증가: +${totalParticipants}`);
        }
      }

      if (admin_note !== undefined) {
        updates.push('admin_note = ?');
        values.push(admin_note);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: '수정할 필드가 없습니다.'
        });
      }

      updates.push('updated_at = NOW()');
      values.push(booking_id);

      const query = `UPDATE tour_bookings SET ${updates.join(', ')} WHERE id = ?`;
      await connection.execute(query, values);

      console.log(`✅ [Tour Booking] 수정 완료: booking_id=${booking_id}, status=${status}`);

      return res.status(200).json({
        success: true,
        message: '예약 상태가 수정되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Tour Bookings PUT] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // DELETE: 예약 취소 (환불 처리)
  if (req.method === 'DELETE') {
    try {
      const { booking_id, refund_reason } = req.query;

      if (!booking_id) {
        return res.status(400).json({
          success: false,
          error: 'booking_id가 필요합니다.'
        });
      }

      // 예약 정보 조회
      const bookingResult = await connection.execute(`
        SELECT tb.*, ts.id as schedule_id
        FROM tour_bookings tb
        LEFT JOIN tour_schedules ts ON tb.schedule_id = ts.id
        WHERE tb.id = ?
      `, [booking_id]);

      if (!bookingResult.rows || bookingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '예약을 찾을 수 없습니다.'
        });
      }

      const booking = bookingResult.rows[0];

      if (booking.status === 'canceled') {
        return res.status(400).json({
          success: false,
          error: '이미 취소된 예약입니다.'
        });
      }

      // 예약 취소 처리
      await connection.execute(`
        UPDATE tour_bookings
        SET status = 'canceled',
            refund_reason = ?,
            canceled_at = NOW(),
            updated_at = NOW()
        WHERE id = ?
      `, [refund_reason || '관리자 취소', booking_id]);

      // 일정의 참가자 수 감소
      const totalParticipants =
        (booking.adult_count || 0) +
        (booking.child_count || 0) +
        (booking.infant_count || 0);

      await connection.execute(`
        UPDATE tour_schedules
        SET current_participants = GREATEST(0, current_participants - ?)
        WHERE id = ?
      `, [totalParticipants, booking.schedule_id]);

      console.log(`✅ [Tour Booking] 취소 완료: booking_id=${booking_id}, refund=${booking.total_price_krw}원`);

      return res.status(200).json({
        success: true,
        message: '예약이 취소되었습니다.',
        refund_amount: booking.total_price_krw
      });

    } catch (error) {
      console.error('❌ [Tour Bookings DELETE] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
};

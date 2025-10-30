const { connect } = require('@planetscale/database');

/**
 * 체험 예약 조회/수정 API
 * GET /api/experience/bookings/[id]
 * PATCH /api/experience/bookings/[id]
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
          eb.*,
          es.date,
          es.start_time,
          es.end_time,
          e.name as experience_name,
          e.type,
          e.waiver_required,
          e.safety_briefing_required,
          l.title as listing_title,
          l.location
         FROM experience_bookings eb
         INNER JOIN experience_slots es ON eb.slot_id = es.id
         INNER JOIN experiences e ON es.experience_id = e.id
         INNER JOIN listings l ON e.listing_id = l.id
         WHERE eb.id = ?`,
        [id]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '예약을 찾을 수 없습니다.'
        });
      }

      const booking = result.rows[0];

      return res.status(200).json({
        success: true,
        data: {
          ...booking,
          participants: booking.participants ? JSON.parse(booking.participants) : [],
          equipment_rental_items: booking.equipment_rental_items ? JSON.parse(booking.equipment_rental_items) : []
        }
      });
    }

    // PATCH: 예약 상태 업데이트
    if (req.method === 'PATCH') {
      const {
        status,
        payment_status,
        waiver_signed,
        waiver_signature_data,
        safety_video_watched
      } = req.body;

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

      if (waiver_signed !== undefined) {
        updates.push('waiver_signed = ?');
        values.push(waiver_signed);
        if (waiver_signed) {
          updates.push('waiver_signed_at = NOW()');
          if (waiver_signature_data) {
            updates.push('waiver_signature_data = ?');
            values.push(waiver_signature_data);
          }
        }
      }

      if (safety_video_watched !== undefined) {
        updates.push('safety_video_watched = ?');
        values.push(safety_video_watched);
        if (safety_video_watched) {
          updates.push('safety_video_watched_at = NOW()');
        }
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
        `UPDATE experience_bookings SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      console.log(`✅ [Experience Booking Update] 예약 ID ${id} 업데이트`);

      return res.status(200).json({
        success: true,
        message: '예약 정보가 업데이트되었습니다.'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ [Experience Booking Detail API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

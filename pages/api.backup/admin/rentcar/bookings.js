/**
 * 관리자 - 렌트카 예약 관리 API
 * GET /api/admin/rentcar/bookings - 예약 목록 조회
 * PUT /api/admin/rentcar/bookings - 예약 상태 수정
 * DELETE /api/admin/rentcar/bookings - 예약 취소 (환불)
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

  // GET: 예약 목록 조회
  if (req.method === 'GET') {
    try {
      const { booking_id, vendor_id, vehicle_id, status, from_date, to_date } = req.query;

      let query = `
        SELECT
          b.*,
          v.display_name as vehicle_name,
          v.brand,
          v.model,
          vd.business_name as vendor_name
        FROM rentcar_bookings b
        LEFT JOIN rentcar_vehicles v ON b.vehicle_id = v.id
        LEFT JOIN rentcar_vendors vd ON b.vendor_id = vd.id
        WHERE 1=1
      `;

      const params = [];

      if (booking_id) {
        query += ` AND b.id = ?`;
        params.push(booking_id);
      }
      if (vendor_id) {
        query += ` AND b.vendor_id = ?`;
        params.push(vendor_id);
      }
      if (vehicle_id) {
        query += ` AND b.vehicle_id = ?`;
        params.push(vehicle_id);
      }
      if (status) {
        query += ` AND b.status = ?`;
        params.push(status);
      }
      if (from_date) {
        query += ` AND b.pickup_date >= ?`;
        params.push(from_date);
      }
      if (to_date) {
        query += ` AND b.pickup_date <= ?`;
        params.push(to_date);
      }

      query += ` ORDER BY b.created_at DESC`;

      const result = await connection.execute(query, params);

      return res.status(200).json({
        success: true,
        bookings: result.rows || []
      });

    } catch (error) {
      console.error('❌ [Rentcar Bookings GET] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // PUT: 예약 상태 수정
  if (req.method === 'PUT') {
    try {
      const { booking_id, status, cancellation_reason } = req.body;

      if (!booking_id) {
        return res.status(400).json({
          success: false,
          error: 'booking_id가 필요합니다.'
        });
      }

      const updates = [];
      const values = [];

      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
      }
      if (cancellation_reason !== undefined) {
        updates.push('cancellation_reason = ?');
        values.push(cancellation_reason);
      }
      if (status === 'cancelled') {
        updates.push('cancelled_at = NOW()');
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: '수정할 필드가 없습니다.'
        });
      }

      updates.push('updated_at = NOW()');
      values.push(booking_id);

      const query = `UPDATE rentcar_bookings SET ${updates.join(', ')} WHERE id = ?`;
      await connection.execute(query, values);

      console.log(`✅ [Rentcar Booking] 수정 완료: booking_id=${booking_id}, status=${status}`);

      return res.status(200).json({
        success: true,
        message: '예약 상태가 수정되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Rentcar Bookings PUT] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // DELETE: 예약 취소
  if (req.method === 'DELETE') {
    try {
      const { booking_id, refund_reason } = req.query;

      if (!booking_id) {
        return res.status(400).json({
          success: false,
          error: 'booking_id가 필요합니다.'
        });
      }

      const bookingResult = await connection.execute(`
        SELECT * FROM rentcar_bookings WHERE id = ?
      `, [booking_id]);

      if (!bookingResult.rows || bookingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '예약을 찾을 수 없습니다.'
        });
      }

      const booking = bookingResult.rows[0];

      if (booking.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          error: '이미 취소된 예약입니다.'
        });
      }

      await connection.execute(`
        UPDATE rentcar_bookings
        SET status = 'cancelled',
            cancellation_reason = ?,
            cancelled_at = NOW(),
            updated_at = NOW()
        WHERE id = ?
      `, [refund_reason || '관리자 취소', booking_id]);

      console.log(`✅ [Rentcar Booking] 취소 완료: booking_id=${booking_id}, refund=${booking.total_price_krw}원`);

      return res.status(200).json({
        success: true,
        message: '예약이 취소되었습니다.',
        refund_amount: booking.total_price_krw
      });

    } catch (error) {
      console.error('❌ [Rentcar Bookings DELETE] Error:', error);
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

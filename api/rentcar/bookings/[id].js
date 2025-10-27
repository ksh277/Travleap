const { connect } = require('@planetscale/database');

/**
 * 렌트카 예약 상태 업데이트 API
 * PUT /api/rentcar/bookings/[id]
 *
 * 결제 완료 시 예약 상태를 confirmed로 변경하고
 * 해당 차량을 예약 불가 상태로 설정
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // GET: 특정 예약 조회
    if (req.method === 'GET') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: '예약 ID가 필요합니다.'
        });
      }

      const result = await connection.execute(
        `SELECT b.*,
                v.display_name, v.vehicle_class, v.thumbnail_url,
                ve.business_name as vendor_name
         FROM rentcar_bookings b
         INNER JOIN rentcar_vehicles v ON b.vehicle_id = v.id
         INNER JOIN rentcar_vendors ve ON b.vendor_id = ve.id
         WHERE b.id = ?`,
        [id]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '예약을 찾을 수 없습니다.'
        });
      }

      return res.status(200).json({
        success: true,
        data: result.rows[0]
      });
    }

    // PUT: 예약 상태 업데이트
    if (req.method === 'PUT') {
      const { id } = req.query;
      const { booking_status, payment_status } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: '예약 ID가 필요합니다.'
        });
      }

      // 예약 정보 조회 (vehicle_id 필요)
      const bookingResult = await connection.execute(
        'SELECT vehicle_id, status FROM rentcar_bookings WHERE id = ?',
        [id]
      );

      if (!bookingResult.rows || bookingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '예약을 찾을 수 없습니다.'
        });
      }

      const booking = bookingResult.rows[0];
      const vehicleId = booking.vehicle_id;

      // 예약 상태 업데이트
      const updates = [];
      const values = [];

      if (booking_status) {
        updates.push('status = ?');
        values.push(booking_status);
      }
      if (payment_status) {
        updates.push('payment_status = ?');
        values.push(payment_status);
      }

      if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        values.push(id);

        await connection.execute(
          `UPDATE rentcar_bookings SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }

      // ✅ 핵심: 결제 완료되면 차량을 예약 불가로 설정
      if (booking_status === 'confirmed' && payment_status === 'completed') {
        await connection.execute(
          'UPDATE rentcar_vehicles SET is_active = 0, updated_at = NOW() WHERE id = ?',
          [vehicleId]
        );

        console.log(`✅ [Booking] 차량 ID ${vehicleId} 예약 불가 처리 완료`);
      }

      return res.status(200).json({
        success: true,
        message: '예약 상태가 업데이트되었습니다.',
        vehicle_disabled: booking_status === 'confirmed' && payment_status === 'completed'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ [Booking Update API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const { connect } = require('@planetscale/database');

/**
 * 관리자 투어 일정 관리 API
 * GET /api/admin/tour/schedules - 일정 목록 조회
 * POST /api/admin/tour/schedules - 일정 생성
 * PUT /api/admin/tour/schedules - 일정 수정
 * DELETE /api/admin/tour/schedules - 일정 취소
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // GET: 일정 목록 조회
    if (req.method === 'GET') {
      const { package_id, status, start_date, end_date, limit = 100, offset = 0 } = req.query;

      const conditions = [];
      const params = [];

      if (package_id) {
        conditions.push('ts.package_id = ?');
        params.push(package_id);
      }

      if (status) {
        conditions.push('ts.status = ?');
        params.push(status);
      }

      if (start_date) {
        conditions.push('ts.departure_date >= ?');
        params.push(start_date);
      }

      if (end_date) {
        conditions.push('ts.departure_date <= ?');
        params.push(end_date);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await connection.execute(
        `SELECT
          ts.*,
          tp.package_name,
          tp.duration_days,
          (ts.max_participants - ts.current_participants) as available_seats,
          COUNT(tb.id) as booking_count
         FROM tour_schedules ts
         INNER JOIN tour_packages tp ON ts.package_id = tp.id
         LEFT JOIN tour_bookings tb ON ts.id = tb.schedule_id AND tb.status != 'canceled'
         ${whereClause}
         GROUP BY ts.id
         ORDER BY ts.departure_date ASC, ts.departure_time ASC
         LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), parseInt(offset)]
      );

      return res.status(200).json({
        success: true,
        data: result.rows
      });
    }

    // POST: 일정 생성
    if (req.method === 'POST') {
      const {
        package_id,
        departure_date,
        departure_time,
        guide_id,
        guide_name,
        guide_phone,
        guide_language,
        max_participants,
        min_participants,
        price_adult_krw,
        price_child_krw
      } = req.body;

      // 필수 필드 확인
      if (!package_id || !departure_date || !departure_time || !max_participants) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다.'
        });
      }

      // 동일한 날짜/시간에 이미 일정이 있는지 확인
      const duplicateCheck = await connection.execute(
        `SELECT id FROM tour_schedules
         WHERE package_id = ? AND departure_date = ? AND departure_time = ?`,
        [package_id, departure_date, departure_time]
      );

      if (duplicateCheck.rows && duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: '해당 날짜/시간에 이미 일정이 존재합니다.'
        });
      }

      const result = await connection.execute(
        `INSERT INTO tour_schedules (
          package_id, departure_date, departure_time,
          guide_id, guide_name, guide_phone, guide_language,
          max_participants, min_participants,
          price_adult_krw, price_child_krw, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
        [
          package_id, departure_date, departure_time,
          guide_id, guide_name, guide_phone, guide_language || 'ko',
          max_participants, min_participants || 10,
          price_adult_krw, price_child_krw
        ]
      );

      console.log(`✅ [Admin] 투어 일정 생성 완료: ${departure_date} ${departure_time}`);

      return res.status(201).json({
        success: true,
        message: '일정이 생성되었습니다.',
        data: { id: result.insertId }
      });
    }

    // PUT: 일정 수정
    if (req.method === 'PUT') {
      const { id, ...updateData } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: '일정 ID가 필요합니다.'
        });
      }

      const updates = [];
      const values = [];

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          updates.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: '업데이트할 정보가 없습니다.'
        });
      }

      updates.push('updated_at = NOW()');
      values.push(id);

      await connection.execute(
        `UPDATE tour_schedules SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      console.log(`✅ [Admin] 투어 일정 수정 완료: ID ${id}`);

      return res.status(200).json({
        success: true,
        message: '일정이 수정되었습니다.'
      });
    }

    // DELETE: 일정 취소
    if (req.method === 'DELETE') {
      const { id, cancelation_reason } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: '일정 ID가 필요합니다.'
        });
      }

      // 예약이 있는지 확인
      const bookingCheck = await connection.execute(
        `SELECT COUNT(*) as count FROM tour_bookings
         WHERE schedule_id = ? AND status NOT IN ('canceled', 'no_show')`,
        [id]
      );

      const bookingCount = bookingCheck.rows[0]?.count || 0;

      if (bookingCount > 0) {
        // 예약이 있으면 취소 처리 + 예약도 모두 취소
        await connection.execute(
          `UPDATE tour_schedules
           SET status = 'canceled', cancelation_reason = ?, updated_at = NOW()
           WHERE id = ?`,
          [cancelation_reason || '관리자 취소', id]
        );

        // 해당 일정의 모든 예약 취소
        await connection.execute(
          `UPDATE tour_bookings
           SET status = 'canceled', updated_at = NOW()
           WHERE schedule_id = ? AND status NOT IN ('canceled', 'no_show')`,
          [id]
        );

        console.log(`✅ [Admin] 투어 일정 취소 완료: ID ${id} (예약 ${bookingCount}건 취소)`);

        return res.status(200).json({
          success: true,
          message: `일정이 취소되었습니다. (${bookingCount}건의 예약도 취소됨)`
        });
      } else {
        // 예약이 없으면 삭제
        await connection.execute('DELETE FROM tour_schedules WHERE id = ?', [id]);

        console.log(`✅ [Admin] 투어 일정 삭제 완료: ID ${id}`);

        return res.status(200).json({
          success: true,
          message: '일정이 삭제되었습니다.'
        });
      }
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ [Admin Tour Schedules API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

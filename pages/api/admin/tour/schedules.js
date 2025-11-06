/**
 * 관리자 - 투어 일정 관리 API
 * GET /api/admin/tour/schedules - 투어 일정 조회
 * POST /api/admin/tour/schedules - 새 일정 생성
 * PUT /api/admin/tour/schedules - 일정 수정
 * DELETE /api/admin/tour/schedules - 일정 삭제
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  // GET: 투어 일정 조회
  if (req.method === 'GET') {
    try {
      const { schedule_id, package_id, from_date, to_date, status } = req.query;

      let query = `
        SELECT
          ts.*,
          tp.package_name,
          tp.duration_days,
          tp.duration_nights,
          tp.thumbnail_url,
          COUNT(tb.id) as booking_count
        FROM tour_schedules ts
        LEFT JOIN tour_packages tp ON ts.package_id = tp.id
        LEFT JOIN tour_bookings tb ON ts.id = tb.schedule_id AND tb.status != 'canceled'
        WHERE 1=1
      `;

      const params = [];

      if (schedule_id) {
        query += ` AND ts.id = ?`;
        params.push(schedule_id);
      }

      if (package_id) {
        query += ` AND ts.package_id = ?`;
        params.push(package_id);
      }

      if (from_date) {
        query += ` AND ts.departure_date >= ?`;
        params.push(from_date);
      }

      if (to_date) {
        query += ` AND ts.departure_date <= ?`;
        params.push(to_date);
      }

      if (status) {
        query += ` AND ts.status = ?`;
        params.push(status);
      }

      query += `
        GROUP BY ts.id
        ORDER BY ts.departure_date ASC, ts.departure_time ASC
      `;

      const result = await connection.execute(query, params);

      return res.status(200).json({
        success: true,
        schedules: result.rows || []
      });

    } catch (error) {
      console.error('❌ [Tour Schedules GET] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // POST: 새 일정 생성
  if (req.method === 'POST') {
    try {
      const {
        package_id,
        departure_date,
        departure_time,
        guide_name,
        guide_phone,
        guide_language,
        max_participants,
        min_participants,
        price_adult_krw,
        price_child_krw
      } = req.body;

      // 필수 필드 검증
      if (!package_id || !departure_date || !departure_time || !max_participants) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다.'
        });
      }

      // 패키지 정보 확인
      const packageCheck = await connection.execute(`
        SELECT price_adult_krw, price_child_krw, min_participants, max_participants
        FROM tour_packages
        WHERE id = ? AND is_active = 1
      `, [package_id]);

      if (!packageCheck.rows || packageCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '투어 패키지를 찾을 수 없습니다.'
        });
      }

      const packageData = packageCheck.rows[0];

      // 중복 일정 확인
      const duplicateCheck = await connection.execute(`
        SELECT id FROM tour_schedules
        WHERE package_id = ? AND departure_date = ? AND departure_time = ?
      `, [package_id, departure_date, departure_time]);

      if (duplicateCheck.rows && duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: '이미 동일한 출발 시간에 일정이 존재합니다.'
        });
      }

      const result = await connection.execute(`
        INSERT INTO tour_schedules (
          package_id,
          departure_date,
          departure_time,
          guide_name,
          guide_phone,
          guide_language,
          max_participants,
          min_participants,
          price_adult_krw,
          price_child_krw,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', NOW(), NOW())
      `, [
        package_id,
        departure_date,
        departure_time,
        guide_name || null,
        guide_phone || null,
        guide_language || 'ko',
        max_participants,
        min_participants || packageData.min_participants || 10,
        price_adult_krw || packageData.price_adult_krw,
        price_child_krw || packageData.price_child_krw
      ]);

      console.log(`✅ [Tour Schedule] 생성 완료: package_id=${package_id}, date=${departure_date}`);

      return res.status(201).json({
        success: true,
        schedule_id: result.insertId
      });

    } catch (error) {
      console.error('❌ [Tour Schedules POST] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // PUT: 일정 수정
  if (req.method === 'PUT') {
    try {
      const {
        schedule_id,
        departure_date,
        departure_time,
        guide_name,
        guide_phone,
        guide_language,
        max_participants,
        min_participants,
        price_adult_krw,
        price_child_krw,
        status,
        cancelation_reason
      } = req.body;

      if (!schedule_id) {
        return res.status(400).json({
          success: false,
          error: 'schedule_id가 필요합니다.'
        });
      }

      // 기존 일정 확인
      const scheduleCheck = await connection.execute(`
        SELECT current_participants, status
        FROM tour_schedules
        WHERE id = ?
      `, [schedule_id]);

      if (!scheduleCheck.rows || scheduleCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '일정을 찾을 수 없습니다.'
        });
      }

      const currentSchedule = scheduleCheck.rows[0];

      // 예약이 있는데 취소하려는 경우 경고
      if (status === 'canceled' && currentSchedule.current_participants > 0) {
        console.warn(`⚠️ [Tour Schedule] 예약이 있는 일정 취소: schedule_id=${schedule_id}, bookings=${currentSchedule.current_participants}`);
      }

      // 업데이트할 필드 동적 구성
      const updates = [];
      const values = [];

      if (departure_date !== undefined) {
        updates.push('departure_date = ?');
        values.push(departure_date);
      }
      if (departure_time !== undefined) {
        updates.push('departure_time = ?');
        values.push(departure_time);
      }
      if (guide_name !== undefined) {
        updates.push('guide_name = ?');
        values.push(guide_name);
      }
      if (guide_phone !== undefined) {
        updates.push('guide_phone = ?');
        values.push(guide_phone);
      }
      if (guide_language !== undefined) {
        updates.push('guide_language = ?');
        values.push(guide_language);
      }
      if (max_participants !== undefined) {
        updates.push('max_participants = ?');
        values.push(max_participants);
      }
      if (min_participants !== undefined) {
        updates.push('min_participants = ?');
        values.push(min_participants);
      }
      if (price_adult_krw !== undefined) {
        updates.push('price_adult_krw = ?');
        values.push(price_adult_krw);
      }
      if (price_child_krw !== undefined) {
        updates.push('price_child_krw = ?');
        values.push(price_child_krw);
      }
      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
      }
      if (cancelation_reason !== undefined) {
        updates.push('cancelation_reason = ?');
        values.push(cancelation_reason);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: '수정할 필드가 없습니다.'
        });
      }

      updates.push('updated_at = NOW()');
      values.push(schedule_id);

      const query = `UPDATE tour_schedules SET ${updates.join(', ')} WHERE id = ?`;

      await connection.execute(query, values);

      console.log(`✅ [Tour Schedule] 수정 완료: schedule_id=${schedule_id}`);

      return res.status(200).json({
        success: true,
        message: '일정이 수정되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Tour Schedules PUT] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // DELETE: 일정 삭제
  if (req.method === 'DELETE') {
    try {
      const { schedule_id } = req.query;

      if (!schedule_id) {
        return res.status(400).json({
          success: false,
          error: 'schedule_id가 필요합니다.'
        });
      }

      // 예약 확인
      const bookingCheck = await connection.execute(`
        SELECT current_participants
        FROM tour_schedules
        WHERE id = ?
      `, [schedule_id]);

      if (!bookingCheck.rows || bookingCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '일정을 찾을 수 없습니다.'
        });
      }

      if (bookingCheck.rows[0].current_participants > 0) {
        return res.status(400).json({
          success: false,
          error: '예약이 있는 일정은 삭제할 수 없습니다. 취소 상태로 변경하세요.'
        });
      }

      // 삭제
      await connection.execute(`DELETE FROM tour_schedules WHERE id = ?`, [schedule_id]);

      console.log(`✅ [Tour Schedule] 삭제 완료: schedule_id=${schedule_id}`);

      return res.status(200).json({
        success: true,
        message: '일정이 삭제되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Tour Schedules DELETE] Error:', error);
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

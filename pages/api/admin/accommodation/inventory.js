const { connect } = require('@planetscale/database');

/**
 * 관리자용 숙박 재고 관리 API
 * GET: 재고 조회
 * PATCH: 재고/가격 일괄 수정
 * POST: 특정 기간 판매 중지/재개
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    if (req.method === 'GET') {
      const { room_id, start_date, end_date, partner_id } = req.query;

      let sql = `
        SELECT
          ra.*,
          r.room_name,
          r.room_type,
          r.max_occupancy,
          p.business_name as partner_name,
          p.id as partner_id
        FROM room_availability ra
        INNER JOIN rooms r ON ra.room_id = r.id
        LEFT JOIN accommodation_partners p ON r.partner_id = p.id
        WHERE 1=1
      `;
      const params = [];

      if (room_id) {
        sql += ` AND ra.room_id = ?`;
        params.push(room_id);
      }

      if (partner_id) {
        sql += ` AND r.partner_id = ?`;
        params.push(partner_id);
      }

      if (start_date) {
        sql += ` AND ra.date >= ?`;
        params.push(start_date);
      }

      if (end_date) {
        sql += ` AND ra.date <= ?`;
        params.push(end_date);
      }

      sql += ` ORDER BY ra.date ASC LIMIT 1000`;

      const result = await connection.execute(sql, params);

      const inventory = (result.rows || []).map(row => ({
        id: row.id,
        room_id: row.room_id,
        room_name: row.room_name,
        room_type: row.room_type,
        partner_name: row.partner_name,
        date: row.date,
        total_rooms: row.total_rooms,
        available_rooms: row.available_rooms,
        booked_rooms: row.booked_rooms,
        blocked_rooms: row.blocked_rooms,
        base_price_krw: row.base_price_krw,
        weekend_price_krw: row.weekend_price_krw,
        holiday_price_krw: row.holiday_price_krw,
        special_price_krw: row.special_price_krw,
        min_stay_nights: row.min_stay_nights,
        is_available: row.is_available,
        close_out_reason: row.close_out_reason
      }));

      return res.status(200).json({
        success: true,
        data: inventory,
        count: inventory.length
      });
    }

    if (req.method === 'PATCH') {
      const {
        room_id,
        start_date,
        end_date,
        updates // { base_price_krw, weekend_price_krw, special_price_krw, min_stay_nights, etc. }
      } = req.body;

      if (!room_id || !start_date || !end_date || !updates) {
        return res.status(400).json({
          success: false,
          error: '객실 ID, 시작일, 종료일, 업데이트 내용이 필요합니다.'
        });
      }

      // 업데이트 쿼리 생성
      const updateFields = [];
      const updateValues = [];

      const allowedFields = [
        'total_rooms',
        'available_rooms',
        'blocked_rooms',
        'base_price_krw',
        'weekend_price_krw',
        'holiday_price_krw',
        'special_price_krw',
        'min_stay_nights'
      ];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(updates[field]);
        }
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: '업데이트할 필드가 없습니다.'
        });
      }

      updateFields.push('updated_at = NOW()');

      // WHERE 조건 값 추가
      updateValues.push(room_id, start_date, end_date);

      const updateQuery = `
        UPDATE room_availability
        SET ${updateFields.join(', ')}
        WHERE room_id = ?
          AND date >= ?
          AND date <= ?
      `;

      const result = await connection.execute(updateQuery, updateValues);

      console.log(`✏️ [재고 일괄 수정] 객실 ${room_id}, ${start_date}~${end_date}`);

      return res.status(200).json({
        success: true,
        message: '재고가 업데이트되었습니다.',
        affected_rows: result.rowsAffected || 0
      });
    }

    if (req.method === 'POST') {
      // 판매 중지/재개
      const {
        room_id,
        start_date,
        end_date,
        action, // 'close' or 'open'
        close_out_reason
      } = req.body;

      if (!room_id || !start_date || !end_date || !action) {
        return res.status(400).json({
          success: false,
          error: '객실 ID, 시작일, 종료일, 액션이 필요합니다.'
        });
      }

      if (action === 'close') {
        // 판매 중지
        await connection.execute(
          `UPDATE room_availability
           SET is_available = FALSE,
               close_out_reason = ?,
               updated_at = NOW()
           WHERE room_id = ?
             AND date >= ?
             AND date <= ?`,
          [close_out_reason || '관리자 판매 중지', room_id, start_date, end_date]
        );

        console.log(`🚫 [판매 중지] 객실 ${room_id}, ${start_date}~${end_date}: ${close_out_reason}`);

        return res.status(200).json({
          success: true,
          message: '해당 기간의 판매가 중지되었습니다.'
        });

      } else if (action === 'open') {
        // 판매 재개
        await connection.execute(
          `UPDATE room_availability
           SET is_available = TRUE,
               close_out_reason = NULL,
               updated_at = NOW()
           WHERE room_id = ?
             AND date >= ?
             AND date <= ?`,
          [room_id, start_date, end_date]
        );

        console.log(`✅ [판매 재개] 객실 ${room_id}, ${start_date}~${end_date}`);

        return res.status(200).json({
          success: true,
          message: '해당 기간의 판매가 재개되었습니다.'
        });

      } else {
        return res.status(400).json({
          success: false,
          error: 'action은 "close" 또는 "open"이어야 합니다.'
        });
      }
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ [재고 관리 API 오류]:', error);
    return res.status(500).json({
      success: false,
      error: '재고 관리 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 벤더 - 체험 슬롯 관리 API
 * GET /api/vendor/experience/slots - 슬롯 목록 조회
 * POST /api/vendor/experience/slots - 슬롯 생성
 * PUT /api/vendor/experience/slots - 슬롯 수정
 * DELETE /api/vendor/experience/slots - 슬롯 삭제
 */

const { connect } = require('@planetscale/database');
const { verifyJWT } = require('../../../../utils/jwt');

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // JWT 인증
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '인증 토큰이 필요합니다.'
    });
  }

  let decoded;
  try {
    decoded = verifyJWT(token);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: '유효하지 않은 토큰입니다.'
    });
  }

  if (decoded.role !== 'vendor') {
    return res.status(403).json({
      success: false,
      message: '벤더 권한이 필요합니다.'
    });
  }

  const vendorId = decoded.userId;
  const connection = connect({ url: process.env.DATABASE_URL });

  // GET: 슬롯 목록 조회
  if (req.method === 'GET') {
    try {
      const { experience_id, start_date, end_date } = req.query;

      if (!experience_id) {
        return res.status(400).json({
          success: false,
          message: 'experience_id가 필요합니다.'
        });
      }

      // 체험이 벤더 소유인지 확인
      const experienceCheck = await connection.execute(`
        SELECT id FROM experiences
        WHERE id = ? AND vendor_id = ?
      `, [experience_id, vendorId]);

      if (!experienceCheck.rows || experienceCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '본인의 체험만 조회할 수 있습니다.'
        });
      }

      let query = `
        SELECT
          es.*,
          COUNT(eb.id) as booking_count
        FROM experience_slots es
        LEFT JOIN experience_bookings eb ON es.id = eb.slot_id AND eb.status != 'canceled'
        WHERE es.experience_id = ?
      `;
      const params = [experience_id];

      if (start_date) {
        query += ` AND es.slot_date >= ?`;
        params.push(start_date);
      }

      if (end_date) {
        query += ` AND es.slot_date <= ?`;
        params.push(end_date);
      }

      query += ` GROUP BY es.id ORDER BY es.slot_date, es.start_time`;

      const result = await connection.execute(query, params);

      return res.status(200).json({
        success: true,
        data: result.rows || []
      });

    } catch (error) {
      console.error('❌ [Vendor Experience Slots GET] Error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST: 슬롯 생성 (일괄 생성 지원)
  if (req.method === 'POST') {
    try {
      const {
        experience_id,
        slots // 배열: [{ slot_date, start_time, end_time, max_participants, price_per_person, notes }]
      } = req.body;

      if (!experience_id || !slots || !Array.isArray(slots) || slots.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'experience_id와 slots 배열이 필요합니다.'
        });
      }

      // 체험이 벤더 소유인지 확인
      const experienceCheck = await connection.execute(`
        SELECT id FROM experiences
        WHERE id = ? AND vendor_id = ?
      `, [experience_id, vendorId]);

      if (!experienceCheck.rows || experienceCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '본인의 체험만 수정할 수 있습니다.'
        });
      }

      const results = {
        success: [],
        failed: []
      };

      for (const slot of slots) {
        try {
          const {
            slot_date,
            start_time,
            end_time,
            max_participants = 10,
            price_per_person,
            child_price,
            is_available = true,
            notes
          } = slot;

          if (!slot_date || !start_time || !end_time) {
            throw new Error('slot_date, start_time, end_time은 필수입니다.');
          }

          await connection.execute(`
            INSERT INTO experience_slots (
              experience_id, slot_date, start_time, end_time,
              max_participants, price_per_person, child_price,
              is_available, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          `, [
            experience_id, slot_date, start_time, end_time,
            max_participants, price_per_person || null, child_price || null,
            is_available, notes || null
          ]);

          results.success.push({ slot_date, start_time });

        } catch (slotError) {
          console.error('슬롯 생성 실패:', slotError);
          results.failed.push({
            slot: slot,
            error: slotError.message
          });
        }
      }

      return res.status(201).json({
        success: true,
        message: `${results.success.length}개의 슬롯이 생성되었습니다.`,
        results
      });

    } catch (error) {
      console.error('❌ [Vendor Experience Slots POST] Error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // PUT: 슬롯 수정
  if (req.method === 'PUT') {
    try {
      const { slot_id, ...fields } = req.body;

      if (!slot_id) {
        return res.status(400).json({
          success: false,
          message: 'slot_id가 필요합니다.'
        });
      }

      // 슬롯이 벤더 소유 체험인지 확인
      const slotCheck = await connection.execute(`
        SELECT es.id
        FROM experience_slots es
        JOIN experiences e ON es.experience_id = e.id
        WHERE es.id = ? AND e.vendor_id = ?
      `, [slot_id, vendorId]);

      if (!slotCheck.rows || slotCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '본인의 체험 슬롯만 수정할 수 있습니다.'
        });
      }

      const updates = [];
      const values = [];

      const allowedFields = [
        'slot_date', 'start_time', 'end_time', 'max_participants',
        'price_per_person', 'child_price', 'is_available', 'notes'
      ];

      for (const field of allowedFields) {
        if (fields[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(fields[field]);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: '수정할 필드가 없습니다.'
        });
      }

      updates.push('updated_at = NOW()');
      values.push(slot_id);

      const query = `UPDATE experience_slots SET ${updates.join(', ')} WHERE id = ?`;
      await connection.execute(query, values);

      return res.status(200).json({
        success: true,
        message: '슬롯이 수정되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Vendor Experience Slots PUT] Error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // DELETE: 슬롯 삭제
  if (req.method === 'DELETE') {
    try {
      const { slot_id } = req.query;

      if (!slot_id) {
        return res.status(400).json({
          success: false,
          message: 'slot_id가 필요합니다.'
        });
      }

      // 슬롯이 벤더 소유 체험인지 확인
      const slotCheck = await connection.execute(`
        SELECT es.id, es.current_participants
        FROM experience_slots es
        JOIN experiences e ON es.experience_id = e.id
        WHERE es.id = ? AND e.vendor_id = ?
      `, [slot_id, vendorId]);

      if (!slotCheck.rows || slotCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '본인의 체험 슬롯만 삭제할 수 있습니다.'
        });
      }

      const slot = slotCheck.rows[0];

      // 예약이 있는 슬롯은 삭제 불가
      if (slot.current_participants > 0) {
        return res.status(400).json({
          success: false,
          message: '예약이 있는 슬롯은 삭제할 수 없습니다. is_available을 false로 변경하세요.'
        });
      }

      await connection.execute(`
        DELETE FROM experience_slots WHERE id = ?
      `, [slot_id]);

      return res.status(200).json({
        success: true,
        message: '슬롯이 삭제되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Vendor Experience Slots DELETE] Error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
}

module.exports = handler;

/**
 * 벤더 - 이벤트 티켓 관리 API
 * GET /api/vendor/events/tickets - 내 이벤트 티켓 목록 조회
 * PUT /api/vendor/events/tickets - 티켓 상태 변경 (입장 처리)
 * POST /api/vendor/events/tickets/verify - 티켓 검증 (QR 스캔)
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  const { vendor_id } = req.query;

  if (!vendor_id) {
    return res.status(401).json({
      success: false,
      error: '벤더 인증이 필요합니다.'
    });
  }

  // GET: 내 이벤트 티켓 목록 조회
  if (req.method === 'GET') {
    try {
      const {
        ticket_id,
        event_id,
        status,
        event_date,
        from_date,
        to_date
      } = req.query;

      let query = `
        SELECT
          et.*,
          e.name as event_name,
          e.venue,
          e.start_datetime
        FROM event_tickets et
        LEFT JOIN events e ON et.event_id = e.id
        WHERE e.vendor_id = ?
      `;

      const params = [vendor_id];

      if (ticket_id) {
        query += ` AND et.id = ?`;
        params.push(ticket_id);
      }

      if (event_id) {
        query += ` AND et.event_id = ?`;
        params.push(event_id);
      }

      if (status) {
        query += ` AND et.status = ?`;
        params.push(status);
      }

      if (event_date) {
        query += ` AND DATE(e.start_datetime) = ?`;
        params.push(event_date);
      }

      if (from_date) {
        query += ` AND DATE(e.start_datetime) >= ?`;
        params.push(from_date);
      }

      if (to_date) {
        query += ` AND DATE(e.start_datetime) <= ?`;
        params.push(to_date);
      }

      query += ` ORDER BY e.start_datetime DESC, et.created_at DESC`;

      const result = await connection.execute(query, params);

      return res.status(200).json({
        success: true,
        tickets: result.rows || []
      });

    } catch (error) {
      console.error('❌ [Vendor Event Tickets GET] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // PUT: 티켓 상태 변경
  if (req.method === 'PUT') {
    try {
      const { ticket_id, status, entry_gate, seat_number } = req.body;

      if (!ticket_id || !status) {
        return res.status(400).json({
          success: false,
          error: 'ticket_id와 status가 필요합니다.'
        });
      }

      // 유효한 상태 값 체크
      const validStatuses = ['active', 'used', 'expired', 'canceled', 'refunded'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 상태입니다.'
        });
      }

      // 티켓이 벤더 소유의 이벤트 티켓인지 확인
      const ticketCheck = await connection.execute(`
        SELECT et.id, et.status as current_status
        FROM event_tickets et
        LEFT JOIN events e ON et.event_id = e.id
        WHERE et.id = ? AND e.vendor_id = ?
      `, [ticket_id, vendor_id]);

      if (!ticketCheck.rows || ticketCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '본인의 이벤트 티켓만 관리할 수 있습니다.'
        });
      }

      // 상태 업데이트
      let updateQuery = 'UPDATE event_tickets SET status = ?, updated_at = NOW()';
      const values = [status];

      // 입장 처리 시 입장 정보 기록
      if (status === 'used') {
        updateQuery += ', entry_scanned = 1, entry_scanned_at = NOW(), entry_count = entry_count + 1';
        if (entry_gate) {
          updateQuery += ', entry_gate = ?';
          values.push(entry_gate);
        }
        if (seat_number) {
          updateQuery += ', seat_number = ?';
          values.push(seat_number);
        }
      }

      updateQuery += ' WHERE id = ?';
      values.push(ticket_id);

      await connection.execute(updateQuery, values);

      console.log(`✅ [Vendor Event Ticket] 상태 변경: ticket_id=${ticket_id}, status=${status} by vendor ${vendor_id}`);

      return res.status(200).json({
        success: true,
        message: '티켓 상태가 변경되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Vendor Event Tickets PUT] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // POST: 티켓 검증 (QR 스캔)
  if (req.method === 'POST') {
    try {
      const { ticket_number, qr_code, entry_gate, seat_number } = req.body;

      if (!ticket_number && !qr_code) {
        return res.status(400).json({
          success: false,
          error: 'ticket_number 또는 qr_code가 필요합니다.'
        });
      }

      // 티켓 조회
      let query = `
        SELECT
          et.*,
          e.name as event_name,
          e.venue,
          e.start_datetime,
          e.end_datetime,
          e.vendor_id
        FROM event_tickets et
        LEFT JOIN events e ON et.event_id = e.id
        WHERE
      `;

      const params = [];

      if (ticket_number) {
        query += ` et.ticket_number = ?`;
        params.push(ticket_number);
      } else {
        query += ` et.qr_code = ?`;
        params.push(qr_code);
      }

      const result = await connection.execute(query, params);

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '티켓을 찾을 수 없습니다.'
        });
      }

      const ticket = result.rows[0];

      // 벤더 권한 확인
      if (ticket.vendor_id !== parseInt(vendor_id)) {
        return res.status(403).json({
          success: false,
          error: '이 티켓은 다른 이벤트의 티켓입니다.'
        });
      }

      // 티켓 상태 확인
      if (ticket.status === 'used') {
        return res.status(400).json({
          success: false,
          error: '이미 사용된 티켓입니다.',
          ticket: {
            ...ticket,
            entry_scanned_at: ticket.entry_scanned_at,
            entry_count: ticket.entry_count
          }
        });
      }

      if (ticket.status === 'expired') {
        return res.status(400).json({
          success: false,
          error: '만료된 티켓입니다.'
        });
      }

      if (ticket.status === 'canceled' || ticket.status === 'refunded') {
        return res.status(400).json({
          success: false,
          error: '취소/환불된 티켓입니다.'
        });
      }

      // 이벤트 시작 시간 확인 (너무 일찍 입장하는 것 방지)
      const eventStart = new Date(ticket.start_datetime);
      const now = new Date();
      const hoursBeforeEvent = (eventStart - now) / (1000 * 60 * 60);

      if (hoursBeforeEvent > 24) {
        return res.status(400).json({
          success: false,
          error: '이벤트 시작 24시간 전부터 입장 가능합니다.'
        });
      }

      // 이벤트 종료 시간 확인
      if (ticket.end_datetime) {
        const eventEnd = new Date(ticket.end_datetime);
        if (now > eventEnd) {
          // 만료 처리
          await connection.execute(
            'UPDATE event_tickets SET status = ?, updated_at = NOW() WHERE id = ?',
            ['expired', ticket.id]
          );

          return res.status(400).json({
            success: false,
            error: '이벤트가 종료되었습니다.'
          });
        }
      }

      // 입장 처리
      let entryQuery = `
        UPDATE event_tickets
        SET
          status = 'used',
          entry_scanned = 1,
          entry_scanned_at = NOW(),
          entry_count = entry_count + 1,
          entry_gate = ?,
          updated_at = NOW()
      `;

      const entryValues = [entry_gate || null];

      if (seat_number) {
        entryQuery += ', seat_number = ?';
        entryValues.push(seat_number);
      }

      entryQuery += ' WHERE id = ?';
      entryValues.push(ticket.id);

      await connection.execute(entryQuery, entryValues);

      console.log(`✅ [Vendor Event Ticket] 입장 처리: ticket=${ticket.ticket_number}, gate=${entry_gate}`);

      return res.status(200).json({
        success: true,
        message: '입장이 확인되었습니다.',
        ticket: {
          ticket_number: ticket.ticket_number,
          event_name: ticket.event_name,
          venue: ticket.venue,
          ticket_type: ticket.ticket_type,
          seat_number: seat_number || ticket.seat_number,
          entry_gate: entry_gate,
          entry_time: new Date().toISOString(),
          event_start: ticket.start_datetime
        }
      });

    } catch (error) {
      console.error('❌ [Vendor Event Tickets Verify] Error:', error);
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

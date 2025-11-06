/**
 * 벤더 - 입장권 관리 API
 * GET /api/vendor/attractions/tickets - 내 관광지 티켓 목록 조회
 * PUT /api/vendor/attractions/tickets - 티켓 상태 변경 (입장 처리)
 * POST /api/vendor/attractions/tickets/verify - 티켓 검증 (QR 스캔)
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

  // GET: 내 관광지 티켓 목록 조회
  if (req.method === 'GET') {
    try {
      const {
        ticket_id,
        attraction_id,
        status,
        valid_date,
        from_date,
        to_date
      } = req.query;

      let query = `
        SELECT
          et.*,
          a.name as attraction_name,
          a.address as attraction_address
        FROM entry_tickets et
        LEFT JOIN attractions a ON et.attraction_id = a.id
        WHERE a.vendor_id = ?
      `;

      const params = [vendor_id];

      if (ticket_id) {
        query += ` AND et.id = ?`;
        params.push(ticket_id);
      }

      if (attraction_id) {
        query += ` AND et.attraction_id = ?`;
        params.push(attraction_id);
      }

      if (status) {
        query += ` AND et.status = ?`;
        params.push(status);
      }

      if (valid_date) {
        query += ` AND et.valid_date = ?`;
        params.push(valid_date);
      }

      if (from_date) {
        query += ` AND et.valid_date >= ?`;
        params.push(from_date);
      }

      if (to_date) {
        query += ` AND et.valid_date <= ?`;
        params.push(to_date);
      }

      query += ` ORDER BY et.valid_date DESC, et.created_at DESC`;

      const result = await connection.execute(query, params);

      return res.status(200).json({
        success: true,
        tickets: result.rows || []
      });

    } catch (error) {
      console.error('❌ [Vendor Attraction Tickets GET] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // PUT: 티켓 상태 변경
  if (req.method === 'PUT') {
    try {
      const { ticket_id, status, entry_gate } = req.body;

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

      // 티켓이 벤더 소유의 관광지 티켓인지 확인
      const ticketCheck = await connection.execute(`
        SELECT et.id, et.status as current_status
        FROM entry_tickets et
        LEFT JOIN attractions a ON et.attraction_id = a.id
        WHERE et.id = ? AND a.vendor_id = ?
      `, [ticket_id, vendor_id]);

      if (!ticketCheck.rows || ticketCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '본인의 관광지 티켓만 관리할 수 있습니다.'
        });
      }

      // 상태 업데이트
      let updateQuery = 'UPDATE entry_tickets SET status = ?, updated_at = NOW()';
      const values = [status];

      // 입장 처리 시 입장 정보 기록
      if (status === 'used') {
        updateQuery += ', entry_scanned = 1, entry_scanned_at = NOW(), entry_count = entry_count + 1';
        if (entry_gate) {
          updateQuery += ', entry_gate = ?';
          values.push(entry_gate);
        }
      }

      updateQuery += ' WHERE id = ?';
      values.push(ticket_id);

      await connection.execute(updateQuery, values);

      console.log(`✅ [Vendor Attraction Ticket] 상태 변경: ticket_id=${ticket_id}, status=${status} by vendor ${vendor_id}`);

      return res.status(200).json({
        success: true,
        message: '티켓 상태가 변경되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Vendor Attraction Tickets PUT] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // POST: 티켓 검증 (QR 스캔)
  if (req.method === 'POST') {
    try {
      const { ticket_number, qr_code, entry_gate } = req.body;

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
          a.name as attraction_name,
          a.vendor_id
        FROM entry_tickets et
        LEFT JOIN attractions a ON et.attraction_id = a.id
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
          error: '이 티켓은 다른 관광지의 티켓입니다.'
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

      // 유효 날짜 확인
      const today = new Date().toISOString().split('T')[0];
      if (ticket.valid_date < today) {
        // 만료 처리
        await connection.execute(
          'UPDATE entry_tickets SET status = ?, updated_at = NOW() WHERE id = ?',
          ['expired', ticket.id]
        );

        return res.status(400).json({
          success: false,
          error: '유효 기간이 지난 티켓입니다.'
        });
      }

      // 입장 처리
      await connection.execute(`
        UPDATE entry_tickets
        SET
          status = 'used',
          entry_scanned = 1,
          entry_scanned_at = NOW(),
          entry_count = entry_count + 1,
          entry_gate = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [entry_gate || null, ticket.id]);

      console.log(`✅ [Vendor Attraction Ticket] 입장 처리: ticket=${ticket.ticket_number}, gate=${entry_gate}`);

      return res.status(200).json({
        success: true,
        message: '입장이 확인되었습니다.',
        ticket: {
          ticket_number: ticket.ticket_number,
          attraction_name: ticket.attraction_name,
          ticket_type: ticket.ticket_type,
          valid_date: ticket.valid_date,
          entry_gate: entry_gate,
          entry_time: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ [Vendor Attraction Tickets Verify] Error:', error);
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

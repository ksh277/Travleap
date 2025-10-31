/**
 * 이벤트 티켓 API
 * POST /api/events/tickets - 티켓 구매
 * GET /api/events/tickets - 내 티켓 목록 조회
 */

const { connect } = require('@planetscale/database');

function generateTicketNumber() {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `EVT${timestamp}${random}`;
}

function generateQRCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  // POST: 티켓 구매
  if (req.method === 'POST') {
    try {
      const {
        event_id,
        user_id,
        ticket_type,
        quantity = 1,
        price_krw,
        seat_number,
        attendee_name,
        attendee_email,
        attendee_phone
      } = req.body;

      if (!event_id || !user_id || !ticket_type || !price_krw) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다. (event_id, user_id, ticket_type, price_krw)'
        });
      }

      // 이벤트 조회
      const eventQuery = `
        SELECT
          e.*,
          e.total_capacity,
          COUNT(et.id) as sold_tickets
        FROM events e
        LEFT JOIN event_tickets et ON e.id = et.event_id AND et.status != 'canceled' AND et.status != 'refunded'
        WHERE e.id = ? AND e.is_active = 1
        GROUP BY e.id
      `;

      const eventResult = await connection.execute(eventQuery, [event_id]);

      if (!eventResult.rows || eventResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '이벤트를 찾을 수 없습니다.'
        });
      }

      const event = eventResult.rows[0];

      // 티켓 재고 확인
      if (event.total_capacity) {
        const availableTickets = event.total_capacity - event.sold_tickets;
        if (quantity > availableTickets) {
          return res.status(400).json({
            success: false,
            error: `티켓이 부족합니다. (남은 티켓: ${availableTickets}장)`
          });
        }
      }

      // 이벤트 시작 시간 확인
      const eventStart = new Date(event.start_datetime);
      const now = new Date();
      if (eventStart < now) {
        return res.status(400).json({
          success: false,
          error: '이미 시작된 이벤트입니다.'
        });
      }

      // 티켓 생성
      const tickets = [];
      for (let i = 0; i < quantity; i++) {
        const ticket_number = generateTicketNumber();
        const qr_code = generateQRCode();

        const result = await connection.execute(`
          INSERT INTO event_tickets (
            event_id,
            user_id,
            ticket_number,
            qr_code,
            ticket_type,
            price_krw,
            seat_number,
            attendee_name,
            attendee_email,
            attendee_phone,
            status,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
        `, [
          event_id,
          user_id,
          ticket_number,
          qr_code,
          ticket_type,
          price_krw,
          seat_number || null,
          attendee_name || null,
          attendee_email || null,
          attendee_phone || null
        ]);

        tickets.push({
          ticket_id: result.insertId,
          ticket_number,
          qr_code
        });
      }

      console.log(`✅ [Event Ticket] 구매 완료: event_id=${event_id}, user_id=${user_id}, quantity=${quantity}`);

      return res.status(201).json({
        success: true,
        message: `${quantity}장의 티켓이 발급되었습니다.`,
        tickets
      });

    } catch (error) {
      console.error('❌ [Event Tickets POST] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // GET: 티켓 목록 조회
  if (req.method === 'GET') {
    try {
      const { user_id, ticket_id, status, upcoming } = req.query;

      if (!user_id && !ticket_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id 또는 ticket_id가 필요합니다.'
        });
      }

      let query = `
        SELECT
          et.*,
          e.name as event_name,
          e.venue,
          e.venue_address,
          e.start_datetime,
          e.end_datetime,
          e.thumbnail_url as event_thumbnail
        FROM event_tickets et
        LEFT JOIN events e ON et.event_id = e.id
        WHERE 1=1
      `;

      const params = [];

      if (ticket_id) {
        query += ` AND et.id = ?`;
        params.push(ticket_id);
      } else if (user_id) {
        query += ` AND et.user_id = ?`;
        params.push(user_id);
      }

      if (status) {
        query += ` AND et.status = ?`;
        params.push(status);
      }

      if (upcoming === 'true') {
        query += ` AND e.start_datetime >= NOW()`;
      }

      query += ` ORDER BY e.start_datetime DESC, et.created_at DESC`;

      const result = await connection.execute(query, params);

      return res.status(200).json({
        success: true,
        tickets: result.rows || []
      });

    } catch (error) {
      console.error('❌ [Event Tickets GET] Error:', error);
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

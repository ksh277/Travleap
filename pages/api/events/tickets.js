/**
 * 이벤트 티켓 API - 금액 서버 검증 적용
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
        total_amount, // 클라이언트가 보낸 값 (검증 필요)
        seat_number,
        attendee_name,
        attendee_email,
        attendee_phone
      } = req.body;

      if (!event_id || !user_id || !ticket_type || !quantity) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다.'
        });
      }

      // 🔒 트랜잭션 시작
      await connection.execute('START TRANSACTION');

      try {
        // 이벤트 조회 및 재고 확인 (FOR UPDATE로 락 획득)
        const eventQuery = `
          SELECT
            e.*,
            e.total_capacity,
            COUNT(et.id) as sold_tickets
          FROM events e
          LEFT JOIN event_tickets et ON e.id = et.event_id AND et.status != 'canceled' AND et.status != 'refunded'
          WHERE e.id = ? AND e.is_active = 1
          GROUP BY e.id
          FOR UPDATE
        `;

        const eventResult = await connection.execute(eventQuery, [event_id]);

        if (!eventResult.rows || eventResult.rows.length === 0) {
          await connection.execute('ROLLBACK');
          return res.status(404).json({
            success: false,
            error: '이벤트를 찾을 수 없습니다.'
          });
        }

        const event = eventResult.rows[0];

        // 티켓 재고 확인 (동시성 제어)
        if (event.total_capacity) {
          const availableTickets = event.total_capacity - event.sold_tickets;
          if (quantity > availableTickets) {
            await connection.execute('ROLLBACK');
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
          await connection.execute('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: '이미 시작된 이벤트입니다.'
          });
        }

        // 🔒 가격 검증 (서버에서 재계산)
        let pricePerTicket = 0;
        switch (ticket_type) {
          case 'vip':
            pricePerTicket = parseFloat(event.price_vip) || 0;
            break;
          case 'standard':
            pricePerTicket = parseFloat(event.price_standard) || 0;
            break;
          case 'early_bird':
            pricePerTicket = parseFloat(event.price_early_bird || event.price_standard) || 0;
            break;
          case 'free':
            pricePerTicket = 0;
            break;
          default:
            pricePerTicket = parseFloat(event.price_standard) || 0;
        }

        const serverCalculatedTotal = pricePerTicket * quantity;

        console.log(`🔒 [Event Ticket] 서버 측 가격 재계산: ${quantity}장 × ${pricePerTicket}원 = ${serverCalculatedTotal}원 (클라이언트: ${total_amount}원)`);

        // 클라이언트가 보낸 금액과 서버 계산이 다르면 거부
        if (total_amount !== undefined && Math.abs(serverCalculatedTotal - total_amount) > 1) {
          await connection.execute('ROLLBACK');
          console.error(`❌ [Event Ticket] 가격 조작 감지! 서버=${serverCalculatedTotal}원, 클라이언트=${total_amount}원`);
          return res.status(400).json({
            success: false,
            error: 'PRICE_TAMPERED',
            message: '금액이 조작되었습니다. 페이지를 새로고침해주세요.'
          });
        }

        // 티켓 일괄 생성 (트랜잭션 내에서)
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
            pricePerTicket, // 서버 검증된 가격 사용
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

        // 🔒 트랜잭션 커밋
        await connection.execute('COMMIT');

        console.log(`✅ [Event Ticket] 구매 완료: event_id=${event_id}, user_id=${user_id}, ${quantity}장, ${serverCalculatedTotal}원`);

        return res.status(201).json({
          success: true,
          message: `${quantity}장의 티켓이 발급되었습니다.`,
          tickets,
          total_amount: serverCalculatedTotal
        });

      } catch (innerError) {
        await connection.execute('ROLLBACK');
        throw innerError;
      }

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

/**
 * 관광지 입장권 구매 API - 금액 서버 검증 적용
 * POST /api/attractions/tickets - 입장권 구매
 * GET /api/attractions/tickets - 내 입장권 목록
 */

const { connect } = require('@planetscale/database');

function generateTicketNumber() {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TKT${timestamp}${random}`;
}

function generateOrderNumber() {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ATT${timestamp}${random}`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const connection = connect({ url: process.env.DATABASE_URL });

  // POST: 입장권 구매
  if (req.method === 'POST') {
    try {
      const {
        user_id,
        attraction_id,
        tickets, // [{type: 'adult', count: 2}, {type: 'child', count: 1}]
        valid_date,
        total_amount // 클라이언트가 보낸 값 (검증 필요)
      } = req.body;

      if (!user_id || !attraction_id || !tickets || tickets.length === 0 || !valid_date) {
        return res.status(400).json({ success: false, error: '필수 정보를 모두 입력해주세요.' });
      }

      // 🔒 트랜잭션 시작
      await connection.execute('START TRANSACTION');

      try {
        // 관광지 정보 조회 (FOR UPDATE로 락 획득)
        const attractionQuery = `
          SELECT a.*, (SELECT COUNT(*) FROM entry_tickets WHERE attraction_id = a.id AND valid_date = ?) as sold_today
          FROM attractions a
          WHERE a.id = ? AND a.is_active = 1
          FOR UPDATE
        `;

        const attractionResult = await connection.execute(attractionQuery, [valid_date, attraction_id]);

        if (!attractionResult.rows || attractionResult.rows.length === 0) {
          await connection.execute('ROLLBACK');
          return res.status(404).json({ success: false, error: '관광지를 찾을 수 없습니다.' });
        }

        const attraction = attractionResult.rows[0];

        // 🔒 가격 검증 (서버에서 재계산)
        let serverCalculatedTotal = 0;
        const ticketRecords = [];
        const orderNumber = generateOrderNumber();

        for (const ticketInfo of tickets) {
          const { type, count } = ticketInfo;
          if (count <= 0) continue;

          let pricePerTicket = 0;
          switch (type) {
            case 'adult':
              pricePerTicket = parseFloat(attraction.admission_fee_adult) || 0;
              break;
            case 'child':
              pricePerTicket = parseFloat(attraction.admission_fee_child || attraction.admission_fee_adult) || 0;
              break;
            case 'senior':
              pricePerTicket = parseFloat(attraction.admission_fee_senior || attraction.admission_fee_adult) || 0;
              break;
            case 'infant':
              pricePerTicket = parseFloat(attraction.admission_fee_infant) || 0;
              break;
          }

          serverCalculatedTotal += pricePerTicket * count;

          // 티켓 개수만큼 생성
          for (let i = 0; i < count; i++) {
            const ticketNumber = generateTicketNumber();
            const qrCode = `QR-${ticketNumber}-${Date.now()}`;
            const qrUrl = `/attractions/verify/${ticketNumber}`;

            ticketRecords.push({
              ticket_number: ticketNumber,
              order_number: orderNumber,
              ticket_type: type,
              price_krw: pricePerTicket,
              qr_code: qrCode,
              qr_url: qrUrl
            });
          }
        }

        console.log(`🔒 [Attraction Ticket] 서버 측 가격 재계산: ${serverCalculatedTotal}원 (클라이언트: ${total_amount}원)`);

        // 클라이언트가 보낸 금액과 서버 계산이 다르면 거부
        if (total_amount !== undefined && Math.abs(serverCalculatedTotal - total_amount) > 1) {
          await connection.execute('ROLLBACK');
          console.error(`❌ [Attraction Ticket] 가격 조작 감지! 서버=${serverCalculatedTotal}원, 클라이언트=${total_amount}원`);
          return res.status(400).json({ success: false, error: 'PRICE_TAMPERED', message: '금액이 조작되었습니다. 페이지를 새로고침해주세요.' });
        }

        // 티켓 일괄 생성 (트랜잭션 내에서)
        for (const ticket of ticketRecords) {
          await connection.execute(`
            INSERT INTO entry_tickets (
              attraction_id, user_id, ticket_number, order_number,
              ticket_type, ticket_count, price_krw, valid_date,
              qr_code, qr_url, status, payment_status, created_at
            ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 'active', 'pending', NOW())
          `, [
            attraction_id, user_id, ticket.ticket_number, ticket.order_number,
            ticket.ticket_type, ticket.price_krw, valid_date,
            ticket.qr_code, ticket.qr_url
          ]);
        }

        // 🔒 트랜잭션 커밋
        await connection.execute('COMMIT');

        console.log(`✅ [Attraction Ticket] 구매 완료: ${orderNumber}, ${ticketRecords.length}매, ${serverCalculatedTotal}원`);

        return res.status(201).json({
          success: true,
          order: {
            order_number: orderNumber,
            attraction_name: attraction.name,
            tickets: ticketRecords,
            total_amount: serverCalculatedTotal,
            valid_date
          }
        });

      } catch (innerError) {
        await connection.execute('ROLLBACK');
        throw innerError;
      }

    } catch (error) {
      console.error('❌ [Attraction Ticket] 구매 실패:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // GET: 사용자 입장권 목록
  if (req.method === 'GET') {
    try {
      const { user_id, attraction_id, status } = req.query;

      if (!user_id && !attraction_id) {
        return res.status(400).json({ success: false, error: 'user_id 또는 attraction_id가 필요합니다.' });
      }

      let query = `
        SELECT et.*, a.name as attraction_name, a.location, a.address
        FROM entry_tickets et
        LEFT JOIN attractions a ON et.attraction_id = a.id
        WHERE 1=1
      `;

      const params = [];

      if (user_id) {
        query += ` AND et.user_id = ?`;
        params.push(user_id);
      }

      if (attraction_id) {
        query += ` AND et.attraction_id = ?`;
        params.push(attraction_id);
      }

      if (status) {
        query += ` AND et.status = ?`;
        params.push(status);
      }

      query += ` ORDER BY et.created_at DESC`;

      const result = await connection.execute(query, params);

      return res.status(200).json({ success: true, tickets: result.rows || [] });

    } catch (error) {
      console.error('❌ [Attraction Tickets GET] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};

/**
 * 사용자용 - 입장권 구매 API
 * POST /api/attractions/tickets - 입장권 구매
 * GET /api/attractions/tickets?user_id=123 - 사용자 입장권 목록
 */

const { connect } = require('@planetscale/database');

const generateTicketNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TKT${timestamp}${random}`;
};

const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ATT${timestamp}${random}`;
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  // POST: 입장권 구매
  if (req.method === 'POST') {
    try {
      const {
        user_id,
        attraction_id,
        tickets, // [{type: 'adult', count: 2}, {type: 'child', count: 1}]
        valid_date
      } = req.body;

      if (!user_id || !attraction_id || !tickets || tickets.length === 0 || !valid_date) {
        return res.status(400).json({
          success: false,
          error: '필수 정보를 모두 입력해주세요.'
        });
      }

      // 관광지 정보 조회
      const attractionQuery = `
        SELECT
          a.id,
          a.name,
          a.admission_fee_adult,
          a.admission_fee_child,
          a.admission_fee_senior,
          a.admission_fee_infant
        FROM attractions a
        WHERE a.id = ? AND a.is_active = 1
      `;

      const attractionResult = await connection.execute(attractionQuery, [attraction_id]);

      if (!attractionResult.rows || attractionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '관광지를 찾을 수 없습니다.'
        });
      }

      const attraction = attractionResult.rows[0];
      const orderNumber = generateOrderNumber();

      let totalAmount = 0;
      const ticketRecords = [];

      // 각 티켓 타입별로 티켓 생성
      for (const ticketInfo of tickets) {
        const { type, count } = ticketInfo;

        if (count <= 0) continue;

        let pricePerTicket = 0;
        switch (type) {
          case 'adult':
            pricePerTicket = attraction.admission_fee_adult;
            break;
          case 'child':
            pricePerTicket = attraction.admission_fee_child || attraction.admission_fee_adult;
            break;
          case 'senior':
            pricePerTicket = attraction.admission_fee_senior || attraction.admission_fee_adult;
            break;
          case 'infant':
            pricePerTicket = attraction.admission_fee_infant || 0;
            break;
        }

        totalAmount += pricePerTicket * count;

        // 티켓 개수만큼 생성
        for (let i = 0; i < count; i++) {
          const ticketNumber = generateTicketNumber();
          const qrCode = `QR-${ticketNumber}-${Date.now()}`; // 실제로는 QR 라이브러리 사용
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

      // 티켓 일괄 생성
      for (const ticket of ticketRecords) {
        await connection.execute(`
          INSERT INTO entry_tickets (
            attraction_id,
            user_id,
            ticket_number,
            order_number,
            ticket_type,
            ticket_count,
            price_krw,
            valid_date,
            qr_code,
            qr_url,
            status,
            payment_status,
            created_at
          ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 'active', 'pending', NOW())
        `, [
          attraction_id,
          user_id,
          ticket.ticket_number,
          ticket.order_number,
          ticket.ticket_type,
          ticket.price_krw,
          valid_date,
          ticket.qr_code,
          ticket.qr_url
        ]);
      }

      console.log('✅ [Attraction Ticket] 구매 완료:', {
        order_number: orderNumber,
        attraction: attraction.name,
        tickets_count: ticketRecords.length,
        total_amount: totalAmount
      });

      return res.status(201).json({
        success: true,
        order: {
          order_number: orderNumber,
          attraction_name: attraction.name,
          tickets: ticketRecords,
          total_amount: totalAmount,
          valid_date
        }
      });

    } catch (error) {
      console.error('❌ [Attraction Ticket] 구매 실패:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // GET: 사용자 입장권 목록
  if (req.method === 'GET') {
    try {
      const { user_id, attraction_id, status } = req.query;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id가 필요합니다.'
        });
      }

      let query = `
        SELECT
          et.*,
          a.name as attraction_name,
          a.address as attraction_address,
          a.phone as attraction_phone,
          a.thumbnail_url as attraction_thumbnail
        FROM entry_tickets et
        LEFT JOIN attractions a ON et.attraction_id = a.id
        WHERE et.user_id = ?
      `;

      const params = [user_id];

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

      return res.status(200).json({
        success: true,
        tickets: result.rows || []
      });

    } catch (error) {
      console.error('❌ [Attraction Ticket] 조회 실패:', error);
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

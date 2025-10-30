const { connect } = require('@planetscale/database');
const QRCode = require('qrcode');

/**
 * 관광지 입장권 구매 API
 * POST /api/tourist/tickets
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const {
      attraction_id,
      user_id,
      tickets = [], // [{ type: 'adult', count: 2 }, { type: 'child', count: 1 }]
      valid_date
    } = req.body;

    if (!attraction_id || !user_id || tickets.length === 0 || !valid_date) {
      return res.status(400).json({
        success: false,
        error: '필수 정보가 누락되었습니다.'
      });
    }

    // 관광지 정보 조회
    const attrResult = await connection.execute(
      `SELECT admission_fee_adult, admission_fee_child, admission_fee_senior, admission_fee_infant
       FROM attractions
       WHERE id = ? AND is_active = 1`,
      [attraction_id]
    );

    if (!attrResult.rows || attrResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '관광지를 찾을 수 없습니다.'
      });
    }

    const attraction = attrResult.rows[0];
    const priceMap = {
      adult: attraction.admission_fee_adult,
      child: attraction.admission_fee_child || 0,
      senior: attraction.admission_fee_senior || 0,
      infant: attraction.admission_fee_infant || 0
    };

    // 주문 번호 생성
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ATT-${today}-${randomNum}`;

    const createdTickets = [];
    let totalPrice = 0;

    // 각 타입별로 티켓 생성
    for (const ticketGroup of tickets) {
      const { type, count } = ticketGroup;
      const price = priceMap[type];

      if (!price && price !== 0) {
        return res.status(400).json({
          success: false,
          error: `유효하지 않은 티켓 타입: ${type}`
        });
      }

      for (let i = 0; i < count; i++) {
        const ticketNumber = `TICKET-${today}-${randomNum}-${String(createdTickets.length + 1).padStart(3, '0')}`;

        // QR 코드 생성
        const qrData = JSON.stringify({
          ticketNumber,
          attractionId: attraction_id,
          type,
          validDate: valid_date
        });
        const qrCode = await QRCode.toDataURL(qrData);

        // 티켓 생성
        const result = await connection.execute(
          `INSERT INTO entry_tickets (
            attraction_id, user_id, ticket_number, order_number,
            ticket_type, ticket_count, price_krw, valid_date,
            qr_code, status, payment_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'pending')`,
          [attraction_id, user_id, ticketNumber, orderNumber, type, 1, price, valid_date, qrCode]
        );

        createdTickets.push({ id: result.insertId, ticket_number: ticketNumber, type });
        totalPrice += price;
      }
    }

    console.log(`✅ [Tourist Tickets] 입장권 구매 완료: ${orderNumber}`);

    return res.status(201).json({
      success: true,
      message: '입장권이 구매되었습니다.',
      data: {
        order_number: orderNumber,
        tickets: createdTickets,
        total_price: totalPrice,
        valid_date
      }
    });

  } catch (error) {
    console.error('❌ [Tourist Tickets API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const { connect } = require('@planetscale/database');
const QRCode = require('qrcode');

/**
 * 행사 티켓 예매 API
 * POST /api/event/book-tickets
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
      event_id,
      user_id,
      seat_ids = [],
      ticket_type,
      quantity = 1
    } = req.body;

    if (!event_id || !user_id) {
      return res.status(400).json({
        success: false,
        error: '필수 정보가 누락되었습니다.'
      });
    }

    // 주문 번호 생성
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `EVT-${today}-${randomNum}`;

    const tickets = [];
    let totalPrice = 0;

    // 좌석제인 경우
    if (seat_ids.length > 0) {
      for (const seatId of seat_ids) {
        // 좌석 조회 및 가격 확인
        const seatResult = await connection.execute(
          'SELECT * FROM event_seats WHERE id = ? AND status = \'available\'',
          [seatId]
        );

        if (!seatResult.rows || seatResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: `좌석 ID ${seatId}를 사용할 수 없습니다.`
          });
        }

        const seat = seatResult.rows[0];
        totalPrice += seat.price_krw;

        // 티켓 번호 생성
        const ticketNumber = `TKT-${today}-${randomNum}-${String(tickets.length + 1).padStart(3, '0')}`;

        // QR 코드 생성
        const qrData = JSON.stringify({ ticketNumber, eventId: event_id, seatId });
        const qrCode = await QRCode.toDataURL(qrData);

        // 티켓 생성
        const ticketResult = await connection.execute(
          `INSERT INTO event_tickets (
            event_id, user_id, ticket_number, order_number,
            seat_id, seat_info, price_krw, qr_code,
            status, payment_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 'pending')`,
          [
            event_id, user_id, ticketNumber, orderNumber,
            seatId,
            JSON.stringify({ section: seat.section, row: seat.row, seat_number: seat.seat_number }),
            seat.price_krw,
            qrCode
          ]
        );

        // 좌석 상태 업데이트 (동시성 체크)
        const seatUpdateResult = await connection.execute(
          `UPDATE event_seats
           SET status = 'sold', ticket_id = ?
           WHERE id = ? AND status = 'available'`,
          [ticketResult.insertId, seatId]
        );

        // 좌석 업데이트 실패 시 (이미 판매됨)
        if (!seatUpdateResult.rowsAffected || seatUpdateResult.rowsAffected === 0) {
          // 이미 생성된 티켓들 삭제
          for (const createdTicket of tickets) {
            await connection.execute(
              'DELETE FROM event_tickets WHERE id = ?',
              [createdTicket.id]
            );
          }
          // 현재 티켓도 삭제
          await connection.execute(
            'DELETE FROM event_tickets WHERE id = ?',
            [ticketResult.insertId]
          );

          return res.status(409).json({
            success: false,
            error: `좌석 ${seatId}가 이미 판매되었습니다. 다시 선택해주세요.`,
            code: 'SEAT_ALREADY_SOLD'
          });
        }

        tickets.push({ id: ticketResult.insertId, ticket_number: ticketNumber });
      }
    } else {
      // 비좌석제인 경우
      const eventResult = await connection.execute(
        'SELECT general_price_krw, vip_price_krw FROM events WHERE id = ?',
        [event_id]
      );

      if (!eventResult.rows || eventResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '행사를 찾을 수 없습니다.'
        });
      }

      const event = eventResult.rows[0];
      const price = ticket_type === 'VIP' ? event.vip_price_krw : event.general_price_krw;
      totalPrice = price * quantity;

      for (let i = 0; i < quantity; i++) {
        const ticketNumber = `TKT-${today}-${randomNum}-${String(i + 1).padStart(3, '0')}`;
        const qrData = JSON.stringify({ ticketNumber, eventId: event_id, ticketType: ticket_type });
        const qrCode = await QRCode.toDataURL(qrData);

        const ticketResult = await connection.execute(
          `INSERT INTO event_tickets (
            event_id, user_id, ticket_number, order_number,
            ticket_type, price_krw, qr_code,
            status, payment_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 'pending')`,
          [event_id, user_id, ticketNumber, orderNumber, ticket_type, price, qrCode]
        );

        tickets.push({ id: ticketResult.insertId, ticket_number: ticketNumber });
      }
    }

    // 판매 수량 증가
    await connection.execute(
      'UPDATE events SET current_sold = current_sold + ? WHERE id = ?',
      [tickets.length, event_id]
    );

    console.log(`✅ [Event Booking] 티켓 예매 완료: ${orderNumber}`);

    return res.status(201).json({
      success: true,
      message: '티켓이 예매되었습니다.',
      data: {
        order_number: orderNumber,
        tickets,
        total_price: totalPrice
      }
    });

  } catch (error) {
    console.error('❌ [Event Book Tickets API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

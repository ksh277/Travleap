const { connect } = require('@planetscale/database');

/**
 * 행사 티켓 조회 API
 * GET /api/event/tickets/[orderId]
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { orderId } = req.query;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: '주문 번호가 필요합니다.'
      });
    }

    const result = await connection.execute(
      `SELECT
        et.*,
        e.title as event_title,
        e.start_datetime,
        e.end_datetime,
        e.venue_name,
        e.venue_address,
        e.doors_open_time,
        e.poster_url
       FROM event_tickets et
       INNER JOIN events e ON et.event_id = e.id
       WHERE et.order_number = ?
       ORDER BY et.id`,
      [orderId]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '티켓을 찾을 수 없습니다.'
      });
    }

    const tickets = result.rows.map(ticket => ({
      ...ticket,
      seat_info: ticket.seat_info ? JSON.parse(ticket.seat_info) : null
    }));

    return res.status(200).json({
      success: true,
      data: tickets
    });

  } catch (error) {
    console.error('❌ [Event Tickets API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

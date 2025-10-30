const { connect } = require('@planetscale/database');

/**
 * 행사 좌석 배치도 조회 API
 * GET /api/event/seats/[eventId]
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
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: '행사 ID가 필요합니다.'
      });
    }

    // 좌석 조회
    const result = await connection.execute(
      `SELECT * FROM event_seats
       WHERE event_id = ?
       ORDER BY section, row, seat_number`,
      [eventId]
    );

    // 섹션별로 그룹화
    const seatsBySection = {};
    result.rows.forEach(seat => {
      if (!seatsBySection[seat.section]) {
        seatsBySection[seat.section] = [];
      }
      seatsBySection[seat.section].push(seat);
    });

    // 통계
    const stats = {
      total: result.rows.length,
      available: result.rows.filter(s => s.status === 'available').length,
      sold: result.rows.filter(s => s.status === 'sold').length,
      reserved: result.rows.filter(s => s.status === 'reserved').length,
      blocked: result.rows.filter(s => s.status === 'blocked').length
    };

    return res.status(200).json({
      success: true,
      data: {
        seats: result.rows,
        seatsBySection,
        stats
      }
    });

  } catch (error) {
    console.error('❌ [Event Seats API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

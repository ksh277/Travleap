const { connect } = require('@planetscale/database');

/**
 * 숙박 예약 가능 여부 확인 API
 * GET: 특정 날짜 범위의 예약 가능 여부 확인
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { listing_id, start_date, end_date } = req.query;

    if (!listing_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: '필수 파라미터가 누락되었습니다. (listing_id, start_date, end_date)'
      });
    }

    // 날짜 검증
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDateObj < today) {
      return res.status(400).json({
        success: false,
        error: '체크인 날짜는 오늘 이후여야 합니다.',
        available: false
      });
    }

    if (endDateObj <= startDateObj) {
      return res.status(400).json({
        success: false,
        error: '체크아웃 날짜는 체크인 날짜 이후여야 합니다.',
        available: false
      });
    }

    // 객실 정보 조회
    const roomResult = await connection.execute(
      `SELECT
        l.id,
        l.title,
        l.is_active,
        l.is_published,
        p.business_name,
        p.partner_type
      FROM listings l
      JOIN partners p ON l.partner_id = p.id
      WHERE l.id = ?`,
      [listing_id]
    );

    if (!roomResult || !roomResult.rows || roomResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '객실을 찾을 수 없습니다.',
        available: false
      });
    }

    const room = roomResult.rows[0];

    if (!room.is_active || !room.is_published) {
      return res.status(200).json({
        success: true,
        available: false,
        reason: '이 객실은 현재 예약할 수 없습니다.'
      });
    }

    // 예약 가능 여부 확인 (중복 예약 체크)
    // ✅ pending 예약은 5분 이내의 것만 체크 (오래된 결제 실패 예약 무시)
    const conflictCheck = await connection.execute(
      `SELECT
         id,
         booking_number,
         start_date,
         end_date,
         status,
         payment_status
       FROM bookings
       WHERE listing_id = ?
       AND (
         status = 'confirmed'
         OR (status = 'pending' AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE))
       )
       AND (
         (start_date <= ? AND end_date > ?)
         OR (start_date < ? AND end_date >= ?)
         OR (start_date >= ? AND end_date <= ?)
       )`,
      [listing_id, start_date, start_date, end_date, end_date, start_date, end_date]
    );

    const conflicts = conflictCheck.rows || [];

    if (conflicts.length > 0) {
      return res.status(200).json({
        success: true,
        available: false,
        reason: '선택하신 날짜에 이미 예약이 존재합니다.',
        conflicts: conflicts.map(c => ({
          booking_number: c.booking_number,
          start_date: c.start_date,
          end_date: c.end_date,
          status: c.status
        }))
      });
    }

    // 예약 가능
    return res.status(200).json({
      success: true,
      available: true,
      room: {
        id: room.id,
        title: room.title,
        business_name: room.business_name
      },
      dates: {
        start: start_date,
        end: end_date,
        nights: Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24))
      }
    });

  } catch (error) {
    console.error('❌ [예약 가능 여부 확인 오류]:', error);
    return res.status(500).json({
      success: false,
      error: '예약 가능 여부 확인 중 오류가 발생했습니다.',
      available: false
    });
  }
};

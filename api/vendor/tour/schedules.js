/**
 * 투어/숙박 벤더 - 내 일정 목록 조회
 * GET /api/vendor/tour/schedules
 */

const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });
  }

  try {
    // JWT 검증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    } catch (error) {
      return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
    }

    if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: '벤더 권한이 필요합니다.' });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // 벤더의 투어/숙박 일정 조회
    // bookings 테이블에서 해당 벤더의 listings에 대한 예약들을 일정별로 그룹화
    const partnerId = decoded.partnerId || decoded.userId;

    const result = await connection.execute(
      `SELECT
        l.id as listing_id,
        l.title as package_name,
        l.category,
        b.start_date as departure_date,
        b.check_in_time as departure_time,
        COUNT(DISTINCT b.id) as booking_count,
        SUM(b.num_adults) as current_participants,
        MAX(l.max_capacity) as max_participants,
        GROUP_CONCAT(DISTINCT b.status) as statuses
      FROM listings l
      LEFT JOIN bookings b ON b.listing_id = l.id
      WHERE l.partner_id = ?
        AND (l.category = 'tour' OR l.category = 'stay')
        AND b.start_date IS NOT NULL
      GROUP BY l.id, b.start_date, b.check_in_time
      ORDER BY b.start_date DESC, b.check_in_time ASC`,
      [partnerId]
    );

    const schedules = (result.rows || []).map(row => {
      // 상태 결정 (confirmed가 하나라도 있으면 confirmed, 모두 pending이면 pending)
      let status = 'pending';
      if (row.statuses) {
        if (row.statuses.includes('confirmed') || row.statuses.includes('completed')) {
          status = 'confirmed';
        } else if (row.statuses.includes('cancelled')) {
          status = 'cancelled';
        }
      }

      return {
        id: row.listing_id,
        package_id: row.listing_id,
        package_name: row.package_name,
        category: row.category,
        departure_date: row.departure_date || new Date().toISOString().split('T')[0],
        departure_time: row.departure_time || '09:00:00',
        max_participants: row.max_participants || 10,
        current_participants: row.current_participants || 0,
        booking_count: row.booking_count || 0,
        status,
        guide_name: null // TODO: 가이드 정보는 별도 테이블 필요
      };
    });

    return res.status(200).json({
      success: true,
      schedules,
      total: schedules.length
    });

  } catch (error) {
    console.error('❌ [Tour Schedules API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};

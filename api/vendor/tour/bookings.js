const { connect } = require('@planetscale/database');

/**
 * 업체 투어 예약 관리 API
 * GET /api/vendor/tour/bookings
 *
 * Query Parameters:
 * - vendor_id: 업체 ID (필수)
 * - status: 예약 상태 필터
 * - start_date: 시작 날짜
 * - end_date: 종료 날짜
 * - limit: 페이지당 아이템 수
 * - offset: 오프셋
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
    const {
      vendor_id,
      status,
      start_date,
      end_date,
      limit = 50,
      offset = 0
    } = req.query;

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        error: '업체 ID가 필요합니다.'
      });
    }

    // 동적 쿼리 조건 생성
    const conditions = ['tp.vendor_id = ?'];
    const params = [vendor_id];

    if (status) {
      conditions.push('tb.status = ?');
      params.push(status);
    }

    if (start_date) {
      conditions.push('ts.departure_date >= ?');
      params.push(start_date);
    }

    if (end_date) {
      conditions.push('ts.departure_date <= ?');
      params.push(end_date);
    }

    const whereClause = conditions.join(' AND ');

    // 예약 목록 조회
    const result = await connection.execute(
      `SELECT
        tb.id,
        tb.booking_number,
        tb.voucher_code,
        tb.adult_count,
        tb.child_count,
        tb.infant_count,
        tb.total_price_krw,
        tb.status,
        tb.payment_status,
        tb.checked_in_at,
        tb.created_at,
        ts.departure_date,
        ts.departure_time,
        ts.guide_name,
        tp.package_name,
        u.name as customer_name,
        u.phone as customer_phone,
        u.email as customer_email
       FROM tour_bookings tb
       INNER JOIN tour_schedules ts ON tb.schedule_id = ts.id
       INNER JOIN tour_packages tp ON ts.package_id = tp.id
       LEFT JOIN users u ON tb.user_id = u.id
       WHERE ${whereClause}
       ORDER BY ts.departure_date DESC, ts.departure_time DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // 통계 조회
    const statsResult = await connection.execute(
      `SELECT
        COUNT(*) as total_bookings,
        SUM(CASE WHEN tb.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
        SUM(CASE WHEN tb.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN tb.status = 'canceled' THEN 1 ELSE 0 END) as canceled_count,
        SUM(CASE WHEN tb.payment_status = 'paid' THEN tb.total_price_krw ELSE 0 END) as total_revenue
       FROM tour_bookings tb
       INNER JOIN tour_schedules ts ON tb.schedule_id = ts.id
       INNER JOIN tour_packages tp ON ts.package_id = tp.id
       WHERE tp.vendor_id = ?`,
      [vendor_id]
    );

    const stats = statsResult.rows[0] || {};

    // 다가오는 일정 조회 (향후 7일)
    const upcomingResult = await connection.execute(
      `SELECT
        ts.id,
        ts.departure_date,
        ts.departure_time,
        tp.package_name,
        ts.current_participants,
        ts.max_participants,
        COUNT(tb.id) as booking_count
       FROM tour_schedules ts
       INNER JOIN tour_packages tp ON ts.package_id = tp.id
       LEFT JOIN tour_bookings tb ON ts.id = tb.schedule_id AND tb.status != 'canceled'
       WHERE tp.vendor_id = ?
         AND ts.departure_date >= CURDATE()
         AND ts.departure_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
         AND ts.status IN ('scheduled', 'confirmed')
       GROUP BY ts.id
       ORDER BY ts.departure_date ASC, ts.departure_time ASC
       LIMIT 10`,
      [vendor_id]
    );

    return res.status(200).json({
      success: true,
      data: {
        bookings: result.rows,
        stats: {
          total: stats.total_bookings || 0,
          confirmed: stats.confirmed_count || 0,
          pending: stats.pending_count || 0,
          canceled: stats.canceled_count || 0,
          total_revenue: stats.total_revenue || 0
        },
        upcoming_schedules: upcomingResult.rows
      },
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: result.rows.length
      }
    });

  } catch (error) {
    console.error('❌ [Vendor Tour Bookings API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

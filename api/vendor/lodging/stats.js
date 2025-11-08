const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 숙박 벤더 대시보드 - 통계 및 수익 조회 API
 * GET /api/vendor/lodging/stats
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // JWT 토큰 검증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '인증이 필요합니다.' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (err) {
      return res.status(401).json({ success: false, error: '유효하지 않은 토큰입니다.' });
    }

    const userId = decoded.userId || decoded.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: '사용자 정보를 찾을 수 없습니다.' });
    }

    const { period = 'month' } = req.query; // 'day', 'week', 'month', 'year'

    const connection = connect({ url: process.env.DATABASE_URL });

    // 사용자의 vendor_id 조회
    const vendorResult = await connection.execute(
      `SELECT p.id as partner_id, p.business_name
       FROM partners p
       WHERE p.user_id = ? AND p.partner_type = 'lodging' AND p.is_active = 1
       LIMIT 1`,
      [userId]
    );

    if (!vendorResult.rows || vendorResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: '숙박 업체 정보를 찾을 수 없습니다.'
      });
    }

    const partnerId = vendorResult.rows[0].partner_id;
    const businessName = vendorResult.rows[0].business_name;

    // 기간 설정
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = now.toISOString().split('T')[0];

    // 1. 총 예약 수 및 수익
    const bookingsResult = await connection.execute(
      `SELECT
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'confirmed' OR status = 'in_use' OR status = 'completed' THEN 1 ELSE 0 END) as confirmed_bookings,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN status = 'completed' AND payment_status = 'paid' THEN total_amount ELSE 0 END) as completed_revenue,
        AVG(CASE WHEN payment_status = 'paid' THEN total_amount ELSE NULL END) as avg_booking_value
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      WHERE l.partner_id = ?
        AND b.created_at >= ?
        AND b.created_at <= ?`,
      [partnerId, startDateStr, endDateStr]
    );

    const stats = bookingsResult.rows?.[0] || {};

    // 2. 객실별 통계
    const roomStatsResult = await connection.execute(
      `SELECT
        l.id as room_id,
        l.title as room_name,
        COUNT(b.id) as bookings_count,
        SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_amount ELSE 0 END) as revenue
      FROM listings l
      LEFT JOIN bookings b ON l.id = b.listing_id
        AND b.created_at >= ?
        AND b.created_at <= ?
      WHERE l.partner_id = ?
        AND l.category_id = (SELECT id FROM categories WHERE slug = 'stay' LIMIT 1)
      GROUP BY l.id, l.title
      ORDER BY revenue DESC`,
      [startDateStr, endDateStr, partnerId]
    );

    const roomStats = (roomStatsResult.rows || []).map(room => ({
      room_id: room.room_id,
      room_name: room.room_name,
      bookings_count: room.bookings_count || 0,
      revenue: parseFloat(room.revenue) || 0
    }));

    // 3. 일별 예약 추이 (최근 30일)
    const dailyTrendResult = await connection.execute(
      `SELECT
        DATE(b.created_at) as date,
        COUNT(*) as bookings,
        SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_amount ELSE 0 END) as revenue
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      WHERE l.partner_id = ?
        AND b.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(b.created_at)
      ORDER BY date ASC`,
      [partnerId]
    );

    const dailyTrend = (dailyTrendResult.rows || []).map(day => ({
      date: day.date,
      bookings: day.bookings || 0,
      revenue: parseFloat(day.revenue) || 0
    }));

    // 4. 평균 숙박 일수
    const avgStayResult = await connection.execute(
      `SELECT
        AVG(DATEDIFF(b.end_date, b.start_date)) as avg_nights
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      WHERE l.partner_id = ?
        AND b.created_at >= ?
        AND b.payment_status = 'paid'`,
      [partnerId, startDateStr]
    );

    const avgNights = avgStayResult.rows?.[0]?.avg_nights || 0;

    // 5. 점유율 계산 (기간 내)
    const totalRoomsResult = await connection.execute(
      `SELECT COUNT(*) as total_rooms
       FROM listings l
       WHERE l.partner_id = ?
         AND l.category_id = (SELECT id FROM categories WHERE slug = 'stay' LIMIT 1)
         AND l.is_active = 1
         AND l.is_published = 1`,
      [partnerId]
    );

    const totalRooms = totalRoomsResult.rows?.[0]?.total_rooms || 1;
    const periodDays = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
    const totalRoomNights = totalRooms * periodDays;
    const bookedNights = (stats.confirmed_bookings || 0) * (avgNights || 1);
    const occupancyRate = totalRoomNights > 0
      ? ((bookedNights / totalRoomNights) * 100).toFixed(2)
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        period: {
          type: period,
          start: startDateStr,
          end: endDateStr,
          days: periodDays
        },
        business: {
          name: businessName,
          total_rooms: totalRooms
        },
        summary: {
          total_bookings: stats.total_bookings || 0,
          confirmed_bookings: stats.confirmed_bookings || 0,
          cancelled_bookings: stats.cancelled_bookings || 0,
          total_revenue: parseFloat(stats.total_revenue) || 0,
          completed_revenue: parseFloat(stats.completed_revenue) || 0,
          avg_booking_value: parseFloat(stats.avg_booking_value) || 0,
          avg_nights: parseFloat(avgNights).toFixed(1),
          occupancy_rate: parseFloat(occupancyRate)
        },
        room_stats: roomStats,
        daily_trend: dailyTrend
      }
    });

  } catch (error) {
    console.error('❌ [통계 조회 오류]:', error);
    return res.status(500).json({
      success: false,
      error: '통계 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

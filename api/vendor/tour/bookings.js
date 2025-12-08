const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 업체 투어 예약 관리 API
 * GET /api/vendor/tour/bookings
 *
 * Query Parameters:
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

  // JWT 인증 확인
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - No token provided'
    });
  }

  const token = authHeader.substring(7);
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid token'
    });
  }

  // 벤더 또는 관리자 권한 확인
  if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden - Vendor role required'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // vendor_id는 JWT에서만 추출 (쿼리 파라미터 무시)
    let vendor_id;
    if (decoded.role === 'admin') {
      vendor_id = req.query.vendor_id; // 관리자는 다른 벤더 조회 가능
    } else {
      // 벤더는 JWT의 userId로 tour_vendors 테이블에서 vendor_id 조회
      const vendorResult = await connection.execute(
        'SELECT id FROM tour_vendors WHERE user_id = ? LIMIT 1',
        [decoded.userId]
      );

      if (!vendorResult.rows || vendorResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '등록된 투어 벤더 정보가 없습니다.'
        });
      }

      vendor_id = vendorResult.rows[0].id;
    }

    const {
      status,
      start_date,
      end_date,
      limit = 50,
      offset = 0
    } = req.query;

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
    // ✅ FIX: users 테이블은 Neon PostgreSQL에 있으므로 JOIN 제거
    const result = await connection.execute(
      `SELECT
        tb.id,
        tb.booking_number,
        tb.voucher_code,
        tb.user_id,
        tb.adult_count,
        tb.child_count,
        tb.infant_count,
        tb.total_price_krw,
        tb.status,
        tb.payment_status,
        tb.payment_key,
        tb.checked_in_at,
        tb.created_at,
        ts.departure_date,
        ts.departure_time,
        ts.guide_name,
        tp.package_name
       FROM tour_bookings tb
       INNER JOIN tour_schedules ts ON tb.schedule_id = ts.id
       INNER JOIN tour_packages tp ON ts.package_id = tp.id
       WHERE ${whereClause}
       ORDER BY ts.departure_date DESC, ts.departure_time DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // ✅ FIX: Neon PostgreSQL에서 사용자 정보 별도 조회
    const { Pool } = require('@neondatabase/serverless');
    const poolNeon = new Pool({
      connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
    });

    let userMap = new Map();
    try {
      const userIds = [...new Set((result.rows || []).map(b => b.user_id).filter(Boolean))];

      if (userIds.length > 0) {
        const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
        const usersResult = await poolNeon.query(
          `SELECT id, name, email, phone FROM users WHERE id IN (${placeholders})`,
          userIds
        );
        usersResult.rows.forEach(user => {
          userMap.set(user.id, user);
        });
      }
    } catch (neonError) {
      console.warn('⚠️ [Tour Vendor] Neon users 조회 실패:', neonError.message);
    } finally {
      await poolNeon.end();
    }

    // ✅ 예약 데이터에 사용자 정보 병합
    const bookingsWithUsers = (result.rows || []).map(booking => {
      const neonUser = userMap.get(booking.user_id);
      return {
        ...booking,
        customer_name: neonUser?.name || '',
        customer_phone: neonUser?.phone || '',
        customer_email: neonUser?.email || ''
      };
    });

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
        bookings: bookingsWithUsers,  // ✅ FIX: 사용자 정보 병합된 데이터 반환
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
        count: bookingsWithUsers.length
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

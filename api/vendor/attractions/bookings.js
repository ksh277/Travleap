/**
 * 관광지 벤더 예약 조회 API
 * GET /api/vendor/attractions/bookings
 *
 * ⚠️ 주의: bookings 테이블 직접 조회
 * category_id=1859 (관광지)로 필터링
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
    let partner_id;
    if (decoded.role === 'admin') {
      partner_id = req.query.partner_id; // 관리자는 다른 벤더 조회 가능
    } else {
      // ⚠️ 주의: partners 테이블에서 user_id로 partner_id 조회
      const partnerResult = await connection.execute(
        'SELECT id FROM partners WHERE user_id = ? LIMIT 1',
        [decoded.userId]
      );

      if (!partnerResult.rows || partnerResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '등록된 관광지 벤더 정보가 없습니다.'
        });
      }

      partner_id = partnerResult.rows[0].id;
    }

    console.log('📋 [Attraction Vendor] 예약 조회:', { partner_id, role: decoded.role });

    const {
      status,
      start_date,
      end_date,
      limit = 50,
      offset = 0
    } = req.query;

    // 동적 쿼리 조건 생성
    const conditions = ['l.partner_id = ?', 'l.category_id = 1859'];
    const params = [partner_id];

    if (status) {
      conditions.push('b.status = ?');
      params.push(status);
    }

    if (start_date) {
      conditions.push('b.start_date >= ?');
      params.push(start_date);
    }

    if (end_date) {
      conditions.push('b.start_date <= ?');
      params.push(end_date);
    }

    const whereClause = conditions.join(' AND ');

    // ⚠️ CRITICAL: bookings 테이블 직접 조회 (lodging_bookings 아님!)
    const result = await connection.execute(
      `SELECT
        b.id,
        b.booking_number,
        b.listing_id,
        b.user_id,
        b.start_date as visit_date,
        b.num_adults,
        b.num_children,
        b.price_adult,
        b.price_child,
        b.total_amount,
        b.payment_status,
        b.status,
        b.customer_info,
        b.special_requests,
        b.created_at,
        l.title as attraction_name,
        l.images as attraction_images,
        u.name as customer_name,
        u.phone as customer_phone,
        u.email as customer_email
       FROM bookings b
       INNER JOIN listings l ON b.listing_id = l.id
       LEFT JOIN users u ON b.user_id = u.id
       WHERE ${whereClause}
       ORDER BY b.created_at DESC, b.start_date DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // customer_info JSON 파싱
    const bookings = (result.rows || []).map(booking => {
      let customerInfo = null;
      if (booking.customer_info) {
        try {
          customerInfo = typeof booking.customer_info === 'string'
            ? JSON.parse(booking.customer_info)
            : booking.customer_info;
        } catch (e) {
          console.warn(`Failed to parse customer_info for booking ${booking.id}`);
        }
      }

      return {
        ...booking,
        customer_info: customerInfo,
        // 고객 정보 병합 (customer_info 우선, users 테이블 백업)
        customer_name: customerInfo?.name || booking.customer_name,
        customer_phone: customerInfo?.phone || booking.customer_phone,
        customer_email: customerInfo?.email || booking.customer_email
      };
    });

    // 통계 조회
    const statsResult = await connection.execute(
      `SELECT
        COUNT(*) as total_bookings,
        SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
        SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_amount ELSE 0 END) as total_revenue,
        SUM(b.num_adults + b.num_children) as total_visitors
       FROM bookings b
       INNER JOIN listings l ON b.listing_id = l.id
       WHERE l.partner_id = ? AND l.category_id = 1859`,
      [partner_id]
    );

    const stats = statsResult.rows[0] || {};

    console.log('✅ [Attraction Vendor] 조회 완료:', {
      bookings: bookings.length,
      total: stats.total_bookings
    });

    return res.status(200).json({
      success: true,
      data: {
        bookings,
        stats: {
          total: stats.total_bookings || 0,
          confirmed: stats.confirmed_count || 0,
          pending: stats.pending_count || 0,
          cancelled: stats.cancelled_count || 0,
          total_revenue: stats.total_revenue || 0,
          total_visitors: stats.total_visitors || 0
        }
      },
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: bookings.length
      }
    });

  } catch (error) {
    console.error('❌ [Attraction Vendor Bookings API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

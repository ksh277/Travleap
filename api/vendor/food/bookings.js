/**
 * 음식점 벤더 예약 조회 API
 * GET /api/vendor/food/bookings
 *
 * ⚠️ 주의: bookings 테이블 직접 조회
 * category_id=1858 (음식)로 필터링
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
        'SELECT id FROM partners WHERE user_id = ? AND partner_type = ? LIMIT 1',
        [decoded.userId, 'food']
      );

      if (!partnerResult.rows || partnerResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '등록된 음식점 벤더 정보가 없습니다.'
        });
      }

      partner_id = partnerResult.rows[0].id;
    }

    console.log('📋 [Food Vendor] 예약 조회:', { partner_id, role: decoded.role });

    const {
      status,
      start_date,
      end_date,
      limit = 50,
      offset = 0
    } = req.query;

    // 동적 쿼리 조건 생성
    const conditions = ['l.partner_id = ?', 'l.category_id = 1858'];
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

    // ⚠️ CRITICAL: bookings 테이블 직접 조회 (food_bookings 아님!)
    // ✅ FIX: users 테이블은 Neon PostgreSQL에 있으므로 JOIN 제거
    const result = await connection.execute(
      `SELECT
        b.id,
        b.booking_number,
        b.listing_id,
        b.user_id,
        b.start_date as reservation_date,
        b.num_adults as party_size,
        b.num_adults,
        b.num_children,
        b.num_infants,
        b.adults,
        b.children,
        b.infants,
        b.price_adult as price_per_person,
        b.total_amount,
        b.payment_status,
        b.payment_key,
        b.payment_method,
        b.status,
        b.customer_info,
        b.special_requests,
        b.created_at,
        l.title as restaurant_name,
        l.images as restaurant_images,
        p.method as payment_method_detail,
        p.card_company,
        p.virtual_account_bank
       FROM bookings b
       INNER JOIN listings l ON b.listing_id = l.id
       LEFT JOIN payments p ON b.id = p.booking_id
       WHERE ${whereClause}
       ORDER BY b.created_at DESC, b.start_date DESC
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
      console.warn('⚠️ [Food Vendor] Neon users 조회 실패 (customer_info로 대체):', neonError.message);
    } finally {
      await poolNeon.end();
    }

    // customer_info JSON 파싱 + Neon 사용자 정보 병합
    const bookings = (result.rows || []).map(booking => {
      let customerInfo = null;
      let reservationTime = '';
      let menuItems = [];

      if (booking.customer_info) {
        try {
          customerInfo = typeof booking.customer_info === 'string'
            ? JSON.parse(booking.customer_info)
            : booking.customer_info;

          // 예약 시간 추출
          reservationTime = customerInfo.reservation_time || '';

          // 메뉴 정보 추출
          menuItems = customerInfo.menu_items || customerInfo.order_items || customerInfo.items || [];
        } catch (e) {
          console.warn(`Failed to parse customer_info for booking ${booking.id}`);
        }
      }

      // ✅ Neon에서 조회한 사용자 정보
      const neonUser = userMap.get(booking.user_id);

      return {
        ...booking,
        customer_info: customerInfo,
        reservation_time: reservationTime,
        menu_items: menuItems,
        // 고객 정보 병합 (customer_info 우선, Neon users 백업)
        customer_name: customerInfo?.name || neonUser?.name || '',
        customer_phone: customerInfo?.phone || neonUser?.phone || '',
        customer_email: customerInfo?.email || neonUser?.email || ''
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
        SUM(COALESCE(b.num_adults, 0) + COALESCE(b.num_children, 0) + COALESCE(b.num_infants, 0)) as total_guests
       FROM bookings b
       INNER JOIN listings l ON b.listing_id = l.id
       WHERE l.partner_id = ? AND l.category_id = 1858`,
      [partner_id]
    );

    const stats = statsResult.rows[0] || {};

    console.log('✅ [Food Vendor] 조회 완료:', {
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
          total_guests: stats.total_guests || 0
        }
      },
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: bookings.length
      }
    });

  } catch (error) {
    console.error('❌ [Food Vendor Bookings API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

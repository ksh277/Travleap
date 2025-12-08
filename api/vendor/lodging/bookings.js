/**
 * 숙박 벤더 - 예약 관리 API
 * GET /api/vendor/lodging/bookings - 벤더의 예약 목록 조회
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
    // JWT 토큰 검증
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

    if (decoded.role !== 'vendor' && decoded.role !== 'admin' && decoded.role !== 'partner') {
      return res.status(403).json({ success: false, message: '벤더 권한이 필요합니다.' });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // user_id로 숙박 벤더 ID 조회
    let vendorId = req.query.vendorId;

    if (!vendorId) {
      const vendorResult = await connection.execute(
        `SELECT id FROM partners WHERE user_id = ? AND partner_type = 'lodging' LIMIT 1`,
        [decoded.userId]
      );

      if (!vendorResult.rows || vendorResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '등록된 숙박 업체 정보가 없습니다.'
        });
      }

      vendorId = vendorResult.rows[0].id;
    }

    console.log('📋 [Lodging Bookings API] 예약 조회:', { vendorId });

    // 벤더의 숙박 예약 목록 조회
    // ✅ FIX: users 테이블은 Neon PostgreSQL에 있으므로 JOIN 제거
    const result = await connection.execute(
      `SELECT
        b.id,
        b.listing_id,
        b.user_id,
        b.start_date as checkin_date,
        b.end_date as checkout_date,
        b.num_adults + b.num_children as guest_count,
        b.total_amount as total_price,
        b.status,
        b.payment_status,
        b.created_at,
        b.customer_info,
        l.title as lodging_name,
        DATEDIFF(b.end_date, b.start_date) as nights
      FROM bookings b
      INNER JOIN listings l ON b.listing_id = l.id
      WHERE l.partner_id = ? AND l.category = '숙박'
      ORDER BY b.created_at DESC`,
      [vendorId]
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
      console.warn('⚠️ [Lodging Vendor] Neon users 조회 실패 (customer_info로 대체):', neonError.message);
    } finally {
      await poolNeon.end();
    }

    const bookings = (result.rows || []).map(row => {
      // customer_info에서 전화번호 추출
      let customerPhone = '';
      if (row.customer_info) {
        try {
          const info = typeof row.customer_info === 'string' ? JSON.parse(row.customer_info) : row.customer_info;
          customerPhone = info.phone || info.guest_phone || '';
        } catch (e) {}
      }

      // ✅ Neon에서 조회한 사용자 정보
      const neonUser = userMap.get(row.user_id);

      return {
        id: row.id,
        listing_id: row.listing_id,
        lodging_name: row.lodging_name,
        guest_name: neonUser?.name || '',
        guest_email: neonUser?.email || '',
        guest_phone: customerPhone || neonUser?.phone || '',
        checkin_date: row.checkin_date,
        checkout_date: row.checkout_date,
        nights: row.nights || 1,
        guest_count: row.guest_count,
        total_price: row.total_price,
        status: row.status,
        payment_status: row.payment_status,
        created_at: row.created_at
      };
    });

    console.log(`✅ [Lodging Bookings API] ${bookings.length}건 조회 완료`);

    return res.status(200).json({
      success: true,
      data: bookings
    });

  } catch (error) {
    console.error('❌ [Lodging Bookings API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};

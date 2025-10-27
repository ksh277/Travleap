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

    if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
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

      if (!vendorResult || vendorResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: '등록된 숙박 업체 정보가 없습니다.'
        });
      }

      vendorId = vendorResult[0].id;
    }

    console.log('📋 [Lodging Bookings API] 예약 조회:', { vendorId });

    // 벤더의 숙박 예약 목록 조회
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
        l.title as lodging_name,
        u.name as guest_name,
        u.email as guest_email,
        COALESCE(
          JSON_EXTRACT(b.customer_info, '$.phone'),
          JSON_EXTRACT(b.customer_info, '$.guest_phone'),
          u.phone
        ) as guest_phone,
        DATEDIFF(b.end_date, b.start_date) as nights
      FROM bookings b
      INNER JOIN listings l ON b.listing_id = l.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE l.partner_id = ? AND l.category = '숙박'
      ORDER BY b.created_at DESC`,
      [vendorId]
    );

    const bookings = (result.rows || []).map(row => ({
      id: row.id,
      listing_id: row.listing_id,
      lodging_name: row.lodging_name,
      guest_name: row.guest_name,
      guest_email: row.guest_email,
      guest_phone: row.guest_phone ? row.guest_phone.replace(/"/g, '') : '',
      checkin_date: row.checkin_date,
      checkout_date: row.checkout_date,
      nights: row.nights || 1,
      guest_count: row.guest_count,
      total_price: row.total_price,
      status: row.status,
      payment_status: row.payment_status,
      created_at: row.created_at
    }));

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

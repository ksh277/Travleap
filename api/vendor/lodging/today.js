const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 숙박 벤더 대시보드 - 오늘 체크인/체크아웃 조회 API
 * GET /api/vendor/lodging/today
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

    const connection = connect({ url: process.env.DATABASE_URL });

    // 사용자의 vendor_id 조회 (partner_id)
    const vendorResult = await connection.execute(
      `SELECT p.id as partner_id
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

    // 오늘 날짜
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    // 오늘 체크인 예약 조회
    const checkInsResult = await connection.execute(
      `SELECT
        b.id,
        b.booking_number,
        b.start_date,
        b.end_date,
        b.check_in_time,
        b.num_adults,
        b.num_children,
        b.total_amount,
        b.payment_status,
        b.status,
        b.customer_info,
        b.special_requests,
        l.title as room_name,
        l.location
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      WHERE l.partner_id = ?
        AND b.start_date = ?
        AND b.status IN ('confirmed', 'pending')
        AND b.payment_status = 'paid'
      ORDER BY b.check_in_time ASC`,
      [partnerId, todayStr]
    );

    // 오늘 체크아웃 예약 조회
    const checkOutsResult = await connection.execute(
      `SELECT
        b.id,
        b.booking_number,
        b.start_date,
        b.end_date,
        b.check_out_time,
        b.num_adults,
        b.num_children,
        b.total_amount,
        b.payment_status,
        b.status,
        b.customer_info,
        b.special_requests,
        l.title as room_name,
        l.location
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      WHERE l.partner_id = ?
        AND b.end_date = ?
        AND b.status IN ('confirmed', 'in_use')
        AND b.payment_status = 'paid'
      ORDER BY b.check_out_time ASC`,
      [partnerId, todayStr]
    );

    // 고객 정보 파싱
    const parseCustomerInfo = (customerInfoJson) => {
      try {
        if (customerInfoJson) {
          return typeof customerInfoJson === 'string'
            ? JSON.parse(customerInfoJson)
            : customerInfoJson;
        }
      } catch (e) {
        console.error('Failed to parse customer_info:', e);
      }
      return { name: 'Guest', email: '', phone: '' };
    };

    // 체크인 데이터 포맷팅
    const checkIns = (checkInsResult.rows || []).map(booking => {
      const customerInfo = parseCustomerInfo(booking.customer_info);
      return {
        id: booking.id,
        booking_number: booking.booking_number,
        room_name: booking.room_name,
        location: booking.location,
        customer_name: customerInfo.name || 'Guest',
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        check_in_date: booking.start_date,
        check_out_date: booking.end_date,
        check_in_time: booking.check_in_time || '15:00',
        guests: {
          adults: booking.num_adults || 2,
          children: booking.num_children || 0
        },
        total_amount: booking.total_amount,
        payment_status: booking.payment_status,
        status: booking.status,
        special_requests: booking.special_requests
      };
    });

    // 체크아웃 데이터 포맷팅
    const checkOuts = (checkOutsResult.rows || []).map(booking => {
      const customerInfo = parseCustomerInfo(booking.customer_info);
      return {
        id: booking.id,
        booking_number: booking.booking_number,
        room_name: booking.room_name,
        location: booking.location,
        customer_name: customerInfo.name || 'Guest',
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        check_in_date: booking.start_date,
        check_out_date: booking.end_date,
        check_out_time: booking.check_out_time || '11:00',
        guests: {
          adults: booking.num_adults || 2,
          children: booking.num_children || 0
        },
        total_amount: booking.total_amount,
        payment_status: booking.payment_status,
        status: booking.status,
        special_requests: booking.special_requests
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        date: todayStr,
        check_ins: checkIns,
        check_outs: checkOuts,
        summary: {
          total_check_ins: checkIns.length,
          total_check_outs: checkOuts.length
        }
      }
    });

  } catch (error) {
    console.error('❌ [오늘 체크인/체크아웃 조회 오류]:', error);
    return res.status(500).json({
      success: false,
      error: '오늘 체크인/체크아웃 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

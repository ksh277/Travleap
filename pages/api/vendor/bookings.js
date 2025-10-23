const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

    // user_id로 vendor_id 조회
    let vendorId;
    if (decoded.role === 'admin') {
      vendorId = req.query.vendorId || req.body?.vendorId;
    } else {
      const vendorResult = await connection.execute(
        'SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
        [decoded.userId]
      );

      if (!vendorResult.rows || vendorResult.rows.length === 0) {
        return res.status(403).json({ success: false, message: '등록된 벤더 정보가 없습니다.' });
      }

      vendorId = vendorResult.rows[0].id;
    }

    console.log('📋 [Bookings API] 요청:', { method: req.method, vendorId, user: decoded.email });

    if (req.method === 'GET') {
      // 업체의 예약 목록 조회
      const result = await connection.execute(
        `SELECT
          rb.id,
          rb.vehicle_id,
          rv.display_name as vehicle_name,
          rb.customer_name,
          rb.customer_phone,
          rb.customer_email,
          rb.pickup_date,
          rb.return_date as dropoff_date,
          rb.total_price_krw as total_amount,
          rb.status,
          rb.created_at
        FROM rentcar_bookings rb
        JOIN rentcar_vehicles rv ON rb.vehicle_id = rv.id
        WHERE rv.vendor_id = ?
        ORDER BY rb.created_at DESC`,
        [vendorId]
      );

      console.log('✅ [Bookings API] 예약 조회 완료:', result.rows?.length, '건');

      const bookings = (result.rows || []).map(booking => ({
        ...booking,
        total_amount: parseInt(booking.total_amount) || 0
      }));

      return res.status(200).json({
        success: true,
        data: bookings
      });
    }

    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });

  } catch (error) {
    console.error('❌ [Bookings API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};

const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'GET 메서드만 지원합니다.' });

  try {
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
    let vendorId;
    
    if (decoded.role === 'admin') {
      vendorId = req.query.vendor_id;
    } else {
      const vendorResult = await connection.execute('SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1', [decoded.userId]);
      if (!vendorResult.rows || vendorResult.rows.length === 0) {
        return res.status(403).json({ success: false, message: '등록된 벤더 정보가 없습니다.' });
      }
      vendorId = vendorResult.rows[0].id;
    }

    const result = await connection.execute(
      `SELECT b.id, b.booking_number, b.customer_name, b.customer_phone, b.refund_amount_krw, b.refund_reason, b.refunded_at, b.created_at, v.display_name as vehicle_name
       FROM rentcar_bookings b
       LEFT JOIN rentcar_vehicles v ON b.vehicle_id = v.id
       WHERE b.vendor_id = ? AND b.payment_status = 'refunded'
       ORDER BY b.refunded_at DESC`,
      [vendorId]
    );

    return res.status(200).json({ success: true, data: result.rows || [] });
  } catch (error) {
    console.error('❌ [Refunds API] 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.', error: error.message });
  }
};

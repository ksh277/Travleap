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

    if (req.method === 'GET') {
      try {
        console.log('📊 [Revenue API] vendor_id:', vendorId);

        // 날짜별 매출 (최근 7일) - pickup_datetime 대신 created_at 사용
        const dailyRevenueResult = await connection.execute(
          `SELECT
            DATE(created_at) as date,
            SUM(total_amount) as revenue
          FROM rentcar_bookings
          WHERE vendor_id = ? AND status IN ('confirmed', 'paid', 'completed')
            AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          GROUP BY DATE(created_at)
          ORDER BY date DESC`,
          [vendorId]
        );

        console.log('📊 [Revenue API] 조회 결과:', dailyRevenueResult.rows);

        // 배열이 비어있으면 빈 배열 반환
        const revenueArray = dailyRevenueResult.rows && dailyRevenueResult.rows.length > 0
          ? dailyRevenueResult.rows.map(row => ({
              date: row.date,
              revenue: Number(row.revenue || 0)
            }))
          : [];

        return res.status(200).json({
          success: true,
          data: revenueArray
        });
      } catch (queryError) {
        console.error('❌ [Revenue API] 쿼리 오류:', queryError);
        // 오류 발생 시 빈 배열 반환 (대시보드가 작동하도록)
        return res.status(200).json({
          success: true,
          data: []
        });
      }
    }

    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });

  } catch (error) {
    console.error('❌ [Revenue API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};

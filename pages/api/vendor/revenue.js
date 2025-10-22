import { connect } from '@planetscale/database';
const { requireVendorAuth } = require('../../../middleware/vendor-auth');

const connection = connect({ url: process.env.DATABASE_URL });

export default async function handler(req, res) {
  // 벤더 인증 및 권한 확인
  const auth = await requireVendorAuth(req, res);
  if (!auth.success) return; // 이미 응답 전송됨

  const { method } = req;
  const vendorId = auth.vendorId;

  console.log('💰 [Revenue API] 요청:', { method, vendorId, user: auth.email });

  try {
    if (method === 'GET') {
      // 최근 7일 매출 통계 조회
      const result = await connection.execute(
        `SELECT
          DATE(rb.created_at) as date,
          SUM(rb.total_price_krw) as revenue
        FROM rentcar_bookings rb
        JOIN rentcar_vehicles rv ON rb.vehicle_id = rv.id
        WHERE rv.vendor_id = ?
          AND rb.status IN ('confirmed', 'completed')
          AND rb.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(rb.created_at)
        ORDER BY date ASC`,
        [vendorId]
      );

      console.log('✅ [Revenue API] 매출 조회 완료:', result.rows?.length, '일');

      const revenueData = (result.rows || []).map(row => ({
        date: row.date,
        revenue: parseInt(row.revenue) || 0
      }));

      return res.status(200).json({
        success: true,
        data: revenueData
      });
    }

    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });
  } catch (error) {
    console.error('Vendor revenue API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}

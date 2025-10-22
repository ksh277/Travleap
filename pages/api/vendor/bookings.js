import { connect } from '@planetscale/database';
const { requireVendorAuth } = require('../../../middleware/vendor-auth');

const connection = connect({ url: process.env.DATABASE_URL });

export default async function handler(req, res) {
  // 벤더 인증 및 권한 확인
  const auth = await requireVendorAuth(req, res);
  if (!auth.success) return; // 이미 응답 전송됨

  const { method } = req;
  const vendorId = auth.vendorId;

  console.log('📋 [Bookings API] 요청:', { method, vendorId, user: auth.email });

  try {
    if (method === 'GET') {
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
    console.error('Vendor bookings API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}

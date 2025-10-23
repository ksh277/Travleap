/**
 * 관리자 전용 - 렌트카 예약 관리 API
 * GET: 모든 렌트카 예약 조회 (차량명, 업체명 포함)
 */

import { connect } from '@planetscale/database';

const connection = connect({ url: process.env.DATABASE_URL_BUSINESS });

export default async function handler(req, res) {
  const { method } = req;

  // TODO: 관리자 권한 체크 추가
  // const { user } = req;
  // if (!user || user.role !== 'admin') {
  //   return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  // }

  try {
    if (method === 'GET') {
      // 모든 예약 조회 (차량명, 업체명 포함)
      const result = await connection.execute(`
        SELECT
          b.id,
          b.vendor_id,
          b.vehicle_id,
          v.display_name as vehicle_name,
          rv.vendor_name,
          b.customer_name,
          b.customer_phone,
          b.customer_email,
          b.pickup_date,
          b.return_date as dropoff_date,
          b.total_price_krw as total_amount,
          b.status,
          b.payment_status,
          b.created_at
        FROM rentcar_bookings b
        LEFT JOIN rentcar_vehicles v ON b.vehicle_id = v.id
        LEFT JOIN rentcar_vendors rv ON b.vendor_id = rv.id
        ORDER BY b.created_at DESC
      `);

      return res.status(200).json({
        success: true,
        data: result.rows.map(booking => ({
          ...booking,
          total_amount: Number(booking.total_amount) || 0
        }))
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Admin bookings API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}

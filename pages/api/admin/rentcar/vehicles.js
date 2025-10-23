/**
 * 관리자 전용 - 렌트카 차량 관리 API
 * GET: 모든 렌트카 차량 조회 (업체명 포함)
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
      // 모든 차량 조회 (업체명 포함)
      const result = await connection.execute(`
        SELECT
          v.id,
          v.vendor_id,
          rv.vendor_name,
          v.display_name,
          v.vehicle_class,
          v.seating_capacity,
          v.transmission as transmission_type,
          v.fuel_type,
          v.daily_rate_krw,
          v.hourly_rate_krw,
          v.is_active as is_available,
          v.images,
          v.created_at,
          v.updated_at
        FROM rentcar_vehicles v
        LEFT JOIN rentcar_vendors rv ON v.vendor_id = rv.id
        ORDER BY v.created_at DESC
      `);

      return res.status(200).json({
        success: true,
        data: result.rows.map(vehicle => ({
          ...vehicle,
          is_available: vehicle.is_available === 1,
          images: vehicle.images ? (typeof vehicle.images === 'string' ? JSON.parse(vehicle.images) : vehicle.images) : []
        }))
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Admin vehicles API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}

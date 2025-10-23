/**
 * 관리자 전용 - 렌트카 업체 관리 API
 * GET: 모든 렌트카 업체 조회
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
      // 모든 렌트카 업체 조회 (차량 수 포함)
      const result = await connection.execute(`
        SELECT
          rv.id,
          rv.vendor_name as name,
          rv.vendor_email as contact_email,
          rv.phone as contact_phone,
          rv.address,
          rv.status,
          rv.created_at,
          (SELECT COUNT(*) FROM rentcar_vehicles WHERE vendor_id = rv.id) as vehicle_count
        FROM rentcar_vendors rv
        ORDER BY rv.created_at DESC
      `);

      return res.status(200).json({
        success: true,
        data: result.rows.map(vendor => ({
          ...vendor,
          is_verified: vendor.status === 'active',
          vehicle_count: Number(vendor.vehicle_count) || 0
        }))
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Admin vendors API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}

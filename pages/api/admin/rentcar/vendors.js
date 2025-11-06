/**
 * 관리자 전용 - 렌트카 업체 관리 API
 * GET: 모든 렌트카 업체 조회
 */

import { connect } from '@planetscale/database';
const jwt = require('jsonwebtoken');

const connection = connect({ url: process.env.DATABASE_URL_BUSINESS });

// JWT 검증 함수
function verifyAdmin(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED');
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'travleap-secret-2025');

    if (decoded.role !== 'admin' && decoded.userType !== 'admin') {
      throw new Error('FORBIDDEN');
    }

    return decoded;
  } catch (error) {
    throw new Error('INVALID_TOKEN');
  }
}

export default async function handler(req, res) {
  const { method } = req;

  // 🔒 관리자 권한 확인
  try {
    verifyAdmin(req);
  } catch (error) {
    const statusCode = error.message === 'UNAUTHORIZED' ? 401 : 403;
    return res.status(statusCode).json({
      success: false,
      error: error.message,
      message: '관리자 권한이 필요합니다.'
    });
  }

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

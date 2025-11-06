/**
 * 관리자 전용 - 특정 차량 삭제 API
 * DELETE: 차량 삭제
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
  const { id } = req.query;

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
    if (method === 'DELETE') {
      // 차량 존재 확인
      const vehicleCheck = await connection.execute(
        'SELECT id, display_name FROM rentcar_vehicles WHERE id = ?',
        [id]
      );

      if (!vehicleCheck.rows || vehicleCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '차량을 찾을 수 없습니다.'
        });
      }

      // 소프트 삭제 (status = 'deleted')
      await connection.execute(
        `UPDATE rentcar_vehicles SET status = 'deleted' WHERE id = ?`,
        [id]
      );

      return res.status(200).json({
        success: true,
        message: '차량이 삭제되었습니다.'
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Admin vehicle delete API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}

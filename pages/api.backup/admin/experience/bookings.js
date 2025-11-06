/**
 * 관리자용 - 체험 예약 관리 API
 * GET /api/admin/experience/bookings - 전체 예약 목록
 * PATCH /api/admin/experience/bookings?id=123 - 예약 상태 변경
 */

const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

function verifyAdmin(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) throw new Error('UNAUTHORIZED');
  const token = authHeader.substring(7);
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'travleap-secret-2025');
  if (decoded.role !== 'admin' && decoded.userType !== 'admin') throw new Error('FORBIDDEN');
  return decoded;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    verifyAdmin(req);
  } catch (error) {
    return res.status(error.message === 'UNAUTHORIZED' ? 401 : 403).json({
      success: false,
      error: '관리자 권한이 필요합니다.'
    });
  }

  if (req.method === 'GET') {
    try {
      const { status, start_date, end_date } = req.query;

      let query = `
        SELECT eb.*, e.name as experience_name
        FROM experience_bookings eb
        LEFT JOIN experiences e ON eb.experience_id = e.id
        WHERE 1=1
      `;

      const params = [];

      if (status) {
        query += ` AND eb.status = ?`;
        params.push(status);
      }

      if (start_date) {
        query += ` AND eb.experience_date >= ?`;
        params.push(start_date);
      }

      if (end_date) {
        query += ` AND eb.experience_date <= ?`;
        params.push(end_date);
      }

      query += ` ORDER BY eb.created_at DESC LIMIT 500`;

      const result = await connection.execute(query, params);

      return res.status(200).json({
        success: true,
        bookings: result.rows || []
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { id } = req.query;
      const { status } = req.body;

      if (!id || !status) {
        return res.status(400).json({ success: false, error: 'id와 status가 필요합니다.' });
      }

      await connection.execute(`
        UPDATE experience_bookings
        SET status = ?, updated_at = NOW()
        WHERE id = ?
      `, [status, id]);

      return res.status(200).json({ success: true, message: '예약 상태가 변경되었습니다.' });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};

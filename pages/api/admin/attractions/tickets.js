/**
 * 관리자용 - 관광지 입장권 관리 API
 * GET /api/admin/attractions/tickets - 전체 입장권 목록
 * PATCH /api/admin/attractions/tickets?id=123 - 입장권 상태 변경
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
      const { status, attraction_id, valid_date, start_date, end_date } = req.query;

      let query = `
        SELECT et.*, a.name as attraction_name, a.location
        FROM entry_tickets et
        LEFT JOIN attractions a ON et.attraction_id = a.id
        WHERE 1=1
      `;

      const params = [];

      if (status) {
        query += ` AND et.status = ?`;
        params.push(status);
      }

      if (attraction_id) {
        query += ` AND et.attraction_id = ?`;
        params.push(attraction_id);
      }

      if (valid_date) {
        query += ` AND et.valid_date = ?`;
        params.push(valid_date);
      }

      if (start_date) {
        query += ` AND et.valid_date >= ?`;
        params.push(start_date);
      }

      if (end_date) {
        query += ` AND et.valid_date <= ?`;
        params.push(end_date);
      }

      query += ` ORDER BY et.created_at DESC LIMIT 500`;

      const result = await connection.execute(query, params);

      return res.status(200).json({
        success: true,
        tickets: result.rows || []
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
        UPDATE entry_tickets
        SET status = ?, updated_at = NOW()
        WHERE id = ?
      `, [status, id]);

      return res.status(200).json({ success: true, message: '입장권 상태가 변경되었습니다.' });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};

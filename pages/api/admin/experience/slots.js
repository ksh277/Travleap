/**
 * 관리자 - 체험 슬롯 관리 API
 * GET /api/admin/experience/slots - 모든 슬롯 조회
 * POST /api/admin/experience/slots - 슬롯 생성 (일괄)
 * PUT /api/admin/experience/slots - 슬롯 수정
 * DELETE /api/admin/experience/slots - 슬롯 삭제
 */

const { connect } = require('@planetscale/database');
const { verifyJWT } = require('../../../../utils/jwt');

async function handler(req, res) {
  // JWT 인증 (관리자만)
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '인증 토큰이 필요합니다.'
    });
  }

  let decoded;
  try {
    decoded = verifyJWT(token);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: '유효하지 않은 토큰입니다.'
    });
  }

  if (decoded.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '관리자 권한이 필요합니다.'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  // GET: 슬롯 조회
  if (req.method === 'GET') {
    try {
      const { experience_id, start_date, end_date, limit = '100', offset = '0' } = req.query;

      let query = `
        SELECT
          es.*,
          e.name as experience_name,
          e.vendor_id,
          u.name as vendor_name
        FROM experience_slots es
        JOIN experiences e ON es.experience_id = e.id
        LEFT JOIN users u ON e.vendor_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (experience_id) {
        query += ` AND es.experience_id = ?`;
        params.push(experience_id);
      }

      if (start_date) {
        query += ` AND es.slot_date >= ?`;
        params.push(start_date);
      }

      if (end_date) {
        query += ` AND es.slot_date <= ?`;
        params.push(end_date);
      }

      query += ` ORDER BY es.slot_date, es.start_time LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await connection.execute(query, params);

      return res.status(200).json({
        success: true,
        data: result.rows || []
      });

    } catch (error) {
      console.error('❌ [Admin Experience Slots GET] Error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST, PUT, DELETE는 벤더 API와 동일하므로 생략 (필요 시 추가)

  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
}

module.exports = handler;

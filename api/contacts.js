/**
 * 문의 관리 API
 * GET /api/contacts - 모든 문의 조회 (contact_submissions 테이블)
 * DELETE /api/contacts?id=123 - 문의 삭제
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // GET - 모든 문의 조회
    if (req.method === 'GET') {
      const { status, category, limit, offset } = req.query;

      let query = `SELECT * FROM contact_submissions WHERE 1=1`;
      const params = [];

      // 상태 필터
      if (status && status !== 'all') {
        query += ` AND status = ?`;
        params.push(status);
      }

      // 카테고리 필터
      if (category && category !== 'all') {
        query += ` AND category = ?`;
        params.push(category);
      }

      query += ` ORDER BY created_at DESC`;

      // 페이지네이션
      if (limit) {
        query += ` LIMIT ?`;
        params.push(parseInt(limit));

        if (offset) {
          query += ` OFFSET ?`;
          params.push(parseInt(offset));
        }
      }

      const result = await connection.execute(query, params);

      // 전체 개수 조회 (페이지네이션용)
      let countQuery = `SELECT COUNT(*) as total FROM contact_submissions WHERE 1=1`;
      const countParams = [];

      if (status && status !== 'all') {
        countQuery += ` AND status = ?`;
        countParams.push(status);
      }

      if (category && category !== 'all') {
        countQuery += ` AND category = ?`;
        countParams.push(category);
      }

      const countResult = await connection.execute(countQuery, countParams);
      const total = countResult.rows[0].total;

      return res.status(200).json({
        success: true,
        data: result.rows || [],
        pagination: {
          total: parseInt(total),
          limit: limit ? parseInt(limit) : null,
          offset: offset ? parseInt(offset) : 0
        }
      });
    }

    // DELETE - 문의 삭제
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: '문의 ID가 필요합니다.'
        });
      }

      const result = await connection.execute(
        `DELETE FROM contact_submissions WHERE id = ?`,
        [id]
      );

      if (result.rowsAffected === 0) {
        return res.status(404).json({
          success: false,
          error: '문의를 찾을 수 없습니다.'
        });
      }

      console.log(`✅ [Contacts] 문의 삭제됨: ${id}`);

      return res.status(200).json({
        success: true,
        message: '문의가 삭제되었습니다.'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ Contacts API error:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error.message
    });
  }
};

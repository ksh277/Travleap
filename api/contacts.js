/**
 * 문의 관리 API
 * GET /api/contacts - 모든 문의 조회
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
      const result = await connection.execute(
        `SELECT * FROM contacts ORDER BY created_at DESC`
      );

      return res.status(200).json({
        success: true,
        data: result.rows || []
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
        `DELETE FROM contacts WHERE id = ?`,
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

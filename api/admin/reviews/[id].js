/**
 * 관리자 리뷰 관리 API
 * DELETE /api/admin/reviews/[id] - 리뷰 삭제
 * PUT /api/admin/reviews/[id] - 리뷰 수정
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, error: 'Review ID is required' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // DELETE - 리뷰 삭제
    if (req.method === 'DELETE') {
      const result = await connection.execute('DELETE FROM reviews WHERE id = ?', [id]);

      if (result.rowsAffected === 0) {
        return res.status(404).json({
          success: false,
          error: '리뷰를 찾을 수 없습니다.'
        });
      }

      return res.status(200).json({
        success: true,
        message: '리뷰가 성공적으로 삭제되었습니다.'
      });
    }

    // PUT - 리뷰 수정
    if (req.method === 'PUT') {
      const { status, response } = req.body;

      const result = await connection.execute(
        `UPDATE reviews SET
          status = COALESCE(?, status),
          admin_response = COALESCE(?, admin_response),
          updated_at = NOW()
        WHERE id = ?`,
        [status, response, id]
      );

      if (result.rowsAffected === 0) {
        return res.status(404).json({
          success: false,
          error: '리뷰를 찾을 수 없습니다.'
        });
      }

      return res.status(200).json({
        success: true,
        message: '리뷰가 성공적으로 수정되었습니다.'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Review API error:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      message: error.message
    });
  }
};

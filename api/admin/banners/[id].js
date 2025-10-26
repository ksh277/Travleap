/**
 * 관리자 배너 관리 API
 * PUT /api/admin/banners/[id] - 배너 정보 수정
 * DELETE /api/admin/banners/[id] - 배너 삭제
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Banner ID is required'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // PUT - 배너 정보 수정
    if (req.method === 'PUT') {
      const {
        image_url,
        title,
        link_url,
        display_order,
        is_active
      } = req.body;

      const result = await connection.execute(
        `UPDATE banners SET
          image_url = COALESCE(?, image_url),
          title = COALESCE(?, title),
          link_url = COALESCE(?, link_url),
          display_order = COALESCE(?, display_order),
          is_active = COALESCE(?, is_active),
          updated_at = NOW()
        WHERE id = ?`,
        [
          image_url,
          title,
          link_url,
          display_order,
          is_active,
          id
        ]
      );

      if (resultAffected === 0) {
        return res.status(404).json({
          success: false,
          message: '배너를 찾을 수 없습니다.'
        });
      }

      return res.status(200).json({
        success: true,
        message: '배너가 성공적으로 수정되었습니다.'
      });
    }

    // DELETE - 배너 삭제
    if (req.method === 'DELETE') {
      const result = await connection.execute(
        'DELETE FROM banners WHERE id = ?',
        [id]
      );

      if (resultAffected === 0) {
        return res.status(404).json({
          success: false,
          message: '배너를 찾을 수 없습니다.'
        });
      }

      return res.status(200).json({
        success: true,
        message: '배너가 성공적으로 삭제되었습니다.'
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('Banner API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};

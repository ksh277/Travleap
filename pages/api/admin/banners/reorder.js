/**
 * 관리자 배너 순서 변경 API
 * POST /api/admin/banners/reorder - 배너 순서 일괄 업데이트
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { banners } = req.body;

    if (!Array.isArray(banners) || banners.length === 0) {
      return res.status(400).json({
        success: false,
        message: '배너 목록이 필요합니다.'
      });
    }

    // 각 배너의 순서를 업데이트
    for (const banner of banners) {
      if (!banner.id || banner.display_order === undefined) {
        return res.status(400).json({
          success: false,
          message: '모든 배너에 id와 display_order가 필요합니다.'
        });
      }

      await connection.execute(
        'UPDATE banners SET display_order = ?, updated_at = NOW() WHERE id = ?',
        [banner.display_order, banner.id]
      );
    }

    return res.status(200).json({
      success: true,
      message: '배너 순서가 성공적으로 변경되었습니다.'
    });

  } catch (error) {
    console.error('Banner reorder API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};

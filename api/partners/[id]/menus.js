/**
 * 파트너 메뉴 목록 조회 API
 * GET /api/partners/:id/menus
 *
 * 리뷰 작성 시 메뉴 선택 버튼에 사용
 */

const { connect } = require('@planetscale/database');
const { withPublicCors } = require('../../../utils/cors-middleware.cjs');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'GET 요청만 허용됩니다'
    });
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });
    const partnerId = req.params?.id || req.query?.id;

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: '파트너 ID가 필요합니다'
      });
    }

    // 파트너 메뉴 목록 조회
    const result = await connection.execute(`
      SELECT
        id,
        name,
        price,
        category,
        is_popular
      FROM partner_menus
      WHERE partner_id = ? AND is_active = TRUE
      ORDER BY is_popular DESC, display_order ASC, name ASC
    `, [partnerId]);

    // 메뉴가 없으면 빈 배열 반환
    const menus = result.rows || [];

    return res.status(200).json({
      success: true,
      data: menus
    });

  } catch (error) {
    console.error('[Partner Menus] Error:', error);
    return res.status(500).json({
      success: false,
      message: '메뉴 목록을 불러오는데 실패했습니다'
    });
  }
}

module.exports = withPublicCors(handler);

/**
 * 팝업 상세 조회 API
 *
 * 기능:
 * - 특정 팝업 스토어 상세 정보 조회
 * - 조회수 자동 증가
 *
 * 라우트: GET /api/popups/[id]
 */

const { connect } = require('@planetscale/database');
const { withPublicCors } = require('../../../utils/cors-middleware');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'popup ID is required'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 팝업 상세 조회
    const popupResult = await connection.execute(
      `SELECT
        p.*,
        u.name as vendor_name,
        u.email as vendor_email
      FROM popups p
      LEFT JOIN users u ON p.vendor_id = u.id
      WHERE p.id = ? AND p.is_active = TRUE
      LIMIT 1`,
      [id]
    );

    if (!popupResult.rows || popupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '팝업을 찾을 수 없습니다.'
      });
    }

    const popup = popupResult.rows[0];

    // JSON 필드 파싱
    const parsedPopup = {
      ...popup,
      gallery_images: popup.gallery_images ? JSON.parse(popup.gallery_images) : [],
      tags: popup.tags ? JSON.parse(popup.tags) : []
    };

    // 조회수 증가 (비동기, 에러 무시)
    connection.execute(
      `UPDATE popups SET view_count = view_count + 1 WHERE id = ?`,
      [id]
    ).catch(err => console.error('조회수 증가 실패:', err));

    return res.status(200).json({
      success: true,
      data: parsedPopup
    });

  } catch (error) {
    console.error('팝업 상세 조회 실패:', error);
    return res.status(500).json({
      success: false,
      message: '팝업 상세 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}

module.exports = withPublicCors(handler);

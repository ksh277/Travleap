/**
 * 팝업 벤더 - 내 팝업 목록 조회 API
 *
 * 기능:
 * - 벤더가 등록한 팝업 목록 조회
 * - JWT 인증 필수
 *
 * 라우트: GET /api/vendor/popup/popups
 */

const { connect } = require('@planetscale/database');
const { verifyJWT } = require('../../../../utils/jwt');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  // JWT 인증
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

  if (decoded.role !== 'vendor') {
    return res.status(403).json({
      success: false,
      message: '벤더 권한이 필요합니다.'
    });
  }

  const vendorId = decoded.userId;
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 벤더의 팝업 목록 조회
    const popupsResult = await connection.execute(
      `SELECT
        id,
        brand_name,
        popup_name,
        description,
        location_name,
        address,
        start_date,
        end_date,
        operating_hours,
        entrance_fee,
        is_free,
        image_url,
        gallery_images,
        requires_reservation,
        max_capacity,
        booking_url,
        status,
        tags,
        view_count,
        like_count,
        is_active,
        created_at,
        updated_at
      FROM popups
      WHERE vendor_id = ?
      ORDER BY created_at DESC`,
      [vendorId]
    );

    const popups = popupsResult.rows || [];

    // JSON 필드 파싱
    const parsedPopups = popups.map(popup => ({
      ...popup,
      gallery_images: popup.gallery_images ? JSON.parse(popup.gallery_images) : [],
      tags: popup.tags ? JSON.parse(popup.tags) : []
    }));

    return res.status(200).json({
      success: true,
      data: parsedPopups
    });

  } catch (error) {
    console.error('내 팝업 목록 조회 실패:', error);
    return res.status(500).json({
      success: false,
      message: '팝업 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}

module.exports = handler;

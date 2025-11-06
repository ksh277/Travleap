/**
 * 팝업 목록 조회 API
 *
 * 기능:
 * - 팝업 스토어 목록 조회 (필터링, 정렬, 페이지네이션)
 * - 상태별 필터 (upcoming, ongoing, ended)
 * - 검색 (brand_name, popup_name)
 * - 정렬 (최신순, 시작일순, 조회수순)
 *
 * 라우트: GET /api/popups
 */

const { connect } = require('@planetscale/database');
const { withPublicCors } = require('../utils/cors-middleware');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const {
      status,
      search,
      sortBy = 'created_at',
      order = 'DESC',
      limit = '20',
      offset = '0'
    } = req.query;

    // 쿼리 빌드
    let whereConditions = ['is_active = TRUE'];
    let queryParams = [];

    // 상태 필터
    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }

    // 검색 필터
    if (search) {
      whereConditions.push('(brand_name LIKE ? OR popup_name LIKE ? OR description LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // 정렬 설정
    const allowedSortColumns = ['created_at', 'start_date', 'view_count', 'like_count'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // 총 개수 조회
    const countResult = await connection.execute(
      `SELECT COUNT(*) as total FROM popups ${whereClause}`,
      queryParams
    );

    const total = countResult.rows && countResult.rows.length > 0
      ? countResult.rows[0].total
      : 0;

    // 팝업 목록 조회
    const popupsResult = await connection.execute(
      `SELECT
        id,
        vendor_id,
        brand_name,
        popup_name,
        description,
        location_name,
        address,
        latitude,
        longitude,
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
        sns_instagram,
        sns_website,
        parking_info,
        nearby_subway,
        view_count,
        like_count,
        created_at,
        updated_at
      FROM popups
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), parseInt(offset)]
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
      data: parsedPopups,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });

  } catch (error) {
    console.error('팝업 목록 조회 실패:', error);
    return res.status(500).json({
      success: false,
      message: '팝업 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}

module.exports = withPublicCors(handler);

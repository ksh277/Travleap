const { connect } = require('@planetscale/database');

/**
 * 투어 패키지 상세 조회 API
 * GET /api/tour/packages/[id]
 *
 * 특정 투어 패키지의 상세 정보와 예약 가능한 일정 조회
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: '패키지 ID가 필요합니다.'
      });
    }

    // 패키지 정보 조회
    const packageResult = await connection.execute(
      `SELECT
        tp.*,
        l.title as listing_title,
        l.category,
        l.location,
        l.rating,
        l.review_count,
        l.images as listing_images
       FROM tour_packages tp
       INNER JOIN listings l ON tp.listing_id = l.id
       WHERE tp.id = ? AND tp.is_active = 1`,
      [id]
    );

    if (!packageResult.rows || packageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '패키지를 찾을 수 없습니다.'
      });
    }

    const packageData = packageResult.rows[0];

    // 향후 30일간 예약 가능한 일정 조회
    const schedulesResult = await connection.execute(
      `SELECT
        id,
        departure_date,
        departure_time,
        guide_name,
        guide_language,
        max_participants,
        current_participants,
        status,
        price_adult_krw,
        price_child_krw
       FROM tour_schedules
       WHERE package_id = ?
         AND departure_date >= CURDATE()
         AND departure_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
         AND status IN ('scheduled', 'confirmed')
         AND current_participants < max_participants
       ORDER BY departure_date ASC, departure_time ASC`,
      [id]
    );

    // JSON 필드 파싱
    const packageInfo = {
      ...packageData,
      itinerary: packageData.itinerary ? JSON.parse(packageData.itinerary) : [],
      included: packageData.included ? JSON.parse(packageData.included) : [],
      excluded: packageData.excluded ? JSON.parse(packageData.excluded) : [],
      images: packageData.images ? JSON.parse(packageData.images) : [],
      tags: packageData.tags ? JSON.parse(packageData.tags) : [],
      listing_images: packageData.listing_images ? JSON.parse(packageData.listing_images) : []
    };

    return res.status(200).json({
      success: true,
      data: {
        package: packageInfo,
        availableSchedules: schedulesResult.rows || []
      }
    });

  } catch (error) {
    console.error('❌ [Tour Package Detail API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * 투어/숙박 벤더 - 내 패키지 목록 조회
 * GET /api/vendor/tour/packages
 */

const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });
  }

  try {
    // JWT 검증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    } catch (error) {
      return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
    }

    if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: '벤더 권한이 필요합니다.' });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // 벤더의 패키지 목록 조회
    // listings 테이블에서 category='tour' 또는 'stay'이고 partner_id가 해당 벤더인 것들
    const partnerId = decoded.partnerId || decoded.userId;

    const result = await connection.execute(
      `SELECT
        id,
        title as package_name,
        category,
        images,
        price_from as price_adult_krw,
        duration,
        is_active,
        is_published,
        booking_count as total_bookings,
        rating_avg,
        rating_count,
        view_count,
        created_at,
        updated_at
      FROM listings
      WHERE partner_id = ?
        AND (category = 'tour' OR category = 'stay')
      ORDER BY created_at DESC`,
      [partnerId]
    );

    const packages = (result.rows || []).map(row => {
      // duration에서 일/박 추출 (예: "2박3일" -> 2일, 3박)
      let duration_days = 1;
      let duration_nights = 0;

      if (row.duration) {
        const daysMatch = row.duration.match(/(\d+)일/);
        const nightsMatch = row.duration.match(/(\d+)박/);

        if (daysMatch) duration_days = parseInt(daysMatch[1]);
        if (nightsMatch) duration_nights = parseInt(nightsMatch[1]);
      }

      // 이미지 JSON 파싱
      let thumbnail_url = '';
      if (row.images) {
        try {
          const images = typeof row.images === 'string' ? JSON.parse(row.images) : row.images;
          if (Array.isArray(images) && images.length > 0) {
            thumbnail_url = images[0];
          }
        } catch (e) {
          // 파싱 실패 시 무시
        }
      }

      return {
        id: row.id,
        package_name: row.package_name,
        category: row.category,
        thumbnail_url,
        duration_days,
        duration_nights,
        price_adult_krw: row.price_adult_krw || 0,
        is_active: row.is_active === 1,
        is_published: row.is_published === 1,
        total_bookings: row.total_bookings || 0,
        rating_avg: row.rating_avg || 0,
        rating_count: row.rating_count || 0,
        view_count: row.view_count || 0,
        schedule_count: 0, // TODO: 일정 수는 별도 쿼리 필요
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });

    return res.status(200).json({
      success: true,
      packages,
      total: packages.length
    });

  } catch (error) {
    console.error('❌ [Tour Packages API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};

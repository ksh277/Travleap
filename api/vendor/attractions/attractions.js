/**
 * 관광지 벤더 - 내 관광지 목록 조회
 * GET /api/vendor/attractions/attractions
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

    const partnerId = decoded.partnerId || decoded.userId;

    // 관광지 카테고리 리스팅 조회
    const result = await connection.execute(
      `SELECT
        id,
        title,
        category,
        short_description,
        images,
        price_from,
        adult_price,
        is_active,
        is_published,
        booking_count,
        rating_avg,
        rating_count,
        view_count,
        location,
        address,
        lat,
        lng,
        created_at,
        updated_at
      FROM listings
      WHERE partner_id = ?
        AND category = 'attractions'
      ORDER BY created_at DESC`,
      [partnerId]
    );

    const attractions = (result.rows || []).map(row => {
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
        name: row.title,
        description: row.short_description || '',
        thumbnail_url,
        price_from: row.price_from || row.adult_price || 0,
        location: row.location || '',
        address: row.address || '',
        lat: row.lat || null,
        lng: row.lng || null,
        is_active: row.is_active === 1,
        is_published: row.is_published === 1,
        total_bookings: row.booking_count || 0,
        rating_avg: row.rating_avg || 0,
        rating_count: row.rating_count || 0,
        view_count: row.view_count || 0,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });

    return res.status(200).json({
      success: true,
      attractions,
      total: attractions.length
    });

  } catch (error) {
    console.error('❌ [Attractions API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};

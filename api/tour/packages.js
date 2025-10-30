const { connect } = require('@planetscale/database');

/**
 * 투어 패키지 목록 조회 API
 * GET /api/tour/packages
 *
 * Query Parameters:
 * - category: 카테고리 필터
 * - difficulty: 난이도 필터 (easy/moderate/hard)
 * - minPrice: 최소 가격
 * - maxPrice: 최대 가격
 * - limit: 페이지당 아이템 수 (기본 20)
 * - offset: 오프셋
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
    const {
      category,
      difficulty,
      minPrice,
      maxPrice,
      limit = 20,
      offset = 0
    } = req.query;

    // 동적 쿼리 조건 생성
    const conditions = ['tp.is_active = 1'];
    const params = [];

    if (difficulty) {
      conditions.push('tp.difficulty = ?');
      params.push(difficulty);
    }

    if (minPrice) {
      conditions.push('tp.price_adult_krw >= ?');
      params.push(parseInt(minPrice));
    }

    if (maxPrice) {
      conditions.push('tp.price_adult_krw <= ?');
      params.push(parseInt(maxPrice));
    }

    // 카테고리 필터 (listings 테이블 조인)
    if (category) {
      conditions.push('l.category = ?');
      params.push(category);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 전체 개수 조회
    const countResult = await connection.execute(
      `SELECT COUNT(*) as total
       FROM tour_packages tp
       INNER JOIN listings l ON tp.listing_id = l.id
       ${whereClause}`,
      params
    );

    const totalCount = countResult.rows[0]?.total || 0;

    // 패키지 목록 조회
    const result = await connection.execute(
      `SELECT
        tp.*,
        l.title as listing_title,
        l.category,
        l.location,
        l.rating,
        l.review_count
       FROM tour_packages tp
       INNER JOIN listings l ON tp.listing_id = l.id
       ${whereClause}
       ORDER BY tp.display_order DESC, tp.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // JSON 필드 파싱
    const packages = result.rows.map(pkg => ({
      ...pkg,
      itinerary: pkg.itinerary ? JSON.parse(pkg.itinerary) : [],
      included: pkg.included ? JSON.parse(pkg.included) : [],
      excluded: pkg.excluded ? JSON.parse(pkg.excluded) : [],
      images: pkg.images ? JSON.parse(pkg.images) : [],
      tags: pkg.tags ? JSON.parse(pkg.tags) : []
    }));

    return res.status(200).json({
      success: true,
      data: packages,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + packages.length < totalCount
      }
    });

  } catch (error) {
    console.error('❌ [Tour Packages API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

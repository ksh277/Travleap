module.exports = async function handler(req, res) {
  const { connect } = require('@planetscale/database');

  // PlanetScale connection using DATABASE_URL
  const getDbConnection = () => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    return connect({ url });
  };
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 필터 파라미터
    const category = req.query.category;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const sortBy = req.query.sortBy || 'popular';
    const search = req.query.search;
    const minPrice = req.query.minPrice ? parseInt(req.query.minPrice) ;
    const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice) ;
    const rating = req.query.rating ? parseFloat(req.query.rating) ;

    const offset = (page - 1) * limit;

    // 기본 쿼리
    let sql = `
      SELECT l.*, c.slug, c.name_ko
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE l.is_published = 1 AND l.is_active = 1
    `;
    const params = [];

    // 카테고리 필터
    if (category && category !== 'all') {
      sql += ' AND c.slug = ?';
      params.push(category);
    }

    // 가격 필터
    if (minPrice !== undefined) {
      sql += ' AND l.price_from >= ?';
      params.push(minPrice);
    }
    if (maxPrice !== undefined) {
      sql += ' AND l.price_from <= ?';
      params.push(maxPrice);
    }

    // 평점 필터
    if (rating !== undefined) {
      sql += ' AND l.rating_avg >= ?';
      params.push(rating);
    }

    // 검색 필터
    if (search) {
      sql += ' AND (l.title LIKE ? OR l.description_md LIKE ? OR l.location LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // 정렬
    switch (sortBy) {
      case 'price_low':
        sql += ' ORDER BY l.price_from ASC';
        break;
      case 'price_high':
        sql += ' ORDER BY l.price_from DESC';
        break;
      case 'rating':
        sql += ' ORDER BY l.rating_avg DESC, l.rating_count DESC';
        break;
      case 'newest':
        sql += ' ORDER BY l.created_at DESC';
        break;
      case 'popular':
      default:
        sql += ' ORDER BY l.view_count DESC, l.booking_count DESC, l.rating_avg DESC';
        break;
    }

    const conn = getDbConnection();

    // 1. 전체 개수 조회 (pagination용)
    const countSql = sql.replace(
      /SELECT l\.\*, c\.slug, c\.name_ko/,
      'SELECT COUNT(*)'
    );
    const countResult = await conn.execute(countSql, params);
    const totalCount = countResult.rows?.[0]?.total || 0;

    // 2. 실제 데이터 조회 (pagination 적용)
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await conn.execute(sql, params);
    const listings = result.rows || [];

    // 이미지 JSON 파싱 (안전하게)
    const parseJsonField = (field: any) => {
      if (!field) return [];
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return [];
        }
      }
      return field;
    };

    const parsedListings = listings.map((listing: any) => ({
      ...listing,
      images: parseJsonField(listing.images),
      amenities: parseJsonField(listing.amenities),
      highlights: parseJsonField(listing.highlights),
      included: parseJsonField(listing.included),
      excluded: parseJsonField(listing.excluded),
      tags: parseJsonField(listing.tags)
    }));

    res.status(200).json({
      success: true,
      data: parsedListings,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('API /listings error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch listings',
      errorMessage: error.message || 'Unknown error',
      data: []
    });
  }
}

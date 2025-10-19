const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { category, page = '1', limit = '100', sortBy = 'popular', search, minPrice, maxPrice, rating } = req.query;

    const connection = connect({ url: process.env.DATABASE_URL });

    let sql = `
      SELECT
        l.*,
        c.name as category_name,
        c.slug as category_slug,
        p.business_name as partner_name,
        p.is_verified as partner_is_verified,
        p.tier as partner_tier
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      LEFT JOIN partners p ON l.partner_id = p.id
      WHERE l.is_published = 1 AND l.is_active = 1
    `;
    const params = [];

    // 카테고리 필터
    if (category && category !== 'all') {
      sql += ` AND c.slug = ?`;
      params.push(category);
    }

    // 검색어 필터
    if (search) {
      sql += ` AND (l.title LIKE ? OR l.short_description LIKE ? OR l.description_md LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    // 가격 필터
    if (minPrice) {
      sql += ` AND l.price_from >= ?`;
      params.push(parseInt(minPrice));
    }
    if (maxPrice) {
      sql += ` AND l.price_from <= ?`;
      params.push(parseInt(maxPrice));
    }

    // 평점 필터
    if (rating) {
      sql += ` AND l.rating_avg >= ?`;
      params.push(parseFloat(rating));
    }

    // 정렬
    if (sortBy === 'popular' || sortBy === 'recommended') {
      sql += ` ORDER BY l.is_featured DESC, l.rating_avg DESC, l.rating_count DESC`;
    } else if (sortBy === 'latest') {
      sql += ` ORDER BY l.created_at DESC`;
    } else if (sortBy === 'price_low') {
      sql += ` ORDER BY l.price_from ASC`;
    } else if (sortBy === 'price_high') {
      sql += ` ORDER BY l.price_from DESC`;
    } else {
      sql += ` ORDER BY l.created_at DESC`;
    }

    // 페이지네이션
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    sql += ` LIMIT ${limitNum} OFFSET ${offset}`;

    const result = await connection.execute(sql, params);

    return res.status(200).json({
      success: true,
      data: result.rows || [],
      total: result.rows ? result.rows.length : 0,
      page: pageNum,
      limit: limitNum
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

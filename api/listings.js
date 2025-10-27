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
    const { category, page = '1', limit = '8', sortBy = 'popular', search, minPrice, maxPrice, rating } = req.query;

    const connection = connect({
      host: process.env.DATABASE_HOST,
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD
    });

    let sql = `
      SELECT
        l.*,
        c.name_ko as category_name,
        c.slug as category_slug,
        p.business_name as partner_name,
        p.status as partner_status
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
      sql += ` ORDER BY l.is_featured DESC, COALESCE(l.rating_avg, 0) DESC, COALESCE(l.rating_count, 0) DESC`;
    } else if (sortBy === 'latest') {
      sql += ` ORDER BY l.created_at DESC`;
    } else if (sortBy === 'price_low') {
      sql += ` ORDER BY COALESCE(l.price_from, 0) ASC`;
    } else if (sortBy === 'price_high') {
      sql += ` ORDER BY COALESCE(l.price_from, 999999999) DESC`;
    } else {
      sql += ` ORDER BY l.created_at DESC`;
    }

    // 페이지네이션
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    sql += ` LIMIT ${limitNum} OFFSET ${offset}`;

    const result = await connection.execute(sql, params);

    const listings = result.rows || [];
    return res.status(200).json({
      success: true,
      data: listings,
      total: listings.length,
      page: pageNum,
      limit: limitNum
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    // 에러 시 빈 배열 반환
    return res.status(200).json({
      success: true,
      data: [],
      total: 0,
      page: 1,
      limit: 8
    });
  }
};

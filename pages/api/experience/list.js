/**
 * 체험 검색/목록/상세 API
 * GET /api/experience/list - 체험 목록 조회
 * GET /api/experience/list?id=123 - 체험 상세 조회
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
      id,
      keyword,
      city,
      experience_type,
      category,
      difficulty_level,
      language,
      min_price,
      max_price,
      sort_by = 'popular',
      limit = '20',
      offset = '0'
    } = req.query;

    // 상세 조회
    if (id) {
      const detailQuery = `
        SELECT
          e.*,
          l.location,
          l.rating_avg,
          l.rating_count,
          p.business_name as vendor_name,
          p.business_contact,
          COUNT(DISTINCT eb.id) as total_bookings
        FROM experiences e
        LEFT JOIN listings l ON e.listing_id = l.id
        LEFT JOIN partners p ON e.vendor_id = p.id
        LEFT JOIN experience_bookings eb ON e.id = eb.experience_id
        WHERE e.id = ? AND e.is_active = 1
        GROUP BY e.id
      `;

      const result = await connection.execute(detailQuery, [id]);

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '체험을 찾을 수 없습니다.'
        });
      }

      const experience = result.rows[0];

      // Parse JSON fields
      const experienceData = {
        ...experience,
        images: experience.images ? JSON.parse(experience.images) : [],
        time_slots: experience.time_slots ? JSON.parse(experience.time_slots) : [],
        included_items: experience.included_items ? JSON.parse(experience.included_items) : [],
        excluded_items: experience.excluded_items ? JSON.parse(experience.excluded_items) : [],
        requirements: experience.requirements ? JSON.parse(experience.requirements) : []
      };

      return res.status(200).json({
        success: true,
        experience: experienceData
      });
    }

    // 목록 조회
    let query = `
      SELECT
        e.id,
        e.experience_code,
        e.name,
        e.description,
        e.experience_type,
        e.category,
        e.location,
        e.duration_minutes,
        e.min_participants,
        e.max_participants,
        e.price_per_person_krw,
        e.child_price_krw,
        e.language,
        e.difficulty_level,
        e.age_restriction,
        e.thumbnail_url,
        e.images,
        l.location as city,
        l.rating_avg,
        l.rating_count,
        COUNT(DISTINCT eb.id) as total_bookings
      FROM experiences e
      LEFT JOIN listings l ON e.listing_id = l.id
      LEFT JOIN experience_bookings eb ON e.id = eb.experience_id
      WHERE e.is_active = 1
    `;

    const params = [];

    // Filters
    if (keyword) {
      query += ` AND (e.name LIKE ? OR e.description LIKE ? OR e.location LIKE ?)`;
      const keywordPattern = `%${keyword}%`;
      params.push(keywordPattern, keywordPattern, keywordPattern);
    }

    if (city) {
      query += ` AND l.location LIKE ?`;
      params.push(`%${city}%`);
    }

    if (experience_type) {
      query += ` AND e.experience_type = ?`;
      params.push(experience_type);
    }

    if (category) {
      query += ` AND e.category = ?`;
      params.push(category);
    }

    if (difficulty_level) {
      query += ` AND e.difficulty_level = ?`;
      params.push(difficulty_level);
    }

    if (language) {
      query += ` AND e.language LIKE ?`;
      params.push(`%${language}%`);
    }

    if (min_price) {
      query += ` AND e.price_per_person_krw >= ?`;
      params.push(parseInt(min_price));
    }

    if (max_price) {
      query += ` AND e.price_per_person_krw <= ?`;
      params.push(parseInt(max_price));
    }

    query += ` GROUP BY e.id`;

    // Sorting
    switch (sort_by) {
      case 'popular':
        query += ` ORDER BY total_bookings DESC, l.rating_avg DESC`;
        break;
      case 'rating':
        query += ` ORDER BY l.rating_avg DESC, total_bookings DESC`;
        break;
      case 'price_low':
        query += ` ORDER BY e.price_per_person_krw ASC`;
        break;
      case 'price_high':
        query += ` ORDER BY e.price_per_person_krw DESC`;
        break;
      case 'newest':
        query += ` ORDER BY e.created_at DESC`;
        break;
      default:
        query += ` ORDER BY total_bookings DESC, l.rating_avg DESC`;
    }

    // Count total
    const countQuery = query.replace(/SELECT.*?FROM/s, 'SELECT COUNT(DISTINCT e.id) as total FROM');
    const countResult = await connection.execute(
      countQuery.split('GROUP BY')[0],
      params
    );
    const total = countResult.rows?.[0]?.total || 0;

    // Pagination
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await connection.execute(query, params);

    const experiences = (result.rows || []).map(exp => ({
      ...exp,
      images: exp.images ? JSON.parse(exp.images) : []
    }));

    return res.status(200).json({
      success: true,
      experiences,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + experiences.length < total
      }
    });

  } catch (error) {
    console.error('❌ [Experiences List] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

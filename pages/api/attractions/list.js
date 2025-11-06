/**
 * 사용자용 - 관광지 목록/상세 API
 * GET /api/attractions/list - 관광지 목록 (검색, 필터링)
 * GET /api/attractions/list?id=123 - 특정 관광지 상세 조회
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  if (req.method === 'GET') {
    try {
      const {
        id,
        keyword,
        city,
        type,
        category,
        wheelchair_accessible,
        parking_available,
        sort_by = 'popular',
        limit = 20,
        offset = 0
      } = req.query;

      // 특정 관광지 상세 조회
      if (id) {
        const query = `
          SELECT
            a.*,
            l.id as listing_id,
            l.title as listing_title,
            l.location,
            l.rating_avg,
            l.rating_count,
            l.is_active,
            p.id as vendor_id,
            p.business_name as vendor_name,
            COUNT(DISTINCT et.id) as total_tickets_sold
          FROM attractions a
          LEFT JOIN listings l ON a.listing_id = l.id
          LEFT JOIN partners p ON a.vendor_id = p.id
          LEFT JOIN entry_tickets et ON a.id = et.attraction_id AND et.status IN ('used', 'active')
          WHERE a.id = ? AND a.is_active = 1 AND l.is_active = 1
          GROUP BY a.id
        `;

        const result = await connection.execute(query, [id]);

        if (!result.rows || result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: '관광지를 찾을 수 없습니다.'
          });
        }

        const attraction = result.rows[0];

        return res.status(200).json({
          success: true,
          attraction: {
            ...attraction,
            images: attraction.images ? JSON.parse(attraction.images) : [],
            operating_hours: attraction.operating_hours ? JSON.parse(attraction.operating_hours) : {},
            free_entry_days: attraction.free_entry_days ? JSON.parse(attraction.free_entry_days) : [],
            highlights: attraction.highlights ? JSON.parse(attraction.highlights) : []
          }
        });
      }

      // 목록 조회
      let query = `
        SELECT
          a.id,
          a.attraction_code,
          a.name,
          a.description,
          a.type,
          a.category,
          a.address,
          a.phone,
          a.operating_hours,
          a.admission_fee_adult,
          a.admission_fee_child,
          a.parking_available,
          a.wheelchair_accessible,
          a.thumbnail_url,
          a.images,
          a.estimated_visit_duration_minutes,
          l.location as city,
          l.rating_avg,
          l.rating_count,
          COUNT(DISTINCT et.id) as total_tickets_sold
        FROM attractions a
        LEFT JOIN listings l ON a.listing_id = l.id
        LEFT JOIN entry_tickets et ON a.id = et.attraction_id AND et.status IN ('used', 'active')
        WHERE a.is_active = 1 AND l.is_active = 1
      `;

      const params = [];

      if (keyword) {
        query += ` AND (a.name LIKE ? OR a.description LIKE ? OR a.type LIKE ?)`;
        const searchTerm = `%${keyword}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (city) {
        query += ` AND l.location LIKE ?`;
        params.push(`%${city}%`);
      }

      if (type) {
        query += ` AND a.type = ?`;
        params.push(type);
      }

      if (category) {
        query += ` AND a.category = ?`;
        params.push(category);
      }

      if (wheelchair_accessible !== undefined) {
        query += ` AND a.wheelchair_accessible = ?`;
        params.push(wheelchair_accessible === 'true' ? 1 : 0);
      }

      if (parking_available !== undefined) {
        query += ` AND a.parking_available = ?`;
        params.push(parking_available === 'true' ? 1 : 0);
      }

      query += ` GROUP BY a.id`;

      switch (sort_by) {
        case 'rating':
          query += ` ORDER BY l.rating_avg DESC, l.rating_count DESC`;
          break;
        case 'price_low':
          query += ` ORDER BY a.admission_fee_adult ASC`;
          break;
        case 'newest':
          query += ` ORDER BY a.created_at DESC`;
          break;
        case 'popular':
        default:
          query += ` ORDER BY total_tickets_sold DESC, l.rating_avg DESC`;
          break;
      }

      query += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await connection.execute(query, params);

      const attractions = (result.rows || []).map(attraction => ({
        ...attraction,
        images: attraction.images ? JSON.parse(attraction.images) : [],
        operating_hours: attraction.operating_hours ? JSON.parse(attraction.operating_hours) : {}
      }));

      // 전체 개수 조회
      let countQuery = `SELECT COUNT(DISTINCT a.id) as total FROM attractions a LEFT JOIN listings l ON a.listing_id = l.id WHERE a.is_active = 1 AND l.is_active = 1`;
      const countParams = [];

      if (keyword) {
        countQuery += ` AND (a.name LIKE ? OR a.description LIKE ? OR a.type LIKE ?)`;
        const searchTerm = `%${keyword}%`;
        countParams.push(searchTerm, searchTerm, searchTerm);
      }
      if (city) {
        countQuery += ` AND l.location LIKE ?`;
        countParams.push(`%${city}%`);
      }
      if (type) {
        countQuery += ` AND a.type = ?`;
        countParams.push(type);
      }
      if (category) {
        countQuery += ` AND a.category = ?`;
        countParams.push(category);
      }
      if (wheelchair_accessible !== undefined) {
        countQuery += ` AND a.wheelchair_accessible = ?`;
        countParams.push(wheelchair_accessible === 'true' ? 1 : 0);
      }
      if (parking_available !== undefined) {
        countQuery += ` AND a.parking_available = ?`;
        countParams.push(parking_available === 'true' ? 1 : 0);
      }

      const countResult = await connection.execute(countQuery, countParams);
      const total = countResult.rows[0]?.total || 0;

      return res.status(200).json({
        success: true,
        data: attractions,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: parseInt(offset) + attractions.length < total
        }
      });

    } catch (error) {
      console.error('❌ [Attractions List API] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
};

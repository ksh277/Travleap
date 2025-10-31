/**
 * 이벤트 검색/목록/상세 API
 * GET /api/events/list - 이벤트 목록 조회
 * GET /api/events/list?id=123 - 이벤트 상세 조회
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
      event_type,
      category,
      from_date,
      to_date,
      upcoming,
      wheelchair_accessible,
      parking_available,
      sort_by = 'start_date',
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
          COUNT(DISTINCT et.id) as total_tickets_sold
        FROM events e
        LEFT JOIN listings l ON e.listing_id = l.id
        LEFT JOIN partners p ON e.vendor_id = p.id
        LEFT JOIN event_tickets et ON e.id = et.event_id
        WHERE e.id = ? AND e.is_active = 1
        GROUP BY e.id
      `;

      const result = await connection.execute(detailQuery, [id]);

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '이벤트를 찾을 수 없습니다.'
        });
      }

      const event = result.rows[0];

      // Parse JSON fields
      const eventData = {
        ...event,
        images: event.images ? JSON.parse(event.images) : [],
        ticket_types: event.ticket_types ? JSON.parse(event.ticket_types) : [],
        facilities: event.facilities ? JSON.parse(event.facilities) : []
      };

      return res.status(200).json({
        success: true,
        event: eventData
      });
    }

    // 목록 조회
    let query = `
      SELECT
        e.id,
        e.event_code,
        e.name,
        e.description,
        e.event_type,
        e.category,
        e.venue,
        e.venue_address,
        e.start_datetime,
        e.end_datetime,
        e.ticket_types,
        e.total_capacity,
        e.age_restriction,
        e.parking_available,
        e.wheelchair_accessible,
        e.thumbnail_url,
        e.images,
        l.location,
        l.rating_avg,
        l.rating_count,
        COUNT(DISTINCT et.id) as total_tickets_sold
      FROM events e
      LEFT JOIN listings l ON e.listing_id = l.id
      LEFT JOIN event_tickets et ON e.id = et.event_id
      WHERE e.is_active = 1
    `;

    const params = [];

    // Filters
    if (keyword) {
      query += ` AND (e.name LIKE ? OR e.description LIKE ? OR e.venue LIKE ?)`;
      const keywordPattern = `%${keyword}%`;
      params.push(keywordPattern, keywordPattern, keywordPattern);
    }

    if (city) {
      query += ` AND l.location LIKE ?`;
      params.push(`%${city}%`);
    }

    if (event_type) {
      query += ` AND e.event_type = ?`;
      params.push(event_type);
    }

    if (category) {
      query += ` AND e.category = ?`;
      params.push(category);
    }

    if (from_date) {
      query += ` AND DATE(e.start_datetime) >= ?`;
      params.push(from_date);
    }

    if (to_date) {
      query += ` AND DATE(e.start_datetime) <= ?`;
      params.push(to_date);
    }

    if (upcoming === 'true') {
      query += ` AND e.start_datetime >= NOW()`;
    }

    if (wheelchair_accessible === 'true') {
      query += ` AND e.wheelchair_accessible = 1`;
    }

    if (parking_available === 'true') {
      query += ` AND e.parking_available = 1`;
    }

    query += ` GROUP BY e.id`;

    // Sorting
    switch (sort_by) {
      case 'start_date':
        query += ` ORDER BY e.start_datetime ASC`;
        break;
      case 'popular':
        query += ` ORDER BY total_tickets_sold DESC, e.start_datetime ASC`;
        break;
      case 'rating':
        query += ` ORDER BY l.rating_avg DESC, e.start_datetime ASC`;
        break;
      case 'newest':
        query += ` ORDER BY e.created_at DESC`;
        break;
      default:
        query += ` ORDER BY e.start_datetime ASC`;
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

    const events = (result.rows || []).map(event => ({
      ...event,
      images: event.images ? JSON.parse(event.images) : [],
      ticket_types: event.ticket_types ? JSON.parse(event.ticket_types) : []
    }));

    return res.status(200).json({
      success: true,
      events,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + events.length < total
      }
    });

  } catch (error) {
    console.error('❌ [Events List] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

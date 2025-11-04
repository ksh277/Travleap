/**
 * 사용자용 - 식당 검색/목록 API
 * GET /api/food/restaurants - 식당 목록 (검색, 필터링)
 * GET /api/food/restaurants?id=123 - 특정 식당 상세 조회
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
        cuisine_type,
        accepts_reservations,
        accepts_takeout,
        accepts_delivery,
        parking_available,
        sort_by = 'popular', // popular, rating, newest
        limit = 20,
        offset = 0
      } = req.query;

      // 특정 식당 상세 조회
      if (id) {
        const query = `
          SELECT
            r.*,
            l.id as listing_id,
            l.title as listing_title,
            l.location,
            l.rating_avg,
            l.rating_count,
            l.is_active,
            p.id as vendor_id,
            p.business_name as vendor_name,
            p.logo as vendor_logo,
            COUNT(DISTINCT fo.id) as total_orders
          FROM restaurants r
          LEFT JOIN listings l ON r.listing_id = l.id
          LEFT JOIN partners p ON r.vendor_id = p.id
          LEFT JOIN food_orders fo ON r.id = fo.restaurant_id
            AND fo.status IN ('completed')
          WHERE r.id = ? AND r.is_active = 1 AND l.is_active = 1
          GROUP BY r.id
        `;

        const result = await connection.execute(query, [id]);

        if (!result.rows || result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: '식당을 찾을 수 없습니다.'
          });
        }

        const restaurant = result.rows[0];

        // JSON 필드 파싱
        const formattedRestaurant = {
          ...restaurant,
          images: restaurant.images ? (typeof restaurant.images === 'string' ? JSON.parse(restaurant.images) : restaurant.images) : [],
          menu_images: restaurant.menu_images ? (typeof restaurant.menu_images === 'string' ? JSON.parse(restaurant.menu_images) : restaurant.menu_images) : [],
          food_categories: restaurant.food_categories ? (typeof restaurant.food_categories === 'string' ? JSON.parse(restaurant.food_categories) : restaurant.food_categories) : [],
          operating_hours: restaurant.operating_hours ? (typeof restaurant.operating_hours === 'string' ? JSON.parse(restaurant.operating_hours) : restaurant.operating_hours) : {},
          break_time: restaurant.break_time ? (typeof restaurant.break_time === 'string' ? JSON.parse(restaurant.break_time) : restaurant.break_time) : null
        };

        return res.status(200).json({
          success: true,
          restaurant: formattedRestaurant
        });
      }

      // 목록 조회
      let query = `
        SELECT
          r.id,
          r.restaurant_code,
          r.name,
          r.description,
          r.cuisine_type,
          r.food_categories,
          r.address,
          r.phone,
          r.operating_hours,
          r.table_count,
          r.seat_count,
          r.parking_available,
          r.accepts_reservations,
          r.accepts_takeout,
          r.accepts_delivery,
          r.table_order_enabled,
          r.thumbnail_url,
          r.images,
          l.location as city,
          l.rating_avg,
          l.rating_count,
          p.business_name as vendor_name,
          COUNT(DISTINCT fo.id) as total_orders
        FROM restaurants r
        LEFT JOIN listings l ON r.listing_id = l.id
        LEFT JOIN partners p ON r.vendor_id = p.id
        LEFT JOIN food_orders fo ON r.id = fo.restaurant_id
          AND fo.status IN ('completed')
        WHERE r.is_active = 1 AND l.is_active = 1
      `;

      const params = [];

      // 키워드 검색
      if (keyword) {
        query += ` AND (r.name LIKE ? OR r.description LIKE ? OR r.cuisine_type LIKE ?)`;
        const searchTerm = `%${keyword}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // 도시 필터
      if (city) {
        query += ` AND l.location LIKE ?`;
        params.push(`%${city}%`);
      }

      // 음식 종류 필터
      if (cuisine_type) {
        query += ` AND r.cuisine_type = ?`;
        params.push(cuisine_type);
      }

      // 예약 가능 필터
      if (accepts_reservations !== undefined) {
        query += ` AND r.accepts_reservations = ?`;
        params.push(accepts_reservations === 'true' ? 1 : 0);
      }

      // 포장 가능 필터
      if (accepts_takeout !== undefined) {
        query += ` AND r.accepts_takeout = ?`;
        params.push(accepts_takeout === 'true' ? 1 : 0);
      }

      // 배달 가능 필터
      if (accepts_delivery !== undefined) {
        query += ` AND r.accepts_delivery = ?`;
        params.push(accepts_delivery === 'true' ? 1 : 0);
      }

      // 주차 가능 필터
      if (parking_available !== undefined) {
        query += ` AND r.parking_available = ?`;
        params.push(parking_available === 'true' ? 1 : 0);
      }

      query += ` GROUP BY r.id`;

      // 정렬
      switch (sort_by) {
        case 'rating':
          query += ` ORDER BY l.rating_avg DESC, l.rating_count DESC`;
          break;
        case 'newest':
          query += ` ORDER BY r.created_at DESC`;
          break;
        case 'popular':
        default:
          query += ` ORDER BY total_orders DESC, l.rating_avg DESC`;
          break;
      }

      query += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await connection.execute(query, params);

      // JSON 필드 파싱
      const restaurants = (result.rows || []).map(restaurant => {
        let images = [];
        let food_categories = [];
        let operating_hours = {};

        try {
          if (restaurant.images) {
            images = typeof restaurant.images === 'string' ? JSON.parse(restaurant.images) : restaurant.images;
          }
        } catch (e) {
          console.warn('Images parsing failed:', restaurant.id);
        }

        try {
          if (restaurant.food_categories) {
            food_categories = typeof restaurant.food_categories === 'string' ? JSON.parse(restaurant.food_categories) : restaurant.food_categories;
          }
        } catch (e) {
          console.warn('Food categories parsing failed:', restaurant.id);
        }

        try {
          if (restaurant.operating_hours) {
            operating_hours = typeof restaurant.operating_hours === 'string' ? JSON.parse(restaurant.operating_hours) : restaurant.operating_hours;
          }
        } catch (e) {
          console.warn('Operating hours parsing failed:', restaurant.id);
        }

        return {
          ...restaurant,
          images,
          food_categories,
          operating_hours
        };
      });

      // 전체 개수 조회
      let countQuery = `
        SELECT COUNT(DISTINCT r.id) as total
        FROM restaurants r
        LEFT JOIN listings l ON r.listing_id = l.id
        WHERE r.is_active = 1 AND l.is_active = 1
      `;

      const countParams = [];

      if (keyword) {
        countQuery += ` AND (r.name LIKE ? OR r.description LIKE ? OR r.cuisine_type LIKE ?)`;
        const searchTerm = `%${keyword}%`;
        countParams.push(searchTerm, searchTerm, searchTerm);
      }

      if (city) {
        countQuery += ` AND l.location LIKE ?`;
        countParams.push(`%${city}%`);
      }

      if (cuisine_type) {
        countQuery += ` AND r.cuisine_type = ?`;
        countParams.push(cuisine_type);
      }

      if (accepts_reservations !== undefined) {
        countQuery += ` AND r.accepts_reservations = ?`;
        countParams.push(accepts_reservations === 'true' ? 1 : 0);
      }

      if (accepts_takeout !== undefined) {
        countQuery += ` AND r.accepts_takeout = ?`;
        countParams.push(accepts_takeout === 'true' ? 1 : 0);
      }

      if (accepts_delivery !== undefined) {
        countQuery += ` AND r.accepts_delivery = ?`;
        countParams.push(accepts_delivery === 'true' ? 1 : 0);
      }

      if (parking_available !== undefined) {
        countQuery += ` AND r.parking_available = ?`;
        countParams.push(parking_available === 'true' ? 1 : 0);
      }

      const countResult = await connection.execute(countQuery, countParams);
      const total = countResult.rows[0]?.total || 0;

      return res.status(200).json({
        success: true,
        data: restaurants,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: parseInt(offset) + restaurants.length < total
        }
      });

    } catch (error) {
      console.error('❌ [Food Restaurants API] Error:', error);
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

/**
 * 벤더 - 식당 관리 API
 * GET /api/vendor/food/restaurants - 내 식당 목록 조회
 * POST /api/vendor/food/restaurants - 새 식당 등록
 * PUT /api/vendor/food/restaurants - 식당 정보 수정
 */

const { connect } = require('@planetscale/database');

function generateRestaurantCode() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `REST-${timestamp}-${random}`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  const { vendor_id } = req.query;

  if (!vendor_id) {
    return res.status(401).json({
      success: false,
      error: '벤더 인증이 필요합니다.'
    });
  }

  // GET: 내 식당 목록 조회
  if (req.method === 'GET') {
    try {
      const { restaurant_id, is_active } = req.query;

      let query = `
        SELECT
          r.*,
          l.title as listing_title,
          l.location,
          l.rating_avg,
          l.rating_count,
          COUNT(DISTINCT fo.id) as total_orders,
          COUNT(DISTINCT m.id) as menu_count
        FROM restaurants r
        LEFT JOIN listings l ON r.listing_id = l.id
        LEFT JOIN food_orders fo ON r.id = fo.restaurant_id AND fo.status = 'completed'
        LEFT JOIN menus m ON r.id = m.restaurant_id AND m.is_available = 1
        WHERE r.vendor_id = ?
      `;

      const params = [vendor_id];

      if (restaurant_id) {
        query += ` AND r.id = ?`;
        params.push(restaurant_id);
      }

      if (is_active !== undefined) {
        query += ` AND r.is_active = ?`;
        params.push(is_active === 'true' ? 1 : 0);
      }

      query += ` GROUP BY r.id ORDER BY r.created_at DESC`;

      const result = await connection.execute(query, params);

      const restaurants = (result.rows || []).map(restaurant => ({
        ...restaurant,
        images: restaurant.images ? JSON.parse(restaurant.images) : [],
        menu_images: restaurant.menu_images ? JSON.parse(restaurant.menu_images) : [],
        food_categories: restaurant.food_categories ? JSON.parse(restaurant.food_categories) : [],
        operating_hours: restaurant.operating_hours ? JSON.parse(restaurant.operating_hours) : {},
        break_time: restaurant.break_time ? JSON.parse(restaurant.break_time) : null
      }));

      return res.status(200).json({
        success: true,
        restaurants
      });

    } catch (error) {
      console.error('❌ [Vendor Food Restaurants GET] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // POST: 새 식당 등록
  if (req.method === 'POST') {
    try {
      const {
        listing_id,
        name,
        description,
        cuisine_type,
        food_categories,
        address,
        phone,
        operating_hours,
        break_time,
        last_order_time,
        table_count,
        seat_count,
        parking_available,
        accepts_reservations,
        accepts_takeout,
        accepts_delivery,
        table_order_enabled,
        thumbnail_url,
        images,
        menu_images
      } = req.body;

      if (!listing_id || !name || !cuisine_type) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다. (listing_id, name, cuisine_type)'
        });
      }

      // 리스팅이 벤더 소유인지 확인
      const listingCheck = await connection.execute(`
        SELECT id FROM listings
        WHERE id = ? AND partner_id = ? AND category = 'food'
      `, [listing_id, vendor_id]);

      if (!listingCheck.rows || listingCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '본인의 음식 리스팅에만 식당을 추가할 수 있습니다.'
        });
      }

      const restaurant_code = generateRestaurantCode();

      const result = await connection.execute(`
        INSERT INTO restaurants (
          listing_id,
          vendor_id,
          restaurant_code,
          name,
          description,
          cuisine_type,
          food_categories,
          address,
          phone,
          operating_hours,
          break_time,
          last_order_time,
          table_count,
          seat_count,
          parking_available,
          accepts_reservations,
          accepts_takeout,
          accepts_delivery,
          table_order_enabled,
          thumbnail_url,
          images,
          menu_images,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      `, [
        listing_id,
        vendor_id,
        restaurant_code,
        name,
        description || null,
        cuisine_type,
        JSON.stringify(food_categories || []),
        address || null,
        phone || null,
        JSON.stringify(operating_hours || {}),
        JSON.stringify(break_time || null),
        last_order_time || null,
        table_count || 0,
        seat_count || 0,
        parking_available ? 1 : 0,
        accepts_reservations ? 1 : 0,
        accepts_takeout ? 1 : 0,
        accepts_delivery ? 1 : 0,
        table_order_enabled ? 1 : 0,
        thumbnail_url || null,
        JSON.stringify(images || []),
        JSON.stringify(menu_images || [])
      ]);

      console.log(`✅ [Vendor Food Restaurant] 생성 완료: ${name} (${restaurant_code}) by vendor ${vendor_id}`);

      return res.status(201).json({
        success: true,
        restaurant_id: result.insertId,
        restaurant_code
      });

    } catch (error) {
      console.error('❌ [Vendor Food Restaurants POST] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // PUT: 식당 정보 수정
  if (req.method === 'PUT') {
    try {
      const { restaurant_id, ...fields } = req.body;

      if (!restaurant_id) {
        return res.status(400).json({
          success: false,
          error: 'restaurant_id가 필요합니다.'
        });
      }

      // 식당이 벤더 소유인지 확인
      const restaurantCheck = await connection.execute(`
        SELECT id FROM restaurants
        WHERE id = ? AND vendor_id = ?
      `, [restaurant_id, vendor_id]);

      if (!restaurantCheck.rows || restaurantCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '본인의 식당만 수정할 수 있습니다.'
        });
      }

      const updates = [];
      const values = [];

      const allowedFields = [
        'name', 'description', 'cuisine_type', 'food_categories', 'address', 'phone',
        'operating_hours', 'break_time', 'last_order_time', 'table_count', 'seat_count',
        'parking_available', 'accepts_reservations', 'accepts_takeout', 'accepts_delivery',
        'table_order_enabled', 'thumbnail_url', 'images', 'menu_images', 'is_active'
      ];

      for (const field of allowedFields) {
        if (fields[field] !== undefined) {
          if (['food_categories', 'operating_hours', 'break_time', 'images', 'menu_images'].includes(field)) {
            updates.push(`${field} = ?`);
            values.push(JSON.stringify(fields[field]));
          } else if (typeof fields[field] === 'boolean') {
            updates.push(`${field} = ?`);
            values.push(fields[field] ? 1 : 0);
          } else {
            updates.push(`${field} = ?`);
            values.push(fields[field]);
          }
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: '수정할 필드가 없습니다.'
        });
      }

      updates.push('updated_at = NOW()');
      values.push(restaurant_id);

      const query = `UPDATE restaurants SET ${updates.join(', ')} WHERE id = ?`;
      await connection.execute(query, values);

      console.log(`✅ [Vendor Food Restaurant] 수정 완료: restaurant_id=${restaurant_id} by vendor ${vendor_id}`);

      return res.status(200).json({
        success: true,
        message: '식당 정보가 수정되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Vendor Food Restaurants PUT] Error:', error);
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

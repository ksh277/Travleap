/**
 * 관리자용 - 식당 관리 API
 * GET /api/admin/food/restaurants - 전체 식당 목록 조회
 * PATCH /api/admin/food/restaurants?id=123 - 식당 정보 수정
 * DELETE /api/admin/food/restaurants?id=123 - 식당 삭제
 */

const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

// JWT 검증 함수
function verifyAdmin(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED');
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'travleap-secret-2025');

    if (decoded.role !== 'admin' && decoded.userType !== 'admin') {
      throw new Error('FORBIDDEN');
    }

    return decoded;
  } catch (error) {
    throw new Error('INVALID_TOKEN');
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  // 관리자 권한 확인
  try {
    verifyAdmin(req);
  } catch (error) {
    return res.status(error.message === 'UNAUTHORIZED' ? 401 : 403).json({
      success: false,
      error: error.message,
      message: '관리자 권한이 필요합니다.'
    });
  }

  // GET: 전체 식당 목록 조회
  if (req.method === 'GET') {
    try {
      const { search, is_active, accepts_delivery, accepts_takeout, status } = req.query;

      let query = `
        SELECT
          r.*,
          COUNT(DISTINCT fo.id) as total_orders,
          SUM(CASE WHEN fo.status = 'completed' THEN fo.total_krw ELSE 0 END) as total_revenue
        FROM restaurants r
        LEFT JOIN food_orders fo ON r.id = fo.restaurant_id
        WHERE 1=1
      `;

      const params = [];

      if (search) {
        query += ` AND (r.name LIKE ? OR r.address LIKE ? OR r.restaurant_code LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      if (is_active !== undefined) {
        query += ` AND r.is_active = ?`;
        params.push(is_active === 'true' ? 1 : 0);
      }

      if (accepts_delivery !== undefined) {
        query += ` AND r.accepts_delivery = ?`;
        params.push(accepts_delivery === 'true' ? 1 : 0);
      }

      if (accepts_takeout !== undefined) {
        query += ` AND r.accepts_takeout = ?`;
        params.push(accepts_takeout === 'true' ? 1 : 0);
      }

      if (status) {
        query += ` AND r.status = ?`;
        params.push(status);
      }

      query += ` GROUP BY r.id ORDER BY r.created_at DESC`;

      const result = await connection.execute(query, params);

      // JSON 필드 파싱
      const restaurants = (result.rows || []).map(restaurant => ({
        ...restaurant,
        food_categories: restaurant.food_categories ?
          (typeof restaurant.food_categories === 'string' ?
            JSON.parse(restaurant.food_categories) : restaurant.food_categories) : [],
        operating_hours: restaurant.operating_hours ?
          (typeof restaurant.operating_hours === 'string' ?
            JSON.parse(restaurant.operating_hours) : restaurant.operating_hours) : {},
        break_time: restaurant.break_time ?
          (typeof restaurant.break_time === 'string' ?
            JSON.parse(restaurant.break_time) : restaurant.break_time) : null,
        images: restaurant.images ?
          (typeof restaurant.images === 'string' ?
            JSON.parse(restaurant.images) : restaurant.images) : []
      }));

      return res.status(200).json({
        success: true,
        restaurants,
        total: restaurants.length
      });

    } catch (error) {
      console.error('❌ [Admin Food Restaurants] 목록 조회 실패:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // PATCH: 식당 정보 수정
  if (req.method === 'PATCH') {
    try {
      const { id } = req.query;
      const updates = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'restaurant_id가 필요합니다.'
        });
      }

      // 허용된 필드만 업데이트
      const allowedFields = [
        'name', 'description', 'phone', 'address', 'location',
        'accepts_reservations', 'accepts_takeout', 'accepts_delivery',
        'delivery_fee_krw', 'min_delivery_amount_krw',
        'food_categories', 'operating_hours', 'break_time',
        'images', 'thumbnail_url', 'is_active', 'status'
      ];

      const updateFields = [];
      const params = [];

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);

          // JSON 필드 처리
          if (['food_categories', 'operating_hours', 'break_time', 'images'].includes(key)) {
            params.push(typeof value === 'string' ? value : JSON.stringify(value));
          } else {
            params.push(value);
          }
        }
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: '수정할 필드가 없습니다.'
        });
      }

      params.push(id);

      const query = `
        UPDATE restaurants
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = ?
      `;

      await connection.execute(query, params);

      console.log(`✅ [Admin Food Restaurants] 식당 정보 수정 완료: ID ${id}`);

      return res.status(200).json({
        success: true,
        message: '식당 정보가 수정되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Admin Food Restaurants] 수정 실패:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // DELETE: 식당 삭제 (soft delete - is_active = 0)
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'restaurant_id가 필요합니다.'
        });
      }

      // Soft delete
      await connection.execute(`
        UPDATE restaurants
        SET is_active = 0, updated_at = NOW()
        WHERE id = ?
      `, [id]);

      console.log(`✅ [Admin Food Restaurants] 식당 삭제 완료: ID ${id}`);

      return res.status(200).json({
        success: true,
        message: '식당이 삭제되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Admin Food Restaurants] 삭제 실패:', error);
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

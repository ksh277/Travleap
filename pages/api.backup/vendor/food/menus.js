/**
 * 벤더 - 메뉴 관리 API
 * GET /api/vendor/food/menus - 내 식당 메뉴 목록 조회
 * POST /api/vendor/food/menus - 새 메뉴 등록
 * PUT /api/vendor/food/menus - 메뉴 정보 수정
 * DELETE /api/vendor/food/menus - 메뉴 삭제
 */

const { connect } = require('@planetscale/database');

function generateMenuCode() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `MENU-${timestamp}-${random}`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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

  // GET: 내 메뉴 목록 조회
  if (req.method === 'GET') {
    try {
      const { menu_id, restaurant_id, category, is_available } = req.query;

      let query = `
        SELECT
          m.*,
          r.name as restaurant_name
        FROM menus m
        LEFT JOIN restaurants r ON m.restaurant_id = r.id
        WHERE r.vendor_id = ?
      `;

      const params = [vendor_id];

      if (menu_id) {
        query += ` AND m.id = ?`;
        params.push(menu_id);
      }

      if (restaurant_id) {
        query += ` AND m.restaurant_id = ?`;
        params.push(restaurant_id);
      }

      if (category) {
        query += ` AND m.category = ?`;
        params.push(category);
      }

      if (is_available !== undefined) {
        query += ` AND m.is_available = ?`;
        params.push(is_available === 'true' ? 1 : 0);
      }

      query += ` ORDER BY m.display_order DESC, m.created_at DESC`;

      const result = await connection.execute(query, params);

      const menus = (result.rows || []).map(menu => ({
        ...menu,
        options: menu.options ? JSON.parse(menu.options) : [],
        allergens: menu.allergens ? JSON.parse(menu.allergens) : []
      }));

      return res.status(200).json({
        success: true,
        menus
      });

    } catch (error) {
      console.error('❌ [Vendor Food Menus GET] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // POST: 새 메뉴 등록
  if (req.method === 'POST') {
    try {
      const {
        restaurant_id,
        name,
        description,
        category,
        price_krw,
        discount_price_krw,
        options,
        is_available,
        daily_limit,
        image_url,
        is_signature,
        is_popular,
        allergens,
        spicy_level,
        calories,
        display_order
      } = req.body;

      if (!restaurant_id || !name || !price_krw) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다. (restaurant_id, name, price_krw)'
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
          error: '본인의 식당에만 메뉴를 추가할 수 있습니다.'
        });
      }

      const menu_code = generateMenuCode();

      const result = await connection.execute(`
        INSERT INTO menus (
          restaurant_id,
          menu_code,
          name,
          description,
          category,
          price_krw,
          discount_price_krw,
          options,
          is_available,
          daily_limit,
          current_sold,
          image_url,
          is_signature,
          is_popular,
          allergens,
          spicy_level,
          calories,
          display_order,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        restaurant_id,
        menu_code,
        name,
        description || null,
        category || '메인',
        price_krw,
        discount_price_krw || null,
        JSON.stringify(options || []),
        is_available !== false ? 1 : 0,
        daily_limit || null,
        image_url || null,
        is_signature ? 1 : 0,
        is_popular ? 1 : 0,
        JSON.stringify(allergens || []),
        spicy_level || 0,
        calories || null,
        display_order || 0
      ]);

      console.log(`✅ [Vendor Food Menu] 생성 완료: ${name} (${menu_code}) by vendor ${vendor_id}`);

      return res.status(201).json({
        success: true,
        menu_id: result.insertId,
        menu_code
      });

    } catch (error) {
      console.error('❌ [Vendor Food Menus POST] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // PUT: 메뉴 정보 수정
  if (req.method === 'PUT') {
    try {
      const { menu_id, ...fields } = req.body;

      if (!menu_id) {
        return res.status(400).json({
          success: false,
          error: 'menu_id가 필요합니다.'
        });
      }

      // 메뉴가 벤더 소유의 식당 메뉴인지 확인
      const menuCheck = await connection.execute(`
        SELECT m.id
        FROM menus m
        LEFT JOIN restaurants r ON m.restaurant_id = r.id
        WHERE m.id = ? AND r.vendor_id = ?
      `, [menu_id, vendor_id]);

      if (!menuCheck.rows || menuCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '본인의 메뉴만 수정할 수 있습니다.'
        });
      }

      const updates = [];
      const values = [];

      const allowedFields = [
        'name', 'description', 'category', 'price_krw', 'discount_price_krw',
        'options', 'is_available', 'daily_limit', 'current_sold', 'image_url',
        'is_signature', 'is_popular', 'allergens', 'spicy_level', 'calories',
        'display_order'
      ];

      for (const field of allowedFields) {
        if (fields[field] !== undefined) {
          if (['options', 'allergens'].includes(field)) {
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
      values.push(menu_id);

      const query = `UPDATE menus SET ${updates.join(', ')} WHERE id = ?`;
      await connection.execute(query, values);

      console.log(`✅ [Vendor Food Menu] 수정 완료: menu_id=${menu_id} by vendor ${vendor_id}`);

      return res.status(200).json({
        success: true,
        message: '메뉴 정보가 수정되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Vendor Food Menus PUT] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // DELETE: 메뉴 삭제
  if (req.method === 'DELETE') {
    try {
      const { menu_id } = req.body;

      if (!menu_id) {
        return res.status(400).json({
          success: false,
          error: 'menu_id가 필요합니다.'
        });
      }

      // 메뉴가 벤더 소유의 식당 메뉴인지 확인
      const menuCheck = await connection.execute(`
        SELECT m.id
        FROM menus m
        LEFT JOIN restaurants r ON m.restaurant_id = r.id
        WHERE m.id = ? AND r.vendor_id = ?
      `, [menu_id, vendor_id]);

      if (!menuCheck.rows || menuCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '본인의 메뉴만 삭제할 수 있습니다.'
        });
      }

      await connection.execute('DELETE FROM menus WHERE id = ?', [menu_id]);

      console.log(`✅ [Vendor Food Menu] 삭제 완료: menu_id=${menu_id} by vendor ${vendor_id}`);

      return res.status(200).json({
        success: true,
        message: '메뉴가 삭제되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Vendor Food Menus DELETE] Error:', error);
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

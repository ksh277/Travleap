/**
 * 사용자용 - 식당 메뉴 조회 API
 * GET /api/food/menus?restaurant_id=123 - 특정 식당의 메뉴 목록 조회
 * GET /api/food/menus?id=456 - 특정 메뉴 상세 조회
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
        restaurant_id,
        category,
        is_available,
        is_signature,
        is_popular
      } = req.query;

      // 특정 메뉴 상세 조회
      if (id) {
        const query = `
          SELECT
            m.*,
            r.name as restaurant_name,
            r.restaurant_code
          FROM menus m
          LEFT JOIN restaurants r ON m.restaurant_id = r.id
          WHERE m.id = ?
        `;

        const result = await connection.execute(query, [id]);

        if (!result.rows || result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: '메뉴를 찾을 수 없습니다.'
          });
        }

        const menu = result.rows[0];

        // JSON 필드 파싱
        const formattedMenu = {
          ...menu,
          options: menu.options ? (typeof menu.options === 'string' ? JSON.parse(menu.options) : menu.options) : [],
          allergens: menu.allergens ? (typeof menu.allergens === 'string' ? JSON.parse(menu.allergens) : menu.allergens) : []
        };

        return res.status(200).json({
          success: true,
          menu: formattedMenu
        });
      }

      // 식당 ID가 필수
      if (!restaurant_id) {
        return res.status(400).json({
          success: false,
          error: 'restaurant_id가 필요합니다.'
        });
      }

      // 메뉴 목록 조회
      let query = `
        SELECT
          m.*,
          r.name as restaurant_name
        FROM menus m
        LEFT JOIN restaurants r ON m.restaurant_id = r.id
        WHERE m.restaurant_id = ?
      `;

      const params = [restaurant_id];

      // 카테고리 필터
      if (category) {
        query += ` AND m.category = ?`;
        params.push(category);
      }

      // 판매 가능 필터
      if (is_available !== undefined) {
        query += ` AND m.is_available = ?`;
        params.push(is_available === 'true' ? 1 : 0);
      }

      // 대표 메뉴 필터
      if (is_signature !== undefined) {
        query += ` AND m.is_signature = ?`;
        params.push(is_signature === 'true' ? 1 : 0);
      }

      // 인기 메뉴 필터
      if (is_popular !== undefined) {
        query += ` AND m.is_popular = ?`;
        params.push(is_popular === 'true' ? 1 : 0);
      }

      query += ` ORDER BY m.display_order DESC, m.id ASC`;

      const result = await connection.execute(query, params);

      // JSON 필드 파싱
      const menus = (result.rows || []).map(menu => {
        let options = [];
        let allergens = [];

        try {
          if (menu.options) {
            options = typeof menu.options === 'string' ? JSON.parse(menu.options) : menu.options;
          }
        } catch (e) {
          console.warn('Options parsing failed:', menu.id);
        }

        try {
          if (menu.allergens) {
            allergens = typeof menu.allergens === 'string' ? JSON.parse(menu.allergens) : menu.allergens;
          }
        } catch (e) {
          console.warn('Allergens parsing failed:', menu.id);
        }

        // 재고 체크
        const soldOut = menu.daily_limit && menu.current_sold >= menu.daily_limit;

        return {
          ...menu,
          options,
          allergens,
          sold_out: soldOut,
          available: menu.is_available && !soldOut
        };
      });

      // 카테고리별로 그룹화
      const menusByCategory = menus.reduce((acc, menu) => {
        const cat = menu.category || '기타';
        if (!acc[cat]) {
          acc[cat] = [];
        }
        acc[cat].push(menu);
        return acc;
      }, {});

      return res.status(200).json({
        success: true,
        menus,
        menus_by_category: menusByCategory,
        total: menus.length
      });

    } catch (error) {
      console.error('❌ [Food Menus API] Error:', error);
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

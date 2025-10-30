const { connect } = require('@planetscale/database');

/**
 * 메뉴 목록 조회 API
 * GET /api/food/menus/[restaurantId]
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
    const { restaurantId } = req.query;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        error: '식당 ID가 필요합니다.'
      });
    }

    // 메뉴 조회
    const result = await connection.execute(
      `SELECT * FROM menus
       WHERE restaurant_id = ? AND is_available = 1
       ORDER BY display_order DESC, category, id`,
      [restaurantId]
    );

    // 카테고리별로 그룹화
    const menusByCategory = {};
    result.rows.forEach(menu => {
      const cat = menu.category || '기타';
      if (!menusByCategory[cat]) {
        menusByCategory[cat] = [];
      }
      menusByCategory[cat].push({
        ...menu,
        options: menu.options ? JSON.parse(menu.options) : [],
        allergens: menu.allergens ? JSON.parse(menu.allergens) : []
      });
    });

    return res.status(200).json({
      success: true,
      data: {
        menus: result.rows.map(m => ({
          ...m,
          options: m.options ? JSON.parse(m.options) : [],
          allergens: m.allergens ? JSON.parse(m.allergens) : []
        })),
        menusByCategory
      }
    });

  } catch (error) {
    console.error('❌ [Food Menus API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

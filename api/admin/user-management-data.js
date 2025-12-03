/**
 * 사용자 관리용 데이터 API
 * - 카테고리별 상품 목록 (벤더 연결용)
 * - 파트너(가맹점) 목록 (파트너 연결용) - 페이지네이션 지원
 */
const { connect } = require('@planetscale/database');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { type, category, page = 1, limit = 10 } = req.query;
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 카테고리별 상품 목록 조회
    if (type === 'listings') {
      let query = '';
      let params = [];

      if (category === 'tour' || category === 'popup' || category === 'food' ||
          category === 'attractions' || category === 'events' || category === 'experience') {
        // 일반 상품 (listings 테이블)
        const categoryMap = {
          'tour': 'tour',
          'popup': 'popup',
          'food': 'food',
          'attractions': 'attractions',
          'events': 'events',
          'experience': 'experience'
        };

        query = `
          SELECT l.id, l.title, l.category, c.name_ko as category_name
          FROM listings l
          LEFT JOIN categories c ON l.category_id = c.id
          WHERE c.slug = ?
          ORDER BY l.title ASC
        `;
        params = [categoryMap[category]];

      } else if (category === 'stay' || category === 'accommodation') {
        // 숙박 상품 (listings 테이블, category_id = 1857)
        query = `
          SELECT l.id, l.title, 'stay' as category, '숙박' as category_name,
                 p.business_name as vendor_name
          FROM listings l
          LEFT JOIN partners p ON l.partner_id = p.id
          WHERE l.category_id = 1857
          ORDER BY l.title ASC
        `;

      } else if (category === 'rentcar' || category === 'rental') {
        // 렌트카 (rentcar_vendors 테이블)
        query = `
          SELECT v.id, v.business_name as title, 'rentcar' as category, '렌트카' as category_name,
                 v.brand_name as vendor_name
          FROM rentcar_vendors v
          WHERE v.status = 'active'
          ORDER BY v.business_name ASC
        `;
      }

      if (query) {
        const result = await connection.execute(query, params);
        return res.status(200).json({
          success: true,
          data: result.rows || []
        });
      }

      return res.status(400).json({ success: false, error: 'Invalid category' });
    }

    // 파트너(가맹점) 목록 조회 - 페이지네이션
    if (type === 'partners') {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const offset = (pageNum - 1) * limitNum;

      // 전체 개수 조회
      const countResult = await connection.execute(`
        SELECT COUNT(*) as total FROM partners
        WHERE (partner_type != 'lodging' OR partner_type IS NULL)
      `);
      const total = countResult.rows?.[0]?.total || 0;

      // 페이지네이션된 목록 조회
      const result = await connection.execute(`
        SELECT id, business_name, location, services, status, is_active
        FROM partners
        WHERE (partner_type != 'lodging' OR partner_type IS NULL)
        ORDER BY business_name ASC
        LIMIT ? OFFSET ?
      `, [limitNum, offset]);

      return res.status(200).json({
        success: true,
        data: result.rows || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    }

    // 카테고리 목록 조회
    if (type === 'categories') {
      const categories = [
        { value: 'tour', label: '투어' },
        { value: 'rentcar', label: '렌트카' },
        { value: 'stay', label: '숙박' },
        { value: 'popup', label: '팝업' },
        { value: 'food', label: '음식' },
        { value: 'attractions', label: '관광지' },
        { value: 'events', label: '행사' },
        { value: 'experience', label: '체험' }
      ];

      return res.status(200).json({
        success: true,
        data: categories
      });
    }

    return res.status(400).json({ success: false, error: 'Invalid type parameter' });

  } catch (error) {
    console.error('User management data API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = withPublicCors(withAuth(handler, { requireSuperAdmin: true }));

const { connect } = require('@planetscale/database');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const conn = connect({ url: process.env.DATABASE_URL });
    const result = await conn.execute(`
      SELECT id, image_url, title, link_url, size, display_order
      FROM activity_images
      WHERE is_active = TRUE
      ORDER BY display_order ASC, created_at DESC
    `);

    return res.status(200).json({ success: true, activities: result.rows || [] });
  } catch (error) {
    console.error('Activities error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch activities', activities: [] });
  }
}

// 공개 API CORS 적용
module.exports = withPublicCors(handler);

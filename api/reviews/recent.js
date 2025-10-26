const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { limit = '4' } = req.query;
    const limitNum = parseInt(limit);

    const connection = connect({ url: process.env.DATABASE_URL });

    const result = await connection.execute(`
      SELECT r.*, l.title as listing_title, u.email as user_email
      FROM reviews r
      LEFT JOIN listings l ON r.listing_id = l.id
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
      LIMIT ?
    `, [limitNum]);

    return res.status(200).json({
      success: true,
      data: result || []
    });
  } catch (error) {
    console.error('Error fetching recent reviews:', error);
    return res.status(500).json({ success: false, message: '리뷰 조회 실패', data: [] });
  }
};

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
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
    const connection = connect({ url: process.env.DATABASE_URL });

    const result = await connection.execute(`
      SELECT
        r.*,
        u.name as user_name,
        u.email as user_email,
        l.title as listing_title,
        l.category as listing_category
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN listings l ON r.listing_id = l.id
      ORDER BY r.created_at DESC
    `);

    return res.status(200).json({
      success: true,
      data: result || []
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

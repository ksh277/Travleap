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
        o.*,
        u.name as user_name,
        u.email as user_email,
        l.title as listing_title
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN listings l ON o.listing_id = l.id
      ORDER BY o.created_at DESC
    `);

    return res.status(200).json({
      success: true,
      data: result.rows || []
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    // 테이블이 없으면 빈 배열 반환
    return res.status(200).json({
      success: true,
      data: []
    });
  }
};

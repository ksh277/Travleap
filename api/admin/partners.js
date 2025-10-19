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
        p.*,
        COUNT(DISTINCT l.id) as listing_count
      FROM partners p
      LEFT JOIN listings l ON p.id = l.partner_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    return res.status(200).json({
      success: true,
      data: result.rows || []
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

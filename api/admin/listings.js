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
        l.*,
        c.name_ko as category_name,
        c.slug as category_slug,
        p.company_name as partner_name,
        p.status as partner_status
      FROM listings l
      LEFT JOIN categories c ON l.category = c.slug
      LEFT JOIN partners p ON l.partner_id = p.id
      ORDER BY l.created_at DESC
    `);

    return res.status(200).json({
      success: true,
      data: result.rows || []
    });
  } catch (error) {
    console.error('Error fetching admin listings:', error);
    return res.status(200).json({ success: true, data: [] });
  }
};

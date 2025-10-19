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
    const connection = connect({ url: process.env.DATABASE_URL });

    const result = await connection.execute(`
      SELECT * FROM activities
      WHERE is_active = 1
      ORDER BY display_order ASC
    `);

    return res.status(200).json({
      success: true,
      data: result.rows || []
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    // 테이블이 없으면 빈 배열 반환
    return res.status(200).json({
      success: true,
      data: [],
      error: error.message
    });
  }
};

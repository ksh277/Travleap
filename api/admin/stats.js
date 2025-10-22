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

    const stats = {
      totalListings: 0,
      activeListings: 0,
      totalUsers: 0,
      totalPartners: 0,
      totalOrders: 0
    };

    // 간단한 통계만 반환
    try {
      const listings = await connection.execute('SELECT COUNT(*) as count FROM listings');
      stats.totalListings = listings.rows[0]?.count || 0;
    } catch (e) {}

    try {
      const users = await connection.execute('SELECT COUNT(*) as count FROM users');
      stats.totalUsers = users.rows[0]?.count || 0;
    } catch (e) {}

    try {
      const partners = await connection.execute('SELECT COUNT(*) as count FROM partners WHERE partner_type IS NULL OR partner_type != \'lodging\'');
      stats.totalPartners = partners.rows[0]?.count || 0;
    } catch (e) {}

    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(200).json({
      success: true,
      data: {
        totalListings: 0,
        activeListings: 0,
        totalUsers: 0,
        totalPartners: 0,
        totalOrders: 0
      }
    });
  }
};

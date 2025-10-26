const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

// Neon PostgreSQL connection for users
let pool;
function getPool() {
  if (!pool) {
    const connectionString = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL not configured');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

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
      stats.totalListings = listings[0]?.count || 0;
    } catch (e) {}

    // Users from Neon DB
    try {
      console.log('📊 [Neon] 회원수 조회');
      const neonDb = getPool();
      const users = await neonDb.query('SELECT COUNT(*) as count FROM users');
      stats.totalUsers = parseInt(users.rows[0]?.count) || 0;
      console.log('✅ [Neon] 회원수:', stats.totalUsers);
    } catch (e) {
      console.error('❌ [Neon] 회원수 조회 실패:', e);
    }

    try {
      const partners = await connection.execute('SELECT COUNT(*) as count FROM partners');
      stats.totalPartners = partners[0]?.count || 0;
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

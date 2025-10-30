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
      totalOrders: 0,
      todayOrders: 0,
      revenue: 0,
      commission: 0,
      totalReviews: 0
    };

    // 간단한 통계만 반환
    try {
      const listings = await connection.execute('SELECT COUNT(*) as count FROM listings');
      stats.totalListings = listings.rows?.[0]?.count || 0;
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
      stats.totalPartners = partners.rows?.[0]?.count || 0;
    } catch (e) {}

    // ✅ 주문 통계 (payments 테이블)
    try {
      // 총 주문 수 (결제 완료된 건만)
      const ordersResult = await connection.execute(`
        SELECT COUNT(*) as count
        FROM payments
        WHERE payment_status IN ('paid', 'completed', 'refunded')
      `);
      stats.totalOrders = parseInt(ordersResult.rows?.[0]?.count) || 0;

      // 오늘 주문 수
      const todayResult = await connection.execute(`
        SELECT COUNT(*) as count
        FROM payments
        WHERE payment_status IN ('paid', 'completed', 'refunded')
          AND DATE(created_at) = CURDATE()
      `);
      stats.todayOrders = parseInt(todayResult.rows?.[0]?.count) || 0;

      // 총 매출 (환불 제외)
      const revenueResult = await connection.execute(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM payments
        WHERE payment_status IN ('paid', 'completed')
      `);
      stats.revenue = parseInt(revenueResult.rows?.[0]?.total) || 0;

      // 수수료 (매출의 10% 가정)
      stats.commission = Math.floor(stats.revenue * 0.1);

      console.log('✅ [주문 통계] 총:', stats.totalOrders, '오늘:', stats.todayOrders, '매출:', stats.revenue);
    } catch (e) {
      console.error('❌ [주문 통계] 조회 실패:', e);
    }

    // ✅ 리뷰 통계
    try {
      const reviewsResult = await connection.execute('SELECT COUNT(*) as count FROM reviews');
      stats.totalReviews = parseInt(reviewsResult.rows?.[0]?.count) || 0;
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
        totalOrders: 0,
        todayOrders: 0,
        revenue: 0,
        commission: 0,
        totalReviews: 0
      }
    });
  }
};

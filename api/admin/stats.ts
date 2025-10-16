const { connect } = require('@planetscale/database');

// PlanetScale connection using DATABASE_URL
const getDbConnection = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return connect({ url });
};

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const conn = getDbConnection();
    const today = new Date().toISOString().split('T')[0];

    // 모든 테이블에서 데이터 가져오기
    const [usersResult, partnersResult, listingsResult, paymentsResult, reviewsResult] = await Promise.all([
      conn.execute('SELECT * FROM users'),
      conn.execute('SELECT * FROM partners'),
      conn.execute('SELECT * FROM listings'),
      conn.execute('SELECT * FROM payments'),
      conn.execute('SELECT * FROM reviews')
    ]);

    const users = usersResult.rows || [];
    const partners = partnersResult.rows || [];
    const listings = listingsResult.rows || [];
    const payments = paymentsResult.rows || [];
    const reviews = reviewsResult.rows || [];

    // cart 주문만 필터링
    const orders = payments.filter(p => {
      try {
        let notes = {};
        if (p.notes) {
          notes = typeof p.notes === 'string' ? JSON.parse(p.notes) : p.notes;
        }
        return notes.orderType === 'cart';
      } catch {
        return false;
      }
    });

    // 오늘 생성된 데이터 계산
    const todayUsers = users.filter(u => u.created_at?.startsWith(today)) || [];
    const todayOrders = orders.filter(o => o.created_at?.startsWith(today)) || [];

    // 파트너 상태별 계산
    const pendingPartners = partners.filter(p => p.status === 'pending') || [];
    const activePartners = partners.filter(p => p.status === 'approved' || p.status === 'active') || [];

    // 상품 상태별 계산
    const publishedListings = listings.filter(l => l.is_active === true) || [];

    // 평균 평점 계산
    const ratingsSum = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    const avgRating = reviews.length > 0 ? ratingsSum / reviews.length : 0;

    // 총 수익 계산
    const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

    // 수수료 계산 (10% 가정)
    const commission = totalRevenue * 0.1;

    const stats = {
      totalProducts: listings.length,
      activeProducts: publishedListings.length,
      revenue: todayRevenue,
      avgRating: parseFloat(avgRating.toFixed(1)),
      newSignups: todayUsers.length,
      totalPartners: partners.length,
      pendingPartners: pendingPartners.length,
      activePartners: activePartners.length,
      totalOrders: orders.length,
      todayOrders: todayOrders.length,
      commission: Math.round(commission),
      totalReviews: reviews.length,
      refunds: 0,
      inquiries: 0
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('API /admin/stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin stats',
      errorMessage: error.message || 'Unknown error'
    });
  }
};

/**
 * 최근 리뷰 조회 API
 * ✅ FIX: users 테이블은 Neon PostgreSQL에 있으므로 별도 조회
 */
const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

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

    // ✅ FIX: users JOIN 제거
    const result = await connection.execute(`
      SELECT r.*, l.title as listing_title
      FROM reviews r
      LEFT JOIN listings l ON r.listing_id = l.id
      ORDER BY r.created_at DESC
      LIMIT ?
    `, [limitNum]);

    const reviews = result.rows || [];

    // ✅ FIX: Neon PostgreSQL에서 사용자 정보 별도 조회
    if (reviews.length > 0) {
      const poolNeon = new Pool({
        connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
      });

      try {
        const userIds = [...new Set(reviews.map(r => r.user_id).filter(Boolean))];

        if (userIds.length > 0) {
          const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
          const usersResult = await poolNeon.query(
            `SELECT id, name, email FROM users WHERE id IN (${placeholders})`,
            userIds
          );

          const userMap = new Map();
          usersResult.rows.forEach(user => {
            userMap.set(user.id, user);
            userMap.set(String(user.id), user);
          });

          // 리뷰에 user 정보 추가
          reviews.forEach(review => {
            const user = userMap.get(review.user_id);
            review.user_email = user?.email || null;
            review.user_name = user?.name || user?.email?.split('@')[0] || '익명';
          });
        }
      } catch (neonError) {
        console.warn('⚠️ [Recent Reviews] Neon users 조회 실패:', neonError.message);
      } finally {
        await poolNeon.end();
      }
    }

    return res.status(200).json({
      success: true,
      data: reviews
    });
  } catch (error) {
    console.error('Error fetching recent reviews:', error);
    return res.status(500).json({ success: false, message: '리뷰 조회 실패', data: [] });
  }
};

/**
 * 최근 리뷰 조회 API (route.js)
 * ✅ FIX: users 테이블은 Neon PostgreSQL에 있으므로 별도 조회
 */
const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', req.headers['origin'] || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'GET') {

  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    const conn = connect({ url: process.env.DATABASE_URL });

    // ✅ FIX: users JOIN 제거
    const result = await conn.execute(`
      SELECT r.id, r.rating, r.comment, r.created_at, r.user_id,
             l.title, l.id as listing_id
      FROM reviews r
      LEFT JOIN listings l ON r.listing_id = l.id
      WHERE r.is_visible = TRUE
      ORDER BY r.created_at DESC
      LIMIT ?
    `, [limit]);

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
            `SELECT id, name FROM users WHERE id IN (${placeholders})`,
            userIds
          );

          const userMap = new Map();
          usersResult.rows.forEach(user => {
            userMap.set(user.id, user);
            userMap.set(String(user.id), user);
          });

          reviews.forEach(review => {
            const user = userMap.get(review.user_id);
            review.name = user?.name || '익명';
          });
        }
      } catch (neonError) {
        console.warn('⚠️ [Recent Reviews Route] Neon users 조회 실패:', neonError.message);
      } finally {
        await poolNeon.end();
      }
    }

    return new Response(
      JSON.stringify({ success: true, reviews: reviews }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Reviews error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch reviews', reviews: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }  } else if (req.method === 'OPTIONS') {

  return new Response(null, {
    headers: corsHeaders
  });  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
};

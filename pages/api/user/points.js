/**
 * 사용자 포인트 내역 조회 API
 * GET /api/user/points?userId=123
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // x-user-id 헤더에서 userId 읽기 (쿼리 파라미터도 fallback)
    const userId = req.headers['x-user-id'] || req.query.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required (x-user-id header or userId query param)'
      });
    }

    // ✅ Dual Database 아키텍처
    // 1. Neon PostgreSQL: users.total_points 조회
    const { Pool } = require('@neondatabase/serverless');
    const poolNeon = new Pool({
      connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
    });

    // 2. PlanetScale MySQL: user_points 내역 조회
    const connection = connect({ url: process.env.DATABASE_URL });

    // 사용자 총 포인트 조회 (Neon PostgreSQL)
    const userResult = await poolNeon.query(`
      SELECT total_points
      FROM users
      WHERE id = $1
    `, [parseInt(userId)]);

    const totalPoints = userResult.rows?.[0]?.total_points || 0;

    // 포인트 내역 조회 (PlanetScale MySQL)
    const pointsResult = await connection.execute(`
      SELECT
        id,
        points,
        point_type,
        reason,
        related_order_id,
        related_payment_id,
        balance_after,
        expires_at,
        created_at
      FROM user_points
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `, [parseInt(userId)]);

    return res.status(200).json({
      success: true,
      data: {
        totalPoints,
        history: pointsResult.rows || []
      }
    });

  } catch (error) {
    console.error('❌ [User Points] API error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '포인트 내역 조회에 실패했습니다.'
    });
  }
};

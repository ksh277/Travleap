/**
 * 사용자 포인트 내역 조회 API
 * GET /api/user/points
 */

const { connect } = require('@planetscale/database');
const { withAuth } = require('../../../utils/auth-middleware');

async function handler(req, res) {
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

  // ✅ Connection Pool 변수 선언 (finally에서 정리하기 위해)
  let poolNeon = null;

  try {
    // JWT에서 userId 읽기 (withAuth 미들웨어가 req.user에 추가)
    const userId = req.user.userId;

    // ✅ Dual Database 아키텍처
    // 1. Neon PostgreSQL: users.total_points 조회
    const { Pool } = require('@neondatabase/serverless');
    poolNeon = new Pool({
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
  } finally {
    // ✅ Connection Pool 정리 (메모리 누수 방지)
    if (poolNeon) {
      try {
        await poolNeon.end();
      } catch (cleanupError) {
        console.error('⚠️ [User Points] Pool cleanup error:', cleanupError);
      }
    }
  }
}

// JWT 인증 적용
module.exports = withAuth(handler, { requireAuth: true });

/**
 * 사용자 포인트 내역 조회 API
 * GET /api/user/points
 *
 * Neon PostgreSQL 단일화 (마이그레이션: 2024-12)
 */

const { Pool } = require('@neondatabase/serverless');
const { verifyJWTFromRequest } = require('../../utils/auth-middleware.cjs');

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

  const pool = new Pool({
    connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
  });

  try {
    // JWT 토큰에서 userId 추출
    const user = verifyJWTFromRequest(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다. 로그인 후 다시 시도해주세요.'
      });
    }

    const userId = parseInt(user.userId);

    // Neon PostgreSQL에서 사용자 포인트 조회
    const userResult = await pool.query(
      'SELECT total_points FROM users WHERE id = $1',
      [userId]
    );

    let totalPoints = 0;
    if (userResult.rows.length > 0) {
      totalPoints = userResult.rows[0].total_points || 0;
    }

    console.log(`💰 [포인트 조회] User ${userId}: ${totalPoints}P`);

    // 포인트 내역 조회 (Neon PostgreSQL)
    const pointsResult = await pool.query(`
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
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `, [userId]);

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
    try {
      await pool.end();
    } catch (e) {
      // ignore
    }
  }
};

/**
 * 사용자 포인트 내역 조회 API
 * GET /api/user/points
 */

const { connect } = require('@planetscale/database');
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

  try {
    // JWT 토큰에서 userId 추출
    const user = verifyJWTFromRequest(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다. 로그인 후 다시 시도해주세요.'
      });
    }

    const userId = user.userId;

    // ✅ Dual Database 아키텍처
    // 1. Neon PostgreSQL: users.total_points 조회
    const { Pool } = require('@neondatabase/serverless');
    const poolNeon = new Pool({
      connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
    });

    // 2. PlanetScale MySQL: user_points 내역 조회
    const connection = connect({ url: process.env.DATABASE_URL });

    // 🔧 CRITICAL FIX: balance_after를 신뢰할 수 있는 소스로 사용
    // Neon total_points는 Race Condition으로 동기화 안될 수 있음
    // 대신 PlanetScale의 최신 balance_after 사용 (트랜잭션 순서 보장)

    // 최신 포인트 거래의 balance_after 조회
    const balanceResult = await connection.execute(`
      SELECT balance_after
      FROM user_points
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `, [parseInt(userId)]);

    let totalPoints = 0;

    if (balanceResult.rows && balanceResult.rows.length > 0) {
      // PlanetScale balance_after 사용 (더 정확함)
      totalPoints = balanceResult.rows[0].balance_after || 0;
      console.log(`💰 [포인트 조회] User ${userId}: balance_after=${totalPoints}P`);

      // Neon과 동기화 (백그라운드, 실패해도 무시)
      try {
        const userResult = await poolNeon.query(`SELECT total_points FROM users WHERE id = $1`, [parseInt(userId)]);
        const neonPoints = userResult.rows?.[0]?.total_points || 0;

        if (neonPoints !== totalPoints) {
          console.warn(`⚠️ [포인트 조회] Neon 동기화 안됨: Neon=${neonPoints}P, PlanetScale=${totalPoints}P`);
          // 백그라운드 동기화 (실패해도 무시)
          poolNeon.query(`UPDATE users SET total_points = $1 WHERE id = $2`, [totalPoints, parseInt(userId)])
            .then(() => console.log(`✅ [포인트 조회] Neon 자동 동기화 완료: ${totalPoints}P`))
            .catch(err => console.error(`❌ [포인트 조회] Neon 동기화 실패:`, err.message));
        }
      } catch (neonError) {
        console.error(`❌ [포인트 조회] Neon 확인 실패 (계속 진행):`, neonError.message);
      }
    } else {
      // 포인트 내역이 없으면 Neon 확인 (fallback)
      try {
        const userResult = await poolNeon.query(`SELECT total_points FROM users WHERE id = $1`, [parseInt(userId)]);
        totalPoints = userResult.rows?.[0]?.total_points || 0;
        console.log(`💰 [포인트 조회] User ${userId}: Neon fallback=${totalPoints}P`);
      } catch (neonError) {
        console.error(`❌ [포인트 조회] Neon fallback 실패:`, neonError.message);
        totalPoints = 0;
      }
    }

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

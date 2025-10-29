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
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // 사용자 총 포인트 조회
    const userResult = await connection.execute(`
      SELECT total_points
      FROM users
      WHERE id = ?
    `, [parseInt(userId)]);

    const totalPoints = userResult.rows?.[0]?.total_points || 0;

    // 포인트 내역 조회 (최신순)
    const pointsResult = await connection.execute(`
      SELECT
        id,
        points,
        point_type,
        reason,
        related_order_id,
        related_booking_id,
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

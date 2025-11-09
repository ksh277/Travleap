/**
 * 포인트 수동 조정 API
 * POST /api/admin/adjust-points
 *
 * 관리자가 사용자의 포인트를 수동으로 증가/감소시킴
 */

const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { user_id, points_change, reason, admin_id } = req.body;

    // 검증
    if (!user_id || points_change === undefined || !reason) {
      return res.status(400).json({
        success: false,
        error: '필수 필드가 누락되었습니다: user_id, points_change, reason'
      });
    }

    const pointsChange = parseInt(points_change);

    if (isNaN(pointsChange) || pointsChange === 0) {
      return res.status(400).json({
        success: false,
        error: '포인트 변경 값이 유효하지 않습니다'
      });
    }

    console.log(`📝 포인트 조정 요청: user_id=${user_id}, points=${pointsChange}, reason=${reason}`);

    // Neon DB 연결 (사용자 데이터)
    const sql = neon(process.env.NEON_DATABASE_URL || process.env.POSTGRES_DATABASE_URL);

    // 1. 현재 포인트 조회
    const userResult = await sql`
      SELECT id, email, name, points
      FROM users
      WHERE id = ${user_id}
    `;

    if (userResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다'
      });
    }

    const user = userResult[0];
    const currentPoints = user.points || 0;
    const newPoints = currentPoints + pointsChange;

    // 포인트가 음수가 되는지 확인
    if (newPoints < 0) {
      return res.status(400).json({
        success: false,
        error: `포인트가 부족합니다. 현재: ${currentPoints}P, 차감 시도: ${Math.abs(pointsChange)}P`
      });
    }

    // 2. 포인트 업데이트
    await sql`
      UPDATE users
      SET points = ${newPoints},
          updated_at = NOW()
      WHERE id = ${user_id}
    `;

    console.log(`✅ 포인트 조정 완료: ${user.email} (${currentPoints}P → ${newPoints}P)`);

    // 3. 포인트 이력 기록 (point_history 테이블이 있다면)
    try {
      await sql`
        INSERT INTO point_history (
          user_id,
          points_change,
          reason,
          balance_before,
          balance_after,
          type,
          created_by,
          created_at
        ) VALUES (
          ${user_id},
          ${pointsChange},
          ${reason},
          ${currentPoints},
          ${newPoints},
          'admin_adjustment',
          ${admin_id || 'admin'},
          NOW()
        )
      `;
      console.log('📝 포인트 이력 기록 완료');
    } catch (historyError) {
      console.warn('⚠️  포인트 이력 기록 실패 (테이블이 없을 수 있음):', historyError.message);
      // 이력 기록 실패해도 포인트 조정은 성공으로 처리
    }

    return res.status(200).json({
      success: true,
      data: {
        user_id: user.id,
        email: user.email,
        name: user.name,
        points_before: currentPoints,
        points_after: newPoints,
        points_change: pointsChange,
        reason
      },
      message: `포인트가 ${pointsChange > 0 ? '+' : ''}${pointsChange}P 조정되었습니다`
    });

  } catch (error) {
    console.error('❌ 포인트 조정 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

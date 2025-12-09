/**
 * 사용자 탈퇴 API
 * POST /api/user/withdraw
 *
 * soft delete 방식: status를 'withdrawn'으로 변경
 * 거래 기록은 전자상거래법에 따라 5년간 보존
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 인증 확인 (쿠키 또는 헤더에서 사용자 정보 추출)
    const authHeader = req.headers.authorization;
    const cookies = req.headers.cookie || '';

    // user_id 추출 (여러 방법 시도)
    let userId = null;

    // 1. Authorization 헤더에서 추출
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // JWT 디코딩 (간단한 방식)
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        userId = payload.userId || payload.user_id || payload.id;
      } catch (e) {
        console.log('JWT 파싱 실패:', e.message);
      }
    }

    // 2. 쿠키에서 user_id 추출
    if (!userId) {
      const userIdMatch = cookies.match(/user_id=(\d+)/);
      if (userIdMatch) {
        userId = parseInt(userIdMatch[1]);
      }
    }

    // 3. 요청 본문에서 추출 (프론트엔드에서 전달)
    if (!userId && req.body && req.body.userId) {
      userId = req.body.userId;
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '로그인이 필요합니다.'
      });
    }

    console.log(`🔴 [탈퇴] 사용자 탈퇴 요청: user_id=${userId}`);

    // 사용자 존재 확인
    const userCheck = await connection.execute(
      'SELECT id, email, name, status FROM users WHERE id = ?',
      [userId]
    );

    if (!userCheck.rows || userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }

    const user = userCheck.rows[0];

    // 이미 탈퇴한 사용자인지 확인
    if (user.status === 'withdrawn' || user.status === 'deleted') {
      return res.status(400).json({
        success: false,
        error: '이미 탈퇴한 계정입니다.'
      });
    }

    // 소프트 삭제: status를 'withdrawn'으로 변경
    // 전자상거래법에 따라 거래 기록은 5년간 보존해야 하므로 완전 삭제하지 않음
    await connection.execute(`
      UPDATE users
      SET
        status = 'withdrawn',
        email = CONCAT('withdrawn_', id, '_', email),
        name = '탈퇴한 사용자',
        phone = NULL,
        password_hash = NULL,
        profile_image = NULL,
        updated_at = NOW()
      WHERE id = ?
    `, [userId]);

    // 탈퇴 로그 기록 (audit trail)
    try {
      await connection.execute(`
        INSERT INTO user_activity_logs (user_id, action, details, created_at)
        VALUES (?, 'WITHDRAW', ?, NOW())
      `, [userId, JSON.stringify({
        original_email: user.email,
        original_name: user.name,
        reason: req.body?.reason || '사용자 요청'
      })]);
    } catch (logError) {
      // 로그 테이블이 없어도 탈퇴는 진행
      console.log('탈퇴 로그 기록 실패 (무시):', logError.message);
    }

    console.log(`✅ [탈퇴] 사용자 탈퇴 완료: user_id=${userId}, email=${user.email}`);

    return res.status(200).json({
      success: true,
      message: '계정이 성공적으로 삭제되었습니다.',
      data: {
        userId,
        withdrawnAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [탈퇴] 오류:', error);
    return res.status(500).json({
      success: false,
      error: '계정 삭제 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

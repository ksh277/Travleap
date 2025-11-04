const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const { withAuth } = require('../../../utils/auth-middleware');

async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const databaseUrl = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    return res.status(500).json({
      success: false,
      error: 'Database URL not configured'
    });
  }

  const sql = neon(databaseUrl);

  try {
    // JWT에서 사용자 ID 가져오기
    const userId = req.user.userId;

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: '현재 비밀번호와 새 비밀번호를 입력해주세요.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: '새 비밀번호는 최소 6자 이상이어야 합니다.'
      });
    }

    console.log('🔑 [ChangePassword] 비밀번호 변경 요청:', userId);

    // 사용자 조회 및 현재 비밀번호 확인
    const userResult = await sql`
      SELECT id, email, password_hash, provider
      FROM users
      WHERE id = ${userId}
    `;

    if (userResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }

    const user = userResult[0];

    // 소셜 로그인 사용자는 비밀번호 변경 불가
    if (user.provider && user.provider !== 'local') {
      return res.status(400).json({
        success: false,
        error: `${user.provider === 'kakao' ? '카카오' : user.provider} 로그인 사용자는 비밀번호를 변경할 수 없습니다.`
      });
    }

    // 현재 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: '현재 비밀번호가 일치하지 않습니다.'
      });
    }

    // 새 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 비밀번호 업데이트
    await sql`
      UPDATE users
      SET password_hash = ${hashedPassword},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `;

    console.log('✅ [ChangePassword] 비밀번호 변경 성공:', user.email);

    return res.status(200).json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.'
    });

  } catch (error) {
    console.error('❌ [ChangePassword] 오류:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error.message
    });
  }
}

// JWT 인증 적용
module.exports = withAuth(handler, { requireAuth: true });

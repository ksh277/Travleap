const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const databaseUrl = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;
  const sql = neon(databaseUrl);

  const { userId } = req.query;

  try {
    console.log('🗑️ [Delete User] 사용자 삭제 요청:', userId);

    // 입력 검증
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId는 필수입니다.' });
    }

    // 사용자 ID를 숫자로 변환
    const userIdNum = parseInt(userId, 10);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ success: false, error: '유효하지 않은 userId입니다.' });
    }

    // 사용자 존재 여부 확인
    const existingUser = await sql`SELECT id, role, email FROM users WHERE id = ${userIdNum}`;

    if (existingUser.length === 0) {
      return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
    }

    const user = existingUser[0];

    // 관리자 계정은 삭제 불가
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, error: '관리자 계정은 삭제할 수 없습니다.' });
    }

    console.log(`🗑️ [Delete User] 사용자 삭제 중: ${user.email} (ID: ${userIdNum})`);

    // 사용자 삭제
    await sql`DELETE FROM users WHERE id = ${userIdNum}`;

    console.log(`✅ [Delete User] 사용자 삭제 완료: ${user.email}`);

    return res.status(200).json({
      success: true,
      data: null,
      message: '사용자가 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('❌ [Delete User] Error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);

    return res.status(500).json({
      success: false,
      error: '사용자 삭제 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

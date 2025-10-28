const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
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
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({
        success: false,
        error: '이메일과 role을 입력해주세요.'
      });
    }

    // role 검증
    const validRoles = ['user', 'vendor', 'partner', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `유효하지 않은 role입니다. (user, vendor, partner, admin 중 선택)`
      });
    }

    console.log(`🔄 [Update Role] ${email} → ${role}`);

    // 사용자 존재 확인
    const checkResult = await sql`SELECT id, email, name, role FROM users WHERE email = ${email}`;

    if (checkResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }

    const oldRole = checkResult[0].role;

    // role 업데이트
    const updateResult = await sql`
      UPDATE users
      SET role = ${role}, updated_at = CURRENT_TIMESTAMP
      WHERE email = ${email}
      RETURNING id, email, name, role
    `;

    const updatedUser = updateResult[0];

    console.log(`✅ [Update Role] 성공: ${email} | ${oldRole} → ${role}`);

    return res.status(200).json({
      success: true,
      message: `사용자 role이 ${oldRole}에서 ${role}로 변경되었습니다.`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role
      }
    });

  } catch (error) {
    console.error('❌ [Update Role] 오류:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error.message
    });
  }
};

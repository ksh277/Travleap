const { neon } = require('@neondatabase/serverless');
const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 🔒 STAGE 2 SECURITY FIX: 사용자 역할 변경 API
 * - JWT 인증 추가
 * - 관리자 권한 확인 추가
 * - Audit logging 추가
 * - IP 주소 기록 추가
 */
module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // 🔒 1. JWT 인증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('⚠️ [Update Role] 인증 토큰 없음');
      return res.status(401).json({
        success: false,
        error: '인증 토큰이 필요합니다.'
      });
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    } catch (error) {
      console.warn('⚠️ [Update Role] 유효하지 않은 토큰');
      return res.status(401).json({
        success: false,
        error: '유효하지 않은 토큰입니다.'
      });
    }

    // 🔒 2. 관리자 권한 확인
    if (decoded.role !== 'admin') {
      console.warn(`⚠️ [Update Role] 권한 없음: ${decoded.email} (role: ${decoded.role})`);
      return res.status(403).json({
        success: false,
        error: '관리자 권한이 필요합니다.'
      });
    }

    // IP 주소 추출
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] ||
               req.socket?.remoteAddress ||
               'unknown';

    const { email, role } = req.body;

    console.log(`🔄 [Update Role] 관리자 ${decoded.email} (IP: ${ip})가 역할 변경 요청: ${email} → ${role}`);

    // 3. 입력 검증
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

    // 4. Neon DB 연결
    const databaseUrl = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;

    if (!databaseUrl) {
      return res.status(500).json({
        success: false,
        error: 'Database URL not configured'
      });
    }

    const sql = neon(databaseUrl);

    // 5. 사용자 존재 확인
    const checkResult = await sql`SELECT id, email, name, role FROM users WHERE email = ${email}`;

    if (checkResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }

    const targetUser = checkResult[0];
    const oldRole = targetUser.role;

    // 6. role 업데이트
    const updateResult = await sql`
      UPDATE users
      SET role = ${role}, updated_at = CURRENT_TIMESTAMP
      WHERE email = ${email}
      RETURNING id, email, name, role
    `;

    const updatedUser = updateResult[0];

    console.log(`✅ [Update Role] 성공: ${email} | ${oldRole} → ${role}`);

    // 🔒 7. Audit Logging (PlanetScale MySQL)
    try {
      const connection = connect({ url: process.env.DATABASE_URL });

      await connection.execute(
        `INSERT INTO admin_audit_logs (
          admin_id,
          admin_email,
          action,
          target_type,
          target_id,
          details,
          ip_address,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          decoded.userId,
          decoded.email,
          'update_user_role',
          'user',
          targetUser.id,
          JSON.stringify({
            target_user_email: email,
            target_user_id: targetUser.id,
            old_role: oldRole,
            new_role: role
          }),
          ip
        ]
      );

      console.log('📝 [Update Role] Audit log 기록 완료');
    } catch (auditError) {
      // Audit logging 실패는 role 변경 성공을 막지 않음
      console.error('❌ [Update Role] Audit log 기록 실패:', auditError);
    }

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

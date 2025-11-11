const { neon } = require('@neondatabase/serverless');
const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 🔒 STAGE 2 SECURITY FIX: 사용자 삭제 API
 * - JWT 인증 추가
 * - 관리자 권한 확인 추가
 * - Audit logging 추가
 * - IP 주소 기록 추가
 */
module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { userId } = req.query;

  try {
    // 🔒 1. JWT 인증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('⚠️ [Delete User] 인증 토큰 없음');
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
      console.warn('⚠️ [Delete User] 유효하지 않은 토큰');
      return res.status(401).json({
        success: false,
        error: '유효하지 않은 토큰입니다.'
      });
    }

    // 🔒 2. 관리자 권한 확인
    if (decoded.role !== 'admin') {
      console.warn(`⚠️ [Delete User] 권한 없음: ${decoded.email} (role: ${decoded.role})`);
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

    console.log(`🗑️ [Delete User] 관리자 ${decoded.email} (IP: ${ip})가 사용자 삭제 요청:`, userId);

    // 3. 입력 검증
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId는 필수입니다.' });
    }

    const userIdNum = parseInt(userId, 10);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ success: false, error: '유효하지 않은 userId입니다.' });
    }

    // 4. Neon DB 연결
    const databaseUrl = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;
    const sql = neon(databaseUrl);

    // 5. 사용자 존재 여부 확인
    const existingUser = await sql`SELECT id, role, email FROM users WHERE id = ${userIdNum}`;

    if (existingUser.length === 0) {
      return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
    }

    const targetUser = existingUser[0];

    // 6. 관리자 계정 삭제 방지
    if (targetUser.role === 'admin') {
      console.warn(`⚠️ [Delete User] 관리자 계정 삭제 시도 차단: ${targetUser.email}`);
      return res.status(403).json({ success: false, error: '관리자 계정은 삭제할 수 없습니다.' });
    }

    console.log(`🗑️ [Delete User] 사용자 삭제 중: ${targetUser.email} (ID: ${userIdNum})`);

    // 7. 사용자 삭제
    await sql`DELETE FROM users WHERE id = ${userIdNum}`;

    console.log(`✅ [Delete User] 사용자 삭제 완료: ${targetUser.email}`);

    // 🔒 8. Audit Logging (PlanetScale MySQL)
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
          'delete_user',
          'user',
          userIdNum,
          JSON.stringify({
            deleted_user_email: targetUser.email,
            deleted_user_role: targetUser.role,
            deleted_user_id: userIdNum
          }),
          ip
        ]
      );

      console.log('📝 [Delete User] Audit log 기록 완료');
    } catch (auditError) {
      // Audit logging 실패는 사용자 삭제 성공을 막지 않음
      console.error('❌ [Delete User] Audit log 기록 실패:', auditError);
    }

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

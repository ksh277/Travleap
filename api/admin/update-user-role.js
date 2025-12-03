const { neon } = require('@neondatabase/serverless');
const { withAuth, permissions } = require('../../utils/auth-middleware.cjs');
const { withSecureCors } = require('../../utils/cors-middleware.cjs');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // 권한 체크: super_admin만 가능
  if (!permissions.isSuperAdmin(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: '최고관리자만 역할 변경이 가능합니다.'
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
    const { userId, email, role, vendorType, vendorId, partnerId } = req.body;

    // userId 또는 email 중 하나는 필수
    if (!userId && !email) {
      return res.status(400).json({
        success: false,
        error: 'userId 또는 email을 입력해주세요.'
      });
    }

    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'role을 입력해주세요.'
      });
    }

    // role 검증
    const validRoles = ['user', 'vendor', 'partner', 'admin', 'super_admin', 'md_admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `유효하지 않은 role입니다. (${validRoles.join(', ')} 중 선택)`
      });
    }

    console.log(`🔄 [Update Role] ${userId || email} → ${role}, vendorType=${vendorType || 'none'}, vendorId=${vendorId || 'none'}, partnerId=${partnerId || 'none'}`);

    // 사용자 존재 확인
    let checkResult;
    if (userId) {
      checkResult = await sql`SELECT id, email, name, role FROM users WHERE id = ${userId}`;
    } else {
      checkResult = await sql`SELECT id, email, name, role FROM users WHERE email = ${email}`;
    }

    if (checkResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }

    const user = checkResult[0];
    const oldRole = user.role;

    // 역할에 따른 추가 필드 설정
    let updateFields = { role };

    if (role === 'vendor') {
      // 벤더: vendor_type, vendor_id 설정
      updateFields.vendor_type = vendorType || null;
      updateFields.vendor_id = vendorId || null;
      updateFields.partner_id = null;  // 파트너 ID 초기화
    } else if (role === 'partner') {
      // 파트너: partner_id 설정
      updateFields.partner_id = partnerId || null;
      updateFields.vendor_type = null;  // 벤더 타입 초기화
      updateFields.vendor_id = null;    // 벤더 ID 초기화
    } else {
      // 그 외: 모든 추가 필드 초기화
      updateFields.vendor_type = null;
      updateFields.vendor_id = null;
      updateFields.partner_id = null;
    }

    // role 및 추가 필드 업데이트
    const updateResult = await sql`
      UPDATE users
      SET
        role = ${updateFields.role},
        vendor_type = ${updateFields.vendor_type},
        vendor_id = ${updateFields.vendor_id},
        partner_id = ${updateFields.partner_id},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${user.id}
      RETURNING id, email, name, role, vendor_type, vendor_id, partner_id
    `;

    const updatedUser = updateResult[0];

    console.log(`✅ [Update Role] 성공: ${user.email} | ${oldRole} → ${role}`);

    return res.status(200).json({
      success: true,
      message: `사용자 role이 ${oldRole}에서 ${role}로 변경되었습니다.`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        vendorType: updatedUser.vendor_type,
        vendorId: updatedUser.vendor_id,
        partnerId: updatedUser.partner_id
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
}

module.exports = withSecureCors(withAuth(handler, { requireAuth: true }));

/**
 * 관리자 미디어 활성화 토글 API
 * PATCH /api/admin/media/:id/toggle
 */

const { connect } = require('@planetscale/database');
const { withAuth } = require('../../../../utils/auth-middleware.cjs');
const { withPublicCors } = require('../../../../utils/cors-middleware.cjs');

async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'PATCH 요청만 허용됩니다'
    });
  }

  // 관리자 권한 확인
  const adminRoles = ['admin', 'super_admin', 'md_admin'];
  if (!req.user || !adminRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: '관리자 권한이 필요합니다'
    });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_ID',
      message: '미디어 ID가 필요합니다'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { is_active } = req.body;

    // 존재 여부 확인
    const existCheck = await connection.execute(
      'SELECT id, is_active FROM page_media WHERE id = ?',
      [id]
    );

    if (!existCheck.rows || existCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: '미디어를 찾을 수 없습니다'
      });
    }

    // 토글 또는 지정된 값으로 설정
    const newStatus = is_active !== undefined
      ? (is_active ? 1 : 0)
      : (existCheck.rows[0].is_active === 1 ? 0 : 1);

    await connection.execute(
      'UPDATE page_media SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, id]
    );

    console.log(`✅ [Admin Media] 미디어 토글: id=${id}, is_active=${newStatus}`);

    return res.status(200).json({
      success: true,
      message: newStatus ? '활성화되었습니다' : '비활성화되었습니다',
      data: { is_active: newStatus === 1 }
    });

  } catch (error) {
    console.error('❌ [Admin Media Toggle] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '서버 오류가 발생했습니다'
    });
  }
}

module.exports = withPublicCors(withAuth(handler, { requireAuth: true, requireMDAdmin: true }));

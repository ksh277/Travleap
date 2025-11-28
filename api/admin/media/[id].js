/**
 * 관리자 미디어 개별 관리 API
 * PUT /api/admin/media/:id - 미디어 수정
 * DELETE /api/admin/media/:id - 미디어 삭제
 */

const { connect } = require('@planetscale/database');
const { withAuth } = require('../../../utils/auth-middleware.cjs');
const { withPublicCors } = require('../../../utils/cors-middleware.cjs');

async function handler(req, res) {
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
    // PUT: 미디어 수정
    if (req.method === 'PUT') {
      const {
        page_name,
        section_name,
        media_type,
        media_url,
        alt_text,
        position_order,
        is_active
      } = req.body;

      // 존재 여부 확인
      const existCheck = await connection.execute(
        'SELECT id FROM page_media WHERE id = ?',
        [id]
      );

      if (!existCheck.rows || existCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: '미디어를 찾을 수 없습니다'
        });
      }

      await connection.execute(`
        UPDATE page_media
        SET
          page_name = COALESCE(?, page_name),
          section_name = COALESCE(?, section_name),
          media_type = COALESCE(?, media_type),
          media_url = COALESCE(?, media_url),
          alt_text = ?,
          position_order = COALESCE(?, position_order),
          is_active = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        page_name || null,
        section_name || null,
        media_type || null,
        media_url || null,
        alt_text || null,
        position_order !== undefined ? position_order : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id
      ]);

      console.log(`✅ [Admin Media] 미디어 수정: id=${id}`);

      return res.status(200).json({
        success: true,
        message: '미디어가 수정되었습니다'
      });
    }

    // DELETE: 미디어 삭제
    if (req.method === 'DELETE') {
      // 존재 여부 확인
      const existCheck = await connection.execute(
        'SELECT id, section_name FROM page_media WHERE id = ?',
        [id]
      );

      if (!existCheck.rows || existCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: '미디어를 찾을 수 없습니다'
        });
      }

      const mediaName = existCheck.rows[0].section_name;

      await connection.execute(
        'DELETE FROM page_media WHERE id = ?',
        [id]
      );

      console.log(`✅ [Admin Media] 미디어 삭제: id=${id}, name=${mediaName}`);

      return res.status(200).json({
        success: true,
        message: '미디어가 삭제되었습니다'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'PUT 또는 DELETE 요청만 허용됩니다'
    });

  } catch (error) {
    console.error('❌ [Admin Media] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '서버 오류가 발생했습니다'
    });
  }
}

module.exports = withPublicCors(withAuth(handler, { requireAuth: true, requireAdmin: true }));

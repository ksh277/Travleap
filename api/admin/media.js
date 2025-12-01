/**
 * 관리자 미디어 관리 API
 * GET /api/admin/media - 미디어 목록 조회
 * POST /api/admin/media - 미디어 추가
 */

const { connect } = require('@planetscale/database');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

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

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // GET: 미디어 목록 조회
    if (req.method === 'GET') {
      const result = await connection.execute(`
        SELECT
          id,
          page_name,
          section_name,
          media_type,
          media_url,
          alt_text,
          position_order,
          is_active,
          created_at,
          updated_at
        FROM page_media
        ORDER BY page_name, position_order ASC
      `);

      return res.status(200).json({
        success: true,
        data: (result.rows || []).map(row => ({
          ...row,
          is_active: row.is_active === 1
        }))
      });
    }

    // POST: 미디어 추가
    if (req.method === 'POST') {
      const {
        page_name,
        section_name,
        media_type,
        media_url,
        alt_text,
        position_order,
        is_active
      } = req.body;

      if (!page_name || !section_name || !media_url) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_FIELDS',
          message: '필수 항목을 입력해주세요 (page_name, section_name, media_url)'
        });
      }

      const result = await connection.execute(`
        INSERT INTO page_media (
          page_name,
          section_name,
          media_type,
          media_url,
          alt_text,
          position_order,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        page_name,
        section_name,
        media_type || 'image',
        media_url,
        alt_text || null,
        position_order || 0,
        is_active !== false ? 1 : 0
      ]);

      console.log(`✅ [Admin Media] 미디어 추가: ${page_name}/${section_name}`);

      return res.status(201).json({
        success: true,
        message: '미디어가 추가되었습니다',
        data: { insertId: result.insertId }
      });
    }

    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'GET 또는 POST 요청만 허용됩니다'
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

module.exports = withPublicCors(withAuth(handler, { requireAuth: true, requireMDAdmin: true }));

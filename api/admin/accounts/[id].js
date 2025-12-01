/**
 * 계정 상세 관리 API
 * GET /api/admin/accounts/[id] - 계정 상세 조회
 * DELETE /api/admin/accounts/[id] - 계정 삭제
 */

const { Pool } = require('@neondatabase/serverless');
const { withAuth } = require('../../../utils/auth-middleware.cjs');
const { withPublicCors } = require('../../../utils/cors-middleware.cjs');

// Neon PostgreSQL connection
let pool;
function getPool() {
  if (!pool) {
    const connectionString = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL not configured');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

async function handler(req, res) {
  // 관리자 권한 확인
  const adminRoles = ['super_admin', 'admin'];
  if (!req.user || !adminRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: '최고관리자 권한이 필요합니다'
    });
  }

  const db = getPool();

  // URL에서 ID 추출
  const urlParts = req.url.split('/');
  const accountId = urlParts[urlParts.length - 1].split('?')[0];

  if (!accountId || isNaN(parseInt(accountId))) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_ID',
      message: '유효하지 않은 계정 ID입니다'
    });
  }

  // GET: 계정 상세 조회
  if (req.method === 'GET') {
    try {
      const result = await db.query(`
        SELECT
          id, username, email, name, role, phone,
          partner_id, vendor_id, vendor_type,
          is_active, created_at, updated_at
        FROM users
        WHERE id = $1
      `, [accountId]);

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: '계정을 찾을 수 없습니다'
        });
      }

      return res.status(200).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('계정 상세 조회 오류:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // DELETE: 계정 삭제
  if (req.method === 'DELETE') {
    try {
      // 자기 자신은 삭제 불가
      if (parseInt(accountId) === req.user.userId) {
        return res.status(400).json({
          success: false,
          error: 'SELF_DELETE',
          message: '자기 자신의 계정은 삭제할 수 없습니다'
        });
      }

      // 계정 존재 확인
      const existingUser = await db.query(
        'SELECT id, username, role FROM users WHERE id = $1',
        [accountId]
      );

      if (!existingUser.rows || existingUser.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: '계정을 찾을 수 없습니다'
        });
      }

      const targetUser = existingUser.rows[0];

      // super_admin 삭제는 super_admin만 가능
      if (targetUser.role === 'super_admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: '최고관리자 계정은 다른 최고관리자만 삭제할 수 있습니다'
        });
      }

      // 계정 삭제 (또는 비활성화)
      await db.query('DELETE FROM users WHERE id = $1', [accountId]);

      console.log(`✅ [Accounts] 계정 삭제: ${targetUser.username} (by ${req.user.username})`);

      return res.status(200).json({
        success: true,
        message: '계정이 삭제되었습니다'
      });

    } catch (error) {
      console.error('❌ 계정 삭제 오류:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}

module.exports = withPublicCors(withAuth(handler, { requireAuth: true, requireAdmin: true }));

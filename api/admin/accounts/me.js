/**
 * 내 계정 수정 API
 * PUT /api/admin/accounts/me - 자기 계정 이메일/비밀번호 수정
 */

const { Pool } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
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
  // 로그인 확인
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: '로그인이 필요합니다'
    });
  }

  const db = getPool();
  const userId = req.user.userId;

  // PUT: 내 계정 정보 수정
  if (req.method === 'PUT') {
    try {
      const { email, currentPassword, newPassword } = req.body;

      // 현재 사용자 정보 조회
      const userResult = await db.query(
        'SELECT id, email, password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (!userResult.rows || userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: '사용자를 찾을 수 없습니다'
        });
      }

      const currentUser = userResult.rows[0];
      const updates = [];
      const values = [];
      let paramIndex = 1;

      // 이메일 변경
      if (email && email !== currentUser.email) {
        // 이메일 중복 확인
        const emailCheck = await db.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email, userId]
        );

        if (emailCheck.rows && emailCheck.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: 'EMAIL_EXISTS',
            message: '이미 사용중인 이메일입니다'
          });
        }

        updates.push(`email = $${paramIndex++}`);
        values.push(email);
      }

      // 비밀번호 변경
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({
            success: false,
            error: 'CURRENT_PASSWORD_REQUIRED',
            message: '현재 비밀번호를 입력해주세요'
          });
        }

        // 현재 비밀번호 확인
        const isValidPassword = await bcrypt.compare(currentPassword, currentUser.password_hash);
        if (!isValidPassword) {
          return res.status(400).json({
            success: false,
            error: 'INVALID_PASSWORD',
            message: '현재 비밀번호가 올바르지 않습니다'
          });
        }

        if (newPassword.length < 6) {
          return res.status(400).json({
            success: false,
            error: 'PASSWORD_TOO_SHORT',
            message: '새 비밀번호는 6자 이상이어야 합니다'
          });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        updates.push(`password_hash = $${paramIndex++}`);
        values.push(hashedPassword);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'NO_CHANGES',
          message: '변경할 내용이 없습니다'
        });
      }

      // updated_at 추가
      updates.push(`updated_at = NOW()`);

      // 업데이트 실행
      values.push(userId);
      await db.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
      );

      console.log(`✅ [Accounts] 계정 정보 수정: user_id=${userId}`);

      return res.status(200).json({
        success: true,
        message: '계정 정보가 수정되었습니다'
      });

    } catch (error) {
      console.error('❌ 내 계정 수정 오류:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // GET: 내 계정 정보 조회
  if (req.method === 'GET') {
    try {
      const result = await db.query(`
        SELECT
          id, username, email, name, role, phone,
          partner_id, vendor_id, vendor_type,
          is_active, created_at, updated_at
        FROM users
        WHERE id = $1
      `, [userId]);

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: '사용자를 찾을 수 없습니다'
        });
      }

      return res.status(200).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('내 계정 조회 오류:', error);
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

module.exports = withPublicCors(withAuth(handler, { requireAuth: true }));

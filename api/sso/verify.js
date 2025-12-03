/**
 * SSO 토큰 검증 API
 * POST /api/sso/verify
 *
 * 다른 사이트(PINTO)에서 온 SSO 토큰을 검증하고 로그인 처리
 */

const jwt = require('jsonwebtoken');
const { Pool } = require('@neondatabase/serverless');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

const SSO_SECRET = process.env.SSO_SECRET || process.env.JWT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;

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
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'SSO 토큰이 필요합니다.'
      });
    }

    // SSO 토큰 검증
    let decoded;
    try {
      decoded = jwt.verify(token, SSO_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'SSO 토큰이 만료되었습니다.'
        });
      }
      return res.status(401).json({
        success: false,
        error: '유효하지 않은 SSO 토큰입니다.'
      });
    }

    // 타겟 검증 (travleap으로 오는 토큰인지)
    if (decoded.target !== 'travleap') {
      return res.status(400).json({
        success: false,
        error: '이 토큰은 Travleap용이 아닙니다.'
      });
    }

    // DB에서 사용자 조회 (같은 DB 사용하므로 사용자 존재 확인)
    const db = getPool();
    const result = await db.query(
      'SELECT id, email, username, name, role, phone FROM users WHERE id = $1 OR email = $2',
      [decoded.user_id, decoded.email]
    );

    let user;
    if (result.rows && result.rows.length > 0) {
      user = result.rows[0];
    } else {
      // 사용자가 없으면 에러 (같은 DB 사용하므로 있어야 함)
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다.'
      });
    }

    // Travleap용 JWT 토큰 생성
    const authToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ [SSO Verify] ${user.email} from ${decoded.source} → travleap 로그인 성공`);

    return res.status(200).json({
      success: true,
      data: {
        token: authToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          role: user.role
        },
        redirect_path: decoded.redirect_path || '/'
      }
    });

  } catch (error) {
    console.error('❌ [SSO Verify] Error:', error);
    return res.status(500).json({
      success: false,
      error: '토큰 검증 중 오류가 발생했습니다.'
    });
  }
}

module.exports = withPublicCors(handler);

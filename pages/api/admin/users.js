const { Pool } = require('@neondatabase/serverless');
const { withAuth } = require('../utils/auth-middleware.cjs');
const { withSecureCors } = require('../utils/cors-middleware.cjs');
const { withStandardRateLimit } = require('../utils/rate-limit-middleware.cjs');

// Neon PostgreSQL connection (users 테이블은 Neon에 있음)
let pool;
function getPool() {
  if (!pool) {
    const connectionString = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('POSTGRES_DATABASE_URL not configured');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

async function handler(req, res) {
  // 관리자 권한 확인
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '관리자 권한이 필요합니다.'
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('👥 [Admin Users] API 호출 시작');
    console.log('📍 POSTGRES_DATABASE_URL 존재:', !!process.env.POSTGRES_DATABASE_URL);
    console.log('📍 DATABASE_URL 존재:', !!process.env.DATABASE_URL);

    // 페이지네이션 파라미터
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    console.log(`📄 [Admin Users] 페이지네이션: page=${page}, limit=${limit}, offset=${offset}`);

    const db = getPool();
    console.log('✅ [Admin Users] Pool 연결 성공');

    // 총 사용자 수 조회
    const countResult = await db.query('SELECT COUNT(*) as total FROM users');
    const total = parseInt(countResult.rows[0]?.total) || 0;

    // Neon PostgreSQL은 .rows 사용
    const result = await db.query(`
      SELECT
        id, email, name, role, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    console.log(`✅ [Admin Users] 총 ${total}명 중 ${result.rows?.length || 0}명 조회 완료 (${page} 페이지)`);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: result.rows || [],
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages
      }
    });
  } catch (error) {
    console.error('❌ [Admin Users] Error fetching users:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);

    // 에러 시 빈 배열 반환 (200 상태로)
    return res.status(200).json({
      success: true,
      data: [],
      pagination: {
        page: 1,
        limit: 0,
        total: 0,
        total_pages: 0
      },
      error: error.message,
      _debug: {
        hasPostgresUrl: !!process.env.POSTGRES_DATABASE_URL,
        hasDatabaseUrl: !!process.env.DATABASE_URL
      }
    });
  }
}

// 올바른 미들웨어 순서: CORS → RateLimit → Auth
module.exports = withSecureCors(
  withStandardRateLimit(
    withAuth(handler, { requireAuth: true, requireAdmin: true })
  )
);

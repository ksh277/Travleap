const { Pool } = require('@neondatabase/serverless');
const { connect } = require('@planetscale/database');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

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

// PlanetScale connection (partners, listings 테이블은 PlanetScale에 있음)
function getPlanetScaleConnection() {
  return connect({ url: process.env.DATABASE_URL });
}

async function handler(req, res) {
  // CORS handled by middleware

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // PUT: 사용자 역할 및 연결 정보 업데이트
  if (req.method === 'PUT') {
    try {
      const { userId, role, vendorType, vendorCategory, listingId, partnerId } = req.body;

      if (!userId) {
        return res.status(400).json({ success: false, error: 'userId is required' });
      }

      // 유효한 역할인지 확인
      const validRoles = ['user', 'vendor', 'partner', 'md_admin', 'admin', 'super_admin'];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ success: false, error: 'Invalid role' });
      }

      const db = getPool();
      const updates = [];
      const values = [];
      let paramIndex = 1;

      // 역할 업데이트
      if (role) {
        updates.push(`role = $${paramIndex++}`);
        values.push(role);
      }

      // 벤더 타입 업데이트 (stay, rental, food, tour 등)
      if (role === 'vendor' && vendorType) {
        updates.push(`vendor_type = $${paramIndex++}`);
        values.push(vendorType);
      } else if (role !== 'vendor') {
        // 벤더가 아니면 vendor 관련 필드 초기화
        updates.push(`vendor_type = NULL`);
        updates.push(`vendor_id = NULL`);
      }

      // 벤더 ID (listing_id) 업데이트
      if (role === 'vendor' && listingId) {
        updates.push(`vendor_id = $${paramIndex++}`);
        values.push(listingId);
      }

      // 파트너 ID 업데이트
      if (role === 'partner' && partnerId) {
        updates.push(`partner_id = $${paramIndex++}`);
        values.push(partnerId);
      } else if (role !== 'partner') {
        updates.push(`partner_id = NULL`);
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No updates provided' });
      }

      updates.push(`updated_at = NOW()`);
      values.push(userId);

      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
      console.log('📝 [Admin Users] Update query:', query, values);

      await db.query(query, values);

      console.log(`✅ [Admin Users] 사용자 ${userId} 역할 업데이트 완료: role=${role}`);

      return res.status(200).json({
        success: true,
        message: '사용자 정보가 업데이트되었습니다'
      });
    } catch (error) {
      console.error('❌ [Admin Users] Update error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('👥 [Admin Users] API 호출 시작');
    console.log('📍 POSTGRES_DATABASE_URL 존재:', !!process.env.POSTGRES_DATABASE_URL);
    console.log('📍 DATABASE_URL 존재:', !!process.env.DATABASE_URL);

    const db = getPool();
    console.log('✅ [Admin Users] Pool 연결 성공');

    // Neon PostgreSQL은 .rows 사용
    const result = await db.query(`
      SELECT
        id, email, name, phone, role, vendor_type, vendor_id, partner_id, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `);

    console.log(`✅ [Admin Users] ${result.rows?.length || 0}명 조회 완료`);

    const total = result.rows?.length || 0;
    return res.status(200).json({
      success: true,
      data: result.rows || [],
      pagination: {
        page: 1,
        limit: total,
        total: total,
        total_pages: 1
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

module.exports = withPublicCors(withAuth(handler, { requireSuperAdmin: true }));

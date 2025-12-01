/**
 * 계정 관리 API
 * GET /api/admin/accounts - 계정 목록 조회
 * POST /api/admin/accounts - 계정 생성
 * DELETE /api/admin/accounts/[id] - 계정 삭제
 */

const { Pool } = require('@neondatabase/serverless');
const { connect } = require('@planetscale/database');
const bcrypt = require('bcryptjs');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

// Neon PostgreSQL connection (users)
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
  const planetscale = connect({ url: process.env.DATABASE_URL });

  // GET: 계정 목록 조회
  if (req.method === 'GET') {
    try {
      // Neon에서 사용자 목록 조회
      const result = await db.query(`
        SELECT
          id, username, email, name, role, phone,
          partner_id, vendor_id, vendor_type,
          is_active, created_at
        FROM users
        WHERE role IN ('super_admin', 'admin', 'md_admin', 'partner', 'vendor')
        ORDER BY
          CASE role
            WHEN 'super_admin' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'md_admin' THEN 3
            WHEN 'partner' THEN 4
            WHEN 'vendor' THEN 5
          END,
          created_at DESC
      `);

      return res.status(200).json({
        success: true,
        data: result.rows || []
      });
    } catch (error) {
      console.error('계정 목록 조회 오류:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // POST: 계정 생성
  if (req.method === 'POST') {
    try {
      const {
        username,
        email,
        password,
        name,
        phone,
        role,
        // 파트너
        business_name,
        business_address,
        services,
        // 벤더
        vendor_type,
        contact_email,
        contact_phone
      } = req.body;

      // 필수값 검증
      if (!username || !email || !password || !name || !role) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_FIELDS',
          message: '필수 항목을 모두 입력해주세요'
        });
      }

      // 아이디 형식 검증
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_USERNAME',
          message: '아이디는 영문, 숫자, 언더스코어(_)만 사용 가능하며 3-20자여야 합니다'
        });
      }

      // 중복 확인
      const existingUser = await db.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existingUser.rows && existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'DUPLICATE',
          message: '이미 사용중인 아이디 또는 이메일입니다'
        });
      }

      // 비밀번호 해시화
      const hashedPassword = await bcrypt.hash(password, 10);

      let partnerId = null;
      let vendorId = null;

      // 파트너 계정인 경우 partners 테이블에도 추가
      if (role === 'partner' && business_name) {
        const partnerResult = await planetscale.execute(`
          INSERT INTO partners (
            business_name, email, phone, business_address, services,
            status, is_active, is_coupon_partner, created_at
          ) VALUES (?, ?, ?, ?, ?, 'approved', TRUE, TRUE, NOW())
        `, [business_name, email, phone, business_address || '', services || '']);

        partnerId = partnerResult.insertId;
      }

      // 벤더 계정인 경우 해당 벤더 테이블에도 추가
      if (role === 'vendor' && vendor_type && business_name) {
        if (vendor_type === 'rentcar') {
          const vendorResult = await planetscale.execute(`
            INSERT INTO rentcar_vendors (
              business_name, contact_email, contact_phone, status, created_at
            ) VALUES (?, ?, ?, 'active', NOW())
          `, [business_name, contact_email || email, contact_phone || phone]);

          vendorId = vendorResult.insertId;
        }
        // 다른 벤더 유형도 필요시 추가
      }

      // 사용자 생성
      const result = await db.query(`
        INSERT INTO users (
          username, email, password_hash, name, phone, role,
          partner_id, vendor_id, vendor_type, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, NOW(), NOW())
        RETURNING id, username, email, name, role
      `, [username, email, hashedPassword, name, phone || null, role, partnerId, vendorId, vendor_type || null]);

      const newUser = result.rows[0];

      console.log(`✅ [Accounts] 계정 생성 완료: ${username} (${role})`);

      return res.status(201).json({
        success: true,
        data: newUser,
        message: '계정이 생성되었습니다'
      });

    } catch (error) {
      console.error('❌ 계정 생성 오류:', error);
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

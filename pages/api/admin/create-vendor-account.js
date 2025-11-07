const { connect } = require('@planetscale/database');
const bcrypt = require('bcryptjs');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withSecureCors } = require('../../utils/cors-middleware.cjs');
const { withStandardRateLimit } = require('../../utils/rate-limit-middleware.cjs');

async function handler(req, res) {
  // 관리자 권한 확인
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '관리자 권한이 필요합니다.'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const {
      email,
      password,
      name,
      phone,
      vendor_type, // 'rentcar' or 'lodging'
      business_name,
      business_registration_number
    } = req.body;

    if (!email || !password || !vendor_type) {
      return res.status(400).json({
        error: '필수 항목을 입력해주세요 (email, password, vendor_type)'
      });
    }

    // 1. Check if email already exists
    const existingUser = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ error: '이미 등록된 이메일입니다' });
    }

    // 2. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create user with role 'vendor'
    const userResult = await connection.execute(
      `INSERT INTO users (email, password_hash, name, phone, role, created_at)
       VALUES (?, ?, ?, ?, 'vendor', NOW())`,
      [email, hashedPassword, name || '벤더', phone || '']
    );

    const userId = userResult.insertId;

    // 4. Create vendor entry based on type
    let vendorId;

    if (vendor_type === 'rentcar') {
      // Create rentcar vendor
      const vendorResult = await connection.execute(
        `INSERT INTO rentcar_vendors
         (user_id, business_name, business_registration_number, brand_name, contact_phone, contact_email, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())`,
        [
          userId,
          business_name || '렌트카 업체',
          business_registration_number || '',
          business_name || '렌트카 업체',
          phone || '',
          email
        ]
      );
      vendorId = vendorResult.insertId;

    } else if (vendor_type === 'lodging') {
      // Create lodging vendor (partner)
      const vendorResult = await connection.execute(
        `INSERT INTO partners
         (email, business_name, business_registration_number, contact_name, contact_phone, contact_email, category, tier, is_verified, is_active, partner_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'lodging', 'standard', 1, 1, 'lodging', NOW())`,
        [
          email,
          business_name || '숙박 업체',
          business_registration_number || '',
          name || '담당자',
          phone || '',
          email
        ]
      );
      vendorId = vendorResult.insertId;
    } else {
      return res.status(400).json({
        error: 'vendor_type은 "rentcar" 또는 "lodging"이어야 합니다'
      });
    }

    return res.status(201).json({
      success: true,
      message: `${vendor_type} 벤더 계정이 생성되었습니다`,
      data: {
        user_id: userId,
        vendor_id: vendorId,
        email,
        vendor_type,
        role: 'vendor'
      }
    });

  } catch (error) {
    console.error('[Create Vendor Account Error]', error);
    return res.status(500).json({
      error: '벤더 계정 생성 중 오류가 발생했습니다',
      details: error.message
    });
  }
}

// 올바른 미들웨어 순서: CORS → RateLimit → Auth
module.exports = withSecureCors(
  withStandardRateLimit(
    withAuth(handler, { requireAuth: true, requireAdmin: true })
  )
);

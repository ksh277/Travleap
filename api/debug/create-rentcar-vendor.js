/**
 * 디버깅용 API - 렌트카 업체 생성
 * GET /api/debug/create-rentcar-vendor
 *
 * 생성:
 * 1. Neon PostgreSQL users 테이블 - 벤더 계정
 * 2. PlanetScale partners 테이블 - 렌트카 파트너 (partner_type='rentcar')
 */

const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const planetscale = connect({ url: process.env.DATABASE_URL });
  const neonPool = new Pool({
    connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
  });

  try {
    console.log('🚗 [Create Rentcar] Starting rentcar vendor creation...');

    // 1. Neon PostgreSQL에 벤더 계정 생성
    console.log('   Creating vendor account in Neon...');

    const email = `rentcar.test.${Date.now()}@travleap.com`;
    const password = 'rentcar1234!';
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `rentcar_${Date.now()}`;

    const userResult = await neonPool.query(`
      INSERT INTO users (user_id, email, password_hash, name, phone, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, email, name, role
    `, [
      userId,
      email,
      hashedPassword,
      '신안 렌터카',
      '010-1234-5678',
      'vendor'
    ]);

    const newUserId = userResult.rows[0].id;
    console.log('   ✅ Vendor account created:', newUserId, email);

    // 2. PlanetScale partners 테이블에 렌트카 파트너 생성
    console.log('   Creating rentcar partner in PlanetScale...');

    const partnerResult = await planetscale.execute(`
      INSERT INTO partners (
        user_id,
        partner_type,
        business_name,
        contact_name,
        email,
        phone,
        description,
        business_address,
        location,
        status,
        is_active,
        tier,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      newUserId,
      'rentcar',
      '신안 렌터카',
      '김렌트',
      email,
      '010-1234-5678',
      '신안군 최고의 렌터카 서비스를 제공합니다. 다양한 차량과 합리적인 가격으로 여행의 즐거움을 더해드립니다.',
      '전라남도 신안군 압해읍 천사로 1004',
      '전남 신안군',
      'approved',
      1,
      'bronze'
    ]);

    const partnerId = partnerResult.insertId;
    console.log('   ✅ Rentcar partner created:', partnerId);

    // 3. 계정 정보 정리
    const accountInfo = {
      partnerId: partnerId,
      userId: newUserId,
      email: email,
      password: password, // 테스트용이므로 평문 반환
      businessName: '신안 렌터카',
      contactName: '김렌트',
      phone: '010-1234-5678',
      role: 'vendor',
      status: 'approved'
    };

    console.log('✅ [Create Rentcar] Vendor creation completed');

    await neonPool.end();

    return res.status(200).json({
      success: true,
      message: 'Rentcar vendor created successfully',
      account: accountInfo,
      loginUrl: 'https://travleap.vercel.app/login',
      adminUrl: 'https://travleap.vercel.app/admin'
    });

  } catch (error) {
    console.error('❌ [Create Rentcar] Error:', error);
    try {
      await neonPool.end();
    } catch (e) {}

    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.toString()
    });
  }
};

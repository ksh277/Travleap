/**
 * 디버깅용 API - 숙박업체 생성
 * GET /api/debug/create-accommodation-vendor
 *
 * 생성:
 * 1. Neon PostgreSQL users 테이블 - 벤더 계정
 * 2. PlanetScale partners 테이블 - 숙박 파트너 (partner_type='lodging')
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
    console.log('🏨 [Create Accommodation] Starting accommodation vendor creation...');

    // 1. Neon PostgreSQL에 벤더 계정 생성
    console.log('   Creating vendor account in Neon...');

    const email = `accommodation.test.${Date.now()}@travleap.com`;
    const password = 'accommodation1234!';
    const hashedPassword = await bcrypt.hash(password, 10);
    const username = `accommodation_${Date.now()}`;

    const userResult = await neonPool.query(`
      INSERT INTO users (username, email, password_hash, name, phone, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, email, name, role
    `, [
      username,
      email,
      hashedPassword,
      '제주 오션뷰 호텔',
      '010-2345-6789',
      'vendor'
    ]);

    const newUserId = userResult.rows[0].id;
    console.log('   ✅ Vendor account created:', newUserId, email);

    // 2. PlanetScale partners 테이블에 숙박 파트너 생성
    console.log('   Creating accommodation partner in PlanetScale...');

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
      'lodging',
      '제주 오션뷰 호텔',
      '김호텔',
      email,
      '010-2345-6789',
      '제주도 최고의 오션뷰를 자랑하는 럭셔리 호텔입니다. 모든 객실에서 아름다운 바다를 감상하실 수 있습니다.',
      '제주특별자치도 제주시 해안로 100',
      '제주 제주시',
      'approved',
      1,
      'bronze'
    ]);

    const partnerId = partnerResult.insertId;
    console.log('   ✅ Accommodation partner created:', partnerId);

    // 3. 계정 정보 정리
    const accountInfo = {
      partnerId: partnerId,
      userId: newUserId,
      email: email,
      password: password, // 테스트용이므로 평문 반환
      businessName: '제주 오션뷰 호텔',
      contactName: '김호텔',
      phone: '010-2345-6789',
      role: 'vendor',
      status: 'approved',
      partnerType: 'lodging'
    };

    console.log('✅ [Create Accommodation] Vendor creation completed');

    await neonPool.end();

    return res.status(200).json({
      success: true,
      message: 'Accommodation vendor created successfully',
      account: accountInfo,
      loginUrl: 'https://travleap.com/login',
      dashboardUrl: 'https://travleap.com/vendor/lodging'
    });

  } catch (error) {
    console.error('❌ [Create Accommodation] Error:', error);
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

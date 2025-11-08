require('dotenv').config();
const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

async function createVendorAccount() {
  const conn = connect({ url: process.env.DATABASE_URL });
  const neonPool = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL });

  console.log('👤 숙박업체 벤더 계정 생성...\n');

  try {
    // 1. 생성된 숙박업체 확인
    const partnerResult = await conn.execute(`
      SELECT id, business_name, email, contact_name
      FROM partners
      WHERE partner_type = 'lodging'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (!partnerResult.rows || partnerResult.rows.length === 0) {
      console.log('❌ 숙박업체를 찾을 수 없습니다.');
      return;
    }

    const partner = partnerResult.rows[0];
    console.log(`✅ 숙박업체: ${partner.business_name} (ID: ${partner.id})\n`);

    // 2. 벤더 계정 정보
    const vendorUsername = 'testhotel';
    const vendorEmail = 'vendor@testhotel.com';
    const vendorPassword = 'test1234';
    const hashedPassword = await bcrypt.hash(vendorPassword, 10);

    // 3. Neon DB에 사용자 생성 (이미 있는지 확인)
    const existingUser = await neonPool.query(
      'SELECT id FROM users WHERE email = $1',
      [vendorEmail]
    );

    let userId;
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      console.log(`기존 사용자 사용: ID ${userId}`);
    } else {
      const userResult = await neonPool.query(`
        INSERT INTO users (username, email, password_hash, name, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'vendor', NOW(), NOW())
        RETURNING id
      `, [vendorUsername, vendorEmail, hashedPassword, partner.contact_name || partner.business_name]);

      userId = userResult.rows[0].id;
      console.log(`✅ 벤더 계정 생성 완료 - User ID: ${userId}`);
    }

    // 4. 파트너의 user_id 업데이트
    await conn.execute(
      'UPDATE partners SET user_id = ? WHERE id = ?',
      [userId, partner.id]
    );

    console.log(`✅ 파트너에 user_id 연결 완료\n`);

    // 5. 계정 정보 출력
    console.log('=== 벤더 계정 정보 ===');
    console.log(`사용자명: ${vendorUsername}`);
    console.log(`이메일: ${vendorEmail}`);
    console.log(`비밀번호: ${vendorPassword}`);
    console.log(`역할: vendor`);
    console.log(`\n=== 연결된 업체 정보 ===`);
    console.log(`업체명: ${partner.business_name}`);
    console.log(`파트너 ID: ${partner.id}`);
    console.log(`\n🌐 로그인: https://travelap.vercel.app/vendor/login`);
    console.log(`📊 대시보드: https://travelap.vercel.app/vendor/dashboard`);

  } catch (error) {
    console.error('❌ 오류:', error);
    throw error;
  } finally {
    await neonPool.end();
  }
}

createVendorAccount()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

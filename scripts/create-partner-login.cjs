const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createPartnerLogins() {
  const connectionPS = connect({ url: process.env.DATABASE_URL });
  const poolNeon = new Pool({
    connectionString: process.env.POSTGRES_DATABASE_URL
  });

  // 테스트 파트너 계정 정보
  const partners = [
    {
      id: 261,
      email: 'partner1@test.com',
      password: 'partner1234',
      name: '신안 맛집 사장님'
    },
    {
      id: 262,
      email: 'partner2@test.com',
      password: 'partner1234',
      name: '증도 펜션 사장님'
    },
    {
      id: 263,
      email: 'partner3@test.com',
      password: 'partner1234',
      name: '신안 투어 사장님'
    }
  ];

  try {
    console.log('=== 파트너 계정 생성 시작 ===\n');

    for (const partner of partners) {
      // 1. Neon에 사용자 생성
      const hashedPassword = await bcrypt.hash(partner.password, 10);

      // 기존 사용자 확인
      const existingUser = await poolNeon.query(
        'SELECT id FROM users WHERE email = $1',
        [partner.email]
      );

      let userId;
      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
        console.log(`${partner.email} - 기존 사용자 사용 (ID: ${userId})`);
      } else {
        // username 생성 (이메일에서 @ 앞부분)
        const username = partner.email.split('@')[0];
        const userResult = await poolNeon.query(
          `INSERT INTO users (email, password_hash, name, role, username)
           VALUES ($1, $2, $3, 'partner', $4)
           RETURNING id`,
          [partner.email, hashedPassword, partner.name, username]
        );
        userId = userResult.rows[0].id;
        console.log(`${partner.email} - 새 사용자 생성 (ID: ${userId})`);
      }

      // 2. PlanetScale partners 테이블 업데이트
      await connectionPS.execute(
        `UPDATE partners
         SET user_id = ?, partner_email = ?
         WHERE id = ?`,
        [userId, partner.email, partner.id]
      );

      console.log(`   → Partner ID ${partner.id}에 연결 완료\n`);
    }

    console.log('\n=== 완료! 테스트 계정 정보 ===');
    console.log('');
    partners.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.name}`);
      console.log(`   이메일: ${p.email}`);
      console.log(`   비밀번호: ${p.password}`);
      console.log('');
    });

  } catch (error) {
    console.error('오류:', error);
  } finally {
    await poolNeon.end();
  }
}

createPartnerLogins();

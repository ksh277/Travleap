/**
 * 파트너 계정 role 확인
 */

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function check() {
  const sql = neon(process.env.POSTGRES_DATABASE_URL);

  // 파트너 테스트 계정 확인
  const users = await sql`
    SELECT id, email, role FROM users
    WHERE email LIKE '%partner%' OR role = 'partner'
    ORDER BY id
  `;

  console.log('=== 파트너 관련 계정 ===');
  users.forEach(u => {
    console.log(`ID: ${u.id} | ${u.email} | role: ${u.role}`);
  });

  if (users.length === 0) {
    console.log('파트너 계정이 없습니다');
  }
}

check().catch(console.error);

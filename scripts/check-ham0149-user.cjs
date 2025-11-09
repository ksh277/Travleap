const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
  const sql = neon(process.env.POSTGRES_DATABASE_URL);
  
  console.log('🔍 ham0149@nate.com 사용자 확인...\n');
  
  const users = await sql`
    SELECT id, email, name, provider, provider_id
    FROM users
    WHERE email = 'ham0149@nate.com'
  `;
  
  if (users.length === 0) {
    console.log('❌ Neon에 ham0149@nate.com이 없습니다!');
  } else {
    console.log('✅ Neon에서 발견:');
    console.log('   ID:', users[0].id);
    console.log('   Email:', users[0].email);
    console.log('   Name:', users[0].name);
    console.log('   Provider:', users[0].provider || '일반 로그인');
  }
  
  // JWT userId로도 확인
  console.log('\n🔍 ID 74로 확인...\n');
  const byId = await sql`SELECT id, email FROM users WHERE id = 74`;
  if (byId.length === 0) {
    console.log('❌ ID 74 없음');
  } else {
    console.log('✅ ID 74:', byId[0].email);
  }
}

check().catch(console.error);

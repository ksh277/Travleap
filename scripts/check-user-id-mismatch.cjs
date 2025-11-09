const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
  const sql = neon(process.env.POSTGRES_DATABASE_URL);
  
  console.log('🔍 Neon DB에서 ham5752@naver.com 검색...\n');
  
  // 이메일로 사용자 찾기
  const users = await sql`
    SELECT id, email, name, provider, provider_id, created_at
    FROM users
    WHERE email = 'ham5752@naver.com'
  `;
  
  if (users.length === 0) {
    console.log('❌ Neon에 ham5752@naver.com이 없습니다!');
    return;
  }
  
  console.log('✅ Neon에서 발견됨:');
  users.forEach(user => {
    console.log('');
    console.log('  ID:', user.id, '(타입:', typeof user.id + ')');
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  Provider:', user.provider || '일반 로그인');
    console.log('  Provider ID:', user.provider_id || 'N/A');
    console.log('  Created:', user.created_at);
  });
  
  // ID 1363으로 직접 조회
  console.log('\n🔍 ID 1363으로 직접 조회...\n');
  const userById = await sql`
    SELECT id, email, name, provider
    FROM users
    WHERE id = 1363
  `;
  
  if (userById.length === 0) {
    console.log('❌ Neon에 ID 1363인 사용자가 없습니다!');
    console.log('   → JWT 토큰의 userId(1363)와 Neon의 실제 ID가 불일치!');
  } else {
    console.log('✅ ID 1363 발견:', userById[0]);
  }
}

check().catch(console.error);

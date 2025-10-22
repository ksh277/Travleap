/**
 * Neon DB에서 manager@shinan.com 계정 확인
 */

const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function checkUserInNeon() {
  try {
    console.log('🔍 Neon DB에서 manager@shinan.com 계정 찾기...\n');

    const sql = neon(process.env.POSTGRES_DATABASE_URL);

    // users 테이블 존재 여부 확인
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'users'
    `;

    if (tables.length === 0) {
      console.log('❌ Neon DB에 users 테이블이 없습니다.\n');
      return;
    }

    console.log('✅ users 테이블 존재\n');

    // manager@shinan.com 계정 찾기
    const managerUser = await sql`
      SELECT id, email, name, role, created_at
      FROM users
      WHERE email = 'manager@shinan.com'
    `;

    if (managerUser.length > 0) {
      console.log('✅ Neon DB에서 찾음!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 계정 정보 (Neon PostgreSQL):');
      console.log(`   ID: ${managerUser[0].id}`);
      console.log(`   Email: ${managerUser[0].email}`);
      console.log(`   Name: ${managerUser[0].name}`);
      console.log(`   Role: ${managerUser[0].role}`);
      console.log(`   Created: ${managerUser[0].created_at}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.log('❌ Neon DB에 manager@shinan.com 없음\n');
    }

    // 전체 사용자 수 확인
    const totalUsers = await sql`SELECT COUNT(*) as count FROM users`;
    console.log(`📊 Neon DB 전체 사용자 수: ${totalUsers[0].count}명\n`);

    // 처음 5개 계정 샘플
    const sampleUsers = await sql`
      SELECT id, email, name, role
      FROM users
      ORDER BY id
      LIMIT 5
    `;

    console.log('📋 샘플 사용자 (처음 5명):');
    sampleUsers.forEach(u => {
      console.log(`   - ${u.email} (${u.role})`);
    });
    console.log();

  } catch (error) {
    console.error('\n❌ 오류:', error.message);
  }
}

checkUserInNeon().then(() => process.exit(0));

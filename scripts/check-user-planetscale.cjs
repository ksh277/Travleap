/**
 * PlanetScale DB에서 manager@shinan.com 계정 확인
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkUserInPlanetScale() {
  try {
    console.log('🔍 PlanetScale DB에서 manager@shinan.com 계정 찾기...\n');

    const connection = connect({ url: process.env.DATABASE_URL });

    // users 테이블 존재 여부 확인
    const tables = await connection.execute(
      `SHOW TABLES LIKE 'users'`
    );

    if (tables.rows.length === 0) {
      console.log('❌ PlanetScale DB에 users 테이블이 없습니다.\n');
      return;
    }

    console.log('✅ users 테이블 존재\n');

    // manager@shinan.com 계정 찾기
    const managerUser = await connection.execute(
      `SELECT id, email, name, role, created_at
       FROM users
       WHERE email = ?`,
      ['manager@shinan.com']
    );

    if (managerUser.rows.length > 0) {
      console.log('✅ PlanetScale DB에서 찾음!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 계정 정보 (PlanetScale MySQL):');
      console.log(`   ID: ${managerUser.rows[0].id}`);
      console.log(`   Email: ${managerUser.rows[0].email}`);
      console.log(`   Name: ${managerUser.rows[0].name}`);
      console.log(`   Role: ${managerUser.rows[0].role}`);
      console.log(`   Created: ${managerUser.rows[0].created_at}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.log('❌ PlanetScale DB에 manager@shinan.com 없음\n');
    }

    // 전체 사용자 수 확인
    const totalUsers = await connection.execute(
      `SELECT COUNT(*) as count FROM users`
    );
    console.log(`📊 PlanetScale DB 전체 사용자 수: ${totalUsers.rows[0].count}명\n`);

    // 처음 5개 계정 샘플
    const sampleUsers = await connection.execute(
      `SELECT id, email, name, role
       FROM users
       ORDER BY id
       LIMIT 5`
    );

    console.log('📋 샘플 사용자 (처음 5명):');
    sampleUsers.rows.forEach(u => {
      console.log(`   - ${u.email} (${u.role})`);
    });
    console.log();

  } catch (error) {
    console.error('\n❌ 오류:', error.message);
    if (error.body) console.error('   세부:', error.body);
  }
}

checkUserInPlanetScale().then(() => process.exit(0));

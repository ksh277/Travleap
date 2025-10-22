/**
 * PlanetScale users 테이블에 rentcar@vendor.com 추가
 */

const { connect } = require('@planetscale/database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function addRentcarUser() {
  try {
    console.log('🚀 PlanetScale users 테이블에 rentcar@vendor.com 추가...\n');

    const connection = connect({ url: process.env.DATABASE_URL });

    // 1. 기존 계정 확인
    const existing = await connection.execute(
      'SELECT id, email FROM users WHERE email = ?',
      ['rentcar@vendor.com']
    );

    if (existing.rows.length > 0) {
      console.log('⚠️  이미 존재합니다:', existing.rows[0].email);
      console.log('   ID:', existing.rows[0].id, '\n');
      return;
    }

    // 2. 비밀번호 해시
    const password = 'rentcar123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. 계정 추가
    const result = await connection.execute(
      `INSERT INTO users (email, password_hash, name, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      ['rentcar@vendor.com', hashedPassword, '렌트카벤더', 'vendor']
    );

    console.log('🎉 계정 추가 완료!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ PlanetScale users 테이블:');
    console.log(`   📧 이메일: rentcar@vendor.com`);
    console.log(`   🔑 비밀번호: rentcar123`);
    console.log(`   👤 이름: 렌트카벤더`);
    console.log(`   🎭 역할: vendor`);
    console.log(`   🆔 Insert ID: ${result.insertId}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ 이제 로그인이 가능합니다!\n');

  } catch (error) {
    console.error('\n❌ 오류:', error.message);
    if (error.body) console.error('   세부:', error.body);
  }
}

addRentcarUser().then(() => process.exit(0));

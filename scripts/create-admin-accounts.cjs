/**
 * 최고관리자 및 MD관리자 계정 생성 스크립트
 */

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

async function createAdminAccounts() {
  const sql = neon(process.env.POSTGRES_DATABASE_URL);

  // 비밀번호 해시
  const superAdminPassword = await bcrypt.hash('superadmin123', 10);
  const mdAdminPassword = await bcrypt.hash('mdadmin123', 10);

  console.log('=== 새 관리자 계정 생성 ===\n');

  // 1. 최고관리자 계정 생성
  try {
    const superAdmin = await sql`
      INSERT INTO users (username, email, password_hash, name, role, admin_role)
      VALUES ('superadmin', 'superadmin@travleap.com', ${superAdminPassword}, '최고관리자', 'admin', 'super_admin')
      RETURNING id, email, name, role, admin_role
    `;
    console.log('✅ 최고관리자 계정 생성 완료:');
    console.log('   이메일: superadmin@travleap.com');
    console.log('   비밀번호: superadmin123');
    console.log('   역할: admin (admin_role: super_admin)');
    console.log('   ID:', superAdmin[0].id);
  } catch (e) {
    if (e.message.includes('duplicate') || e.message.includes('unique')) {
      console.log('⚠️  superadmin@travleap.com 이미 존재');
    } else {
      console.error('최고관리자 생성 오류:', e.message);
    }
  }

  console.log('');

  // 2. MD관리자 계정 생성
  try {
    const mdAdmin = await sql`
      INSERT INTO users (username, email, password_hash, name, role, admin_role)
      VALUES ('mdadmin', 'md@travleap.com', ${mdAdminPassword}, 'MD관리자', 'admin', 'md_admin')
      RETURNING id, email, name, role, admin_role
    `;
    console.log('✅ MD관리자 계정 생성 완료:');
    console.log('   이메일: md@travleap.com');
    console.log('   비밀번호: mdadmin123');
    console.log('   역할: admin (admin_role: md_admin)');
    console.log('   ID:', mdAdmin[0].id);
  } catch (e) {
    if (e.message.includes('duplicate') || e.message.includes('unique')) {
      console.log('⚠️  md@travleap.com 이미 존재');
    } else {
      console.error('MD관리자 생성 오류:', e.message);
    }
  }

  // 3. 최종 관리자 목록
  console.log('\n=== 전체 관리자 계정 목록 ===');
  const admins = await sql`
    SELECT id, email, name, role, admin_role FROM users
    WHERE role = 'admin'
    ORDER BY id
  `;

  admins.forEach(u => {
    const adminRole = u.admin_role || '일반관리자';
    console.log(`ID: ${u.id} | ${u.email} | ${u.name} | ${adminRole}`);
  });
}

createAdminAccounts().catch(console.error);

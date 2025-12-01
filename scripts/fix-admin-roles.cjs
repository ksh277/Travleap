require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function updateRoleConstraint() {
  const sql = neon(process.env.POSTGRES_DATABASE_URL);

  try {
    // 1. 기존 제약 조건 삭제
    await sql`ALTER TABLE users DROP CONSTRAINT users_role_check`;
    console.log('✅ 기존 제약 조건 삭제');
  } catch (e) {
    console.log('⚠️ 제약 조건 삭제 실패 (이미 없을 수 있음):', e.message);
  }

  try {
    // 2. 새 제약 조건 추가 (super_admin, md_admin 포함)
    await sql`
      ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('user', 'admin', 'super_admin', 'md_admin', 'partner', 'vendor'))
    `;
    console.log('✅ 새 제약 조건 추가 (super_admin, md_admin 포함)');
  } catch (e) {
    console.log('⚠️ 제약 조건 추가 실패:', e.message);
  }

  // 3. 역할 수정
  await sql`UPDATE users SET role = 'super_admin' WHERE id = 116`;
  console.log('✅ ID 116 (superadmin@travleap.com) -> super_admin');

  await sql`UPDATE users SET role = 'md_admin' WHERE id = 117`;
  console.log('✅ ID 117 (md@travleap.com) -> md_admin');

  // 4. 확인
  const results = await sql`
    SELECT id, email, name, role
    FROM users
    WHERE id IN (116, 117)
    ORDER BY id
  `;

  console.log('');
  console.log('=== 수정 완료 ===');
  results.forEach(u => {
    console.log(`ID: ${u.id} | ${u.email} | 역할: ${u.role}`);
  });
}

updateRoleConstraint().catch(console.error);

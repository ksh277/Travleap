import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkUserRole() {
  const pool = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL });

  console.log('🔍 rentcar@vendor.com의 role 확인...\n');

  const result = await pool.query(
    'SELECT id, email, username, name, role FROM users WHERE email = $1',
    ['rentcar@vendor.com']
  );

  if (result.rows && result.rows.length > 0) {
    const user = result.rows[0];
    console.log('✅ 사용자 정보:');
    console.log('  - id:', user.id);
    console.log('  - email:', user.email);
    console.log('  - username:', user.username);
    console.log('  - name:', user.name);
    console.log('  - role:', user.role);
    console.log('');

    if (user.role !== 'vendor') {
      console.log('❌ 문제 발견! role이 "' + user.role + '"입니다. "vendor"로 변경해야 합니다.\n');
      console.log('🔧 role을 vendor로 업데이트 중...');

      const updateResult = await pool.query(
        'UPDATE users SET role = $1 WHERE id = $2',
        ['vendor', user.id]
      );

      console.log('✅ 업데이트 완료!');

      // 확인
      const verifyResult = await pool.query(
        'SELECT id, email, role FROM users WHERE id = $1',
        [user.id]
      );
      console.log('확인:', verifyResult.rows[0]);
    } else {
      console.log('✅ role이 이미 "vendor"로 설정되어 있습니다!');
    }
  } else {
    console.log('❌ 사용자를 찾을 수 없습니다!');
  }

  await pool.end();
}

checkUserRole().catch(console.error);

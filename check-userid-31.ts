import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkUser31() {
  const pool = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL });

  console.log('🔍 userId=31 계정 확인...\n');

  const result = await pool.query(
    'SELECT id, email, username, name, role FROM users WHERE id = $1',
    [31]
  );

  if (result.rows && result.rows.length > 0) {
    const user = result.rows[0];
    console.log('✅ userId=31 사용자 정보:');
    console.log('  - id:', user.id);
    console.log('  - email:', user.email);
    console.log('  - username:', user.username);
    console.log('  - name:', user.name);
    console.log('  - role:', user.role);
    console.log('');

    // userId=31의 role을 vendor로 변경
    if (user.role !== 'vendor') {
      console.log('🔧 userId=31의 role을 vendor로 변경 중...');
      await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['vendor', 31]);
      console.log('✅ 변경 완료!\n');
    }

    // userId=31을 vendor_id=12에도 연결 (백업용)
    console.log('🔧 vendor_id=12를 user_id=31로도 업데이트...');
    const { connect } = require('@planetscale/database');
    const connection = connect({ url: process.env.DATABASE_URL });

    await connection.execute(
      'UPDATE rentcar_vendors SET user_id = ? WHERE id = ?',
      [31, 12]
    );

    console.log('✅ 둘 다 작동하도록 설정 완료!');

  } else {
    console.log('❌ userId=31 사용자를 찾을 수 없습니다!');
  }

  await pool.end();
}

checkUser31().catch(console.error);

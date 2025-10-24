/**
 * 벤더 계정 비밀번호를 bcrypt 해시로 업데이트
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

async function updateVendorPassword() {
  if (!process.env.POSTGRES_DATABASE_URL) {
    console.error('❌ POSTGRES_DATABASE_URL이 설정되지 않았습니다.');
    process.exit(1);
  }

  const sql = neon(process.env.POSTGRES_DATABASE_URL);

  try {
    console.log('🔐 벤더 계정 비밀번호 업데이트 시작...\n');

    const email = 'lodging1@shinan.com';
    const bcryptHash = '$2b$10$hw3J3gnSzEDks/4abjIpAOoFz/FrgcqO7GytNwqEvlktjBQBCI1H2'; // vendor123

    // 비밀번호 업데이트
    const result = await sql`
      UPDATE users
      SET password_hash = ${bcryptHash},
          updated_at = NOW()
      WHERE email = ${email}
      RETURNING id, email, username, name, role
    `;

    if (result.length === 0) {
      console.error('❌ 계정을 찾을 수 없습니다:', email);
      process.exit(1);
    }

    const user = result[0];
    console.log('✅ 비밀번호 업데이트 완료!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 계정 정보:');
    console.log(`   User ID: ${user.id}`);
    console.log(`   이메일: ${user.email}`);
    console.log(`   사용자명: ${user.username}`);
    console.log(`   이름: ${user.name}`);
    console.log(`   역할: ${user.role}`);
    console.log(`   비밀번호: vendor123`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ 이제 정상적으로 로그인할 수 있습니다!\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    console.error(error instanceof Error ? error.stack : error);
    process.exit(1);
  }
}

updateVendorPassword();

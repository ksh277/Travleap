/**
 * 벤더 비밀번호 재설정 스크립트
 */

import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';
import * as bcrypt from 'bcryptjs';

const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_DATABASE_URL
});

async function resetPassword() {
  console.log('🔑 비밀번호 재설정 시작...\n');

  try {
    const email = 'pmstest@vendor.com';
    const newPassword = 'pmstest123';

    // 1. 사용자 확인
    const checkUser = await neonPool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email]
    );

    if (checkUser.rows.length === 0) {
      console.log(`❌ 사용자를 찾을 수 없습니다: ${email}`);
      process.exit(1);
    }

    console.log('✅ 사용자 발견:', checkUser.rows[0]);

    // 2. 비밀번호 해시 생성
    console.log('\n비밀번호 해시 생성 중...');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    console.log('✅ 해시 생성 완료');

    // 3. 비밀번호 업데이트
    console.log('\n비밀번호 업데이트 중...');
    await neonPool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [passwordHash, email]
    );
    console.log('✅ 비밀번호 업데이트 완료');

    // 4. 검증
    console.log('\n검증 중...');
    const updatedUser = await neonPool.query(
      'SELECT password_hash FROM users WHERE email = $1',
      [email]
    );

    const isValid = await bcrypt.compare(newPassword, updatedUser.rows[0].password_hash);
    if (isValid) {
      console.log('✅ 비밀번호 검증 성공!\n');
      console.log('═'.repeat(50));
      console.log('🎉 비밀번호 재설정 완료');
      console.log('═'.repeat(50));
      console.log(`이메일: ${email}`);
      console.log(`새 비밀번호: ${newPassword}`);
      console.log('═'.repeat(50));
    } else {
      console.log('❌ 비밀번호 검증 실패');
    }

  } catch (error: any) {
    console.error('\n❌ 오류 발생:', error.message);
    process.exit(1);
  } finally {
    await neonPool.end();
  }
}

resetPassword();

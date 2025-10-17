import { connect } from '@planetscale/database';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyLogin() {
  const conn = connect({ url: process.env.DATABASE_URL! });
  const email = 'admin@test.com';
  const password = 'admin123';

  console.log('🔍 PlanetScale 로그인 검증 테스트\n');
  console.log('1️⃣ DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');
  console.log('2️⃣ 테스트 계정:', email);
  console.log('3️⃣ 비밀번호:', password);
  console.log('\n' + '='.repeat(60) + '\n');

  // 1. DB에서 사용자 조회
  console.log('📊 1단계: PlanetScale DB에서 사용자 조회...');
  const result = await conn.execute(
    'SELECT id, email, name, role, password_hash FROM users WHERE email = ?',
    [email]
  );

  if (!result.rows || result.rows.length === 0) {
    console.log('❌ 사용자를 찾을 수 없음!');
    return;
  }

  const user: any = result.rows[0];
  console.log('✅ 사용자 찾음:');
  console.log('   - ID:', user.id);
  console.log('   - Email:', user.email);
  console.log('   - Name:', user.name);
  console.log('   - Role:', user.role);
  console.log('   - Password Hash:', user.password_hash.substring(0, 20) + '...');
  console.log('');

  // 2. 비밀번호 검증
  console.log('🔐 2단계: bcrypt로 비밀번호 검증...');
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (isValid) {
    console.log('✅ 비밀번호 일치! 로그인 성공!\n');
    console.log('🎉 결론: PlanetScale DB의 실제 데이터로 로그인됩니다!');
  } else {
    console.log('❌ 비밀번호 불일치');
  }
}

verifyLogin().catch(console.error);

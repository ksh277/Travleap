import bcrypt from 'bcryptjs';

async function generateHash() {
  const password = 'vendor123';
  const hash = await bcrypt.hash(password, 10);
  console.log('\n🔐 Password Hash 생성 완료:\n');
  console.log(`비밀번호: ${password}`);
  console.log(`해시: ${hash}\n`);
  return hash;
}

generateHash();

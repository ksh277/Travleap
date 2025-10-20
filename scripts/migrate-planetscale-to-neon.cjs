const { connect: psConnect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function migrateUsers() {
  console.log('🔄 PlanetScale → Neon 사용자 마이그레이션 시작');

  const ps = psConnect({ url: process.env.DATABASE_URL });
  const neon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL });

  try {
    console.log('1️⃣ PlanetScale 사용자 조회...');
    const psUsers = await ps.execute('SELECT * FROM users');
    console.log('   → ' + psUsers.rows.length + '명의 사용자 발견');

    console.log('2️⃣ Neon 테이블 구조 확인...');
    const cols = await neon.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
    const hasUsername = cols.rows.some(r => r.column_name === 'username');
    
    if (!hasUsername) {
      console.log('   → username 컬럼 추가 중...');
      await neon.query('ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE');
    }
    console.log('   ✅ 테이블 구조 확인 완료');

    console.log('3️⃣ 사용자 마이그레이션 중...');
    let migrated = 0;
    let skipped = 0;

    for (const user of psUsers.rows) {
      try {
        let username = user.email.split('@')[0];
        if (username.length < 3) {
          username = user.email.replace('@', '_').replace(/./g, '_');
        }
        username = username.replace(/[^a-zA-Z0-9_]/g, '');
        
        let passwordHash = user.password_hash;
        if (!passwordHash || passwordHash === '') {
          console.log('   ⚠️  ' + user.email + ': 비밀번호 없음, 기본값 설정 (password123)');
          passwordHash = await bcrypt.hash('password123', 10);
        }

        await neon.query(`
          INSERT INTO users (
            username, email, password_hash, name, phone, role
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          username,
          user.email,
          passwordHash,
          user.name || user.email,
          user.phone || null,
          user.role || 'user'
        ]);

        console.log('   ✅ ' + user.email + ' (username: ' + username + ')');
        migrated++;
      } catch (error) {
        if (error.code === '23505') {
          console.log('   ⏭️  ' + user.email + ': 이미 존재함');
          skipped++;
        } else {
          console.error('   ❌ ' + user.email + ': ' + error.message);
        }
      }
    }

    console.log('');
    console.log('✅ 마이그레이션 완료!');
    console.log('   - 새로 추가: ' + migrated + '명');
    console.log('   - 건너뜀: ' + skipped + '명');
    console.log('   - 총: ' + psUsers.rows.length + '명');

    const neonUsers = await neon.query('SELECT username, email, role FROM users ORDER BY id');
    console.log('4️⃣ Neon 사용자 목록:');
    neonUsers.rows.forEach((u, i) => {
      console.log('   ' + (i + 1) + '. ' + u.username + ' (' + u.email + ') - ' + u.role);
    });

  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error);
    throw error;
  } finally {
    await neon.end();
  }
}

migrateUsers().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

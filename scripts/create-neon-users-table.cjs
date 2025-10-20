const { Pool, neonConfig } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// 로컬 환경에서는 WebSocket 비활성화
neonConfig.wsProxy = (host) => `${host}:443/v1/`;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;

async function createUsersTable() {
  console.log('📝 Neon PostgreSQL users 테이블 생성 시작\n');

  const connectionString = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ POSTGRES_DATABASE_URL 또는 DATABASE_URL 환경변수가 설정되지 않았습니다');
    process.exit(1);
  }

  console.log('📡 연결 문자열:', connectionString.substring(0, 30) + '...\n');

  const pool = new Pool({ connectionString, ssl: true });

  try {
    // 연결 테스트
    console.log('🔌 데이터베이스 연결 테스트...');
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ 연결 성공:', testResult.rows[0].now, '\n');

    // users 테이블 생성
    console.log('1️⃣ users 테이블 생성...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'partner', 'vendor')),
        is_active BOOLEAN DEFAULT TRUE,
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ users 테이블 생성 완료\n');

    // 인덱스 생성
    console.log('2️⃣ 인덱스 생성...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    console.log('✅ 인덱스 생성 완료\n');

    // 테스트 사용자 확인/생성
    console.log('3️⃣ 테스트 사용자 확인...');
    const { rows: existingUsers } = await pool.query(
      'SELECT id, username, email, role FROM users WHERE role = $1',
      ['admin']
    );

    if (existingUsers.length === 0) {
      console.log('테스트 관리자 계정이 없습니다. 생성 중...\n');

      const hashedPassword = await bcrypt.hash('admin123', 10);

      await pool.query(`
        INSERT INTO users (username, email, password_hash, name, role, is_active, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, ['admin', 'admin@travleap.com', hashedPassword, '관리자', 'admin', true, true]);

      console.log('✅ 테스트 관리자 계정 생성 완료');
      console.log('   아이디: admin');
      console.log('   비밀번호: admin123\n');
    } else {
      console.log('✅ 기존 관리자 계정 확인:');
      existingUsers.forEach(user => {
        console.log(`   - ${user.username} (${user.email})`);
      });
      console.log();
    }

    console.log('🎉 모든 작업 완료!');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createUsersTable().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

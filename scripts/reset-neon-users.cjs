const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL });

async function resetTable() {
  console.log('🗑️  Neon users 테이블 완전 삭제 및 재생성\n');
  
  try {
    console.log('1️⃣ 기존 테이블 삭제 중...');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    console.log('   ✅ 기존 테이블 삭제 완료\n');
    
    console.log('2️⃣ 새 users 테이블 생성 중...');
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'partner', 'vendor')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ users 테이블 생성 완료\n');
    
    console.log('3️⃣ 인덱스 생성 중...');
    await pool.query('CREATE INDEX idx_users_email ON users(email)');
    await pool.query('CREATE INDEX idx_users_username ON users(username)');
    await pool.query('CREATE INDEX idx_users_role ON users(role)');
    console.log('   ✅ 인덱스 생성 완료\n');
    
    console.log('4️⃣ 생성된 테이블 구조:');
    const cols = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position");
    
    cols.rows.forEach(col => {
      console.log('   - ' + col.column_name + ': ' + col.data_type + ' ' + (col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'));
    });
    
    console.log('\n✅ 테이블 준비 완료!');
    
  } catch (error) {
    console.error('❌ 오류:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

resetTable();

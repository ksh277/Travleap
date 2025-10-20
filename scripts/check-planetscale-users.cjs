const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkUsers() {
  const conn = connect({ url: process.env.DATABASE_URL });
  
  try {
    console.log('📊 PlanetScale users 테이블 확인
');
    
    // 테이블 구조 확인
    console.log('1️⃣ 테이블 구조:');
    const columns = await conn.execute('SHOW COLUMNS FROM users');
    columns.rows.forEach(col => {
      console.log();
    });
    console.log();
    
    // 데이터 확인
    console.log('2️⃣ 기존 사용자 데이터:');
    const users = await conn.execute('SELECT id, email, name, role, created_at FROM users LIMIT 10');
    console.log();
    
    users.rows.forEach(user => {
      console.log();
    });
    console.log();
    
    // username 컬럼 확인
    console.log('3️⃣ username 컬럼 존재 여부:');
    const hasUsername = columns.rows.some(col => col.Field === 'username');
    if (hasUsername) {
      console.log('   ✅ username 컬럼 있음');
    } else {
      console.log('   ❌ username 컬럼 없음');
    }
    
  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

checkUsers();
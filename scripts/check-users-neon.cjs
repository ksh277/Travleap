/**
 * Neon DB users 테이블 확인
 */

require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');

async function checkNeonUsers() {
  console.log('\n' + '='.repeat(70));
  console.log('Neon DB - users 테이블 확인');
  console.log('='.repeat(70) + '\n');

  try {
    const connectionString = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;

    console.log('[1] 환경 변수 확인:');
    console.log('-'.repeat(70));
    console.log('POSTGRES_DATABASE_URL 존재:', !!process.env.POSTGRES_DATABASE_URL);
    console.log('DATABASE_URL 존재:', !!process.env.DATABASE_URL);

    if (!connectionString) {
      console.log('❌ DATABASE_URL이 설정되지 않았습니다!');
      return;
    }

    const pool = new Pool({ connectionString });

    console.log('\n[2] Neon DB 연결 및 users 테이블 조회:');
    console.log('-'.repeat(70));

    const result = await pool.query(`
      SELECT id, email, name, role, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    console.log(`✅ 조회 완료: ${result.rows?.length || 0}명\n`);

    if (result.rows && result.rows.length > 0) {
      console.log('사용자 목록:');
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. [${user.id}] ${user.email} (${user.name}) - ${user.role}`);
      });
    } else {
      console.log('❌ 등록된 사용자가 없습니다!');
    }

    console.log('\n[3] 테이블 스키마 확인:');
    console.log('-'.repeat(70));
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    if (schemaResult.rows && schemaResult.rows.length > 0) {
      console.log('users 테이블 컬럼:');
      schemaResult.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    }

    await pool.end();

    console.log('\n' + '='.repeat(70));
    console.log('확인 완료');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n✗ 오류 발생:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkNeonUsers();

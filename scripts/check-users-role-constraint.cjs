/**
 * users 테이블의 role 제약 조건 확인
 */
require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');

(async () => {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_DATABASE_URL
  });

  try {
    console.log('📊 users 테이블 role 제약 조건 확인 중...\n');

    // users 테이블 스키마 확인
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `);

    console.log('=== users 테이블 컬럼 ===');
    schemaResult.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      if (col.column_default) {
        console.log(`  기본값: ${col.column_default}`);
      }
    });

    // 기존 사용자들의 role 확인
    console.log('\n=== 기존 사용자 role 값 ===');
    const roleResult = await pool.query(`
      SELECT DISTINCT role, COUNT(*) as count
      FROM users
      GROUP BY role
      ORDER BY count DESC
    `);

    roleResult.rows.forEach(row => {
      console.log(`${row.role}: ${row.count}명`);
    });

    // 제약 조건 확인 (다른 방법)
    console.log('\n=== CHECK 제약 조건 ===');
    const constraintResult = await pool.query(`
      SELECT con.conname, pg_get_constraintdef(con.oid)
      FROM pg_constraint con
      INNER JOIN pg_class rel ON rel.oid = con.conrelid
      INNER JOIN pg_namespace nsp ON nsp.oid = connamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname = 'users'
        AND con.contype = 'c'
    `);

    if (constraintResult.rows && constraintResult.rows.length > 0) {
      constraintResult.rows.forEach(row => {
        console.log(`${row.conname}:`);
        console.log(`  ${row.pg_get_constraintdef}`);
      });
    } else {
      console.log('제약 조건 없음 또는 조회 실패');
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await pool.end();
  }
})();

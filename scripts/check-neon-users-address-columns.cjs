/**
 * Neon 데이터베이스 users 테이블의 주소 관련 컬럼 확인
 */

const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const databaseUrl = process.env.POSTGRES_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ POSTGRES_DATABASE_URL이 설정되지 않았습니다.');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function checkAddressColumns() {
  try {
    console.log('🔍 Neon users 테이블의 주소 컬럼 확인 중...\n');

    // 1. 테이블 구조 확인
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;

    console.log('📋 users 테이블 전체 컬럼:');
    console.log('==========================================');
    columns.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})${col.is_nullable === 'YES' ? ' NULL' : ' NOT NULL'}`);
    });

    console.log('\n🔍 주소 관련 컬럼 체크:');
    console.log('==========================================');
    const addressColumns = ['postal_code', 'address', 'detail_address'];
    addressColumns.forEach(colName => {
      const found = columns.find(c => c.column_name === colName);
      if (found) {
        console.log(`✅ ${colName}: 존재 (${found.data_type})`);
      } else {
        console.log(`❌ ${colName}: 없음`);
      }
    });

    // 2. 샘플 데이터 확인 (최근 사용자 5명)
    console.log('\n📊 최근 사용자 5명의 주소 데이터:');
    console.log('==========================================');
    const users = await sql`
      SELECT id, email, name, postal_code, address, detail_address, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `;

    users.forEach(user => {
      console.log(`\nUser ID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.name || '(없음)'}`);
      console.log(`Postal Code: ${user.postal_code || '(없음)'}`);
      console.log(`Address: ${user.address || '(없음)'}`);
      console.log(`Detail Address: ${user.detail_address || '(없음)'}`);
      console.log(`Created: ${user.created_at}`);
    });

    console.log('\n✅ 주소 컬럼 체크 완료!');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

checkAddressColumns();

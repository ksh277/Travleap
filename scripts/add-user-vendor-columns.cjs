/**
 * Neon PostgreSQL users 테이블에 누락된 컬럼 추가
 * - vendor_type: 벤더 유형 (popup, tour, attractions 등)
 * - vendor_id: 연결된 listings ID
 * - partner_id: 연결된 partners ID
 */

const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

async function addUserVendorColumns() {
  const connectionString = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ POSTGRES_DATABASE_URL 또는 DATABASE_URL이 설정되지 않았습니다.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    console.log('🔄 users 테이블 컬럼 추가 시작...\n');

    // 1. vendor_type 컬럼 추가
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vendor_type VARCHAR(50)`);
      console.log('✅ vendor_type 컬럼 추가 완료');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('ℹ️ vendor_type 컬럼이 이미 존재합니다');
      } else {
        throw err;
      }
    }

    // 2. vendor_id 컬럼 추가
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vendor_id INTEGER`);
      console.log('✅ vendor_id 컬럼 추가 완료');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('ℹ️ vendor_id 컬럼이 이미 존재합니다');
      } else {
        throw err;
      }
    }

    // 3. partner_id 컬럼 추가
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_id INTEGER`);
      console.log('✅ partner_id 컬럼 추가 완료');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('ℹ️ partner_id 컬럼이 이미 존재합니다');
      } else {
        throw err;
      }
    }

    // 4. 컬럼 확인
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 users 테이블 현재 컬럼 목록:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

    // 5. 새 컬럼 존재 확인
    const newColumns = ['vendor_type', 'vendor_id', 'partner_id'];
    const existingColumns = result.rows.map(r => r.column_name);

    console.log('\n✅ 필수 컬럼 확인:');
    newColumns.forEach(col => {
      const exists = existingColumns.includes(col);
      console.log(`  - ${col}: ${exists ? '✅ 존재' : '❌ 누락'}`);
    });

    console.log('\n🎉 마이그레이션 완료!');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addUserVendorColumns();

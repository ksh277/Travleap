#!/usr/bin/env node
/**
 * Phase 8: 렌트카-listings 연동
 * rentcar_vehicles 테이블에 listing_id 컬럼 추가
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function executeMigration() {
  let connection;

  try {
    console.log('📡 PlanetScale 데이터베이스 연결 중...\n');

    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      ssl: {
        rejectUnauthorized: false  // PlanetScale용
      }
    });

    console.log('✅ 연결 성공!\n');
    console.log('='.repeat(50) + '\n');
    console.log('📦 Phase 8: 렌트카-listings 연동\n');
    console.log('='.repeat(50) + '\n');

    // Phase 8 SQL 실행
    const sqlPath = path.join(__dirname, 'phase8-listings-integration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔧 SQL 파일 실행 중...\n');

    // 세미콜론으로 구분된 쿼리들을 배열로 분리
    const queries = sql
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'));

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      if (query.trim()) {
        console.log(`실행 중 (${i + 1}/${queries.length}): ${query.substring(0, 60)}...`);
        await connection.execute(query);
      }
    }

    console.log('\n✅ Phase 8 완료!\n');
    console.log('='.repeat(50));
    console.log('📊 변경 사항:');
    console.log('  - rentcar_vehicles 테이블에 listing_id 컬럼 추가');
    console.log('  - listings 테이블에 rentcar_vehicle_id 컬럼 추가 (역참조)');
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.error('상세:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 연결 종료\n');
    }
  }
}

executeMigration();

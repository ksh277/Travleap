#!/usr/bin/env node
/**
 * Phase 10-1: 예약 로그 테이블 추가
 * booking_logs 테이블 생성 및 관련 컬럼 추가
 */

// dotenv를 가장 먼저 로드
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');
const fs = require('fs');

async function executeMigration() {
  let connection;

  try {
    console.log('📡 PlanetScale 데이터베이스 연결 중...\n');

    // 환경 변수 확인
    console.log('🔍 환경 변수 확인:');
    console.log(`   - HOST: ${process.env.DATABASE_HOST ? '✅' : '❌'}`);
    console.log(`   - USERNAME: ${process.env.DATABASE_USERNAME ? '✅' : '❌'}`);
    console.log(`   - PASSWORD: ${process.env.DATABASE_PASSWORD ? '✅' : '❌'}`);
    console.log(`   - DATABASE: ${process.env.DATABASE_NAME ? '✅' : '❌'}\n`);

    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      ssl: {
        rejectUnauthorized: false  // PlanetScale용
      },
      multipleStatements: false  // 보안을 위해 false
    });

    console.log('✅ 연결 성공!\n');
    console.log('='.repeat(50) + '\n');
    console.log('📦 Phase 10-1: 예약 로그 테이블 추가\n');
    console.log('='.repeat(50) + '\n');

    // Phase 10-1 SQL 실행
    const sqlPath = path.join(__dirname, 'phase10-1-booking-logs.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔧 SQL 파일 실행 중...\n');

    // 세미콜론으로 구분된 쿼리들을 배열로 분리
    const queries = sql
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--') && !q.startsWith('/*'));

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      if (query.trim()) {
        console.log(`실행 중 (${i + 1}/${queries.length}): ${query.substring(0, 60)}...`);

        try {
          const [result] = await connection.execute(query);

          // SELECT 쿼리 결과 출력
          if (Array.isArray(result) && result.length > 0 && result[0].message) {
            console.log(`✅ ${result[0].message}`);
          }
        } catch (error) {
          // ALTER TABLE 에러는 무시 (컬럼이 이미 존재하는 경우)
          if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate column')) {
            console.log(`⚠️  컬럼이 이미 존재합니다 (무시)`);
          } else if (error.code === 'ER_DUP_KEYNAME' || error.message.includes('Duplicate key')) {
            console.log(`⚠️  인덱스가 이미 존재합니다 (무시)`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('\n✅ Phase 10-1 완료!\n');
    console.log('='.repeat(50));
    console.log('📊 변경 사항:');
    console.log('  - booking_logs 테이블 생성 (예약 이력 추적)');
    console.log('  - lodging_bookings 테이블에 hold_expires_at 컬럼 추가');
    console.log('  - lodging_bookings 테이블에 cancelled_at, cancel_reason 컬럼 추가');
    console.log('  - 성능 최적화 인덱스 추가');
    console.log('='.repeat(50) + '\n');

    // 테이블 확인
    console.log('🔍 생성된 테이블 확인...\n');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'booking_logs'
    `, [process.env.DATABASE_NAME]);

    if (tables.length > 0) {
      console.log('✅ booking_logs 테이블 생성 확인:');
      console.log(`   - 생성 시각: ${tables[0].CREATE_TIME}`);
      console.log(`   - 현재 행 수: ${tables[0].TABLE_ROWS}`);
    }

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.error('상세:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 연결 종료\n');
    }
  }
}

executeMigration();

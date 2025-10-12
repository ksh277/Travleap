#!/usr/bin/env node
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function executePhase3() {
  console.log('🚀 Phase 3: 렌트카 리뷰 지원 확장 시작...\n');

  let connection;
  try {
    // PlanetScale 연결
    console.log('📡 PlanetScale 데이터베이스 연결 중...');
    connection = await mysql.createConnection(process.env.VITE_DATABASE_URL);
    console.log('✅ 데이터베이스 연결 성공!\n');

    // SQL 파일 읽기
    const sqlFile = path.join(__dirname, 'phase3-rentcar-review-support.sql');
    console.log(`📄 SQL 파일 읽는 중: ${sqlFile}`);
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // SQL 문 분리 및 실행 (주석 제거)
    const statements = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`📋 총 ${statements.length}개의 SQL 문 발견\n`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // 주석만 있는 줄 스킵
      if (stmt.startsWith('--') || stmt.trim().length === 0) continue;

      // ALTER TABLE 문 감지
      const isAlterTable = stmt.toUpperCase().includes('ALTER TABLE');
      const isCreateIndex = stmt.toUpperCase().includes('CREATE INDEX');
      const isUpdate = stmt.toUpperCase().includes('UPDATE');

      console.log(`⚙️  [${i + 1}/${statements.length}] 실행 중...`);

      if (isAlterTable) {
        console.log('   → ALTER TABLE 문 (컬럼 추가/수정)');
      } else if (isCreateIndex) {
        console.log('   → CREATE INDEX 문 (인덱스 생성)');
      } else if (isUpdate) {
        console.log('   → UPDATE 문 (데이터 마이그레이션)');
      }

      try {
        await connection.execute(stmt);
        console.log('   ✅ 성공\n');
      } catch (error) {
        // 이미 컬럼이나 인덱스가 있으면 경고만 출력
        if (error.code === 'ER_DUP_FIELDNAME' ||
            error.code === 'ER_DUP_KEYNAME' ||
            error.message.includes('Duplicate column') ||
            error.message.includes('Duplicate key') ||
            error.sqlMessage?.includes('Duplicate column')) {
          console.log('   ⚠️  이미 존재함 (스킵)\n');
        } else {
          console.error('   ❌ 오류:', error.message);
          throw error;
        }
      }
    }

    console.log('✨ Phase 3 완료!');
    console.log('\n📊 적용된 변경사항:');
    console.log('   • reviews 테이블에 review_type 컬럼 추가');
    console.log('   • reviews 테이블에 rentcar_booking_id, rentcar_vendor_id, rentcar_vehicle_id 컬럼 추가');
    console.log('   • listing_id를 NULL 허용으로 변경');
    console.log('\n🎉 이제 일반 상품 리뷰와 렌트카 리뷰를 모두 관리할 수 있습니다!');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n📡 데이터베이스 연결 종료');
    }
  }
}

executePhase3();

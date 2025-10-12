#!/usr/bin/env node
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function executePhase7() {
  console.log('🚀 Phase 7: 엔터프라이즈 기능 마이그레이션 시작...\n');

  let connection;
  try {
    console.log('📡 PlanetScale 데이터베이스 연결 중...');
    connection = await mysql.createConnection(process.env.VITE_DATABASE_URL);
    console.log('✅ 데이터베이스 연결 성공!\n');

    const migrations = [
      'phase7-booking-history.sql',
      'phase7-notifications.sql',
      'phase7-payment.sql'
    ];

    for (const migrationFile of migrations) {
      console.log(`📄 Executing ${migrationFile}...`);
      const sqlPath = path.join(__dirname, migrationFile);
      const sql = fs.readFileSync(sqlPath, 'utf8');

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
        console.log(`⚙️  [${i + 1}/${statements.length}] 실행 중...`);

        try {
          await connection.execute(stmt);
          console.log('   ✅ 성공\n');
        } catch (error) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR' ||
              error.code === 'ER_DUP_FIELDNAME' ||
              error.code === 'ER_DUP_KEYNAME') {
            console.log('   ⚠️  이미 존재함 (스킵)\n');
          } else {
            console.error('   ❌ 오류:', error.message);
            throw error;
          }
        }
      }
      console.log(`✅ ${migrationFile} 완료\n`);
    }

    console.log('✨ Phase 7 완료!');
    console.log('\n📊 적용된 변경사항:');
    console.log('   • rentcar_booking_history 테이블 생성 (상태 변경 이력 추적)');
    console.log('   • notification_history 테이블 생성 (알림 이력 관리)');
    console.log('   • payment_history 테이블 생성 (결제 이력)');
    console.log('   • refund_history 테이블 생성 (환불 이력)');
    console.log('\n🎉 이제 엔터프라이즈급 예약/결제/알림 시스템을 사용할 수 있습니다!');

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

executePhase7();

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// .env 파일 로드
require('dotenv').config();

async function executePhase2() {
  let connection;

  try {
    console.log('🔄 PlanetScale 연결 중...');
    connection = await mysql.createConnection(process.env.VITE_DATABASE_URL);
    console.log('✅ PlanetScale 연결 성공\n');

    // SQL 파일 읽기
    const sqlFile = path.join(__dirname, 'phase2-advanced-features.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // SQL 문을 세미콜론으로 분리
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log('📦 Phase 2 테이블 생성 시작...\n');

    let tableCount = 0;
    const tables = [
      'rentcar_rate_plans',
      'rentcar_insurance_plans',
      'rentcar_extras',
      'rentcar_availability_rules',
      'rentcar_booking_extras',
      'rentcar_booking_insurance'
    ];

    // 각 SQL 문 실행
    for (const statement of statements) {
      try {
        const [result] = await connection.execute(statement);

        // 테이블 생성 확인
        if (statement.includes('CREATE TABLE')) {
          tableCount++;
          const tableName = tables[tableCount - 1];
          console.log(`📦 [${tableCount}/${tables.length}] ${tableName} 테이블 생성 완료`);
        }
      } catch (error) {
        // SELECT 문이나 이미 존재하는 테이블은 무시
        if (!error.message.includes('already exists') && !statement.includes('SELECT')) {
          console.error('⚠️  SQL 실행 오류:', error.message);
        }
      }
    }

    console.log('\n📊 샘플 데이터 삽입 완료');

    // 생성된 데이터 확인
    console.log('\n✅ Phase 2 고급 기능 테이블 생성 완료!\n');

    console.log('생성된 테이블:');
    for (let i = 0; i < tables.length; i++) {
      console.log(`  ${i + 1}. ${tables[i]}`);
    }

    console.log('\n📊 데이터 확인:');
    const [ratePlans] = await connection.query('SELECT COUNT(*) as count FROM rentcar_rate_plans');
    console.log(`  - rentcar_rate_plans: ${ratePlans[0].count}개`);

    const [insurance] = await connection.query('SELECT COUNT(*) as count FROM rentcar_insurance_plans');
    console.log(`  - rentcar_insurance_plans: ${insurance[0].count}개`);

    const [extras] = await connection.query('SELECT COUNT(*) as count FROM rentcar_extras');
    console.log(`  - rentcar_extras: ${extras[0].count}개`);

    const [rules] = await connection.query('SELECT COUNT(*) as count FROM rentcar_availability_rules');
    console.log(`  - rentcar_availability_rules: ${rules[0].count}개`);

    console.log('\n🎉 Phase 2 완료!');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 실행
executePhase2();

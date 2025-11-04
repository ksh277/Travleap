/**
 * 환경 변수 및 데이터베이스 연결 검증 스크립트
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

async function verifyEnvAndDB() {
  console.log('🔍 환경 변수 및 데이터베이스 연결 검증 시작...\n');

  let allGood = true;

  // 1. 환경 변수 확인
  console.log('📋 환경 변수 확인:');

  const envVars = {
    'DATABASE_URL (PlanetScale)': process.env.DATABASE_URL,
    'POSTGRES_DATABASE_URL (Neon)': process.env.POSTGRES_DATABASE_URL,
    'TOSS_SECRET_KEY': process.env.TOSS_SECRET_KEY
  };

  for (const [name, value] of Object.entries(envVars)) {
    if (value) {
      // 값의 일부만 표시 (보안)
      const displayValue = value.substring(0, 20) + '...' + value.substring(value.length - 10);
      console.log(`  ✅ ${name}: ${displayValue}`);
    } else {
      console.log(`  ❌ ${name}: NOT SET`);
      allGood = false;
    }
  }
  console.log('');

  // 2. PlanetScale 연결 테스트
  console.log('🔌 PlanetScale (MySQL) 연결 테스트...');
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    const result = await connection.execute('SELECT 1 as test');
    const isConnected = result.rows && result.rows.length > 0 && result.rows[0].test === 1;
    console.log(`  ✅ PlanetScale 연결 성공: ${isConnected ? '정상' : '이상'}`);

    // user_points 테이블 존재 확인
    const tableCheck = await connection.execute(`
      SHOW TABLES LIKE 'user_points'
    `);
    console.log(`  ✅ user_points 테이블: ${tableCheck.rows.length > 0 ? '존재' : '❌ 없음'}`);

  } catch (error) {
    console.error(`  ❌ PlanetScale 연결 실패:`, error.message);
    allGood = false;
  }
  console.log('');

  // 3. Neon 연결 테스트
  console.log('🔌 Neon (PostgreSQL) 연결 테스트...');
  try {
    const poolNeon = new Pool({
      connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
    });

    const result = await poolNeon.query('SELECT 1 as test');
    const isConnected = result.rows && result.rows.length > 0 && result.rows[0].test === 1;
    console.log(`  ✅ Neon 연결 성공: ${isConnected ? '정상' : '이상'}`);

    // users 테이블 존재 및 total_points 컬럼 확인
    const tableCheck = await poolNeon.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('id', 'total_points')
      ORDER BY column_name
    `);

    const columns = tableCheck.rows.map(r => `${r.column_name} (${r.data_type})`).join(', ');
    console.log(`  ✅ users 테이블 컬럼: ${columns}`);

    if (!tableCheck.rows.find(r => r.column_name === 'total_points')) {
      console.error(`  ❌ total_points 컬럼이 없습니다!`);
      allGood = false;
    }

    await poolNeon.end();

  } catch (error) {
    console.error(`  ❌ Neon 연결 실패:`, error.message);
    allGood = false;
  }
  console.log('');

  // 4. 사용자 포인트 확인 (user_id=11)
  console.log('👤 사용자 포인트 현황 확인 (user_id=11)...');
  try {
    const connection = connect({ url: process.env.DATABASE_URL });
    const poolNeon = new Pool({
      connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
    });

    // Neon에서 total_points 조회
    const neonResult = await poolNeon.query(
      'SELECT total_points FROM users WHERE id = $1',
      [11]
    );

    if (neonResult.rows && neonResult.rows.length > 0) {
      console.log(`  ✅ Neon total_points: ${neonResult.rows[0].total_points}P`);
    } else {
      console.log(`  ❌ Neon에 user_id=11이 없습니다`);
    }

    // PlanetScale에서 최근 포인트 내역 조회
    const historyResult = await connection.execute(`
      SELECT id, points, point_type, reason, created_at
      FROM user_points
      WHERE user_id = 11
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log(`  ✅ PlanetScale 최근 내역 ${historyResult.rows?.length || 0}건:`);
    if (historyResult.rows && historyResult.rows.length > 0) {
      historyResult.rows.forEach(row => {
        const shortReason = row.reason.substring(0, 40);
        console.log(`     - ${row.points}P (${row.point_type}) ${shortReason}...`);
      });
    }

    await poolNeon.end();

  } catch (error) {
    console.error(`  ❌ 포인트 조회 실패:`, error.message);
    allGood = false;
  }
  console.log('');

  // 최종 결과
  if (allGood) {
    console.log('✅ 모든 검증 통과! 포인트 시스템이 정상 작동할 수 있습니다.');
  } else {
    console.log('❌ 일부 검증 실패! 위의 오류를 확인하세요.');
    process.exit(1);
  }
}

verifyEnvAndDB().catch(console.error);

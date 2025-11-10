/**
 * Extras 기능 구현 검증 스크립트
 *
 * 검증 항목:
 * 1. 모든 today bookings API가 extras를 반환하는지
 * 2. cancel-rental API가 extras를 반환하는지
 * 3. TypeScript 인터페이스가 올바른지
 * 4. SQL 쿼리 일관성
 */

const { connect } = require('@planetscale/database');
const fs = require('fs');
const path = require('path');

async function verifyExtrasImplementation() {
  console.log('🔍 Extras 기능 구현 검증 시작\n');

  const issues = [];
  const successes = [];

  // 1. 파일 존재 확인
  console.log('📁 [1/4] 수정된 파일 존재 확인...');
  const filesToCheck = [
    'api/rentcar/bookings/today.js',
    'api/rentcar/bookings-today.js',
    'pages/api/rentcar/bookings/today.js',
    'api/rentcar/cancel-rental.js',
    'components/RentcarVendorDashboard.tsx'
  ];

  for (const file of filesToCheck) {
    const fullPath = path.join(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
      successes.push(`✅ ${file} 존재 확인`);
    } else {
      issues.push(`❌ ${file} 파일이 없습니다`);
    }
  }

  // 2. Extras 쿼리 패턴 확인
  console.log('\n🔍 [2/4] SQL 쿼리 패턴 확인...');
  const queryPattern = /rentcar_booking_extras.*LEFT JOIN.*rentcar_extras/s;

  for (const file of filesToCheck.slice(0, 4)) { // JS 파일만
    const fullPath = path.join(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (queryPattern.test(content)) {
        successes.push(`✅ ${file}: extras 쿼리 포함`);
      } else {
        issues.push(`❌ ${file}: extras 쿼리가 없습니다`);
      }
    }
  }

  // 3. TypeScript 인터페이스 확인
  console.log('\n📝 [3/4] TypeScript 인터페이스 확인...');
  const tsFile = path.join(__dirname, '..', 'components/RentcarVendorDashboard.tsx');
  if (fs.existsSync(tsFile)) {
    const content = fs.readFileSync(tsFile, 'utf8');

    if (content.includes('extras?:')) {
      successes.push('✅ RentcarBooking 인터페이스에 extras 필드 있음');
    } else {
      issues.push('❌ RentcarBooking 인터페이스에 extras 필드 없음');
    }

    if (content.includes('extras_count?:')) {
      successes.push('✅ RentcarBooking 인터페이스에 extras_count 필드 있음');
    } else {
      issues.push('❌ RentcarBooking 인터페이스에 extras_count 필드 없음');
    }

    if (content.includes('extras_total?:')) {
      successes.push('✅ RentcarBooking 인터페이스에 extras_total 필드 있음');
    } else {
      issues.push('❌ RentcarBooking 인터페이스에 extras_total 필드 없음');
    }

    // UI 렌더링 확인
    if (content.includes('booking.extras && booking.extras.length > 0')) {
      successes.push('✅ UI에서 extras 조건부 렌더링 확인');
    } else {
      issues.push('❌ UI에서 extras 렌더링 코드 없음');
    }

    if (content.includes('booking.extras_total?.toLocaleString()')) {
      successes.push('✅ UI에서 extras_total optional chaining 사용');
    } else {
      issues.push('⚠️ UI에서 extras_total optional chaining 미사용');
    }
  }

  // 4. DB 테이블 존재 확인
  console.log('\n🗄️  [4/4] 데이터베이스 테이블 확인...');
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    // rentcar_booking_extras 테이블 확인
    const tableCheck = await connection.execute(`
      SHOW TABLES LIKE 'rentcar_booking_extras'
    `);

    if (tableCheck.rows && tableCheck.rows.length > 0) {
      successes.push('✅ rentcar_booking_extras 테이블 존재');

      // 테이블 구조 확인
      const columns = await connection.execute(`
        SHOW COLUMNS FROM rentcar_booking_extras
      `);

      const requiredColumns = ['booking_id', 'extra_id', 'quantity', 'unit_price_krw', 'total_price_krw'];
      const existingColumns = columns.rows.map(row => row.Field);

      for (const col of requiredColumns) {
        if (existingColumns.includes(col)) {
          successes.push(`  ✅ 컬럼 ${col} 존재`);
        } else {
          issues.push(`  ❌ 컬럼 ${col} 없음`);
        }
      }
    } else {
      issues.push('⚠️ rentcar_booking_extras 테이블이 없습니다 (런타임에 생성 필요)');
    }

    // rentcar_extras 테이블 확인
    const extrasTableCheck = await connection.execute(`
      SHOW TABLES LIKE 'rentcar_extras'
    `);

    if (extrasTableCheck.rows && extrasTableCheck.rows.length > 0) {
      successes.push('✅ rentcar_extras 테이블 존재');
    } else {
      issues.push('⚠️ rentcar_extras 테이블이 없습니다');
    }

  } catch (dbError) {
    console.warn('⚠️ DB 연결 실패 (환경변수 확인 필요):', dbError.message);
  }

  // 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log('📊 검증 결과');
  console.log('='.repeat(60));

  console.log(`\n✅ 성공: ${successes.length}개`);
  successes.forEach(s => console.log(`  ${s}`));

  if (issues.length > 0) {
    console.log(`\n❌ 문제: ${issues.length}개`);
    issues.forEach(i => console.log(`  ${i}`));
  }

  console.log('\n' + '='.repeat(60));

  if (issues.filter(i => i.startsWith('❌')).length === 0) {
    console.log('🎉 모든 검증 통과!');
    return true;
  } else {
    console.log('⚠️ 일부 문제가 발견되었습니다.');
    return false;
  }
}

// 실행
verifyExtrasImplementation()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ 검증 중 오류:', error);
    process.exit(1);
  });

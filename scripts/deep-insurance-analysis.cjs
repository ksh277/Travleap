const fs = require('fs');
const path = require('path');
const { connect } = require('@planetscale/database');
require('dotenv').config();

/**
 * 보험 시스템 심층 분석 스크립트
 *
 * 분석 항목:
 * 1. 모든 파일에서 rentcar_insurance vs insurances 사용 확인
 * 2. 벤더 API의 마이그레이션 상태 확인
 * 3. 직접/간접 영향 받는 모든 API 확인
 * 4. DB 데이터 무결성 확인
 * 5. 기존 예약에 미치는 영향 확인
 */

console.log('🔍 보험 시스템 심층 분석 시작\n');
console.log('='.repeat(80) + '\n');

const issues = [];
const warnings = [];
const info = [];

// ========================================
// 1. 파일 시스템 분석
// ========================================
console.log('📂 1. 파일 시스템 분석\n');

const searchDirs = ['pages/api', 'components', 'pages'];
const oldTableUsages = [];
const newTableUsages = [];

function searchInFile(filePath, searchTerm) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const matches = [];

    lines.forEach((line, index) => {
      if (line.includes(searchTerm)) {
        matches.push({
          file: filePath,
          line: index + 1,
          content: line.trim()
        });
      }
    });

    return matches;
  } catch (e) {
    return [];
  }
}

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDir(filePath, callback);
    } else if (stat.isFile() && /\.(js|jsx|ts|tsx)$/.test(file)) {
      callback(filePath);
    }
  });
}

// rentcar_insurance 사용 찾기
searchDirs.forEach(dir => {
  const fullPath = path.join('C:\\Users\\ham57\\Desktop\\Travleap', dir);
  walkDir(fullPath, (file) => {
    const matches = searchInFile(file, 'rentcar_insurance');
    if (matches.length > 0) {
      oldTableUsages.push(...matches);
    }
  });
});

// insurances 사용 찾기
searchDirs.forEach(dir => {
  const fullPath = path.join('C:\\Users\\ham57\\Desktop\\Travleap', dir);
  walkDir(fullPath, (file) => {
    const matches = searchInFile(file, 'insurances');
    if (matches.length > 0) {
      newTableUsages.push(...matches);
    }
  });
});

console.log(`   구 테이블 (rentcar_insurance) 사용: ${oldTableUsages.length}건\n`);
if (oldTableUsages.length > 0) {
  const uniqueFiles = [...new Set(oldTableUsages.map(m => m.file))];
  console.log('   ❌ 발견된 파일:');
  uniqueFiles.forEach(file => {
    const relPath = file.replace('C:\\Users\\ham57\\Desktop\\Travleap\\', '');
    const count = oldTableUsages.filter(m => m.file === file).length;
    console.log(`      ${relPath} (${count}건)`);
    issues.push(`${relPath}: rentcar_insurance 테이블 사용 (${count}건)`);
  });
  console.log('');
}

console.log(`   신 테이블 (insurances) 사용: ${newTableUsages.length}건\n`);

// ========================================
// 2. DB 데이터 무결성 확인
// ========================================
(async () => {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('📊 2. DB 데이터 무결성 확인\n');

  try {
    // 2.1. rentcar_insurance 테이블 존재 여부
    try {
      const oldTableCheck = await connection.execute('SELECT COUNT(*) as count FROM rentcar_insurance');
      console.log(`   ⚠️  rentcar_insurance 테이블 아직 존재: ${oldTableCheck.rows[0].count}개 데이터`);
      warnings.push(`rentcar_insurance 테이블이 아직 존재합니다 (${oldTableCheck.rows[0].count}개 데이터)`);
    } catch (e) {
      console.log('   ✅ rentcar_insurance 테이블 없음 (정상)');
    }

    // 2.2. insurances 테이블 렌트카 보험
    const newInsurances = await connection.execute(`
      SELECT COUNT(*) as count FROM insurances WHERE category = 'rentcar'
    `);
    console.log(`   ✅ insurances 테이블 렌트카 보험: ${newInsurances.rows[0].count}개\n`);

    // 2.3. 예약 데이터 확인
    console.log('📊 3. 예약 데이터 영향 확인\n');

    const bookingStats = await connection.execute(`
      SELECT
        COUNT(*) as total_bookings,
        SUM(CASE WHEN insurance_id IS NOT NULL THEN 1 ELSE 0 END) as with_insurance,
        SUM(CASE WHEN insurance_id IS NULL THEN 1 ELSE 0 END) as without_insurance
      FROM rentcar_bookings
    `);

    const stats = bookingStats.rows[0];
    console.log(`   전체 예약: ${stats.total_bookings}건`);
    console.log(`   보험 있음: ${stats.with_insurance}건`);
    console.log(`   보험 없음: ${stats.without_insurance}건\n`);

    // 2.4. 잘못된 insurance_id 참조 확인
    const invalidRefs = await connection.execute(`
      SELECT
        b.id,
        b.booking_number,
        b.insurance_id,
        b.status,
        b.payment_status
      FROM rentcar_bookings b
      LEFT JOIN insurances i ON b.insurance_id = i.id AND i.category = 'rentcar'
      WHERE b.insurance_id IS NOT NULL AND i.id IS NULL
    `);

    if (invalidRefs.rows.length > 0) {
      console.log(`   ❌ 잘못된 insurance_id 참조: ${invalidRefs.rows.length}건\n`);
      invalidRefs.rows.forEach(row => {
        console.log(`      ${row.booking_number}: insurance_id=${row.insurance_id} (존재하지 않음)`);
        issues.push(`예약 ${row.booking_number}: 존재하지 않는 insurance_id=${row.insurance_id}`);
      });
      console.log('');
    } else {
      console.log('   ✅ 모든 insurance_id 참조 유효\n');
    }

    // 2.5. 최근 예약 확인 (지난 30일)
    const recentBookings = await connection.execute(`
      SELECT
        b.id,
        b.booking_number,
        b.insurance_id,
        b.insurance_fee_krw,
        b.created_at,
        i.name as insurance_name,
        i.price,
        i.pricing_unit
      FROM rentcar_bookings b
      LEFT JOIN insurances i ON b.insurance_id = i.id AND i.category = 'rentcar'
      WHERE b.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY b.created_at DESC
      LIMIT 10
    `);

    console.log(`   최근 30일 예약: ${recentBookings.rows.length}건\n`);
    if (recentBookings.rows.length > 0) {
      recentBookings.rows.forEach(row => {
        const insuranceInfo = row.insurance_id
          ? `${row.insurance_name} (${row.insurance_fee_krw}원)`
          : '보험 없음';
        console.log(`      ${row.booking_number}: ${insuranceInfo}`);
      });
      console.log('');
    }

    // ========================================
    // 4. 벤더별 보험 현황
    // ========================================
    console.log('📊 4. 벤더별 보험 현황\n');

    const vendorInsurances = await connection.execute(`
      SELECT
        v.id as vendor_id,
        v.business_name,
        COUNT(i.id) as insurance_count,
        SUM(CASE WHEN i.is_active = 1 THEN 1 ELSE 0 END) as active_count
      FROM rentcar_vendors v
      LEFT JOIN insurances i ON i.vendor_id = v.id AND i.category = 'rentcar'
      GROUP BY v.id, v.business_name
      ORDER BY v.id
    `);

    vendorInsurances.rows.forEach(row => {
      console.log(`   [${row.vendor_id}] ${row.business_name}`);
      console.log(`      보험: ${row.insurance_count}개 (활성: ${row.active_count}개)`);

      if (row.insurance_count === 0) {
        warnings.push(`벤더 [${row.vendor_id}] ${row.business_name}: 보험 없음`);
      }
    });
    console.log('');

    // ========================================
    // 5. API 엔드포인트 영향 분석
    // ========================================
    console.log('📊 5. API 엔드포인트 영향 분석\n');

    const apiFiles = [
      { path: 'pages/api/rentcar/bookings.js', critical: true, desc: '예약 생성/조회' },
      { path: 'pages/api/rentals.js', critical: true, desc: '예약 생성 (대체)' },
      { path: 'pages/api/rentcar/voucher/verify.js', critical: false, desc: '바우처 검증' },
      { path: 'pages/api/vendor/bookings.js', critical: true, desc: '벤더 예약 조회' },
      { path: 'pages/api/vendor/insurance.js', critical: true, desc: '벤더 보험 관리' },
      { path: 'pages/api/insurance.js', critical: false, desc: '사용자 보험 조회' },
      { path: 'pages/api/admin/insurance.js', critical: true, desc: '관리자 보험 관리' }
    ];

    apiFiles.forEach(api => {
      const fullPath = path.join('C:\\Users\\ham57\\Desktop\\Travleap', api.path);
      const usesOld = searchInFile(fullPath, 'rentcar_insurance').length > 0;
      const usesNew = searchInFile(fullPath, 'insurances').length > 0;

      const status = usesOld ? '❌ 구 테이블' : usesNew ? '✅ 신 테이블' : '⚠️  미사용';
      const criticalMark = api.critical ? '🔴' : '🟡';

      console.log(`   ${criticalMark} ${status} - ${api.path}`);
      console.log(`      ${api.desc}`);

      if (usesOld && api.critical) {
        issues.push(`${api.path} (중요): 아직 rentcar_insurance 사용 중`);
      } else if (usesOld) {
        warnings.push(`${api.path}: rentcar_insurance 사용 중`);
      }
    });
    console.log('');

    // ========================================
    // 최종 결과
    // ========================================
    console.log('='.repeat(80));
    console.log('📊 심층 분석 결과\n');

    console.log(`✅ 정보: ${info.length}건`);
    console.log(`⚠️  경고: ${warnings.length}건`);
    console.log(`❌ 오류: ${issues.length}건\n`);

    if (warnings.length > 0) {
      console.log('⚠️  경고 목록:');
      warnings.forEach((w, i) => console.log(`   ${i + 1}. ${w}`));
      console.log('');
    }

    if (issues.length > 0) {
      console.log('❌ 오류 목록:');
      issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
      console.log('');
    }

    if (issues.length === 0 && warnings.length === 0) {
      console.log('🎉 모든 검사 통과! 시스템이 완벽하게 마이그레이션되었습니다.\n');
    } else if (issues.length === 0) {
      console.log('⚠️  경고가 있지만 치명적이지 않습니다.\n');
    } else {
      console.log('❌ 치명적인 문제가 발견되었습니다. 수정이 필요합니다.\n');
    }

    console.log('='.repeat(80));

    process.exit(issues.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ 분석 중 오류 발생:', error.message);
    console.error(error);
    process.exit(1);
  }
})();

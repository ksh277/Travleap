const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(80));
console.log('투어/숙박 벤더 대시보드 API 점검');
console.log('='.repeat(80) + '\n');

const requiredAPIs = [
  { endpoint: '/api/vendor/tour/packages', file: 'api/vendor/tour/packages.js', desc: '벤더 패키지 목록' },
  { endpoint: '/api/vendor/tour/schedules', file: 'api/vendor/tour/schedules.js', desc: '벤더 일정 목록' },
  { endpoint: '/api/vendor/tour/bookings', file: 'api/vendor/tour/bookings.js', desc: '벤더 예약 목록' },
  { endpoint: '/api/vendor/tour/update-status', file: 'api/vendor/tour/update-status.js', desc: '예약 상태 업데이트' },
];

let allExist = true;
let missingAPIs = [];

console.log('필수 API 파일 확인:\n');

for (const api of requiredAPIs) {
  const filePath = path.join(process.cwd(), api.file);
  const exists = fs.existsSync(filePath);

  if (exists) {
    console.log(`✅ ${api.endpoint}`);
    console.log(`   → ${api.file}`);
    console.log(`   → ${api.desc}\n`);
  } else {
    console.log(`❌ ${api.endpoint}`);
    console.log(`   → ${api.file} (파일 없음)`);
    console.log(`   → ${api.desc}\n`);
    allExist = false;
    missingAPIs.push(api);
  }
}

console.log('='.repeat(80));

if (allExist) {
  console.log('🎉 모든 투어 벤더 API가 존재합니다!');
} else {
  console.log(`⚠️  ${missingAPIs.length}개의 API 파일이 누락되었습니다.`);
  console.log('\n누락된 API:');
  missingAPIs.forEach(api => {
    console.log(`  - ${api.endpoint}`);
    console.log(`    필요 파일: ${api.file}`);
    console.log(`    용도: ${api.desc}\n`);
  });

  console.log('\n📋 대안 API 파일 발견:');
  console.log('  - api/admin/tour/packages.js (관리자용)');
  console.log('  - api/admin/tour/schedules.js (관리자용)');
  console.log('  - api/tour/packages.js (공개용)');
  console.log('  - api/tour/schedules/[packageId].js (공개용)');
  console.log('\n  ⚠️  벤더용 API가 없어서 TourVendorDashboard가 작동하지 않을 수 있습니다.');
}

console.log('='.repeat(80) + '\n');

process.exit(allExist ? 0 : 1);

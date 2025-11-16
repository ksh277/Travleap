const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(80));
console.log('렌트카 벤더 대시보드 API 엔드포인트 점검');
console.log('='.repeat(80) + '\n');

const requiredAPIs = [
  { endpoint: '/api/vendor/rentcar/bookings', file: 'api/vendor/rentcar/bookings.js' },
  { endpoint: '/api/rentcar/bookings/today', file: 'api/rentcar/bookings-today.js' },
  { endpoint: '/api/rentcar/vendor/refunds', file: 'api/rentcar/vendor-refunds.js' },
  { endpoint: '/api/rentcar/vendor-vehicles/me', file: 'api/rentcar/vendor-vehicles.js' },
  { endpoint: '/api/vendor/rentcar/extras', file: 'api/vendor/rentcar/extras.js' },
  { endpoint: '/api/vendor/rentcar/vehicles', file: 'api/vendor/rentcar/vehicles.js' },
  { endpoint: '/api/rentcar/voucher/verify', file: 'api/rentcar/verify-voucher.js' },
  { endpoint: '/api/rentcar/check-in', file: 'api/rentcar/check-in.js' },
  { endpoint: '/api/rentcar/check-out', file: 'api/rentcar/check-out.js' },
  { endpoint: '/api/rentcar/refund', file: 'api/rentcar/refund.js' },
  { endpoint: '/api/rentcar/additional-payment', file: 'api/rentcar/additional-payment.js' },
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
  } else {
    console.log(`❌ ${api.endpoint}`);
    console.log(`   → ${api.file} (파일 없음)`);
    allExist = false;
    missingAPIs.push(api);
  }
  console.log('');
}

console.log('='.repeat(80));
if (allExist) {
  console.log('🎉 모든 렌트카 벤더 API가 존재합니다!');
} else {
  console.log(`⚠️ ${missingAPIs.length}개의 API 파일이 누락되었습니다.`);
  console.log('\n누락된 API:');
  missingAPIs.forEach(api => {
    console.log(`  - ${api.endpoint} (${api.file})`);
  });
}
console.log('='.repeat(80) + '\n');

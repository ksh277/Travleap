const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(80));
console.log('전체 벤더 대시보드 API 점검');
console.log('='.repeat(80) + '\n');

const vendorCategories = [
  {
    name: '렌트카 (Rentcar)',
    dashboardFile: 'components/RentcarVendorDashboard.tsx',
    apis: [
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
      { endpoint: '/api/rentcar/additional-payment', file: 'api/rentcar/additional-payment.js' }
    ]
  },
  {
    name: '투어/숙박 (Tour)',
    dashboardFile: 'components/TourVendorDashboard.tsx',
    apis: [
      { endpoint: '/api/vendor/tour/packages', file: 'api/vendor/tour/packages.js' },
      { endpoint: '/api/vendor/tour/schedules', file: 'api/vendor/tour/schedules.js' },
      { endpoint: '/api/vendor/tour/bookings', file: 'api/vendor/tour/bookings.js' },
      { endpoint: '/api/vendor/tour/update-status', file: 'api/vendor/tour/update-status.js' }
    ]
  },
  {
    name: '음식 (Food)',
    dashboardFile: 'components/FoodVendorDashboard.tsx',
    apis: [
      { endpoint: '/api/vendor/food/bookings', file: 'api/vendor/food/bookings.js' },
      { endpoint: '/api/vendor/food/menu', file: 'api/vendor/food/menu.js' },
      { endpoint: '/api/vendor/food/update-status', file: 'api/vendor/food/update-status.js' }
    ]
  },
  {
    name: '관광지 (Attractions)',
    dashboardFile: 'components/AttractionsVendorDashboard.tsx',
    apis: [
      { endpoint: '/api/vendor/attractions/bookings', file: 'api/vendor/attractions/bookings.js' },
      { endpoint: '/api/vendor/attractions/update-status', file: 'api/vendor/attractions/update-status.js' }
    ]
  },
  {
    name: '이벤트 (Events)',
    dashboardFile: 'components/EventsVendorDashboard.tsx',
    apis: [
      { endpoint: '/api/vendor/events/bookings', file: 'api/vendor/events/bookings.js' },
      { endpoint: '/api/vendor/events/update-status', file: 'api/vendor/events/update-status.js' }
    ]
  },
  {
    name: '체험 (Experience)',
    dashboardFile: 'components/ExperienceVendorDashboard.tsx',
    apis: [
      { endpoint: '/api/vendor/experience/bookings', file: 'api/vendor/experience/bookings.js' },
      { endpoint: '/api/vendor/experience/update-status', file: 'api/vendor/experience/update-status.js' }
    ]
  },
  {
    name: '팝업 (Popup)',
    dashboardFile: 'components/PopupVendorDashboard.tsx',
    apis: [
      { endpoint: '/api/vendor/popup/orders', file: 'api/vendor/popup/orders.js' },
      { endpoint: '/api/vendor/popup/products', file: 'api/vendor/popup/products.js' },
      { endpoint: '/api/vendor/popup/update-tracking', file: 'api/vendor/popup/update-tracking.js' }
    ]
  }
];

const summary = {
  total: 0,
  passed: 0,
  failed: 0,
  categories: {}
};

for (const category of vendorCategories) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${category.name}`);
  console.log('='.repeat(80) + '\n');

  // 대시보드 파일 확인
  const dashboardPath = path.join(process.cwd(), category.dashboardFile);
  const dashboardExists = fs.existsSync(dashboardPath);

  if (dashboardExists) {
    console.log(`✅ 대시보드 파일: ${category.dashboardFile}\n`);
  } else {
    console.log(`❌ 대시보드 파일 없음: ${category.dashboardFile}\n`);
  }

  // API 파일 확인
  let categoryPassed = 0;
  let categoryFailed = 0;
  const missingAPIs = [];

  for (const api of category.apis) {
    const filePath = path.join(process.cwd(), api.file);
    const exists = fs.existsSync(filePath);

    summary.total++;

    if (exists) {
      console.log(`✅ ${api.endpoint}`);
      console.log(`   → ${api.file}\n`);
      categoryPassed++;
      summary.passed++;
    } else {
      console.log(`❌ ${api.endpoint}`);
      console.log(`   → ${api.file} (파일 없음)\n`);
      categoryFailed++;
      summary.failed++;
      missingAPIs.push(api);
    }
  }

  summary.categories[category.name] = {
    dashboardExists,
    total: category.apis.length,
    passed: categoryPassed,
    failed: categoryFailed,
    missingAPIs
  };

  console.log(`결과: ${categoryPassed}/${category.apis.length} API 통과`);

  if (missingAPIs.length > 0) {
    console.log(`\n⚠️  누락된 API ${missingAPIs.length}개:`);
    missingAPIs.forEach(api => {
      console.log(`   - ${api.endpoint}`);
    });
  }
}

// 최종 요약
console.log('\n' + '='.repeat(80));
console.log('최종 요약');
console.log('='.repeat(80) + '\n');

Object.keys(summary.categories).forEach(catName => {
  const cat = summary.categories[catName];
  const status = cat.failed === 0 ? '✅' : '❌';
  console.log(`${status} ${catName}: ${cat.passed}/${cat.total} API (${cat.dashboardExists ? '대시보드 O' : '대시보드 X'})`);
});

console.log(`\n전체: ${summary.passed}/${summary.total} API 통과 (${Math.round(summary.passed / summary.total * 100)}%)`);

console.log('\n' + '='.repeat(80));

if (summary.failed === 0) {
  console.log('🎉 모든 벤더 대시보드 API가 정상입니다!');
} else {
  console.log(`⚠️  ${summary.failed}개의 API가 누락되어 있습니다.`);
  console.log('\n벤더 대시보드가 제대로 작동하지 않을 수 있습니다.');
}

console.log('='.repeat(80) + '\n');

process.exit(summary.failed === 0 ? 0 : 1);

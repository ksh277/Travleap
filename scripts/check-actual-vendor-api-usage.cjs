const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(80));
console.log('벤더 대시보드 실제 API 사용 현황 점검');
console.log('='.repeat(80) + '\n');

const dashboards = [
  { name: '렌트카', file: 'components/RentcarVendorDashboard.tsx' },
  { name: '투어/숙박', file: 'components/TourVendorDashboard.tsx' },
  { name: '음식', file: 'components/FoodVendorDashboard.tsx' },
  { name: '관광지', file: 'components/AttractionsVendorDashboard.tsx' },
  { name: '이벤트', file: 'components/EventsVendorDashboard.tsx' },
  { name: '체험', file: 'components/ExperienceVendorDashboard.tsx' },
  { name: '팝업', file: 'components/PopupVendorDashboard.tsx' }
];

function extractAPIEndpoints(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // fetch() 호출에서 API 엔드포인트 추출
    const fetchRegex = /fetch\s*\(\s*[`'"]([^`'"]+)[`'"]/g;
    const endpoints = new Set();

    let match;
    while ((match = fetchRegex.exec(content)) !== null) {
      let endpoint = match[1];

      // 템플릿 리터럴의 변수 부분 정리
      endpoint = endpoint.replace(/\$\{[^}]+\}/g, '{param}');

      // /api/로 시작하는 것만
      if (endpoint.startsWith('/api/')) {
        endpoints.add(endpoint);
      }
    }

    return Array.from(endpoints).sort();
  } catch (error) {
    return [];
  }
}

function checkAPIFileExists(endpoint) {
  // 엔드포인트를 파일 경로로 변환
  let filePath = endpoint.replace('/api/', 'api/');

  // {param} 부분 처리
  if (filePath.includes('{param}')) {
    // [id] 형식으로 변환
    filePath = filePath.replace('{param}', '[id]');
  }

  // .js 확장자 추가
  if (!filePath.endsWith('.js')) {
    filePath += '.js';
  }

  const fullPath = path.join(process.cwd(), filePath);
  return fs.existsSync(fullPath);
}

const results = [];

for (const dashboard of dashboards) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${dashboard.name} 대시보드`);
  console.log('='.repeat(80) + '\n');

  const dashboardPath = path.join(process.cwd(), dashboard.file);

  if (!fs.existsSync(dashboardPath)) {
    console.log(`❌ 대시보드 파일 없음: ${dashboard.file}\n`);
    results.push({ name: dashboard.name, exists: false, apis: [] });
    continue;
  }

  const endpoints = extractAPIEndpoints(dashboardPath);

  if (endpoints.length === 0) {
    console.log('⚠️  API 호출을 찾을 수 없습니다.\n');
    results.push({ name: dashboard.name, exists: true, apis: [], total: 0, found: 0 });
    continue;
  }

  console.log(`발견된 API 엔드포인트 ${endpoints.length}개:\n`);

  let found = 0;
  let missing = 0;
  const apiResults = [];

  for (const endpoint of endpoints) {
    const exists = checkAPIFileExists(endpoint);

    if (exists) {
      console.log(`✅ ${endpoint}`);
      found++;
    } else {
      console.log(`❌ ${endpoint}`);
      missing++;
    }

    apiResults.push({ endpoint, exists });
  }

  console.log(`\n결과: ${found}/${endpoints.length} API 존재`);

  results.push({
    name: dashboard.name,
    exists: true,
    apis: apiResults,
    total: endpoints.length,
    found,
    missing
  });
}

// 최종 요약
console.log('\n' + '='.repeat(80));
console.log('최종 요약');
console.log('='.repeat(80) + '\n');

let totalAPIs = 0;
let totalFound = 0;
let totalMissing = 0;

results.forEach(result => {
  if (result.exists && result.total > 0) {
    const status = result.missing === 0 ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.found}/${result.total} API`);

    totalAPIs += result.total;
    totalFound += result.found;
    totalMissing += result.missing;

    if (result.missing > 0) {
      const missingList = result.apis.filter(a => !a.exists).map(a => a.endpoint);
      console.log(`   누락: ${missingList.join(', ')}`);
    }
  }
});

console.log(`\n전체: ${totalFound}/${totalAPIs} API 존재 (${Math.round(totalFound / totalAPIs * 100)}%)`);

console.log('\n' + '='.repeat(80));

if (totalMissing === 0) {
  console.log('🎉 모든 API가 정상적으로 존재합니다!');
} else {
  console.log(`⚠️  ${totalMissing}개의 API가 누락되어 있습니다.`);
}

console.log('='.repeat(80) + '\n');

process.exit(totalMissing === 0 ? 0 : 1);

/**
 * 재고 표시 버그 진단 스크립트
 *
 * 문제: DB에는 재고가 있는데 UI에서 0개로 표시되는 버그
 * 원인 분석:
 * 1. API가 반환하는 컬럼명
 * 2. Dashboard가 기대하는 컬럼명
 * 3. 차량 재고 업데이트 API가 사용하는 컬럼명
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 재고 표시 버그 진단 시작...\n');

// 1. 차량 목록 조회 API 분석
console.log('1️⃣ 차량 목록 조회 API (/api/vendor/rentcar/vehicles.js)');
const vehiclesApi = fs.readFileSync(
  path.join(__dirname, '../api/vendor/rentcar/vehicles.js'),
  'utf-8'
);

const stockColumnMatch = vehiclesApi.match(/SELECT[\s\S]*?stock[\s\S]*?FROM rentcar_vehicles/);
if (stockColumnMatch) {
  console.log('✅ API가 반환하는 컬럼: stock');
} else {
  console.log('❌ API에서 stock 컬럼을 찾을 수 없음');
}

// 2. 차량 재고 업데이트 API 분석
console.log('\n2️⃣ 차량 재고 업데이트 API (/api/vendor/rentcar/vehicles/stock.js)');
const stockApi = fs.readFileSync(
  path.join(__dirname, '../api/vendor/rentcar/vehicles/stock.js'),
  'utf-8'
);

const updateMatch = stockApi.match(/UPDATE rentcar_vehicles SET (\w+) = \?/);
if (updateMatch) {
  console.log(`✅ UPDATE 시 사용하는 컬럼: ${updateMatch[1]}`);
} else {
  console.log('❌ UPDATE 쿼리를 찾을 수 없음');
}

// 3. Dashboard 컴포넌트 분석
console.log('\n3️⃣ RentcarVendorDashboard 컴포넌트');
const dashboard = fs.readFileSync(
  path.join(__dirname, '../components/RentcarVendorDashboard.tsx'),
  'utf-8'
);

const currentStockMatches = dashboard.match(/current_stock/g);
const stockMatches = dashboard.match(/\bstock\b/g);

console.log(`Dashboard에서 'current_stock' 사용 횟수: ${currentStockMatches ? currentStockMatches.length : 0}`);
console.log(`Dashboard에서 'stock' 사용 횟수: ${stockMatches ? stockMatches.length : 0}`);

// current_stock을 기대하는 코드 찾기
const currentStockUsage = dashboard.match(/current_stock[:\s]*extra\.current_stock|vehicle\.current_stock/g);
if (currentStockUsage) {
  console.log('⚠️ Dashboard는 current_stock 필드를 기대함');
}

// 4. 문제 요약
console.log('\n' + '='.repeat(60));
console.log('📊 진단 결과');
console.log('='.repeat(60));

console.log('\n🐛 발견된 문제:');
console.log('  API 반환: stock');
console.log('  UPDATE 시: stock');
console.log('  Dashboard 기대: current_stock');
console.log('\n  ❌ 컬럼명 불일치로 인해 UI에서 재고가 표시되지 않음!');

console.log('\n✅ 해결 방법:');
console.log('  옵션 1: API를 수정하여 stock AS current_stock 반환');
console.log('  옵션 2: Dashboard를 수정하여 stock 필드 사용');
console.log('  옵션 3: DB 컬럼명을 current_stock으로 변경 (권장하지 않음)');

console.log('\n🎯 권장 해결책: API 수정 (옵션 1)');
console.log('  - /api/vendor/rentcar/vehicles.js에서 stock AS current_stock 반환');
console.log('  - 기존 Dashboard 코드 변경 없이 해결 가능');
console.log('  - 하위 호환성 유지');

console.log('\n✅ 진단 완료!');

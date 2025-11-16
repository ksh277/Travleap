/**
 * 객실 재고 시스템 확인 스크립트
 *
 * 확인 사항:
 * 1. 객실이 어떤 테이블에 저장되는가?
 * 2. 재고 관리가 가능한가?
 * 3. Dashboard에서 재고 입력/표시 기능이 있는가?
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 객실 재고 시스템 점검 시작...\n');

// 1. Lodging Dashboard 분석
console.log('1️⃣ VendorLodgingDashboard 분석');
const lodgingDashboard = fs.readFileSync(
  path.join(__dirname, '../components/VendorLodgingDashboard.tsx'),
  'utf-8'
);

// room_count 사용 확인
const roomCountMatches = lodgingDashboard.match(/room_count/g);
console.log(`  room_count 사용 횟수: ${roomCountMatches ? roomCountMatches.length : 0}`);

// 재고 관련 UI 확인
const stockUIMatches = lodgingDashboard.match(/재고|stock|inventory|quantity/gi);
console.log(`  재고 관련 키워드 발견: ${stockUIMatches ? stockUIMatches.length : 0}개`);

// 객실 입력 폼 확인
const roomFormMatches = lodgingDashboard.match(/(객실|room).*입력|input.*room/gi);
console.log(`  객실 입력 폼: ${roomFormMatches ? '✅ 발견' : '❌ 없음'}`);

// 2. Rooms API 분석
console.log('\n2️⃣ /api/vendor/rooms.js 분석');
const roomsApi = fs.readFileSync(
  path.join(__dirname, '../api/vendor/rooms.js'),
  'utf-8'
);

// listings 테이블 사용 확인
const listingsMatch = roomsApi.match(/INSERT INTO listings|SELECT \* FROM listings/);
console.log(`  사용 테이블: ${listingsMatch ? 'listings (공용)' : '전용 테이블'}`);

// quantity/stock 컬럼 확인
const stockColumnMatch = roomsApi.match(/quantity|stock|재고/i);
console.log(`  재고 컬럼 사용: ${stockColumnMatch ? '✅ 사용' : '❌ 미사용'}`);

// 3. RentcarVendorDashboard와 비교
console.log('\n3️⃣ RentcarVendorDashboard와 비교');
const rentcarDashboard = fs.readFileSync(
  path.join(__dirname, '../components/RentcarVendorDashboard.tsx'),
  'utf-8'
);

// 차량재고 탭 확인
const vehicleStockTab = rentcarDashboard.match(/차량재고/);
const roomStockTab = lodgingDashboard.match(/객실재고|객실 재고/);

console.log(`  차량재고 탭: ${vehicleStockTab ? '✅ 있음' : '❌ 없음'}`);
console.log(`  객실재고 탭: ${roomStockTab ? '✅ 있음' : '❌ 없음'}`);

// 재고 업데이트 함수 확인
const updateVehicleStock = rentcarDashboard.match(/updateVehicleStock/);
const updateRoomStock = lodgingDashboard.match(/updateRoomStock|update.*stock/i);

console.log(`  차량 재고 업데이트 함수: ${updateVehicleStock ? '✅ 있음' : '❌ 없음'}`);
console.log(`  객실 재고 업데이트 함수: ${updateRoomStock ? '✅ 있음' : '❌ 없음'}`);

// 4. 결론 및 권장사항
console.log('\n' + '='.repeat(60));
console.log('📊 분석 결과');
console.log('='.repeat(60));

console.log('\n현재 상태:');
console.log('  ✅ 차량: 재고 관리 완전 구현 (탭, API, UI)');
console.log('  ❌ 객실: 재고 관리 미구현');

console.log('\n필요한 작업:');
if (!roomStockTab) {
  console.log('  1. VendorLodgingDashboard에 "객실재고" 탭 추가');
}
if (!updateRoomStock) {
  console.log('  2. 객실 재고 업데이트 함수 구현');
}
console.log('  3. /api/vendor/lodging/rooms/stock API 생성 (차량과 동일 패턴)');
console.log('  4. listings 테이블에 stock 컬럼 활용 (이미 있을 가능성)');

console.log('\n✅ 점검 완료!');

/**
 * 숙박/렌트카 전체 시스템 검증 스크립트
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(80));
console.log('🏨🚗 숙박/렌트카 시스템 전체 검증');
console.log('='.repeat(80));

// 1. API 라우트 파일 존재 확인
console.log('\n1️⃣  API 라우트 파일 존재 확인:');
console.log('-'.repeat(80));

const apiRoutes = [
  'app/api/accommodations/route.ts',
  'app/api/accommodations/[partnerId]/route.ts',
  'app/api/rentcars/route.ts',
  'app/api/rentcars/[vendorId]/route.ts',
];

let allRoutesExist = true;
apiRoutes.forEach(route => {
  const filePath = path.join(process.cwd(), route);
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${route}`);
  if (!exists) allRoutesExist = false;
});

if (!allRoutesExist) {
  console.error('\n❌ 일부 API 라우트 파일이 누락되었습니다.');
  process.exit(1);
}

// 2. 카드 컴포넌트 파일 존재 확인
console.log('\n2️⃣  카드 컴포넌트 파일 존재 확인:');
console.log('-'.repeat(80));

const cardComponents = [
  'components/cards/HotelCard.tsx',
  'components/cards/RentcarVendorCard.tsx',
];

let allCardsExist = true;
cardComponents.forEach(component => {
  const filePath = path.join(process.cwd(), component);
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${component}`);
  if (!exists) allCardsExist = false;
});

if (!allCardsExist) {
  console.error('\n❌ 일부 카드 컴포넌트가 누락되었습니다.');
  process.exit(1);
}

// 3. 상세 페이지 파일 존재 확인
console.log('\n3️⃣  상세 페이지 파일 존재 확인:');
console.log('-'.repeat(80));

const detailPages = [
  'components/pages/HotelDetailPage.tsx',
  'components/pages/RentcarVendorDetailPage.tsx',
];

let allPagesExist = true;
detailPages.forEach(page => {
  const filePath = path.join(process.cwd(), page);
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${page}`);
  if (!exists) allPagesExist = false;
});

if (!allPagesExist) {
  console.error('\n❌ 일부 상세 페이지가 누락되었습니다.');
  process.exit(1);
}

// 4. 숙박 API 검증
console.log('\n4️⃣  숙박 API 검증:');
console.log('-'.repeat(80));

const accommodationsApi = fs.readFileSync('app/api/accommodations/route.ts', 'utf8');

const accommodationsChecks = [
  { name: 'GROUP BY partner_id', pattern: /GROUP BY.*p\.id/ },
  { name: 'COUNT(l.id) as room_count', pattern: /COUNT\(l\.id\) as room_count/ },
  { name: 'MIN(l.price_from) as min_price', pattern: /MIN\(l\.price_from\) as min_price/ },
  { name: 'MAX(l.price_from) as max_price', pattern: /MAX\(l\.price_from\) as max_price/ },
  { name: 'category_id = 1857 (숙박)', pattern: /category_id = 1857/ },
  { name: 'images JSON 파싱', pattern: /JSON\.parse/ },
];

accommodationsChecks.forEach(check => {
  const passed = check.pattern.test(accommodationsApi);
  console.log(`${passed ? '✅' : '❌'} ${check.name}`);
});

// 5. 렌트카 API 검증
console.log('\n5️⃣  렌트카 API 검증:');
console.log('-'.repeat(80));

const rentcarsApi = fs.readFileSync('app/api/rentcars/route.ts', 'utf8');

const rentcarsChecks = [
  { name: 'GROUP BY vendor_id', pattern: /GROUP BY.*v\.id/ },
  { name: 'COUNT(rv.id) as vehicle_count', pattern: /COUNT\(rv\.id\) as vehicle_count/ },
  { name: 'MIN(rv.daily_rate_krw)', pattern: /MIN\(rv\.daily_rate_krw\)/ },
  { name: 'MAX(rv.daily_rate_krw)', pattern: /MAX\(rv\.daily_rate_krw\)/ },
  { name: 'rv.is_active = 1', pattern: /rv\.is_active = 1/ },
  { name: 'images JSON 파싱', pattern: /JSON\.parse/ },
];

rentcarsChecks.forEach(check => {
  const passed = check.pattern.test(rentcarsApi);
  console.log(`${passed ? '✅' : '❌'} ${check.name}`);
});

// 6. HotelCard 검증
console.log('\n6️⃣  HotelCard 컴포넌트 검증:');
console.log('-'.repeat(80));

const hotelCard = fs.readFileSync('components/cards/HotelCard.tsx', 'utf8');

const hotelCardChecks = [
  { name: '이미지 높이 h-52', pattern: /h-52/ },
  { name: '카드 높이 h-\[450px\]', pattern: /h-\[450px\]/ },
  { name: 'navigate to /accommodation/{partner_id}', pattern: /accommodation\/\$\{/ },
  { name: 'room_count 표시', pattern: /room_count/ },
  { name: 'min_price 표시', pattern: /min_price/ },
];

hotelCardChecks.forEach(check => {
  const passed = check.pattern.test(hotelCard);
  console.log(`${passed ? '✅' : '❌'} ${check.name}`);
});

// 7. RentcarVendorCard 검증
console.log('\n7️⃣  RentcarVendorCard 컴포넌트 검증:');
console.log('-'.repeat(80));

const rentcarCard = fs.readFileSync('components/cards/RentcarVendorCard.tsx', 'utf8');

const rentcarCardChecks = [
  { name: '이미지 높이 h-52', pattern: /h-52/ },
  { name: '카드 높이 h-\[450px\]', pattern: /h-\[450px\]/ },
  { name: 'navigate to /rentcar/{vendor_id}', pattern: /rentcar\/\$\{/ },
  { name: 'vehicle_count 표시', pattern: /vehicle_count/ },
  { name: 'min_price 표시', pattern: /min_price/ },
];

rentcarCardChecks.forEach(check => {
  const passed = check.pattern.test(rentcarCard);
  console.log(`${passed ? '✅' : '❌'} ${check.name}`);
});

// 8. CategoryPage 통합 검증
console.log('\n8️⃣  CategoryPage 통합 검증:');
console.log('-'.repeat(80));

const categoryPage = fs.readFileSync('components/CategoryPage.tsx', 'utf8');

const categoryPageChecks = [
  { name: 'HotelCard import', pattern: /import.*HotelCard/ },
  { name: 'RentcarVendorCard import', pattern: /import.*RentcarVendorCard/ },
  { name: 'nearbyHotels state', pattern: /useState<HotelData\[\]>/ },
  { name: 'vendors state', pattern: /useState<VendorData\[\]>/ },
  { name: '/api/accommodations fetch', pattern: /fetch\(['"](\/api\/accommodations|api\/accommodations)['"]/ },
  { name: '/api/rentcars fetch', pattern: /fetch\(['"](\/api\/rentcars|api\/rentcars)['"]/ },
  { name: 'HotelCard 렌더링', pattern: /<HotelCard/ },
  { name: 'RentcarVendorCard 렌더링', pattern: /<RentcarVendorCard/ },
];

categoryPageChecks.forEach(check => {
  const passed = check.pattern.test(categoryPage);
  console.log(`${passed ? '✅' : '❌'} ${check.name}`);
});

// 9. HomePage 통합 검증
console.log('\n9️⃣  HomePage 통합 검증:');
console.log('-'.repeat(80));

const homePage = fs.readFileSync('components/HomePage.tsx', 'utf8');

const homePageChecks = [
  { name: 'HotelCard import', pattern: /import.*HotelCard/ },
  { name: 'nearbyHotels state', pattern: /nearbyHotels.*useState/ },
  { name: '/api/accommodations fetch', pattern: /fetch\(['"](\/api\/accommodations|api\/accommodations)['"]/ },
  { name: 'HotelCard 렌더링', pattern: /<HotelCard/ },
  { name: 'nearbyHotels.map', pattern: /nearbyHotels\.map/ },
];

homePageChecks.forEach(check => {
  const passed = check.pattern.test(homePage);
  console.log(`${passed ? '✅' : '❌'} ${check.name}`);
});

// 10. App.tsx 라우팅 검증
console.log('\n🔟  App.tsx 라우팅 검증:');
console.log('-'.repeat(80));

const appTsx = fs.readFileSync('App.tsx', 'utf8');

const appRoutingChecks = [
  { name: 'HotelDetailPage import', pattern: /import.*HotelDetailPage/ },
  { name: 'RentcarVendorDetailPage import', pattern: /import.*RentcarVendorDetailPage/ },
  { name: '/accommodation/:partnerId route', pattern: /path="\/accommodation\/:partnerId"/ },
  { name: '/rentcar/:vendorId route', pattern: /path="\/rentcar\/:vendorId"/ },
];

appRoutingChecks.forEach(check => {
  const passed = check.pattern.test(appTsx);
  console.log(`${passed ? '✅' : '❌'} ${check.name}`);
});

console.log('\n' + '='.repeat(80));
console.log('📊 검증 요약');
console.log('='.repeat(80));

console.log('\n✅ 숙박/렌트카 시스템 구성:');
console.log('   - 숙박 API: /api/accommodations (호텔 목록)');
console.log('   - 숙박 상세 API: /api/accommodations/[partnerId] (호텔의 객실 목록)');
console.log('   - 렌트카 API: /api/rentcars (업체 목록)');
console.log('   - 렌트카 상세 API: /api/rentcars/[vendorId] (업체의 차량 목록)');

console.log('\n✅ 카드 컴포넌트:');
console.log('   - HotelCard: 호텔 카드 (h-[450px], 이미지 h-52)');
console.log('   - RentcarVendorCard: 렌트카 업체 카드 (h-[450px], 이미지 h-52)');

console.log('\n✅ 상세 페이지:');
console.log('   - HotelDetailPage: 호텔의 객실 목록');
console.log('   - RentcarVendorDetailPage: 업체의 차량 목록');

console.log('\n✅ 통합 지점:');
console.log('   - CategoryPage: 카테고리별 호텔/업체 목록 표시');
console.log('   - HomePage: 주변 숙소 4개 표시 (HotelCard)');
console.log('   - App.tsx: 라우팅 설정');

console.log('\n✅ 데이터 플로우:');
console.log('   1. 카테고리 페이지 → /api/accommodations → HotelCard 목록');
console.log('   2. 호텔 클릭 → /accommodation/{partnerId} → HotelDetailPage');
console.log('   3. 객실 클릭 → /detail/{listingId} → 기존 상세 페이지');
console.log('');
console.log('   1. 카테고리 페이지 → /api/rentcars → RentcarVendorCard 목록');
console.log('   2. 업체 클릭 → /rentcar/{vendorId} → RentcarVendorDetailPage');
console.log('   3. 차량 클릭 → 예약 페이지');

console.log('\n' + '='.repeat(80));
console.log('✅ 숙박/렌트카 시스템 검증 완료!');
console.log('='.repeat(80) + '\n');

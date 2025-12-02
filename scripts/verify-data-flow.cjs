/**
 * 전체 데이터 흐름 일관성 검증 스크립트
 *
 * 옵션 시스템의 엔드투엔드 흐름 확인:
 * 1. 상품 등록 → listing.has_options 설정
 * 2. 옵션 등록 → listing_options 테이블
 * 3. 상세페이지 → 옵션 표시 및 선택
 * 4. 장바구니/결제 → selected_option_id 저장
 * 5. 결제 확정 → 재고 차감
 * 6. 환불/취소 → 재고 복구
 */

const fs = require('fs');
const path = require('path');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║            전체 데이터 흐름 일관성 검증                      ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

let errors = [];
let warnings = [];
let checks = [];

// 1. DetailPage 옵션 로딩 검증
console.log('=== 1. DetailPage 옵션 로딩 ===');
const detailPagePath = path.join(__dirname, '..', 'components', 'DetailPage.tsx');
const detailPageContent = fs.readFileSync(detailPagePath, 'utf8');

if (detailPageContent.includes('/api/listings/options?listing_id=')) {
  checks.push('DetailPage: 옵션 API 호출 ✅');
  console.log('  ✅ /api/listings/options API 호출');
} else {
  errors.push('DetailPage: 옵션 API 호출 누락');
  console.log('  ❌ 옵션 API 호출 누락');
}

if (detailPageContent.includes('productOptions.length > 0 && !selectedOption')) {
  checks.push('DetailPage: 옵션 선택 필수 검증 ✅');
  console.log('  ✅ 옵션 선택 필수 검증');
} else {
  warnings.push('DetailPage: 옵션 선택 필수 검증 없음');
  console.log('  ⚠️  옵션 선택 필수 검증 없음');
}

if (detailPageContent.includes('selectedOption:')) {
  checks.push('DetailPage: 장바구니에 옵션 정보 전달 ✅');
  console.log('  ✅ 장바구니에 옵션 정보 전달');
} else {
  errors.push('DetailPage: 장바구니에 옵션 정보 전달 누락');
  console.log('  ❌ 장바구니에 옵션 정보 전달 누락');
}

// 2. 옵션 API 검증
console.log('\n=== 2. 옵션 API (/api/listings/options) ===');
const optionsApiPath = path.join(__dirname, '..', 'api', 'listings', 'options.js');
if (fs.existsSync(optionsApiPath)) {
  const optionsApiContent = fs.readFileSync(optionsApiPath, 'utf8');

  if (optionsApiContent.includes('listing_options')) {
    checks.push('Options API: listing_options 테이블 사용 ✅');
    console.log('  ✅ listing_options 테이블 사용');
  } else {
    errors.push('Options API: listing_options 테이블 미사용');
    console.log('  ❌ listing_options 테이블 미사용');
  }

  if (optionsApiContent.includes("has_options = 1")) {
    checks.push('Options API: has_options 플래그 관리 ✅');
    console.log('  ✅ has_options 플래그 자동 관리');
  } else {
    warnings.push('Options API: has_options 플래그 관리 없음');
    console.log('  ⚠️  has_options 플래그 관리 없음');
  }
} else {
  errors.push('Options API: 파일 없음');
  console.log('  ❌ /api/listings/options.js 파일 없음');
}

// 3. 주문 생성 시 옵션 처리
console.log('\n=== 3. 주문 생성 (api/orders.js) ===');
const ordersPath = path.join(__dirname, '..', 'api', 'orders.js');
const ordersContent = fs.readFileSync(ordersPath, 'utf8');

if (ordersContent.includes('selected_option_id')) {
  checks.push('Orders: selected_option_id 저장 ✅');
  console.log('  ✅ selected_option_id bookings에 저장');
} else {
  warnings.push('Orders: selected_option_id 저장 없음');
  console.log('  ⚠️  selected_option_id 저장 없음 (확인 필요)');
}

if (ordersContent.includes('available_count = available_count -')) {
  checks.push('Orders: 재고 차감 로직 ✅');
  console.log('  ✅ 재고 차감 로직');
} else {
  errors.push('Orders: 재고 차감 로직 누락');
  console.log('  ❌ 재고 차감 로직 누락');
}

// 4. 벤더 대시보드 통합
console.log('\n=== 4. 벤더 대시보드 통합 ===');
const vendorDashboards = [
  'FoodVendorDashboard.tsx',
  'AttractionsVendorDashboard.tsx',
  'EventsVendorDashboard.tsx',
  'ExperienceVendorDashboard.tsx',
  'TourVendorDashboard.tsx'
];

for (const dashboard of vendorDashboards) {
  const dashboardPath = path.join(__dirname, '..', 'components', dashboard);
  if (fs.existsSync(dashboardPath)) {
    const content = fs.readFileSync(dashboardPath, 'utf8');
    const hasTimeSlot = content.includes('TimeSlotManager');
    const hasOptions = content.includes('ListingOptionsManager');

    if (hasTimeSlot || hasOptions) {
      console.log(`  ✅ ${dashboard}: ${hasTimeSlot ? 'TimeSlotManager' : ''} ${hasOptions ? 'ListingOptionsManager' : ''}`);
    } else {
      warnings.push(`${dashboard}: 옵션 관리 컴포넌트 없음`);
      console.log(`  ⚠️  ${dashboard}: 옵션 관리 컴포넌트 없음`);
    }
  }
}

// 5. 관리자 페이지 통합
console.log('\n=== 5. 관리자 페이지 ===');
const adminPagePath = path.join(__dirname, '..', 'components', 'AdminPageOptimized.tsx');
const adminPageContent = fs.readFileSync(adminPagePath, 'utf8');

if (adminPageContent.includes('AdminOptions')) {
  checks.push('Admin: AdminOptions 탭 통합 ✅');
  console.log('  ✅ AdminOptions 탭 통합됨');
} else {
  errors.push('Admin: AdminOptions 탭 누락');
  console.log('  ❌ AdminOptions 탭 누락');
}

// 6. 환불/취소 시 재고 복구
console.log('\n=== 6. 환불/취소 시 재고 복구 ===');
const refundFiles = [
  { path: 'api/payments/refund.js', name: 'refund.js' },
  { path: 'api/payments/confirm.js', name: 'confirm.js (결제 실패 복구)' },
  { path: 'api/admin/manual-refund.js', name: 'manual-refund.js' },
  { path: 'api/payments/webhook.js', name: 'webhook.js' },
  { path: 'api/payments/cron/expire-pending-orders.js', name: 'expire-pending-orders.js' }
];

for (const file of refundFiles) {
  const filePath = path.join(__dirname, '..', file.path);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('available_count = available_count +')) {
      console.log(`  ✅ ${file.name}: 재고 복구 로직`);
    } else {
      console.log(`  ⚠️  ${file.name}: 재고 복구 로직 없음 (확인 필요)`);
    }
  }
}

// 결과 요약
console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║                      검증 결과                              ║');
console.log('╠═══════════════════════════════════════════════════════════╣');
console.log(`║  ✅ 체크: ${checks.length}개                                          `);
console.log(`║  ❌ 오류: ${errors.length}개                                           `);
console.log(`║  ⚠️  경고: ${warnings.length}개                                          `);
console.log('╚═══════════════════════════════════════════════════════════╝');

if (errors.length > 0) {
  console.log('\n❌ 오류 목록:');
  errors.forEach(e => console.log(`  - ${e}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️ 경고 목록:');
  warnings.forEach(w => console.log(`  - ${w}`));
}

console.log('\n📊 데이터 흐름 요약:');
console.log('  1. 벤더/관리자 → TimeSlotManager/ListingOptionsManager → listing_options 테이블');
console.log('  2. DetailPage → /api/listings/options → 옵션 표시');
console.log('  3. 장바구니 → selected_option → api/orders.js → booking.selected_option_id');
console.log('  4. 결제 확정 → listing_options.available_count 차감');
console.log('  5. 환불/취소 → listing_options.available_count 복구');

process.exit(errors.length > 0 ? 1 : 0);

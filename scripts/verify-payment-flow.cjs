/**
 * 결제 플로우 재고 관리 검증 스크립트
 *
 * 모든 관련 파일에서 listing_options.available_count를 일관되게 사용하는지 확인
 */

const fs = require('fs');
const path = require('path');

const API_BASE = path.join(__dirname, '..', 'api');

const filesToCheck = [
  'orders.js',
  'payments/confirm.js',
  'payments/refund.js',
  'payments/webhook.js',
  'payments/cron/expire-pending-orders.js',
  'bookings/create-with-lock.js',
  'admin/manual-refund.js',
  'admin/orders.js'
];

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║       결제 플로우 재고 관리 일관성 검증                      ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

let errors = [];
let warnings = [];

for (const file of filesToCheck) {
  const filePath = path.join(API_BASE, file);

  if (!fs.existsSync(filePath)) {
    warnings.push(`파일 없음: ${file}`);
    console.log(`⚠️  ${file}: 파일 없음 (스킵)`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  console.log(`\n📄 ${file}`);

  // 1. product_options 참조 확인 (있으면 안됨)
  const productOptionsMatches = content.match(/product_options/g);
  if (productOptionsMatches) {
    errors.push(`${file}: product_options 참조 ${productOptionsMatches.length}개 발견`);
    console.log(`  ❌ product_options 참조 ${productOptionsMatches.length}개 발견`);
  } else {
    console.log(`  ✅ product_options 참조 없음`);
  }

  // 2. listing_options 사용 확인
  const listingOptionsMatches = content.match(/listing_options/g);
  if (listingOptionsMatches) {
    console.log(`  ✅ listing_options 참조 ${listingOptionsMatches.length}개`);
  }

  // 3. available_count 사용 확인
  const availableCountMatches = content.match(/available_count/g);
  if (availableCountMatches) {
    console.log(`  ✅ available_count 사용 ${availableCountMatches.length}개`);
  }

  // 4. stock 컬럼 직접 참조 확인 (listing_options에서)
  // listing_options.stock이 있으면 경고 (available_count를 사용해야 함)
  const wrongStockPattern = /listing_options[^]*?\.stock\s*[=<>]/g;
  const wrongStockMatches = content.match(wrongStockPattern);
  if (wrongStockMatches) {
    warnings.push(`${file}: listing_options.stock 참조 발견 (available_count 사용 권장)`);
    console.log(`  ⚠️  listing_options.stock 참조 발견 (available_count 사용 권장)`);
  }

  // 5. 재고 차감 로직 확인
  if (content.includes('available_count = available_count -') || content.includes('available_count - ?')) {
    console.log(`  ✅ 재고 차감 로직 존재`);
  }

  // 6. 재고 복구 로직 확인
  if (content.includes('available_count = available_count +') || content.includes('available_count + ?')) {
    console.log(`  ✅ 재고 복구 로직 존재`);
  }
}

// 결과 요약
console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║                      검증 결과                              ║');
console.log('╠═══════════════════════════════════════════════════════════╣');
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

process.exit(errors.length > 0 ? 1 : 0);

/**
 * 2단계: 예약 생성 시 listing stock 차감 로직 추가
 *
 * 수정할 파일:
 * - api/bookings/create-with-lock.js
 *
 * 추가할 로직:
 * 1. listing stock 확인 (stock_enabled가 true인 경우만)
 * 2. stock이 충분한지 검증
 * 3. 예약 생성 후 stock 차감
 */

const fs = require('fs');
const path = require('path');

function step2_addStockDeduction() {
  console.log('='.repeat(60));
  console.log('2단계: 예약 생성 시 listing stock 차감 로직 추가');
  console.log('='.repeat(60) + '\n');

  const filePath = path.join(process.cwd(), 'api/bookings/create-with-lock.js');

  console.log('📄 파일 경로:', filePath);

  if (!fs.existsSync(filePath)) {
    console.log('❌ 파일이 존재하지 않습니다.');
    return { success: false };
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // 이미 listing stock 차감 로직이 있는지 확인
  if (content.includes('UPDATE listings') && content.includes('SET stock = stock -')) {
    console.log('✅ listing stock 차감 로직이 이미 존재합니다!');
    console.log('   수동 확인 권장: stock_enabled 조건 체크 여부');
    return { success: true, exists: true };
  }

  console.log('\n📝 추가할 코드 위치 찾기...');

  // 옵션 재고 차감 부분 찾기 (// 4. 재고 차감 부분)
  const stockDeductionMarker = '// 4. 재고 차감 (옵션 재고 포함)';
  const markerIndex = content.indexOf(stockDeductionMarker);

  if (markerIndex === -1) {
    console.log('❌ 재고 차감 섹션을 찾을 수 없습니다.');
    console.log('   파일 구조가 변경되었을 수 있습니다.');
    return { success: false };
  }

  console.log('✅ 재고 차감 섹션 발견');

  console.log('\n📋 추가할 코드:');
  console.log(`
${stockDeductionMarker}
if (bookingData.selected_option) {
  // 옵션 재고 차감 (기존 코드)
  await db.execute(
    \`UPDATE product_options SET stock = stock - ? WHERE id = ? AND stock IS NOT NULL\`,
    [bookingData.num_adults, bookingData.selected_option.id]
  );
  console.log(\`✅ [Stock] Option stock decreased: \${bookingData.selected_option.id} (-\${bookingData.num_adults})\`);
}

// ✅ NEW: Listing 재고 차감 (stock_enabled인 경우만)
const listingStockCheck = await db.query(
  \`SELECT stock, stock_enabled FROM listings WHERE id = ?\`,
  [bookingData.listing_id]
);

if (listingStockCheck && listingStockCheck[0] && listingStockCheck[0].stock_enabled) {
  const currentStock = listingStockCheck[0].stock;
  const requestedQty = bookingData.num_adults + (bookingData.num_children || 0);

  if (currentStock !== null && currentStock < requestedQty) {
    // 이미 예약이 생성되었으므로, 롤백 필요
    await db.execute('DELETE FROM bookings WHERE id = ?', [bookingId]);
    await lockManager.releaseLock(lockKey);
    return {
      success: false,
      message: \`재고가 부족합니다. (현재 재고: \${currentStock}개)\`,
      code: 'INSUFFICIENT_STOCK'
    };
  }

  // 재고 차감
  await db.execute(
    \`UPDATE listings SET stock = stock - ? WHERE id = ?\`,
    [requestedQty, bookingData.listing_id]
  );
  console.log(\`✅ [Stock] Listing stock decreased: \${bookingData.listing_id} (-\${requestedQty})\`);
}
  `.trim());

  console.log('\n⚠️  주의사항:');
  console.log('  1. 이 스크립트는 코드를 자동으로 수정하지 않습니다.');
  console.log('  2. 위 코드를 수동으로 복사하여 해당 위치에 삽입하세요.');
  console.log('  3. 기존 옵션 재고 차감 코드는 유지하고, 그 아래에 추가하세요.');

  console.log('\n✅ 2단계 완료 (수동 작업 필요)');
  return { success: true, manual: true };
}

// 실행
const result = step2_addStockDeduction();
process.exit(result.success ? 0 : 1);

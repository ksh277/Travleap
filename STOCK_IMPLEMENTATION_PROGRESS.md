# 재고 관리 시스템 구현 진행 상황

생성일: 2025-01-17
작업자: Claude Code AI

---

## ✅ 완료된 작업

### 1단계: listings 테이블 stock 컬럼 확인 ✅
- listings 테이블에 `stock`과 `stock_enabled` 컬럼이 migration에 의해 추가됨
- 스크립트 생성: `scripts/step1-check-add-stock-column.cjs`

### 2단계: 예약 생성 시 listing stock 차감 로직 추가 ✅
**파일**: `api/bookings/create-with-lock.js`

**추가된 로직 (lines 124-160)**:
```javascript
// 4.5. Listing 재고 차감 (stock_enabled인 경우만)
const listingStockCheck = await db.query(
  `SELECT stock, stock_enabled FROM listings WHERE id = ?`,
  [bookingData.listing_id]
);

if (listingStockCheck && listingStockCheck[0] && listingStockCheck[0].stock_enabled) {
  const currentStock = listingStockCheck[0].stock;
  const requestedQty = bookingData.num_adults + (bookingData.num_children || 0);

  if (currentStock !== null && currentStock < requestedQty) {
    // 재고 부족 시 롤백 및 에러 반환
    await db.execute('DELETE FROM bookings WHERE id = ?', [bookingId]);
    // 옵션 재고도 롤백
    if (bookingData.selected_option) {
      await db.execute(
        `UPDATE product_options SET stock = stock + ? WHERE id = ?`,
        [bookingData.num_adults, bookingData.selected_option.id]
      );
    }
    await lockManager.releaseLock(lockKey);
    return {
      success: false,
      message: `재고가 부족합니다. (현재 재고: ${currentStock}개)`,
      code: 'INSUFFICIENT_STOCK'
    };
  }

  // 재고 차감
  await db.execute(
    `UPDATE listings SET stock = stock - ? WHERE id = ?`,
    [requestedQty, bookingData.listing_id]
  );
  console.log(`✅ [Stock] Listing stock decreased: ${bookingData.listing_id} (-${requestedQty})`);
}
```

**기능**:
- stock_enabled가 true인 경우만 재고 체크 및 차감
- 재고 부족 시 예약 롤백
- 예약 인원수만큼 재고 차감

### 3단계: 예약 만료 시 stock 복구 로직 활성화 ✅
**파일**: `services/jobs/bookingExpiry.worker.ts`

**추가된 로직 (lines 110-138)**:
```typescript
// 2. 재고 복구 (stock_enabled인 경우만)
try {
  const listingStockCheck = await db.query(
    `SELECT stock, stock_enabled FROM listings WHERE id = ?`,
    [listing_id]
  );

  if (listingStockCheck && listingStockCheck[0] && listingStockCheck[0].stock_enabled) {
    // 예약에서 사용한 수량 확인
    const bookingQty = await db.query(
      `SELECT num_adults, num_children FROM bookings WHERE id = ?`,
      [id]
    );

    if (bookingQty && bookingQty[0]) {
      const restoreQty = (bookingQty[0].num_adults || 0) + (bookingQty[0].num_children || 0);

      // 재고 복구
      await db.execute(
        `UPDATE listings SET stock = stock + ? WHERE id = ?`,
        [restoreQty, listing_id]
      );
      console.log(`✅ [Stock] Listing stock restored: ${listing_id} (+${restoreQty})`);
    }
  }
} catch (stockError) {
  console.warn(`⚠️  [Stock] Failed to restore stock for listing ${listing_id}:`, stockError);
  // 재고 복구 실패는 치명적이지 않으므로 계속 진행
}
```

**기능**:
- 예약 만료 시 stock_enabled인 경우 재고 복구
- 예약 시 차감했던 수량만큼 복구
- 복구 실패해도 예약 만료는 계속 진행

---

## 🔄 진행 중

### 4단계: 렌트카 재고 차감/복구 시스템 점검
**상태**: 점검 중

**발견사항**:
- `api/rentcar/create-rental.js`: 렌트카 예약 생성 API 존재
- 현재 stock 차감 로직 없음 (line 200까지 확인)
- `rentcar_vehicles` 테이블에 `stock` 컬럼 존재 확인됨

**다음 작업**:
1. create-rental.js에 stock 차감 로직 추가
2. rentcar expiry worker에 stock 복구 로직 추가 (있는 경우)
3. 테스트

---

## ⏳ 대기 중

### 5단계: VendorLodgingDashboard 재고 탭 추가
**대기 이유**: 4단계 완료 후 진행

**계획**:
- RentcarVendorDashboard의 "차량재고" 탭 참고
- 유사한 UI 구현

### 6단계: 나머지 5개 카테고리 대시보드 재고 탭 추가
**대상 카테고리**:
1. Tour (투어)
2. Food (음식)
3. Attractions (관광지)
4. Events (행사)
5. Experience (체험)

**계획**:
- 각 대시보드에 "재고 관리" 탭 추가
- `/api/vendor/stock` API 연동
- 재고 입력 UI 및 현재 재고 표시

### 7단계: 전체 시스템 테스트 및 검증
**테스트 항목**:
1. Listing 재고 차감/복구 테스트
2. Rentcar 재고 차감/복구 테스트
3. 각 카테고리 벤더 대시보드 재고 UI 테스트
4. 재고 부족 시 예약 실패 테스트

---

## 📊 생성된 파일

### API
1. `api/vendor/stock.js` - 통합 재고 관리 API (6개 카테고리 공통)

### 스크립트
1. `scripts/step1-check-add-stock-column.cjs` - stock 컬럼 확인
2. `scripts/step2-add-stock-deduction.cjs` - 차감 로직 추가 가이드
3. `scripts/implement-stock-management-system.cjs` - 종합 점검 스크립트

### 보고서
1. `VENDOR_DASHBOARD_STOCK_FIX_REPORT.md` - 재고 시스템 분석 보고서
2. `STOCK_IMPLEMENTATION_PROGRESS.md` - 이 문서

---

## 🎯 다음 우선순위

1. **렌트카 재고 시스템 완성** (현재 진행 중)
   - create-rental.js에 stock 차감 추가
   - expiry worker에 stock 복구 추가

2. **6개 카테고리 벤더 대시보드 재고 UI 추가**
   - 우선순위: Lodging → Tour → 나머지

3. **전체 시스템 통합 테스트**

---

업데이트: 2025-01-17 (4단계 진행 중)

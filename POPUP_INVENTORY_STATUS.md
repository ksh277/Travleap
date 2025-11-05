# 🎪 팝업스토어 재고 관리 시스템 현황

## ✅ 이미 완료된 것

### 1. 백엔드 API (pages/api/orders.js)
**재고 차감 로직**: ✅ **완벽하게 구현됨** (780-858번째 줄)

#### 구현 내용:
```javascript
// 1. 옵션 재고 관리 (product_options.stock)
if (item.selectedOption && item.selectedOption.id) {
    // ✅ 재고 확인 (FOR UPDATE 락)
    const stockCheck = await connection.execute(`
        SELECT stock, option_name FROM product_options
        WHERE id = ? FOR UPDATE
    `, [item.selectedOption.id]);

    // ✅ 재고 NULL = 무제한 재고
    if (currentStock !== null && currentStock < stockQuantity) {
        throw new Error('재고 부족');
    }

    // ✅ 재고 차감 (동시성 제어)
    await connection.execute(`
        UPDATE product_options
        SET stock = stock - ?
        WHERE id = ? AND stock IS NOT NULL AND stock >= ?
    `, [stockQuantity, optionId, stockQuantity]);
}

// 2. 상품 재고 관리 (listings.stock)
else {
    // ✅ 재고 확인 (stock_enabled=1일 때만)
    const stockCheck = await connection.execute(`
        SELECT stock, stock_enabled, title FROM listings
        WHERE id = ? FOR UPDATE
    `, [listingId]);

    // ✅ stock_enabled가 활성화되어 있을 때만 체크
    if (stockEnabled && currentStock !== null && currentStock < stockQuantity) {
        throw new Error('재고 부족');
    }

    // ✅ 재고 차감
    if (stockEnabled && currentStock !== null) {
        await connection.execute(`
            UPDATE listings
            SET stock = stock - ?
            WHERE id = ? AND stock >= ?
        `, [stockQuantity, listingId, stockQuantity]);
    } else {
        console.log('재고 관리 비활성화 (재고 차감 스킵)');
    }
}
```

#### 핵심 기능:
1. **옵션별 재고 관리**: product_options.stock
2. **상품별 재고 관리**: listings.stock + listings.stock_enabled
3. **무제한 재고**: stock IS NULL
4. **재고 부족 차단**: currentStock < stockQuantity → Error
5. **동시성 제어**: FOR UPDATE 락, stock >= ? 조건
6. **동시성 충돌 감지**: affectedRows === 0 체크

---

### 2. 프론트엔드 - 재고 조회 UI (PopupVendorDashboard.tsx)
**재고 표시**: ✅ **구현됨** (490-501번째 줄)

```tsx
<TableHead>재고</TableHead>
...
<TableCell>
    {product.stock !== undefined ? `${product.stock}개` : '무제한'}
</TableCell>
```

---

## ❌ 구현 필요한 것

### 1. 데이터베이스 마이그레이션
**파일 생성**: ✅ `database/add-popup-stock-management.sql`

#### 추가 필요 컬럼:
```sql
-- listings 테이블
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS stock INT DEFAULT NULL COMMENT '재고 수량 (NULL = 무제한)',
ADD COLUMN IF NOT EXISTS stock_enabled TINYINT(1) DEFAULT 0 COMMENT '재고 관리 활성화';

-- product_options 테이블
ALTER TABLE product_options
ADD COLUMN IF NOT EXISTS stock INT DEFAULT NULL COMMENT '옵션 재고';
```

**실행 상태**: ❌ **DB에 적용 필요**

---

### 2. 재고 입력/수정 UI

#### A. 관리자 페이지 (AdminPage.tsx)
**현재 상태**: 확인 필요

**필요한 UI**:
```tsx
// 상품 등록/수정 폼에 추가
<div className="form-group">
    <label>
        <input type="checkbox" checked={stockEnabled} onChange={...} />
        재고 관리 활성화
    </label>

    {stockEnabled && (
        <input
            type="number"
            value={stock}
            onChange={...}
            placeholder="재고 수량 (예: 100)"
        />
    )}
</div>

// 옵션 추가 시
{options.map((option, index) => (
    <div key={index}>
        <input placeholder="옵션명 (예: 빨강)" />
        <input placeholder="추가 가격" />
        <input type="number" placeholder="옵션 재고 (예: 50)" />
    </div>
))}
```

#### B. 벤더 대시보드 (PopupVendorDashboard.tsx)
**현재 상태**: 재고 조회만 가능, 수정 불가

**필요한 기능**:
1. 상품 목록에서 재고 직접 수정
2. "재고 관리" 탭 추가 (옵션)

```tsx
// 간단한 방식: 테이블에서 인라인 수정
<TableCell>
    {editMode[product.id] ? (
        <input
            type="number"
            value={stock[product.id]}
            onChange={...}
        />
    ) : (
        <span>{product.stock ?? '무제한'}</span>
    )}
    <button onClick={() => toggleEditMode(product.id)}>수정</button>
</TableCell>
```

---

## 🎯 현재 상태 요약

| 항목 | 상태 | 완성도 |
|------|------|--------|
| 재고 차감 로직 (API) | ✅ 완료 | 100% |
| 재고 부족 차단 | ✅ 완료 | 100% |
| 동시성 제어 | ✅ 완료 | 100% |
| 재고 조회 UI | ✅ 완료 | 100% |
| DB 컬럼 추가 | ❌ 미완료 | 0% |
| 재고 입력 UI (관리자) | ❌ 미완료 | 0% |
| 재고 수정 UI (벤더) | ❌ 미완료 | 0% |

**전체 완성도**: 57% (4/7)

---

## 🚀 작업 순서

### 즉시 실행 (0.5일)
1. **DB 마이그레이션 적용**
   ```bash
   mysql -u user -p database < database/add-popup-stock-management.sql
   ```
   또는 PlanetScale Dashboard에서 직접 실행

2. **기존 데이터 초기화** (선택)
   ```sql
   -- 모든 팝업 상품 재고 관리 비활성화 (기본값)
   UPDATE listings SET stock_enabled = 0, stock = NULL WHERE category = '팝업';

   -- 특정 상품만 재고 활성화 (테스트용)
   UPDATE listings SET stock_enabled = 1, stock = 100 WHERE id = 1;
   ```

### 단기 작업 (0.5일)
3. **관리자 페이지 재고 입력 UI 추가**
   - AdminPage.tsx 상품 등록/수정 폼 수정
   - stock_enabled 체크박스 추가
   - stock 입력 필드 추가
   - 옵션별 stock 입력 추가

### 중기 작업 (1일) - 선택사항
4. **벤더 대시보드 재고 수정 UI**
   - PopupVendorDashboard에 인라인 수정 기능 추가
   - 또는 별도 "재고 관리" 탭 추가

---

## 🧪 테스트 시나리오

### 시나리오 1: 재고 없는 상품 (무제한)
```sql
UPDATE listings SET stock_enabled = 0, stock = NULL WHERE id = 1;
```
→ ✅ 무한대로 주문 가능

### 시나리오 2: 재고 있는 상품 (100개)
```sql
UPDATE listings SET stock_enabled = 1, stock = 100 WHERE id = 2;
```
→ ✅ 주문 시 재고 차감 (100 → 99 → 98...)

### 시나리오 3: 재고 부족
```sql
UPDATE listings SET stock_enabled = 1, stock = 1 WHERE id = 3;
```
→ 2개 주문 시도 → ❌ "재고 부족: 현재 재고 1개, 주문 수량 2개"

### 시나리오 4: 옵션별 재고
```sql
UPDATE listings SET stock_enabled = 1, stock = NULL WHERE id = 4;
UPDATE product_options SET stock = 10 WHERE id = 1; -- "빨강" 10개
UPDATE product_options SET stock = 20 WHERE id = 2; -- "파랑" 20개
```
→ ✅ 빨강 10개까지, 파랑 20개까지 주문 가능

### 시나리오 5: 동시 주문 충돌
```
User A: 재고 1개인 상품 주문 시작 (FOR UPDATE 락 획득)
User B: 동일 상품 주문 시도 → ⏳ 대기 중
User A: 주문 완료 (재고 1 → 0, COMMIT)
User B: 재고 체크 → ❌ "재고 부족" 또는 "동시성 충돌"
```

---

## 📋 완료 체크리스트

### 백엔드 ✅
- [x] 재고 차감 로직 구현
- [x] 재고 부족 차단
- [x] 동시성 제어 (FOR UPDATE)
- [x] 옵션별 재고 지원

### 데이터베이스 ❌
- [ ] listings.stock 컬럼 추가
- [ ] listings.stock_enabled 컬럼 추가
- [ ] product_options.stock 컬럼 추가
- [ ] 인덱스 추가

### 프론트엔드 🔶
- [x] 재고 조회 UI (벤더)
- [ ] 재고 입력 UI (관리자)
- [ ] 재고 수정 UI (벤더) - 선택사항

---

## 💡 결론

### 질문: "팝업 재고 자동 차감 로직 완성했어?"
**답변**: ✅ **백엔드 로직은 이미 완성되어 있습니다!**

**구현된 것**:
- 재고 차감 ✅
- 재고 부족 차단 ✅
- 무제한 재고 지원 ✅
- 동시성 제어 ✅

**필요한 것**:
1. DB 마이그레이션 실행 (0.5일)
2. 관리자/벤더 UI에서 재고 입력 기능 (0.5-1일)

**총 작업 시간**: 1-1.5일

---

**작성일**: 2025-11-05
**파일**: `pages/api/orders.js:780-858`
**DB 마이그레이션**: `database/add-popup-stock-management.sql`

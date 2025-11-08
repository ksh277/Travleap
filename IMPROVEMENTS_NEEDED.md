# 주문 관리 개선 사항

## ✅ 현재 상태
- 21개 주문 모두 표시됨 ✅
- 렌트카 주문 정상 표시 ✅
- 팝업 주문 정상 표시 ✅
- 환불 기능 작동 ✅

---

## 🔧 개선 필요 사항

### 1️⃣ 주문번호 없는 주문 처리 (우선순위: 높음)

**문제:**
- ID 71, 69 주문: 주문번호가 null → 빈칸 또는 "주문"으로 표시됨
- category도 null → 카테고리 표시 안됨

**원인:**
- `payments.gateway_transaction_id` 필드가 NULL
- 결제 승인 전 생성되었거나 데이터 누락

**해결 방안:**

#### Option A: Fallback 주문번호 표시 (권장)
```javascript
// AdminPage.tsx 또는 AdminOrders.tsx
const displayOrderNumber = order.order_number || order.booking_number || `ORD-${order.id}`;
```

#### Option B: DB 수정 - 기존 주문에 주문번호 생성
```sql
UPDATE payments
SET gateway_transaction_id = CONCAT('ORD-', id)
WHERE gateway_transaction_id IS NULL OR gateway_transaction_id = '';
```

---

### 2️⃣ Eye Icon (상품 상세보기 버튼)

**현재 상태:**
- ✅ 이미 구현되어 있음 (AdminOrders.tsx:394-398)
- "확인" 버튼 → `/detail/${order.listing_id}` 열기

**판단:**
- **유지 권장** ✅
- 이유: 관리자가 주문된 상품의 상세 정보를 빠르게 확인 가능

**개선 제안:**
```javascript
// 버튼 텍스트 변경
<Eye className="h-3 w-3 mr-1" />
상품보기  // "확인"보다 명확
```

---

### 3️⃣ UI/UX 개선

#### A. 주문번호 표시 개선
```javascript
// 현재: #71 (ID만 표시)
// 개선: ORD-71 (주문번호가 없을 때 fallback)

{order.order_number || order.booking_number ? (
  <span className="font-mono text-sm">
    {order.order_number || order.booking_number}
  </span>
) : (
  <span className="font-mono text-sm text-gray-400">
    ORD-{order.id}
  </span>
)}
```

#### B. 카테고리 표시 개선
```javascript
// 현재: category null이면 아무것도 안 보임
// 개선: 기본값 표시

const displayCategory = order.category || (
  order.is_popup ? '팝업' :
  order.booking_id && order.booking_id.includes('RC') ? '렌트카' :
  '기타'
);
```

#### C. 상품명 표시 개선
```javascript
// 현재: "주문" (너무 일반적)
// 개선: items_info에서 실제 상품명 추출

const getProductTitle = (order) => {
  if (order.product_title && order.product_title !== '주문') {
    return order.product_title;
  }

  if (order.items_info && order.items_info.length > 0) {
    const firstItem = order.items_info[0];
    const itemName = firstItem.title || firstItem.name || '상품';
    return order.item_count > 1 ?
      `${itemName} 외 ${order.item_count - 1}건` :
      itemName;
  }

  return `주문 #${order.id}`;
};
```

#### D. 날짜 포맷 통일
```javascript
// 현재: "2025년 17일 오후 05:35" (월 누락)
// 개선: "2025년 11월 7일 17:35"

new Date(order.created_at).toLocaleString('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});
```

#### E. 테이블 정렬 기능
```javascript
// 추가: 주문번호, 날짜, 금액 기준 정렬 버튼
// 예: 최신순/과거순, 금액 높은순/낮은순
```

#### F. 필터 개선
```javascript
// 현재: 전체/대기중/확정/완료/환불대기/취소
// 추가: 카테고리별 필터 (팝업/렌트카/숙박/음식/체험)
```

---

### 4️⃣ 데이터 품질 개선 (DB 레벨)

#### A. 기존 주문 데이터 정리
```sql
-- 1. 주문번호 없는 주문에 주문번호 생성
UPDATE payments
SET gateway_transaction_id = CONCAT('ORD-', id)
WHERE (gateway_transaction_id IS NULL OR gateway_transaction_id = '')
  AND payment_status IN ('paid', 'completed', 'refunded');

-- 2. category 정보 복구 (bookings와 JOIN)
UPDATE payments p
LEFT JOIN bookings b ON p.booking_id = b.id
LEFT JOIN listings l ON b.listing_id = l.id
SET p.notes = JSON_SET(
  COALESCE(p.notes, '{}'),
  '$.category', l.category
)
WHERE p.notes IS NULL OR NOT JSON_CONTAINS_PATH(p.notes, 'one', '$.category');
```

#### B. API 개선 (pages/api/orders.js)
```javascript
// Line 293-334: category가 null인 경우 처리 추가

// 현재 코드 개선
category: order.category || (
  // bookings에서 category 가져오기
  order.booking_id ?
    (bookingsMap.get(order.booking_id)?.[0]?.category || null) :
    null
)
```

---

## 📋 권장 작업 순서

### 즉시 (5분):
1. ✅ DB에서 주문번호 없는 주문에 fallback 번호 생성
   ```sql
   UPDATE payments
   SET gateway_transaction_id = CONCAT('ORD-', id)
   WHERE id IN (71, 69);
   ```

### 단기 (30분):
2. ✅ 프론트엔드 fallback 로직 추가
   - 주문번호 표시 개선
   - 카테고리 표시 개선
   - 상품명 표시 개선

### 중기 (1-2시간):
3. ✅ UI/UX 개선
   - 날짜 포맷 통일
   - 정렬 기능 추가
   - 카테고리 필터 추가

### 장기 (선택):
4. 🔄 전체 데이터 정리 스크립트 작성
   - 모든 과거 주문 검증
   - 누락된 정보 복구

---

## 💡 추가 제안

### A. 통계 카드 개선
```javascript
// 현재: "총 주문 19건" (대시보드)
// 개선: 카테고리별 집계

총 주문: 21건
├─ 팝업: 15건
├─ 렌트카: 2건
├─ 숙박: 3건
└─ 기타: 1건
```

### B. 엑셀 내보내기 개선
```javascript
// 현재: "주문 내보내기" 버튼만 있음
// 개선: 실제 CSV/Excel 다운로드 기능 구현

columns: [
  '주문번호',
  '주문일시',
  '고객명',
  '연락처',
  '이메일',
  '카테고리',
  '상품명',
  '금액',
  '결제상태',
  '예약상태'
]
```

### C. 검색 개선
```javascript
// 현재: 고객명, 이메일 검색만
// 추가: 주문번호, 상품명, 전화번호 검색
```

---

## 🎯 최우선 작업 (빠르게 해결)

```sql
-- 1. DB에서 즉시 실행 (30초)
UPDATE payments
SET gateway_transaction_id = CONCAT('ORD-', id)
WHERE id IN (71, 69);
```

```javascript
// 2. AdminPage.tsx 수정 (5분)
// Line 4200 근처의 주문번호 표시 부분 수정

// 변경 전:
<td>{order.order_number}</td>

// 변경 후:
<td className="font-mono text-sm">
  {order.order_number || order.booking_number || `ORD-${order.id}`}
</td>
```

---

**예상 소요 시간:**
- 최우선 작업: 10분
- 전체 UI 개선: 1-2시간
- 데이터 정리: 30분

**현재 상태: 80% 완성**
**개선 후: 95% 완성**

# 배송비 계산 플로우 검증 완료

## 클라이언트 → 서버 데이터 흐름:

### 1. CartPage (장바구니)
```typescript
const mappedItems = cartItems.map(item => {
  let category = item.category || 'general';
  
  // 퍼플아일랜드 = 팝업 감지
  if (!category || category === 'general') {
    if (title.includes('퍼플아일랜드') || ...) {
      category = '팝업';
    }
  }
  
  return { ...item, category };
});

// 배송비 계산
const finalShippingFee = popupSubtotal >= 50000 ? 0 : 3000;

// orderSummary 생성
const orderSummary = {
  items: mappedItems,  // ← category 포함
  deliveryFee: finalShippingFee
};
```

### 2. DetailPage (바로 결제)
```typescript
const deliveryFee = isPopup ? (itemSubtotal >= 50000 ? 0 : 3000) : 0;

const orderData = {
  items: [{ ..., category: item.category }],  // ← category 포함
  deliveryFee: deliveryFee
};
```

### 3. PaymentPage
```typescript
const mappedItems = orderData.items.map((item: any) => ({
  ...
  category: item.category,  // ← category 전달
}));

api.createOrder({
  items: mappedItems,  // ← category 포함
  deliveryFee: orderData.deliveryFee || 0
});
```

### 4. Server API (orders.js)
```javascript
// 서버가 배송비를 재계산 (클라이언트 값 무시)
const hasPopupProduct = items.some(item => item.category === '팝업');

if (hasPopupProduct) {
  let popupSubtotal = 0;
  for (const item of items) {
    if (item.category === '팝업') {  // ← category 체크
      popupSubtotal += (itemPrice + optionPrice) * item.quantity;
    }
  }
  serverDeliveryFee = popupSubtotal >= 50000 ? 0 : 3000;
}

// 최종 금액 검증
const expectedTotal = serverCalculatedSubtotal + serverDeliveryFee - ...;
if (Math.abs(expectedTotal - total) > 1) {
  return { error: 'AMOUNT_MISMATCH' };
}
```

## 결론:

✅ CartPage: category 강제 설정 (퍼플아일랜드 감지)
✅ DetailPage: 배송비 계산 추가
✅ PaymentPage: category 전달
✅ Server: category 기반 배송비 재계산

## 사용자가 겪은 문제:

- 오래된 브라우저 캐시 (수정 전 코드)
- 오래된 장바구니 데이터 (category 없음)

## 해결 방법:

1. Ctrl+F5 강력 새로고침
2. localStorage 클리어
3. 장바구니 비우고 다시 담기

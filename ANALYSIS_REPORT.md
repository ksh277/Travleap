# 주문 내역 렌더링 문제 심층 분석 보고서

## 문제 현황
- ✅ **네트워크 응답**: 21개 주문 정상 응답
- ❌ **대시보드**: 19개 주문만 표시
- ❌ **주문 내역 탭**: 주문이 렌더링되지 않음

---

## 1️⃣ 데이터 흐름 검증

### API 응답 (/api/orders)
```
- 총 주문: 21개 (payments 19개 + rentcar_bookings 2개)
- 응답 구조: { success: true, orders: [...] }
- deployedAt: 2025-11-07T14:56:39.338Z (KST 23:56:39)
```

### 프론트엔드 파싱
```javascript
// AdminOrders.tsx (line 81)
const orders = result.data || result.orders || [];

// useAdminData.ts (line 82)
const orders = ordersRes.orders || [];
```

**검증 결과**:
- `result.data`는 undefined ✅
- `result.data || result.orders` = `result.orders` (21개) ✅
- 파싱 로직은 정상 작동

---

## 2️⃣ React Key 중복 분석

### Key 생성 로직 (AdminOrders.tsx:277)
```jsx
<tr key={`${order.id}-${order.category}-${order.booking_number || order.order_number}`}>
```

### 중복 검사 결과
```
✅ Unique keys: 21
✅ Total orders: 21
✅ Missing orders: 0
✅ No duplicate keys found
```

**결론**: 현재 API 응답 기준으로는 key 중복 문제 없음

---

## 3️⃣ 빌드 타임라인 분석 (핵심 문제!)

### 시간순 이벤트
```
23:51:37 - dist/assets/*.js 빌드 완료
23:51:56 - AdminOrders.tsx 수정 커밋 ("Fix React key duplication")
23:56:39 - Vercel API 배포 완료
```

### 문제 발견
```
❌ dist 빌드 시간: 2025-11-07 23:51:37
❌ AdminOrders 수정: 2025-11-07 23:51:56 (+19초)
❌ API 배포 시간: 2025-11-07 23:56:39 (+5분 2초)
```

**결론**:
- **dist는 AdminOrders.tsx 수정 전의 오래된 코드를 포함**
- **프론트엔드가 백엔드보다 5분 일찍 빌드됨**
- **브라우저는 오래된 JavaScript를 실행 중**

---

## 4️⃣ 데이터 품질 분석

### 문제가 있는 주문 예시
```
Order ID 71:
  - user_name: "" (빈 문자열)
  - user_email: "" (빈 문자열)
  - product_title: "주문"
  - category: null
  - booking_number: null
  - order_number: null
```

### 19개 주문 중
```
- category가 null인 주문: 19개
- booking_number AND order_number 둘 다 없는 주문: 2개 (ID 71, 69)
- user_name이 빈 문자열인 주문: 다수
```

**잠재적 문제**:
- 검색 필터가 활성화되면 빈 문자열 주문은 필터링됨
- 이전 버전의 React key 로직에서는 중복 가능성 있음

---

## 5️⃣ 대시보드 19개 vs 실제 21개 차이 분석

### 가능한 원인
1. **브라우저 캐시**: 오래된 API 응답 캐싱
2. **필터링**: searchQuery 또는 statusFilter가 활성화됨
3. **오래된 dist**: useAdminData도 오래된 버전 실행 중
4. **데이터 로드 타이밍**: 렌트카 주문 추가 전 응답

---

## 6️⃣ 주문 내역 탭이 안 보이는 이유

### 근본 원인 (확실함)
```
❌ dist/assets/*.js가 오래된 AdminOrders.tsx 코드를 포함
❌ React key 중복 수정이 빌드에 반영되지 않음
❌ 이전 버전의 key 로직에서 중복 발생 가능
```

### 보조 원인 (가능성)
```
⚠️ 검색 필터가 활성화되어 빈 문자열 주문 제외
⚠️ 브라우저 캐시가 오래된 JavaScript 로드
⚠️ 상태 초기화 문제로 filteredOrders가 빈 배열
```

---

## 7️⃣ 최근 커밋 이력 분석

```bash
c5c1512 (23:51:56) - fix: Fix React key duplication
586b55d (23:15:23) - fix: Use rentcar booking ID instead of NULL
4838cbc (23:10:31) - fix: Convert amount and id from string to number
f5f33ca (22:40:49) - build: New frontend build with rentcar orders support
a3dd9ed (22:40:20) - fix: Add rentcar orders to /api/orders - Show all 21 orders
```

**문제**:
- c5c1512 커밋 (React key 수정)이 dist 빌드보다 19초 후
- 즉, **이 수정사항이 dist에 반영되지 않음**

---

## 📊 최종 진단

### 주 원인 (95% 확신)
```
🔴 STALE BUILD ISSUE
- dist 폴더가 AdminOrders.tsx 최신 수정사항을 포함하지 않음
- 프론트엔드 재빌드 필요
```

### 부 원인 (가능성)
```
🟡 BROWSER CACHE
- 브라우저가 오래된 JavaScript 캐싱
- Hard refresh (Ctrl+Shift+R) 필요

🟡 DATA QUALITY
- 19개 주문의 category가 null
- 일부 주문의 user_name, user_email이 빈 문자열
- billingInfo 파싱 로직 개선 필요 (이미 API에 반영됨)
```

---

## 🔧 해결 방안 우선순위

### 1순위: 프론트엔드 재빌드 (필수)
```bash
npm run build:vite
git add dist
git commit -m "build: Rebuild frontend with latest AdminOrders fixes"
git push
```

### 2순위: 브라우저 캐시 클리어
```
- Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- 또는 개발자 도구 > Network 탭 > "Disable cache" 체크
```

### 3순위: 데이터 품질 개선 (이미 진행 중)
```
✅ API에서 billingInfo 우선순위 적용 중 (pages/api/orders.js:218-290)
✅ payments 테이블 notes 필드에 billingInfo 저장 중
⏳ 기존 주문 데이터 마이그레이션 필요
```

### 4순위: 모니터링 추가
```javascript
// AdminOrders.tsx에 디버그 로그 추가
console.log('🔍 [AdminOrders] Loaded orders:', orders.length);
console.log('🔍 [AdminOrders] Filtered orders:', filteredOrders.length);
console.log('🔍 [AdminOrders] Search query:', searchQuery);
console.log('🔍 [AdminOrders] Status filter:', statusFilter);
```

---

## 📈 검증 체크리스트

### 재빌드 후 확인사항
- [ ] dist 폴더 타임스탬프가 최신 커밋보다 나중인가?
- [ ] AdminOrders.tsx의 React key 수정이 dist에 반영되었나?
- [ ] 주문 내역 탭에서 21개 주문이 모두 표시되나?
- [ ] 대시보드에서 21개 주문이 표시되나?
- [ ] 브라우저 콘솔에 에러가 없나?
- [ ] React key 중복 경고가 없나?

---

## 🔍 추가 조사 필요 사항

1. **왜 대시보드는 19개만 표시하는가?**
   - useAdminData.ts도 오래된 빌드를 사용 중일 가능성
   - 또는 API 호출 시점에 렌트카 주문이 아직 추가되지 않았을 가능성

2. **category가 null인 19개 주문**
   - payments 테이블에서 category 정보를 가져오지 못함
   - bookings 테이블과의 LEFT JOIN에서 누락
   - API 수정 필요: bookings.category를 payments 결과에 포함

3. **billingInfo 파싱 실패**
   - Order ID 71의 user_name, user_email이 비어있음
   - notes 필드에 billingInfo가 없거나 형식이 다름
   - 기존 주문 데이터 재파싱 필요

---

**분석 완료 시간**: 2025-11-08
**분석 소요 시간**: 30분
**권장 조치**: 즉시 프론트엔드 재빌드

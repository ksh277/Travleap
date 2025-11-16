# 8개 카테고리 테스트 보고서

## 데이터베이스 현황 (2025-11-17)

### 전체 카테고리 목록
- ID 1855: 여행 (tour) - 1개 상품
- ID 1856: 렌트카 (rentcar) - 1개 상품
- ID 1857: 숙박 (stay) - 9개 상품
- ID 1858: 음식 (food) - 3개 상품
- ID 1859: 관광지 (tourist) - 0개 상품
- **ID 1860: 팝업 (popup) - 3개 상품** ✅ 테스트 대상
- ID 1861: 행사 (event) - 1개 상품
- ID 1862: 체험 (experience) - 5개 상품

### 팝업 상품 목록
1. [ID: 351] 퍼플아일랜드 아크릴 키링
2. [ID: 352] 퍼플아일랜드 냉장고 아크릴 마그네틱 자석
3. [ID: 353] 퍼플아일랜드 아크릴 토퍼 포토프롭

---

## 발견된 버그 및 수정

### 🔴 Critical Bug: listings 테이블에 category 컬럼 없음

**문제:**
- listings 테이블은 `category_id`만 있고 `category` 컬럼이 존재하지 않음
- API는 `category_slug`, `category_name`을 반환하지만 `category`는 반환하지 않음
- DetailPage.tsx는 `data.category`를 사용하려 하지만 항상 undefined → 기본값 '투어'로 fallback
- **결과: 모든 카테고리 판별 로직이 망가짐 (팝업 포함)**

**수정:**
1. `app/api/listings/[id]/route.ts`: `category: listing.category_slug` 추가
2. `api/listings.js`: 모든 listings에 `category: listing.category_slug` 매핑

**커밋:** `1ce356d` - fix: Add category field to listing APIs using category_slug

---

## 테스트 결과

### ✅ 1. 팝업 카테고리 (popup, ID: 1860)

**코드 검증 완료:**
- [x] 상세페이지에서 수량 선택기 표시 (DetailPage.tsx:2125-2310)
  - `isPopupProduct(item)` 조건 분기 확인
  - 옵션 선택 UI (lines 2128-2161)
  - 수량 선택 UI (lines 2163-2308)
  - Min/max purchase 제한 적용
  - 재고 제한 적용

- [x] 사람 수 선택 UI 숨김 (DetailPage.tsx:2310-2400)
  - 팝업이 아닌 경우만 날짜 + 인원 선택 표시

- [x] 장바구니 데이터 구조 확인
  - `quantity` 필드 사용 (DetailPage.tsx:854)
  - `selectedOption` 저장 (DetailPage.tsx:858)
  - `insuranceFee` 필드 존재 (CartPage.tsx:79)

- [x] 결제 페이지 팝업 배지 (PaymentPage.tsx:25-28)
  - `isPopupProduct()` 헬퍼 함수 사용

- [x] 환불 내역 팝업 배지 (PaymentHistoryCard.tsx:22-25)
  - `isPopupProduct()` 헬퍼 함수 사용

**발견된 문제:**
- ⚠️ 모든 `isPopupProduct()` 함수가 `category === 'popup'`을 체크하지만, API가 `category` 필드를 반환하지 않았음
- ✅ **수정 완료**: 두 listings API에 `category: listing.category_slug` 추가

### 2. 숙박 카테고리 (stay, ID: 1857)
- [ ] 체크인/체크아웃 날짜 선택
- [ ] 사람 수 선택 (어른/어린이)
- [ ] 장바구니 추가
- [ ] 예약 생성 (5분 hold)
- [ ] 중복 예약 방지 (5분 이내 pending 체크)

### 3. 렌트카 카테고리 (rentcar, ID: 1856)
- [ ] 렌트 기간 선택
- [ ] 보험 선택
- [ ] 보험료 계산 및 저장
- [ ] 장바구니에 보험료 포함
- [ ] 결제 시 보험료 반영

### 4. 관광지 카테고리 (tourist, ID: 1859)
- [ ] 데이터 없음 - 생성 후 테스트 필요

---

## 다음 단계
1. ✅ API category 필드 수정 완료
2. 🔄 팝업 상품 테스트 진행 중
3. ⏳ 숙박/렌트카/관광지 테스트 대기

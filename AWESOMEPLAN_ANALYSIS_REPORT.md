# awesomeplan.co.kr 상품 상세 페이지 30분 심층 분석 보고서

**분석 대상**: https://awesomeplan.co.kr/product/핀토-반려동물-포토-마그네틱-추모성장기장례용품-고양이-강아지/426/category/72/display/1/

**분석 일시**: 2025-11-06
**분석 시간**: 30분 심층 분석
**목적**: Travleap 상품 상세 페이지 개선을 위한 벤치마킹

---

## 📋 목차

1. [전체 페이지 구조](#1-전체-페이지-구조)
2. [이미지 갤러리 시스템](#2-이미지-갤러리-시스템)
3. [상품 옵션 및 가격 계산](#3-상품-옵션-및-가격-계산)
4. [CTA 버튼 및 구매 플로우](#4-cta-버튼-및-구매-플로우)
5. [리뷰 시스템](#5-리뷰-시스템)
6. [탭 구조](#6-탭-구조)
7. [모바일 대응](#7-모바일-대응)
8. [Travleap 현재 구현 비교](#8-travleap-현재-구현-비교)
9. [개선 권장사항](#9-개선-권장사항)
10. [구현 우선순위](#10-구현-우선순위)

---

## 1. 전체 페이지 구조

### 1.1 플랫폼 정보
- **CMS**: Cafe24 기반 쇼핑몰
- **에디터**: Edibot 디자인 에디터 통합
- **템플릿**: skin3 (모듈러 템플릿 시스템)
- **CDN**: Cafe24 이미지 CDN 사용

### 1.2 페이지 레이아웃

```
┌─────────────────────────────────────────┐
│         헤더 (로고, 검색, 장바구니)       │
├──────────────┬──────────────────────────┤
│              │                          │
│   이미지     │   상품 정보              │
│   갤러리     │   - 제목                 │
│   (4장)      │   - 가격                 │
│              │   - 옵션 선택            │
│              │   - 수량                 │
│              │   - CTA 버튼             │
│              │   - 공유/좋아요           │
├──────────────┴──────────────────────────┤
│         탭 메뉴 (제품상세/구매안내/리뷰/Q&A)  │
├─────────────────────────────────────────┤
│         탭 컨텐츠 (전체 로드됨)            │
├─────────────────────────────────────────┤
│         관련 상품 추천                    │
├─────────────────────────────────────────┤
│              푸터                        │
└─────────────────────────────────────────┘
```

### 1.3 기술 스택

**JavaScript 라이브러리:**
- jQuery (Cafe24 템플릿 기본)
- Cafe24 API SDK (JWT 인증)
- AOS (Animate On Scroll) - 스크롤 애니메이션

**추적/분석:**
- CA Analytics (poxo.com 전환 추적)
- JavaScript 에러 리포팅 (js-error-tracer-api.cafe24.com)

**결제/회원:**
- 세션 관리 (로그인 유지)
- 다중 통화 지원 (KRW 기본, USD 참조)
- 적립금/마일리지 시스템

---

## 2. 이미지 갤러리 시스템

### 2.1 이미지 구조

**이미지 개수**: 4개
**이미지 크기 변형**:
- `big`: 메인 디스플레이용 (큰 이미지)
- `small`: 썸네일용
- `tiny`: 관련 상품 썸네일
- `extra/big`, `extra/small`: 추가 샷용

**CDN URL 구조**:
```
https://ecimg.cafe24img.com/pg1610b83695515062/awesomeplan4606/
web/product/{size}/{date}/{filename}.jpg
```

### 2.2 썸네일 네비게이션

**구현 방식**: 캐러셀 스타일 리스트

```html
<ul>
  <li data-param="{$zoom_param}">
    <a href="#none">
      <img class="[thumb_img_class]" src="...">
    </a>
  </li>
</ul>
```

**특징**:
- 가로 스크롤 방식
- 클릭 시 메인 이미지 전환
- Active 상태 관리
- 모바일: 싱글 로우 스와이프

### 2.3 메인 이미지 디스플레이

**Zoom 기능**:
- `data-param="{$zoom_param}"` 속성 사용
- Lightbox는 명시적으로 보이지 않음
- 클릭 핸들러로 이미지 전환

**Lazy Loading**:
```css
#prdDetailContentLazy img[src=""],
#prdDetailContentLazy img:not([src]) {
  visibility: hidden !important;
  height: 1px !important;
}
```

- `ec-data-src` 속성으로 지연 로드
- 상세 컨텐츠는 스크롤 시 로드
- AOS 프레임워크와 연동

### 2.4 이미지 최적화

1. **다중 해상도**: big/small/tiny 버전으로 용도별 최적화
2. **CDN**: Cafe24 CDN으로 빠른 로딩
3. **Lazy Load**: 뷰포트에 들어올 때만 로드
4. **캐싱**: 날짜별 경로로 캐시 관리

---

## 3. 상품 옵션 및 가격 계산

### 3.1 옵션 선택기 구조

**HTML**:
```html
<select class="option-select">
  <option>사이즈 선택 (필수)</option>
  <option value="120x168">120x168 (5,600원)</option>
  <option value="150x210">150x210 (+5,000원)</option>
</select>
```

**필수 여부**: `"is_mandatory":"T"` (필수 선택)

### 3.2 가격 데이터 구조

**JSON 형식**:
```javascript
option_stock_data = '{
  "P00000QK000A": {
    "option_price": 5600,
    "stock_number": 9999,
    "option_name": "120x168",
    "use_stock": "T",
    "is_display": "T",
    "is_selling": "T"
  },
  "P00000QK000B": {
    "option_price": 10600,
    "stock_number": 9999,
    "option_name": "150x210"
  }
}'

option_value_mapper = '{
  "120x168": "P00000QK000A",
  "150x210": "P00000QK000B"
}'
```

**가격 정보**:
- 기본가: 5,600원 (120x168)
- 옵션가: 10,600원 (150x210, +5,000원)
- `origin_option_added_price`: 추가 금액 별도 저장

### 3.3 옵션 변경 이벤트

**JavaScript 핸들러**:
```javascript
CAFE24.SHOP_FRONT_NEW_OPTION_BIND.initChooseBox()
CAFE24.SHOP_FRONT_NEW_OPTION_COMMON.initObject()
CAFE24.SHOP_FRONT_NEW_OPTION_DATA.initData()
```

**동작**:
1. 옵션 선택 시 가격 동적 업데이트
2. 재고 검증 (`stock_number`)
3. 필수 옵션 미선택 시 에러: "필수 옵션을 선택해 주세요"

### 3.4 수량 선택기

**제약 조건**:
- `product_min = '1'` (최소 1개)
- `product_max = '-1'` (무제한)
- `buy_unit_type = 'O'` (주문 단위)

**UI**: 증가/감소 버튼 방식

### 3.5 총 가격 계산

**공식**:
```
총 상품금액 = (옵션 가격 × 수량) + 배송비
```

**배송비**:
- 기본: 3,000원
- 조건부 무료: 30,000원 이상 구매 시

### 3.6 재고 관리

**재고 설정**:
- `stock_manage = '1'` (재고 관리 활성화)
- `use_soldout = "F"` (품절 아님)
- 재고 수량: 9999 (사실상 무제한)

**품절 표시**:
```javascript
aSoldoutDisplay = {"426":"품절"}
```

---

## 4. CTA 버튼 및 구매 플로우

### 4.1 주요 버튼

**장바구니 추가**:
- 텍스트: "장바구니"
- 아이콘: 회색 장바구니 SVG
- 배경: 밝은 회색

**바로 구매**:
- 텍스트: "바로 구매"
- 아이콘: 흰색 구매 SVG
- 배경: 메인 컬러

**기타 버튼**:
- "예약 주문" (품절 시)
- "정기배송 신청"
- "좋아요" (위시리스트)

### 4.2 버튼 상태

**SOLD OUT 상태**:
- 버튼 비활성화
- 텍스트: "SOLD OUT"
- 재고 복구 시 자동 활성화

### 4.3 장바구니 추가 플로우

**API 호출**:
```javascript
CAFE24API.addCurrentProductToCart({
  mall_id: "...",
  timestamp: "...",
  app_key: "...",
  member_id: "...",
  hmac: "..."
})
```

**검증**:
1. 옵션 필수 선택 확인
2. 수량 유효성 검증
3. 재고 확인

**응답**:
- 성공: 장바구니 카운트 업데이트
- 실패: 에러 메시지 표시

### 4.4 바로 구매 플로우

**프로세스**:
1. 옵션/수량 검증
2. `precreateOrder` 또는 직접 결제 페이지 이동
3. 장바구니 리뷰 생략
4. 즉시 주문서 작성

### 4.5 위시리스트

**구현**:
- 하트 아이콘 버튼
- `CAFE24.SHOP_FRONT_NEW_LIKE_COMMON` 관리
- 현재 비활성화: `"bIsUseLikeProduct":false`

### 4.6 소셜 공유

**플랫폼**:
- KakaoTalk
- Line
- Band
- Naver
- Facebook
- Twitter

**엔드포인트**:
```
/exec/front/Product/Social/
```

### 4.7 에러 핸들링

**AJAX 에러**:
- HTTP 422: SDK 사용 불가
- HTTP 403: 인증 실패
- 메시지: "This sdk is not available on the current page"

**로딩 상태**:
- 로딩 GIF 표시
- 텍스트: "본 결제 창은 결제완료 후 자동으로 닫히며"
- 자동 닫힘 처리

### 4.8 모달/다이얼로그

**진행 중 확인**:
- "현재 결제가 진행중입니다"
- 중복 클릭 방지

**해외 배송 모달**:
- 200+ 국가 선택기
- 언어 선택 기능

---

## 5. 리뷰 시스템

### 5.1 구조

**위치**: 탭 인터페이스 내 (제품상세/구매안내/리뷰/Q&A 중 하나)

### 5.2 평점 표시

**현재 상태** (0 리뷰):
```
전체 0 개
-.- /5
```

**분포 차트**:
- 5점: -
- 4점: -
- 3점: -
- 2점: -
- 1점: -

### 5.3 리뷰 카드 (예상 구조)

**포함 정보**:
- 리뷰어 이름
- 별점 (5점 만점)
- 리뷰 텍스트
- 작성 날짜
- 이미지 (포토 리뷰)

### 5.4 포토 리뷰 갤러리

**섹션**: "포토리뷰 모아보기(최근 리뷰 20개)"
- 이미지 기반 리뷰만 별도 표시
- 최대 20개 표시
- 갤러리 형식

### 5.5 리뷰 작성

**버튼**:
```html
<a href="/board/review/write.html?board_no=4&product_no=426&cate_no=72&display_group=1">
  리뷰 작성하기
</a>
```

**파라미터**:
- `board_no`: 리뷰 게시판 번호
- `product_no`: 상품 번호
- `cate_no`: 카테고리 번호
- `display_group`: 표시 그룹

### 5.6 필터링/정렬

- "전체 보기" 링크
- 포토 리뷰 vs 텍스트 리뷰 분리
- 현재 빈 상태에서는 정렬 옵션 미표시

### 5.7 빈 상태 처리

**메시지**: "게시물이 없습니다"
**액션**:
- "전체 보기"
- "리뷰작성하기"

### 5.8 인터랙션

- 도움됨/좋아요 버튼 (예상, 현재 미표시)
- 페이지네이션 (리뷰 있을 때)

---

## 6. 탭 구조

### 6.1 탭 목록 (순서대로)

1. **제품상세** (`#prdDetail`)
2. **상품구매안내** (`#prdInfo`)
3. **리뷰** (`#prdReview`) - 0개
4. **Q&A** (`#prdQnA`) - 0개

### 6.2 구현 방식

**네비게이션**: 해시 기반 앵커 링크
```html
<a href="#prdDetail">제품상세</a>
<a href="#prdInfo">상품구매안내</a>
<a href="#prdReview">리뷰 (0)</a>
<a href="#prdQnA">Q&A (0)</a>
```

**장점**:
- URL에 탭 상태 반영 (#prdReview)
- 뒤로가기 지원
- JavaScript 없이 동작 가능

### 6.3 컨텐츠 로딩

**전략**: 전체 사전 로드
- 모든 탭 컨텐츠가 DOM에 존재
- ID로 섹션 구분
- 스크롤 점프 방식

**Lazy Loading**:
- 제품상세 섹션의 이미지만 lazy load
- `.edibot-product-detail` 래퍼 사용
- `CAFE24.FRONT_NEW_PRODUCT_LAZYLOAD.resetDetailContent()`

### 6.4 각 탭 컨텐츠

#### 제품상세 (`#prdDetail`)
- 상품 설명 (리치 텍스트)
- 상세 이미지 (여러 장)
- 이미지 태깅: `.edb-img-tag-w`, `.edb-tag`
- Edibot 에디터로 작성

#### 상품구매안내 (`#prdInfo`)
- **상품결제정보**: 결제 수단, 할부 정보
- **배송정보**: 배송비, 배송 기간, 지역별 배송
- **교환 및 반품정보**: 정책, 유의사항

#### 리뷰 (`#prdReview`)
- 평점 요약 (-.-/5)
- 별점 분포
- 리뷰 목록 (현재 0개)
- 포토 리뷰 갤러리
- "리뷰 작성하기" 버튼

#### Q&A (`#prdQnA`)
- 질문 목록 (현재 0개)
- "상품문의하기" 버튼
- 빈 상태 메시지

### 6.5 탭 스타일링

**CSS 클래스**:
- `.xans-product-*`: Cafe24 템플릿 클래스
- Active/Inactive 상태: CSS로 처리 (명시적 코드 미확인)

### 6.6 Sticky 네비게이션

- 현재 코드에서 명시적 sticky 없음
- Cafe24 템플릿에서 처리 가능성

### 6.7 딥 링킹

**지원**: ✅
- URL: `product/.../#prdReview`
- 직접 특정 탭으로 이동 가능
- 공유 시 탭 위치 유지

### 6.8 모바일 vs 데스크톱

**동일 구조**:
- 같은 HTML
- CSS로 반응형 처리
- 모바일에서도 해시 탭 동작

### 6.9 CSS 네임스페이스

**Cafe24 템플릿**:
- `.xans-product-detail`
- `.xans-product-action`
- `.xans-product-review`

**Edibot 에디터**:
- `.edibot-product-detail`
- `.edb-img-tag-w`

### 6.10 컨텐츠 구조

**Flat DOM**:
```html
<div id="prdDetail">...</div>
<div id="prdInfo">...</div>
<div id="prdReview">...</div>
<div id="prdQnA">...</div>
```

- 중첩 탭 패널 구조 없음
- 섹션별 독립적 렌더링
- 스크롤로 섹션 이동

---

## 7. 모바일 대응

### 7.1 모바일 감지

**플래그**:
```javascript
CAFE24.MOBILE = false  // 현재 데스크톱
```

### 7.2 이미지 처리

**별도 템플릿**:
- `xans-product-mobileimage`: 모바일 전용
- 데스크톱: 표준 뷰어
- 스와이프 지원: `$swipe = yes`

**슬라이더 초기화**:
```javascript
$S.bSlider = false  // 초기 상태
$S.sMode = "single"  // 싱글 이미지 모드
```

### 7.3 레이아웃

**스킨 코드**: "skin3" (반응형 템플릿)

**예상 브레이크포인트**:
- 모바일: < 768px
- 태블릿: 768px ~ 1024px
- 데스크톱: > 1024px

### 7.4 터치 인터랙션

- 이미지 갤러리 스와이프
- 탭 터치 이벤트
- 버튼 터치 영역 최적화

---

## 8. Travleap 현재 구현 비교

### 8.1 Travleap DetailPage 분석

**파일**: `components/DetailPage.tsx`

**현재 기능**:
- ✅ 이미지 갤러리 (ImageWithFallback 컴포넌트)
- ✅ 탭 시스템 (Radix UI Tabs)
- ✅ 리뷰 시스템 (ExtendedReview 인터페이스)
- ✅ 옵션 시스템 (hasOptions, minPurchase, maxPurchase)
- ✅ 장바구니 기능 (useCartStore)
- ✅ 인증 (useAuth)
- ✅ 북마크/좋아요
- ✅ 구글 맵스 통합

**UI 컴포넌트** (Radix UI):
- Tabs
- Card
- Button
- Input
- Textarea
- Calendar
- Popover
- Dialog

### 8.2 비교표

| 기능 | awesomeplan.co.kr | Travleap (현재) | 비고 |
|------|-------------------|-----------------|------|
| **이미지 갤러리** | 4개, 썸네일 캐러셀, Lazy Load | ImageWithFallback, 단순 표시 | 👉 Travleap: 썸네일 네비게이션 추가 필요 |
| **이미지 Zoom** | data-param 기반 | ❌ 없음 | 👉 Lightbox 추가 권장 |
| **옵션 시스템** | 드롭다운, JSON 가격 계산 | hasOptions 플래그만 | 👉 고급 옵션 시스템 필요 |
| **재고 관리** | stock_number, use_stock | stockEnabled, stock | ✅ 유사 |
| **가격 계산** | 옵션가 + 수량 + 배송비 | 기본 가격만 | 👉 복잡한 가격 로직 추가 필요 |
| **장바구니 버튼** | 회색 배경, 아이콘 | useCartStore 사용 | ✅ 유사 |
| **바로 구매** | precreateOrder | ❌ 없음 | 👉 바로 구매 기능 추가 |
| **위시리스트** | 좋아요 버튼 | isFavorite 상태만 | ✅ 유사 |
| **소셜 공유** | 6개 플랫폼 | Share2 아이콘만 | 👉 실제 공유 기능 추가 필요 |
| **리뷰 시스템** | 별점, 포토, 도움됨 | ExtendedReview (코드만) | 👉 포토 리뷰, 필터링 추가 |
| **리뷰 작성** | 별도 페이지 링크 | ❌ 모달/인라인 없음 | 👉 리뷰 작성 UI 필요 |
| **Q&A** | 별도 탭 | ❌ 없음 | 👉 Q&A 시스템 추가 고려 |
| **탭 시스템** | 해시 기반 앵커 | Radix UI Tabs | ✅ Travleap 더 현대적 |
| **딥 링킹** | ✅ URL 해시 | ❌ 없음 | 👉 URL 상태 반영 추가 |
| **Lazy Loading** | 상세 이미지 | ❌ 없음 | 👉 성능 개선 필요 |
| **모바일 대응** | 별도 템플릿 | 반응형 CSS | ✅ Travleap 방식 더 효율적 |
| **에러 핸들링** | AJAX 에러 표시 | Toast 메시지 | ✅ 유사 |
| **로딩 상태** | GIF 표시 | Loader2 아이콘 | ✅ Travleap 더 현대적 |

### 8.3 Travleap의 강점

1. **현대적 기술 스택**:
   - React 18
   - TypeScript
   - Radix UI (접근성 우수)
   - Tailwind CSS

2. **컴포넌트 재사용성**:
   - 독립적 UI 컴포넌트
   - 타입 안전성
   - 유지보수 용이

3. **사용자 인증**:
   - useAuth 훅
   - JWT 기반
   - 세션 관리

4. **장바구니 상태 관리**:
   - useCartStore (Zustand?)
   - 전역 상태
   - 실시간 업데이트

### 8.4 Travleap의 개선 필요 영역

1. **이미지 갤러리**:
   - 썸네일 네비게이션 없음
   - Zoom/Lightbox 없음
   - Lazy Loading 없음

2. **옵션 시스템**:
   - 단순 플래그만 존재
   - 가격 계산 로직 미흡
   - UI 인터랙션 부족

3. **리뷰 시스템**:
   - 인터페이스만 정의됨
   - 실제 UI 구현 없음
   - 포토 리뷰 미지원

4. **구매 플로우**:
   - "바로 구매" 없음
   - 소셜 공유 미구현
   - Q&A 시스템 없음

---

## 9. 개선 권장사항

### 9.1 우선순위 높음 (Critical)

#### 1. 이미지 갤러리 고도화

**현재 문제**:
- 단일 이미지만 표시
- 썸네일 네비게이션 없음
- Zoom 기능 없음

**개선안**:
```tsx
// components/ProductImageGallery.tsx
import { useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
}

export function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* 메인 이미지 */}
      <div
        className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-zoom-in"
        onClick={() => setIsLightboxOpen(true)}
      >
        <img
          src={images[selectedIndex]}
          alt={`${productName} ${selectedIndex + 1}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {selectedIndex + 1} / {images.length}
        </div>
        <button className="absolute bottom-4 right-4 bg-white p-2 rounded-full shadow-lg">
          <ZoomIn className="w-5 h-5" />
        </button>
      </div>

      {/* 썸네일 */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedIndex(index)}
            className={`
              relative flex-shrink-0 w-20 h-20 rounded border-2 overflow-hidden
              ${index === selectedIndex ? 'border-purple-600' : 'border-gray-200'}
            `}
          >
            <img
              src={image}
              alt={`${productName} 썸네일 ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-5xl">
          <div className="relative">
            <img
              src={images[selectedIndex]}
              alt={`${productName} ${selectedIndex + 1}`}
              className="w-full h-auto"
            />
            <button
              onClick={() => setSelectedIndex((prev) => (prev - 1 + images.length) % images.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={() => setSelectedIndex((prev) => (prev + 1) % images.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

**작업 시간**: 4-6시간

---

#### 2. 고급 옵션 시스템

**현재 문제**:
- hasOptions 플래그만 존재
- 가격 계산 없음
- 재고 연동 미흡

**개선안**:
```tsx
// components/ProductOptions.tsx
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Minus, Plus } from 'lucide-react';

interface ProductOption {
  id: string;
  name: string;
  price: number;
  priceAdjustment: number;
  stockNumber: number;
  isAvailable: boolean;
}

interface ProductOptionsProps {
  basePrice: number;
  options: ProductOption[];
  minQuantity?: number;
  maxQuantity?: number;
  onPriceChange: (total: number) => void;
  onSelectionChange: (optionId: string, quantity: number) => void;
}

export function ProductOptions({
  basePrice,
  options,
  minQuantity = 1,
  maxQuantity = 999,
  onPriceChange,
  onSelectionChange
}: ProductOptionsProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [quantity, setQuantity] = useState(minQuantity);

  const selectedOption = options.find(opt => opt.id === selectedOptionId);

  useEffect(() => {
    if (selectedOption) {
      const total = selectedOption.price * quantity;
      onPriceChange(total);
      onSelectionChange(selectedOption.id, quantity);
    }
  }, [selectedOption, quantity]);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(minQuantity, Math.min(maxQuantity, quantity + delta));

    // 재고 확인
    if (selectedOption && newQuantity > selectedOption.stockNumber) {
      toast.error(`재고가 ${selectedOption.stockNumber}개만 남았습니다.`);
      return;
    }

    setQuantity(newQuantity);
  };

  return (
    <div className="space-y-4 border rounded-lg p-4">
      {/* 옵션 선택 */}
      <div>
        <label className="block text-sm font-medium mb-2">
          옵션 선택 <span className="text-red-500">*</span>
        </label>
        <Select value={selectedOptionId} onValueChange={setSelectedOptionId}>
          <SelectTrigger>
            <SelectValue placeholder="옵션을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem
                key={option.id}
                value={option.id}
                disabled={!option.isAvailable || option.stockNumber === 0}
              >
                {option.name} - {option.price.toLocaleString()}원
                {option.priceAdjustment !== 0 && (
                  <span className="text-sm text-gray-500">
                    {' '}(+{option.priceAdjustment.toLocaleString()}원)
                  </span>
                )}
                {option.stockNumber <= 10 && (
                  <span className="text-red-500 text-xs ml-2">
                    (재고 {option.stockNumber}개)
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 수량 선택 */}
      {selectedOption && (
        <div>
          <label className="block text-sm font-medium mb-2">수량</label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= minQuantity}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="w-16 text-center font-medium">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(1)}
              disabled={quantity >= maxQuantity || quantity >= selectedOption.stockNumber}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 가격 요약 */}
      {selectedOption && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">상품 금액</span>
            <span className="font-medium">{(selectedOption.price * quantity).toLocaleString()}원</span>
          </div>
          <div className="flex justify-between items-center text-lg font-bold">
            <span>총 금액</span>
            <span className="text-purple-600">{(selectedOption.price * quantity).toLocaleString()}원</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">총 {quantity}개</p>
        </div>
      )}
    </div>
  );
}
```

**작업 시간**: 6-8시간

---

#### 3. 포토 리뷰 시스템

**현재 문제**:
- 리뷰 인터페이스만 있음
- 실제 UI 없음
- 포토 리뷰 미지원

**개선안**:
```tsx
// components/ProductReviews.tsx
import { useState } from 'react';
import { Star, ThumbsUp, Camera, Filter } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';

interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  images?: string[];
  helpful: number;
  verified: boolean;
  optionName?: string;
}

interface ProductReviewsProps {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  onWriteReview: () => void;
}

export function ProductReviews({
  reviews,
  averageRating,
  totalReviews,
  onWriteReview
}: ProductReviewsProps) {
  const [filter, setFilter] = useState<'all' | 'photo'>('all');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const filteredReviews = filter === 'photo'
    ? reviews.filter(r => r.images && r.images.length > 0)
    : reviews;

  // 별점 분포 계산
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: (reviews.filter(r => r.rating === rating).length / totalReviews) * 100
  }));

  return (
    <div className="space-y-6">
      {/* 평점 요약 */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 평균 별점 */}
          <div className="text-center md:text-left">
            <div className="text-5xl font-bold mb-2">{averageRating.toFixed(1)}</div>
            <div className="flex items-center justify-center md:justify-start gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < Math.round(averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-600">전체 {totalReviews}개 리뷰</p>
          </div>

          {/* 별점 분포 */}
          <div className="space-y-2">
            {ratingDistribution.map(({ rating, count, percentage }) => (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-sm w-8">{rating}점</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">{count}개</span>
              </div>
            ))}
          </div>
        </div>

        {/* 포토 리뷰 미리보기 */}
        {reviews.some(r => r.images && r.images.length > 0) && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3">포토 리뷰 ({reviews.filter(r => r.images?.length).length})</h4>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
              {reviews
                .filter(r => r.images && r.images.length > 0)
                .slice(0, 12)
                .flatMap(r => r.images!)
                .slice(0, 12)
                .map((image, index) => (
                  <Dialog key={index}>
                    <DialogTrigger asChild>
                      <button className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition">
                        <img src={image} alt={`리뷰 이미지 ${index + 1}`} className="w-full h-full object-cover" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <img src={image} alt={`리뷰 이미지 ${index + 1}`} className="w-full h-auto" />
                    </DialogContent>
                  </Dialog>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* 필터 & 작성 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            전체 ({totalReviews})
          </Button>
          <Button
            variant={filter === 'photo' ? 'default' : 'outline'}
            onClick={() => setFilter('photo')}
            size="sm"
          >
            <Camera className="w-4 h-4 mr-1" />
            포토 ({reviews.filter(r => r.images?.length).length})
          </Button>
        </div>
        <Button onClick={onWriteReview} className="bg-purple-600">
          리뷰 작성하기
        </Button>
      </div>

      {/* 리뷰 목록 */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>아직 리뷰가 없습니다.</p>
            <p className="text-sm mt-2">첫 리뷰를 남겨주세요!</p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <div key={review.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
              {/* 리뷰 헤더 */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{review.userName}</span>
                    {review.verified && (
                      <Badge variant="secondary" className="text-xs">
                        구매 확인
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span>•</span>
                    <span>{review.date}</span>
                    {review.optionName && (
                      <>
                        <span>•</span>
                        <span>{review.optionName}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 리뷰 내용 */}
              <p className="text-gray-700 mb-3">{review.comment}</p>

              {/* 리뷰 이미지 */}
              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 mb-3">
                  {review.images.map((image, index) => (
                    <Dialog key={index}>
                      <DialogTrigger asChild>
                        <button className="w-20 h-20 rounded-lg overflow-hidden">
                          <img src={image} alt={`리뷰 이미지 ${index + 1}`} className="w-full h-full object-cover" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <img src={image} alt={`리뷰 이미지 ${index + 1}`} className="w-full h-auto" />
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              )}

              {/* 도움됨 버튼 */}
              <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-purple-600 transition">
                <ThumbsUp className="w-4 h-4" />
                <span>도움돼요 ({review.helpful})</span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

**작업 시간**: 8-10시간

---

### 9.2 우선순위 중간 (Important)

#### 4. 바로 구매 기능
- 장바구니 없이 즉시 주문서 작성
- **작업 시간**: 4-6시간

#### 5. 소셜 공유 기능
- KakaoTalk, Facebook, Twitter 공유
- **작업 시간**: 3-4시간

#### 6. Lazy Loading 구현
- 이미지 lazy load
- 탭 컨텐츠 lazy load
- **작업 시간**: 2-3시간

---

### 9.3 우선순위 낮음 (Nice to Have)

#### 7. Q&A 시스템
- 상품 문의 게시판
- **작업 시간**: 6-8시간

#### 8. 위시리스트 고도화
- 위시리스트 페이지
- 재입고 알림
- **작업 시간**: 4-6시간

#### 9. 딥 링킹
- URL 상태 반영
- 공유 시 탭 위치 유지
- **작업 시간**: 2-3시간

---

## 10. 구현 우선순위

### Phase 1: 핵심 UX 개선 (2-3주)
1. **이미지 갤러리 고도화** (4-6시간)
   - 썸네일 네비게이션
   - Lightbox/Zoom
   - 키보드 네비게이션

2. **고급 옵션 시스템** (6-8시간)
   - 드롭다운 옵션
   - 가격 계산
   - 재고 연동

3. **포토 리뷰 시스템** (8-10시간)
   - 별점 분포
   - 포토 갤러리
   - 도움됨 버튼

**총 작업 시간**: 18-24시간

---

### Phase 2: 구매 플로우 개선 (1-2주)
4. **바로 구매 기능** (4-6시간)
5. **소셜 공유** (3-4시간)
6. **Lazy Loading** (2-3시간)

**총 작업 시간**: 9-13시간

---

### Phase 3: 추가 기능 (2-3주)
7. **Q&A 시스템** (6-8시간)
8. **위시리스트** (4-6시간)
9. **딥 링킹** (2-3시간)

**총 작업 시간**: 12-17시간

---

### 전체 예상 작업 시간

| Phase | 작업 시간 | 일정 (주 40시간 기준) |
|-------|-----------|---------------------|
| Phase 1 | 18-24시간 | 3-4일 |
| Phase 2 | 9-13시간 | 2일 |
| Phase 3 | 12-17시간 | 2-3일 |
| **합계** | **39-54시간** | **7-9일** |

**버퍼 포함 (30%)**: 51-70시간 (약 2주)

---

## 📌 핵심 인사이트

### awesomeplan의 장점
1. ✅ **체계적인 옵션 시스템**: JSON 기반 가격 계산
2. ✅ **Lazy Loading**: 성능 최적화
3. ✅ **해시 기반 탭**: 딥 링킹 지원
4. ✅ **포토 리뷰**: 구매 전환율 향상

### Travleap의 장점
1. ✅ **현대적 기술 스택**: React + TypeScript
2. ✅ **컴포넌트 재사용성**: Radix UI
3. ✅ **타입 안전성**: 유지보수 용이
4. ✅ **접근성**: ARIA 속성

### 권장사항 요약
1. **이미지 갤러리**: 썸네일 + Lightbox 필수
2. **옵션 시스템**: JSON 기반 가격 계산 도입
3. **리뷰 시스템**: 포토 리뷰 + 별점 분포 추가
4. **성능 최적화**: Lazy Loading 구현

---

**작성자**: Claude
**작성 일시**: 2025-11-06
**분석 시간**: 30분
**페이지**: awesomeplan.co.kr 제품 상세 페이지

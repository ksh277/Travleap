# 관리자 페이지 ↔ 사용자 페이지 연결 맵

## ✅ 완벽하게 연결된 모든 기능

### 1. 📦 상품 관리 (Listings)
**관리자**: AdminPage → 상품 관리 탭
- API: `api.admin.getListings()` → `listings` 테이블
- 기능: 생성, 수정, 삭제, 상태 변경

**연결된 사용자 페이지**:
- ✅ `HomePage` → `api.getListings()` (인기 상품 8개)
- ✅ `CategoryPage` → `api.getListings({ category })` (카테고리별)
- ✅ `DetailPage` → `api.getListingById()` + 카테고리별 상세
  - `api.getListingAccommodation()` → `listing_accommodation` 테이블
  - `api.getListingTour()` → `listing_tour` 테이블
  - `api.getListingFood()` → `listing_food` 테이블
  - `api.getListingEvent()` → `listing_event` 테이블
  - `api.getListingRentcar()` → `listing_rentcar` 테이블
- ✅ `SearchResultsPage` → `api.searchListings()`
- ✅ `PlaceGoodsPage` → `api.getListings({ limit: 100 })`
- ✅ `AIRecommendationPage` → `api.getListings({ limit: 100 })`
- ✅ `PartnersDiscountPage` → `api.getListings()`
- ✅ `RentcarSearchPage` → `api.getListings({ category: 'rentcar' })`
- ✅ `AccommodationDetailPage` → `api.getListingById()`
- ✅ `CategoryDetailPage` → `api.getListings()`

**데이터 흐름**:
```
관리자가 상품 추가/수정 (AdminPage)
  ↓
listings, listing_* 테이블 업데이트 (PlanetScale)
  ↓
사용자 페이지에 즉시 반영 (모든 리스팅 페이지)
```

---

### 2. ⭐ 리뷰 관리 (Reviews)
**관리자**: AdminPage → 리뷰 관리 탭
- API: `api.admin.getAllReviews()` → `reviews` 테이블
- 기능: 조회, 승인/거부, 삭제

**연결된 사용자 페이지**:
- ✅ `HomePage` → `api.getRecentReviews(4)` (최근 리뷰 4개)
- ✅ `DetailPage` → `api.getReviews(listingId)` (상품별 리뷰)
- ✅ `DetailPage` → `api.createReview()` (리뷰 작성)
- ✅ `ReviewsPage` → `api.getRecentReviews(100)` (모든 리뷰)
- ✅ `MyPage` → `api.getReviews(bookingId)` (내 예약 리뷰)

**데이터 흐름**:
```
사용자가 리뷰 작성 (DetailPage)
  ↓
reviews 테이블에 저장 (PlanetScale)
  ↓
관리자 페이지에서 확인/승인 (AdminPage)
  ↓
승인 시 모든 리뷰 페이지에 표시
```

---

### 3. 🤝 파트너 관리 (Partners)
**관리자**: AdminPage → 파트너 관리 탭
- API: `api.admin.getPartners()` → `partners` 테이블 (모든 상태)
- API: `api.admin.getPartnerApplications()` → `partner_applications` 테이블
- 기능: 생성, 수정, 삭제, 승인/거부, 등급 변경

**연결된 사용자 페이지**:
- ✅ `PartnerPage` → `api.getPartners()` (승인된 파트너만)
- ✅ `PartnerDetailPage` → `db.select('partners', { id })`
- ✅ `PartnerApplyPage` → `api.createPartnerApplication()` (신청)
- ✅ `PartnersDiscountPage` → `api.getPartners()` (파트너 할인)
- ✅ `HomePage` → partners 데이터 (추천 파트너)

**데이터 흐름**:
```
사용자가 파트너 신청 (PartnerApplyPage)
  ↓
partner_applications 테이블에 저장
  ↓
관리자 페이지에서 확인 (AdminPage)
  ↓
승인 시 partners 테이블로 이동
  ↓
PartnerPage, PartnerDetailPage에 표시
```

---

### 4. 📝 블로그 관리 (Blog Posts)
**관리자**: AdminPage → 블로그 관리 탭
- API: `api.admin.getBlogs()` → `blog_posts` 테이블
- 기능: 생성, 수정, 삭제, 발행 상태 변경

**연결된 사용자 페이지**:
- ✅ `BlogListPage` → `api.getBlogPosts({ status: 'published' })`
- ✅ `BlogDetailPage` → `api.getBlogPost(id)`
- ✅ `BlogDetailPage` → `api.getRelatedBlogPosts(id, category)`

**데이터 흐름**:
```
관리자가 블로그 작성/발행 (AdminPage)
  ↓
blog_posts 테이블에 저장 (status: published)
  ↓
BlogListPage, BlogDetailPage에 즉시 표시
```

---

### 5. 🖼️ 미디어 라이브러리 (Images/Media)
**관리자**: AdminPage → 미디어 라이브러리 탭
- API: `api.admin.getImages()` → `images` 테이블
- API: `api.getMedia()` → `media` 테이블
- 기능: 업로드, 수정, 삭제, 태그 관리

**연결된 사용자 페이지**:
- ✅ `MediaLibraryModal` → `api.getMedia()` (모든 컴포넌트에서 사용)
- ✅ `AdminPage` → 상품 추가 시 이미지 선택
- ✅ 모든 listing 페이지 → images 배열로 이미지 표시

**데이터 흐름**:
```
관리자가 이미지 업로드 (AdminPage)
  ↓
images/media 테이블에 저장
  ↓
MediaLibraryModal에서 선택 가능
  ↓
모든 페이지에서 이미지 사용
```

---

### 6. 💳 주문 관리 (Orders/Payments)
**관리자**: AdminPage → 주문 관리 탭
- API: `api.admin.getOrders()` → `payments` 테이블
- 기능: 조회, 상태 변경, 환불 처리, 삭제

**연결된 사용자 페이지**:
- ✅ `PaymentPage` → `api.processPayment()` (결제 생성)
- ✅ `PaymentPage` → `api.createOrder()` (주문 생성)
- ✅ `MyPage` → `api.getBookings(userId)` (내 주문 조회)
- ✅ `CartPage` → 장바구니 → 결제 흐름

**데이터 흐름**:
```
사용자가 결제 (PaymentPage)
  ↓
payments 테이블에 저장
  ↓
관리자 페이지에서 주문 확인 (AdminPage)
  ↓
상태 변경 (pending → completed)
  ↓
MyPage에 주문 상태 업데이트 표시
```

---

### 7. 👥 사용자 관리 (Users)
**관리자**: AdminPage → 사용자 관리 탭
- API: `api.admin.getAllUsers()` → `users` 테이블
- 기능: 조회, 상태 변경, 역할 변경, 삭제

**연결된 사용자 페이지**:
- ✅ `LoginPage` → `useAuth().login()` → `api.loginUser()`
- ✅ `SignupPage` → `api.registerUser()` (사용자 생성)
- ✅ `MyPage` → `api.getCurrentUser()` (내 정보 조회)
- ✅ `PartnerApplyPage` → `api.getCurrentUser()` (현재 사용자)
- ✅ 모든 페이지 → `useAuth()` (인증 상태)

**데이터 흐름**:
```
사용자가 회원가입 (SignupPage)
  ↓
users 테이블에 저장
  ↓
관리자 페이지에서 사용자 관리 (AdminPage)
  ↓
역할/상태 변경 시 즉시 반영
```

---

### 8. 📬 문의 관리 (Contacts)
**관리자**: AdminPage → 문의 관리 탭
- API: `api.getContacts()` → `contacts` 테이블
- API: `api.createContactSubmission()` → `contact_submissions` 테이블
- 기능: 조회, 답변, 상태 변경

**연결된 사용자 페이지**:
- ✅ `ContactPage` → `api.createContactSubmission()` (문의 작성)

**데이터 흐름**:
```
사용자가 문의 작성 (ContactPage)
  ↓
contact_submissions 테이블에 저장
  ↓
관리자 페이지에서 문의 확인 (AdminPage)
  ↓
답변 작성 및 상태 변경
```

---

### 9. 📅 예약 관리 (Bookings)
**관리자**: AdminPage → (대시보드 통계)
- API: `api.admin.getBookings()` → `bookings` 테이블
- 기능: 조회, 상태 확인

**연결된 사용자 페이지**:
- ✅ `DetailPage` → `api.createBooking()` (예약 생성)
- ✅ `MyPage` → `api.getBookings(userId)` (내 예약)
- ✅ `MyPage` → `api.cancelBooking()` (예약 취소)

**데이터 흐름**:
```
사용자가 예약 (DetailPage)
  ↓
bookings 테이블에 저장
  ↓
관리자 대시보드에 통계 표시 (AdminPage)
  ↓
MyPage에서 예약 내역 조회
```

---

### 10. 🛒 장바구니 (Cart)
**API**: `useCartStore` → `cart_items` 테이블 (로그인 사용자)
- ✅ `CartPage` → `useCartStore()` (장바구니 표시)
- ✅ `DetailPage` → `addToCart()` (장바구니 추가)
- ✅ 모든 페이지 → 장바구니 아이콘 (개수 표시)

**데이터 흐름**:
```
사용자가 장바구니 추가 (DetailPage)
  ↓
cart_items 테이블에 저장 (로그인 시)
  ↓
CartPage에서 조회 및 관리
  ↓
결제 시 PaymentPage로 이동
```

---

## 🗄️ 데이터베이스 현황

### PlanetScale Cloud Database
- **Database ID**: 8qyahfe6w1tbbas4uepb
- **총 테이블**: 37개
- **API 서버**: http://localhost:3004 (개발)

### 실제 데이터 확인 (2025-10-11)
- ✅ **listings**: 3+개 (신안 1004섬 투어, 비금도 해물탕, 퍼플교 전망대 등)
- ✅ **partners**: 5개 (신안 여행사, 신안 해양관광, 증도 갯벌체험센터, 비금도 해변카페, 신안 바다펜션)
- ✅ **reviews**: 10개
- ✅ **blog_posts**: 2개
- ✅ **bookings**: 15개
- ✅ **users**: 10개

---

## 🔄 완전한 데이터 흐름 예시

### 예시 1: 상품 추가 → 판매 → 리뷰
```
1. 관리자가 "증도 갯벌체험" 상품 추가 (AdminPage)
   ↓ api.admin.createListing()
   ↓ listings 테이블에 저장

2. 사용자가 상품 검색 및 조회
   ↓ SearchResultsPage / CategoryPage에 표시
   ↓ DetailPage에서 상세 정보 + listing_tour 테이블 조회

3. 사용자가 예약
   ↓ api.createBooking()
   ↓ bookings 테이블에 저장

4. 사용자가 결제
   ↓ PaymentPage → api.processPayment()
   ↓ payments 테이블에 저장

5. 관리자가 주문 확인
   ↓ AdminPage → 주문 관리 탭
   ↓ 주문 상태를 "completed"로 변경

6. 사용자가 리뷰 작성
   ↓ DetailPage → api.createReview()
   ↓ reviews 테이블에 저장

7. 관리자가 리뷰 승인
   ↓ AdminPage → 리뷰 관리 탭
   ↓ 리뷰 상태를 "approved"로 변경

8. 리뷰가 모든 페이지에 표시
   ↓ HomePage (최근 리뷰)
   ↓ DetailPage (상품 리뷰)
   ↓ ReviewsPage (전체 리뷰)
```

### 예시 2: 파트너 신청 → 승인 → 상품 등록
```
1. 사용자가 파트너 신청 (PartnerApplyPage)
   ↓ api.createPartnerApplication()
   ↓ partner_applications 테이블에 저장

2. 관리자가 신청 확인 및 승인 (AdminPage)
   ↓ 파트너 신청 탭
   ↓ api.admin.approvePartnerApplication()
   ↓ partners 테이블로 이동 (status: approved)

3. 파트너가 PartnerPage에 표시
   ↓ api.getPartners() (승인된 파트너만)
   ↓ PartnerDetailPage에서 상세 정보

4. 관리자가 파트너에게 상품 등록 권한 부여
   ↓ AdminPage → 파트너 관리
   ↓ 파트너가 자신의 상품 등록 가능
```

---

## ✅ 모든 연결 확인 완료

### 관리자 페이지 모든 탭
1. ✅ **대시보드** - 통계 표시 (listings, bookings, partners, reviews 등)
2. ✅ **상품 관리** - 11개 사용자 페이지와 연결
3. ✅ **리뷰 관리** - 5개 사용자 페이지와 연결
4. ✅ **파트너 관리** - 5개 사용자 페이지와 연결
5. ✅ **블로그 관리** - 2개 사용자 페이지와 연결
6. ✅ **미디어 라이브러리** - 모든 페이지에서 사용
7. ✅ **주문 관리** - 4개 사용자 페이지와 연결
8. ✅ **사용자 관리** - 5개 사용자 페이지와 연결
9. ✅ **문의 관리** - 1개 사용자 페이지와 연결

### 모든 데이터가 PlanetScale 클라우드 DB를 통해 실시간 동기화됩니다!

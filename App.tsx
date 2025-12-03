import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { CategoryPage } from './components/CategoryPage';
import { CategoryDetailPage } from './components/CategoryDetailPage';
import { DetailPage } from './components/DetailPage';
import { PartnerPage } from './components/PartnerPage';
import { PartnerApplyPage } from './components/PartnerApplyPage';
import { SearchResultsPage } from './components/SearchResultsPage';
import { ContactPage } from './components/ContactPage';
import { AboutPage } from './components/AboutPage';
import { ShinanPage } from './components/ShinanPage';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { CartPage } from './components/CartPage';
import { AdminPage } from './components/AdminPage';
import { MyPage } from './components/MyPage';
import { ReviewsPage } from './components/ReviewsPage';
import { PaymentPage } from './components/PaymentPage';
import { CommunityBlogPage as OldCommunityBlogPage } from './components/CommunityBlogPage';
import BlogListPage from './components/BlogListPage';
import BlogDetailPage from './components/BlogDetailPage';
import CommunityBlogDetailPage from './components/CommunityBlogDetailPage';
import CommunityBlogWritePage from './components/CommunityBlogWritePage';
import { RewardsPage as OldRewardsPage } from './components/RewardsPage';
import { WorkWithUsPage } from './components/WorkWithUsPage';

// New redesigned pages
import { CommunityBlogPage } from './components/pages/CommunityBlogPage';
import { RewardsPage } from './components/pages/RewardsPage';
import { CareersPage } from './components/pages/CareersPage';
import { PlaceGoodsPage } from './components/PlaceGoodsPage';
import { PartnersDiscountPage } from './components/PartnersDiscountPage';
import { PartnerDetailPage } from './components/PartnerDetailPage';
import { AIRecommendationPage } from './components/AIRecommendationPage';
import { AICoursePage } from './components/AICoursePage';
import { MyCoursesPage } from './components/MyCoursesPage';
import { LegalPage } from './components/pages/LegalPage';
import { TermsPage } from './components/pages/TermsPage';
import { PrivacyPage } from './components/pages/PrivacyPage';
import { MarketingPage } from './components/pages/MarketingPage';
import { RefundPolicyPage } from './components/pages/RefundPolicyPage';
import { AffiliatePage } from './components/AffiliatePage';
import { QRGeneratorPage } from './components/pages/QRGeneratorPage';
import { RentcarSearchPage } from './components/RentcarSearchPage';
import { AccommodationDetailPage } from './components/AccommodationDetailPage';
import { HotelDetailPage } from './components/pages/HotelDetailPage';
import { RestaurantDetailPage } from './components/pages/RestaurantDetailPage';
import { AttractionDetailPage } from './components/pages/AttractionDetailPage';
import { ExperienceDetailPage } from './components/pages/ExperienceDetailPage';
import { EventDetailPage } from './components/pages/EventDetailPage';
import { RentcarVendorDetailPage } from './components/pages/RentcarVendorDetailPage';
import { RentcarVehicleDetailPage } from './components/pages/RentcarVehicleDetailPage';
import { VendorRegistrationPage } from './components/VendorRegistrationPage';
import VendorDashboardPageEnhanced from './components/VendorDashboardPageEnhanced';
import { PartnerDashboardPageEnhanced } from './components/PartnerDashboardPageEnhanced';
import PopupVendorDashboard from './components/PopupVendorDashboard';
import { ExperienceVendorDashboard } from './components/ExperienceVendorDashboard';
import { FoodVendorDashboard } from './components/FoodVendorDashboard';
import { AttractionsVendorDashboard } from './components/AttractionsVendorDashboard';
import { EventsVendorDashboard } from './components/EventsVendorDashboard';
import { TourVendorDashboard } from './components/TourVendorDashboard';
import { AdminRentcarPage } from './components/AdminRentcarPage';
import PaymentSuccessPage from './components/PaymentSuccessPage';
import PaymentFailPage from './components/PaymentFailPage';
import PaymentSuccessPage2 from './components/PaymentSuccessPage2';
import PaymentFailPage2 from './components/PaymentFailPage2';
import MonitoringDashboard from './components/MonitoringDashboard';
import VendorPricingSettings from './components/VendorPricingSettings';
import VendorLodgingDashboard from './components/VendorLodgingDashboard';
import VendorPMSSettings from './components/VendorPMSSettings';
import LockTestPage from './components/LockTestPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CouponTestPage } from './components/CouponTestPage';
import { PartnerCouponDashboard } from './components/PartnerCouponDashboard';
import { CouponUsePage } from './components/CouponUsePage';
import { CouponClaimPage } from './components/CouponClaimPage';
import { MyCouponsPage } from './components/MyCouponsPage';
import { CouponQRPage } from './components/CouponQRPage';
import { ReviewModal } from './components/ReviewModal';
import CouponBookPage from './components/CouponBookPage';

import { Toaster } from './components/ui/sonner';
import { useAuth } from './hooks/useAuth';
import { useCartStore } from './hooks/useCartStore';
import { HelmetProvider } from 'react-helmet-async';
import { Analytics } from '@vercel/analytics/react';

// 스크롤 위치 리셋 컴포넌트
function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return null;
}

// 쿠폰 짧은 URL 리다이렉트 (/c/:code → /coupon/claim?code=:code)
function CouponClaimRedirect() {
  const { code } = useParams();
  return <Navigate to={`/coupon/claim?code=${code}`} replace />;
}

function AppContent() {
  const navigate = useNavigate();
  const { isLoggedIn, isAdmin, isMDAdmin, user, login, logout, sessionRestored } = useAuth();
  const { cartItems } = useCartStore();

  // REMOVED: Hardcoded admin credentials (security risk)
  // To create an admin account, use: tsx scripts/create-admin.ts

  // Google Maps API 키는 getGoogleMapsApiKey() 함수에서 직접 import.meta.env로 읽음
  // 서버 호출 불필요 (iframe 방식 사용)

  // 세션 복원 중일 때 로딩 화면 표시
  if (!sessionRestored) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">세션 복원 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ScrollToTop />
      <Header
        cartItemCount={cartItems.length}
        selectedLanguage="ko"
        selectedCurrency="KRW"
      />

      <Routes>
          {/* 홈페이지 */}
          <Route path="/" element={<HomePage />} />

          {/* 카테고리 페이지 (렌트카 포함) */}
          <Route path="/category/:category" element={<CategoryPage />} />

          {/* 카테고리별 상세 페이지 */}
          <Route path="/categories/:categorySlug" element={<CategoryDetailPage />} />

          {/* 숙박 상세 페이지 (호텔별 객실 목록) */}
          <Route path="/accommodation/:partnerId" element={<HotelDetailPage />} />

          {/* 식당 상세 페이지 */}
          <Route path="/restaurant/:id" element={<RestaurantDetailPage />} />

          {/* 관광지 상세 페이지 */}
          <Route path="/attraction/:id" element={<AttractionDetailPage />} />

          {/* 체험 상세 페이지 */}
          <Route path="/experience/:id" element={<ExperienceDetailPage />} />

          {/* 이벤트 상세 페이지 */}
          <Route path="/event/:id" element={<EventDetailPage />} />

          {/* 렌트카 업체 상세 페이지 (업체별 차량 목록) */}
          <Route path="/rentcar/:vendorId" element={<RentcarVendorDetailPage />} />

          {/* 렌트카 차량 상세 페이지 */}
          <Route path="/rentcar/vehicle/:vehicleId" element={<RentcarVehicleDetailPage />} />

          {/* 일반 상세페이지 */}
          <Route path="/detail/:id" element={<DetailPage />} />

          {/* 검색 결과 */}
          <Route path="/search" element={<SearchResultsPage />} />

          {/* 파트너 관련 */}
          <Route path="/partner" element={<PartnerPage />} />
          <Route path="/partners" element={<PartnersDiscountPage />} />
          <Route path="/partners/:id" element={<PartnerDetailPage />} />
          <Route path="/franchise" element={<PartnerPage />} />
          <Route path="/partner-apply" element={<PartnerApplyPage />} />

          {/* 인증 관련 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* 렌트카 업체 등록 */}
          <Route path="/vendor/register" element={<VendorRegistrationPage />} />

          {/* 렌트카 업체 대시보드 (강화 버전) */}
          <Route path="/vendor/dashboard" element={
            isLoggedIn && user?.role === 'vendor' ? (
              <ErrorBoundary>
                <VendorDashboardPageEnhanced />
              </ErrorBoundary>
            ) : (
              <Navigate to="/login" replace />
            )
          } />

          {/* 팝업 벤더 대시보드 */}
          <Route path="/vendor/popup" element={
            isLoggedIn && user?.role === 'vendor' ? (
              <ErrorBoundary>
                <PopupVendorDashboard />
              </ErrorBoundary>
            ) : (
              <Navigate to="/login" replace />
            )
          } />

          {/* 체험 벤더 대시보드 */}
          <Route path="/vendor/experience" element={
            isLoggedIn && user?.role === 'vendor' ? (
              <ErrorBoundary>
                <ExperienceVendorDashboard />
              </ErrorBoundary>
            ) : (
              <Navigate to="/login" replace />
            )
          } />

          {/* 음식점 벤더 대시보드 */}
          <Route path="/vendor/food" element={
            isLoggedIn && user?.role === 'vendor' ? (
              <ErrorBoundary>
                <FoodVendorDashboard />
              </ErrorBoundary>
            ) : (
              <Navigate to="/login" replace />
            )
          } />

          {/* 관광지 벤더 대시보드 */}
          <Route path="/vendor/attractions" element={
            isLoggedIn && user?.role === 'vendor' ? (
              <ErrorBoundary>
                <AttractionsVendorDashboard />
              </ErrorBoundary>
            ) : (
              <Navigate to="/login" replace />
            )
          } />

          {/* 행사 벤더 대시보드 */}
          <Route path="/vendor/events" element={
            isLoggedIn && user?.role === 'vendor' ? (
              <ErrorBoundary>
                <EventsVendorDashboard />
              </ErrorBoundary>
            ) : (
              <Navigate to="/login" replace />
            )
          } />

          {/* 투어 벤더 대시보드 */}
          <Route path="/vendor/tour" element={
            isLoggedIn && user?.role === 'vendor' ? (
              <ErrorBoundary>
                <TourVendorDashboard />
              </ErrorBoundary>
            ) : (
              <Navigate to="/login" replace />
            )
          } />

          {/* 숙박 파트너 대시보드 */}
          <Route path="/partner/dashboard" element={
            isLoggedIn && user?.role === 'partner' ? (
              <ErrorBoundary>
                <PartnerDashboardPageEnhanced />
              </ErrorBoundary>
            ) : (
              <Navigate to="/login" replace />
            )
          } />

          {/* 렌트카 업체 요금/보험/옵션 설정 */}
          <Route path="/vendor/pricing" element={
            isLoggedIn && user?.role === 'vendor' ? (
              <ErrorBoundary>
                <VendorPricingSettings />
              </ErrorBoundary>
            ) : (
              <Navigate to="/login" replace />
            )
          } />

          {/* 렌트카 업체 PMS 연동 설정 */}
          <Route path="/vendor/pms" element={
            isLoggedIn && user?.role === 'vendor' ? (
              <ErrorBoundary>
                <VendorPMSSettings />
              </ErrorBoundary>
            ) : (
              <Navigate to="/login" replace />
            )
          } />

          {/* 숙박 업체 대시보드 */}
          <Route path="/vendor/lodging" element={
            isLoggedIn && user?.role === 'vendor' ? (
              <ErrorBoundary>
                <VendorLodgingDashboard />
              </ErrorBoundary>
            ) : (
              <Navigate to="/login" replace />
            )
          } />

          {/* 장바구니 */}
          <Route path="/cart" element={<CartPage />} />

          {/* 결제 페이지 */}
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/payment/fail" element={<PaymentFailPage />} />

          {/* Toss Payments 전용 결제 페이지 (신규) */}
          <Route path="/payment/success2" element={<PaymentSuccessPage2 />} />
          <Route path="/payment/fail2" element={<PaymentFailPage2 />} />

          {/* 보호된 라우트 - 로그인 필요 */}
          <Route path="/mypage" element={
            isLoggedIn && !isMDAdmin ? (
              <MyPage />
            ) : (
              <Navigate to="/login" replace />
            )
          } />

          {/* 관리자 전용 라우트 (MD 이상) */}
          <Route path="/admin" element={
            !sessionRestored ? (
              <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">세션을 확인하는 중...</p>
                </div>
              </div>
            ) : isLoggedIn && isMDAdmin ? (
              <AdminPage />
            ) : (
              <Navigate to="/login" replace />
            )
          } />

          {/* 관리자 렌트카 관리 (MD 이상) */}
          <Route path="/admin/rentcar" element={
            isLoggedIn && isMDAdmin ? (
              <AdminRentcarPage />
            ) : (
              <Navigate to="/login" replace />
            )
          } />

          {/* 관리자 모니터링 대시보드 (MD 이상) */}
          <Route path="/admin/monitoring" element={
            isLoggedIn && isMDAdmin ? (
              <MonitoringDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          } />

          {/* 정보 페이지들 */}
          <Route path="/company" element={<AboutPage />} />
          <Route path="/about" element={<ShinanPage />} />
          <Route path="/contact" element={<ContactPage onBack={() => navigate(-1)} />} />
          <Route path="/reviews" element={<ReviewsPage />} />

          {/* 블로그 - 새 디자인 */}
          <Route path="/blog" element={<CommunityBlogPage />} />
          <Route path="/blog/:slug" element={<BlogDetailPage />} />

          {/* 커뮤니티 블로그 (기존) */}
          <Route path="/community-blog" element={<OldCommunityBlogPage />} />
          <Route path="/community-blog/write" element={<CommunityBlogWritePage />} />
          <Route path="/community-blog/:id" element={<CommunityBlogDetailPage />} />

          {/* 포인트 제도 - 새 디자인 */}
          <Route path="/rewards" element={<RewardsPage />} />

          {/* 채용 페이지 - 새 디자인 */}
          <Route path="/careers" element={<CareersPage />} />
          <Route path="/work-with-us" element={<CareersPage />} />

          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/marketing" element={<MarketingPage />} />
          <Route path="/refund-policy" element={<RefundPolicyPage />} />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/affiliate" element={<AffiliatePage onBack={() => navigate(-1)} />} />
          <Route path="/qr-generator" element={<QRGeneratorPage />} />

          {/* 새로운 특별 페이지들 */}
          <Route path="/shop" element={<PlaceGoodsPage />} />
          <Route path="/place-goods" element={<PlaceGoodsPage />} />
          <Route path="/place-goods/:goodsId" element={<DetailPage />} />
          <Route path="/partners-discount" element={<PartnersDiscountPage />} />
          <Route path="/ai-recommendations" element={<AIRecommendationPage />} />
          <Route path="/ai-recommendation" element={<AIRecommendationPage />} />
          <Route path="/ai-course" element={<AICoursePage />} />
          <Route path="/my/courses" element={<MyCoursesPage />} />

          {/* Lock 시스템 테스트 페이지 (개발용) */}
          <Route path="/lock-test" element={<LockTestPage />} />

          {/* 쿠폰 시스템 */}
          <Route path="/coupon-test" element={<CouponTestPage />} />
          <Route path="/coupon/use" element={<CouponUsePage />} />
          <Route path="/coupon/claim" element={<CouponClaimPage />} />
          <Route path="/coupon/qr/:code" element={<CouponQRPage />} />
          <Route path="/my/coupons" element={<MyCouponsPage />} />
          <Route path="/couponbook" element={<CouponBookPage />} />

          {/* 쿠폰 발급 짧은 URL - /c/:code → /coupon/claim?code=:code 로 리다이렉트 */}
          <Route path="/c/:code" element={<CouponClaimRedirect />} />

          {/* 파트너 쿠폰 대시보드 (가맹점용) - 컴포넌트 내부에서 인증/권한 체크 */}
          <Route path="/partner/coupon" element={
            <ErrorBoundary>
              <PartnerCouponDashboard />
            </ErrorBoundary>
          } />

          {/* 404 페이지 - 모든 정의되지 않은 경로 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

      <Footer
        selectedLanguage="ko"
        selectedCurrency="KRW"
        onCategorySelect={(category) => navigate(`/${category}`)}
      />
      <Toaster />
      <ReviewModal />
    </div>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <Router>
        <AppContent />
        <Analytics />
      </Router>
    </HelmetProvider>
  );
}

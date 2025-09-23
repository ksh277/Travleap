import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { CategoryPage } from './components/CategoryPage';
import { DetailPage } from './components/DetailPage';
import { PartnerPage } from './components/PartnerPage';
import { PartnerApplyPage } from './components/PartnerApplyPage';
import { SearchResultsPage } from './components/SearchResultsPage';
import { ContactPage } from './components/ContactPage';
import { AboutPage } from './components/AboutPage';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { CartPage } from './components/CartPage';
import { AdminPage } from './components/AdminPage';
import { MyPage } from './components/MyPage';
import { ReviewsPage } from './components/ReviewsPage';
import { PaymentPage } from './components/PaymentPage';
import { CommunityBlogPage } from './components/CommunityBlogPage';
import { RewardsPage } from './components/RewardsPage';
import { WorkWithUsPage } from './components/WorkWithUsPage';
import { LegalPage } from './components/LegalPage';
import { AffiliatePage } from './components/AffiliatePage';

import { Toaster } from './components/ui/sonner';
import type { CartItem } from './types/database';
import { useAuthStore } from './hooks/useAuthStore';
import { useCartStore } from './hooks/useCartStore';

function AppContent() {
  const navigate = useNavigate();
  const { isLoggedIn, isAdmin, user, login, logout } = useAuthStore();
  const { cartItems, addToCart, updateCart, checkout } = useCartStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        cartItemCount={cartItems.length}
        isAdmin={isAdmin}
        isLoggedIn={isLoggedIn}
        onLogout={logout}
        selectedLanguage="ko"
        selectedCurrency="KRW"
      />

      <Routes>
          {/* 홈페이지 */}
          <Route path="/" element={<HomePage />} />

          {/* 카테고리 페이지 */}
          <Route path="/category/:category" element={<CategoryPage />} />

          {/* 상세페이지 */}
          <Route path="/detail/:id" element={<DetailPage />} />

          {/* 검색 결과 */}
          <Route path="/search" element={<SearchResultsPage />} />

          {/* 파트너 관련 */}
          <Route path="/partner" element={<PartnerPage />} />
          <Route path="/franchise" element={<PartnerPage />} />
          <Route path="/partner-apply" element={<PartnerApplyPage />} />

          {/* 인증 관련 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* 장바구니 */}
          <Route path="/cart" element={<CartPage />} />

          {/* 결제 페이지 */}
          <Route path="/payment" element={<PaymentPage />} />

          {/* 보호된 라우트 - 로그인 필요 */}
          <Route path="/mypage" element={
            isLoggedIn && !isAdmin ? (
              <MyPage />
            ) : (
              <Navigate to="/login" replace />
            )
          } />

          {/* 관리자 전용 라우트 */}
          <Route path="/admin" element={
            isAdmin ? <AdminPage /> : <Navigate to="/login" replace />
          } />

          {/* 정보 페이지들 */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage onBack={() => navigate(-1)} />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/community-blog" element={<CommunityBlogPage />} />
          <Route path="/rewards" element={<RewardsPage />} />
          <Route path="/work-with-us" element={<WorkWithUsPage />} />
          <Route path="/legal" element={<LegalPage onBack={() => navigate(-1)} />} />
          <Route path="/affiliate" element={<AffiliatePage onBack={() => navigate(-1)} />} />

          {/* 404 페이지 - 모든 정의되지 않은 경로 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

      <Footer
        selectedLanguage="ko"
        selectedCurrency="KRW"
      />
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
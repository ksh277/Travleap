import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  ShoppingBasket,
  Menu,
  User,
  Heart,
  Clock,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { t } from '../utils/translations';

interface HeaderProps {
  cartItemCount?: number;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
  logout?: () => void;
  selectedLanguage?: string;
  selectedCurrency?: string;
}

// 왼쪽 메인 메뉴
const leftNavItems = [
  { name: '여행PKG', path: '/category/tour', badge: 'HOT', badgeColor: 'bg-red-500' },
  { name: '렌트카', path: '/category/rentcar' },
  { name: '숙박', path: '/category/stay' },
  { name: '티켓', path: '/category/ticket' },
  { name: '행사/체험', path: '/category/event', badge: 'SEASON', badgeColor: 'bg-green-500' },
  { name: '가맹점', path: '/partner' },
];

// 오른쪽 서브 메뉴
const rightNavItems = [
  { name: '나만의 뷰맛집', path: '#' },
  { name: '내주위 톡톡', path: '/partner' },
  { name: 'EVENT', path: '/category/event' },
  { name: '공지사항', path: '#' },
  { name: '파트너 입점.문의', path: '/partner-apply' },
];

export function Header({
  cartItemCount = 0,
  selectedLanguage = 'ko',
  selectedCurrency = 'KRW',
}: Omit<HeaderProps, 'isAdmin' | 'isLoggedIn' | 'logout'>) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentView = location.pathname;

  // 인증 시스템
  const { isLoggedIn, isAdmin, logout, user } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);

  // 상태 로그
  useEffect(() => {
    console.log('🎯 Auth 상태:', { isLoggedIn, isAdmin, user: user?.email || 'none' });
  }, [isLoggedIn, isAdmin, user]);

  // 벤더 타입에 따른 대시보드 경로 반환
  const getVendorDashboardPath = () => {
    if (!user?.vendorType) return '/vendor/popup';
    if (user.vendorType === 'stay') return '/vendor/lodging';
    if (user.vendorType === 'rental') return '/vendor/dashboard';
    return '/vendor/popup';
  };

  // PINTO 쇼핑몰로 이동 (SSO)
  const handleGoToPinto = async () => {
    const pintoUrl = 'https://makepinto.com';

    if (!isLoggedIn) {
      window.open(pintoUrl, '_blank');
      return;
    }

    setSsoLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/sso/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          target: 'pinto',
          redirect_path: '/'
        })
      });

      const data = await response.json();
      if (data.success && data.data?.callback_url) {
        window.location.href = data.data.callback_url;
      } else {
        window.open(pintoUrl, '_blank');
      }
    } catch (error) {
      console.error('SSO 요청 오류:', error);
      window.open(pintoUrl, '_blank');
    } finally {
      setSsoLoading(false);
    }
  };

  // 메뉴 클릭 핸들러
  const handleNavClick = (path: string) => {
    if (path === '#') {
      // 버튼만 있는 메뉴 (아직 페이지 없음)
      return;
    }
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-50 w-full font-nanum">
      {/* ========== 1. 상단 바 (70px) ========== */}
      <div className="bg-[#BCD4E4] h-[50px] lg:h-[70px]">
        <div className="max-w-content mx-auto h-full px-4 md:px-10 lg:px-20 flex items-center justify-between">
          {/* 왼쪽: TRAVLEAR | pinto 로고 */}
          <div className="flex items-center gap-3">
            <span
              className="text-gray-700 font-nanum-eb text-base lg:text-lg tracking-wide cursor-pointer"
              onClick={() => navigate('/')}
            >
              TRAVLEAR
            </span>
            <span className="text-gray-400">|</span>
            <span
              className="text-gray-600 font-nanum text-sm lg:text-base cursor-pointer hover:text-gray-800"
              onClick={handleGoToPinto}
            >
              pinto
            </span>
          </div>

          {/* 오른쪽: 로그아웃/마이페이지/1:1문의 */}
          <div className="flex items-center gap-2 lg:gap-4 text-gray-600 text-xs lg:text-sm">
            {isLoggedIn ? (
              <>
                <button
                  className="hover:text-gray-900 transition-colors"
                  onClick={logout}
                >
                  로그아웃
                </button>
                <span className="text-gray-400">|</span>
                <button
                  className="hover:text-gray-900 transition-colors"
                  onClick={() => navigate(
                    isAdmin ? "/admin" :
                    user?.role === 'partner' ? "/partner/dashboard" :
                    user?.role === 'vendor' ? getVendorDashboardPath() :
                    "/mypage"
                  )}
                >
                  마이페이지
                </button>
              </>
            ) : (
              <>
                <button
                  className="hover:text-gray-900 transition-colors"
                  onClick={() => navigate("/login")}
                >
                  로그인
                </button>
                <span className="text-gray-400">|</span>
                <button
                  className="hover:text-gray-900 transition-colors"
                  onClick={() => navigate("/signup")}
                >
                  회원가입
                </button>
              </>
            )}
            <span className="text-gray-400">|</span>
            <button
              className="hover:text-gray-900 transition-colors"
              onClick={() => navigate("/support")}
            >
              1:1문의
            </button>
          </div>
        </div>
      </div>

      {/* ========== 2. 메인 헤더 (160px) ========== */}
      <div className="bg-white h-[80px] lg:h-[160px] border-b border-gray-100">
        <div className="max-w-content mx-auto h-full px-4 md:px-10 lg:px-20 flex items-center justify-between">
          {/* 왼쪽: TRAVLEAR 로고 이미지 */}
          <div
            className="cursor-pointer"
            onClick={() => navigate('/')}
          >
            <img
              src="/images/logo-travlear.png"
              alt="TRAVLEAR"
              className="h-[40px] md:h-[50px] lg:h-[70px] w-auto"
            />
          </div>

          {/* 오른쪽: 아이콘 그룹 (데스크톱) */}
          <div className="hidden lg:flex items-center gap-8">
            {/* 마이 */}
            <button
              className="flex flex-col items-center gap-1 text-gray-600 hover:text-[#5c2d91] transition-colors"
              onClick={() => navigate(isLoggedIn ? '/mypage' : '/login')}
            >
              <User className="w-6 h-6" />
              <span className="text-xs font-nanum">마이</span>
            </button>

            {/* 찜 */}
            <button
              className="flex flex-col items-center gap-1 text-gray-600 hover:text-[#5c2d91] transition-colors"
              onClick={() => navigate(isLoggedIn ? '/wishlist' : '/login')}
            >
              <Heart className="w-6 h-6" />
              <span className="text-xs font-nanum">찜</span>
            </button>

            {/* 장바구니 */}
            <button
              className="flex flex-col items-center gap-1 text-gray-600 hover:text-[#5c2d91] transition-colors relative"
              onClick={() => navigate('/cart')}
            >
              <ShoppingBasket className="w-6 h-6" />
              <span className="text-xs font-nanum">장바구니</span>
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </button>

            {/* 최근 본 상품 */}
            <button
              className="flex flex-col items-center gap-1 text-gray-600 hover:text-[#5c2d91] transition-colors"
              onClick={() => navigate('/recent-products')}
            >
              <Clock className="w-6 h-6" />
              <span className="text-xs font-nanum">최근 본 상품</span>
            </button>
          </div>

          {/* 모바일: 장바구니 + 햄버거 메뉴 */}
          <div className="flex lg:hidden items-center gap-2">
            {/* 장바구니 */}
            <button
              className="relative p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={() => navigate('/cart')}
            >
              <ShoppingBasket className="w-5 h-5 text-gray-600" />
              {cartItemCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </button>

            {/* 햄버거 메뉴 */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="min-w-[44px] min-h-[44px]">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 w-[280px] overflow-y-auto">
                <div className="py-6">
                  {/* 로고 */}
                  <div className="px-6 pb-4 border-b">
                    <img
                      src="/images/logo-travlear.png"
                      alt="TRAVLEAR"
                      className="h-[35px] w-auto"
                    />
                  </div>

                  {/* 메인 메뉴 */}
                  <div className="py-2">
                    <div className="px-6 py-2 text-xs text-gray-400 font-nanum">메인 메뉴</div>
                    {leftNavItems.map((item) => (
                      <button
                        key={item.path + item.name}
                        onClick={() => {
                          handleNavClick(item.path);
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-left px-6 py-3 hover:bg-gray-50 flex items-center justify-between font-nanum"
                      >
                        <span>{item.name}</span>
                        {item.badge && (
                          <span className={`${item.badgeColor} text-white text-xs px-2 py-0.5 rounded`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* 서브 메뉴 */}
                  <div className="py-2 border-t">
                    <div className="px-6 py-2 text-xs text-gray-400 font-nanum">서브 메뉴</div>
                    {rightNavItems.map((item) => (
                      <button
                        key={item.path + item.name}
                        onClick={() => {
                          handleNavClick(item.path);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full text-left px-6 py-3 hover:bg-gray-50 font-nanum ${item.path === '#' ? 'text-gray-400' : ''}`}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>

                  {/* 사용자 메뉴 */}
                  <div className="py-2 border-t">
                    <div className="px-6 py-2 text-xs text-gray-400 font-nanum">내 정보</div>
                    {isLoggedIn ? (
                      <>
                        <button
                          onClick={() => {
                            navigate(
                              isAdmin ? "/admin" :
                              user?.role === 'partner' ? "/partner/dashboard" :
                              user?.role === 'vendor' ? getVendorDashboardPath() :
                              "/mypage"
                            );
                            setMobileMenuOpen(false);
                          }}
                          className="w-full text-left px-6 py-3 hover:bg-gray-50 text-[#5c2d91] font-nanum"
                        >
                          {isAdmin ? "관리자페이지" :
                           user?.role === 'partner' ? "파트너 대시보드" :
                           user?.role === 'vendor' ? "벤더 대시보드" :
                           "마이페이지"}
                        </button>
                        <button
                          onClick={() => {
                            navigate('/wishlist');
                            setMobileMenuOpen(false);
                          }}
                          className="w-full text-left px-6 py-3 hover:bg-gray-50 font-nanum"
                        >
                          찜 목록
                        </button>
                        <button
                          onClick={() => {
                            navigate('/recent-products');
                            setMobileMenuOpen(false);
                          }}
                          className="w-full text-left px-6 py-3 hover:bg-gray-50 font-nanum"
                        >
                          최근 본 상품
                        </button>
                        <button
                          onClick={() => {
                            logout();
                            setMobileMenuOpen(false);
                          }}
                          className="w-full text-left px-6 py-3 hover:bg-gray-50 text-gray-500 font-nanum"
                        >
                          로그아웃
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          navigate("/login");
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-left px-6 py-3 hover:bg-gray-50 text-[#5c2d91] font-nanum"
                      >
                        로그인 / 회원가입
                      </button>
                    )}
                  </div>

                  {/* PINTO */}
                  <div className="py-2 border-t">
                    <button
                      onClick={() => {
                        handleGoToPinto();
                        setMobileMenuOpen(false);
                      }}
                      disabled={ssoLoading}
                      className="w-full text-left px-6 py-3 hover:bg-indigo-50 text-indigo-600 flex items-center gap-2 font-nanum"
                    >
                      {ssoLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                      PINTO 쇼핑몰
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* ========== 3. 네비게이션 바 (120px) ========== */}
      <nav className="bg-white h-[50px] lg:h-[120px] border-b border-gray-200 shadow-sm hidden lg:block">
        <div className="max-w-content mx-auto h-full px-4 md:px-10 lg:px-20 flex items-center">
          {/* 왼쪽 메뉴 */}
          <div className="flex items-center gap-6 xl:gap-10">
            {leftNavItems.map((item) => (
              <button
                key={item.path + item.name}
                className={`relative font-nanum-eb text-base xl:text-lg hover:text-[#5c2d91] transition-colors whitespace-nowrap ${
                  currentView === item.path ? 'text-[#5c2d91]' : 'text-gray-700'
                }`}
                onClick={() => handleNavClick(item.path)}
              >
                {item.name}
                {item.badge && (
                  <span className={`absolute -top-2 -right-6 ${item.badgeColor} text-white text-[10px] px-1.5 py-0.5 rounded`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 구분선 */}
          <div className="h-6 w-px bg-gray-300 mx-6 xl:mx-10"></div>

          {/* 오른쪽 메뉴 */}
          <div className="flex items-center gap-4 xl:gap-8">
            {rightNavItems.map((item) => (
              <button
                key={item.path + item.name}
                className={`font-nanum text-sm xl:text-base hover:text-[#5c2d91] transition-colors whitespace-nowrap ${
                  item.path === '#' ? 'text-gray-400 cursor-default' :
                  currentView === item.path ? 'text-[#5c2d91]' : 'text-gray-600'
                }`}
                onClick={() => handleNavClick(item.path)}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}

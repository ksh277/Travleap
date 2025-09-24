import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore';
import {
  ShoppingBasket,
  ChevronDown,
  Menu,
  Facebook,
  Linkedin,
  UserPlus,
  MapPin,
  Calendar,
  Users,
  Filter,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Slider } from "./ui/slider";
import { t } from '../utils/translations';

interface HeaderProps {
  cartItemCount?: number;
  isAdmin?: boolean;
  isLoggedIn?: boolean;
  logout?: () => void;
  selectedLanguage?: string;
  selectedCurrency?: string;
}

export function Header({
  cartItemCount = 0,
  selectedLanguage = 'ko',
  selectedCurrency = 'KRW',
}: Omit<HeaderProps, 'isAdmin' | 'isLoggedIn' | 'logout'>) {
  const navigate = useNavigate();

  // Header에서 직접 useAuthStore 사용 (즉시 상태 반영을 위해)
  const { isLoggedIn, isAdmin, logout } = useAuthStore();


  const location = useLocation();
  const currentView = location.pathname;
  const showSearchBar = ['/category/', '/partner'].some(path => currentView.includes(path));
  const [searchQuery] = useState("");
  const [destination, setDestination] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [guests, setGuests] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 500000]);
  const [minRating, setMinRating] = useState(0);
  const [partnersOnly, setPartnersOnly] = useState(false);
  const [sponsorFirst, setSponsorFirst] = useState(false);

  const categories = [
    { id: "tour", name: t('travel', selectedLanguage), icon: "🗺️" },
    { id: "rentcar", name: t('camping', selectedLanguage), icon: "🚗" },
    { id: "accommodation", name: t('accommodation', selectedLanguage), icon: "🏨" },
    { id: "food", name: t('food', selectedLanguage), icon: "🍽️" },
    { id: "attraction", name: t('tourism', selectedLanguage), icon: "📷" },
    { id: "popup", name: t('popup', selectedLanguage), icon: "🎪" },
    { id: "event", name: t('events', selectedLanguage), icon: "📅" },
    { id: "experience", name: t('experience', selectedLanguage), icon: "🎡" },
  ];

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const searchParams = new URLSearchParams();
    if (destination) searchParams.set('destination', destination);
    if (dateRange) searchParams.set('dateRange', dateRange);
    if (guests) searchParams.set('guests', guests);
    if (priceRange[0] !== 0 || priceRange[1] !== 500000) {
      searchParams.set('priceMin', priceRange[0].toString());
      searchParams.set('priceMax', priceRange[1].toString());
    }
    if (minRating > 0) searchParams.set('minRating', minRating.toString());
    if (partnersOnly) searchParams.set('partnersOnly', 'true');
    if (sponsorFirst) searchParams.set('sponsorFirst', 'true');

    navigate(`/search?${searchParams.toString()}`);
  };

  const navigation = [
    { name: t('home', selectedLanguage), id: "home" },
    { name: t('categories', selectedLanguage), id: "categories", hasDropdown: true },
    { name: t('franchise', selectedLanguage), id: "franchise" },
    { name: t('contact', selectedLanguage), id: "contact" },
    { name: t('about', selectedLanguage), id: "about" },
  ];

  const destinations = [
    "증도면",
    "도초면",
    "비금면",
    "압해면",
    "암태면",
    "팔금면",
    "자은면",
    "흑산면",
    "하의면",
    "신의면",
  ];

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* 상단 연보라 탑바 */}
      <div className="bg-[#A8A8D8] h-[42px] flex items-center">
        <div className="w-full px-4 flex items-center justify-between text-[12px] text-white">
          {/* 왼쪽 */}
          <div className="flex items-center gap-3">
            <div className="flex gap-3 items-center">
              <a
                href="#"
                className="inline-flex items-center justify-center w-[18px] h-[18px] text-white hover:text-blue-100 transition-colors"
              >
                <Facebook className="w-3 h-3" />
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center w-[18px] h-[18px] text-white hover:text-blue-100 transition-colors"
              >
                <Linkedin className="w-3 h-3" />
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center w-[18px] h-[18px] text-white hover:text-blue-100 transition-colors"
              >
                <UserPlus className="w-3 h-3" />
              </a>
            </div>
            <span
              className="w-[1px] h-[14px] bg-white/35 mx-2"
              aria-hidden="true"
            ></span>
            <a
              className="text-white hover:text-blue-100 transition-colors"
              href="mailto:wazeplan@naver.com"
            >
              wazeplan@naver.com
            </a>
          </div>

          {/* 오른쪽 */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <button
                  className="text-white hover:text-blue-100 transition-colors"
                  onClick={() => navigate(isAdmin ? "/admin" : "/mypage")}
                >
                  {isAdmin ? "관리자페이지" : "마이페이지"}
                </button>
                <span className="h-[14px] w-[1px] bg-white/35"></span>
                <button
                  className="text-white hover:text-blue-100 transition-colors"
                  onClick={logout}
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <button
                  className="text-white hover:text-blue-100 transition-colors"
                  onClick={() => navigate("/login")}
                >
                  {t('login', selectedLanguage)}
                </button>
                <span className="h-[14px] w-[1px] bg-white/35"></span>
                <button
                  className="text-white hover:text-blue-100 transition-colors"
                  onClick={() => navigate("/signup")}
                >
                  {t('signup', selectedLanguage)}
                </button>
              </>
            )}
            <span className="h-[14px] w-[1px] bg-white/35"></span>
            <span className="text-white">
              {selectedCurrency}
            </span>
          </div>
        </div>
      </div>

      {/* 네비게이션 바 */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="h-[70px] w-full px-4 flex items-center">
          {/* 왼쪽: 로고 + 메뉴 */}
          <div className="flex items-center gap-8">
            {/* 로고 */}
            <a
              className="cursor-pointer flex items-center gap-2"
              onClick={() => navigate("/")}
            >
              <span className="text-2xl font-bold text-[#A8A8D8] tracking-tight select-none">Travelap</span>
            </a>

            {/* 메뉴 */}
            <div className="hidden md:flex items-center gap-8">
              {navigation.map((item) => (
                <div key={item.id}>
                  {item.hasDropdown ? (
                    <div className="relative group">
                      <button className="text-[#4A5568] hover:text-[#2D3748] transition-colors font-semibold text-[14px] tracking-wide flex items-center">
                        {item.name}
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </button>
                      {/* 드롭다운 메뉴 */}
                      <div className="absolute top-full left-0 mt-2 w-[400px] bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="grid grid-cols-2 gap-3 p-4">
                          {categories.map((category) => (
                            <button
                              key={category.id}
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-gray-50 cursor-pointer text-left"
                              onClick={() =>
                                navigate(`/category/${category.id}`)
                              }
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">
                                  {category.icon}
                                </span>
                                <div className="leading-none text-sm font-medium">
                                  {category.name}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      className={`text-[#4A5568] hover:text-[#2D3748] transition-colors font-semibold text-[14px] tracking-wide ${
                        currentView === `/${item.id === 'home' ? '' : item.id}`
                          ? "text-[#2D3748]"
                          : ""
                      }`}
                      onClick={() => {
                        if (item.id === 'home') {
                          navigate('/');
                        } else if (item.id === 'franchise') {
                          navigate('/partner');
                        } else {
                          navigate(`/${item.id}`);
                        }
                      }}
                    >
                      {item.name}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 우측 액션 */}
          <div className="flex items-center gap-4 ml-auto">
            {/* 장바구니 */}
            <button
              className="relative p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="장바구니"
              onClick={() => navigate('/cart')}
            >
              <ShoppingBasket className="w-5 h-5 text-gray-600" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </button>

            {/* 관리자/로그인 메뉴 */}
            <div className="hidden md:flex items-center gap-2">
              {isLoggedIn ? (
                <div className="flex items-center gap-2">
                  {isAdmin ? (
                    <Button
                      variant="outline"
                      onClick={() => navigate("/admin")}
                      className="text-purple-600 border-purple-600 hover:bg-purple-50"
                    >
                      {t('admin', selectedLanguage)}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => navigate("/mypage")}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                      {t('mypage', selectedLanguage)}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={logout}
                    className="text-gray-600"
                  >
                    {t('logout', selectedLanguage)}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="text-gray-600"
                >
                  {t('login', selectedLanguage)}
                </Button>
              )}
            </div>

            {/* CTA 버튼 */}
            <Button
              className="hidden md:inline-flex bg-[#ff6a3d] hover:bg-[#e5582b] text-white"
              onClick={() => navigate("/partner-apply")}
            >
              {t('becomeLocalExpert', selectedLanguage)}
            </Button>

            {/* 모바일 메뉴 */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="grid gap-6 py-6">
                  {navigation.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === 'home') {
                          navigate('/');
                        } else if (item.id === 'franchise') {
                          navigate('/partner');
                        } else {
                          navigate(`/${item.id}`);
                        }
                      }}
                      className="text-left text-lg hover:text-[#4A5568] transition-colors"
                    >
                      {item.name}
                    </button>
                  ))}
                  <div className="border-t pt-6">
                    <div className="mb-4 font-semibold">
                      {t('categories', selectedLanguage)}
                    </div>
                    <div className="grid gap-2">
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() =>
                            navigate(`/category/${category.id}`)
                          }
                          className="flex items-center space-x-2 text-left p-2 hover:bg-gray-100 rounded"
                        >
                          <span>{category.icon}</span>
                          <span>{category.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* 모바일 로그인/관리자/마이페이지 메뉴 */}
                  <div className="border-t pt-6">
                    {isLoggedIn ? (
                      <div className="space-y-2">
                        {isAdmin ? (
                          <button
                            onClick={() => navigate("/admin")}
                            className="block w-full text-left p-2 hover:bg-purple-50 rounded text-purple-600 font-medium"
                          >
                            {t('admin', selectedLanguage)} 페이지
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate("/mypage")}
                            className="block w-full text-left p-2 hover:bg-blue-50 rounded text-blue-600 font-medium"
                          >
                            {t('mypage', selectedLanguage)}
                          </button>
                        )}
                        <button
                          onClick={logout}
                          className="block w-full text-left p-2 hover:bg-gray-100 rounded text-gray-600"
                        >
                          {t('logout', selectedLanguage)}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate("/login")}
                        className="block w-full text-left p-2 hover:bg-gray-100 rounded text-gray-600"
                      >
                        {t('login', selectedLanguage)}
                      </button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* 검색바 (조건부 표시) */}
      {showSearchBar && (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="w-full px-4 py-4">
            <form onSubmit={handleSearch} className="space-y-4">
              {/* 기본 검색 옵션 */}
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {/* 목적지 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    {t('destination', selectedLanguage)}
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Select
                      value={destination}
                      onValueChange={setDestination}
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder={t('selectDestination', selectedLanguage)} />
                      </SelectTrigger>
                      <SelectContent>
                        {destinations.map((dest) => (
                          <SelectItem key={dest} value={dest}>
                            {dest}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 날짜 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    {t('checkIn', selectedLanguage)}
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      type="date"
                      className="pl-10"
                      value={dateRange}
                      onChange={(e) =>
                        setDateRange(e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* 인원 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    {t('guests', selectedLanguage)}
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Select
                      value={guests}
                      onValueChange={setGuests}
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder={t('howMany', selectedLanguage)} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1{t('people', selectedLanguage)}</SelectItem>
                        <SelectItem value="2">2{t('people', selectedLanguage)}</SelectItem>
                        <SelectItem value="3">3{t('people', selectedLanguage)}</SelectItem>
                        <SelectItem value="4">4{t('people', selectedLanguage)}</SelectItem>
                        <SelectItem value="5+">
                          5{t('moreThan', selectedLanguage)}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 고급 옵션 토글 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    {t('options', selectedLanguage)}
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() =>
                      setShowAdvanced(!showAdvanced)
                    }
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    {t('advancedOptions', selectedLanguage)}
                  </Button>
                </div>

                {/* 검색 버튼 */}
                <div className="flex items-end">
                  <Button
                    type="submit"
                    className="w-full bg-[#ff6a3d] hover:bg-[#e5582b]"
                  >
                    {t('searchButton', selectedLanguage)}
                  </Button>
                </div>
              </div>

              {/* 고급 옵션 */}
              {showAdvanced && (
                <div className="border-t border-gray-200 pt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 가격대 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        {t('priceRange', selectedLanguage)}
                      </label>
                      <div className="px-3">
                        <Slider
                          value={priceRange}
                          onValueChange={setPriceRange}
                          max={500000}
                          step={10000}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>
                            {priceRange[0].toLocaleString()}원
                          </span>
                          <span>
                            {priceRange[1].toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 평점 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        {t('minRating', selectedLanguage)}
                      </label>
                      <Select
                        value={minRating.toString()}
                        onValueChange={(value) =>
                          setMinRating(Number(value))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectRating', selectedLanguage)} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">
                            {t('all', selectedLanguage)}
                          </SelectItem>
                          <SelectItem value="3">
                            ⭐ 3{t('orMore', selectedLanguage)}
                          </SelectItem>
                          <SelectItem value="4">
                            ⭐ 4{t('orMore', selectedLanguage)}
                          </SelectItem>
                          <SelectItem value="4.5">
                            ⭐ 4.5{t('orMore', selectedLanguage)}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 파트너만 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        {t('filter', selectedLanguage)}
                      </label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="partners-only"
                            checked={partnersOnly}
                            onCheckedChange={(checked) => setPartnersOnly(checked === true)}
                          />
                          <label
                            htmlFor="partners-only"
                            className="text-sm"
                          >
                            {t('partnersOnly', selectedLanguage)}
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* 스폰서 우선 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        {t('sort', selectedLanguage)}
                      </label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="sponsor-first"
                            checked={sponsorFirst}
                            onCheckedChange={(checked) => setSponsorFirst(checked === true)}
                          />
                          <label
                            htmlFor="sponsor-first"
                            className="text-sm"
                          >
                            {t('sponsorFirst', selectedLanguage)}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
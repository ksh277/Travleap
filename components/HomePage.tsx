import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Star, MapPin, Clock, Gift, Sparkles, Heart, Zap, Search, Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Users } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { formatPrice, t } from '../utils/translations';
import { api, type TravelItem } from '../utils/api';
import type { Category } from '../types/database';
import { toast } from 'sonner';

interface HomePageProps {
  selectedCurrency?: string;
  selectedLanguage?: string;
}

export function HomePage({ selectedCurrency = 'KRW', selectedLanguage = 'ko' }: HomePageProps) {
  // Set page metadata for SEO
  useEffect(() => {
    document.title = 'Travleap - 신안 여행의 모든 것 | 맞춤형 여행 플랫폼';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', '신안군 최고의 여행 플랫폼. 숙박, 투어, 체험, 맛집까지 한번에. AI 맞춤 추천과 실시간 할인으로 완벽한 신안 여행을 계획하세요.');
    }
  }, []);
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');
  const [checkInDate, setCheckInDate] = useState<Date | undefined>();
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>();
  const [guestCounts, setGuestCounts] = useState({
    rooms: 1,
    adults: 1,
    children: 0
  });

  // Enhanced state management
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredListings, setFeaturedListings] = useState<TravelItem[]>([]);
  const [accommodationListings, setAccommodationListings] = useState<TravelItem[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Enhanced data loading with retry mechanism - 모든 API 호출을 통일
  const loadData = useCallback(async (isRetry = false) => {
    try {
      if (!isRetry) {
        setLoading(true);
        setError(null);
      }

      const sampleCategories: Category[] = [
        { id: 1, slug: 'tour', name_ko: '투어', icon: '🎯', sort_order: 1, is_active: true },
        { id: 2, slug: 'stay', name_ko: '숙박', icon: '🏨', sort_order: 2, is_active: true },
        { id: 3, slug: 'food', name_ko: '음식', icon: '🍽️', sort_order: 3, is_active: true },
        { id: 4, slug: 'attraction', name_ko: '관광지', icon: '🏛️', sort_order: 4, is_active: true },
        { id: 5, slug: 'experience', name_ko: '체험', icon: '🎨', sort_order: 5, is_active: true },
        { id: 6, slug: 'rental', name_ko: '렌트카', icon: '🚗', sort_order: 6, is_active: true }
      ];

      // 모든 API 호출을 api.getListings()로 통일
      const [categoriesResult, featuredResult, accommodationResult, reviewsResult] = await Promise.all([
        api.getCategories().catch(() => []),
        api.getListings({ limit: 8, sortBy: 'popular' }).then(res => res.data || []).catch(() => []),
        api.getListings({ category: 'stay', limit: 4, sortBy: 'popular' }).then(res => res.data || []).catch(() => []),
        api.getRecentReviews(4).catch(() => [])
      ]);

      setCategories(categoriesResult.length > 0 ? categoriesResult : sampleCategories);
      setFeaturedListings(featuredResult);
      setAccommodationListings(accommodationResult);
      setRecentReviews(reviewsResult);
      setRetryCount(0);

    } catch (error) {
      console.error('Failed to load homepage data:', error);
      const errorMessage = error instanceof Error ? error.message : '데이터를 불러오는데 실패했습니다';
      setError(errorMessage);

      if (!isRetry && retryCount < 2) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => loadData(true), 2000);
      } else {
        const sampleCategories: Category[] = [
          { id: 1, slug: 'tour', name_ko: '투어', icon: '🎯', sort_order: 1, is_active: true },
          { id: 2, slug: 'stay', name_ko: '숙박', icon: '🏨', sort_order: 2, is_active: true },
          { id: 3, slug: 'food', name_ko: '음식', icon: '🍽️', sort_order: 3, is_active: true },
          { id: 4, slug: 'attraction', name_ko: '관광지', icon: '🏛️', sort_order: 4, is_active: true },
          { id: 5, slug: 'experience', name_ko: '체험', icon: '🎨', sort_order: 5, is_active: true },
          { id: 6, slug: 'rental', name_ko: '렌트카', icon: '🚗', sort_order: 6, is_active: true }
        ];
        setCategories(sampleCategories);
        // API 실패 시에도 빈 배열로 설정하여 일관된 상태 유지
        setFeaturedListings([]);
        setAccommodationListings([]);
        setRecentReviews([]);
        toast.error('일부 데이터를 불러올 수 없습니다. 나중에 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Enhanced utility functions
  const formatDate = useCallback((date: Date | undefined) => {
    if (!date) return '';
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const validateSearch = useCallback(() => {
    if (!destination.trim()) {
      toast.error('목적지를 입력해주세요.');
      return false;
    }
    if (checkInDate && checkOutDate && checkOutDate <= checkInDate) {
      toast.error('체크아웃 날짜는 체크인 날짜보다 늦어야 합니다.');
      return false;
    }
    if (checkInDate && checkInDate < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      toast.error('체크인 날짜는 오늘 이후여야 합니다.');
      return false;
    }
    return true;
  }, [destination, checkInDate, checkOutDate]);

  const handleSearch = useCallback(async () => {
    if (!validateSearch()) return;

    try {
      setSearchLoading(true);
      const searchParams = new URLSearchParams();
      searchParams.set('q', destination.trim());
      if (checkInDate) searchParams.set('checkin', checkInDate.toISOString().split('T')[0]);
      if (checkOutDate) searchParams.set('checkout', checkOutDate.toISOString().split('T')[0]);
      searchParams.set('rooms', guestCounts.rooms.toString());
      searchParams.set('adults', guestCounts.adults.toString());
      searchParams.set('children', guestCounts.children.toString());

      navigate(`/search?${searchParams.toString()}`);
    } catch (error) {
      toast.error('검색 중 오류가 발생했습니다.');
    } finally {
      setSearchLoading(false);
    }
  }, [validateSearch, destination, checkInDate, checkOutDate, guestCounts, navigate]);

  const searchSuggestionsData = useMemo(() => [
    '제주도', '부산', '강릉', '경주', '전주', '여수', '춘천', '속초', '대구', '광주'
  ], []);

  const handleDestinationChange = useCallback((value: string) => {
    setDestination(value);
    if (value.length > 0) {
      const filtered = searchSuggestionsData.filter(suggestion =>
        suggestion.toLowerCase().includes(value.toLowerCase())
      );
      setSearchSuggestions(filtered.slice(0, 5));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchSuggestionsData]);

  const serviceCards = useMemo(() => [
    {
      id: 1,
      title: "플레이스 굿즈 & 체험",
      description: "각 여행지에 해당되는 특이한 굿즈, 상품, 체험 판매",
      icon: <Gift className="h-8 w-8" />,
      color: "bg-blue-50",
      iconColor: "text-blue-600"
    },
    {
      id: 2,
      title: "제휴업체와의 할인이벤트",
      description: "약 300여개와 제휴되어 어딜가든지 최대 20%할인",
      icon: <Sparkles className="h-8 w-8" />,
      color: "bg-purple-50",
      iconColor: "text-purple-600"
    },
    {
      id: 3,
      title: "AI 맞춤 추천",
      description: "개인의 취향에 맞는 최적의 여행 코스 추천",
      icon: <Star className="h-8 w-8" />,
      color: "bg-yellow-50",
      iconColor: "text-yellow-600"
    }
  ], []);

  const handleRetry = useCallback(() => {
    setRetryCount(0);
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen bg-gray-50 mobile-safe-bottom" role="main" aria-label="홈페이지 메인 콘텐츠">
      {/* Hero Section - Mobile Optimized with Video Background */}
      <div className="relative h-[60vh] md:h-[48vh] overflow-hidden mobile-safe-top">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source
            src="https://cdn.pixabay.com/video/2022/05/05/116349-707815466_large.mp4"
            type="video/mp4"
          />
          {/* Fallback 이미지 (비디오 로딩 실패 시) */}
          <img
            src="https://images.unsplash.com/photo-1693098436985-4a7dece474b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cm9waWNhbCUyMHBhbG0lMjB0cmVlcyUyMGJlYWNoJTIwdmFjYXRpb258ZW58MXx8fHwxNzU3NTcwNjQzfDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Beach background"
            className="w-full h-full object-cover"
          />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/50"></div>
        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col items-center justify-center">
          {/* Enhanced Main Title with SEO */}
          <div className="text-center text-white space-y-2 md:space-y-3 max-w-4xl mb-6 md:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light tracking-wide animate-fade-in">
              My Travel Awesomeplan
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-white/90 font-light px-4 animate-fade-in-delay">
              어떤곳을 내게만 여행상품을 찾아볼 느낌이
            </p>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mt-4">
                <div className="flex items-center gap-2 text-white">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetry}
                    className="ml-2 text-white border-white/20 hover:bg-white/10"
                  >
                    다시 시도
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile-Optimized Search Form */}
          <div className="w-full max-w-6xl mobile-container">
            <div className="mobile-card bg-white shadow-2xl">
              <div className="flex flex-col gap-4">
                {/* Mobile-First Search Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Enhanced destination input with suggestions */}
                  <div className="space-y-1 md:space-y-2 relative">
                    <label className="text-xs md:text-sm font-medium text-gray-700 block">{t('destination', selectedLanguage)}</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 z-10" />
                      <input
                        type="text"
                        placeholder={t('destinationPlaceholder', selectedLanguage)}
                        value={destination}
                        onChange={(e) => handleDestinationChange(e.target.value)}
                        onFocus={() => destination.length > 0 && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        className="w-full pl-10 pr-3 py-2.5 md:py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm min-h-[44px] md:min-h-[36px]"
                        autoComplete="off"
                      />
                      {showSuggestions && searchSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-20 mt-1">
                          {searchSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm first:rounded-t-md last:rounded-b-md"
                              onClick={() => {
                                setDestination(suggestion);
                                setShowSuggestions(false);
                              }}
                            >
                              <MapPin className="inline h-3 w-3 mr-2 text-gray-400" />
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 체크인 날짜 */}
                  <div className="space-y-1 md:space-y-2">
                    <label className="text-xs md:text-sm font-medium text-gray-700 block">{t('checkIn', selectedLanguage)}</label>
                    <input
                      type="date"
                      value={checkInDate ? checkInDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => setCheckInDate(e.target.value ? new Date(e.target.value) : undefined)}
                      className="w-full px-3 py-2.5 md:py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm min-h-[44px] md:min-h-[36px]"
                    />
                  </div>

                  {/* 체크아웃 날짜 */}
                  <div className="space-y-1 md:space-y-2">
                    <label className="text-xs md:text-sm font-medium text-gray-700 block">{t('checkOut', selectedLanguage)}</label>
                    <input
                      type="date"
                      value={checkOutDate ? checkOutDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => setCheckOutDate(e.target.value ? new Date(e.target.value) : undefined)}
                      className="w-full px-3 py-2.5 md:py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm min-h-[44px] md:min-h-[36px]"
                    />
                  </div>

                  {/* 게스트 */}
                  <div className="space-y-1 md:space-y-2">
                    <label className="text-xs md:text-sm font-medium text-gray-700 block">{t('guests', selectedLanguage)}</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal min-h-[44px] md:min-h-[36px] text-sm">
                          <Users className="mr-2 h-4 w-4" />
                          <span className="truncate">{`${t('rooms', selectedLanguage)} ${guestCounts.rooms}, ${t('adults', selectedLanguage)} ${guestCounts.adults}${guestCounts.children > 0 ? `, ${t('children', selectedLanguage)} ${guestCounts.children}` : ''}`}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="start">
                        <div className="space-y-4">
                          {/* 객실 수 */}
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">{t('rooms', selectedLanguage)}</label>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setGuestCounts(prev => ({ ...prev, rooms: Math.max(1, prev.rooms - 1) }))}
                                disabled={guestCounts.rooms <= 1}
                              >
                                -
                              </Button>
                              <span className="w-8 text-center">{guestCounts.rooms}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setGuestCounts(prev => ({ ...prev, rooms: prev.rooms + 1 }))}
                              >
                                +
                              </Button>
                            </div>
                          </div>

                          {/* 성인 수 */}
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">{t('adults', selectedLanguage)}</label>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setGuestCounts(prev => ({ ...prev, adults: Math.max(1, prev.adults - 1) }))}
                                disabled={guestCounts.adults <= 1}
                              >
                                -
                              </Button>
                              <span className="w-8 text-center">{guestCounts.adults}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setGuestCounts(prev => ({ ...prev, adults: prev.adults + 1 }))}
                              >
                                +
                              </Button>
                            </div>
                          </div>

                          {/* 어린이 수 */}
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">{t('children', selectedLanguage)}</label>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setGuestCounts(prev => ({ ...prev, children: Math.max(0, prev.children - 1) }))}
                                disabled={guestCounts.children <= 0}
                              >
                                -
                              </Button>
                              <span className="w-8 text-center">{guestCounts.children}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setGuestCounts(prev => ({ ...prev, children: prev.children + 1 }))}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* 두 번째 행: 추가 정보 및 검색 버튼 */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  {/* 날짜 범위 표시 */}
                  <div className="flex-1 w-full sm:w-auto">
                    {checkInDate && checkOutDate && checkOutDate > checkInDate && (
                      <div className="text-xs sm:text-sm text-gray-600">
                        <span className="font-medium">
                          {Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))}박
                          {Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)) + 1}일
                        </span>
                        <span className="ml-2 text-gray-500 hidden sm:inline">
                          {formatDate(checkInDate)} - {formatDate(checkOutDate)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Mobile-Optimized Search Button */}
                  <div className="flex-shrink-0 w-full sm:w-auto">
                    <Button
                      className="mobile-button mobile-ripple bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white w-full sm:w-auto transition-all duration-200"
                      onClick={handleSearch}
                      disabled={searchLoading || !destination.trim()}
                    >
                      {searchLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          검색 중...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          {t('search', selectedLanguage)}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="container mx-auto px-4 py-12 md:py-16 space-y-12 md:space-y-16">
        {/* Service Information */}
        <section className="-mt-6 md:-mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {serviceCards.map((card) => (
              <div key={card.id} className="text-center px-6 py-8">
                <h3 className="text-lg md:text-xl font-semibold mb-3 text-gray-800">{card.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Enhanced popular products section */}
        <section>
          <div className="mb-6 md:mb-8">
            <div className="container mx-auto px-4">
              <div className="mb-4 md:mb-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                  <h2 className="text-2xl md:text-3xl font-semibold text-gray-800">지금 신안은?</h2>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="animate-pulse overflow-hidden">
                      <div className="bg-gray-200 h-56"></div>
                      <CardContent className="p-4 space-y-3">
                        <div className="bg-gray-200 h-4 rounded"></div>
                        <div className="bg-gray-200 h-4 rounded w-3/4"></div>
                        <div className="bg-gray-200 h-4 rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : featuredListings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  {featuredListings.slice(0, 4).map((listing) => (
                    <Card
                      key={listing.id}
                      className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
                      onClick={() => navigate(`/detail/${listing.id}`)}
                    >
                      <div className="relative group overflow-hidden rounded-t-lg">
                        <ImageWithFallback
                          src={listing.images?.[0] || 'https://via.placeholder.com/400x300'}
                          alt={listing.title}
                          className="w-full h-40 md:h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-gray-800 px-2 py-1 rounded text-xs font-medium shadow-sm">
                          {listing.category}
                        </div>
                        <button className="absolute top-2 right-2 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                          <Heart className="h-5 w-5 text-white drop-shadow-sm" />
                        </button>
                        {listing.discount_rate && (
                          <div className="absolute bottom-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                            {listing.discount_rate}% 할인
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3 md:p-4">
                        <div className="space-y-2 md:space-y-3">
                          <div className="flex items-center text-gray-600 text-xs md:text-sm">
                            <MapPin className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                            <span>{listing.location || '신안군'}</span>
                          </div>

                          <h3 className="text-base md:text-lg font-semibold text-gray-800 line-clamp-2">{listing.title}</h3>

                          <div className="flex items-center">
                            {listing.rating_avg > 0 && listing.rating_count > 0 && (
                              <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{listing.rating_avg.toFixed(1)}</span>
                                <span className="text-xs text-gray-500">({listing.rating_count})</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            {listing.duration && (
                              <div className="flex items-center text-gray-600 text-sm">
                                <Clock className="h-4 w-4 mr-1" />
                                <span>{listing.duration}</span>
                              </div>
                            )}
                            <div className="text-lg font-semibold text-gray-800">
                              {listing.price_from ? (
                                <>
                                  <span>{formatPrice(listing.price_from, selectedCurrency)}</span>
                                  <span className="text-sm text-gray-600 ml-1">/1인</span>
                                </>
                              ) : (
                                <span className="text-sm text-gray-600">가격 문의</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="max-w-md mx-auto">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Gift className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">상품 준비 중</h3>
                    <p className="text-gray-600 mb-4">더 많은 여행 상품을 준비하고 있습니다.</p>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/categories')}
                      className="text-sm"
                    >
                      전체 카테고리 보기
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Enhanced activities section */}
        <section>
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-purple-600" />
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-800">액티비티</h2>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 h-[500px] md:h-96">
              <div className="w-full md:w-1/2 h-1/2 md:h-full animate-pulse">
                <div className="bg-gray-200 h-full rounded-lg"></div>
              </div>
              <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-row md:flex-col gap-3 md:gap-4">
                <div className="w-1/2 md:w-full h-full md:h-1/2 animate-pulse">
                  <div className="bg-gray-200 h-full rounded-lg"></div>
                </div>
                <div className="w-1/2 md:w-full h-full md:h-1/2 animate-pulse">
                  <div className="bg-gray-200 h-full rounded-lg"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 h-[500px] md:h-96">
              {/* Enhanced main activity image */}
              <div className="w-full md:w-1/2 h-1/2 md:h-full relative group">
                <div
                  className="cursor-pointer h-full overflow-hidden rounded-lg"
                  onClick={() => navigate('/category/stay')}
                >
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500&h=400&fit=crop"
                    alt="신안 민박"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute bottom-4 left-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <h3 className="text-xl font-semibold mb-1">신안 숙박</h3>
                    <p className="text-sm text-white/80">편안한 휴식 공간</p>
                  </div>
                </div>
              </div>

              {/* Enhanced smaller activity images */}
              <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-row md:flex-col gap-3 md:gap-4">
                <div className="w-1/2 md:w-full h-full md:h-1/2 relative group">
                  <div
                    className="cursor-pointer h-full overflow-hidden rounded-lg"
                    onClick={() => navigate('/category/experience')}
                  >
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=300&h=200&fit=crop"
                      alt="갯벌체험"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute bottom-2 left-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <h4 className="font-semibold text-sm">갯벌 체험</h4>
                      <p className="text-xs text-white/80">특별한 경험</p>
                    </div>
                  </div>
                </div>
                <div className="w-1/2 md:w-full h-full md:h-1/2 relative group">
                  <div
                    className="cursor-pointer h-full overflow-hidden rounded-lg"
                    onClick={() => navigate('/category/tour')}
                  >
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1464822759880-4601b726be04?w=300&h=200&fit=crop"
                      alt="홍도 유람선"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute bottom-2 left-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <h4 className="font-semibold text-sm">홍도 투어</h4>
                      <p className="text-xs text-white/80">눈부신 풍경</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 주변 숙소 */}
        <section>
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6 md:mb-8">주변 숙소 보기</h2>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 h-64 md:h-80 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : accommodationListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {accommodationListings.map((item) => (
                <Card
                  key={item.id}
                  className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
                  onClick={() => navigate(`/detail/${item.id}`)}
                >
                  <div className="relative group overflow-hidden rounded-t-lg">
                    <ImageWithFallback
                      src={item.images?.[0] || 'https://via.placeholder.com/400x300'}
                      alt={item.title}
                      className="w-full h-40 md:h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-gray-800 px-2 py-1 rounded text-xs font-medium shadow-sm">
                      {item.category}
                    </div>
                    <button className="absolute top-2 right-2 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                      <Heart className="h-5 w-5 text-white drop-shadow-sm" />
                    </button>
                    {item.price_from && item.original_price && item.original_price > item.price_from && (
                      <div className="absolute bottom-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                        {Math.round((1 - item.price_from / item.original_price) * 100)}% 할인
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3 md:p-4">
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex items-center text-gray-600 text-xs md:text-sm">
                        <MapPin className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                        <span>{item.location || '신안군'}</span>
                      </div>

                      <h3 className="text-base md:text-lg font-semibold text-gray-800 line-clamp-2">{item.title}</h3>

                      <div className="flex items-center">
                        {item.rating_avg > 0 && item.rating_count > 0 && (
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{item.rating_avg.toFixed(1)}</span>
                            <span className="text-xs text-gray-500">({item.rating_count})</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        {item.duration && (
                          <div className="flex items-center text-gray-600 text-sm">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{item.duration}</span>
                          </div>
                        )}
                        <div className="text-lg font-semibold text-gray-800">
                          {item.price_from ? (
                            <>
                              <span>{formatPrice(item.price_from, selectedCurrency)}</span>
                              <span className="text-sm text-gray-600 ml-1">/1인</span>
                            </>
                          ) : (
                            <span className="text-sm text-gray-600">가격 문의</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">숙박 상품 준비 중</h3>
                  <p className="text-gray-600 mb-4">편안한 숙박 시설을 준비하고 있습니다.</p>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/category/stay')}
                    className="text-sm"
                  >
                    숙박 카테고리 보기
                  </Button>
                </div>
              </div>
            )}

          {/* 더 보기 버튼 */}
          <div className="text-center mt-6 md:mt-8">
            <Button
              variant="outline"
              className="px-6 md:px-8 py-2.5 md:py-2 text-sm min-h-[44px] md:min-h-[36px]"
              onClick={() => navigate('/search')}
            >
              더 많은 상품 보기
            </Button>
          </div>
        </section>

      </div>
    </div>
  );
}
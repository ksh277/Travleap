import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Star, MapPin, Clock, Gift, Sparkles, Heart, Zap, Search, Loader2, AlertCircle, TrendingUp, CalendarIcon, Share2, ChevronLeft, ChevronRight, Instagram } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Users } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { formatPrice, t } from '../utils/translations';
import { api, type TravelItem } from '../utils/api';
import type { Category } from '../types/database';
import { toast } from 'sonner';
import { HomeBanner } from './HomeBanner';
// HotelCard import 제거 - 숙박 섹션이 카테고리 상품(listings)으로 변경됨
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

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
  const [nearbyHotels, setNearbyHotels] = useState<any[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [activityImages, setActivityImages] = useState<any[]>([]);
  // 새 섹션용 state
  const [tourListings, setTourListings] = useState<TravelItem[]>([]);
  const [rentcarListings, setRentcarListings] = useState<TravelItem[]>([]);
  const [eventListings, setEventListings] = useState<TravelItem[]>([]);
  const [experienceListings, setExperienceListings] = useState<TravelItem[]>([]);
  const [instagramImages, setInstagramImages] = useState<any[]>([]);
  // 캐러셀 인덱스 state
  const [tourIndex, setTourIndex] = useState(0);
  const [stayIndex, setStayIndex] = useState(0);
  const [rentcarIndex, setRentcarIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchStep, setSearchStep] = useState(1); // 모바일 검색 단계 (1: 목적지+인원, 2: 체크인+체크아웃)
  const [backgroundVideo, setBackgroundVideo] = useState({
    videoId: 'kroXVig0QRc', // YouTube 영상 ID
    overlayOpacity: 0.4
  });
  const playerRef = useRef<any>(null);

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

      // 카테고리 페이지와 동일한 API 사용 - 모든 섹션 데이터 fetch
      const [
        categoriesResult,
        tourResult,
        hotelsResult,
        rentcarResult,
        eventResult,
        experienceResult,
        reviewsResult,
        homepageSettings,
        activitiesResult
      ] = await Promise.all([
        api.getCategories().catch(() => []),
        // 여행상품
        api.getListings({ category: 'tour', limit: 8, sortBy: 'popular' }).then(res => res.data || []).catch(() => []),
        // 숙박
        api.getListings({ category: 'stay', limit: 8, sortBy: 'popular' }).then(res => res.data || []).catch(() => []),
        // 렌트카 - rentcar_vendors (업체) 테이블에서 가져오기
        fetch('/api/rentcar/vendors').then(res => res.json()).then(data => data.data || []).catch(() => []),
        // 행사
        api.getListings({ category: 'event', limit: 6, sortBy: 'popular' }).then(res => res.data || []).catch(() => []),
        // 체험
        api.getListings({ category: 'experience', limit: 6, sortBy: 'popular' }).then(res => res.data || []).catch(() => []),
        api.getRecentReviews(4).catch(() => []),
        api.getHomepageSettings().catch(() => ({
          background_video_url: 'https://cdn.pixabay.com/video/2022/05/05/116349-707815466_large.mp4',
          background_overlay_opacity: 0.4
        })),
        fetch('/api/activities').then(res => res.json()).then(data => data.activities || []).catch(() => [])
      ]);

      setCategories(categoriesResult.length > 0 ? categoriesResult : sampleCategories);

      // 여행상품 데이터
      setTourListings(Array.isArray(tourResult) ? tourResult : []);

      // 숙박 데이터 설정
      const hotels = Array.isArray(hotelsResult) ? hotelsResult : [];
      setNearbyHotels(hotels);
      setAccommodationListings(hotels);

      // 렌트카 데이터
      setRentcarListings(Array.isArray(rentcarResult) ? rentcarResult : []);

      // 행사/체험 데이터
      setEventListings(Array.isArray(eventResult) ? eventResult : []);
      setExperienceListings(Array.isArray(experienceResult) ? experienceResult : []);

      setRecentReviews(reviewsResult);
      setActivityImages(activitiesResult);

      // 인스타그램 이미지 (임시 데이터)
      setInstagramImages([
        { id: 1, image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop' },
        { id: 2, image_url: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=300&h=300&fit=crop' },
        { id: 3, image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&h=300&fit=crop' },
        { id: 4, image_url: 'https://images.unsplash.com/photo-1464822759880-4601b726be04?w=300&h=300&fit=crop' },
        { id: 5, image_url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=300&h=300&fit=crop' },
        { id: 6, image_url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=300&h=300&fit=crop' },
        { id: 7, image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop' },
        { id: 8, image_url: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=300&h=300&fit=crop' },
        { id: 9, image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&h=300&fit=crop' },
        { id: 10, image_url: 'https://images.unsplash.com/photo-1464822759880-4601b726be04?w=300&h=300&fit=crop' },
        { id: 11, image_url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=300&h=300&fit=crop' },
        { id: 12, image_url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=300&h=300&fit=crop' },
        { id: 13, image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop' },
        { id: 14, image_url: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=300&h=300&fit=crop' },
        { id: 15, image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&h=300&fit=crop' },
        { id: 16, image_url: 'https://images.unsplash.com/photo-1464822759880-4601b726be04?w=300&h=300&fit=crop' },
        { id: 17, image_url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=300&h=300&fit=crop' },
        { id: 18, image_url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=300&h=300&fit=crop' },
      ]);
      setBackgroundVideo({
        videoId: homepageSettings.background_video_id || 'kroXVig0QRc',
        overlayOpacity: homepageSettings.background_overlay_opacity || 0.4
      });
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
        setTourListings([]);
        setRentcarListings([]);
        setEventListings([]);
        setExperienceListings([]);
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
      {/* Hero Section - Mobile Optimized with YouTube Background */}
      <div className="relative h-[400px] md:h-[600px] overflow-hidden mobile-safe-top">
        {/* YouTube Background Video */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <iframe
            ref={playerRef}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              width: '100vw',
              height: '56.25vw', // 16:9 비율
              minHeight: '100vh',
              minWidth: '177.77vh', // 16:9 비율
              pointerEvents: 'none'
            }}
            src={`https://www.youtube.com/embed/${backgroundVideo.videoId}?autoplay=1&mute=1&loop=1&playlist=${backgroundVideo.videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`}
            title="Background video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/50"
          style={{ opacity: backgroundVideo.overlayOpacity }}
        ></div>
        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col items-center justify-center">
          {/* Enhanced Main Title with SEO */}
          <div className="text-center text-white space-y-2 md:space-y-3 max-w-4xl mb-6 md:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light tracking-wide animate-fade-in">
              My Travel Awesomeplan
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-white/90 font-light px-4 animate-fade-in-delay">
              어썸플랜의 다양한 여행상품을 확인해 보세요
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

          {/* Mobile-Optimized Search Form - 2x2 Grid on Mobile, Original on Desktop */}
          <div className="w-full max-w-2xl lg:max-w-6xl mobile-container">
            <div className="mobile-card bg-white shadow-2xl">
              <div className="flex flex-col gap-4">
                {/* 데스크톱: 모든 필드 표시 */}
                <div className="hidden lg:flex lg:flex-row gap-3 lg:gap-4">
                  {/* 목적지 */}
                  <div className="space-y-2 relative lg:flex-1">
                    <label className="text-sm font-medium text-gray-700 block">{t('destination', selectedLanguage)}</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 z-10" />
                      <input
                        type="text"
                        placeholder={t('destinationPlaceholder', selectedLanguage)}
                        value={destination}
                        onChange={(e) => handleDestinationChange(e.target.value)}
                        onFocus={() => destination.length > 0 && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm min-h-[44px] text-gray-900 bg-white"
                        autoComplete="off"
                      />
                      {showSuggestions && searchSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-20 mt-1">
                          {searchSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm first:rounded-t-md last:rounded-b-md min-h-[44px]"
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

                  {/* 인원 */}
                  <div className="space-y-2 lg:flex-1">
                    <label className="text-sm font-medium text-gray-700 block">{t('guests', selectedLanguage)}</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal min-h-[44px] text-sm border-gray-200 rounded-lg hover:border-purple-500">
                          <Users className="mr-2 h-4 w-4" />
                          <span className="truncate">{`${t('rooms', selectedLanguage)} ${guestCounts.rooms}, ${t('adults', selectedLanguage)} ${guestCounts.adults}${guestCounts.children > 0 ? `, ${t('children', selectedLanguage)} ${guestCounts.children}` : ''}`}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-4" align="start">
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

                  {/* 체크인 날짜 */}
                  <div className="space-y-2 lg:flex-1">
                    <label className="text-sm font-medium text-gray-700 block">{t('checkIn', selectedLanguage)}</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm min-h-[44px] text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <span className={checkInDate ? 'text-gray-900' : 'text-gray-400'}>
                            {checkInDate ? format(checkInDate, 'yyyy년 MM월 dd일', { locale: ko }) : '날짜 선택'}
                          </span>
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={checkInDate}
                          onSelect={setCheckInDate}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          locale={ko}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* 체크아웃 날짜 */}
                  <div className="space-y-2 lg:flex-1">
                    <label className="text-sm font-medium text-gray-700 block">{t('checkOut', selectedLanguage)}</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm min-h-[44px] text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <span className={checkOutDate ? 'text-gray-900' : 'text-gray-400'}>
                            {checkOutDate ? format(checkOutDate, 'yyyy년 MM월 dd일', { locale: ko }) : '날짜 선택'}
                          </span>
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={checkOutDate}
                          onSelect={setCheckOutDate}
                          disabled={(date) => {
                            const today = new Date(new Date().setHours(0, 0, 0, 0));
                            if (date < today) return true;
                            if (checkInDate && date <= checkInDate) return true;
                            return false;
                          }}
                          locale={ko}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* 데스크톱: 날짜 범위 표시 및 검색 버튼 */}
                <div className="hidden lg:flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
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
                      className="mobile-button mobile-ripple bg-[#5c2d91] hover:bg-[#4a2475] disabled:bg-[#5c2d91]/50 text-white w-full sm:min-w-[240px] transition-all duration-200"
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

                {/* 모바일 Step 1: 목적지 + 인원 + 다음 버튼 */}
                {searchStep === 1 && (
                  <div className="lg:hidden flex flex-col gap-3">
                    {/* 목적지 */}
                    <div className="space-y-2 relative">
                      <label className="text-sm font-medium text-gray-700 block">{t('destination', selectedLanguage)}</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 z-10" />
                        <input
                          type="text"
                          placeholder={t('destinationPlaceholder', selectedLanguage)}
                          value={destination}
                          onChange={(e) => handleDestinationChange(e.target.value)}
                          onFocus={() => destination.length > 0 && setShowSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm min-h-[44px] text-gray-900 bg-white"
                          autoComplete="off"
                        />
                        {showSuggestions && searchSuggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-20 mt-1">
                            {searchSuggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm first:rounded-t-md last:rounded-b-md min-h-[44px]"
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

                    {/* 인원 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 block">{t('guests', selectedLanguage)}</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal min-h-[44px] text-sm border-gray-200 rounded-lg hover:border-purple-500">
                            <Users className="mr-2 h-4 w-4" />
                            <span className="truncate">{`${t('rooms', selectedLanguage)} ${guestCounts.rooms}, ${t('adults', selectedLanguage)} ${guestCounts.adults}${guestCounts.children > 0 ? `, ${t('children', selectedLanguage)} ${guestCounts.children}` : ''}`}</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="start">
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

                    {/* 다음 버튼 */}
                    <Button
                      className="mobile-button bg-[#5c2d91] hover:bg-[#4a2475] text-white w-full"
                      onClick={() => setSearchStep(2)}
                    >
                      다음
                    </Button>
                  </div>
                )}

                {/* 모바일 Step 2: 체크인 + 체크아웃 + 이전/검색 버튼 */}
                {searchStep === 2 && (
                  <div className="lg:hidden flex flex-col gap-3">
                    {/* 체크인 날짜 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 block">{t('checkIn', selectedLanguage)}</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm min-h-[44px] text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                          >
                            <span className={checkInDate ? 'text-gray-900' : 'text-gray-400'}>
                              {checkInDate ? format(checkInDate, 'yyyy년 MM월 dd일', { locale: ko }) : '날짜 선택'}
                            </span>
                            <CalendarIcon className="h-4 w-4 text-gray-400" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={checkInDate}
                            onSelect={setCheckInDate}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            locale={ko}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* 체크아웃 날짜 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 block">{t('checkOut', selectedLanguage)}</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm min-h-[44px] text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                          >
                            <span className={checkOutDate ? 'text-gray-900' : 'text-gray-400'}>
                              {checkOutDate ? format(checkOutDate, 'yyyy년 MM월 dd일', { locale: ko }) : '날짜 선택'}
                            </span>
                            <CalendarIcon className="h-4 w-4 text-gray-400" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={checkOutDate}
                            onSelect={setCheckOutDate}
                            disabled={(date) => {
                              const today = new Date(new Date().setHours(0, 0, 0, 0));
                              if (date < today) return true;
                              if (checkInDate && date <= checkInDate) return true;
                              return false;
                            }}
                            locale={ko}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* 이전 + 검색 버튼 */}
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="w-1/3"
                        onClick={() => setSearchStep(1)}
                      >
                        이전
                      </Button>
                      <Button
                        className="mobile-button bg-[#5c2d91] hover:bg-[#4a2475] disabled:bg-[#5c2d91]/50 text-white flex-1"
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. 여행상품 섹션 */}
      <div className="container mx-auto px-4 md:px-[80px] lg:px-[120px] py-16 md:py-24">
        <section>
          <div className="flex items-center justify-between mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 tracking-tight">여행상품</h2>
            <Button variant="ghost" onClick={() => navigate('/category/tour')} className="text-purple-600 hover:text-purple-700">
              전체보기 →
            </Button>
          </div>
          {loading ? (
            <div className="flex gap-4 md:gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse flex-shrink-0" style={{ width: 'calc(50% - 8px)', minHeight: '340px' }}>
                  <div className="bg-gray-200 h-full rounded-2xl"></div>
                </div>
              ))}
            </div>
          ) : tourListings.length > 0 ? (
            <div className="relative">
              {/* 화살표 버튼 - 왼쪽 */}
              <button
                onClick={() => setTourIndex(Math.max(0, tourIndex - 1))}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white shadow-lg rounded-full w-8 h-8 md:w-10 md:h-10 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                disabled={tourIndex === 0}
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>

              {/* 카드 컨테이너 */}
              <div className="overflow-hidden">
                <div
                  className="flex gap-4 md:gap-5 transition-transform duration-300"
                  style={{ transform: `translateX(-${tourIndex * (100 / 4)}%)` }}
                >
                  {tourListings.map((listing) => (
                    <Card
                      key={listing.id}
                      className="flex-shrink-0 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer rounded-2xl"
                      style={{ width: 'calc(50% - 8px)', minHeight: '340px' }}
                      onClick={() => navigate(`/detail/${listing.id}`)}
                    >
                      <div className="relative w-full h-[200px] md:h-[280px] overflow-hidden">
                        <ImageWithFallback
                          src={Array.isArray(listing.images) && listing.images.length > 0 ? listing.images[0] : 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                        <button
                          className="absolute top-3 right-3 p-2 bg-white/80 rounded-full hover:bg-white transition-colors z-10"
                          onClick={(e) => { e.stopPropagation(); }}
                        >
                          <Heart className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">{listing.title}</h3>
                        <p className="text-sm text-gray-500 mb-2 line-clamp-2">{listing.short_description || ''}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-[#5c2d91]">
                            ₩{(listing.price_from || 0).toLocaleString()}
                          </span>
                          {Number(listing.rating_avg || 0) > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm">{Number(listing.rating_avg).toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 화살표 버튼 - 오른쪽 */}
              <button
                onClick={() => setTourIndex(Math.min(tourListings.length - 4, tourIndex + 1))}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white shadow-lg rounded-full w-8 h-8 md:w-10 md:h-10 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                disabled={tourIndex >= tourListings.length - 4}
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">여행상품을 준비 중입니다.</p>
            </div>
          )}

          {/* 데스크톱용 - 4열 그리드 */}
          <style>{`
            @media (min-width: 768px) {
              .tour-card { width: calc(25% - 15px) !important; min-height: 420px !important; }
            }
          `}</style>
        </section>
      </div>

      {/* 2. 숙박 섹션 - 정사각형 320x320 */}
      <div className="container mx-auto px-4 md:px-[80px] lg:px-[120px] py-16 md:py-24">
        <section>
          <div className="flex items-center justify-between mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 tracking-tight">숙박</h2>
            <Button variant="ghost" onClick={() => navigate('/category/stay')} className="text-purple-600 hover:text-purple-700">
              전체보기 →
            </Button>
          </div>
          {loading ? (
            <div className="flex gap-4 md:gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse flex-shrink-0 w-[160px] h-[160px] md:w-[320px] md:h-[320px]">
                  <div className="bg-gray-200 h-full rounded-2xl"></div>
                </div>
              ))}
            </div>
          ) : nearbyHotels.length > 0 ? (
            <div className="relative">
              {/* 화살표 버튼 - 왼쪽 */}
              <button
                onClick={() => setStayIndex(Math.max(0, stayIndex - 1))}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white shadow-lg rounded-full w-8 h-8 md:w-10 md:h-10 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                disabled={stayIndex === 0}
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>

              {/* 카드 컨테이너 - 정사각형 */}
              <div className="overflow-hidden">
                <div
                  className="flex gap-4 md:gap-5 transition-transform duration-300"
                  style={{ transform: `translateX(-${stayIndex * 340}px)` }}
                >
                  {nearbyHotels.map((listing) => (
                    <Card
                      key={listing.id}
                      className="flex-shrink-0 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer rounded-2xl w-[160px] h-[160px] md:w-[320px] md:h-[320px]"
                      onClick={() => navigate(`/detail/${listing.id}`)}
                    >
                      <div className="relative w-full h-[100px] md:h-[200px] overflow-hidden">
                        <ImageWithFallback
                          src={Array.isArray(listing.images) && listing.images.length > 0 ? listing.images[0] : 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=400&fit=crop'}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardContent className="p-3 md:p-4">
                        <h3 className="font-semibold text-gray-800 text-sm md:text-base line-clamp-1">{listing.title}</h3>
                        <p className="text-xs md:text-sm text-gray-500 line-clamp-1">{listing.location}</p>
                        <span className="text-sm md:text-lg font-bold text-[#5c2d91]">
                          ₩{(listing.price_from || 0).toLocaleString()}
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 화살표 버튼 - 오른쪽 */}
              <button
                onClick={() => setStayIndex(Math.min(nearbyHotels.length - 4, stayIndex + 1))}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white shadow-lg rounded-full w-8 h-8 md:w-10 md:h-10 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                disabled={stayIndex >= nearbyHotels.length - 4}
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">숙박 상품을 준비 중입니다.</p>
            </div>
          )}
        </section>
      </div>

      {/* 3. 렌트카 섹션 - 정사각형 320x320 */}
      <div className="container mx-auto px-4 md:px-[80px] lg:px-[120px] py-16 md:py-24">
        <section>
          <div className="flex items-center justify-between mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 tracking-tight">렌트카</h2>
            <Button variant="ghost" onClick={() => navigate('/category/rentcar')} className="text-purple-600 hover:text-purple-700">
              전체보기 →
            </Button>
          </div>
          {loading ? (
            <div className="flex gap-4 md:gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse flex-shrink-0 w-[160px] h-[160px] md:w-[320px] md:h-[320px]">
                  <div className="bg-gray-200 h-full rounded-2xl"></div>
                </div>
              ))}
            </div>
          ) : rentcarListings.length > 0 ? (
            <div className="relative">
              {/* 화살표 버튼 - 왼쪽 */}
              <button
                onClick={() => setRentcarIndex(Math.max(0, rentcarIndex - 1))}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white shadow-lg rounded-full w-8 h-8 md:w-10 md:h-10 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                disabled={rentcarIndex === 0}
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>

              {/* 카드 컨테이너 - 정사각형 */}
              <div className="overflow-hidden">
                <div
                  className="flex gap-4 md:gap-5 transition-transform duration-300"
                  style={{ transform: `translateX(-${rentcarIndex * 340}px)` }}
                >
                  {rentcarListings.map((vendor: any) => (
                    <Card
                      key={vendor.id}
                      className="flex-shrink-0 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer rounded-2xl w-[160px] h-[160px] md:w-[320px] md:h-[320px]"
                      onClick={() => navigate(`/rentcar/vendor/${vendor.id}`)}
                    >
                      <div className="relative w-full h-[100px] md:h-[200px] overflow-hidden bg-gray-100 flex items-center justify-center">
                        {vendor.logo_url ? (
                          <ImageWithFallback
                            src={vendor.logo_url}
                            alt={vendor.business_name}
                            className="w-full h-full object-contain p-4"
                          />
                        ) : (
                          <div className="text-4xl md:text-6xl">🚗</div>
                        )}
                      </div>
                      <CardContent className="p-3 md:p-4">
                        <h3 className="font-semibold text-gray-800 text-sm md:text-base line-clamp-1">{vendor.business_name}</h3>
                        <p className="text-xs md:text-sm text-gray-500 line-clamp-1">{vendor.brand_name || '렌트카 업체'}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 화살표 버튼 - 오른쪽 */}
              <button
                onClick={() => setRentcarIndex(Math.min(rentcarListings.length - 4, rentcarIndex + 1))}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white shadow-lg rounded-full w-8 h-8 md:w-10 md:h-10 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                disabled={rentcarIndex >= rentcarListings.length - 4}
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">렌트카 상품을 준비 중입니다.</p>
            </div>
          )}
        </section>
      </div>

      {/* 4. 띠배너 - Full Width */}
      <section className="w-full">
        <HomeBanner autoSlideInterval={5000} />
      </section>

      {/* 5. 행사/체험 섹션 */}
      <div className="container mx-auto px-4 md:px-[80px] lg:px-[120px] py-16 md:py-24">
        <section>
          <div className="flex items-center justify-between mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 tracking-tight">행사 / 체험</h2>
            <Button variant="ghost" onClick={() => navigate('/category/event')} className="text-purple-600 hover:text-purple-700">
              전체보기 →
            </Button>
          </div>

          {/* 3열 그리드 레이아웃 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* 행사 카드들 */}
            {eventListings.slice(0, 3).map((listing) => (
              <div key={listing.id} className="rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/detail/${listing.id}`)}>
                {/* 배너 이미지 */}
                <div className="h-[180px] md:min-h-[240px] overflow-hidden">
                  <ImageWithFallback
                    src={Array.isArray(listing.images) && listing.images.length > 0 ? listing.images[0] : 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=400&fit=crop'}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* 카드 내용 */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">{listing.title}</h3>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{listing.short_description || ''}</p>

                  {/* 상품 리스트 (썸네일 64x64) */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                        <ImageWithFallback
                          src={Array.isArray(listing.images) && listing.images.length > 1 ? listing.images[1] : listing.images?.[0] || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=100&h=100&fit=crop'}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">{listing.title}</p>
                        <p className="text-sm font-bold text-[#5c2d91]">₩{(listing.price_from || 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-400">♡ 0 리뷰 0</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 6. 인스타 섹션 - 6x3 그리드 */}
      <div className="container mx-auto px-4 md:px-[80px] lg:px-[120px] py-16 md:py-24">
        <section>
          <div className="flex items-center justify-between mb-8 md:mb-12">
            <div className="flex items-center gap-3">
              <Instagram className="h-6 w-6 text-pink-500" />
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 tracking-tight">Instagram</h2>
            </div>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700">
              @travleap →
            </a>
          </div>

          {/* 6x3 그리드 (모바일: 3x6) */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4">
            {instagramImages.slice(0, 18).map((img) => (
              <div key={img.id} className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                <ImageWithFallback
                  src={img.image_url}
                  alt="Instagram"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 인기 상품 보기 (팝업 카테고리) - 주석 처리 */}
      {/* <div className="container mx-auto px-4 py-12 md:py-16">
        <section>
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎪</span>
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-800">인기 상품 보기</h2>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate('/category/popup')}
              className="text-purple-600 hover:text-purple-700"
            >
              전체보기 →
            </Button>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 h-64 md:h-80 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : featuredListings.length > 0 ? (
            <>
              {/* 모바일: 좌우 스크롤 *}
              <div className="lg:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
                <div className="flex gap-4" style={{ width: 'max-content' }}>
                  {featuredListings.slice(0, 8).map((listing) => (
                    <Card
                      key={listing.id}
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer flex flex-col flex-shrink-0 w-[280px] min-h-[360px]"
                      onClick={() => navigate(`/detail/${listing.id}`)}
                    >
                      {/* 이미지 *}
                      <div className="relative w-full h-48 max-h-48 overflow-hidden flex-shrink-0">
                        <ImageWithFallback
                          src={Array.isArray(listing.images) && listing.images.length > 0 ? listing.images[0] : 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'}
                          alt={listing.title}
                          className="w-full h-48 object-cover"
                        />
                        <button
                          className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-white transition-colors z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            // 즐겨찾기 기능 (추후 구현)
                          }}
                        >
                          <Heart className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          className="absolute top-2 left-2 p-1 bg-white/80 rounded-full hover:bg-white transition-colors z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            // 공유 기능
                            const shareUrl = `${window.location.origin}/detail/${listing.id}`;
                            if (navigator.share) {
                              navigator.share({ title: listing.title, url: shareUrl });
                            } else {
                              navigator.clipboard.writeText(shareUrl);
                            }
                          }}
                        >
                          <Share2 className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>

                      {/* 정보 *}
                      <CardContent className="p-6 pt-3 flex flex-col flex-1 justify-between bg-white min-h-[180px]">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-start gap-2">
                            <h3 className="font-semibold text-base flex-1 line-clamp-2">{listing.title}</h3>
                            {listing.partner?.is_verified && (
                              <Badge variant="outline" className="text-xs flex-shrink-0 bg-blue-500 text-white">
                                인증
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-gray-600 line-clamp-3">{listing.short_description || ''}</p>
                        </div>

                        <div className="flex items-center pt-4 mt-4 border-t">
                          <div className="flex items-center gap-1 flex-1">
                            {Number(listing.rating_avg || 0) > 0 && (
                              <>
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs">{Number(listing.rating_avg || 0).toFixed(1)}</span>
                                <span className="text-xs text-gray-500">({listing.rating_count || 0})</span>
                              </>
                            )}
                          </div>
                          <div className="text-base font-bold text-[#ff6a3d]">
                            {formatPrice(listing.price_from || 0, selectedCurrency)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 데스크톱: 그리드 레이아웃 *}
              <div className="hidden lg:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {featuredListings.slice(0, 8).map((listing) => (
                  <Card
                    key={listing.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer flex flex-col min-h-[360px]"
                    onClick={() => navigate(`/detail/${listing.id}`)}
                  >
                    {/* 이미지 *}
                    <div className="relative w-full h-48 max-h-48 overflow-hidden flex-shrink-0">
                      <ImageWithFallback
                        src={Array.isArray(listing.images) && listing.images.length > 0 ? listing.images[0] : 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'}
                        alt={listing.title}
                        className="w-full h-48 object-cover"
                      />
                      <button
                        className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-white transition-colors z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          // 즐겨찾기 기능 (추후 구현)
                        }}
                      >
                        <Heart className="h-4 w-4 text-gray-600" />
                      </button>
                      <button
                        className="absolute top-2 left-2 p-1 bg-white/80 rounded-full hover:bg-white transition-colors z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          // 공유 기능
                          const shareUrl = `${window.location.origin}/detail/${listing.id}`;
                          if (navigator.share) {
                            navigator.share({ title: listing.title, url: shareUrl });
                          } else {
                            navigator.clipboard.writeText(shareUrl);
                          }
                        }}
                      >
                        <Share2 className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>

                    {/* 정보 *}
                    <CardContent className="p-6 pt-3 flex flex-col flex-1 justify-between bg-white min-h-[180px]">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-start gap-2">
                          <h3 className="font-semibold text-base flex-1 line-clamp-2">{listing.title}</h3>
                          {listing.partner?.is_verified && (
                            <Badge variant="outline" className="text-xs flex-shrink-0 bg-blue-500 text-white">
                              인증
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-gray-600 line-clamp-3">{listing.short_description || listing.description_md || ''}</p>
                      </div>

                      <div className="flex items-center pt-4 mt-4 border-t">
                        <div className="flex items-center gap-1 flex-1">
                          {Number(listing.rating_avg || 0) > 0 && (
                            <>
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs">{Number(listing.rating_avg || 0).toFixed(1)}</span>
                              <span className="text-xs text-gray-500">({listing.rating_count || 0})</span>
                            </>
                          )}
                        </div>
                        <div className="text-base font-bold text-[#ff6a3d]">
                          {formatPrice(listing.price_from || 0, selectedCurrency)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🎪</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">인기 상품 준비 중</h3>
                <p className="text-gray-600 mb-4">곧 다양한 팝업 스토어 상품을 만나보실 수 있습니다.</p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/category/popup')}
                  className="text-sm"
                >
                  팝업 카테고리 보기
                </Button>
              </div>
            </div>
          )}
        </section>
      </div> */}
    </div>
  );
}

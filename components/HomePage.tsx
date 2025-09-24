import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Star, MapPin, Clock, Gift, Sparkles, Heart, Zap } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Users } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { formatPrice, t } from '../utils/translations';
import { api, type TravelItem } from '../utils/api';
import type { Category } from '../types/database';

interface HomePageProps {
  selectedCurrency?: string;
  selectedLanguage?: string;
}

export function HomePage({ selectedCurrency = 'KRW', selectedLanguage = 'ko' }: HomePageProps) {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');
  const [checkInDate, setCheckInDate] = useState<Date | undefined>();
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>();
  const [guestCounts, setGuestCounts] = useState({
    rooms: 1,
    adults: 1,
    children: 0
  });

  // 새로운 상태 추가
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredListings, setFeaturedListings] = useState<TravelItem[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // 샘플 카테고리 데이터
        const sampleCategories: Category[] = [
          { id: 1, slug: 'tour', name_ko: '투어', icon: '🎯', sort_order: 1, is_active: true },
          { id: 2, slug: 'stay', name_ko: '숙박', icon: '🏨', sort_order: 2, is_active: true },
          { id: 3, slug: 'food', name_ko: '음식', icon: '🍽️', sort_order: 3, is_active: true },
          { id: 4, slug: 'attraction', name_ko: '관광지', icon: '🏛️', sort_order: 4, is_active: true },
          { id: 5, slug: 'experience', name_ko: '체험', icon: '🎨', sort_order: 5, is_active: true },
          { id: 6, slug: 'rental', name_ko: '렌트카', icon: '🚗', sort_order: 6, is_active: true }
        ];

        // 실제 데이터는 database.ts에서 가져옴


        // 데이터베이스에서 실제 데이터 가져오기
        try {
          const [categoriesResult, listingsResult, reviewsResult] = await Promise.all([
            api.getCategories(),
            api.getListings({ sortBy: 'popular', limit: 8 }),
            api.getRecentReviews(4)
          ]);

          setCategories(categoriesResult.length > 0 ? categoriesResult : sampleCategories);
          setFeaturedListings(listingsResult.data || []);
          setRecentReviews(reviewsResult || []);
        } catch (apiError) {
          // API failed, using fallback data
          setCategories(sampleCategories);
          setFeaturedListings([]);
          setRecentReviews([]);
        }
      } catch (error) {
        console.error('Failed to load homepage data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 날짜 포맷팅 함수
  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  };

  const serviceCards = [
    {
      title: "플레이스 굿즈",
      description: "각 여행지에 해당되는 특이한 굿즈,상품판매",
      icon: <Gift className="h-8 w-8" />,
      color: "bg-blue-50",
      iconColor: "text-blue-600"
    },
    {
      title: "제휴업체와의 할인이벤트",
      description: "약 300여개와 제휴되어 어딜가든지 최대 20%할인",
      icon: <Sparkles className="h-8 w-8" />,
      color: "bg-purple-50",
      iconColor: "text-purple-600"
    },
    {
      title: "AI 맞춤 추천",
      description: "개인의 취향에 맞는 최적의 여행 코스 추천",
      icon: <Star className="h-8 w-8" />,
      color: "bg-yellow-50",
      iconColor: "text-yellow-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div
        className="relative h-[48vh] bg-cover bg-center bg-no-repeat overflow-hidden"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1693098436985-4a7dece474b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cm9waWNhbCUyMHBhbG0lMjB0cmVlcyUyMGJlYWNoJTIwdmFjYXRpb258ZW58MXx8fHwxNzU3NTcwNjQzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')`
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col items-center justify-center">
          {/* Main Title */}
          <div className="text-center text-white space-y-3 max-w-4xl mb-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-light tracking-wide">
              My Travel Awesomeplan
            </h1>
            <p className="text-sm md:text-base text-white/90 font-light">
              어떤곳을 내게만 여행상품을 찾아볼 느낌이
            </p>
          </div>

          {/* Search Form */}
          <div className="w-full max-w-6xl">
            <div className="bg-white rounded-lg shadow-2xl p-6">
              <div className="flex flex-col gap-4">
                {/* 첫 번째 행: 검색 필드들 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 목적지 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 block">{t('destination', selectedLanguage)}</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder={t('destinationPlaceholder', selectedLanguage)}
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  {/* 체크인 날짜 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 block">{t('checkIn', selectedLanguage)}</label>
                    <input
                      type="date"
                      value={checkInDate ? checkInDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => setCheckInDate(e.target.value ? new Date(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                  </div>

                  {/* 체크아웃 날짜 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 block">{t('checkOut', selectedLanguage)}</label>
                    <input
                      type="date"
                      value={checkOutDate ? checkOutDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => setCheckOutDate(e.target.value ? new Date(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                  </div>

                  {/* 게스트 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 block">{t('guests', selectedLanguage)}</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Users className="mr-2 h-4 w-4" />
                          {`${t('rooms', selectedLanguage)} ${guestCounts.rooms}, ${t('adults', selectedLanguage)} ${guestCounts.adults}${guestCounts.children > 0 ? `, ${t('children', selectedLanguage)} ${guestCounts.children}` : ''}`}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
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
                <div className="flex items-center justify-between">
                  {/* 날짜 범위 표시 */}
                  <div className="flex-1">
                    {checkInDate && checkOutDate && checkOutDate > checkInDate && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">
                          {Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))}박
                          {Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)) + 1}일
                        </span>
                        <span className="ml-2 text-gray-500">
                          {formatDate(checkInDate)} - {formatDate(checkOutDate)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 검색 버튼 */}
                  <div className="flex-shrink-0">
                    <Button
                      className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-8 rounded-md text-sm font-medium"
                      onClick={() => {
                        const searchParams = new URLSearchParams();
                        if (destination) searchParams.set('q', destination);
                        if (checkInDate) searchParams.set('checkin', checkInDate.toISOString().split('T')[0]);
                        if (checkOutDate) searchParams.set('checkout', checkOutDate.toISOString().split('T')[0]);
                        searchParams.set('rooms', guestCounts.rooms.toString());
                        searchParams.set('adults', guestCounts.adults.toString());
                        searchParams.set('children', guestCounts.children.toString());

                        navigate(`/search?${searchParams.toString()}`);
                      }}
                    >
                      {t('search', selectedLanguage)}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="container mx-auto px-4 py-16 space-y-16">
        {/* Service Cards */}
        <section className="-mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {serviceCards.map((card, index) => (
              <div key={index} className="text-center">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">{card.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 인기 상품 섹션 */}
        <section>
          <div className="mb-8">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-semibold text-gray-800 mb-6">지금 신안은?</h2>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-200 h-[500px] rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {featuredListings.slice(0, 4).map((listing) => (
                    <div key={listing.id}>
                      <Card
                        className="overflow-hidden shadow-lg h-[500px] flex flex-col hover:shadow-xl transition-shadow duration-300 cursor-pointer"
                        onClick={() => navigate(`/detail/${listing.id}`)}
                      >
                        <div className="relative flex-shrink-0">
                          <ImageWithFallback
                            src={listing.images?.[0] || 'https://via.placeholder.com/400x300'}
                            alt={listing.title}
                            className="w-full h-56 object-cover"
                          />
                          <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                            {listing.category}
                          </div>
                          <div className="absolute top-2 right-2">
                            <Heart className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <CardContent className="p-4 flex-1 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex items-start text-gray-600 text-sm mb-2">
                              <MapPin className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-1">{listing.location || '신안군'}</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">{listing.title}</h3>

                            <div className="flex items-center">
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= Math.floor(listing.rating_avg)
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'fill-gray-300 text-gray-300'
                                    }`}
                                  />
                                ))}
                                <span className="ml-2 text-sm text-gray-600">
                                  {listing.rating_count} 리뷰
                                </span>
                              </div>
                            </div>

                            <div className="mt-4">
                              <div className="text-lg font-semibold text-gray-800">
                                {listing.price_from ? (
                                  <>
                                    <span className="text-lg">
                                      {formatPrice(listing.price_from, selectedCurrency)}
                                    </span>
                                    <span className="text-sm text-gray-600 ml-1">/1인</span>
                                  </>
                                ) : (
                                  <span className="text-sm text-gray-600">가격 문의</span>
                                )}
                              </div>
                            </div>

                            {listing.duration && (
                              <div className="flex items-center text-gray-600 text-sm">
                                <Clock className="h-4 w-4 mr-1" />
                                <span>{listing.duration}</span>
                              </div>
                            )}

                            {listing.partner && (
                              <div className="flex items-center text-gray-600 text-sm">
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {listing.partner.business_name}
                                  {listing.partner.is_verified && (
                                    <span className="ml-1 text-blue-500">✓</span>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 액티비티 */}
        <section>
          <h2 className="text-3xl font-semibold text-gray-800 mb-8">액티비티</h2>

          {loading ? (
            <div className="flex gap-4 h-96">
              <div className="w-1/2 animate-pulse">
                <div className="bg-gray-200 h-full rounded-lg"></div>
              </div>
              <div className="w-1/2 flex flex-col gap-4">
                <div className="h-1/2 animate-pulse">
                  <div className="bg-gray-200 h-full rounded-lg"></div>
                </div>
                <div className="h-1/2 animate-pulse">
                  <div className="bg-gray-200 h-full rounded-lg"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 h-96">
              {/* 왼쪽 큰 이미지 */}
              <div className="w-1/2">
                <div
                  className="cursor-pointer hover:scale-105 transition-transform duration-200 h-full"
                  onClick={() => navigate('/category/stay')}
                >
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500&h=400&fit=crop"
                    alt="신안 민박"
                    className="w-full h-full object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow"
                  />
                </div>
              </div>

              {/* 오른쪽 작은 이미지들 */}
              <div className="w-1/2 flex flex-col gap-4">
                <div className="h-1/2">
                  <div
                    className="cursor-pointer hover:scale-105 transition-transform duration-200 h-full"
                    onClick={() => navigate('/category/experience')}
                  >
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=300&h=200&fit=crop"
                      alt="갯벌체험"
                      className="w-full h-full object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow"
                    />
                  </div>
                </div>
                <div className="h-1/2">
                  <div
                    className="cursor-pointer hover:scale-105 transition-transform duration-200 h-full"
                    onClick={() => navigate('/category/tour')}
                  >
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1464822759880-4601b726be04?w=300&h=200&fit=crop"
                      alt="홍도 유람선"
                      className="w-full h-full object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 주변 숙소 */}
        <section>
          <h2 className="text-3xl font-semibold text-gray-800 mb-8">주변 숙소 보기</h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 h-80 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredListings.filter(item => item.category === 'stay').slice(0, 4).map((item) => (
                <Card
                  key={item.id}
                  className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
                  onClick={() => navigate(`/detail/${item.id}`)}
                >
                  <div className="relative">
                    <ImageWithFallback
                      src={item.images?.[0] || 'https://via.placeholder.com/400x300'}
                      alt={item.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-gray-800 px-2 py-1 rounded text-xs font-medium">
                      {item.category}
                    </div>
                    <div className="absolute top-2 right-2">
                      <Heart className="h-5 w-5 text-white drop-shadow-sm" />
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center text-gray-600 text-sm">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span>{item.location || '신안군'}</span>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">{item.title}</h3>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= Math.floor(item.rating_avg)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'fill-gray-300 text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm text-gray-600">{item.rating_count} 리뷰</span>
                          </div>
                        </div>
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
          )}

          {/* 더 보기 버튼 */}
          <div className="text-center mt-8">
            <Button
              variant="outline"
              className="px-8 py-2"
              onClick={() => navigate('/search')}
            >
              더 많은 상품 보기
            </Button>
          </div>
        </section>

        {/* 사용자 리뷰 섹션 */}
        <section className="mt-16">
          <h2 className="text-3xl font-semibold text-gray-800 mb-8">사용자 리뷰</h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 h-64 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* DB에서 가져온 실제 리뷰 데이터 */}
              {recentReviews.slice(0, 4).map((review) => (
                <Card key={review.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* 사용자 정보 */}
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden">
                          <ImageWithFallback
                            src={review.images?.[0] || review.profile_image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'}
                            alt={review.user_name || '사용자'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800">{review.user_name || '익명'}</h4>
                          <p className="text-sm text-gray-500">
                            {review.created_at ? new Date(review.created_at).toLocaleDateString('ko-KR') : '2024.03.15'}
                          </p>
                        </div>
                      </div>

                      {/* 별점 */}
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < (review.rating || 5)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-sm font-medium text-gray-700">{review.rating || 5}.0</span>
                      </div>

                      {/* 상품명 */}
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-sm font-medium text-gray-700">{review.listing_title || review.product_name || '신안 여행 상품'}</p>
                      </div>

                      {/* 리뷰 내용 */}
                      <p className="text-gray-600 text-sm leading-relaxed line-clamp-4">
                        {review.review_text || '정말 좋은 여행이었습니다. 추천드려요!'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 더 많은 리뷰 보기 버튼 */}
          <div className="text-center mt-8">
            <Button
              variant="outline"
              className="px-8 py-2"
              onClick={() => navigate('/reviews')}
            >
              더 많은 리뷰 보기
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
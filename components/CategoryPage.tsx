import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  Star,
  MapPin,
  Clock,
  Heart,
  Share2,
  Filter,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { formatPrice } from '../utils/translations';
import { api, type TravelItem } from '../utils/api';
import { toast } from 'sonner';
import { HotelCard } from './cards/HotelCard';
import { RentcarVendorCard } from './cards/RentcarVendorCard';
import React from 'react';

interface CategoryPageProps {
  selectedCurrency?: string;
}

interface HotelData {
  partner_id: number;
  business_name: string;
  room_count: number;
  min_price: number;
  max_price: number;
  images: string[];
  locations: string;
  avg_rating: string | null;
  total_reviews: number;
  is_verified: boolean;
  tier: string;
}

interface VendorData {
  vendor_id: number;
  vendor_code: string;
  vendor_name: string;
  vehicle_count: number;
  min_price: number;
  max_price: number;
  images: string[];
  vehicle_classes: string;
}

export function CategoryPage({ selectedCurrency = 'KRW' }: CategoryPageProps) {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [listings, setListings] = useState<TravelItem[]>([]);
  const [filteredListings, setFilteredListings] = useState<TravelItem[]>([]);
  const [hotels, setHotels] = useState<HotelData[]>([]);
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareList, setCompareList] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  // 검색 바 state
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [showCalendar, setShowCalendar] = useState(false);
  const [timeSlot, setTimeSlot] = useState('all');

  // 필터 state
  const [filters, setFilters] = useState({
    category: 'all',
    priceRange: '',
    rating: '',
    sortBy: 'recommended'
  });

  // 페이지네이션 state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);

  const categoryNames: { [key: string]: string } = {
    tour: '여행상품',
    accommodation: '숙박',
    stay: '숙박',
    rentcar: '렌터카',
    food: '맛집',
    attraction: '관광지',
    tourist: '관광지',
    package: '패키지',
    event: '행사',
    popup: '팝업',
    experience: '체험'
  };

  // 날짜 포맷 함수
  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\./g, '/').replace(/\s/g, '');
  };

  // 데이터 fetch
  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true);
        const mappedCategory = category === 'accommodation' ? 'stay' : category;

        // 숙박 카테고리: 호텔 목록 API 호출
        if (mappedCategory === 'stay') {
          const response = await fetch('/api/accommodations');
          const result = await response.json();

          if (result.success && result.data) {
            setHotels(result.data);
          } else {
            setHotels([]);
            toast.error('호텔 목록을 불러올 수 없습니다.');
          }
          setLoading(false);
          return;
        }

        // 렌트카 카테고리: 업체 목록 API 호출
        if (mappedCategory === 'rentcar') {
          const response = await fetch('/api/rentcars');
          const result = await response.json();

          if (result.success && result.data) {
            setVendors(result.data);
          } else {
            setVendors([]);
            toast.error('렌트카 업체 목록을 불러올 수 없습니다.');
          }
          setLoading(false);
          return;
        }

        // 기타 카테고리: 기존 방식
        const response = await api.getListings({
          category: mappedCategory || '',
          page: 1,
          limit: 100,
          sortBy: filters.sortBy === 'recommended' ? 'popular' : filters.sortBy as any
        });

        if (response.success && response.data) {
          const newListings = Array.isArray(response.data) ? response.data : [];
          setListings(newListings);
          setFilteredListings(newListings);
        } else {
          setListings([]);
          setFilteredListings([]);
        }
      } catch (error) {
        console.error('Error fetching listings:', error);
        setListings([]);
        setFilteredListings([]);
        setHotels([]);
        setVendors([]);
        toast.error('상품을 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (category) {
      fetchListings();
    }
  }, [category, filters.sortBy]);

  // 검색 핸들러
  const handleSearch = () => {
    let filtered = listings;

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description_md?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredListings(filtered);
    setCurrentPage(1);
  };

  // 필터링 및 정렬
  useEffect(() => {
    let filtered = [...listings];

    // 검색어 필터
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 가격 필터
    if (filters.priceRange) {
      filtered = filtered.filter(item => {
        const price = item.price_from || 0;
        if (filters.priceRange === '200000+') return price >= 200000;
        if (filters.priceRange === '100000+') return price >= 100000;

        const [min, max] = filters.priceRange.split('-').map(Number);
        return price >= min && price <= max;
      });
    }

    // 차량 종류 필터 (렌트카 전용)
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(item =>
        item.category === filters.category || item.title.includes(filters.category)
      );
    }

    // 평점 필터 (숙박 전용)
    if (filters.rating) {
      const minRating = parseFloat(filters.rating);
      filtered = filtered.filter(item => (item.rating_avg || 0) >= minRating);
    }

    // 정렬 적용
    if (filters.sortBy === 'recommended') {
      filtered = filtered.sort((a, b) => {
        const aVerified = a.partner?.is_verified ? 1 : 0;
        const bVerified = b.partner?.is_verified ? 1 : 0;
        if (aVerified !== bVerified) return bVerified - aVerified;
        return (b.rating_avg || 0) - (a.rating_avg || 0);
      });
    } else if (filters.sortBy === 'latest') {
      filtered = filtered.sort((a, b) => b.id - a.id);
    }

    setFilteredListings(filtered);
    setCurrentPage(1);
  }, [searchQuery, filters, listings]);

  // 페이지네이션
  const mappedCategory = category === 'accommodation' ? 'stay' : category;
  const isHotelView = mappedCategory === 'stay';
  const isVendorView = mappedCategory === 'rentcar';

  const displayItems = isHotelView ? hotels : isVendorView ? vendors : filteredListings;
  const totalPages = Math.ceil(displayItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentListings = filteredListings.slice(startIndex, endIndex);
  const currentHotels = hotels.slice(startIndex, endIndex);
  const currentVendors = vendors.slice(startIndex, endIndex);

  // 페이지 번호 생성
  const getVisiblePageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots.filter((page, index, array) => array.indexOf(page) === index);
  };

  // 즐겨찾기 토글
  const toggleFavorite = useCallback((itemId: number) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(itemId)) {
        newFavorites.delete(itemId);
        toast.success('즐겨찾기에서 제거되었습니다');
      } else {
        newFavorites.add(itemId);
        toast.success('즐겨찾기에 추가되었습니다');
      }
      return newFavorites;
    });
  }, []);

  // 비교 리스트 토글
  const toggleCompare = useCallback((itemId: number) => {
    setCompareList(prev => {
      const newList = [...prev];
      const index = newList.indexOf(itemId);
      if (index > -1) {
        newList.splice(index, 1);
        toast.success('비교 목록에서 제거되었습니다');
      } else {
        if (newList.length >= 3) {
          toast.error('최대 3개까지 비교할 수 있습니다');
          return prev;
        }
        newList.push(itemId);
        toast.success('비교 목록에 추가되었습니다');
      }
      return newList;
    });
  }, []);

  // 공유
  const handleShare = useCallback(async (item: TravelItem) => {
    try {
      await navigator.share({
        title: item.title,
        text: item.short_description || item.description_md || '',
        url: `${window.location.origin}/detail/${item.id}`
      });
    } catch (error) {
      navigator.clipboard.writeText(`${window.location.origin}/detail/${item.id}`);
      toast.success('링크가 클립보드에 복사되었습니다');
    }
  }, []);

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-4">카테고리를 선택해주세요</h1>
          <Button onClick={() => navigate('/')}>홈으로 이동</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 배너 헤더 */}
      <div
        className="relative h-[200px] bg-cover bg-center"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url("https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&h=300&fit=crop")'
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-4xl font-bold text-white">
            {categoryNames[category] || '전체 상품'}
          </h1>
        </div>
      </div>

      {/* 검색 바 - 배경 이미지 위에 반쯤 걸쳐진 박스 */}
      <div className="relative -mt-16 mb-6">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex gap-4 items-center">
              {/* 목적지 */}
              <div className="flex-1">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="어디에 가시나요?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearch();
                    }}
                    className="pl-10 h-12 text-sm"
                  />
                  <div className="absolute left-3 -top-2 bg-white px-1 text-xs text-gray-600">
                    목적지
                  </div>
                </div>
              </div>

              {/* 구분선 */}
              <div className="h-12 w-px bg-gray-300"></div>

              {/* From - To 날짜 (렌트카일 경우 픽업/반납으로 표시) */}
              <div className="flex-1">
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <div className="relative cursor-pointer">
                      <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <Input
                        type="text"
                        readOnly
                        placeholder="dd/mm/yyyy - dd/mm/yyyy"
                        value={fromDate && toDate ? `${formatDate(fromDate)} - ${formatDate(toDate)}` : ''}
                        className="pl-10 h-12 cursor-pointer text-sm"
                      />
                      <div className="absolute left-3 -top-2 bg-white px-1 text-xs text-gray-600">
                        {category === 'rentcar' ? '픽업 - 반납' : 'From - To'}
                      </div>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-4">
                      <div className="flex gap-4 mb-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            {category === 'rentcar' ? '픽업 날짜' : '시작일'}
                          </label>
                          <Calendar
                            mode="single"
                            selected={fromDate}
                            onSelect={setFromDate}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            {category === 'rentcar' ? '반납 날짜' : '종료일'}
                          </label>
                          <Calendar
                            mode="single"
                            selected={toDate}
                            onSelect={setToDate}
                            disabled={(date) => fromDate ? date < fromDate : false}
                          />
                        </div>
                      </div>
                      <Button
                        onClick={() => setShowCalendar(false)}
                        className="w-full bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                      >
                        확인
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* 구분선 */}
              <div className="h-12 w-px bg-gray-300"></div>

              {/* 시간 (렌트카일 경우 숨김) */}
              {category !== 'rentcar' && (
                <>
                  <div className="w-[180px]">
                    <div className="relative">
                      <Select value={timeSlot} onValueChange={setTimeSlot}>
                        <SelectTrigger className="h-12 text-sm">
                          <SelectValue placeholder="선택안함" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체</SelectItem>
                          <SelectItem value="morning">오전 (09:00-12:00)</SelectItem>
                          <SelectItem value="afternoon">오후 (12:00-18:00)</SelectItem>
                          <SelectItem value="evening">저녁 (18:00-22:00)</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="absolute left-3 -top-2 bg-white px-1 text-xs text-gray-600">
                        시간
                      </div>
                    </div>
                  </div>
                  {/* 구분선 */}
                  <div className="h-12 w-px bg-gray-300"></div>
                </>
              )}

              {/* 검색 버튼 */}
              <Button onClick={handleSearch} className="bg-[#8B5FBF] hover:bg-[#7A4FB5] text-white px-12 h-12">
                검색
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* 필터 바 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="font-medium">필터:</span>
            </div>

            {/* 렌트카 전용 필터 */}
            {category === 'rentcar' && (
              <>
                <Select value={filters.priceRange || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value === 'all' ? '' : value }))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="가격대" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="0-50000">5만원 이하</SelectItem>
                    <SelectItem value="50000-100000">5-10만원</SelectItem>
                    <SelectItem value="100000-200000">10-20만원</SelectItem>
                    <SelectItem value="200000+">20만원 이상</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="차량 종류" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="경차">경차</SelectItem>
                    <SelectItem value="소형">소형</SelectItem>
                    <SelectItem value="중형">중형</SelectItem>
                    <SelectItem value="대형">대형</SelectItem>
                    <SelectItem value="SUV">SUV</SelectItem>
                    <SelectItem value="승합">승합</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}

            {/* 숙박 전용 필터 */}
            {(category === 'accommodation' || category === 'stay') && (
              <>
                <Select value={filters.priceRange || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value === 'all' ? '' : value }))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="가격대" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="0-50000">5만원 이하</SelectItem>
                    <SelectItem value="50000-100000">5-10만원</SelectItem>
                    <SelectItem value="100000-200000">10-20만원</SelectItem>
                    <SelectItem value="200000+">20만원 이상</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.rating || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, rating: value === 'all' ? '' : value }))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="평점" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="4">⭐ 4점 이상</SelectItem>
                    <SelectItem value="4.5">⭐ 4.5점 이상</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}

            {/* 기타 카테고리 필터 */}
            {category !== 'rentcar' && category !== 'accommodation' && category !== 'stay' && (
              <Select value={filters.priceRange || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value === 'all' ? '' : value }))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="가격대" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="0-30000">3만원 이하</SelectItem>
                  <SelectItem value="30000-50000">3-5만원</SelectItem>
                  <SelectItem value="50000-100000">5-10만원</SelectItem>
                  <SelectItem value="100000+">10만원 이상</SelectItem>
                </SelectContent>
              </Select>
            )}

            <div className="ml-auto text-sm text-gray-600">
              <span className="font-medium">{displayItems.length}</span>개 상품 발견
            </div>
          </div>
        </div>

        {/* 결과 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            총 {displayItems.length}개 상품 ({currentPage}/{totalPages} 페이지)
          </h2>
          <Select
            value={filters.sortBy}
            onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="정렬" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recommended">추천순</SelectItem>
              <SelectItem value="latest">최신순</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 상품 리스트 - 그리드 형태 (4열) */}
        {loading ? (
          <div className="grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse overflow-hidden">
                <div className="w-full h-48 bg-gray-200"></div>
                <CardContent className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isHotelView && currentHotels.length > 0 ? (
          <div className="grid grid-cols-4 gap-4">
            {currentHotels.map((hotel) => (
              <HotelCard key={hotel.partner_id} hotel={hotel} />
            ))}
          </div>
        ) : isVendorView && currentVendors.length > 0 ? (
          <div className="grid grid-cols-4 gap-4">
            {currentVendors.map((vendor) => (
              <RentcarVendorCard key={vendor.vendor_id} vendor={vendor} />
            ))}
          </div>
        ) : currentListings.length > 0 ? (
          <div className="grid grid-cols-4 gap-4">
            {currentListings.map((item) => {
              return (
                <Card
                  key={item.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-[450px] flex flex-col"
                  onClick={() => navigate(`/detail/${item.id}`)}
                >
                  <div className="flex flex-col h-full">
                    {/* 이미지 */}
                    <div className="relative w-full h-32 flex-shrink-0">
                      <ImageWithFallback
                        src={Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <button
                        className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-white transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item.id);
                        }}
                      >
                        <Heart className={`h-4 w-4 ${favorites.has(item.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                      </button>
                      <button
                        className="absolute top-2 left-2 p-1 bg-white/80 rounded-full hover:bg-white transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(item);
                        }}
                      >
                        <Share2 className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>

                    {/* 정보 */}
                    <CardContent className="p-4 flex flex-col flex-1 justify-between">
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <h3 className="font-semibold text-base flex-1 line-clamp-2 min-h-[2.5rem]">{item.title}</h3>
                          {item.partner?.is_verified && (
                            <Badge variant="outline" className="text-xs flex-shrink-0 bg-blue-500 text-white">
                              인증
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-gray-500 flex-shrink-0" />
                          <span className="text-xs text-gray-600 line-clamp-1">{item.location || '위치 정보 없음'}</span>
                        </div>

                        <p className="text-xs text-gray-600 line-clamp-2">{item.short_description || item.description_md || ''}</p>
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-2">
                        {Number(item.rating_avg || 0) > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs">{Number(item.rating_avg || 0).toFixed(1)}</span>
                            <span className="text-xs text-gray-500">({item.rating_count || 0})</span>
                          </div>
                        )}
                        <div className="text-base font-bold text-[#ff6a3d]">
                          {formatPrice(item.price_from || 0, selectedCurrency)}
                        </div>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                조건에 맞는 상품이 없습니다
              </h3>
              <p className="text-gray-600 mb-6">
                다른 검색어나 필터 조건으로 다시 검색해보세요
              </p>
              <Button onClick={() => {
                setSearchQuery('');
                setFromDate(undefined);
                setToDate(undefined);
                setTimeSlot('all');
              }}>
                검색 초기화
              </Button>
            </div>
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && !loading && displayItems.length > 0 && (
          <div className="flex items-center justify-center mt-8 space-x-2">
            {/* 이전 페이지 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              이전
            </Button>

            {/* 페이지 번호들 */}
            <div className="flex items-center space-x-1">
              {getVisiblePageNumbers().map((pageNum, index) => (
                <React.Fragment key={index}>
                  {pageNum === '...' ? (
                    <span className="px-2 py-1 text-gray-500">...</span>
                  ) : (
                    <Button
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum as number)}
                      className={`min-w-[40px] ${
                        currentPage === pageNum
                          ? "bg-[#8B5FBF] hover:bg-[#7A4FB5] text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {pageNum}
                    </Button>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* 다음 페이지 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center"
            >
              다음
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* 페이지 정보 */}
        {displayItems.length > 0 && !loading && (
          <div className="text-center mt-4 text-sm text-gray-600">
            {startIndex + 1}-{Math.min(endIndex, displayItems.length)} / {displayItems.length}개 상품 표시
          </div>
        )}
      </div>

    </div>
  );
}

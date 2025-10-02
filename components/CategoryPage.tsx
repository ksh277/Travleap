import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Slider } from './ui/slider';
import {
  Star,
  MapPin,
  LayoutGrid,
  List,
  Clock,
  Heart,
  Share2,
  Filter,
  Search,
  X,
  ChevronDown,
  ArrowUpDown,
  Loader2,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  ArrowLeftRight
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { formatPrice } from '../utils/translations';
import { api, type TravelItem } from '../utils/api';
import { toast } from 'sonner';

interface CategoryPageProps {
  selectedCurrency?: string;
}

interface FilterState {
  search: string;
  priceRange: [number, number];
  ratings: number[];
  verifiedOnly: boolean;
  sponsorOnly: boolean;
  tags: string[];
  availability: string;
  location: string[];
}

interface SortOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}


export function CategoryPage({ selectedCurrency = 'KRW' }: CategoryPageProps) {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<TravelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('recommended');
  const [showFilters, setShowFilters] = useState(false);
  const [compareList, setArrowLeftRightList] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Enhanced filter state
  const [filters, setFilters] = useState<FilterState>({
    search: searchParams.get('q') || '',
    priceRange: [0, 500000],
    ratings: [],
    verifiedOnly: false,
    sponsorOnly: false,
    tags: [],
    availability: 'all',
    location: []
  });

  const categoryNames: { [key: string]: string } = {
    tour: '여행상품',
    accommodation: '숙박',
    stay: '숙박',
    rentcar: '렌트카',
    food: '음식',
    attraction: '관광지',
    tourist: '관광지',
    package: '패키지',
    event: '행사',
    popup: '팝업',
    experience: '체험'
  };

  const sortOptions: SortOption[] = useMemo(() => [
    { value: 'recommended', label: '추천순', icon: <Star className="h-4 w-4" /> },
    { value: 'price-low', label: '가격 낮은순', icon: <ArrowUpDown className="h-4 w-4" /> },
    { value: 'price-high', label: '가격 높은순', icon: <ArrowUpDown className="h-4 w-4" /> },
    { value: 'rating', label: '평점순', icon: <Star className="h-4 w-4" /> },
    { value: 'newest', label: '최신순', icon: <Clock className="h-4 w-4" /> },
    { value: 'popular', label: '인기순', icon: <Heart className="h-4 w-4" /> }
  ], []);

  // SEO metadata
  useEffect(() => {
    const categoryName = categoryNames[category || ''] || '전체 상품';
    document.title = `${categoryName} - Travleap | 신안 여행`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', `신안군 ${categoryName} 상품 목록. 최고의 여행 상품을 비교하고 예약하세요.`);
    }
  }, [category]);

  // Enhanced data fetching with infinite scroll
  const fetchListings = useCallback(async (isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
        setError(null);
      }

      const currentPage = isLoadMore ? page : 1;
      const minPrice = filters.priceRange[0];
      const maxPrice = filters.priceRange[1];

      console.log(`🔍 CategoryPage: 카테고리 "${category}" 상품 조회 시작`);

      // accommodation → stay 매핑 (DB에는 stay slug만 있음)
      const mappedCategory = category === 'accommodation' ? 'stay' : category;
      console.log(`📍 CategoryPage: 매핑된 카테고리 "${mappedCategory}"`);

      const response = await api.getListings({
        category: mappedCategory || '',
        page: currentPage,
        limit: 20,
        sortBy: sortBy === 'recommended' ? 'popular' : sortBy as any,
        minPrice: minPrice > 0 ? minPrice : undefined,
        maxPrice: maxPrice < 500000 ? maxPrice : undefined,
        search: filters.search || undefined,
        verifiedOnly: filters.verifiedOnly || undefined,
        rating: filters.ratings.length > 0 ? Math.min(...filters.ratings) : undefined
      });

      console.log(`📦 CategoryPage: API 응답`, {
        success: response.success,
        dataLength: response.data?.length,
        category: category
      });

      if (response.success && response.data) {
        const newListings = Array.isArray(response.data) ? response.data : [];
        console.log(`✅ CategoryPage: ${newListings.length}개 상품 로드됨`);

        if (isLoadMore) {
          setListings(prev => [...prev, ...newListings]);
        } else {
          setListings(newListings);
        }

        setTotalCount(response.pagination?.total || newListings.length);
        setHasMore(newListings.length === 20);
        setRetryCount(0);
      } else {
        console.log(`⚠️ CategoryPage: 응답 실패 또는 데이터 없음`);
        if (!isLoadMore) {
          setListings([]);
          setTotalCount(0);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      const errorMessage = error instanceof Error ? error.message : '데이터를 불러오는데 실패했습니다';
      setError(errorMessage);

      if (!isLoadMore && retryCount < 2) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchListings(false), 2000);
      } else {
        if (!isLoadMore) {
          setListings([]);
          setTotalCount(0);
        }
        setHasMore(false);
        toast.error('상품을 불러올 수 없습니다. 나중에 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  }, [category, sortBy, filters, page, retryCount]);

  // Reset and fetch on filter changes
  useEffect(() => {
    setPage(1);
    setListings([]);
    fetchListings(false);
  }, [category, sortBy, filters.search, filters.priceRange, filters.verifiedOnly, filters.ratings]);

  // Infinite scroll setup
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, loading]);

  // Load more when page changes
  useEffect(() => {
    if (page > 1) {
      fetchListings(true);
    }
  }, [page]);

  // Enhanced utility functions
  const handleRetry = useCallback(() => {
    setRetryCount(0);
    setError(null);
    fetchListings(false);
  }, [fetchListings]);

  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      priceRange: [0, 500000],
      ratings: [],
      verifiedOnly: false,
      sponsorOnly: false,
      tags: [],
      availability: 'all',
      location: []
    });
    setSortBy('recommended');
  }, []);

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

  const toggleArrowLeftRight = useCallback((itemId: number) => {
    setArrowLeftRightList(prev => {
      const newArrowLeftRightList = [...prev];
      const index = newArrowLeftRightList.indexOf(itemId);
      if (index > -1) {
        newArrowLeftRightList.splice(index, 1);
        toast.success('비교 목록에서 제거되었습니다');
      } else {
        if (newArrowLeftRightList.length >= 3) {
          toast.error('최대 3개까지 비교할 수 있습니다');
          return prev;
        }
        newArrowLeftRightList.push(itemId);
        toast.success('비교 목록에 추가되었습니다');
      }
      return newArrowLeftRightList;
    });
  }, []);

  const handleShare = useCallback(async (item: TravelItem) => {
    try {
      await navigator.share({
        title: item.title,
        text: item.short_description || item.description_md || '',
        url: `${window.location.origin}/detail/${item.id}`
      });
    } catch (error) {
      // Fallback to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/detail/${item.id}`);
      toast.success('링크가 클립보드에 복사되었습니다');
    }
  }, []);



  // Filtered listings (additional client-side filtering)
  const filteredListings = useMemo(() => {
    let filtered = [...listings];

    if (filters.sponsorOnly) {
      filtered = filtered.filter(item =>
        item.partner?.tier === 'gold' || item.partner?.tier === 'platinum'
      );
    }

    if (filters.tags.length > 0) {
      filtered = filtered.filter(item =>
        filters.tags.some(tag =>
          item.tags?.includes(tag) ||
          item.title.toLowerCase().includes(tag.toLowerCase())
        )
      );
    }

    if (filters.availability !== 'all') {
      filtered = filtered.filter(item => {
        // Add availability logic based on your data structure
        return true; // Placeholder
      });
    }

    return filtered;
  }, [listings, filters]);

  const renderGridView = () => (
    <div className="mobile-grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filteredListings.map((item) => (
        <Card
          key={item.id}
          className="mobile-card overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group mobile-ripple"
          onClick={() => navigate(`/detail/${item.id}`)}
        >
          <div className="relative">
            <ImageWithFallback
              src={Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'}
              alt={item.title}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-2 left-2 flex gap-1">
              {item.partner?.is_verified && (
                <Badge variant="secondary" className="bg-blue-500 text-white text-xs">
                  Verified
                </Badge>
              )}
              {item.partner?.tier === 'gold' || item.partner?.tier === 'platinum' && (
                <Badge variant="secondary" className="bg-yellow-500 text-black text-xs">
                  스폰서
                </Badge>
              )}
            </div>
            <div className="absolute top-2 right-2 flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className={`tap-target h-10 w-10 p-0 bg-white/90 hover:bg-white transition-colors ${
                  favorites.has(item.id) ? 'text-red-500' : 'text-gray-600'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(item.id);
                }}
                aria-label={favorites.has(item.id) ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
              >
                <Heart className={`h-5 w-5 ${favorites.has(item.id) ? 'fill-current' : ''}`} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="tap-target h-10 w-10 p-0 bg-white/90 hover:bg-white"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare(item);
                }}
                aria-label="공유"
              >
                <Share2 className="h-5 w-5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={`tap-target h-10 w-10 p-0 bg-white/90 hover:bg-white transition-colors ${
                  compareList.includes(item.id) ? 'text-blue-500' : 'text-gray-600'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleArrowLeftRight(item.id);
                }}
                aria-label={compareList.includes(item.id) ? '비교에서 제거' : '비교에 추가'}
              >
                <ArrowLeftRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <CardContent className="p-4">
            <h3 className="mobile-body font-semibold mb-2 line-clamp-2">{item.title}</h3>
            <p className="mobile-body text-gray-600 mb-3 line-clamp-2">{item.short_description || item.description_md || ''}</p>
            
            <div className="flex items-center space-x-2 mb-2 text-sm text-gray-500">
              <MapPin className="h-4 w-4" />
              <span>{item.location || '신안군'}</span>
              {item.duration && (
                <>
                  <Clock className="h-4 w-4 ml-2" />
                  <span>{item.duration}</span>
                </>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              {item.rating_avg > 0 && item.rating_count > 0 && (
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm">{item.rating_avg.toFixed(1)}</span>
                  <span className="text-xs text-gray-500">({item.rating_count})</span>
                </div>
              )}
              <div className="text-right">
                <div className="text-sm text-gray-500">부터</div>
                <div className="text-lg text-blue-600">{formatPrice(item.price_from || 0, selectedCurrency)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-4">
      {filteredListings.map((item) => (
        <Card
          key={item.id}
          className="mobile-card overflow-hidden hover:shadow-lg transition-shadow cursor-pointer mobile-ripple"
          onClick={() => navigate(`/detail/${item.id}`)}
        >
          <CardContent className="p-4">
            <div className="flex space-x-4">
              <div className="relative w-32 h-24 flex-shrink-0">
                <ImageWithFallback
                  src={Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'}
                  alt={item.title}
                  className="w-full h-full object-cover rounded"
                />
                <div className="absolute top-1 left-1 flex gap-1">
                  {item.partner?.is_verified && (
                    <Badge variant="secondary" className="bg-blue-500 text-white text-xs">
                      Verified
                    </Badge>
                  )}
                  {item.partner?.tier === 'gold' || item.partner?.tier === 'platinum' && (
                    <Badge variant="secondary" className="bg-yellow-500 text-black text-xs">
                      스폰서
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg truncate">{item.title}</h3>
                  <div className="flex gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`tap-target h-10 w-10 p-0 transition-colors ${
                        favorites.has(item.id) ? 'text-red-500' : 'text-gray-600'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item.id);
                      }}
                    >
                      <Heart className={`h-5 w-5 ${favorites.has(item.id) ? 'fill-current' : ''}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="tap-target h-10 w-10 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(item);
                      }}
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`tap-target h-10 w-10 p-0 transition-colors ${
                        compareList.includes(item.id) ? 'text-blue-500' : 'text-gray-600'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleArrowLeftRight(item.id);
                      }}
                    >
                      <ArrowLeftRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                
                <p className="mobile-body text-gray-600 mb-2 line-clamp-2">{item.short_description || item.description_md || ''}</p>
                
                <div className="flex items-center space-x-4 mb-2 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{item.location || '신안군'}</span>
                  </div>
                  {item.duration && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{item.duration}</span>
                    </div>
                  )}
                  {item.rating_avg > 0 && item.rating_count > 0 && (
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{item.rating_avg.toFixed(1)}</span>
                      <span className="text-gray-400">({item.rating_count})</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-end">
                  <div className="text-sm text-gray-500">
                    {item.partner?.business_name || '신안관광협회'}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">부터</div>
                    <div className="text-xl text-blue-600">{formatPrice(item.price_from || 0, selectedCurrency)}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-4">카테고리를 찾을 수 없습니다</h1>
          <Button onClick={() => navigate('/')}>홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 mobile-safe-bottom" role="main" aria-label="카테고리 상품 목록">
      <div className="mobile-container py-4 md:py-8">
        {/* Enhanced Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="mobile-title md:text-3xl font-bold mb-2 text-gray-900">
                {categoryNames[category || ''] || '전체 상품'}
              </h1>
              <div className="flex items-center gap-2 md:gap-4 text-sm text-gray-600 flex-wrap">
                <span>총 {totalCount.toLocaleString()}개 상품</span>
                {loading && <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />로딩 중...</span>}
                {error && (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    오류 발생
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {compareList.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/compare?items=${compareList.join(',')}`)}
                  className="mobile-button flex items-center gap-2 text-sm h-10"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  비교하기 ({compareList.length})
                </Button>
              )}
              {error && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  className="mobile-button flex items-center gap-2 text-sm h-10"
                >
                  <RefreshCw className="h-4 w-4" />
                  다시 시도
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="mobile-card bg-white rounded-lg p-4 md:p-6 mb-6 md:mb-8 shadow-sm">
          {/* Search Bar */}
          <div className="mb-4 md:mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="상품명, 지역, 키워드 검색..."
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
                className="mobile-form-input pl-10 pr-10 h-12 text-base"
              />
              {filters.search && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateFilters({ search: '' })}
                  className="absolute right-2 top-1/2 h-6 w-6 p-0 -translate-y-1/2"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Filter Controls */}
          <div className="mobile-filter-container mb-4">
            {/* Sort */}
            <div className="mobile-filter-chip flex items-center gap-2 min-w-fit">
              <ArrowUpDown className="h-4 w-4 text-gray-500" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] border-none bg-transparent p-0 h-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.icon}
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Range */}
            <div className="mobile-filter-chip flex items-center gap-2">
              <span className="text-sm text-gray-600">가격:</span>
              <span className="text-sm font-medium whitespace-nowrap">
                {formatPrice(filters.priceRange[0], selectedCurrency)} - {formatPrice(filters.priceRange[1], selectedCurrency)}
              </span>
            </div>

            {/* Quick Filters */}
            <Button
              variant={filters.verifiedOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilters({ verifiedOnly: !filters.verifiedOnly })}
              className={`mobile-filter-chip ${filters.verifiedOnly ? 'active' : ''} border-0`}
            >
              인증업체만
            </Button>
            <Button
              variant={filters.sponsorOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilters({ sponsorOnly: !filters.sponsorOnly })}
              className={`mobile-filter-chip ${filters.sponsorOnly ? 'active' : ''} border-0`}
            >
              스폰서
            </Button>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="mobile-filter-chip flex items-center gap-2 border-0"
            >
              <SlidersHorizontal className="h-4 w-4" />
              상세필터
              <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {/* View Mode - Separate row on mobile */}
          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                aria-label="그리드 보기"
                className="tap-target"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                aria-label="리스트 보기"
                className="tap-target"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="border-t pt-4 space-y-4">
              {/* Price Range Slider */}
              <div>
                <label className="block text-sm font-medium mb-2">가격 범위</label>
                <Slider
                  value={filters.priceRange}
                  onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
                  max={500000}
                  step={10000}
                  className="w-full"
                />
              </div>

              {/* Rating Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">최소 평점</label>
                <div className="flex gap-2">
                  {[5, 4, 3, 2, 1].map(rating => (
                    <Button
                      key={rating}
                      variant={filters.ratings.includes(rating) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const newRatings = filters.ratings.includes(rating)
                          ? filters.ratings.filter(r => r !== rating)
                          : [...filters.ratings, rating];
                        updateFilters({ ratings: newRatings });
                      }}
                      className="flex items-center gap-1"
                    >
                      <Star className="h-3 w-3 fill-current" />
                      {rating}+
                    </Button>
                  ))}
                </div>
              </div>

              {/* Reset Button */}
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  필터 초기화
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Results */}
        <div className="space-y-6">
          {/* Loading State */}
          {loading && filteredListings.length === 0 ? (
            <div className={viewMode === 'grid'
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "space-y-4"
            }>
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse overflow-hidden">
                  <div className="w-full h-48 bg-gray-200"></div>
                  <CardContent className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="flex justify-between items-center">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredListings.length > 0 ? (
            <>
              {/* Results */}
              {viewMode === 'grid' ? renderGridView() : renderListView()}

              {/* Infinite Scroll Trigger */}
              <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
                {loading && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>더 많은 상품을 불러오는 중...</span>
                  </div>
                )}
                {!hasMore && filteredListings.length > 0 && (
                  <div className="text-center text-gray-500">
                    <p>모든 상품을 보여드렸습니다</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="mt-2"
                    >
                      맨 위로
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  조건에 맞는 상품이 없습니다
                </h3>
                <p className="text-gray-600 mb-6">
                  다른 키워드나 필터 조건으로 다시 검색해보세요.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={resetFilters} className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    필터 초기화
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/')}>
                    홈으로 돌아가기
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ArrowLeftRight Bar */}
        {compareList.length > 0 && (
          <div className="fixed bottom-20 md:bottom-6 left-1/2 transform -translate-x-1/2 z-50 mobile-safe-bottom">
            <Card className="mobile-card bg-white shadow-lg border-2 border-blue-200">
              <CardContent className="px-4 py-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">비교 대상: {compareList.length}개</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => navigate(`/compare?items=${compareList.join(',')}`)}
                      className="mobile-button bg-blue-600 hover:bg-blue-700 h-10"
                    >
                      비교하기
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setArrowLeftRightList([])}
                      className="mobile-button h-10"
                    >
                      취소
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
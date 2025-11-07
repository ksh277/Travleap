import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  MapPin,
  Star,
  Search,
  Filter,
  Calendar,
  Users,
  Heart,
  Eye,
  ArrowLeft,
  Plus
} from 'lucide-react';
import { api, type TravelItem } from '../utils/api';
import { toast } from 'sonner';
import { getGoogleMapsApiKey } from '../utils/env';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { RentcarVendorCard } from './cards/RentcarVendorCard';

interface CategoryDetailPageProps {}

interface RentcarVendor {
  vendor_id: number;
  vendor_code: string;
  vendor_name: string;
  vehicle_count: number;
  min_price: number;
  max_price: number;
  images: string[];
  vehicle_classes: string;
}

// 카테고리별 메타데이터
const categoryMeta = {
  tour: {
    title: '여행',
    description: '신안의 아름다운 여행 상품을 만나보세요',
    icon: 'map',
    color: '#FF6B6B'
  },
  rentcar: {
    title: '렌트카',
    description: '편리한 렌트카로 자유로운 여행을 즐기세요',
    icon: 'car',
    color: '#4ECDC4'
  },
  stay: {
    title: '숙박',
    description: '편안한 숙박시설에서 특별한 시간을 보내세요',
    icon: 'bed',
    color: '#45B7D1'
  },
  food: {
    title: '음식',
    description: '신안의 신선한 맛을 경험해보세요',
    icon: 'utensils',
    color: '#96CEB4'
  },
  tourist: {
    title: '관광지',
    description: '신안의 명소를 둘러보세요',
    icon: 'camera',
    color: '#FFEAA7'
  },
  popup: {
    title: '팝업',
    description: '특별한 팝업 이벤트를 만나보세요',
    icon: 'star',
    color: '#FF9FF3'
  },
  event: {
    title: '행사',
    description: '다양한 행사와 축제에 참여하세요',
    icon: 'calendar',
    color: '#54A0FF'
  },
  experience: {
    title: '체험',
    description: '특별한 체험 프로그램을 즐겨보세요',
    icon: 'heart',
    color: '#5F27CD'
  }
};

export function CategoryDetailPage({}: CategoryDetailPageProps) {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();

  const [items, setItems] = useState<TravelItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<TravelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [priceRange, setPriceRange] = useState('all');
  const [destination, setDestination] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [adults, setAdults] = useState(1);

  // 🚗 렌트카 업체 리스트 (rentcar 카테고리 전용)
  const [rentcarVendors, setRentcarVendors] = useState<RentcarVendor[]>([]);

  // 현재 카테고리 정보
  const currentCategory = categorySlug ? categoryMeta[categorySlug as keyof typeof categoryMeta] : null;

  // 데이터 로드
  useEffect(() => {
    const loadCategoryItems = async () => {
      if (!categorySlug) return;

      setLoading(true);
      try {
        console.log(`🔄 ${categorySlug} 카테고리 로딩 중...`);

        // 🚗 렌트카 카테고리는 업체 리스트 표시
        if (categorySlug === 'rentcar') {
          // 1. 렌트카 파트너 조회
          const partnersResponse = await fetch('/api/partners?type=rentcar');
          const partnersData = await partnersResponse.json();

          if (partnersData.success && partnersData.data) {
            const partners = partnersData.data;

            // 2. 각 파트너의 차량 개수 및 가격 정보 조회
            const vendorPromises = partners.map(async (partner: any) => {
              const listingsResponse = await api.getListings({
                category: 'rentcar',
                partnerId: partner.id,
                limit: 100
              });

              const listings = listingsResponse.data || [];
              const prices = listings.map((l: TravelItem) => l.price_from || 0).filter((p: number) => p > 0);

              return {
                vendor_id: partner.id,
                vendor_code: `PARTNER_${partner.id}`,
                vendor_name: partner.business_name,
                vehicle_count: listings.length,
                min_price: prices.length > 0 ? Math.min(...prices) : 0,
                max_price: prices.length > 0 ? Math.max(...prices) : 0,
                images: partner.images && partner.images.length > 0 ? partner.images : ['https://images.unsplash.com/photo-1449965408869-eaa3f722e40d'],
                vehicle_classes: listings.map((l: TravelItem) => l.title).join(', ')
              };
            });

            const vendors = await Promise.all(vendorPromises);
            // 차량이 있는 업체만 표시
            const activeVendors = vendors.filter(v => v.vehicle_count > 0);

            console.log(`✅ 렌트카 업체 ${activeVendors.length}개 로드됨`);
            setRentcarVendors(activeVendors);
          }

          setLoading(false);
          return;
        }

        // 일반 카테고리는 상품 리스트 표시
        const response = await api.getListings({
          category: categorySlug,
          limit: 100,
          sortBy: sortBy as any
        });

        if (response.success && response.data) {
          console.log(`✅ ${categorySlug} 카테고리 상품 ${response.data.length}개 로드됨`);
          setItems(response.data);
          setFilteredItems(response.data);
        } else {
          console.log(`⚠️ ${categorySlug} 카테고리 상품 로드 실패`);
          setItems([]);
          setFilteredItems([]);
        }
      } catch (error) {
        console.error('카테고리 로드 오류:', error);
        toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
        setItems([]);
        setFilteredItems([]);
        setRentcarVendors([]);
      } finally {
        setLoading(false);
      }
    };

    loadCategoryItems();
  }, [categorySlug, sortBy]);

  // 필터링 및 검색
  useEffect(() => {
    let filtered = [...items];

    // 검색 필터
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.short_description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 가격 필터
    if (priceRange !== 'all') {
      switch (priceRange) {
        case 'under50':
          filtered = filtered.filter(item => (item.price_from || 0) < 50000);
          break;
        case '50to100':
          filtered = filtered.filter(item => (item.price_from || 0) >= 50000 && (item.price_from || 0) < 100000);
          break;
        case 'over100':
          filtered = filtered.filter(item => (item.price_from || 0) >= 100000);
          break;
      }
    }

    // 정렬
    switch (sortBy) {
      case 'price_low':
        filtered.sort((a, b) => (a.price_from || 0) - (b.price_from || 0));
        break;
      case 'price_high':
        filtered.sort((a, b) => (b.price_from || 0) - (a.price_from || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0));
        break;
      case 'popular':
        filtered.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));
        break;
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    setFilteredItems(filtered);
  }, [items, searchQuery, priceRange, sortBy]);

  // 카테고리가 유효하지 않은 경우
  if (!currentCategory) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">카테고리를 찾을 수 없습니다</h1>
          <Button onClick={() => navigate('/')}>홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 배너 with 검색 */}
      <div
        className="relative w-full h-[200px] bg-cover bg-center flex items-center"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=300&fit=crop")',
          backgroundColor: currentCategory.color
        }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative z-10 w-full px-[60px]">
          {/* 검색 폼 */}
          <div className="bg-white rounded-lg shadow-xl p-4">
            <div className="flex flex-col md:flex-row items-center gap-3">
              {/* 왼쪽: 목적지 */}
              <div className="flex flex-col flex-1">
                <label className="text-xs text-gray-500 mb-1">{currentCategory.title}</label>
                <Input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="어디로 가실거야?"
                  className="border-gray-300"
                />
              </div>

              {/* 날짜 선택 */}
              <div className="flex flex-col flex-1">
                <label className="text-xs text-gray-500 mb-1">From ~ to</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    placeholder="ddmmyyyy"
                    className="flex-1 border-gray-300"
                  />
                  <span className="text-gray-400">~</span>
                  <Input
                    type="text"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    placeholder="ddmmyyyy"
                    className="flex-1 border-gray-300"
                  />
                </div>
              </div>

              {/* 인원 선택 */}
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">성인</label>
                <div className="flex items-center gap-1">
                  <span className="text-sm">Mine</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAdults(adults + 1)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 검색 버튼 */}
              <Button className="bg-purple-600 hover:bg-purple-700 text-white h-10 px-8 mt-auto">
                검색
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="w-full px-[60px] py-8">
        {/* 결과 헤더 및 정렬 */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {categorySlug === 'rentcar' ? '렌트카 업체' : `${currentCategory.title} 상품`}
            </h2>
            <Badge variant="outline" style={{ backgroundColor: `${currentCategory.color}20`, color: currentCategory.color }}>
              {categorySlug === 'rentcar' ? `${rentcarVendors.length}개 업체` : `${filteredItems.length}개`}
            </Badge>
          </div>

          {/* 정렬 옵션 - 렌트카는 정렬 안함 */}
          {categorySlug !== 'rentcar' && (
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="정렬" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">최신순</SelectItem>
                <SelectItem value="popular">인기순</SelectItem>
                <SelectItem value="rating">평점순</SelectItem>
                <SelectItem value="price_low">가격 낮은순</SelectItem>
                <SelectItem value="price_high">가격 높은순</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* 상품/업체 목록 */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <Card key={index} className="animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : categorySlug === 'rentcar' && rentcarVendors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rentcarVendors.map((vendor) => (
              <RentcarVendorCard key={vendor.vendor_id} vendor={vendor} />
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow cursor-pointer h-[420px] flex flex-col" onClick={() => navigate(`/detail/${item.id}`)}>
                <div className="relative flex-shrink-0">
                  <ImageWithFallback
                    src={item.images?.[0] || 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop'}
                    alt={item.title}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  {item.is_featured && (
                    <Badge className="absolute top-2 left-2 bg-red-500">
                      인기
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 text-white hover:bg-white/20"
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
                <CardContent className="p-4 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1">{item.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {item.short_description || '상세 정보를 확인해보세요.'}
                    </p>

                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="line-clamp-1">{item.location || '위치 정보 없음'}</span>
                      {item.location && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-2 h-6 px-2 text-xs text-blue-600 hover:text-blue-800 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location + ' 신안군')}`;
                            window.open(mapUrl, '_blank');
                          }}
                        >
                          지도보기
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 mr-1" />
                      <span className="text-sm font-medium">{(item.rating_avg || 0).toFixed(1)}</span>
                      <span className="text-sm text-gray-500 ml-1">({item.rating_count || 0})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-900">
                        ₩{(item.price_from || 0).toLocaleString()}
                      </span>
                      {item.price_to && item.price_to !== item.price_from && (
                        <span className="text-sm text-gray-500">~</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {categorySlug === 'rentcar' ? '등록된 업체가 없습니다' : '상품이 없습니다'}
            </h3>
            <p className="text-gray-600">
              {searchQuery ? '검색 조건을 변경해보세요.' : categorySlug === 'rentcar' ? '차량을 등록한 업체가 없습니다.' : '등록된 상품이 없습니다.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
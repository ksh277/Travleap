import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Percent,
  MapPin,
  Clock,
  Star,
  Phone,
  Globe,
  Gift,
  Search,
  Filter,
  Calendar,
  Users,
  Tag,
  Crown,
  Zap,
  Heart,
  Share2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../utils/api';
import { useRealTimeListings } from '../hooks/useRealTimeData';

interface DiscountEvent {
  id: string;
  title: string;
  description: string;
  discountRate: number;
  originalPrice?: number;
  discountedPrice?: number;
  category: string;
  partnerName: string;
  partnerType: string;
  location: string;
  island: string;
  startDate: string;
  endDate: string;
  rating: number;
  reviewCount: number;
  image: string;
  tags: string[];
  isHot: boolean;
  isLimited: boolean;
  remainingCount?: number;
  phone: string;
  website?: string;
  conditions: string[];
  benefits: string[];
}

const PARTNER_TYPES = [
  { id: 'all', name: '전체' },
  { id: 'restaurant', name: '음식점' },
  { id: 'accommodation', name: '숙박업소' },
  { id: 'activity', name: '체험활동' },
  { id: 'transport', name: '교통' },
  { id: 'shopping', name: '쇼핑' },
  { id: 'tour', name: '관광' }
];

const DISCOUNT_RANGES = [
  { id: 'all', name: '전체 할인율' },
  { id: '5-10', name: '5-10%' },
  { id: '10-15', name: '10-15%' },
  { id: '15-20', name: '15-20%' },
  { id: '20+', name: '20% 이상' }
];

// 샘플 데이터
const SAMPLE_EVENTS: DiscountEvent[] = [
  {
    id: '1',
    title: '증도 펜션 얼리버드 특가',
    description: '유네스코 생물권보전지역 증도에서의 힐링 펜션 숙박을 특별가로 만나보세요.',
    discountRate: 25,
    originalPrice: 120000,
    discountedPrice: 90000,
    category: 'accommodation',
    partnerName: '증도힐링펜션',
    partnerType: 'accommodation',
    location: '증도면',
    island: '증도',
    startDate: '2024-12-01',
    endDate: '2024-12-31',
    rating: 0,
    reviewCount: 0,
    image: '/api/placeholder/400/300',
    tags: ['얼리버드', '힐링', '바다뷰'],
    isHot: true,
    isLimited: true,
    remainingCount: 15,
    phone: '061-275-1234',
    website: 'https://jeungdo-pension.com',
    conditions: ['2박 이상 투숙 시', '12월 예약 한정', '주말 제외'],
    benefits: ['조식 무료 제공', '무료 Wi-Fi', '주차 무료']
  },
  {
    id: '2',
    title: '신안 젓갈 맛집 런치 할인',
    description: '신안 전통 젓갈 요리 전문점에서 점심 특가 메뉴를 제공합니다.',
    discountRate: 20,
    originalPrice: 25000,
    discountedPrice: 20000,
    category: 'restaurant',
    partnerName: '바다향 젓갈집',
    partnerType: 'restaurant',
    location: '신안읍',
    island: '신안군',
    startDate: '2024-11-15',
    endDate: '2025-01-15',
    rating: 0,
    reviewCount: 0,
    image: '/api/placeholder/400/301',
    tags: ['전통음식', '젓갈', '런치세트'],
    isHot: true,
    isLimited: false,
    phone: '061-240-5678',
    conditions: ['평일 11:30-14:00 한정', '1인 1메뉴 주문 시'],
    benefits: ['밑반찬 리필 무제한', '주차 무료', '포장 시 추가 5% 할인']
  },
  {
    id: '3',
    title: '홍도 유람선 투어 패키지',
    description: '홍도의 아름다운 해안 절경을 감상할 수 있는 특별 유람선 투어입니다.',
    discountRate: 15,
    originalPrice: 45000,
    discountedPrice: 38250,
    category: 'tour',
    partnerName: '홍도관광유람선',
    partnerType: 'tour',
    location: '홍도면',
    island: '홍도',
    startDate: '2024-11-01',
    endDate: '2024-12-30',
    rating: 0,
    reviewCount: 0,
    image: '/api/placeholder/400/302',
    tags: ['유람선', '절경', '사진촬영'],
    isHot: false,
    isLimited: true,
    remainingCount: 30,
    phone: '061-246-7890',
    conditions: ['날씨 상황에 따라 운항', '최소 10명 이상 출발'],
    benefits: ['가이드 해설 서비스', '기념품 증정', '사진 촬영 서비스']
  },
  {
    id: '4',
    title: '흑산도 전복 체험 할인',
    description: '흑산도에서 직접 전복을 채취하고 요리해보는 특별한 체험 프로그램입니다.',
    discountRate: 30,
    originalPrice: 80000,
    discountedPrice: 56000,
    category: 'activity',
    partnerName: '흑산도어민체험마을',
    partnerType: 'activity',
    location: '흑산면',
    island: '흑산도',
    startDate: '2024-12-01',
    endDate: '2025-02-28',
    rating: 0,
    reviewCount: 0,
    image: '/api/placeholder/400/303',
    tags: ['체험', '전복', '요리'],
    isHot: true,
    isLimited: true,
    remainingCount: 8,
    phone: '061-275-9012',
    conditions: ['사전 예약 필수', '성인 2명 이상', '날씨 양호 시'],
    benefits: ['전복요리 시식', '체험도구 대여', '기념품 제공']
  },
  {
    id: '5',
    title: '자은도 카라반 캠핑 패키지',
    description: '자은도의 아름다운 해변가에서 즐기는 카라반 캠핑 특가 패키지입니다.',
    discountRate: 18,
    originalPrice: 150000,
    discountedPrice: 123000,
    category: 'accommodation',
    partnerName: '자은도해변캠핑장',
    partnerType: 'accommodation',
    location: '자은면',
    island: '자은도',
    startDate: '2024-11-20',
    endDate: '2024-12-20',
    rating: 0,
    reviewCount: 0,
    image: '/api/placeholder/400/304',
    tags: ['카라반', '캠핑', '해변'],
    isHot: false,
    isLimited: false,
    phone: '061-271-3456',
    conditions: ['1박 2일 기준', '주말 추가 요금 별도'],
    benefits: ['BBQ 시설 무료', '샤워실 이용', '주차 무료']
  },
  {
    id: '6',
    title: '암태도 전통공예 체험 할인',
    description: '암태도 할머니와 함께하는 전통 짚공예 체험 프로그램입니다.',
    discountRate: 12,
    originalPrice: 35000,
    discountedPrice: 30800,
    category: 'activity',
    partnerName: '암태도전통공예마을',
    partnerType: 'activity',
    location: '암태면',
    island: '암태도',
    startDate: '2024-11-10',
    endDate: '2025-01-31',
    rating: 4.8,
    reviewCount: 45,
    image: '/api/placeholder/400/305',
    tags: ['전통공예', '체험', '수제'],
    isHot: false,
    isLimited: false,
    phone: '061-273-7890',
    conditions: ['평일 운영', '3명 이상 신청 시'],
    benefits: ['작품 가져가기', '차 서비스', '전통간식 제공']
  }
];

export function PartnersDiscountPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<DiscountEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<DiscountEvent[]>([]);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedDiscount, setSelectedDiscount] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('discount');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);

  // 실시간 데이터 가져오기
  const { data: listings } = useRealTimeListings();

  // DB에서 파트너 listings 가져오기
  useEffect(() => {
    const fetchPartnerListings = async () => {
      setLoading(true);
      try {
        const response = await api.getListings();
        const listingsData = Array.isArray(response) ? response : response.data || [];

        // 카테고리를 파트너 타입으로 매핑
        const mapCategoryToType = (category: string): string => {
          const typeMap: { [key: string]: string } = {
            '음식': 'restaurant',
            '숙박': 'accommodation',
            '체험': 'activity',
            '투어': 'tour',
            '렌트카': 'transport',
            '관광지': 'tour',
            '팝업': 'shopping',
            '행사': 'activity'
          };
          return typeMap[category] || 'tour';
        };

        // 지역에서 섬 이름 추출
        const extractIsland = (location?: string): string => {
          if (!location) return '신안군';
          if (location.includes('증도')) return '증도';
          if (location.includes('임자도')) return '임자도';
          if (location.includes('자은도')) return '자은도';
          if (location.includes('비금도')) return '비금도';
          if (location.includes('도초도')) return '도초도';
          if (location.includes('흑산도')) return '흑산도';
          if (location.includes('홍도')) return '홍도';
          return '신안군';
        };

        // 태그 생성
        const generateTags = (listing: any): string[] => {
          const tags: string[] = [];
          if (listing.is_featured) tags.push('추천');
          if (listing.discount_rate >= 20) tags.push('특가');
          if (listing.rating_avg >= 4.5) tags.push('인기');
          if (listing.category) tags.push(listing.category);
          return tags;
        };

        // 혜택 생성
        const generateBenefits = (listing: any): string[] => {
          const benefits: string[] = ['사전 예약 할인'];
          if (listing.amenities && Array.isArray(listing.amenities)) {
            benefits.push(...listing.amenities.slice(0, 2));
          }
          if (listing.contact_phone) benefits.push('전화 문의 가능');
          return benefits;
        };

        // Listing을 DiscountEvent 형태로 변환
        const partnerEvents: DiscountEvent[] = listingsData.map((listing) => ({
          id: listing.id.toString(),
          title: listing.title,
          description: listing.short_description || listing.description_md || '',
          discountRate: listing.discount_rate || 0,
          originalPrice: listing.original_price,
          discountedPrice: listing.price_from,
          category: listing.category,
          partnerName: listing.title,
          partnerType: mapCategoryToType(listing.category),
          location: listing.location || '신안군',
          island: extractIsland(listing.location),
          startDate: listing.available_from || new Date().toISOString(),
          endDate: listing.available_to || '2025-12-31',
          rating: listing.rating_avg || 0,
          reviewCount: listing.rating_count || 0,
          image: listing.images && listing.images.length > 0
            ? listing.images[0]
            : 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop',
          tags: generateTags(listing),
          isHot: listing.is_featured || listing.discount_rate >= 20,
          isLimited: listing.booking_count > 50,
          remainingCount: listing.max_guests,
          phone: listing.contact_phone || '',
          website: listing.website_url,
          conditions: ['사전 예약 필수', '현장 결제 가능'],
          benefits: generateBenefits(listing)
        }));

        setEvents(partnerEvents);
      } catch (error) {
        console.error('Failed to fetch partner listings:', error);
        toast.error('가맹점 정보를 불러오는데 실패했습니다.');
        // 에러 시 샘플 데이터 사용
        setEvents(SAMPLE_EVENTS);
      } finally {
        setLoading(false);
      }
    };

    fetchPartnerListings();
  }, [listings]);

  // 필터링 및 정렬
  useEffect(() => {
    let filtered = events;

    // 탭 필터
    if (activeTab === 'hot') {
      filtered = filtered.filter(event => event.isHot);
    } else if (activeTab === 'limited') {
      filtered = filtered.filter(event => event.isLimited);
    } else if (activeTab === 'ending') {
      const today = new Date();
      const weekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(event => new Date(event.endDate) <= weekLater);
    }

    // 파트너 타입 필터
    if (selectedType !== 'all') {
      filtered = filtered.filter(event => event.partnerType === selectedType);
    }

    // 할인율 필터
    if (selectedDiscount !== 'all') {
      const [min, max] = selectedDiscount.split('-').map(Number);
      if (selectedDiscount === '20+') {
        filtered = filtered.filter(event => event.discountRate >= 20);
      } else {
        filtered = filtered.filter(event =>
          event.discountRate >= min && event.discountRate < max
        );
      }
    }

    // 검색 필터
    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 정렬
    switch (sortBy) {
      case 'discount':
        filtered.sort((a, b) => b.discountRate - a.discountRate);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'ending':
        filtered.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
        break;
      case 'price':
        filtered.sort((a, b) => (a.discountedPrice || 0) - (b.discountedPrice || 0));
        break;
    }

    setFilteredEvents(filtered);
  }, [events, activeTab, selectedType, selectedDiscount, searchQuery, sortBy]);

  const handleToggleFavorite = (eventId: string) => {
    setFavorites(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
    toast.success(favorites.includes(eventId) ? '찜 목록에서 제거되었습니다' : '찜 목록에 추가되었습니다');
  };

  const handleShare = async (event: DiscountEvent) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `${event.discountRate}% 할인! ${event.description}`,
          url: window.location.href
        });
      } catch (error) {
        // Share was cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('링크가 클립보드에 복사되었습니다!');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysUntilEnd = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 섹션 */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="text-center">
            <div className="flex justify-center items-center mb-4">
              <Percent className="h-12 w-12 mr-3" />
              <h1 className="text-3xl md:text-5xl font-bold">제휴업체 할인이벤트</h1>
            </div>
            <p className="text-lg md:text-xl mb-6 opacity-90">
              약 300여개와 제휴되어 어딜가든지 최대 20% 할인
            </p>
            <p className="text-base md:text-lg opacity-80">
              신안 여행의 모든 순간을 더욱 저렴하고 특별하게 만들어드립니다
            </p>
          </div>
        </div>
      </div>

      {/* 탭 섹션 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              전체
            </TabsTrigger>
            <TabsTrigger value="hot" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              인기
            </TabsTrigger>
            <TabsTrigger value="limited" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              한정
            </TabsTrigger>
            <TabsTrigger value="ending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              마감임박
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {/* 검색 및 필터 섹션 */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* 검색 */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="이벤트 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* 파트너 타입 필터 */}
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="업체 유형" />
                    </SelectTrigger>
                    <SelectContent>
                      {PARTNER_TYPES.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* 할인율 필터 */}
                  <Select value={selectedDiscount} onValueChange={setSelectedDiscount}>
                    <SelectTrigger>
                      <SelectValue placeholder="할인율" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISCOUNT_RANGES.map(range => (
                        <SelectItem key={range.id} value={range.id}>
                          {range.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* 정렬 */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="정렬 기준" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discount">할인율순</SelectItem>
                      <SelectItem value="rating">평점순</SelectItem>
                      <SelectItem value="ending">마감임박순</SelectItem>
                      <SelectItem value="price">가격순</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* 이벤트 목록 */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
                <p className="text-gray-600">가맹점 정보를 불러오는 중...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Gift className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">등록된 가맹점이 없습니다</h3>
                <p className="text-gray-500 mb-6">첫 파트너가 되어보세요!</p>
                <Button onClick={() => navigate('/partner-apply')} className="bg-purple-600 hover:bg-purple-700">
                  파트너 신청하기
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredEvents.map(event => {
                const daysLeft = getDaysUntilEnd(event.endDate);
                return (
                  <Card
                    key={event.id}
                    className="group hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    <div className="relative">
                      <div className="w-full h-48 bg-gradient-to-br from-orange-100 via-red-100 to-pink-100 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl mb-2">🎉</div>
                          <div className="text-sm text-gray-600">이벤트 이미지 준비중</div>
                        </div>
                      </div>

                      {/* 할인율 배지 */}
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-red-500 text-white text-lg font-bold px-3 py-1">
                          {event.discountRate}% 할인
                        </Badge>
                      </div>

                      {/* 상태 배지들 */}
                      <div className="absolute top-4 right-4 flex flex-col gap-2">
                        {event.isHot && (
                          <Badge className="bg-orange-500">
                            <Zap className="h-3 w-3 mr-1" />
                            인기
                          </Badge>
                        )}
                        {event.isLimited && (
                          <Badge className="bg-purple-500">
                            <Crown className="h-3 w-3 mr-1" />
                            한정
                          </Badge>
                        )}
                        {daysLeft <= 7 && (
                          <Badge className="bg-yellow-500">
                            <Clock className="h-3 w-3 mr-1" />
                            {daysLeft}일 남음
                          </Badge>
                        )}
                      </div>

                      {/* 액션 버튼들 */}
                      <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white/90"
                          onClick={() => handleToggleFavorite(event.id)}
                        >
                          <Heart
                            className={`h-4 w-4 ${favorites.includes(event.id) ? 'fill-red-500 text-red-500' : ''}`}
                          />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white/90"
                          onClick={() => handleShare(event)}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline">
                          {PARTNER_TYPES.find(t => t.id === event.partnerType)?.name}
                        </Badge>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-1" />
                          {event.island}
                        </div>
                      </div>

                      <h3 className="text-xl font-bold mb-2 line-clamp-2">{event.title}</h3>
                      <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>

                      {/* 가격 정보 */}
                      {event.originalPrice && event.discountedPrice && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 line-through text-sm">
                              {event.originalPrice.toLocaleString()}원
                            </span>
                            <span className="text-2xl font-bold text-red-600">
                              {event.discountedPrice.toLocaleString()}원
                            </span>
                          </div>
                          <div className="text-sm text-green-600 font-medium">
                            {(event.originalPrice - event.discountedPrice).toLocaleString()}원 절약!
                          </div>
                        </div>
                      )}

                      {/* 파트너 정보 */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="font-medium">{event.partnerName}</div>
                          <div className="flex items-center space-x-1 text-sm">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{event.rating.toFixed(1)}</span>
                            <span className="text-gray-500">({event.reviewCount})</span>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            {event.phone}
                          </div>
                          {event.website && (
                            <div className="flex items-center mt-1">
                              <Globe className="h-4 w-4 mr-1" />
                              홈페이지
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 이벤트 기간 */}
                      <div className="flex items-center gap-2 mb-4 text-sm">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>
                          {formatDate(event.startDate)} ~ {formatDate(event.endDate)}
                        </span>
                        {event.isLimited && event.remainingCount && (
                          <Badge variant="outline" className="text-xs">
                            {event.remainingCount}개 남음
                          </Badge>
                        )}
                      </div>

                      {/* 태그 */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {event.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* 혜택 */}
                      <div className="mb-4">
                        <h4 className="font-medium mb-2 text-sm">포함 혜택</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {event.benefits.slice(0, 3).map((benefit, index) => (
                            <li key={index} className="flex items-center">
                              <span className="w-1 h-1 bg-green-500 rounded-full mr-2"></span>
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* 이용 조건 */}
                      <div className="mb-6">
                        <h4 className="font-medium mb-2 text-sm">이용 조건</h4>
                        <ul className="text-xs text-gray-500 space-y-1">
                          {event.conditions.map((condition, index) => (
                            <li key={index}>• {condition}</li>
                          ))}
                        </ul>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex gap-2">
                        <Button className="flex-1 bg-red-600 hover:bg-red-700">
                          예약하기
                        </Button>
                        <Button variant="outline" className="flex-1">
                          상세보기
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 통계 섹션 */}
      <div className="bg-gradient-to-r from-blue-100 to-purple-100 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">제휴 혜택 통계</h2>
            <p className="text-gray-600">신안 여행객들이 누린 특별한 혜택들</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="text-center p-6">
              <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <div className="text-3xl font-bold text-blue-600 mb-2">300+</div>
              <div className="text-gray-600">제휴업체</div>
            </Card>

            <Card className="text-center p-6">
              <Percent className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <div className="text-3xl font-bold text-red-600 mb-2">20%</div>
              <div className="text-gray-600">최대 할인율</div>
            </Card>

            <Card className="text-center p-6">
              <Gift className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <div className="text-3xl font-bold text-green-600 mb-2">50+</div>
              <div className="text-gray-600">진행중 이벤트</div>
            </Card>

            <Card className="text-center p-6">
              <Star className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <div className="text-3xl font-bold text-yellow-600 mb-2">4.8</div>
              <div className="text-gray-600">평균 만족도</div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Star,
  MapPin,
  LayoutGrid,
  List,
  Clock,
  Heart,
  Share2
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { formatPrice } from '../utils/translations';
import { api } from '../utils/api';

interface CategoryPageProps {
  selectedCurrency?: string;
}

interface ListingItem {
  id: string;
  title: string;
  category: string;
  price: number;
  rating: number;
  reviewCount: number;
  image: string;
  description: string;
  duration?: string;
  location: string;
  isPartner: boolean;
  isSponsor: boolean;
  partnerName?: string;
}

export function CategoryPage({ selectedCurrency = 'KRW' }: CategoryPageProps) {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [sortBy, setSortBy] = useState('recommended');
  const [priceRange, setPriceRange] = useState('all');
  const [partnerFilter, setPartnerFilter] = useState('all');

  const categoryNames: { [key: string]: string } = {
    tour: '여행상품',
    accommodation: '숙박',
    rentcar: '캠핑카',
    food: '음식',
    attraction: '관광지',
    package: '패키지',
    event: '팝업/행사',
    experience: '체험'
  };

  useEffect(() => {
    if (category) {
      fetchListings();
    }
  }, [category, sortBy, priceRange, partnerFilter]);

  const fetchListings = async () => {
    setLoading(true);

    // 샘플 데이터 정의
    const sampleListings: ListingItem[] = [
      {
        id: '1',
        title: '신안 퍼플섬 투어',
        category: 'tour',
        price: 45000,
        rating: 4.8,
        reviewCount: 156,
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
        description: '보라색으로 물든 아름다운 퍼플섬에서의 특별한 투어 체험',
        duration: '3시간',
        location: '신안군 안좌면',
        isPartner: true,
        isSponsor: true,
        partnerName: '퍼플섬관광협회'
      },
      {
        id: '2',
        title: '임자도 대광해수욕장 리조트',
        category: 'stay',
        price: 180000,
        rating: 4.7,
        reviewCount: 89,
        image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop',
        description: '12km 백사장이 펼쳐진 대광해수욕장의 프리미엄 리조트',
        duration: '1박',
        location: '신안군 임자면',
        isPartner: true,
        isSponsor: false,
        partnerName: '임자도리조트'
      },
      {
        id: '3',
        title: '신안 전통 젓갈 맛집',
        category: 'food',
        price: 25000,
        rating: 4.9,
        reviewCount: 234,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
        description: '3대째 이어져 내려오는 전통 젓갈과 신선한 해산물 요리',
        duration: '1시간',
        location: '신안군 지도읍',
        isPartner: true,
        isSponsor: true,
        partnerName: '신안전통음식점'
      },
      {
        id: '4',
        title: '흑산도 상라봉 트레킹',
        category: 'tour',
        price: 50000,
        rating: 4.6,
        reviewCount: 112,
        image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop',
        description: '흑산도 최고봉에서 바라보는 서해의 장관과 트레킹의 즐거움',
        duration: '5시간',
        location: '신안군 흑산면',
        isPartner: true,
        isSponsor: false,
        partnerName: '흑산도트레킹협회'
      },
      {
        id: '5',
        title: '청산도 슬로우길',
        category: 'tour',
        price: 30000,
        rating: 4.9,
        reviewCount: 234,
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
        description: '영화 촬영지로 유명한 청산도의 아름다운 슬로우길 트레킹',
        duration: '6시간',
        location: '신안군 청산면',
        isPartner: true,
        isSponsor: true,
        partnerName: '청산도관광협회'
      },
      {
        id: '6',
        title: '팔금도 해물탕집',
        category: 'food',
        price: 35000,
        rating: 4.7,
        reviewCount: 189,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
        description: '팔금도 근해에서 잡은 신선한 해산물로 끓인 진짜 해물탕',
        duration: '1시간',
        location: '신안군 팔금면',
        isPartner: true,
        isSponsor: false,
        partnerName: '팔금도해물탕'
      }
    ];

    try {
      // 가격 범위 파싱
      let minPrice: number | undefined;
      let maxPrice: number | undefined;
      if (priceRange !== 'all') {
        if (priceRange.includes('-')) {
          const [min, max] = priceRange.split('-').map(Number);
          minPrice = min;
          maxPrice = max;
        } else {
          minPrice = Number(priceRange);
        }
      }

      // API를 사용하여 실제 데이터베이스에서 가져오기
      const response = await api.getListings({
        category: category || '',
        page: 1,
        limit: 50,
        sortBy: sortBy === 'recommended' ? 'popular' : sortBy as any,
        minPrice,
        maxPrice
      });

      if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
        // DB 데이터를 컴포넌트 형식에 맞게 변환
        let formattedItems = response.data.map(item => ({
          id: item.id.toString(),
          title: item.title,
          category: item.category,
          price: item.price_from || 0,
          rating: item.rating_avg || 0,
          reviewCount: item.rating_count || 0,
          image: Array.isArray(item.images) && item.images.length > 0
            ? item.images[0]
            : generateSampleImage(category),
          description: item.short_description || item.description_md || '',
          duration: item.duration,
          location: item.location || '신안군',
          isPartner: item.partner?.is_verified || false,
          isSponsor: item.partner?.tier === 'gold' || item.partner?.tier === 'platinum',
          partnerName: item.partner?.business_name || '신안관광협회'
        }));

        // 파트너 필터 적용 (클라이언트 사이드)
        if (partnerFilter === 'partner') {
          formattedItems = formattedItems.filter(item => item.isPartner);
        } else if (partnerFilter === 'sponsor') {
          formattedItems = formattedItems.filter(item => item.isSponsor);
        }

        setListings(formattedItems);
      } else {
        console.log('No API data found, using sample listings');
        // 카테고리별 필터링
        let filteredSample = category === 'all' ? sampleListings : sampleListings.filter(item => item.category === category);
        setListings(filteredSample);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      // 오류 발생시 샘플 데이터로 fallback
      let filteredSample = category === 'all' ? sampleListings : sampleListings.filter(item => item.category === category);
      setListings(filteredSample);
    } finally {
      setLoading(false);
    }
  };

  const generateSampleImage = (cat: string): string => {
    const sampleImages: { [key: string]: string } = {
      tour: "https://images.unsplash.com/photo-1746427397703-ea04f0b59e14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaGluYW4lMjBpc2xhbmQlMjBrb3JlYSUyMGNvYXN0YWwlMjBzY2VuZXJ5fGVufDF8fHx8MTc1NzU2OTYwNHww&ixlib=rb-4.1.0&q=80&w=1080",
      accommodation: "https://images.unsplash.com/photo-1712880437462-f1ef10364859?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjB0cmFkaXRpb25hbCUyMGhvdGVsJTIwYWNjb21tb2RhdGlvbnxlbnwxfHx8fDE3NTc1Njk2MDd8MA&ixlib=rb-4.1.0&q=80&w=1080",
      food: "https://images.unsplash.com/photo-1703925155035-fd10b9c19b24?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBsb2NhbCUyMGZvb2QlMjBzZWFmb29kfGVufDF8fHx8MTc1NzU2OTYwOXww&ixlib=rb-4.1.0&q=80&w=1080",
      rentcar: "https://images.unsplash.com/photo-1684082018938-9c30f2a7045d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXIlMjByZW50YWwlMjBzZXJ2aWNlfGVufDF8fHx8MTc1NzUwODExNXww&ixlib=rb-4.1.0&q=80&w=1080",
      package: "https://images.unsplash.com/photo-1666507074532-ec7a461de551?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0b3VyJTIwZ3JvdXAlMjB0cmF2ZWwlMjBrb3JlYXxlbnwxfHx8fDE3NTc1Njk2MTJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
      event: "https://images.unsplash.com/photo-1506905760138-9e8f7f36bdd0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBmZXN0aXZhbCUyMGV2ZW50JTIwY2VsZWJyYXRpb258ZW58MXx8fHwxNzU3NTY5NjE3fDA&ixlib=rb-4.1.0&q=80&w=1080",
      attraction: "https://images.unsplash.com/photo-1746427397703-ea04f0b59e14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaGluYW4lMjBpc2xhbmQlMjBrb3JlYSUyMGNvYXN0YWwlMjBzY2VuZXJ5fGVufDF8fHx8MTc1NzU2OTYwNHww&ixlib=rb-4.1.0&q=80&w=1080",
      experience: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
    };
    return sampleImages[cat] || sampleImages.tour;
  };

  const generateSampleData = (cat: string): ListingItem[] => {
    const sampleImages = {
      tour: "https://images.unsplash.com/photo-1746427397703-ea04f0b59e14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaGluYW4lMjBpc2xhbmQlMjBrb3JlYSUyMGNvYXN0YWwlMjBzY2VuZXJ5fGVufDF8fHx8MTc1NzU2OTYwNHww&ixlib=rb-4.1.0&q=80&w=1080",
      accommodation: "https://images.unsplash.com/photo-1712880437462-f1ef10364859?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjB0cmFkaXRpb25hbCUyMGhvdGVsJTIwYWNjb21tb2RhdGlvbnxlbnwxfHx8fDE3NTc1Njk2MDd8MA&ixlib=rb-4.1.0&q=80&w=1080",
      food: "https://images.unsplash.com/photo-1703925155035-fd10b9c19b24?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBsb2NhbCUyMGZvb2QlMjBzZWFmb29kfGVufDF8fHx8MTc1NzU2OTYwOXww&ixlib=rb-4.1.0&q=80&w=1080",
      rentcar: "https://images.unsplash.com/photo-1684082018938-9c30f2a7045d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXIlMjByZW50YWwlMjBzZXJ2aWNlfGVufDF8fHx8MTc1NzUwODExNXww&ixlib=rb-4.1.0&q=80&w=1080",
      package: "https://images.unsplash.com/photo-1666507074532-ec7a461de551?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0b3VyJTIwZ3JvdXAlMjB0cmF2ZWwlMjBrb3JlYXxlbnwxfHx8fDE3NTc1Njk2MTJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
      event: "https://images.unsplash.com/photo-1506905760138-9e8f7f36bdd0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrb3JlYW4lMjBmZXN0aXZhbCUyMGV2ZW50JTIwY2VsZWJyYXRpb258ZW58MXx8fHwxNzU3NTY5NjE3fDA&ixlib=rb-4.1.0&q=80&w=1080",
      attraction: "https://images.unsplash.com/photo-1746427397703-ea04f0b59e14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaGluYW4lMjBpc2xhbmQlMjBrb3JlYSUyMGNvYXN0YWwlMjBzY2VuZXJ5fGVufDF8fHx8MTc1NzU2OTYwNHww&ixlib=rb-4.1.0&q=80&w=1080",
      experience: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
    };

    const sampleTitles: { [key: string]: string[] } = {
      tour: ['천사대교 일출투어', '갯벌체험 투어', '신안 섬투어', '바다낚시 투어', '자전거 섬투어'],
      accommodation: ['바다정원 민박', '천사대교 펜션', '신안 리조트', '갯벌마을 게스트하우스', '전통한옥 스테이'],
      food: ['전복요리 맛집', '갯벌 낙지요리', '신안 특산물 레스토랑', '바다장어구이', '섬 향토음식'],
      rentcar: ['프리미엄 캠핑카', '소형 캠핑카', '중형 캠핑카', '전기 캠핑카', '럭셔리 캠핑카'],
      package: ['2박3일 신안투어', '당일치기 패키지', '3박4일 힐링 패키지', '갯벌체험 패키지', '사진촬영 투어'],
      event: ['튤립축제', '갯벌체험 행사', '전복축제', '해넘이 행사', '전통문화 체험'],
      attraction: ['천사대교', '신안갯벌', '증도 염전', '도초도 해변', '임자도 튤립공원'],
      experience: ['갯벌체험', '요트 체험', '승마 체험', '도예 체험', '전통음식 만들기']
    };

    const categoryDisplayNames: { [key: string]: string } = {
      tour: '투어',
      stay: '숙박',
      accommodation: '숙박',
      rentcar: '캠핑카',
      food: '음식',
      attraction: '관광지',
      package: '패키지',
      event: '팝업/행사',
      experience: '체험'
    };

    return Array.from({ length: 12 }, (_, i) => ({
      id: `${cat}_${i + 1}`,
      title: sampleTitles[cat]?.[i % 5] || `${categoryDisplayNames[cat] || '상품'} ${i + 1}`,
      category: cat,
      price: Math.floor(Math.random() * 100000) + 20000,
      rating: 4.0 + Math.random() * 1,
      reviewCount: Math.floor(Math.random() * 200) + 10,
      image: sampleImages[cat as keyof typeof sampleImages],
      description: `신안의 아름다운 ${categoryNames[cat]}을(를) 경험해보세요. 특별한 추억을 만들어드립니다.`,
      duration: cat === 'tour' ? `${Math.floor(Math.random() * 8) + 1}시간` : undefined,
      location: '신안군',
      isPartner: Math.random() > 0.3,
      isSponsor: Math.random() > 0.7,
      partnerName: `신안${categoryNames[cat]}업체`
    }));
  };

  // 필터링된 상품 목록
  const filteredAndSortedListings = listings;

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredAndSortedListings.map((item) => (
        <Card
          key={item.id}
          className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
          onClick={() => navigate(`/detail/${item.id}`)}
        >
          <div className="relative">
            <ImageWithFallback
              src={item.image}
              alt={item.title}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-2 left-2 flex gap-1">
              {item.isPartner && (
                <Badge variant="secondary" className="bg-blue-500 text-white text-xs">
                  Verified
                </Badge>
              )}
              {item.isSponsor && (
                <Badge variant="secondary" className="bg-yellow-500 text-black text-xs">
                  스폰서
                </Badge>
              )}
            </div>
            <div className="absolute top-2 right-2 flex gap-1">
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-white/80 hover:bg-white">
                <Heart className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-white/80 hover:bg-white">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardContent className="p-4">
            <h3 className="mb-2 line-clamp-2">{item.title}</h3>
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
            
            <div className="flex items-center space-x-2 mb-2 text-sm text-gray-500">
              <MapPin className="h-4 w-4" />
              <span>{item.location}</span>
              {item.duration && (
                <>
                  <Clock className="h-4 w-4 ml-2" />
                  <span>{item.duration}</span>
                </>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm">{item.rating.toFixed(1)}</span>
                <span className="text-xs text-gray-500">({item.reviewCount})</span>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">부터</div>
                <div className="text-lg text-blue-600">{formatPrice(item.price, selectedCurrency)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-4">
      {filteredAndSortedListings.map((item) => (
        <Card
          key={item.id}
          className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate(`/detail/${item.id}`)}
        >
          <CardContent className="p-4">
            <div className="flex space-x-4">
              <div className="relative w-32 h-24 flex-shrink-0">
                <ImageWithFallback
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover rounded"
                />
                <div className="absolute top-1 left-1 flex gap-1">
                  {item.isPartner && (
                    <Badge variant="secondary" className="bg-blue-500 text-white text-xs">
                      Verified
                    </Badge>
                  )}
                  {item.isSponsor && (
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
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                
                <div className="flex items-center space-x-4 mb-2 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{item.location}</span>
                  </div>
                  {item.duration && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{item.duration}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{item.rating.toFixed(1)}</span>
                    <span className="text-gray-400">({item.reviewCount})</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-end">
                  <div className="text-sm text-gray-500">
                    {item.partnerName}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">부터</div>
                    <div className="text-xl text-blue-600">{formatPrice(item.price, selectedCurrency)}</div>
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl mb-2">{categoryNames[category || ''] || '전체 상품'}</h1>
          <p className="text-gray-600">{filteredAndSortedListings.length}개의 상품을 찾았습니다</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-6 mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm mb-2">정렬</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">추천순</SelectItem>
                  <SelectItem value="price-low">가격 낮은순</SelectItem>
                  <SelectItem value="price-high">가격 높은순</SelectItem>
                  <SelectItem value="rating">평점순</SelectItem>
                  <SelectItem value="newest">최신순</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm mb-2">가격대</label>
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="0-50000">5만원 이하</SelectItem>
                  <SelectItem value="50000-100000">5-10만원</SelectItem>
                  <SelectItem value="100000-200000">10-20만원</SelectItem>
                  <SelectItem value="200000">20만원 이상</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm mb-2">업체 유형</label>
              <Select value={partnerFilter} onValueChange={setPartnerFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="partner">파트너업체만</SelectItem>
                  <SelectItem value="sponsor">스폰서우선</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="flex-1"
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                그리드
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="flex-1"
              >
                <List className="h-4 w-4 mr-2" />
                리스트
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="w-full h-48 bg-gray-200"></div>
                <CardContent className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : viewMode === 'grid' ? (
          renderGridView()
        ) : (
          renderListView()
        )}

        {filteredAndSortedListings.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">조건에 맞는 상품이 없습니다</div>
            <Button onClick={() => {
              setSortBy('recommended');
              setPriceRange('all');
              setPartnerFilter('all');
            }}>
              필터 초기화
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { api } from '../utils/api';
import {
  MapPin,
  Star,
  ShoppingCart,
  Heart,
  Search,
  Filter,
  Package,
  Gift,
  Sparkles,
  Camera,
  Anchor,
  Fish,
  Waves,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface PlaceGoods {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  location: string;
  island: string;
  rating: number;
  reviewCount: number;
  tags: string[];
  isSpecial: boolean;
  stock: number;
  seller: string;
}

const ISLANDS = [
  '증도', '임자도', '자은도', '암태도', '안좌도', '팔금도', '비금도', '도초도',
  '흑산도', '홍도', '하의도', '신의도', '장산도', '하태도'
];

const CATEGORIES = [
  { id: 'all', name: '전체', icon: Package },
  { id: 'food', name: '특산음식', icon: Fish },
  { id: 'craft', name: '전통공예', icon: Gift },
  { id: 'souvenir', name: '기념품', icon: Camera },
  { id: 'salt', name: '천일염', icon: Sparkles },
  { id: 'seafood', name: '해산물', icon: Waves },
  { id: 'accessory', name: '액세서리', icon: Heart }
];

// 샘플 데이터
const SAMPLE_GOODS: PlaceGoods[] = [
  {
    id: '1',
    name: '증도 천일염 선물세트',
    description: '유네스코 생물권보전지역 증도에서 생산된 프리미엄 천일염으로 만든 특별한 선물세트입니다.',
    price: 45000,
    originalPrice: 55000,
    images: ['/api/placeholder/400/300', '/api/placeholder/400/301'],
    category: 'salt',
    location: '증도면',
    island: '증도',
    rating: 0,
    reviewCount: 0,
    tags: ['프리미엄', '선물용', '유네스코'],
    isSpecial: true,
    stock: 50,
    seller: '증도염전협동조합'
  },
  {
    id: '2',
    name: '신안 젓갈 명품세트',
    description: '신안 갯벌에서 잡은 신선한 새우와 조기로 만든 전통 젓갈 3종 세트입니다.',
    price: 38000,
    originalPrice: 45000,
    images: ['/api/placeholder/400/302', '/api/placeholder/400/303'],
    category: 'food',
    location: '전 지역',
    island: '신안군',
    rating: 0,
    reviewCount: 0,
    tags: ['전통', '갯벌', '명품'],
    isSpecial: true,
    stock: 30,
    seller: '신안수산'
  },
  {
    id: '3',
    name: '홍도 자연염색 스카프',
    description: '홍도의 아름다운 자연에서 영감을 받아 천연 염료로 염색한 실크 스카프입니다.',
    price: 85000,
    images: ['/api/placeholder/400/304', '/api/placeholder/400/305'],
    category: 'accessory',
    location: '홍도면',
    island: '홍도',
    rating: 0,
    reviewCount: 0,
    tags: ['자연염색', '수제', '실크'],
    isSpecial: false,
    stock: 20,
    seller: '홍도공방'
  },
  {
    id: '4',
    name: '흑산도 전복 특산품',
    description: '청정 바다 흑산도에서 자란 싱싱한 전복을 가공한 프리미엄 건어물입니다.',
    price: 120000,
    originalPrice: 140000,
    images: ['/api/placeholder/400/306', '/api/placeholder/400/307'],
    category: 'seafood',
    location: '흑산면',
    island: '흑산도',
    rating: 0,
    reviewCount: 0,
    tags: ['전복', '프리미엄', '건어물'],
    isSpecial: true,
    stock: 15,
    seller: '흑산도수산'
  },
  {
    id: '5',
    name: '암태도 전통 소창 가방',
    description: '암태도 할머니들이 손수 만든 전통 소창 천으로 제작한 친환경 에코백입니다.',
    price: 25000,
    images: ['/api/placeholder/400/308', '/api/placeholder/400/309'],
    category: 'craft',
    location: '암태면',
    island: '암태도',
    rating: 0,
    reviewCount: 0,
    tags: ['전통', '수제', '친환경'],
    isSpecial: false,
    stock: 40,
    seller: '암태도전통공방'
  },
  {
    id: '6',
    name: '자은도 해조류 건강세트',
    description: '자은도 청정해역에서 자란 미역, 다시마, 김 등을 모은 건강 해조류 세트입니다.',
    price: 32000,
    originalPrice: 38000,
    images: ['/api/placeholder/400/310', '/api/placeholder/400/311'],
    category: 'seafood',
    location: '자은면',
    island: '자은도',
    rating: 0,
    reviewCount: 0,
    tags: ['건강', '해조류', '청정'],
    isSpecial: false,
    stock: 60,
    seller: '자은도어민회'
  }
];

export function PlaceGoodsPage() {
  const navigate = useNavigate();
  const [goods, setGoods] = useState<PlaceGoods[]>([]);
  const [filteredGoods, setFilteredGoods] = useState<PlaceGoods[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIsland, setSelectedIsland] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cart, setCart] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // DB에서 상품 데이터 가져오기
  useEffect(() => {
    const fetchGoods = async () => {
      try {
        setLoading(true);
        const response = await api.getListings({ limit: 100 });

        // DB 데이터를 PlaceGoods 형식으로 변환
        const convertedGoods: PlaceGoods[] = response.data.map((item: any) => ({
          id: item.id.toString(),
          name: item.title,
          description: item.short_description || '',
          price: item.price_from || 0,
          originalPrice: item.original_price,
          images: item.images || [],
          category: 'food', // 기본 카테고리
          location: item.location || '신안군',
          island: item.location?.includes('증도') ? '증도' :
                 item.location?.includes('임자') ? '임자도' :
                 item.location?.includes('자은') ? '자은도' :
                 item.location?.includes('비금') ? '비금도' :
                 item.location?.includes('도초') ? '도초도' :
                 item.location?.includes('흑산') ? '흑산도' :
                 item.location?.includes('홍도') ? '홍도' : '신안군',
          rating: item.rating_avg || 0,
          reviewCount: item.rating_count || 0,
          tags: item.tags || [],
          isSpecial: item.is_featured || false,
          stock: 50,
          seller: item.partner?.business_name || '신안특산품'
        }));

        setGoods(convertedGoods);
        setFilteredGoods(convertedGoods);
      } catch (error) {
        console.error('Failed to fetch goods:', error);
        setGoods([]);
        setFilteredGoods([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGoods();
  }, []);

  // 필터링 및 정렬
  useEffect(() => {
    let filtered = goods;

    // 카테고리 필터
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // 지역 필터
    if (selectedIsland !== 'all') {
      filtered = filtered.filter(item => item.island === selectedIsland);
    }

    // 검색 필터
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // 정렬
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        // 실제로는 created_at으로 정렬
        break;
    }

    setFilteredGoods(filtered);
  }, [goods, selectedCategory, selectedIsland, searchQuery, sortBy]);

  const handleAddToCart = (goodsId: string) => {
    setCart(prev => [...prev, goodsId]);
    toast.success('장바구니에 추가되었습니다!');
  };

  const handleToggleFavorite = (goodsId: string) => {
    setFavorites(prev =>
      prev.includes(goodsId)
        ? prev.filter(id => id !== goodsId)
        : [...prev, goodsId]
    );
    toast.success(favorites.includes(goodsId) ? '찜 목록에서 제거되었습니다' : '찜 목록에 추가되었습니다');
  };

  const handleGoodsClick = (goodsId: string) => {
    navigate(`/place-goods/${goodsId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 섹션 */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="text-center">
            <div className="flex justify-center items-center mb-4">
              <Gift className="h-12 w-12 mr-3" />
              <h1 className="text-3xl md:text-5xl font-bold">플레이스 굿즈</h1>
            </div>
            <p className="text-lg md:text-xl mb-6 opacity-90">
              각 여행지에 해당되는 특별한 굿즈와 상품을 만나보세요
            </p>
            <p className="text-base md:text-lg opacity-80">
              신안의 1,004개 섬마다 숨겨진 특산품과 전통 공예품을 발견하세요
            </p>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 섹션 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 검색 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="상품 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* 카테고리 필터 */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 지역 필터 */}
              <Select value={selectedIsland} onValueChange={setSelectedIsland}>
                <SelectTrigger>
                  <SelectValue placeholder="섬 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 지역</SelectItem>
                  {ISLANDS.map(island => (
                    <SelectItem key={island} value={island}>
                      {island}
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
                  <SelectItem value="popular">인기순</SelectItem>
                  <SelectItem value="newest">최신순</SelectItem>
                  <SelectItem value="price-low">가격 낮은순</SelectItem>
                  <SelectItem value="price-high">가격 높은순</SelectItem>
                  <SelectItem value="rating">평점순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 카테고리 태그 */}
      <div className="max-w-7xl mx-auto px-4 pb-6">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(category => {
            const Icon = category.icon;
            return (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                {category.name}
              </Button>
            );
          })}
        </div>
      </div>

      {/* 상품 목록 */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {selectedCategory === 'all' ? '전체 상품' : CATEGORIES.find(c => c.id === selectedCategory)?.name}
            <span className="text-gray-500 text-base ml-2">({filteredGoods.length}개)</span>
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
            <p className="text-gray-600">상품 정보를 불러오는 중...</p>
          </div>
        ) : filteredGoods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package className="h-16 w-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">등록된 상품이 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredGoods.map(item => (
            <Card
              key={item.id}
              className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
              onClick={() => handleGoodsClick(item.id)}
            >
              <div className="relative">
                <div className="w-full h-48 bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 rounded-t-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📦</div>
                    <div className="text-sm text-gray-600">이미지 준비중</div>
                  </div>
                </div>
                {item.isSpecial && (
                  <Badge className="absolute top-2 left-2 bg-red-500">
                    <Sparkles className="h-3 w-3 mr-1" />
                    특별상품
                  </Badge>
                )}
                {item.originalPrice && (
                  <Badge className="absolute top-2 right-2 bg-green-500">
                    {Math.round((1 - item.price / item.originalPrice) * 100)}% 할인
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(item.id);
                  }}
                >
                  <Heart
                    className={`h-4 w-4 ${favorites.includes(item.id) ? 'fill-red-500 text-red-500' : ''}`}
                  />
                </Button>
              </div>

              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{item.island}</span>
                  <Badge variant="outline" className="text-xs">
                    {CATEGORIES.find(c => c.id === item.category)?.name}
                  </Badge>
                </div>

                <h3 className="font-semibold text-lg mb-2 line-clamp-2">{item.name}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>

                <div className="flex items-center mb-3 space-x-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{item.rating.toFixed(1)}</span>
                  <span className="text-xs text-gray-500">({item.reviewCount})</span>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {item.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    {item.originalPrice && (
                      <span className="text-sm text-gray-500 line-through">
                        {item.originalPrice.toLocaleString()}원
                      </span>
                    )}
                    <div className="text-lg font-bold text-purple-600">
                      {item.price.toLocaleString()}원
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(item.id);
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    담기
                  </Button>
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  판매자: {item.seller} | 재고: {item.stock}개
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        )}
      </div>

      {/* 특별 섹션 */}
      <div className="bg-gradient-to-r from-purple-100 to-blue-100 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">신안만의 특별한 경험</h2>
            <p className="text-gray-600">
              천년의 역사와 전통이 살아 숨쉬는 신안에서만 만날 수 있는 특별한 상품들
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center p-6">
              <Anchor className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">전통 제조법</h3>
              <p className="text-gray-600">
                수백 년간 전해 내려온 전통 제조법으로 만든 authentic한 상품들
              </p>
            </Card>

            <Card className="text-center p-6">
              <Waves className="h-12 w-12 text-teal-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">청정 자연</h3>
              <p className="text-gray-600">
                유네스코 생물권보전지역의 청정한 자연환경에서 자란 프리미엄 재료
              </p>
            </Card>

            <Card className="text-center p-6">
              <Heart className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">정성과 사랑</h3>
              <p className="text-gray-600">
                신안 주민들의 정성과 사랑이 담긴 수제 상품들
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
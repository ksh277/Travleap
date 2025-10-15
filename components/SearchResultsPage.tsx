import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Slider } from './ui/slider';
import {
  MapPin,
  Calendar,
  Filter,
  LayoutGrid,
  List,
  Heart,
  Share2,
  Clock,
  Eye,
  Search,
  SlidersHorizontal,
  Star,
  Users,
  DollarSign,
  TrendingUp,
  X
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { api } from '../utils/api';


interface SearchResultsPageProps {}

interface SearchResult {
  id: string;
  title: string;
  type: 'blog' | 'tour' | 'accommodation' | 'experience';
  image: string;
  description: string;
  excerpt: string;
  date: string;
  readTime: string;
  views: number;
  author: string;
  location: string;
  tags: string[];
  price?: number;
  rating?: number;
  reviewCount?: number;
}

export function SearchResultsPage({}: SearchResultsPageProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const searchQuery = searchParams.get('q') || '';
  const searchFilters = {
    destination: searchParams.get('destination'),
    dateRange: searchParams.get('dateRange'),
    guests: searchParams.get('guests') ? Number(searchParams.get('guests')) : undefined,
    priceMin: searchParams.get('priceMin'),
    priceMax: searchParams.get('priceMax'),
    minRating: searchParams.get('minRating'),
    partnersOnly: searchParams.get('partnersOnly') === 'true',
    sponsorFirst: searchParams.get('sponsorFirst') === 'true'
  };
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Enhanced search and filter state
  const [currentSearchQuery, setCurrentSearchQuery] = useState(searchQuery);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'rating' | 'price' | 'popularity'>('relevance');
  const [filterType, setFilterType] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<number[]>([0, 500000]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Favorites and personal features
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);

  // 샘플 검색 결과 데이터 (세 번째가 첫 번째, 첫 번째가 두 번째, 두 번째가 세 번째 순으로)
  const sampleResults: SearchResult[] = [
    {
      id: '3',
      title: 'Pure Luxe in Punta Mita',
      type: 'blog',
      image: 'https://images.unsplash.com/photo-1722114455046-fadfe53a0f92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBiZWFjaCUyMHJlc29ydCUyMHB1bnRhJTIwbWl0YXxlbnwxfHx8fDE3NTc2MDkzMjR8MA&ixlib=rb-4.1.0&q=80&w=1080',
      description: 'On the Travel Talk, the galleries include items that are designed to coordinate with the overall look of your document. You can use these galleries to insert tables, headers, footers, lists, cover pages, and other document building blocks. When you create pictures, charts, or diagrams, they also coordinate with your current document look. You can [...]',
      excerpt: '럭셔리한 푼타 미타에서의 완벽한 휴가를 경험해보세요.',
      date: '21 08 02, 2024 4:43',
      readTime: '5분',
      views: 1840,
      author: 'Travel Writer',
      location: '신안군',
      tags: ['Travel', 'Beach', 'Luxury', 'Resort', 'Mexico', 'Vacation', 'Premium', 'Ocean', 'Paradise']
    },
    {
      id: '1', 
      title: 'All Aboard the Rocky Mountaineer',
      type: 'blog',
      image: 'https://images.unsplash.com/photo-1602690106746-5bca21ceb23b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyb2NreSUyMG1vdW50YWluJTIwdHJhaW4lMjBzY2VuaWMlMjByYWlsd2F5fGVufDF8fHx8MTc1NzYwOTMyOHww&ixlib=rb-4.1.0&q=80&w=1080',
      description: 'On the Travel Talk, the galleries include items that are designed to coordinate with the overall look of your document. You can use these galleries to insert tables, headers, footers, lists, cover pages, and other document building blocks. When you create pictures, charts, or diagrams, they also coordinate with your current document look. You can [...]',
      excerpt: '록키 마운틴을 가로지르는 장관의 기차 여행을 떠나보세요.',
      date: '18 08 02, 2024 4:42',
      readTime: '7분',
      views: 2340,
      author: 'Railway Explorer',
      location: '신안군',
      tags: ['Travel', 'Train', 'Mountain', 'Scenic', 'Adventure']
    },
    {
      id: '2',
      title: 'Tiptoe through the Tulips of Washington',
      type: 'blog', 
      image: 'https://images.unsplash.com/photo-1744667438553-040577456d82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0dWxpcCUyMGZsb3dlcnMlMjB3YXNoaW5ndG9uJTIwc3ByaW5nJTIwZ2FyZGVufGVufDF8fHx8MTc1NzYwOTMzMXww&ixlib=rb-4.1.0&q=80&w=1080',
      description: 'On the Travel Talk, the galleries include items that are designed to coordinate with the overall look of your document. You can use these galleries to insert tables, headers, footers, lists, cover pages, and other document building blocks. When you create pictures, charts, or diagrams, they also coordinate with your current document look. You can [...]',
      excerpt: '워싱턴의 아름다운 튤립 정원에서 봄의 향기를 느껴보세요.',
      date: '15 08 02, 2024 4:38',
      readTime: '4분',
      views: 1560,
      author: 'Flower Enthusiast', 
      location: '신안군',
      tags: ['Flowers', 'Spring', 'Garden', 'Washington', 'Blooms']
    }
  ];

  useEffect(() => {
    if (searchQuery) {
      searchItems();
    }
  }, [searchQuery, searchParams]);

  const searchItems = async () => {
    setLoading(true);
    try {
      // 실제 데이터베이스에서 검색
      const items = await api.searchListings(searchQuery, searchFilters);

      if (items && items.length > 0) {
        // DB 결과를 검색 결과 형식으로 변환
        const searchResults: SearchResult[] = items.map(item => ({
          id: item.id.toString(),
          title: item.title,
          type: item.category as 'tour' | 'accommodation' | 'experience' | 'blog',
          image: Array.isArray(item.images) ? item.images[0] : (item.images || 'https://via.placeholder.com/400x300'),
          description: item.short_description || '',
          excerpt: item.short_description || '',
          date: new Date(item.created_at).toLocaleDateString('ko-KR'),
          readTime: item.duration || '2시간',
          views: Math.floor(Math.random() * 3000) + 100, // 임시값
          author: '신안관광협회',
          location: item.location || '신안군',
          tags: [item.category, '신안', '여행'],
          price: item.price_from || 0,
          rating: item.rating_avg,
          reviewCount: item.rating_count
        }));

        setResults(searchResults);
      } else {
        console.log('⚠️ 검색 결과 없음, fallback 데이터 사용');
        // 검색어에 따라 샘플 데이터 필터링
        let filteredResults = sampleResults;

        if (searchQuery) {
          filteredResults = sampleResults.filter(result =>
            result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            result.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            result.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
          );
        }

        setResults(filteredResults);
      }
    } catch (error) {
      console.error('Search error:', error);
      // 오류 시 샘플 데이터 사용
      const filteredResults = sampleResults.filter(result =>
        result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setResults(filteredResults);
    } finally {
      setLoading(false);
    }
  };

  const formatViews = (views: number) => {
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}k`;
    }
    return views.toString();
  };

  const renderBlogPost = (result: SearchResult, isFirst: boolean = false) => (
    <article 
      key={result.id}
      className={`cursor-pointer hover:shadow-lg transition-shadow ${
        isFirst ? 'mb-12' : 'mb-8'
      }`}
      onClick={() => navigate(`/detail/${result.id}`)}
    >
      {/* 첫 번째 포스트에만 블로그 타이틀 */}
      {isFirst && (
        <div className="mb-8">
          <h1 className="text-4xl tracking-wide text-gray-800">블로그</h1>
        </div>
      )}
      
      <div className="bg-white rounded-lg overflow-hidden shadow-sm">
        {/* 이미지 */}
        <div className="relative w-full h-[400px]">
          <ImageWithFallback
            src={result.image}
            alt={result.title}
            className="w-full h-full object-cover"
          />
          {/* 이미지 오버레이 버튼들 */}
          <div className="absolute top-4 right-4 flex gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0 bg-white/80 hover:bg-white rounded-full"
            >
              <Heart className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0 bg-white/80 hover:bg-white rounded-full"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="p-6">
          {/* 제목 */}
          <h2 className="text-2xl mb-4 text-gray-800 hover:text-[#A8A8D8] transition-colors">
            {result.title}
          </h2>

          {/* 메타 정보 */}
          <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{result.date}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{result.readTime} 읽기</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{formatViews(result.views)} views</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{result.location}</span>
            </div>
          </div>

          {/* 설명 */}
          <p className="text-gray-600 leading-relaxed mb-4 line-clamp-3">
            {result.description}
            <span className="text-[#A8A8D8] ml-1 cursor-pointer hover:underline">
              더 읽기
            </span>
          </p>

          {/* 태그들 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {result.tags.map((tag, index) => (
              <Badge 
                key={index}
                variant="secondary" 
                className="bg-[#ff6a3d] text-white text-xs px-2 py-1 hover:bg-[#e5582b] transition-colors cursor-pointer"
              >
                {tag}
              </Badge>
            ))}
          </div>

          {/* 더보기 버튼 */}
          <Button
            variant="outline"
            className="border-[#A8A8D8] text-[#A8A8D8] hover:bg-[#A8A8D8] hover:text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/detail/${result.id}`);
            }}
          >
            자세히 보기
          </Button>
        </div>
      </div>
    </article>
  );

  // 검색어나 필터가 없는 경우 처리
  if (!searchQuery && !Object.values(searchFilters).some(value => value)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl mb-4">검색어를 입력해주세요</h2>
          <Button onClick={() => navigate('/')}>홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 mobile-safe-bottom">
      {/* 페이지 헤더 */}
      <div className="bg-[#A8A8D8] py-6 md:py-8 mobile-safe-top">
        <div className="w-full px-[60px]">
          <div className="text-center text-white">
            <h1 className="text-3xl mb-2">
              {searchQuery ? `"${searchQuery}" 검색 결과` : '검색 결과'}
            </h1>
            <p className="text-lg opacity-90">
              {results.length}개의 결과를 찾았습니다
            </p>
            {searchFilters?.destination && (
              <p className="text-sm opacity-80 mt-2">
                목적지: {searchFilters.destination} | 체크인: {searchFilters.dateRange} | 게스트: {searchFilters.guests}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="w-full px-[60px] py-8">
          {/* 필터 및 정렬 옵션 */}
          <div className="flex items-center justify-between mb-8 p-4 bg-white rounded-lg shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">필터:</span>
              </div>
              <Badge variant="outline" className="text-[#A8A8D8] border-[#A8A8D8]">
                블로그 포스트
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-[#A8A8D8] hover:bg-[#9090c8]' : ''}
              >
                <List className="h-4 w-4 mr-2" />
                리스트
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-[#A8A8D8] hover:bg-[#9090c8]' : ''}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                그리드
              </Button>
            </div>
          </div>

          {/* 검색 결과 */}
          {loading ? (
            <div className="space-y-8">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="w-full h-[400px] bg-gray-200"></div>
                  <CardContent className="p-6 space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {results.map((result, index) => (
                renderBlogPost(result, index === 0)
              ))}
            </div>
          )}

          {/* 더 보기 버튼 */}
          {!loading && results.length > 0 && (
            <div className="text-center mt-12">
              <Button 
                variant="outline" 
                size="lg"
                className="border-[#A8A8D8] text-[#A8A8D8] hover:bg-[#A8A8D8] hover:text-white"
              >
                더 많은 결과 보기
              </Button>
            </div>
          )}

          {/* 결과 없음 */}
          {!loading && results.length === 0 && (
            <div className="text-center py-16">
              <div className="text-gray-500 mb-4 text-lg">
                {searchQuery ? '검색 결과를 찾을 수 없습니다' : '검색어를 입력해주세요'}
              </div>
              <p className="text-gray-400 mb-6">
                {searchQuery ? '다른 검색어를 시도해보세요' : '검색어를 입력하여 상품을 찾아보세요'}
              </p>
              <Button
                onClick={() => navigate('/')}
                className="bg-[#A8A8D8] hover:bg-[#9090c8] text-white"
              >
                홈으로 돌아가기
              </Button>
            </div>
          )}
      </div>
    </div>
  );
}
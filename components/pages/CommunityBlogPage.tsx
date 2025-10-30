import React, { useState } from 'react';
import { Search, TrendingUp, Calendar, User, ArrowRight, Tag, Clock } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
  tags: string[];
  views: number;
  featured?: boolean;
}

const MOCK_POSTS: BlogPost[] = [
  {
    id: 1,
    title: '신안의 숨겨진 보석, 1004개의 섬을 탐험하다',
    excerpt: '전라남도 신안군은 1004개의 섬으로 이루어진 아름다운 지역입니다. 각 섬마다 고유한 매력을 지니고 있으며, 봄부터 가을까지 최적의 여행 시즌을 제공합니다.',
    category: '여행 팁',
    author: '어썸플랜 에디터',
    date: '2025-01-15',
    readTime: '5분',
    image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop',
    tags: ['신안', '섬여행', '국내여행'],
    views: 2453,
    featured: true
  },
  {
    id: 2,
    title: '겨울 여행자를 위한 필수 준비물 체크리스트',
    excerpt: '겨울철 안전하고 즐거운 여행을 위해 꼭 챙겨야 할 아이템들을 정리했습니다. 의류부터 비상용품까지 완벽하게 준비하세요.',
    category: '여행 팁',
    author: '김여행',
    date: '2025-01-10',
    readTime: '4분',
    image: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=800&h=600&fit=crop',
    tags: ['겨울여행', '준비물', '팁'],
    views: 1832
  },
  {
    id: 3,
    title: '새로운 포인트 등급제 도입 안내',
    excerpt: 'Travleap이 새롭게 선보이는 5단계 포인트 등급제를 소개합니다. 더 많은 혜택과 리워드를 경험하세요.',
    category: '업데이트',
    author: '어썸플랜',
    date: '2025-01-08',
    readTime: '3분',
    image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop',
    tags: ['포인트', '등급제', '혜택'],
    views: 3241
  },
  {
    id: 4,
    title: '2월 설 연휴 특별 할인 이벤트',
    excerpt: '설 연휴를 맞아 숙박, 렌터카, 투어 상품 최대 30% 할인 혜택을 제공합니다. 지금 바로 예약하세요!',
    category: '이벤트',
    author: '이벤트팀',
    date: '2025-01-05',
    readTime: '2분',
    image: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&h=600&fit=crop',
    tags: ['설연휴', '할인', '이벤트'],
    views: 4521
  },
  {
    id: 5,
    title: '현지인이 추천하는 신안 맛집 BEST 10',
    excerpt: '신안 지역 주민들이 직접 추천하는 숨은 맛집을 소개합니다. 신선한 해산물부터 전통 음식까지 다양하게 즐기세요.',
    category: '스토리',
    author: '푸드 에디터',
    date: '2025-01-03',
    readTime: '6분',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop',
    tags: ['맛집', '신안', '음식'],
    views: 2918
  },
  {
    id: 6,
    title: '친환경 여행 실천하기: 지속 가능한 관광의 시작',
    excerpt: '우리의 아름다운 섬을 보호하면서 여행하는 방법을 알아봅니다. 작은 실천이 큰 변화를 만듭니다.',
    category: '스토리',
    author: '환경팀',
    date: '2024-12-28',
    readTime: '5분',
    image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&h=600&fit=crop',
    tags: ['친환경', '지속가능성', '환경'],
    views: 1654
  }
];

const CATEGORIES = ['전체', '여행 팁', '업데이트', '이벤트', '스토리'];

export function CommunityBlogPage() {
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = MOCK_POSTS.filter(post => {
    const matchesCategory = selectedCategory === '전체' || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const featuredPost = MOCK_POSTS.find(post => post.featured);
  const popularPosts = [...MOCK_POSTS].sort((a, b) => b.views - a.views).slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Travleap 블로그
            </h1>
            <p className="text-lg md:text-xl text-purple-100 mb-8">
              여행의 영감을 찾고, 유용한 정보를 얻고, 특별한 이야기를 공유하세요
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="검색어를 입력하세요..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 h-14 text-base bg-white/95 backdrop-blur-sm border-0 shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300'}
                >
                  {category}
                </Button>
              ))}
            </div>

            {/* Featured Post */}
            {selectedCategory === '전체' && featuredPost && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all group border border-gray-100">
                <div className="relative h-80 overflow-hidden">
                  <img
                    src={featuredPost.image}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-purple-600 text-white border-0">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      인기 포스트
                    </Badge>
                  </div>
                </div>
                <div className="p-8">
                  <Badge variant="secondary" className="mb-3">
                    {featuredPost.category}
                  </Badge>
                  <h2 className="text-3xl font-bold mb-4 group-hover:text-purple-600 transition-colors">
                    {featuredPost.title}
                  </h2>
                  <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                    {featuredPost.excerpt}
                  </p>

                  <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {featuredPost.author}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(featuredPost.date).toLocaleDateString('ko-KR')}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {featuredPost.readTime}
                      </div>
                    </div>
                    <Button variant="ghost" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                      자세히 보기
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Blog Post Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPosts.map((post) => (
                post.id !== featuredPost?.id && (
                  <div
                    key={post.id}
                    className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all group border border-gray-100"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3">
                        <Badge variant="secondary" className="bg-white/95 backdrop-blur-sm">
                          {post.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-3 group-hover:text-purple-600 transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>

                      <div className="flex flex-wrap gap-1 mb-4">
                        {post.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(post.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {post.readTime}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 -mr-2">
                          읽기
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>

            {filteredPosts.length === 0 && (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg">검색 결과가 없습니다.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Popular Posts */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-bold">인기 포스트</h3>
              </div>
              <div className="space-y-4">
                {popularPosts.map((post, index) => (
                  <div
                    key={post.id}
                    className="flex gap-4 group cursor-pointer pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-1 group-hover:text-purple-600 transition-colors line-clamp-2">
                        {post.title}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{post.views.toLocaleString()} 조회</span>
                        <span>•</span>
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Newsletter */}
            <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-md p-6 text-white">
              <h3 className="text-lg font-bold mb-2">뉴스레터 구독</h3>
              <p className="text-purple-100 text-sm mb-4">
                최신 여행 정보와 특별 혜택을 이메일로 받아보세요
              </p>
              <Input
                type="email"
                placeholder="이메일 주소"
                className="mb-3 bg-white/10 border-white/20 text-white placeholder:text-purple-200"
              />
              <Button className="w-full bg-white text-purple-600 hover:bg-purple-50">
                구독하기
              </Button>
            </div>

            {/* Categories Stats */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h3 className="text-lg font-bold mb-4">카테고리별 글</h3>
              <div className="space-y-3">
                {CATEGORIES.filter(cat => cat !== '전체').map((category) => {
                  const count = MOCK_POSTS.filter(post => post.category === category).length;
                  return (
                    <div
                      key={category}
                      className="flex items-center justify-between text-sm cursor-pointer hover:text-purple-600 transition-colors"
                      onClick={() => setSelectedCategory(category)}
                    >
                      <span>{category}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

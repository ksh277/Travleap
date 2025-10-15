import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Calendar, User, Tag, ChevronRight, Filter } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { api } from '../utils/api';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  author: string;
  author_id: number;
  category: string;
  tags: string[];
  published_date: string;
  event_start_date?: string;
  event_end_date?: string;
  view_count: number;
  is_featured: boolean;
  is_published: boolean;
}

export default function BlogListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [selectedTag, setSelectedTag] = useState(searchParams.get('tag') || '');
  const startDate = searchParams.get('checkin') || searchParams.get('startDate') || '';
  const endDate = searchParams.get('checkout') || searchParams.get('endDate') || '';

  const categories = ['all', '여행 팁', '맛집', '관광지', '숙박', '액티비티', '문화'];
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory, selectedTag, searchQuery, startDate, endDate]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      // TODO: API 연결 시 실제 데이터로 교체
      const response = await api.getBlogPosts({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        tag: selectedTag || undefined,
        search: searchQuery || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });

      if (response?.success && response.data) {
        setPosts(response.data);

        // Extract all unique tags
        const tags = new Set<string>();
        response.data.forEach((post: BlogPost) => {
          post.tags?.forEach(tag => tags.add(tag));
        });
        setAllTags(Array.from(tags));
      } else {
        // Sample data for testing
        setPosts(getMockPosts());
      }
    } catch (error) {
      console.error('블로그 포스트 로딩 실패:', error);
      setPosts(getMockPosts());
    } finally {
      setLoading(false);
    }
  };

  const getMockPosts = (): BlogPost[] => {
    return [
      {
        id: 1,
        title: '신안 퍼플섬 여행 가이드',
        slug: 'purple-island-guide',
        excerpt: '신안의 숨은 보석, 퍼플섬에서의 완벽한 하루를 보내는 방법',
        content: '',
        featured_image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
        author: '트래블립',
        author_id: 1,
        category: '관광지',
        tags: ['퍼플섬', '섬여행', '포토스팟'],
        published_date: '2025-10-01',
        view_count: 1250,
        is_featured: true,
        is_published: true
      },
      {
        id: 2,
        title: '신안 맛집 베스트 10',
        slug: 'top-10-restaurants',
        excerpt: '신안에서 꼭 가봐야 할 맛집 리스트',
        content: '',
        featured_image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop',
        author: '트래블립',
        author_id: 1,
        category: '맛집',
        tags: ['맛집', '해산물', '로컬맛집'],
        published_date: '2025-09-28',
        view_count: 890,
        is_featured: false,
        is_published: true
      },
      {
        id: 3,
        title: '신안 1박 2일 완벽 코스',
        slug: 'two-day-itinerary',
        excerpt: '신안을 처음 방문하는 여행객을 위한 완벽한 1박 2일 코스',
        content: '',
        featured_image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=600&fit=crop',
        author: '트래블립',
        author_id: 1,
        category: '여행 팁',
        tags: ['여행코스', '1박2일', '초보여행자'],
        published_date: '2025-09-25',
        view_count: 1560,
        is_featured: true,
        is_published: true
      }
    ];
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    const newParams = new URLSearchParams(searchParams);
    if (category === 'all') {
      newParams.delete('category');
    } else {
      newParams.set('category', category);
    }
    setSearchParams(newParams);
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tag', tag);
    setSearchParams(newParams);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchQuery) {
      newParams.set('search', searchQuery);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  const featuredPosts = posts.filter(post => post.is_featured).slice(0, 2);
  const regularPosts = posts.filter(post => !post.is_featured || !featuredPosts.includes(post));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">여행 블로그</h1>
          <p className="text-xl text-blue-100">신안의 모든 것을 알려드립니다</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <main className="lg:w-3/4 lg:order-1">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">로딩 중...</p>
              </div>
            ) : (
              <>
                {/* Featured Posts */}
                {featuredPosts.length > 0 && (
                  <div className="mb-12">
                    <h2 className="text-2xl font-bold mb-6">추천 포스트</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                      {featuredPosts.map((post) => (
                        <Card
                          key={post.id}
                          className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                          onClick={() => navigate(`/blog/${post.id}`)}
                        >
                          <div className="relative h-64">
                            <img
                              src={post.featured_image}
                              alt={post.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                              추천
                            </div>
                          </div>
                          <CardContent className="p-6">
                            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(post.published_date).toLocaleDateString('ko-KR')}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {post.author}
                              </span>
                            </div>
                            <h3 className="text-xl font-bold mb-2 hover:text-blue-600">
                              {post.title}
                            </h3>
                            <p className="text-gray-600 mb-4 line-clamp-2">{post.excerpt}</p>
                            <div className="flex flex-wrap gap-2">
                              {post.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-xs bg-gray-100 px-2 py-1 rounded"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regular Posts */}
                <div>
                  <h2 className="text-2xl font-bold mb-6">최신 포스트</h2>
                  {regularPosts.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center text-gray-500">
                        검색 결과가 없습니다.
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      {regularPosts.map((post) => (
                        <Card
                          key={post.id}
                          className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                          onClick={() => navigate(`/blog/${post.id}`)}
                        >
                          <div className="md:flex">
                            <div className="md:w-1/3 h-48 md:h-auto">
                              <img
                                src={post.featured_image}
                                alt={post.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <CardContent className="md:w-2/3 p-6">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                                  {post.category}
                                </span>
                              </div>
                              <h3 className="text-xl font-bold mb-2 hover:text-blue-600">
                                {post.title}
                              </h3>
                              <p className="text-gray-600 mb-4 line-clamp-2">{post.excerpt}</p>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {new Date(post.published_date).toLocaleDateString('ko-KR')}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <User className="h-4 w-4" />
                                    {post.author}
                                  </span>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                              </div>
                              <div className="flex flex-wrap gap-2 mt-4">
                                {post.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-xs bg-gray-100 px-2 py-1 rounded"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </CardContent>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </main>

          {/* Sidebar */}
          <aside className="lg:w-1/4 lg:order-2">
            {/* Search */}
            <Card className="mb-6 bg-gray-700">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-white">
                  <Search className="h-5 w-5" />
                  검색
                </h3>
                <form onSubmit={handleSearch}>
                  <div className="flex gap-2">
                    <Input
                      placeholder="블로그 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white"
                    />
                    <Button type="submit" size="sm">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Categories */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  카테고리
                </h3>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => handleCategoryClick(category)}
                      className={`w-full text-left px-3 py-2 rounded transition-colors ${
                        selectedCategory === category
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {category === 'all' ? '전체' : category}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            {allTags.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    태그
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleTagClick(tag)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          selectedTag === tag
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Calendar, User } from 'lucide-react';
import { api } from '../utils/api';
import { ImageWithFallback } from './figma/ImageWithFallback';

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
  const startDate = searchParams.get('checkin') || searchParams.get('startDate') || '';
  const endDate = searchParams.get('checkout') || searchParams.get('endDate') || '';

  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    fetchPosts();
  }, [searchQuery, startDate, endDate]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await api.getBlogPosts({
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
        title: '판타 미타의 퓨어 럭스',
        slug: 'pure-luxe-punta-mita',
        excerpt: '[신안] 당일 캠핑하에~ 6시간 전만완인 다잉인의 조롱을 이루모도 다잉인인 항하이 포함하이지 않습니다. 이러한 캠핑하에~ 8명의 사용자를 투투한 속도,(sollicitudin)은 투투한의 요소으로 대, 가격이 대만 두부뜰 요 대거로 아닙니다.',
        content: '',
        featured_image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop',
        author: '여중성지',
        author_id: 1,
        category: '글로칼 컴',
        tags: ['해양', '여행대5', '카니발', '관광지', '신', '투룰립', '국가', '코린', '클립', '제임현'],
        published_date: '2018-11-30T07:23:00',
        view_count: 1250,
        is_featured: false,
        is_published: true
      }
    ];
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

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('search', tag);
    setSearchParams(newParams);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Page Title */}
      <div className="border-b border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-light text-gray-800">블로그</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Main Content */}
          <main className="lg:w-2/3">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">로딩 중...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                검색 결과가 없습니다.
              </div>
            ) : (
              <div className="space-y-8">
                {posts.map((post) => (
                  <article
                    key={post.id}
                    className="cursor-pointer group"
                    onClick={() => navigate(`/blog/${post.slug}`)}
                  >
                    {/* Featured Image */}
                    <div className="mb-4 overflow-hidden">
                      <ImageWithFallback
                        src={post.featured_image}
                        alt={post.title}
                        className="w-full h-auto object-cover group-hover:opacity-90 transition-opacity"
                      />
                    </div>

                    {/* Post Title */}
                    <h2 className="text-2xl font-normal text-gray-800 mb-3 group-hover:text-orange-600 transition-colors">
                      {post.title}
                    </h2>

                    {/* Post Meta */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(post.published_date).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {post.author}
                      </span>
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                        {post.category}
                      </span>
                      <span className="flex items-center gap-1">
                        💬 {post.view_count || 0}
                      </span>
                    </div>

                    {/* Excerpt */}
                    <p className="text-gray-600 leading-relaxed mb-4">
                      {post.excerpt}
                    </p>

                    {/* Read More Button */}
                    <button className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 text-sm transition-colors">
                      자세히보기
                    </button>

                    {/* Divider */}
                    <div className="border-b border-gray-200 mt-8"></div>
                  </article>
                ))}
              </div>
            )}
          </main>

          {/* Sidebar */}
          <aside className="lg:w-1/3">
            {/* Search Box */}
            <div className="mb-8">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 focus:outline-none focus:border-orange-500"
                />
                <button
                  type="submit"
                  className="absolute right-0 top-0 h-full px-4 bg-gray-700 hover:bg-gray-800 text-white transition-colors"
                >
                  <Search className="h-5 w-5" />
                </button>
              </form>
            </div>

            {/* Company Info */}
            <div className="mb-8 p-6 bg-gray-50">
              <h3 className="text-lg font-semibold mb-4">회사 소개</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                살의 니흘(rufa)와 단락했는 두투물 중에 브란질곤(fringilla)의 줄리 트외기 입습니다. 이러네이와 솔리시 투즈(sollicitudin)은 투투의 요소으로 대, 가격이 대만 두부틀을 대거로 아닙니다.
              </p>
            </div>

            {/* Tags */}
            {allTags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">태그</h3>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

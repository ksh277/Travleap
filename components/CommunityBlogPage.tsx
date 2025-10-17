import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Calendar, User, Tag, Eye, Heart, MessageCircle, ArrowLeft } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useAuth } from '../contexts/AuthContext';

interface CommunityBlogPageProps {
  onBack?: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3004';

export function CommunityBlogPage({ onBack }: CommunityBlogPageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const LIMIT = 9;

  const categories = [
    { id: 'all', name: '전체' },
    { id: 'travel', name: '여행기' },
    { id: 'tips', name: '여행팁' },
    { id: 'local', name: '로컬맛집' },
    { id: 'culture', name: '문화체험' },
    { id: 'news', name: '소식' }
  ];

  useEffect(() => {
    // 카테고리가 변경되면 처음부터 다시 로드
    setOffset(0);
    setHasMore(true);
    fetchBlogs(true);
  }, [selectedCategory]);

  const fetchBlogs = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const currentOffset = reset ? 0 : offset;
      const baseUrl = selectedCategory === 'all'
        ? `${API_BASE_URL}/api/blogs/published`
        : `${API_BASE_URL}/api/blogs/published?category=${selectedCategory}`;

      const url = `${baseUrl}${selectedCategory === 'all' ? '?' : '&'}limit=${LIMIT}&offset=${currentOffset}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.blogs) {
        const formattedBlogs = data.blogs.map((blog: any) => ({
          id: blog.id,
          title: blog.title,
          excerpt: blog.excerpt || '',
          category: blog.category || 'general',
          author: blog.author_name || '익명',
          date: new Date(blog.created_at).toLocaleDateString('ko-KR'),
          image: blog.featured_image || blog.image_url || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=250&fit=crop',
          views: blog.views || 0,
          likes: blog.likes || 0,
          comments: blog.comments_count || 0,
          tags: blog.tags ? (typeof blog.tags === 'string' ? JSON.parse(blog.tags) : blog.tags) : []
        }));

        if (reset) {
          setBlogPosts(formattedBlogs);
        } else {
          setBlogPosts(prev => [...prev, ...formattedBlogs]);
        }

        // 더 이상 데이터가 없으면 hasMore를 false로 설정
        setHasMore(formattedBlogs.length === LIMIT);
      }

      setLoading(false);
      setLoadingMore(false);
    } catch (error) {
      console.error('Failed to fetch blogs:', error);
      if (reset) {
        setBlogPosts([]);
      }
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    const newOffset = offset + LIMIT;
    setOffset(newOffset);
    fetchBlogs(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>뒤로가기</span>
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-800">커뮤니티 블로그</h1>
              <p className="text-gray-600 mt-2">신안 여행의 생생한 이야기와 유용한 정보를 공유하세요</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* 카테고리 필터 */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className={selectedCategory === category.id ? "bg-purple-600 hover:bg-purple-700" : ""}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* 블로그 포스트 그리드 */}
        {blogPosts.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <p className="text-gray-500 text-lg">등록된 블로그가 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <Card
                key={post.id}
                className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                onClick={() => navigate(`/community-blog/${post.id}`)}
              >
              <div className="relative">
                <ImageWithFallback
                  src={post.image}
                  alt={post.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 left-2">
                  <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-medium">
                    {categories.find(cat => cat.id === post.category)?.name}
                  </span>
                </div>
              </div>

              <CardContent className="p-6">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800 line-clamp-2 hover:text-purple-600 transition-colors">
                    {post.title}
                  </h3>

                  <p className="text-gray-600 text-sm line-clamp-3">
                    {post.excerpt}
                  </p>

                  {/* 태그 */}
                  <div className="flex flex-wrap gap-1">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* 작성자 및 날짜 */}
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>{post.author}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{post.date}</span>
                    </div>
                  </div>

                  {/* 통계 */}
                  <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>{post.views.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Heart className="h-4 w-4" />
                        <span>{post.likes}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="h-4 w-4" />
                        <span>{post.comments}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        )}

        {/* 더 보기 버튼 */}
        {hasMore && blogPosts.length > 0 && (
          <div className="text-center mt-12">
            <Button
              variant="outline"
              size="lg"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? '로딩 중...' : '더 많은 글 보기'}
            </Button>
          </div>
        )}

        {/* 글쓰기 CTA - 로그인한 사용자만 표시 */}
        {user ? (
          <div className="mt-16 bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              나만의 신안 여행 이야기를 공유해보세요!
            </h2>
            <p className="text-gray-600 mb-6">
              신안에서의 특별한 경험과 추억을 다른 여행자들과 나누어보세요.
            </p>
            <Button
              size="lg"
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => navigate('/community-blog/write')}
            >
              글쓰기
            </Button>
          </div>
        ) : (
          <div className="mt-16 bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              신안 여행 이야기를 공유하고 싶으신가요?
            </h2>
            <p className="text-gray-600 mb-6">
              로그인하시면 나만의 여행 경험과 추억을 다른 여행자들과 나눌 수 있습니다.
            </p>
            <Button
              size="lg"
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => navigate('/login')}
            >
              로그인하기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

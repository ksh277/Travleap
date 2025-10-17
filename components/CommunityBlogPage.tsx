import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Calendar, User, Tag, Eye, Heart, MessageCircle, ArrowLeft } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface CommunityBlogPageProps {
  onBack?: () => void;
}

export function CommunityBlogPage({ onBack }: CommunityBlogPageProps) {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: '전체' },
    { id: 'travel', name: '여행기' },
    { id: 'tips', name: '여행팁' },
    { id: 'local', name: '로컬맛집' },
    { id: 'culture', name: '문화체험' },
    { id: 'news', name: '소식' }
  ];

  const blogPosts = [
    {
      id: 1,
      title: '신안 증도 천일염전에서의 특별한 하루',
      excerpt: '천일염전에서 직접 소금을 채취하고, 갯벌체험까지! 신안 여행의 백미를 소개합니다.',
      content: '증도는 신안군에서 가장 큰 섬으로, 유네스코 생물권보전지역으로 지정된 곳입니다...',
      category: 'travel',
      author: '김민지',
      date: '2024.03.20',
      image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=250&fit=crop',
      views: 1245,
      likes: 89,
      comments: 23,
      tags: ['증도', '천일염', '갯벌체험', '유네스코']
    },
    {
      id: 2,
      title: '흑산도 홍어삼합 맛집 BEST 5',
      excerpt: '흑산도에서만 맛볼 수 있는 진짜 홍어삼합! 현지인이 추천하는 맛집들을 소개합니다.',
      content: '흑산도는 홍어의 고향으로 불리는 곳입니다. 특히 홍어삼합은...',
      category: 'local',
      author: '박정훈',
      date: '2024.03.18',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=250&fit=crop',
      views: 2156,
      likes: 156,
      comments: 34,
      tags: ['흑산도', '홍어삼합', '맛집', '해산물']
    },
    {
      id: 3,
      title: '신안 섬 호핑 투어 완벽 가이드',
      excerpt: '1004개의 섬을 자랑하는 신안! 효율적인 섬 호핑 코스와 꿀팁을 공유합니다.',
      content: '신안군은 1004개의 섬으로 이루어진 군도입니다. 모든 섬을 다 돌 수는 없지만...',
      category: 'tips',
      author: '이수연',
      date: '2024.03.15',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=250&fit=crop',
      views: 3421,
      likes: 267,
      comments: 56,
      tags: ['섬호핑', '여행팁', '신안투어', '가이드']
    },
    {
      id: 4,
      title: '천사대교에서 바라본 신안의 일몰',
      excerpt: '천사대교 위에서 바라본 환상적인 일몰 풍경. 최고의 포토스팟을 공유합니다.',
      content: '천사대교는 신안과 목포를 연결하는 다리로, 특히 일몰 시간에는...',
      category: 'travel',
      author: '최동하',
      date: '2024.03.12',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=250&fit=crop',
      views: 1876,
      likes: 134,
      comments: 28,
      tags: ['천사대교', '일몰', '포토스팟', '드라이브']
    },
    {
      id: 5,
      title: '자은도 모래사장에서의 캠핑 후기',
      excerpt: '백사장이 아름다운 자은도에서의 캠핑 경험담. 준비물과 주의사항을 정리했습니다.',
      content: '자은도는 신안에서 가장 아름다운 해변을 자랑하는 섬입니다...',
      category: 'travel',
      author: '정유진',
      date: '2024.03.10',
      image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=250&fit=crop',
      views: 2340,
      likes: 189,
      comments: 41,
      tags: ['자은도', '캠핑', '해변', '백사장']
    },
    {
      id: 6,
      title: '신안군 새로운 관광지 개발 소식',
      excerpt: '신안군에서 발표한 새로운 관광지 개발 계획과 기대되는 변화들을 소개합니다.',
      content: '신안군에서는 지속가능한 관광 발전을 위한 새로운 계획을 발표했습니다...',
      category: 'news',
      author: '어썸플랜',
      date: '2024.03.08',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=250&fit=crop',
      views: 1567,
      likes: 98,
      comments: 19,
      tags: ['신안군', '관광개발', '소식', '계획']
    }
  ];

  const filteredPosts = selectedCategory === 'all'
    ? blogPosts
    : blogPosts.filter(post => post.category === selectedCategory);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post) => (
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

        {/* 더 보기 버튼 */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            더 많은 글 보기
          </Button>
        </div>

        {/* 글쓰기 CTA */}
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
      </div>
    </div>
  );
}

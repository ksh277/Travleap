import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, User, Eye, Tag, Clock, Share2, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { api } from '../utils/api';
import { toast } from 'sonner';
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
  view_count: number;
  reading_time: number;
  is_featured: boolean;
  is_published: boolean;
}

interface RelatedPost {
  id: number;
  title: string;
  featured_image: string;
  published_date: string;
}

export default function BlogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    fetchPost();
    window.scrollTo(0, 0);
  }, [id]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const response = await api.getBlogPost(Number(id));

      if (response?.success && response.data) {
        setPost(response.data);
        fetchRelatedPosts(response.data.category);
      } else {
        // Mock data for testing
        setPost(getMockPost());
        setRelatedPosts(getMockRelatedPosts());
      }
    } catch (error) {
      console.error('블로그 포스트 로딩 실패:', error);
      setPost(getMockPost());
      setRelatedPosts(getMockRelatedPosts());
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedPosts = async (category: string) => {
    try {
      const response = await api.getRelatedBlogPosts(Number(id), category);
      if (response?.success && response.data) {
        setRelatedPosts(response.data);
      }
    } catch (error) {
      console.error('관련 포스트 로딩 실패:', error);
    }
  };

  const getMockPost = (): BlogPost => {
    return {
      id: Number(id),
      title: '신안 퍼플섬 완벽 가이드 - 보라색 꿈같은 섬 여행',
      slug: 'purple-island-complete-guide',
      excerpt: '신안의 숨은 보석, 퍼플섬에서의 완벽한 하루를 보내는 방법',
      content: `
# 퍼플섬이란?

퍼플섬은 전라남도 신안군에 위치한 작은 섬으로, 섬 전체가 보라색으로 꾸며져 있어 '퍼플섬'이라는 이름이 붙여졌습니다.

## 퍼플섬의 매력

### 1. 보라색 마을
마을 전체가 보라색으로 칠해져 있어, 마치 동화 속 세계에 온 듯한 느낌을 줍니다. 집, 다리, 벤치, 심지어 가로등까지 모두 보라색!

### 2. 최고의 포토스팟
- **퍼플교**: 섬과 섬을 연결하는 보라색 다리
- **보라색 계단**: 인스타그램 감성 가득한 포토존
- **라벤더 정원**: 계절에 따라 실제 라벤더가 피어납니다

### 3. 평화로운 자연
조용한 섬마을의 정취와 아름다운 바다 풍경을 동시에 즐길 수 있습니다.

## 가는 방법

1. **압해도 송공항에서 출발**
   - 배편: 1일 4회 운행
   - 소요시간: 약 20분
   - 요금: 편도 5,000원

2. **차량 이용**
   - 신안 1004대교 이용
   - 주차장 무료

## 추천 코스

**오전 (10:00-12:00)**
- 퍼플교에서 사진 촬영
- 보라색 마을 둘러보기

**점심 (12:00-13:30)**
- 해산물 정식 또는 짜장면 맛보기

**오후 (13:30-17:00)**
- 해변 산책
- 라벤더 정원 방문
- 퍼플 카페에서 휴식

## 여행 팁

💜 **최적의 방문 시기**: 4월~10월 (특히 5월~6월 라벤더 시즌)

💜 **준비물**:
- 편한 신발 (걷기 좋은 섬입니다)
- 모자와 선크림
- 카메라 (필수!)

💜 **주의사항**:
- 마을 주민들의 사생활 존중
- 쓰레기는 꼭 가져가기
- 조용히 관람하기

## 맛집 추천

1. **퍼플식당**
   - 신안 전통 해산물 정식
   - 가격: 1인 15,000원

2. **보라짜장**
   - 보라색 짜장면!
   - 가격: 7,000원

## 마무리

퍼플섬은 단순히 사진 찍기 좋은 관광지를 넘어, 섬 주민들의 이야기와 정성이 담긴 특별한 공간입니다. 방문하시면 꼭 여유롭게 섬의 매력을 느껴보세요!
      `,
      featured_image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop',
      author: '트래블립',
      author_id: 1,
      category: '관광지',
      tags: ['퍼플섬', '신안', '포토스팟', '섬여행', '국내여행'],
      published_date: '2025-10-01',
      view_count: 1250,
      reading_time: 5,
      is_featured: true,
      is_published: true
    };
  };

  const getMockRelatedPosts = (): RelatedPost[] => {
    return [
      {
        id: 2,
        title: '신안 맛집 베스트 10',
        featured_image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
        published_date: '2025-09-28'
      },
      {
        id: 3,
        title: '신안 1박 2일 완벽 코스',
        featured_image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=300&fit=crop',
        published_date: '2025-09-25'
      }
    ];
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: post?.title,
          text: post?.excerpt,
          url: window.location.href
        });
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast.success('링크가 클립보드에 복사되었습니다!');
      }
    } catch (error) {
      console.error('공유 실패:', error);
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    toast.success(liked ? '좋아요를 취소했습니다' : '좋아요를 눌렀습니다!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-600 mb-4">포스트를 찾을 수 없습니다.</p>
            <Button onClick={() => navigate('/blog')}>목록으로 돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="container mx-auto px-4 py-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/blog')}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          목록으로
        </Button>
      </div>

      {/* Featured Image */}
      <div className="relative h-96 md:h-[500px]">
        <ImageWithFallback
          src={post.featured_image}
          alt={post.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 text-white p-8">
          <div className="container mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-blue-600 px-3 py-1 rounded-full text-sm font-semibold">
                {post.category}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">{post.title}</h1>
            <div className="flex items-center gap-6 text-sm">
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {post.author}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(post.published_date).toLocaleDateString('ko-KR')}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {post.reading_time}분 읽기
              </span>
              <span className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                {post.view_count.toLocaleString()} 조회
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <article className="lg:w-3/4">
            <Card>
              <CardContent className="p-8 md:p-12">
                {/* Excerpt */}
                <p className="text-xl text-gray-600 mb-8 pb-8 border-b">
                  {post.excerpt}
                </p>

                {/* Content */}
                <div
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />').replace(/^# (.+)$/gm, '<h1>$1</h1>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^\*\*(.+)\*\*$/gm, '<strong>$1</strong>').replace(/^- (.+)$/gm, '<li>$1</li>') }}
                />

                {/* Tags */}
                <div className="mt-12 pt-8 border-t">
                  <h3 className="font-semibold mb-4">태그</h3>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => navigate(`/blog?tag=${tag}`)}
                        className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full text-sm transition-colors"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex items-center gap-4">
                  <Button
                    variant={liked ? "default" : "outline"}
                    onClick={handleLike}
                    className="flex items-center gap-2"
                  >
                    <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
                    좋아요
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleShare}
                    className="flex items-center gap-2"
                  >
                    <Share2 className="h-5 w-5" />
                    공유하기
                  </Button>
                </div>
              </CardContent>
            </Card>
          </article>

          {/* Sidebar */}
          <aside className="lg:w-1/4 space-y-6">
            {/* Author Card */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">작성자</h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {post.author[0]}
                  </div>
                  <div>
                    <p className="font-semibold">{post.author}</p>
                    <p className="text-sm text-gray-500">여행 전문가</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  신안의 모든 것을 알려드리는 트래블립입니다.
                </p>
              </CardContent>
            </Card>

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">관련 포스트</h3>
                  <div className="space-y-4">
                    {relatedPosts.map((relatedPost) => (
                      <div
                        key={relatedPost.id}
                        className="cursor-pointer group"
                        onClick={() => navigate(`/blog/${relatedPost.id}`)}
                      >
                        <div className="relative h-32 rounded overflow-hidden mb-2">
                          <ImageWithFallback
                            src={relatedPost.featured_image}
                            alt={relatedPost.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <h4 className="font-medium text-sm group-hover:text-blue-600 transition-colors line-clamp-2">
                          {relatedPost.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(relatedPost.published_date).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
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

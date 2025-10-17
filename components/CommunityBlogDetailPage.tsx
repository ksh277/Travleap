import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, User, Eye, Heart, MessageCircle, ArrowLeft, Share2, Tag } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface CommunityPost {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  date: string;
  image: string;
  views: number;
  likes: number;
  comments: number;
  tags: string[];
}

interface Comment {
  id: number;
  author: string;
  date: string;
  content: string;
  likes: number;
}

export default function CommunityBlogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPost();
    window.scrollTo(0, 0);
  }, [id]);

  const fetchPost = () => {
    setLoading(false);

    // Mock data - 실제로는 API 호출
    const mockPost: CommunityPost = {
      id: Number(id),
      title: '신안 증도 천일염전에서의 특별한 하루',
      excerpt: '천일염전에서 직접 소금을 채취하고, 갯벌체험까지! 신안 여행의 백미를 소개합니다.',
      content: `
# 증도 천일염전, 그곳에서의 특별한 경험

안녕하세요! 이번 주말에 신안 증도를 다녀왔습니다. 증도는 신안군에서 가장 큰 섬으로, 유네스코 생물권보전지역으로 지정된 곳입니다.

## 천일염전 체험

증도의 하이라이트는 바로 천일염전 체험입니다. 직접 소금을 채취하는 경험은 정말 특별했어요!

### 체험 과정
1. **오전 10시 - 염전 도착**: 넓은 염전이 펼쳐져 있어요
2. **염전 설명**: 전문가분이 천일염 제조 과정을 자세히 설명해주십니다
3. **직접 채취**: 실제로 소금을 긁어모으는 체험
4. **포장 체험**: 채취한 소금을 직접 포장해 가져갈 수 있어요

## 갯벌 체험

오후에는 갯벌 체험도 했습니다. 짱뚱어, 게, 조개 등 다양한 생물들을 만날 수 있었어요.

**준비물**:
- 편한 옷 (더러워질 수 있어요!)
- 모자와 선크림
- 갈아입을 옷
- 수건

## 추천 맛집

염전 체험 후 들른 맛집을 소개합니다.

**증도 식당**
- 메뉴: 백합정식, 낙지볶음
- 가격: 1인 15,000원
- 후기: 싱싱한 해산물이 일품!

## 여행 팁

💡 **최적의 방문 시기**: 4월~10월 (날씨가 좋을 때 추천)

💡 **소요 시간**: 반나절 정도 여유있게 계획하세요

💡 **주의사항**:
- 햇빛이 강하니 자외선 차단 필수
- 염전은 미끄러우니 조심하세요
- 갯벌체험은 간조 시간을 확인하세요

## 마무리

증도에서의 하루는 정말 특별한 경험이었습니다. 천일염 제조 과정을 직접 보고, 체험하면서 소금의 소중함을 다시 한번 느낄 수 있었어요.

신안 여행을 계획하신다면 꼭 증도에 들러보세요! 후회하지 않으실 거예요 😊
      `,
      category: 'travel',
      author: '김민지',
      date: '2024.03.20',
      image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=600&fit=crop',
      views: 1245,
      likes: 89,
      comments: 23,
      tags: ['증도', '천일염', '갯벌체험', '유네스코']
    };

    const mockComments: Comment[] = [
      {
        id: 1,
        author: '박지훈',
        date: '2024.03.21',
        content: '저도 다음주에 증도 가려고 하는데 너무 유용한 정보네요! 감사합니다 😊',
        likes: 5
      },
      {
        id: 2,
        author: '이수진',
        date: '2024.03.21',
        content: '작년에 갔었는데 정말 좋더라고요. 사진 보니까 또 가고 싶어지네요!',
        likes: 3
      },
      {
        id: 3,
        author: '최민호',
        date: '2024.03.20',
        content: '갯벌체험 시간은 어떻게 확인하나요?',
        likes: 1
      }
    ];

    setPost(mockPost);
    setLikeCount(mockPost.likes);
    setComments(mockComments);
    setLoading(false);
  };

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    toast.success(liked ? '좋아요를 취소했습니다' : '좋아요를 눌렀습니다!');
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
        await navigator.clipboard.writeText(window.location.href);
        toast.success('링크가 클립보드에 복사되었습니다!');
      }
    } catch (error) {
      console.error('공유 실패:', error);
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      toast.error('댓글 내용을 입력해주세요.');
      return;
    }

    const newCommentObj: Comment = {
      id: comments.length + 1,
      author: '익명',
      date: new Date().toLocaleDateString('ko-KR'),
      content: newComment,
      likes: 0
    };

    setComments([...comments, newCommentObj]);
    setNewComment('');
    toast.success('댓글이 등록되었습니다!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
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
            <Button onClick={() => navigate('/community-blog')}>목록으로 돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/community-blog')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>목록으로</span>
          </Button>
        </div>
      </div>

      {/* Featured Image (width-aligned with content) */}
      <div className="relative h-96 md:h-[500px] overflow-hidden">
        {/* 이미지: 전체 배경 */}
        <div className="absolute inset-0">
          <ImageWithFallback
            src={post.image}
            alt={post.title}
            className="w-full h-full object-cover object-center"
          /* 만약 이 prop이 아니라면: imgClassName="w-full h-full object-cover object-center" */
          />
        </div>

        {/* 그라데이션: 본문과 동일 폭으로만 깔기 */}
        <div className="pointer-events-none absolute inset-0">
          <div className="max-w-4xl mx-auto h-full px-4 relative">
            {/* 아래쪽만 살짝 어둡게 (높이 조절 가능: h-40 / md:h-60 등) */}
            <div className="absolute inset-x-0 bottom-0 h-48 md:h-60 bg-gradient-to-t from-black/70 to-transparent" />
          </div>
        </div>

        {/* 타이틀/메타: 본문과 동일 폭으로 정렬 */}
        <div className="absolute inset-x-0 bottom-0 z-10 text-white">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-purple-600 px-3 py-1 rounded-full text-sm font-semibold">
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
                {post.date}
              </span>
              <span className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                {post.views.toLocaleString()} 조회
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Main Content */}
          <Card className="mb-8">
            <CardContent className="p-8 md:p-12">
              {/* Excerpt */}
              <p className="text-xl text-gray-600 mb-8 pb-8 border-b font-medium">
                {post.excerpt}
              </p>

              {/* Content */}
              <div className="prose prose-lg max-w-none">
                {post.content.split('\n').map((line, index) => {
                  // ========================================
                  // 마크다운 렌더링 (향상된 버전)
                  // ========================================

                  // 제목: # ## ###
                  if (line.startsWith('# ')) {
                    return <h1 key={index} className="text-3xl font-bold mt-8 mb-4">{line.substring(2)}</h1>;
                  } else if (line.startsWith('## ')) {
                    return <h2 key={index} className="text-2xl font-bold mt-6 mb-3">{line.substring(3)}</h2>;
                  } else if (line.startsWith('### ')) {
                    return <h3 key={index} className="text-xl font-bold mt-4 mb-2">{line.substring(4)}</h3>;
                  }

                  // 인용구: > 텍스트
                  else if (line.startsWith('> ')) {
                    return (
                      <blockquote key={index} className="border-l-4 border-purple-500 pl-4 my-4 italic text-gray-700">
                        {line.substring(2)}
                      </blockquote>
                    );
                  }

                  // 코드 블록: ```
                  else if (line.startsWith('```')) {
                    return <code key={index} className="block bg-gray-100 p-4 rounded my-4 font-mono text-sm">{line.substring(3)}</code>;
                  }

                  // 리스트: - 또는 숫자
                  else if (line.startsWith('- ')) {
                    return <li key={index} className="ml-6 my-1 list-disc">{line.substring(2)}</li>;
                  } else if (line.match(/^\d+\./)) {
                    return <li key={index} className="ml-6 my-1 list-decimal">{line.substring(line.indexOf('.') + 2)}</li>;
                  }

                  // 빈 줄
                  else if (line.trim() === '') {
                    return <br key={index} />;
                  }

                  // 일반 텍스트 (인라인 마크다운 처리)
                  else {
                    let processed = line;

                    // **굵게** 처리
                    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

                    // *기울임* 처리
                    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');

                    // `코드` 처리
                    processed = processed.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-purple-600">$1</code>');

                    // [링크](url) 처리
                    processed = processed.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-purple-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

                    return (
                      <p
                        key={index}
                        className="my-4 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: processed }}
                      />
                    );
                  }
                })}
              </div>

              {/* Tags */}
              <div className="mt-12 pt-8 border-t">
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="h-5 w-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-800">태그</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => navigate(`/community-blog?tag=${tag}`)}
                      className="bg-purple-50 hover:bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm transition-colors"
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
                  className={`flex items-center gap-2 ${liked ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                >
                  <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
                  좋아요 ({likeCount})
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

          {/* Comments Section */}
          <Card>
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <MessageCircle className="h-6 w-6" />
                댓글 ({comments.length})
              </h3>

              {/* Comment Form */}
              <form onSubmit={handleCommentSubmit} className="mb-8">
                <div className="flex gap-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="댓글을 남겨보세요..."
                    className="flex-1"
                  />
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                    등록
                  </Button>
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="pb-6 border-b last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {comment.author[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{comment.author}</p>
                          <p className="text-xs text-gray-500">{comment.date}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-purple-600"
                      >
                        <Heart className="h-4 w-4 mr-1" />
                        {comment.likes}
                      </Button>
                    </div>
                    <p className="text-gray-700 ml-13">{comment.content}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, User, Eye, Heart, MessageCircle, ArrowLeft, Share2, Tag, Bookmark, Trash2, Reply, Edit2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useAuth } from '../hooks/useAuth';
import { renderMarkdown } from '../utils/markdown';

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
  user_id: number;
  liked?: boolean;
  parent_comment_id?: number | null;
  replies?: Comment[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3004';

export default function CommunityBlogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    fetchPost();
    fetchComments();
    window.scrollTo(0, 0);
  }, [id]);

  const fetchPost = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers: any = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/blogs/${id}`, { headers });
      const data = await response.json();

      if (data.success && data.post) {
        const blogPost: CommunityPost = {
          id: data.post.id,
          title: data.post.title,
          excerpt: data.post.excerpt || '',
          content: data.post.content_md || data.post.content || '',
          category: data.post.category || 'general',
          author: data.post.author_name || data.post.author || '익명',
          date: new Date(data.post.created_at).toLocaleDateString('ko-KR'),
          image: data.post.featured_image || data.post.image_url || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=600&fit=crop',
          views: data.post.views || 0,
          likes: data.post.likes || 0,
          comments: data.post.comments_count || 0,
          tags: data.post.tags ? (typeof data.post.tags === 'string' ? JSON.parse(data.post.tags) : data.post.tags) : []
        };

        setPost(blogPost);
        setLikeCount(blogPost.likes);
        setLiked(data.liked || false);
        setBookmarked(data.bookmarked || false);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch post:', error);
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers: any = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/blogs/${id}/comments`, { headers });
      const data = await response.json();

      if (data.success && data.comments) {
        const formattedComments: Comment[] = data.comments.map((c: any) => ({
          id: c.id,
          author: c.author_name || c.user_name || '익명',
          date: new Date(c.created_at).toLocaleDateString('ko-KR'),
          content: c.content,
          likes: c.likes || 0,
          user_id: c.user_id,
          liked: c.liked || false,
          parent_comment_id: c.parent_comment_id
        }));

        // 댓글을 트리 구조로 변환 (부모 댓글에 replies 추가)
        const commentMap = new Map<number, Comment>();
        const rootComments: Comment[] = [];

        formattedComments.forEach(comment => {
          commentMap.set(comment.id, { ...comment, replies: [] });
        });

        formattedComments.forEach(comment => {
          const commentWithReplies = commentMap.get(comment.id)!;
          if (comment.parent_comment_id) {
            const parent = commentMap.get(comment.parent_comment_id);
            if (parent) {
              parent.replies!.push(commentWithReplies);
            } else {
              rootComments.push(commentWithReplies);
            }
          } else {
            rootComments.push(commentWithReplies);
          }
        });

        setComments(rootComments);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/blogs/${id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setLiked(data.liked);
        setLikeCount(data.likes);
        toast.success(data.message);
      } else {
        toast.error(data.message || '좋아요 처리 실패');
      }
    } catch (error) {
      console.error('좋아요 처리 실패:', error);
      toast.error('좋아요 처리 중 오류가 발생했습니다.');
    }
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

  const handleCommentSubmit = async (e: React.FormEvent, parentCommentId: number | null = null) => {
    e.preventDefault();

    if (!user) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (!newComment.trim()) {
      toast.error('댓글 내용을 입력해주세요.');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/blogs/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newComment,
          parent_comment_id: parentCommentId
        })
      });

      const data = await response.json();

      if (data.success) {
        await fetchComments();
        setNewComment('');
        setReplyingTo(null);
        toast.success(data.message);

        if (post) {
          setPost({
            ...post,
            comments: post.comments + 1
          });
        }
      } else {
        toast.error(data.message || '댓글 작성 실패');
      }
    } catch (error) {
      console.error('댓글 작성 실패:', error);
      toast.error('댓글 작성 중 오류가 발생했습니다.');
    }
  };

  const handleEditComment = async (commentId: number) => {
    if (!editContent.trim()) {
      toast.error('댓글 내용을 입력해주세요.');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/blogs/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: editContent
        })
      });

      const data = await response.json();

      if (data.success) {
        await fetchComments();
        setEditingComment(null);
        setEditContent('');
        toast.success(data.message);
      } else {
        toast.error(data.message || '댓글 수정 실패');
      }
    } catch (error) {
      console.error('댓글 수정 실패:', error);
      toast.error('댓글 수정 중 오류가 발생했습니다.');
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/blogs/${id}/bookmark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setBookmarked(data.bookmarked);
        toast.success(data.message);
      } else {
        toast.error(data.message || '북마크 처리 실패');
      }
    } catch (error) {
      console.error('북마크 처리 실패:', error);
      toast.error('북마크 처리 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('정말 이 댓글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/blogs/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        await fetchComments();
        toast.success(data.message);

        // 포스트 정보도 업데이트 (댓글 수 감소)
        if (post) {
          setPost({
            ...post,
            comments: Math.max(0, post.comments - 1)
          });
        }
      } else {
        toast.error(data.message || '댓글 삭제 실패');
      }
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      toast.error('댓글 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleCommentLike = async (commentId: number) => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/blogs/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        await fetchComments();
        toast.success(data.message);
      } else {
        toast.error(data.message || '좋아요 처리 실패');
      }
    } catch (error) {
      console.error('댓글 좋아요 처리 실패:', error);
      toast.error('좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  // 재귀 댓글 렌더링 컴포넌트
  const renderComment = (comment: Comment, depth: number = 0) => (
    <div key={comment.id} className={`pb-6 border-b last:border-b-0 ${depth > 0 ? 'ml-12 mt-4' : ''}`}>
      {editingComment === comment.id ? (
        // 수정 모드
        <div className="flex gap-2 mb-2">
          <Input
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="댓글을 수정하세요..."
            className="flex-1"
          />
          <Button onClick={() => handleEditComment(comment.id)} size="sm" className="bg-purple-600">
            저장
          </Button>
          <Button onClick={() => {setEditingComment(null); setEditContent('');}} variant="outline" size="sm">
            취소
          </Button>
        </div>
      ) : (
        <>
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
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCommentLike(comment.id)}
                className={comment.liked ? "text-purple-600" : "text-gray-500 hover:text-purple-600"}
              >
                <Heart className={`h-4 w-4 mr-1 ${comment.liked ? 'fill-current' : ''}`} />
                {comment.likes}
              </Button>
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {setReplyingTo(comment.id); window.scrollTo({top: 500, behavior: 'smooth'});}}
                  className="text-gray-500 hover:text-purple-600"
                >
                  <Reply className="h-4 w-4" />
                </Button>
              )}
              {user && user.userId === comment.user_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {setEditingComment(comment.id); setEditContent(comment.content);}}
                  className="text-gray-500 hover:text-blue-600"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
              {user && (user.userId === comment.user_id || user.role === 'admin') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-gray-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <p className="text-gray-700 ml-13">{comment.content}</p>
          {/* 대댓글 렌더링 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4">
              {comment.replies.map(reply => renderComment(reply, depth + 1))}
            </div>
          )}
        </>
      )}
    </div>
  );

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
                {renderMarkdown(post.content)}
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
                  variant={bookmarked ? "default" : "outline"}
                  onClick={handleBookmark}
                  className={`flex items-center gap-2 ${bookmarked ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                >
                  <Bookmark className={`h-5 w-5 ${bookmarked ? 'fill-current' : ''}`} />
                  북마크
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
              <form onSubmit={(e) => handleCommentSubmit(e, replyingTo)} className="mb-8">
                {replyingTo && (
                  <div className="mb-2 text-sm text-purple-600 flex items-center gap-2">
                    <Reply className="h-4 w-4" />
                    답글 작성 중
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(null)}
                      className="text-gray-500"
                    >
                      취소
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={replyingTo ? "답글을 입력하세요..." : "댓글을 남겨보세요..."}
                    className="flex-1"
                  />
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                    등록
                  </Button>
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-6">
                {comments.map((comment) => renderComment(comment))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { ArrowLeft, Eye, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { renderMarkdown } from '../utils/markdown';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3004';

export default function CommunityBlogWritePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // 페이지 진입 시 로그인 체크
  useEffect(() => {
    if (!user) {
      toast.error('로그인이 필요한 서비스입니다.');
      navigate('/login');
    }
  }, [user, navigate]);

  // ========================================
  // 상태 변수들 ✅
  // ========================================
  const [title, setTitle] = useState('');           // 제목
  const [excerpt, setExcerpt] = useState('');       // 요약
  const [content, setContent] = useState('');       // 본문 (마크다운)
  const [category, setCategory] = useState('travel'); // 카테고리
  const [tags, setTags] = useState('');             // 태그 (쉼표로 구분)
  const [imageUrl, setImageUrl] = useState('');     // 이미지 URL
  const [showPreview, setShowPreview] = useState(false); // 미리보기 모드
  const [submitting, setSubmitting] = useState(false); // 제출 중 상태

  // 카테고리 목록
  const categories = [
    { id: 'travel', name: '여행기' },
    { id: 'tips', name: '여행팁' },
    { id: 'local', name: '로컬맛집' },
    { id: 'culture', name: '문화체험' },
    { id: 'news', name: '소식' }
  ];

  // 마크다운 렌더링은 utils/markdown.tsx에서 import

  // ========================================
  // 이미지 업로드 처리 함수 ✅
  // ========================================
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('이미지 크기는 5MB 이하로 업로드해주세요!');
      return;
    }

    // 이미지 파일인지 체크
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageUrl(event.target?.result as string);
      toast.success('이미지가 업로드되었습니다!');
    };
    reader.onerror = () => {
      toast.error('이미지 업로드에 실패했습니다.');
    };
    reader.readAsDataURL(file);
  };

  // ========================================
  // 폼 제출 (저장) 함수 ✅
  // ========================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 로그인 체크
    if (!user) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    // 유효성 검사
    if (!title.trim()) {
      toast.error('제목을 입력해주세요!');
      return;
    }
    if (!content.trim()) {
      toast.error('내용을 입력해주세요!');
      return;
    }
    if (!imageUrl) {
      toast.error('대표 이미지를 선택해주세요!');
      return;
    }

    setSubmitting(true);

    // 태그 배열 생성
    const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);

    // 데이터 객체 만들기
    const blogData = {
      title: title.trim(),
      excerpt: excerpt.trim() || title.trim().substring(0, 100),
      content_md: content.trim(),
      category,
      tags: JSON.stringify(tagsArray),
      featured_image: imageUrl,
      is_published: 1 // 바로 공개
    };

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('인증 토큰이 없습니다. 다시 로그인해주세요.');
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/blogs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(blogData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('🎉 글이 작성되었습니다!');
        setTimeout(() => {
          navigate(`/community-blog/${data.blog.id}`);
        }, 1000);
      } else {
        throw new Error(data.error || '저장 실패');
      }

    } catch (error: any) {
      console.error('저장 오류:', error);
      toast.error(error.message || '글 작성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ========================================
          헤더 (이건 이미 완성되어 있음)
          ======================================== */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/community-blog')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>목록으로</span>
            </Button>

            {/* 미리보기 토글 버튼 */}
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {showPreview ? '편집 모드' : '미리보기'}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
       
        {showPreview ? (
         
          <Card>
            <CardContent className="p-8">
              {/* 이미지 미리보기 ✅ */}
              {imageUrl && (
                <img src={imageUrl} alt="미리보기" className="w-full h-64 object-cover rounded mb-6" />
              )}

              {/* 제목 미리보기 ✅ */}
              <h1 className="text-4xl font-bold mb-4">{title || '제목을 입력하세요'}</h1>

              {/* 요약 미리보기 ✅ */}
              <p className="text-lg text-gray-600 mb-8 pb-8 border-b">{excerpt || '요약을 입력하세요'}</p>

              {/* 본문 마크다운 렌더링 ✅ */}
              <div className="prose prose-lg max-w-none">
                {content ? renderMarkdown(content) : <p className="text-gray-400">본문을 입력하세요</p>}
              </div>

              {/* 태그 미리보기 ✅ */}
              {tags && (
                <div className="mt-8 pt-8 border-t">
                  <h3 className="font-semibold mb-4">태그</h3>
                  <div className="flex flex-wrap gap-2">
                    {tags.split(',').map((tag, index) => (
                      <span key={index} className="bg-purple-50 text-purple-700 px-4 py-2 rounded-full text-sm">
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
         
          <form onSubmit={handleSubmit}>
            <Card>
              <CardContent className="p-8 space-y-6">
                {}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    제목 *
                  </label>
                  <Input
                    type="text"
                    placeholder="여행 제목을 입력하세요"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-xl font-semibold"
                  />
                </div>

               
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    요약
                  </label>
                  <Input
                    type="text"
                    placeholder="글의 요약을 한 줄로 작성하세요"
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                  />
                </div>

                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    카테고리 *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    대표 이미지 *
                  </label>

                 
                  <div className="flex items-center gap-4 mb-3">
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                        <ImageIcon className="h-5 w-5" />
                        <span>파일에서 선택</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    {imageUrl && (
                      <img src={imageUrl} alt="미리보기" className="h-20 w-20 object-cover rounded shadow-md" />
                    )}
                  </div>

              
                  <div>
                    <Input
                      type="text"
                      placeholder="또는 이미지 URL을 입력하세요 (예: https://...)"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Unsplash, Pexels 등에서 무료 이미지 URL을 복사해서 붙여넣을 수 있어요!
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    본문 * (마크다운 지원)
                  </label>
                  <textarea
                    placeholder="# 제목&#10;## 소제목&#10;- 리스트&#10;&#10;본문 내용..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={15}
                    className="w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    💡 마크다운 문법: # 제목, ## 소제목, - 리스트, **굵게**, *기울임*, `코드`, [링크](url), &gt; 인용구
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    태그
                  </label>
                  <Input
                    type="text"
                    placeholder="태그1, 태그2, 태그3 (쉼표로 구분)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/community-blog')}
                    className="flex-1"
                    disabled={submitting}
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    disabled={submitting}
                  >
                    {submitting ? '작성 중...' : '작성 완료'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </div>
  );
}

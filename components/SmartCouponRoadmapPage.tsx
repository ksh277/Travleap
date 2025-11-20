/**
 * 스마트 쿠폰 시스템 35일 구현 로드맵 페이지
 * URL: /smart-coupon-roadmap
 */

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, ArrowLeft, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SmartCouponRoadmapPage() {
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMarkdown = async () => {
      try {
        const response = await fetch('/SMART_COUPON_DETAILED_ROADMAP.md');
        if (!response.ok) {
          throw new Error('마크다운 파일을 불러올 수 없습니다.');
        }
        const text = await response.text();
        setMarkdown(text);
      } catch (err) {
        console.error('마크다운 로드 오류:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchMarkdown();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">로드맵을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">오류 발생</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-900 transition"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              돌아가기
            </button>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>35일 계획</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>6단계</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 상단 배너 */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 mb-8 text-white shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">스마트 쿠폰 시스템</h1>
              <p className="text-purple-100 text-lg">초상세 35일 구현 로드맵</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold mb-1">35일</div>
              <div className="text-purple-100 text-sm">전체 개발 기간</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold mb-1">6단계</div>
              <div className="text-purple-100 text-sm">Phase별 구성</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-2xl font-bold mb-1">완전 자동화</div>
              <div className="text-purple-100 text-sm">QR 기반 시스템</div>
            </div>
          </div>
        </div>

        {/* 마크다운 컨텐츠 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <article className="prose prose-lg prose-purple max-w-none
            prose-headings:text-gray-900
            prose-h1:text-4xl prose-h1:font-bold prose-h1:mb-6 prose-h1:pb-4 prose-h1:border-b-2 prose-h1:border-purple-200
            prose-h2:text-3xl prose-h2:font-bold prose-h2:mt-12 prose-h2:mb-6 prose-h2:text-purple-700
            prose-h3:text-2xl prose-h3:font-semibold prose-h3:mt-8 prose-h3:mb-4 prose-h3:text-purple-600
            prose-h4:text-xl prose-h4:font-semibold prose-h4:mt-6 prose-h4:mb-3
            prose-p:text-gray-700 prose-p:leading-relaxed
            prose-a:text-purple-600 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-gray-900 prose-strong:font-bold
            prose-code:text-purple-600 prose-code:bg-purple-50 prose-code:px-2 prose-code:py-1 prose-code:rounded
            prose-pre:bg-gray-900 prose-pre:text-gray-100
            prose-ul:list-disc prose-ul:ml-6
            prose-ol:list-decimal prose-ol:ml-6
            prose-li:text-gray-700 prose-li:my-2
            prose-table:border-collapse prose-table:w-full
            prose-th:bg-purple-100 prose-th:text-purple-900 prose-th:font-bold prose-th:p-3 prose-th:border prose-th:border-purple-200
            prose-td:p-3 prose-td:border prose-td:border-gray-200
            prose-blockquote:border-l-4 prose-blockquote:border-purple-500 prose-blockquote:bg-purple-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:italic
            prose-img:rounded-lg prose-img:shadow-md
          ">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {markdown}
            </ReactMarkdown>
          </article>
        </div>

        {/* 하단 액션 */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h3 className="text-lg font-bold text-gray-900 mb-1">구현 준비되셨나요?</h3>
              <p className="text-gray-600 text-sm">35일 로드맵을 따라 스마트 쿠폰 시스템을 구축하세요</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                홈으로
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
              >
                인쇄하기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 푸터 */}
      <div className="max-w-6xl mx-auto px-4 py-8 text-center text-gray-600 text-sm">
        <p>© 2024 Travleap. 스마트 쿠폰 시스템 구현 가이드</p>
      </div>
    </div>
  );
}

export default SmartCouponRoadmapPage;

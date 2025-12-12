import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { CheckCircle } from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { usePageBanner } from '../hooks/usePageBanner';

interface ContactPageProps {
  onBack: () => void;
}

export function ContactPage({ onBack }: ContactPageProps) {
  const bannerImage = usePageBanner('contact');
  const [contactData, setContactData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!contactData.name || !contactData.email || !contactData.message) {
      toast.error('필수 항목을 모두 입력해주세요.');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactData.email)) {
      toast.error('올바른 이메일 형식이 아닙니다.');
      return;
    }

    try {
      const result = await api.createContactSubmission(contactData);

      if (result.success) {
        setIsSubmitted(true);
        toast.success('문의가 성공적으로 접수되었습니다!');
      } else {
        toast.error(result.error || '문의 등록 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error submitting contact:', error);
      toast.error('문의 접수 중 오류가 발생했습니다. 나중에 다시 시도해주세요.');
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl mb-4">문의가 접수되었습니다</h2>
            <p className="text-gray-600 mb-6">
              소중한 문의를 주셔서 감사합니다.<br />
              빠른 시일 내에 답변드리겠습니다.
            </p>
            <Button onClick={onBack} className="w-full">
              홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 배너 섹션 */}
      <div
        className="relative h-[300px] bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url("${bannerImage || 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=1200&h=300&fit=crop'}")`
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-4xl font-bold text-white">문의하기</h1>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* 왼쪽: 문의 폼 */}
            <div>
              <div className="mb-8">
                <h2 className="text-3xl mb-4 text-gray-800">
                  문의하기
                </h2>
                <p className="text-gray-600 text-lg">
                  궁금하신 점을 남겨주시면 빠르게 답변드리겠습니다.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 이름 */}
                <div>
                  <Input
                    type="text"
                    value={contactData.name}
                    onChange={(e) => setContactData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="이름"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* 이메일 */}
                <div>
                  <Input
                    type="email"
                    value={contactData.email}
                    onChange={(e) => setContactData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="이메일"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* 메시지 */}
                <div>
                  <Textarea
                    value={contactData.message}
                    onChange={(e) => setContactData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="문의 내용"
                    rows={6}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* 전송 버튼 */}
                <Button
                  type="submit"
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-base font-medium transition-colors"
                >
                  문의 보내기
                </Button>
              </form>
            </div>

            {/* 오른쪽: 회사 정보 카드 */}
            <div className="flex items-start justify-center lg:justify-end">
              <Card className="w-full max-w-md bg-purple-600 text-white overflow-hidden">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold mb-6">㈜어썸플랜</h3>

                  <div className="space-y-4">
                    {/* 전화번호 */}
                    <div>
                      <p className="text-sm opacity-90">전화번호</p>
                      <p className="text-lg font-medium">0504-0811-1330</p>
                      <p className="text-xs opacity-75 mt-1">평일 09:00 - 18:00 (주말/공휴일 휴무)</p>
                    </div>

                    {/* 이메일 */}
                    <div>
                      <p className="text-sm opacity-90">이메일</p>
                      <p className="text-lg font-medium">awesomeplan4606@naver.com</p>
                    </div>

                    {/* 주소 */}
                    <div>
                      <p className="text-sm opacity-90">주소</p>
                      <p className="text-lg font-medium leading-relaxed">
                        전라남도 목포시 원산중앙로 44 2층<br />
                        (우: 58636)
                      </p>
                    </div>

                    {/* 사업자 정보 */}
                    <div className="pt-4 border-t border-purple-400">
                      <p className="text-xs opacity-75">
                        <span className="font-medium">대표:</span> 함은비<br />
                        <span className="font-medium">사업자등록번호:</span> 268-87-01436<br />
                        <span className="font-medium">통신판매업:</span> 2020-전남목포-0368
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
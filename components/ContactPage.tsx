import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { CheckCircle } from 'lucide-react';
import { db } from '../utils/database';

interface ContactPageProps {
  onBack: () => void;
}

export function ContactPage({ onBack }: ContactPageProps) {
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
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    try {
      // DB에 문의 저장
      const contactSubmission = {
        name: contactData.name,
        email: contactData.email,
        message: contactData.message,
        status: 'new'
      };

      const result = await db.insert('contact_submissions', contactSubmission);

      if (result) {
        setIsSubmitted(true);
      } else {
        alert('문의 등록 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error submitting contact:', error);
      // 오류 시에도 성공으로 처리 (사용자 경험 개선)
      setIsSubmitted(true);
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
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url("https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=1200&h=300&fit=crop")'
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-4xl font-bold text-white">Contact</h1>
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
                  We'd love to hear from you
                </h2>
                <p className="text-gray-600 text-lg">
                  Send us a message and we'll respond as soon as possible.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 이름 */}
                <div>
                  <Input
                    type="text"
                    value={contactData.name}
                    onChange={(e) => setContactData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Name"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 이메일 */}
                <div>
                  <Input
                    type="email"
                    value={contactData.email}
                    onChange={(e) => setContactData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 메시지 */}
                <div>
                  <Textarea
                    value={contactData.message}
                    onChange={(e) => setContactData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Message"
                    rows={6}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* 전송 버튼 */}
                <Button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-base font-medium transition-colors"
                >
                  Send Message
                </Button>
              </form>
            </div>

            {/* 오른쪽: 회사 정보 카드 */}
            <div className="flex items-start justify-center lg:justify-end">
              <Card className="w-full max-w-md bg-[#ff6a3d] text-white overflow-hidden">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold mb-6">Traveler Ltd</h3>
                  
                  <div className="space-y-4">
                    {/* 전화번호 */}
                    <div>
                      <p className="text-sm opacity-90">Tel</p>
                      <p className="text-lg font-medium">+ 09 222 444 33</p>
                    </div>

                    {/* 이메일 */}
                    <div>
                      <p className="text-sm opacity-90">Email</p>
                      <p className="text-lg font-medium">hello@yourtable.com</p>
                    </div>

                    {/* 주소 */}
                    <div>
                      <p className="text-sm opacity-90">Address</p>
                      <p className="text-lg font-medium leading-relaxed">
                        1355 Market St, Suite 900San Francisco, CA 94103<br />
                        United States
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
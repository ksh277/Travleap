import { useState } from 'react';
import { Phone, Mail, MessageCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface FooterProps {
  onCategorySelect?: (category: string) => void;
}

export function Footer({
  onCategorySelect
}: FooterProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubscribe = async () => {
    if (!email || !email.trim()) {
      toast.error('이메일을 입력해주세요.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('올바른 이메일 형식이 아닙니다.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || '뉴스레터 구독이 완료되었습니다!');
        setEmail('');
      } else {
        toast.error(data.error || '구독 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Subscribe error:', error);
      toast.error('구독 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">

        {/* 상단 약관 링크 (네이버 스타일) */}
        <div className="py-4 border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
            <a href="/terms" className="hover:text-purple-600 font-medium">이용약관</a>
            <span className="text-gray-300">|</span>
            <a href="/privacy" className="hover:text-purple-600 font-bold text-gray-900">개인정보처리방침</a>
            <span className="text-gray-300">|</span>
            <a href="/refund-policy" className="hover:text-purple-600 font-medium">취소/환불정책</a>
            <span className="text-gray-300">|</span>
            <a href="/legal" className="hover:text-purple-600">전자금융거래 이용약관</a>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => onCategorySelect?.('contact')}
              className="hover:text-purple-600"
            >
              고객센터
            </button>
          </div>
        </div>

        {/* 메인 Footer 콘텐츠 */}
        <div className="py-10 md:py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">

            {/* 사업자 정보 */}
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-4">어썸플랜</h3>

              <div className="space-y-1.5 text-xs text-gray-600 leading-relaxed">
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <span><span className="text-gray-900 font-medium">대표</span> 함은비</span>
                  <span className="text-gray-300">|</span>
                  <span>
                    <span className="text-gray-900 font-medium">사업자등록번호</span> 268-87-01436
                    <a
                      href="https://www.ftc.go.kr/bizCommPop.do?wrkr_no=2688701436"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 text-purple-600 hover:underline"
                    >
                      [사업자정보확인]
                    </a>
                  </span>
                </div>

                <div>
                  <span className="text-gray-900 font-medium">통신판매업</span> 2020-전남목포-0368
                </div>

                <div>
                  <span className="text-gray-900 font-medium">주소</span> 전라남도 목포시 원산중앙로 44 2층
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span className="text-gray-900 font-medium">이메일</span>
                  </div>
                  <div className="pl-4">
                    CScenter : travleap_cs@gmail.com<br />
                    가맹/입점문의 : travleap_cc@gmail.com
                  </div>
                </div>

                <div>
                  <span className="text-gray-900 font-medium">개인정보보호책임자</span> 김승환
                </div>
              </div>
            </div>

            {/* COMPANY */}
            <div className="lg:pl-24">
              <h3 className="text-base font-bold text-gray-900 mb-4">COMPANY</h3>
              <ul className="space-y-2.5 text-sm text-gray-600">
                <li>
                  <a href="/blog" className="hover:text-purple-600 transition-colors">
                    커뮤니티 블로그
                  </a>
                </li>
                <li>
                  <a href="/rewards" className="hover:text-purple-600 transition-colors">
                    포인트 제도
                  </a>
                </li>
                <li>
                  <a href="/careers" className="hover:text-purple-600 transition-colors">
                    함께 일하기
                  </a>
                </li>
              </ul>
            </div>

            {/* SETTING */}
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-4">SETTING</h3>
              <div>
                <label className="text-sm text-gray-600 block mb-2">통화</label>
                <select className="w-full h-10 text-sm border border-gray-300 rounded-md px-3 bg-white hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors">
                  <option value="KRW">KRW (₩)</option>
                  <option value="USD">USD ($)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CNY">CNY (¥)</option>
                </select>
              </div>
            </div>

            {/* 고객센터 */}
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-4">고객센터</h3>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-2xl font-bold text-gray-900 mb-2">
                    <Phone className="h-6 w-6" />
                    0504-0811-1330
                  </div>
                  <p className="text-sm text-gray-600">평일 09:00 - 18:00</p>
                  <p className="text-xs text-gray-500">(주말/공휴일 휴무)</p>
                </div>

                <button
                  onClick={() => onCategorySelect?.('contact')}
                  className="flex items-center gap-2 text-base text-purple-600 hover:text-purple-700 font-semibold transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                  1:1 문의하기
                </button>

                {/* 뉴스레터 */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-3">뉴스레터</p>
                  <div className="flex flex-col gap-2">
                    <Input
                      type="email"
                      placeholder="이메일 주소"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 text-sm"
                    />
                    <Button
                      onClick={handleSubscribe}
                      disabled={isSubmitting}
                      className="bg-purple-600 hover:bg-purple-700 text-white h-10 px-4 text-sm font-semibold w-full"
                    >
                      구독
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 법정 고지사항 */}
        <div className="py-4 border-t border-gray-200">
          <div className="space-y-2 text-xs text-gray-500 leading-relaxed">
            <p>
              ㈜어썸플랜은 팝업 스토어 상품을 직접 판매하는 통신판매업자입니다.
            </p>
            <p>
              상품 구매 시 개인정보는 배송업체 및 결제대행업체(토스페이먼츠)에 제공되며, 관계 법령에 따라 일정 기간 보관 후 파기됩니다.
            </p>
            <p>
              취소·환불은 「전자상거래법」 및 개별 상품의 정책에 따르며, 자세한 내용은{' '}
              <a href="/refund-policy" className="text-purple-600 hover:underline">취소/환불 정책</a> 페이지를 참고해 주세요.
            </p>
            <p>
              소비자 피해는 공정거래위원회 고시 소비자분쟁해결기준에 따라 보상받을 수 있습니다.
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="py-4 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <div className="text-xs text-gray-500">
              © {new Date().getFullYear()} 어썸플랜. All rights reserved.
            </div>
            <div className="flex gap-4 text-xs text-gray-500">
              <button
                onClick={() => onCategorySelect?.('blog')}
                className="hover:text-purple-600"
              >
                블로그
              </button>
              <button
                onClick={() => onCategorySelect?.('affiliate')}
                className="hover:text-purple-600"
              >
                제휴문의
              </button>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}

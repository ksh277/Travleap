import { useState } from 'react';
import { Phone, Mail } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { t } from '../utils/translations';
import { toast } from 'sonner';

interface FooterProps {
  selectedLanguage?: string;
  selectedCurrency?: string;
  onLanguageChange?: (language: string) => void;
  onCurrencyChange?: (currency: string) => void;
  onCategorySelect?: (category: string) => void;
}

export function Footer({
  selectedLanguage = 'ko',
  selectedCurrency = 'KRW',
  onLanguageChange,
  onCurrencyChange,
  onCategorySelect
}: FooterProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLanguageChange = (value: string) => {
    if (onLanguageChange) {
      onLanguageChange(value);
    }
  };

  const handleCurrencyChange = (value: string) => {
    if (onCurrencyChange) {
      onCurrencyChange(value);
    }
  };

  const handleSubscribe = async () => {
    if (!email || !email.trim()) {
      toast.error('이메일을 입력해주세요.');
      return;
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('올바른 이메일 형식이 아닙니다.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* 뉴스레터 구독 섹션 */}
        <div className="flex items-center justify-center mb-6 md:mb-8">
          <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full max-w-4xl">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                <Mail className="h-4 w-4 text-gray-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-1">{t('getUpdates', selectedLanguage)}</h3>
              <p className="text-xs text-gray-600 mb-3">{t('thoughtfulThoughts', selectedLanguage)}</p>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full">
                <Input
                  type="email"
                  placeholder={t('emailPlaceholder', selectedLanguage)}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 text-xs min-h-[44px] sm:h-8"
                />
                <Button
                  onClick={handleSubscribe}
                  disabled={isSubmitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 min-h-[44px] sm:h-8 text-xs flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '처리 중...' : t('subscribe', selectedLanguage)}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 링크 섹션 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          
          {/* NEED HELP? */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">{t('needHelp', selectedLanguage)}</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <div className="text-gray-600">{t('callUs', selectedLanguage)}</div>
                <div className="flex items-center space-x-1 text-gray-900">
                  <Phone className="h-3 w-3" />
                  <span>0504-0811-1330</span>
                </div>
              </li>
              <li>
                <div className="text-gray-600">{t('emailUs', selectedLanguage)}</div>
                <div className="text-gray-900">awesomeplan4606@naver.com123123</div>
              </li>
            </ul>
          </div>

          {/* COMPANY */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">{t('company', selectedLanguage)}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => onCategorySelect?.('company')}
                  className="text-gray-600 hover:text-purple-600 transition-colors text-left min-h-[1px] flex items-center"
                >
                  회사 소개
                </button>
              </li>
              <li>
                <button
                  onClick={() => onCategorySelect?.('blog')}
                  className="text-gray-600 hover:text-purple-600 transition-colors text-left min-h-[1px] flex items-center"
                >
                  블로그
                </button>
              </li>
              <li>
                <button
                  onClick={() => onCategorySelect?.('community-blog')}
                  className="text-gray-600 hover:text-purple-600 transition-colors text-left min-h-[1px] flex items-center"
                >
                  {t('communityBlog', selectedLanguage)}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onCategorySelect?.('rewards')}
                  className="text-gray-600 hover:text-purple-600 transition-colors text-left min-h-[1px] flex items-center"
                >
                  {t('rewards', selectedLanguage)}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onCategorySelect?.('work-with-us')}
                  className="text-gray-600 hover:text-purple-600 transition-colors text-left min-h-[1px] flex items-center"
                >
                  {t('workWithUs', selectedLanguage)}
                </button>
              </li>
            </ul>
          </div>

          {/* SUPPORT */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">{t('support', selectedLanguage)}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => onCategorySelect?.('mypage')}
                  className="text-gray-600 hover:text-purple-600 transition-colors text-left"
                >
                  {t('account', selectedLanguage)}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onCategorySelect?.('legal')}
                  className="text-gray-600 hover:text-purple-600 transition-colors text-left"
                >
                  {t('legal', selectedLanguage)}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onCategorySelect?.('contact')}
                  className="text-gray-600 hover:text-purple-600 transition-colors text-left"
                >
                  {t('contact', selectedLanguage)}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onCategorySelect?.('affiliate')}
                  className="text-gray-600 hover:text-purple-600 transition-colors text-left"
                >
                  {t('affiliate', selectedLanguage)}
                </button>
              </li>
            </ul>
          </div>

          {/* SETTING */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">{t('setting', selectedLanguage)}</h3>
            <div className="space-y-4">
              {/* 화폐 선택 */}
              <div>
                <label className="text-sm text-gray-600 block mb-2">{t('currency', selectedLanguage)}</label>
                <Select value={selectedCurrency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger className="w-full text-sm min-h-[44px] md:h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KRW">KRW</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="JPY">JPY</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 언어 선택 */}
              <div>
                <label className="text-sm text-gray-600 block mb-2">{t('language', selectedLanguage)}</label>
                <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-full text-sm min-h-[44px] md:h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ko">한국어</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* 저작권 정보 */}
        <div className="border-t border-gray-200 mt-6 md:mt-8 pt-4 md:pt-6">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-3 lg:space-y-0">
            <div className="text-xs text-gray-500 text-center lg:text-left">
              {t('copyright', selectedLanguage)}
            </div>
            <div className="flex flex-wrap justify-center lg:justify-end space-x-4 md:space-x-6 text-xs">
              <a href="#" className="text-gray-500 hover:text-purple-600 transition-colors min-h-[44px] py-2 flex items-center">{t('privacyPolicy', selectedLanguage)}</a>
              <a href="#" className="text-gray-500 hover:text-purple-600 transition-colors min-h-[44px] py-2 flex items-center">{t('termsOfService', selectedLanguage)}</a>
              <a href="#" className="text-gray-500 hover:text-purple-600 transition-colors min-h-[44px] py-2 flex items-center">{t('cookiePolicy', selectedLanguage)}</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

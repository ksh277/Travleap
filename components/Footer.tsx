import { useState } from 'react';
import { Phone, Mail } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { t } from '../utils/translations';

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

  const handleSubscribe = () => {
    if (email) {
      console.log('Subscribing email:', email);
      setEmail('');
      // 여기서 실제 구독 로직을 구현할 수 있습니다
    }
  };

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="container mx-auto px-4 py-8">
        {/* 뉴스레터 구독 섹션 */}
        <div className="flex items-center justify-center mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 flex items-center space-x-4 max-w-md w-full">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                <Mail className="h-4 w-4 text-gray-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-1">{t('getUpdates', selectedLanguage)}</h3>
              <p className="text-xs text-gray-600 mb-3">{t('thoughtfulThoughts', selectedLanguage)}</p>
              <div className="flex space-x-2">
                <Input
                  type="email"
                  placeholder={t('emailPlaceholder', selectedLanguage)}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 text-xs h-8"
                />
                <Button 
                  onClick={handleSubscribe}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 h-8 text-xs"
                >
                  {t('subscribe', selectedLanguage)}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 링크 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* NEED HELP? */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">{t('needHelp', selectedLanguage)}</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <div className="text-gray-600">{t('callUs', selectedLanguage)}</div>
                <div className="flex items-center space-x-1 text-gray-900">
                  <Phone className="h-3 w-3" />
                  <span>010-4617-1303</span>
                </div>
              </li>
              <li>
                <div className="text-gray-600">{t('emailUs', selectedLanguage)}</div>
                <div className="text-gray-900">ham0149@naver.com</div>
              </li>
            </ul>
          </div>

          {/* COMPANY */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">{t('company', selectedLanguage)}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => onCategorySelect?.('about')}
                  className="text-gray-600 hover:text-purple-600 transition-colors text-left"
                >
                  {t('aboutUs', selectedLanguage)}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onCategorySelect?.('community-blog')}
                  className="text-gray-600 hover:text-purple-600 transition-colors text-left"
                >
                  {t('communityBlog', selectedLanguage)}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onCategorySelect?.('rewards')}
                  className="text-gray-600 hover:text-purple-600 transition-colors text-left"
                >
                  {t('rewards', selectedLanguage)}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onCategorySelect?.('work-with-us')}
                  className="text-gray-600 hover:text-purple-600 transition-colors text-left"
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
                  <SelectTrigger className="w-full text-sm h-8">
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
                  <SelectTrigger className="w-full text-sm h-8">
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
        <div className="border-t border-gray-200 mt-8 pt-6">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
            <div className="text-xs text-gray-500">
              {t('copyright', selectedLanguage)}
            </div>
            <div className="flex space-x-6 text-xs">
              <a href="#" className="text-gray-500 hover:text-purple-600 transition-colors">{t('privacyPolicy', selectedLanguage)}</a>
              <a href="#" className="text-gray-500 hover:text-purple-600 transition-colors">{t('termsOfService', selectedLanguage)}</a>
              <a href="#" className="text-gray-500 hover:text-purple-600 transition-colors">{t('cookiePolicy', selectedLanguage)}</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
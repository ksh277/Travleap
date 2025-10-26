/**
 * 벤더 회원가입 페이지
 * - 카테고리별 벤더 계정 생성
 * - 자동으로 partners 테이블에 업체 생성
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { Building2, Store, Hotel, Utensils, Calendar, Car, Zap } from 'lucide-react';

interface VendorCategory {
  value: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const VENDOR_CATEGORIES: VendorCategory[] = [
  {
    value: 'lodging',
    label: '숙박업체',
    icon: <Hotel className="h-5 w-5" />,
    description: '호텔, 펜션, 리조트, 게스트하우스 등'
  },
  {
    value: 'travel',
    label: '여행사',
    icon: <Calendar className="h-5 w-5" />,
    description: '여행 상품, 투어, 액티비티 제공'
  },
  {
    value: 'attraction',
    label: '관광지',
    icon: <Building2 className="h-5 w-5" />,
    description: '관광 명소, 테마파크, 박물관 등'
  },
  {
    value: 'rentcar',
    label: '렌트카',
    icon: <Car className="h-5 w-5" />,
    description: '차량 렌탈 서비스'
  },
  {
    value: 'food',
    label: '음식점',
    icon: <Utensils className="h-5 w-5" />,
    description: '레스토랑, 카페, 식당'
  },
  {
    value: 'popup',
    label: '팝업스토어',
    icon: <Store className="h-5 w-5" />,
    description: '기간 한정 팝업 매장'
  },
  {
    value: 'event',
    label: '행사업체',
    icon: <Zap className="h-5 w-5" />,
    description: '이벤트, 축제, 공연 등'
  },
  {
    value: 'experience',
    label: '체험업체',
    icon: <Building2 className="h-5 w-5" />,
    description: '체험 프로그램, 교육 등'
  }
];

export function SignupVendorPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    vendor_category: '',
    business_name: '',
    business_number: ''
  });

  const [agreements, setAgreements] = useState({
    agreeTerms: false,
    agreePrivacy: false,
    agreeVendorTerms: false
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // 전화번호 자동 포맷팅
    if (field === 'phone') {
      value = value.replace(/[^0-9]/g, '');
      if (value.length <= 3) {
        value = value;
      } else if (value.length <= 7) {
        value = value.slice(0, 3) + '-' + value.slice(3);
      } else if (value.length <= 11) {
        value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7);
      } else {
        value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
      }
    }

    // 사업자번호 자동 포맷팅 (123-45-67890)
    if (field === 'business_number') {
      value = value.replace(/[^0-9]/g, '');
      if (value.length <= 3) {
        value = value;
      } else if (value.length <= 5) {
        value = value.slice(0, 3) + '-' + value.slice(3);
      } else if (value.length <= 10) {
        value = value.slice(0, 3) + '-' + value.slice(3, 5) + '-' + value.slice(5);
      } else {
        value = value.slice(0, 3) + '-' + value.slice(3, 5) + '-' + value.slice(5, 10);
      }
    }

    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCategoryChange = (value: string) => {
    setFormData(prev => ({ ...prev, vendor_category: value }));
    if (errors.vendor_category) {
      setErrors(prev => ({ ...prev, vendor_category: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.username.trim()) {
      newErrors.username = '아이디를 입력해주세요';
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(formData.username)) {
      newErrors.username = '아이디는 영문, 숫자, 언더스코어(_)만 사용 가능하며 3-20자여야 합니다';
    }

    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요';
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
    } else if (formData.password.length < 6) {
      newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
    }

    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = '전화번호를 입력해주세요';
    }

    if (!formData.vendor_category) {
      newErrors.vendor_category = '업체 카테고리를 선택해주세요';
    }

    if (!agreements.agreeTerms) {
      newErrors.agreeTerms = '이용약관에 동의해주세요';
    }

    if (!agreements.agreePrivacy) {
      newErrors.agreePrivacy = '개인정보처리방침에 동의해주세요';
    }

    if (!agreements.agreeVendorTerms) {
      newErrors.agreeVendorTerms = '벤더 약관에 동의해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('입력 정보를 확인해주세요');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/signup-vendor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || '회원가입에 실패했습니다');
      }

      toast.success(result.message || '벤더 회원가입이 완료되었습니다!');

      // 토큰 저장
      if (result.data?.token) {
        localStorage.setItem('auth_token', result.data.token);
        document.cookie = `auth_token=${result.data.token}; path=/; max-age=${7 * 24 * 60 * 60}`;
      }

      // 벤더 대시보드로 이동
      setTimeout(() => {
        if (formData.vendor_category === 'lodging') {
          navigate('/vendor/lodging');
        } else if (formData.vendor_category === 'rentcar') {
          navigate('/vendor/rentcar');
        } else {
          navigate('/vendor');
        }
      }, 1000);

    } catch (error: any) {
      console.error('벤더 회원가입 오류:', error);
      toast.error(error.message || '회원가입에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader className="space-y-3 pb-8">
            <CardTitle className="text-3xl font-bold text-center text-gray-900">벤더 회원가입</CardTitle>
            <CardDescription className="text-center text-base">
              어썸플랜과 함께 성장하는 파트너가 되어보세요
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 업체 카테고리 선택 */}
              <div className="space-y-2">
                <Label>업체 카테고리 *</Label>
                <Select value={formData.vendor_category} onValueChange={handleCategoryChange}>
                  <SelectTrigger className={errors.vendor_category ? 'border-red-500' : ''}>
                    <SelectValue placeholder="카테고리를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {VENDOR_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          {cat.icon}
                          <div>
                            <div className="font-medium">{cat.label}</div>
                            <div className="text-xs text-gray-500">{cat.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.vendor_category && <p className="text-xs text-red-500">{errors.vendor_category}</p>}
              </div>

              {/* 사업자 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business_name">업체명 (선택)</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={handleInputChange('business_name')}
                    placeholder="예: 신안 오션뷰 펜션"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_number">사업자등록번호 (선택)</Label>
                  <Input
                    id="business_number"
                    value={formData.business_number}
                    onChange={handleInputChange('business_number')}
                    placeholder="123-45-67890"
                  />
                </div>
              </div>

              {/* 계정 정보 */}
              <div className="space-y-2">
                <Label htmlFor="username">아이디 *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={handleInputChange('username')}
                  placeholder="영문, 숫자, 언더스코어 3-20자"
                  className={errors.username ? 'border-red-500' : ''}
                />
                {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">이메일 *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  placeholder="vendor@example.com"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호 *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    placeholder="최소 6자 이상"
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">비밀번호 확인 *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
                    placeholder="비밀번호 재입력"
                    className={errors.confirmPassword ? 'border-red-500' : ''}
                  />
                  {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
                </div>
              </div>

              {/* 담당자 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">담당자명 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange('name')}
                    placeholder="홍길동"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">연락처 *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={handleInputChange('phone')}
                    placeholder="010-1234-5678"
                    className={errors.phone ? 'border-red-500' : ''}
                  />
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                </div>
              </div>

              {/* 약관 동의 */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="agreeTerms"
                    checked={agreements.agreeTerms}
                    onCheckedChange={(checked) => setAgreements(prev => ({ ...prev, agreeTerms: checked === true }))}
                  />
                  <label htmlFor="agreeTerms" className="text-sm cursor-pointer">
                    <span className="text-purple-600 font-medium">[필수]</span> 이용약관에 동의합니다
                  </label>
                </div>
                {errors.agreeTerms && <p className="text-xs text-red-500 ml-6">{errors.agreeTerms}</p>}

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="agreePrivacy"
                    checked={agreements.agreePrivacy}
                    onCheckedChange={(checked) => setAgreements(prev => ({ ...prev, agreePrivacy: checked === true }))}
                  />
                  <label htmlFor="agreePrivacy" className="text-sm cursor-pointer">
                    <span className="text-purple-600 font-medium">[필수]</span> 개인정보처리방침에 동의합니다
                  </label>
                </div>
                {errors.agreePrivacy && <p className="text-xs text-red-500 ml-6">{errors.agreePrivacy}</p>}

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="agreeVendorTerms"
                    checked={agreements.agreeVendorTerms}
                    onCheckedChange={(checked) => setAgreements(prev => ({ ...prev, agreeVendorTerms: checked === true }))}
                  />
                  <label htmlFor="agreeVendorTerms" className="text-sm cursor-pointer">
                    <span className="text-purple-600 font-medium">[필수]</span> 벤더 이용약관 및 수수료 정책에 동의합니다
                  </label>
                </div>
                {errors.agreeVendorTerms && <p className="text-xs text-red-500 ml-6">{errors.agreeVendorTerms}</p>}
              </div>

              {/* 제출 버튼 */}
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={isLoading}
              >
                {isLoading ? '처리 중...' : '벤더 회원가입'}
              </Button>

              {/* 로그인 링크 */}
              <div className="text-center text-sm text-gray-600">
                이미 계정이 있으신가요?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-purple-600 hover:underline font-medium"
                >
                  로그인
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

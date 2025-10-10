import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Star,
  Upload,
  Check,
  X,
  Zap,
  TrendingUp,
  Shield,
  Award,
  Camera,
  FileText,
  MessageCircle,
  ArrowRight,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { api } from '../utils/api';
import { toast } from 'sonner';

export function PartnerApplyPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    // 기본 정보
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    businessNumber: '',
    categories: [] as string[],
    address: '',
    location: '',

    // 소개/설명
    description: '',
    services: '',
    promotion: '',
    businessHours: '매일 09:00-18:00',
    discountRate: '',
    website: '',
    instagram: '',

    // 업로드된 파일들
    images: [] as File[],

    // 동의사항
    termsAgreed: false,
    processAgreed: false
  });

  const categories = [
    { id: 'accommodation', name: '숙박', icon: '🏨' },
    { id: 'tour', name: '투어', icon: '🗺️' },
    { id: 'rentcar', name: '렌트카', icon: '🚗' },
    { id: 'food', name: '음식', icon: '🍽️' },
    { id: 'attraction', name: '관광지', icon: '📷' },
    { id: 'experience', name: '체험', icon: '🎨' },
    { id: 'popup', name: '팝업', icon: '🎪' },
    { id: 'event', name: '행사', icon: '📅' }
  ];

  const benefits = [
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: "노출 증가",
      description: "플랫폼 메인, 지도, 추천 섹션에 우선 노출되어 더 많은 고객을 만날 수 있습니다",
      color: "bg-blue-50",
      iconColor: "text-blue-600"
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "예약 관리",
      description: "간편한 예약 시스템으로 재고 관리와 고객 소통을 한 곳에서 해결할 수 있습니다",
      color: "bg-green-50",
      iconColor: "text-green-600"
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "정산 투명",
      description: "투명한 수수료율(5-8%)과 주간 정산으로 안정적인 수익 관리가 가능합니다",
      color: "bg-yellow-50",
      iconColor: "text-yellow-600"
    },
    {
      icon: <Award className="h-8 w-8" />,
      title: "스폰서 배지",
      description: "유료 스폰서 서비스로 검색 최상단 노출과 추천 우선권을 얻을 수 있습니다",
      color: "bg-purple-50",
      iconColor: "text-purple-600"
    }
  ];

  const faqs = [
    {
      question: "승인까지 얼마나 걸리나요?",
      answer: "신청서 제출 후 3-5일 내에 검토가 완료되며, 결과는 이메일로 안내드립니다."
    },
    {
      question: "수수료는 얼마인가요?",
      answer: "카테고리와 서비스에 따라 5-8%의 합리적인 수수료가 적용됩니다. 추가 비용은 없습니다."
    },
    {
      question: "스폰서 배지란 무엇인가요?",
      answer: "월 정액 요금으로 검색 결과 상단 노출, 추천 섹션 우선 배치 등의 마케팅 혜택을 제공합니다."
    },
    {
      question: "승인 거절 사유는 어떻게 확인하나요?",
      answer: "승인 거절 시 구체적인 사유와 개선 방안을 이메일로 상세히 안내해드립니다."
    }
  ];

  const handleCategoryToggle = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files).slice(0, 3); // 최대 3장
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...fileArray].slice(0, 3)
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 폼 검증
    if (!formData.businessName || !formData.contactName || !formData.email || !formData.phone) {
      toast.error('필수 정보를 모두 입력해주세요.');
      return;
    }

    if (!formData.address || !formData.location) {
      toast.error('주소와 위치 정보를 입력해주세요.');
      return;
    }

    if (formData.categories.length === 0) {
      toast.error('최소 하나의 카테고리를 선택해주세요.');
      return;
    }

    if (formData.description.length < 100) {
      toast.error('업체 소개는 최소 100자 이상 입력해주세요.');
      return;
    }

    if (!formData.businessHours) {
      toast.error('영업시간을 입력해주세요.');
      return;
    }

    if (!formData.termsAgreed || !formData.processAgreed) {
      toast.error('약관에 동의해주세요.');
      return;
    }

    try {
      // 현재 사용자 정보 확인
      const user = await api.getCurrentUser();
      if (!user) {
        toast.error('로그인이 필요합니다.');
        return;
      }

      // 파트너 신청 데이터 준비
      const applicationData = {
        user_id: user.id,
        business_name: formData.businessName,
        contact_name: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        contact_email: formData.email,
        contact_phone: formData.phone,
        business_registration_number: formData.businessNumber || null,
        business_address: formData.address,
        location: formData.location,
        website_url: formData.website || null,
        instagram_url: formData.instagram || null,
        categories: formData.categories,
        description: formData.description,
        services_offered: formData.services,
        promotion: formData.promotion || null,
        business_hours: formData.businessHours,
        discount_rate: formData.discountRate ? parseInt(formData.discountRate) : null,
        status: 'pending' as const,
        application_notes: JSON.stringify({
          termsAgreed: formData.termsAgreed,
          processAgreed: formData.processAgreed
        })
      };

      // DB에 파트너 신청 저장
      const response = await api.createPartnerApplication(applicationData);

      if (response.success) {
        toast.success('파트너 신청이 성공적으로 제출되었습니다!');
        setIsSubmitted(true);
      } else {
        throw new Error(response.error || '신청 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('제출 실패:', error);
      toast.error(error instanceof Error ? error.message : '제출 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl mb-2">신청 완료!</h2>
            <p className="text-gray-600 mb-6">
              신청해주셔서 감사합니다.<br />
              3-5일 내 검토 후 승인 결과를<br />
              메일로 안내드리겠습니다.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 히어로 섹션 */}
      <div 
        className="relative h-[60vh] bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('https://images.unsplash.com/photo-1730720426620-9b96001122f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwdXJwbGUlMjBpc2xhbmQlMjBrb3JlYSUyMHRvdXJpc3QlMjBkZXN0aW5hdGlvbnxlbnwxfHx8fDE3NTc2MDIxMzl8MA&ixlib=rb-4.1.0&q=80&w=1080')`
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-center text-white">
          <div className="max-w-4xl px-4">
            <h1 className="text-4xl md:text-5xl mb-4">
              파트너 신청하기
            </h1>
            <h2 className="text-xl md:text-2xl mb-2 opacity-90">
              Become Local Expert
            </h2>
            <p className="text-lg md:text-xl opacity-80 max-w-2xl mx-auto">
              신안의 여행을 함께 만들어갈 로컬 파트너를 모집합니다
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Why Join 섹션 */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl mb-4">파트너가 되어야 하는 이유</h2>
            <p className="text-gray-600 text-lg">신안 여행 플랫폼과 함께 성장하세요</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 ${benefit.color} rounded-lg flex items-center justify-center mx-auto mb-4`}>
                    <div className={benefit.iconColor}>
                      {benefit.icon}
                    </div>
                  </div>
                  <h3 className="text-xl mb-3">{benefit.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 신청 폼 섹션 */}
        <section className="mb-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl mb-4">파트너 신청</h2>
              <p className="text-gray-600">간단한 정보 입력으로 신안 여행 파트너가 되어보세요</p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">진행률</span>
                <span className="text-sm text-gray-500">{currentStep}/3</span>
              </div>
              <Progress value={(currentStep / 3) * 100} className="h-2" />
              <div className="flex justify-between mt-2 text-sm">
                <span className={currentStep >= 1 ? 'text-purple-600' : 'text-gray-400'}>기본정보</span>
                <span className={currentStep >= 2 ? 'text-purple-600' : 'text-gray-400'}>소개</span>
                <span className={currentStep >= 3 ? 'text-purple-600' : 'text-gray-400'}>제출</span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <Card>
                <CardContent className="p-8">
                  {/* Step 1: 기본 정보 */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div className="flex items-center mb-6">
                        <FileText className="h-6 w-6 text-purple-600 mr-3" />
                        <h3 className="text-xl">기본 정보</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="businessName">업체명 *</Label>
                          <Input
                            id="businessName"
                            value={formData.businessName}
                            onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                            placeholder="신안여행사"
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="contactName">담당자 이름 *</Label>
                          <Input
                            id="contactName"
                            value={formData.contactName}
                            onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                            placeholder="홍길동"
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="email">이메일 *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="contact@shinan.com"
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="phone">전화번호 *</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="010-1234-5678"
                            required
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <Label htmlFor="businessNumber">사업자 등록번호 (선택)</Label>
                          <Input
                            id="businessNumber"
                            value={formData.businessNumber}
                            onChange={(e) => setFormData(prev => ({ ...prev, businessNumber: e.target.value }))}
                            placeholder="123-45-67890"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <Label htmlFor="address">주소 *</Label>
                          <Input
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="전남 신안군 압해읍 ..."
                            required
                          />
                        </div>

                        <div className="md:col-span-2">
                          <Label htmlFor="location">위치/지역 *</Label>
                          <Input
                            id="location"
                            value={formData.location}
                            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                            placeholder="신안, 대한민국"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label>카테고리 선택 *</Label>
                        <p className="text-sm text-gray-500 mb-4">제공하시는 서비스 카테고리를 선택해주세요 (다중 선택 가능)</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {categories.map((category) => (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => handleCategoryToggle(category.id)}
                              className={`p-4 rounded-lg border-2 transition-all text-center ${
                                formData.categories.includes(category.id)
                                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="text-2xl mb-2">{category.icon}</div>
                              <div className="text-sm">{category.name}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: 소개/설명 */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="flex items-center mb-6">
                        <MessageCircle className="h-6 w-6 text-purple-600 mr-3" />
                        <h3 className="text-xl">업체 소개</h3>
                      </div>

                      <div>
                        <Label htmlFor="description">업체 소개 *</Label>
                        <p className="text-sm text-gray-500 mb-2">최소 100자 이상 입력해주세요</p>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="신안의 아름다운 자연과 함께하는 특별한 여행 경험을 제공합니다..."
                          rows={5}
                          required
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          {formData.description.length}/100 자
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="services">제공 서비스 설명</Label>
                        <Textarea
                          id="services"
                          value={formData.services}
                          onChange={(e) => setFormData(prev => ({ ...prev, services: e.target.value }))}
                          placeholder="제공하시는 구체적인 서비스나 상품에 대해 설명해주세요..."
                          rows={4}
                        />
                      </div>

                      <div>
                        <Label htmlFor="promotion">프로모션/혜택 정보 (선택)</Label>
                        <Input
                          id="promotion"
                          value={formData.promotion}
                          onChange={(e) => setFormData(prev => ({ ...prev, promotion: e.target.value }))}
                          placeholder="예: 신안 투어 패스 소지자 20% 할인"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="businessHours">영업시간 *</Label>
                          <Input
                            id="businessHours"
                            value={formData.businessHours}
                            onChange={(e) => setFormData(prev => ({ ...prev, businessHours: e.target.value }))}
                            placeholder="매일 09:00-18:00"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="discountRate">할인율 (선택, %)</Label>
                          <Input
                            id="discountRate"
                            type="number"
                            min="0"
                            max="100"
                            value={formData.discountRate}
                            onChange={(e) => setFormData(prev => ({ ...prev, discountRate: e.target.value }))}
                            placeholder="10"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="website">웹사이트 URL (선택)</Label>
                          <Input
                            id="website"
                            type="url"
                            value={formData.website}
                            onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                            placeholder="https://www.example.com"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="instagram">인스타그램 URL (선택)</Label>
                          <Input
                            id="instagram"
                            type="url"
                            value={formData.instagram}
                            onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                            placeholder="https://instagram.com/username"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>대표 이미지 업로드 (최대 3장)</Label>
                        <p className="text-sm text-gray-500 mb-4">업체나 서비스를 대표할 수 있는 이미지를 업로드해주세요</p>
                        
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                            id="image-upload"
                          />
                          <label htmlFor="image-upload" className="cursor-pointer">
                            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">클릭하여 이미지 업로드</p>
                            <p className="text-sm text-gray-500 mt-2">JPG, PNG 파일 (최대 5MB)</p>
                          </label>
                        </div>

                        {formData.images.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                            {formData.images.map((image, index) => (
                              <div key={index} className="relative">
                                <img
                                  src={URL.createObjectURL(image)}
                                  alt={`업로드 이미지 ${index + 1}`}
                                  className="w-full h-32 object-cover rounded-lg"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImage(index)}
                                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 3: 조건 동의 */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div className="flex items-center mb-6">
                        <Shield className="h-6 w-6 text-purple-600 mr-3" />
                        <h3 className="text-xl">약관 동의 및 제출</h3>
                      </div>

                      <div className="bg-gray-50 p-6 rounded-lg">
                        <h4 className="text-lg mb-4">제출 전 확인사항</h4>
                        <div className="space-y-3 text-sm text-gray-700">
                          <div className="flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                            <span>업체명: {formData.businessName}</span>
                          </div>
                          <div className="flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                            <span>담당자: {formData.contactName}</span>
                          </div>
                          <div className="flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                            <span>이메일: {formData.email}</span>
                          </div>
                          <div className="flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                            <span>카테고리: {formData.categories.length}개 선택</span>
                          </div>
                          <div className="flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                            <span>업체 소개: {formData.description.length}자</span>
                          </div>
                          <div className="flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                            <span>업로드 이미지: {formData.images.length}장</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id="terms"
                            checked={formData.termsAgreed}
                            onCheckedChange={(checked) => 
                              setFormData(prev => ({ ...prev, termsAgreed: checked as boolean }))
                            }
                          />
                          <label htmlFor="terms" className="text-sm leading-relaxed">
                            <span className="text-red-500">*</span> 
                            <strong> 이용약관 및 개인정보 수집·이용</strong>에 동의합니다.
                            파트너 서비스 이용을 위한 필수 약관입니다.
                          </label>
                        </div>

                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id="process"
                            checked={formData.processAgreed}
                            onCheckedChange={(checked) => 
                              setFormData(prev => ({ ...prev, processAgreed: checked as boolean }))
                            }
                          />
                          <label htmlFor="process" className="text-sm leading-relaxed">
                            <span className="text-red-500">*</span> 
                            <strong> 제휴 심사 후 승인 절차</strong>를 이해하고 동의합니다.
                            3-5일 내 검토 후 이메일로 결과를 안내받겠습니다.
                          </label>
                        </div>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center mb-2">
                          <Sparkles className="h-5 w-5 text-blue-600 mr-2" />
                          <h4 className="text-blue-800">승인 후 혜택</h4>
                        </div>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• 파트너 전용 관리 대시보드 접근</li>
                          <li>• 예약 및 수익 관리 시스템 이용</li>
                          <li>• 우선 노출 및 추천 서비스 신청 가능</li>
                          <li>• 전담 CS 지원 및 마케팅 협력</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* 네비게이션 버튼 */}
                  <div className="flex justify-between mt-8 pt-6 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                      disabled={currentStep === 1}
                    >
                      이전
                    </Button>
                    
                    <div className="flex gap-2">
                      {currentStep < 3 ? (
                        <Button
                          type="button"
                          onClick={nextStep}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          다음
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                          disabled={!formData.termsAgreed || !formData.processAgreed}
                        >
                          신청서 제출하기
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>
        </section>

        {/* FAQ 섹션 */}
        <section>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl mb-4">자주 묻는 질문</h2>
              <p className="text-gray-600">파트너 신청 관련 궁금한 점을 확인해보세요</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {faqs.map((faq, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <h3 className="text-lg mb-3 text-purple-700">
                      Q. {faq.question}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="text-center mt-8">
              <p className="text-gray-600 mb-4">더 궁금한 점이 있으신가요?</p>
              <Button variant="outline" onClick={() => navigate('/contact')}>
                문의하기
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
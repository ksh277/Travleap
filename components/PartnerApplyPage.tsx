import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  MapPin
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { api } from '../utils/api';
import { usePageBanner } from '../hooks/usePageBanner';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

export function PartnerApplyPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const bannerImage = usePageBanner('partner_apply');
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [addressSearchOpen, setAddressSearchOpen] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    // 기본 정보 (AdminPage와 동일)
    business_name: '',
    contact_name: '',
    email: '',
    phone: '',
    business_address: '',
    location: '',
    services: '', // 카테고리 (단일 선택)

    // 가격 정보
    base_price: '',
    base_price_text: '',

    // 상세 정보
    detailed_address: '',
    description: '',
    images: [] as string[], // URL 배열
    business_hours: '매일 09:00-18:00',

    // 투어/체험 정보
    duration: '',
    min_age: '',
    max_capacity: '',
    language: '',

    // 좌표
    lat: null as number | null,
    lng: null as number | null,

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
  ];

  // 로그인 체크 - 로그인 안 되어 있으면 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('파트너 신청은 로그인 후 가능합니다.');
      navigate('/login', { state: { from: '/partner-apply' } });
    }
  }, [authLoading, user, navigate]);

  // Daum 주소 검색
  const openAddressSearch = () => {
    const daum = (window as any).daum;
    const kakao = (window as any).kakao;

    if (!daum || !daum.Postcode) {
      toast.error('주소 검색 기능을 불러올 수 없습니다. (Daum Postcode API)');
      return;
    }

    if (!kakao || !kakao.maps || !kakao.maps.services) {
      toast.error('좌표 변환 기능을 불러올 수 없습니다. (Kakao Maps API)');
      return;
    }

    new daum.Postcode({
      oncomplete: function(data: any) {
        // 도로명 주소 또는 지번 주소
        const fullAddress = data.roadAddress || data.jibunAddress;

        // Geocoder로 좌표 얻기
        const geocoder = new kakao.maps.services.Geocoder();
        geocoder.addressSearch(fullAddress, (result: any, status: any) => {
          if (status === kakao.maps.services.Status.OK) {
            setFormData(prev => ({
              ...prev,
              business_address: fullAddress,
              location: `${data.sido} ${data.sigungu}`,
              lat: parseFloat(result[0].y),
              lng: parseFloat(result[0].x)
            }));
            toast.success('주소가 설정되었습니다.');
          } else {
            setFormData(prev => ({
              ...prev,
              business_address: fullAddress,
              location: `${data.sido} ${data.sigungu}`,
              lat: null,
              lng: null
            }));
            toast.warning('좌표를 가져올 수 없어 주소만 저장되었습니다.');
          }
        });
      }
    }).open();
  };

  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files).slice(0, 3); // 최대 3장
      setImageFiles(prev => [...prev, ...fileArray].slice(0, 3));
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 폼 검증
    if (!formData.business_name || !formData.contact_name || !formData.email || !formData.phone) {
      toast.error('필수 정보를 모두 입력해주세요.');
      return;
    }

    if (!formData.business_address || !formData.location) {
      toast.error('주소와 위치 정보를 입력해주세요.');
      return;
    }

    if (!formData.services) {
      toast.error('카테고리를 선택해주세요.');
      return;
    }

    if (formData.description.length < 50) {
      toast.error('업체 소개는 최소 50자 이상 입력해주세요.');
      return;
    }

    if (!formData.business_hours) {
      toast.error('영업시간을 입력해주세요.');
      return;
    }

    if (!formData.termsAgreed || !formData.processAgreed) {
      toast.error('약관에 동의해주세요.');
      return;
    }

    try {
      // 이미지가 있으면 먼저 Vercel Blob에 업로드
      const imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        toast.info('이미지를 업로드하고 있습니다...');

        for (const file of imageFiles) {
          try {
            const formDataToSend = new FormData();
            formDataToSend.append('file', file);
            formDataToSend.append('category', 'partners');

            const uploadResponse = await fetch('/api/upload-image', {
              method: 'POST',
              body: formDataToSend,
            });

            const uploadResult = await uploadResponse.json();

            if (uploadResult.success && uploadResult.url) {
              imageUrls.push(uploadResult.url);
              console.log('✅ 이미지 업로드 성공:', uploadResult.url);
            } else {
              console.error('❌ 이미지 업로드 실패:', uploadResult.error);
              toast.warning('일부 이미지 업로드에 실패했습니다.');
            }
          } catch (error) {
            console.error('❌ 이미지 업로드 오류:', error);
            toast.warning('일부 이미지 업로드에 실패했습니다.');
          }
        }
      }

      // 파트너 신청 데이터 준비 (AdminPage와 동일한 필드명)
      const applicationData = {
        business_name: formData.business_name,
        contact_name: formData.contact_name,
        email: formData.email,
        phone: formData.phone,
        business_address: formData.business_address,
        location: formData.location,
        services: formData.services, // 카테고리
        base_price: formData.base_price,
        base_price_text: formData.base_price_text,
        detailed_address: formData.detailed_address,
        description: formData.description,
        images: imageUrls, // Blob URL 배열
        business_hours: formData.business_hours,
        duration: formData.duration,
        min_age: formData.min_age,
        max_capacity: formData.max_capacity,
        language: formData.language,
        lat: formData.lat,
        lng: formData.lng
      };

      // 새 API 엔드포인트로 신청 (인증 토큰 필요)
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];

      if (!token) {
        toast.error('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
        navigate('/login', { state: { from: '/partner-apply' } });
        return;
      }

      const response = await fetch('/api/partners/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(applicationData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('파트너 신청이 성공적으로 제출되었습니다! 관리자 승인 후 연락드리겠습니다.');
        setIsSubmitted(true);
      } else {
        throw new Error(data.message || '신청 처리 중 오류가 발생했습니다.');
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

  // 로그인 확인 중
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로그인 확인 중...</p>
        </div>
      </div>
    );
  }

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
          backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${bannerImage || 'https://images.unsplash.com/photo-1730720426620-9b96001122f0?w=1080&h=300&fit=crop'}')`
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
                          <Label htmlFor="business_name">업체명 *</Label>
                          <Input
                            id="business_name"
                            value={formData.business_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                            placeholder="신안여행사"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="contact_name">담당자 이름 *</Label>
                          <Input
                            id="contact_name"
                            value={formData.contact_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
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
                          <Label>주소 *</Label>
                          <div className="space-y-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={openAddressSearch}
                              className="w-full justify-start text-left"
                            >
                              <MapPin className="h-4 w-4 mr-2" />
                              {formData.business_address || '주소 검색하기'}
                            </Button>
                            {formData.business_address && (
                              <div className="text-sm text-gray-600 pl-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">주소:</span>
                                  <span>{formData.business_address}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">지역:</span>
                                  <span>{formData.location}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <Label htmlFor="location">지역 *</Label>
                          <Input
                            id="location"
                            value={formData.location}
                            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                            placeholder="서비스 지역을 입력하세요"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="services">제공 서비스 (카테고리) *</Label>
                        <p className="text-sm text-gray-500 mb-2">가맹점 페이지에서 필터링에 사용됩니다</p>
                        <Select value={formData.services} onValueChange={(value) => setFormData(prev => ({ ...prev, services: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="카테고리 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.icon} {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Step 2: 상세 정보 */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div className="flex items-center mb-6">
                        <MessageCircle className="h-6 w-6 text-purple-600 mr-3" />
                        <h3 className="text-xl">상세 정보</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="base_price">가격 정보</Label>
                          <Input
                            id="base_price"
                            value={formData.base_price}
                            onChange={(e) => setFormData(prev => ({ ...prev, base_price: e.target.value }))}
                            placeholder="예: 50000"
                          />
                          <p className="text-xs text-gray-500 mt-1">• 숫자만 입력: "50000" → "50,000원"</p>
                        </div>

                        <div>
                          <Label htmlFor="base_price_text">가격 텍스트</Label>
                          <Input
                            id="base_price_text"
                            value={formData.base_price_text}
                            onChange={(e) => setFormData(prev => ({ ...prev, base_price_text: e.target.value }))}
                            placeholder="예: 방4개 전체 예약시 20,000원 할인"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="description">업체 설명 *</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="업체에 대한 상세 설명을 입력하세요"
                          rows={5}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="business_hours">영업시간 *</Label>
                          <Input
                            id="business_hours"
                            value={formData.business_hours}
                            onChange={(e) => setFormData(prev => ({ ...prev, business_hours: e.target.value }))}
                            placeholder="예: 평일 09:00-18:00, 주말 10:00-17:00"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="duration">기간 (일)</Label>
                          <Input
                            id="duration"
                            value={formData.duration}
                            onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                            placeholder="예: 7"
                          />
                          <p className="text-xs text-gray-500 mt-1">투어/체험 기간 (일수)</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <Label htmlFor="min_age">최소 연령</Label>
                          <Input
                            id="min_age"
                            value={formData.min_age}
                            onChange={(e) => setFormData(prev => ({ ...prev, min_age: e.target.value }))}
                            placeholder="예: 18"
                          />
                        </div>

                        <div>
                          <Label htmlFor="max_capacity">최대 인원</Label>
                          <Input
                            id="max_capacity"
                            value={formData.max_capacity}
                            onChange={(e) => setFormData(prev => ({ ...prev, max_capacity: e.target.value }))}
                            placeholder="예: 10"
                          />
                        </div>

                        <div>
                          <Label htmlFor="language">언어</Label>
                          <Input
                            id="language"
                            value={formData.language}
                            onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                            placeholder="예: 한국어, 영어"
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

                        {imageFiles.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                            {imageFiles.map((image, index) => (
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
                            <span>업체명: {formData.business_name}</span>
                          </div>
                          <div className="flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                            <span>담당자: {formData.contact_name}</span>
                          </div>
                          <div className="flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                            <span>이메일: {formData.email}</span>
                          </div>
                          <div className="flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                            <span>카테고리: {formData.services || '미선택'}</span>
                          </div>
                          <div className="flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                            <span>업체 소개: {formData.description.length}자</span>
                          </div>
                          <div className="flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                            <span>업로드 이미지: {imageFiles.length}장</span>
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
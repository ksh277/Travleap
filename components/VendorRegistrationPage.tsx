/**
 * 렌트카 업체 셀프 등록 페이지
 *
 * URL: /vendor/register
 *
 * 기능:
 * 1. 업체명을 몰라도 이메일로 임시 계정 생성 가능
 * 2. 업체가 직접 정보 입력하여 등록 신청
 * 3. 관리자 승인 후 로그인하여 차량 관리
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, CheckCircle, AlertTriangle, Car, Building2, Mail, Phone, User, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface VendorFormData {
  // 업체 정보
  business_name: string;
  business_registration_number: string;
  contact_email: string;
  contact_phone: string;
  contact_person: string;

  // 계정 정보
  account_email: string;
  account_password: string;
  account_password_confirm: string;

  // 사업장 정보
  address: string;
  description: string;
  website_url: string;
  operating_hours: string;
}

export function VendorRegistrationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: 기본정보, 2: 상세정보, 3: 완료
  const [formData, setFormData] = useState<VendorFormData>({
    business_name: '',
    business_registration_number: '',
    contact_email: '',
    contact_phone: '',
    contact_person: '',
    account_email: '',
    account_password: '',
    account_password_confirm: '',
    address: '',
    description: '',
    website_url: '',
    operating_hours: '09:00-18:00'
  });

  const [errors, setErrors] = useState<Partial<Record<keyof VendorFormData, string>>>({});

  const updateField = (field: keyof VendorFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 에러 초기화
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: Partial<Record<keyof VendorFormData, string>> = {};

    if (!formData.business_name.trim()) {
      newErrors.business_name = '업체명을 입력해주세요.';
    }

    if (!formData.contact_person.trim()) {
      newErrors.contact_person = '담당자명을 입력해주세요.';
    }

    if (!formData.contact_email.trim()) {
      newErrors.contact_email = '연락처 이메일을 입력해주세요.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = '올바른 이메일 형식이 아닙니다.';
    }

    if (!formData.contact_phone.trim()) {
      newErrors.contact_phone = '전화번호를 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Partial<Record<keyof VendorFormData, string>> = {};

    if (!formData.account_email.trim()) {
      newErrors.account_email = '로그인 이메일을 입력해주세요.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.account_email)) {
      newErrors.account_email = '올바른 이메일 형식이 아닙니다.';
    }

    if (!formData.account_password) {
      newErrors.account_password = '비밀번호를 입력해주세요.';
    } else if (formData.account_password.length < 8) {
      newErrors.account_password = '비밀번호는 최소 8자 이상이어야 합니다.';
    }

    if (formData.account_password !== formData.account_password_confirm) {
      newErrors.account_password_confirm = '비밀번호가 일치하지 않습니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // API 호출 (실제 구현 필요)
      const response = await fetch('/api/rentcar/vendor-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: formData.business_name,
          business_registration_number: formData.business_registration_number || undefined,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          contact_person: formData.contact_person,
          account_email: formData.account_email,
          account_password: formData.account_password,
          address: formData.address || undefined,
          description: formData.description || undefined,
          website_url: formData.website_url || undefined,
          operating_hours: formData.operating_hours
        })
      });

      const result = await response.json();

      if (result.success) {
        setStep(3);
        toast.success('등록 신청이 완료되었습니다!');
      } else {
        throw new Error(result.message || '등록 신청에 실패했습니다.');
      }

    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error instanceof Error ? error.message : '등록 신청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">등록 신청 완료!</CardTitle>
            <CardDescription>
              렌트카 업체 등록 신청이 성공적으로 제출되었습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">✅ 신청 완료</p>
                  <p className="text-sm text-gray-600">
                    관리자 승인 후 로그인하여 차량을 등록하고 관리할 수 있습니다.
                  </p>
                  <p className="text-sm text-gray-600">
                    승인은 영업일 기준 1-2일 소요되며, 이메일로 알림을 드립니다.
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">📧 등록된 계정 정보</p>
              <p className="text-sm text-blue-800">이메일: {formData.account_email}</p>
              <p className="text-xs text-blue-600 mt-2">승인 후 이 이메일로 로그인하세요.</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => navigate('/')} variant="outline" className="flex-1">
                홈으로
              </Button>
              <Button onClick={() => navigate('/login')} className="flex-1">
                로그인 페이지로
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">렌트카 업체 등록</h1>
          <p className="text-gray-600">Travleap 렌트카 파트너로 함께하세요</p>
        </div>

        {/* 진행 단계 */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <div className={`w-20 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
            <div className={`w-20 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              3
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 ? '1단계: 업체 기본 정보' : '2단계: 계정 정보'}
            </CardTitle>
            <CardDescription>
              {step === 1
                ? '렌트카 업체의 기본 정보를 입력해주세요.'
                : '로그인에 사용할 계정 정보를 설정해주세요.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === 1 ? (
              <>
                {/* 업체명 */}
                <div className="space-y-2">
                  <Label htmlFor="business_name">
                    <Building2 className="inline w-4 h-4 mr-1" />
                    업체명 *
                  </Label>
                  <Input
                    id="business_name"
                    placeholder="예: 신안렌트카"
                    value={formData.business_name}
                    onChange={(e) => updateField('business_name', e.target.value)}
                  />
                  {errors.business_name && (
                    <p className="text-sm text-red-600">{errors.business_name}</p>
                  )}
                </div>

                {/* 사업자등록번호 */}
                <div className="space-y-2">
                  <Label htmlFor="business_registration_number">
                    사업자등록번호 (선택)
                  </Label>
                  <Input
                    id="business_registration_number"
                    placeholder="예: 123-45-67890"
                    value={formData.business_registration_number}
                    onChange={(e) => updateField('business_registration_number', e.target.value)}
                  />
                </div>

                {/* 담당자명 */}
                <div className="space-y-2">
                  <Label htmlFor="contact_person">
                    <User className="inline w-4 h-4 mr-1" />
                    담당자명 *
                  </Label>
                  <Input
                    id="contact_person"
                    placeholder="예: 홍길동"
                    value={formData.contact_person}
                    onChange={(e) => updateField('contact_person', e.target.value)}
                  />
                  {errors.contact_person && (
                    <p className="text-sm text-red-600">{errors.contact_person}</p>
                  )}
                </div>

                {/* 연락처 이메일 */}
                <div className="space-y-2">
                  <Label htmlFor="contact_email">
                    <Mail className="inline w-4 h-4 mr-1" />
                    연락처 이메일 *
                  </Label>
                  <Input
                    id="contact_email"
                    type="email"
                    placeholder="예: contact@rentcar.com"
                    value={formData.contact_email}
                    onChange={(e) => updateField('contact_email', e.target.value)}
                  />
                  {errors.contact_email && (
                    <p className="text-sm text-red-600">{errors.contact_email}</p>
                  )}
                </div>

                {/* 전화번호 */}
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">
                    <Phone className="inline w-4 h-4 mr-1" />
                    전화번호 *
                  </Label>
                  <Input
                    id="contact_phone"
                    placeholder="예: 010-1234-5678"
                    value={formData.contact_phone}
                    onChange={(e) => updateField('contact_phone', e.target.value)}
                  />
                  {errors.contact_phone && (
                    <p className="text-sm text-red-600">{errors.contact_phone}</p>
                  )}
                </div>

                {/* 주소 */}
                <div className="space-y-2">
                  <Label htmlFor="address">사업장 주소 (선택)</Label>
                  <Input
                    id="address"
                    placeholder="예: 전라남도 신안군 압해읍"
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                  />
                </div>

                {/* 업체 소개 */}
                <div className="space-y-2">
                  <Label htmlFor="description">업체 소개 (선택)</Label>
                  <Textarea
                    id="description"
                    placeholder="업체를 간단히 소개해주세요."
                    rows={4}
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                {/* 계정 이메일 */}
                <div className="space-y-2">
                  <Label htmlFor="account_email">
                    <Mail className="inline w-4 h-4 mr-1" />
                    로그인 이메일 *
                  </Label>
                  <Input
                    id="account_email"
                    type="email"
                    placeholder="로그인에 사용할 이메일"
                    value={formData.account_email}
                    onChange={(e) => updateField('account_email', e.target.value)}
                  />
                  {errors.account_email && (
                    <p className="text-sm text-red-600">{errors.account_email}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    이 이메일로 로그인하여 차량을 관리할 수 있습니다.
                  </p>
                </div>

                {/* 비밀번호 */}
                <div className="space-y-2">
                  <Label htmlFor="account_password">
                    <Lock className="inline w-4 h-4 mr-1" />
                    비밀번호 *
                  </Label>
                  <Input
                    id="account_password"
                    type="password"
                    placeholder="최소 8자 이상"
                    value={formData.account_password}
                    onChange={(e) => updateField('account_password', e.target.value)}
                  />
                  {errors.account_password && (
                    <p className="text-sm text-red-600">{errors.account_password}</p>
                  )}
                </div>

                {/* 비밀번호 확인 */}
                <div className="space-y-2">
                  <Label htmlFor="account_password_confirm">
                    <Lock className="inline w-4 h-4 mr-1" />
                    비밀번호 확인 *
                  </Label>
                  <Input
                    id="account_password_confirm"
                    type="password"
                    placeholder="비밀번호를 다시 입력하세요"
                    value={formData.account_password_confirm}
                    onChange={(e) => updateField('account_password_confirm', e.target.value)}
                  />
                  {errors.account_password_confirm && (
                    <p className="text-sm text-red-600">{errors.account_password_confirm}</p>
                  )}
                </div>

                {/* 웹사이트 */}
                <div className="space-y-2">
                  <Label htmlFor="website_url">웹사이트 (선택)</Label>
                  <Input
                    id="website_url"
                    placeholder="예: https://www.rentcar.com"
                    value={formData.website_url}
                    onChange={(e) => updateField('website_url', e.target.value)}
                  />
                </div>

                {/* 운영 시간 */}
                <div className="space-y-2">
                  <Label htmlFor="operating_hours">운영 시간</Label>
                  <Input
                    id="operating_hours"
                    placeholder="예: 09:00-18:00"
                    value={formData.operating_hours}
                    onChange={(e) => updateField('operating_hours', e.target.value)}
                  />
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    관리자 승인 후 로그인이 가능합니다. 승인 완료 시 이메일로 알림을 드립니다.
                  </AlertDescription>
                </Alert>
              </>
            )}

            {/* 버튼 */}
            <div className="flex gap-2 pt-4">
              {step === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  이전
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  step === 1 ? '다음' : '등록 신청'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 하단 안내 */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>이미 계정이 있으신가요? <a href="/login" className="text-blue-600 hover:underline">로그인</a></p>
          <p className="mt-2">문의사항: <a href="mailto:support@travleap.com" className="text-blue-600 hover:underline">support@travleap.com</a></p>
        </div>
      </div>
    </div>
  );
}

export default VendorRegistrationPage;

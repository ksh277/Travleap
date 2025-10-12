'use client';

/**
 * 렌트카 예약 프로세스 (Multi-Step Form)
 * Step 1: 차량 확인 & 추가 옵션 선택
 * Step 2: 운전자 정보 입력
 * Step 3: 결제 정보 입력
 * Step 4: 예약 확인 및 완료
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Car,
  User,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Info,
  Loader2,
} from 'lucide-react';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import type { CarSearchResult } from '@/utils/rentcar/types';

type BookingStep = 1 | 2 | 3 | 4;

interface DriverInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseIssueDate: string;
  birthDate: string;
  address: string;
}

interface PaymentInfo {
  method: 'card' | 'bank' | 'kakao' | 'toss';
  cardNumber?: string;
  cardExpiry?: string;
  cardCvc?: string;
  cardHolder?: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
  agreeCancel: boolean;
}

export default function RentcarBookingPage() {
  const params = useParams();
  const router = useRouter();
  const rateKey = params.rateKey as string;

  const [currentStep, setCurrentStep] = useState<BookingStep>(1);
  const [carData, setCarData] = useState<CarSearchResult | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [driverInfo, setDriverInfo] = useState<DriverInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    licenseIssueDate: '',
    birthDate: '',
    address: '',
  });
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    method: 'card',
    agreeTerms: false,
    agreePrivacy: false,
    agreeCancel: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

  // 차량 데이터 로드
  useEffect(() => {
    loadCarData();
  }, [rateKey]);

  const loadCarData = async () => {
    setIsLoading(true);
    try {
      // TODO: API 호출
      // const response = await fetch(`/api/rentcar/rates/${rateKey}`);
      // const data = await response.json();

      // Mock data for now
      await new Promise(resolve => setTimeout(resolve, 500));
      setCarData(generateMockCarData());
    } catch (error) {
      console.error('Failed to load car data:', error);
      alert('차량 정보를 불러올 수 없습니다.');
      router.push('/rentcars');
    } finally {
      setIsLoading(false);
    }
  };

  // 추가 옵션 토글
  const toggleExtra = (code: string) => {
    setSelectedExtras(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  // 총 금액 계산
  const calculateTotal = () => {
    if (!carData) return 0;

    const baseTotal = carData.price.total;
    const extrasTotal = carData.extras
      .filter(e => selectedExtras.includes(e.code))
      .reduce((sum, e) => sum + e.price, 0);

    return baseTotal + extrasTotal;
  };

  // 다음 단계로
  const goToNextStep = () => {
    if (currentStep === 1) {
      // 차량 확인 완료
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // 운전자 정보 검증
      if (!validateDriverInfo()) {
        alert('모든 필수 정보를 입력해주세요.');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // 결제 정보 검증 및 예약 완료
      if (!validatePaymentInfo()) {
        alert('결제 정보를 확인해주세요.');
        return;
      }
      handleBooking();
    }
  };

  // 운전자 정보 검증
  const validateDriverInfo = () => {
    return (
      driverInfo.firstName &&
      driverInfo.lastName &&
      driverInfo.email &&
      driverInfo.phone &&
      driverInfo.licenseNumber &&
      driverInfo.licenseIssueDate &&
      driverInfo.birthDate
    );
  };

  // 결제 정보 검증
  const validatePaymentInfo = () => {
    if (paymentInfo.method === 'card') {
      if (!paymentInfo.cardNumber || !paymentInfo.cardExpiry || !paymentInfo.cardCvc || !paymentInfo.cardHolder) {
        return false;
      }
    }
    return paymentInfo.agreeTerms && paymentInfo.agreePrivacy && paymentInfo.agreeCancel;
  };

  // 예약 처리
  const handleBooking = async () => {
    setIsLoading(true);
    try {
      // TODO: API 호출
      // const response = await fetch('/api/rentcar/bookings', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     rateKey,
      //     extras: selectedExtras,
      //     driver: driverInfo,
      //     payment: paymentInfo,
      //   })
      // });
      // const data = await response.json();

      // Mock booking
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockBookingId = Math.floor(Math.random() * 100000);
      setBookingId(mockBookingId);
      setCurrentStep(4);
    } catch (error) {
      console.error('Booking failed:', error);
      alert('예약 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !carData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!carData) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* 진행 단계 표시 */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[
              { step: 1, icon: Car, label: '차량 확인' },
              { step: 2, icon: User, label: '운전자 정보' },
              { step: 3, icon: CreditCard, label: '결제' },
              { step: 4, icon: CheckCircle, label: '완료' },
            ].map(({ step, icon: Icon, label }, idx) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      currentStep >= step
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {currentStep > step ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                  </div>
                  <span className="text-xs mt-2 font-medium">{label}</span>
                </div>
                {idx < 3 && (
                  <div
                    className={`flex-1 h-1 mx-4 ${
                      currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 메인 컨텐츠 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: 차량 확인 & 옵션 선택 */}
            {currentStep === 1 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>차량 확인</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4">
                      <div className="w-48 h-36 relative rounded-lg overflow-hidden flex-shrink-0">
                        <ImageWithFallback
                          src={carData.vehicle.images[0]}
                          alt={carData.vehicle.model}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold">{carData.vehicle.model}</h3>
                        <p className="text-gray-600">{carData.vehicle.make} 또는 동급</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge variant="outline">{carData.vehicle.seats}인승</Badge>
                          <Badge variant="outline">
                            {carData.vehicle.transmission === 'Automatic' ? '자동' : '수동'}
                          </Badge>
                          <Badge variant="outline">
                            {carData.vehicle.fuel === 'Gasoline' ? '휘발유' : carData.vehicle.fuel}
                          </Badge>
                          {carData.vehicle.airConditioning && (
                            <Badge variant="outline">에어컨</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>추가 옵션</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {carData.extras.map((extra) => (
                      <label
                        key={extra.code}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedExtras.includes(extra.code)}
                            onCheckedChange={() => toggleExtra(extra.code)}
                          />
                          <div>
                            <div className="font-medium">{extra.name}</div>
                            {extra.required && (
                              <span className="text-xs text-red-600">필수</span>
                            )}
                          </div>
                        </div>
                        <span className="font-semibold">
                          +₩{extra.price.toLocaleString()}
                        </span>
                      </label>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}

            {/* Step 2: 운전자 정보 */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>운전자 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>성 *</Label>
                      <Input
                        value={driverInfo.lastName}
                        onChange={(e) => setDriverInfo({ ...driverInfo, lastName: e.target.value })}
                        placeholder="홍"
                      />
                    </div>
                    <div>
                      <Label>이름 *</Label>
                      <Input
                        value={driverInfo.firstName}
                        onChange={(e) => setDriverInfo({ ...driverInfo, firstName: e.target.value })}
                        placeholder="길동"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>이메일 *</Label>
                    <Input
                      type="email"
                      value={driverInfo.email}
                      onChange={(e) => setDriverInfo({ ...driverInfo, email: e.target.value })}
                      placeholder="example@email.com"
                    />
                  </div>

                  <div>
                    <Label>전화번호 *</Label>
                    <Input
                      type="tel"
                      value={driverInfo.phone}
                      onChange={(e) => setDriverInfo({ ...driverInfo, phone: e.target.value })}
                      placeholder="010-1234-5678"
                    />
                  </div>

                  <div>
                    <Label>운전면허 번호 *</Label>
                    <Input
                      value={driverInfo.licenseNumber}
                      onChange={(e) => setDriverInfo({ ...driverInfo, licenseNumber: e.target.value })}
                      placeholder="12-34-567890-12"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>면허 발급일 *</Label>
                      <Input
                        type="date"
                        value={driverInfo.licenseIssueDate}
                        onChange={(e) => setDriverInfo({ ...driverInfo, licenseIssueDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>생년월일 *</Label>
                      <Input
                        type="date"
                        value={driverInfo.birthDate}
                        onChange={(e) => setDriverInfo({ ...driverInfo, birthDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>주소</Label>
                    <Input
                      value={driverInfo.address}
                      onChange={(e) => setDriverInfo({ ...driverInfo, address: e.target.value })}
                      placeholder="서울특별시 강남구..."
                    />
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg flex items-start gap-2 text-sm text-blue-800">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      운전자는 만 21세 이상이어야 하며, 면허 취득 후 1년 이상 경과해야 합니다.
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: 결제 정보 */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>결제 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 결제 방법 선택 */}
                  <div>
                    <Label>결제 수단</Label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {[
                        { value: 'card', label: '신용카드' },
                        { value: 'bank', label: '계좌이체' },
                        { value: 'kakao', label: '카카오페이' },
                        { value: 'toss', label: '토스' },
                      ].map((method) => (
                        <button
                          key={method.value}
                          type="button"
                          className={`p-3 border rounded-lg ${
                            paymentInfo.method === method.value
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200'
                          }`}
                          onClick={() => setPaymentInfo({ ...paymentInfo, method: method.value as any })}
                        >
                          {method.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 카드 정보 입력 */}
                  {paymentInfo.method === 'card' && (
                    <>
                      <div>
                        <Label>카드 번호</Label>
                        <Input
                          value={paymentInfo.cardNumber || ''}
                          onChange={(e) => setPaymentInfo({ ...paymentInfo, cardNumber: e.target.value })}
                          placeholder="1234-5678-9012-3456"
                          maxLength={19}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>유효기간</Label>
                          <Input
                            value={paymentInfo.cardExpiry || ''}
                            onChange={(e) => setPaymentInfo({ ...paymentInfo, cardExpiry: e.target.value })}
                            placeholder="MM/YY"
                            maxLength={5}
                          />
                        </div>
                        <div>
                          <Label>CVC</Label>
                          <Input
                            value={paymentInfo.cardCvc || ''}
                            onChange={(e) => setPaymentInfo({ ...paymentInfo, cardCvc: e.target.value })}
                            placeholder="123"
                            maxLength={3}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>카드 소유자</Label>
                        <Input
                          value={paymentInfo.cardHolder || ''}
                          onChange={(e) => setPaymentInfo({ ...paymentInfo, cardHolder: e.target.value })}
                          placeholder="HONG GILDONG"
                        />
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* 약관 동의 */}
                  <div className="space-y-3">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <Checkbox
                        checked={paymentInfo.agreeTerms}
                        onCheckedChange={(checked) =>
                          setPaymentInfo({ ...paymentInfo, agreeTerms: !!checked })
                        }
                      />
                      <span className="text-sm">
                        이용약관에 동의합니다. <span className="text-red-600">*</span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <Checkbox
                        checked={paymentInfo.agreePrivacy}
                        onCheckedChange={(checked) =>
                          setPaymentInfo({ ...paymentInfo, agreePrivacy: !!checked })
                        }
                      />
                      <span className="text-sm">
                        개인정보 처리방침에 동의합니다. <span className="text-red-600">*</span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <Checkbox
                        checked={paymentInfo.agreeCancel}
                        onCheckedChange={(checked) =>
                          setPaymentInfo({ ...paymentInfo, agreeCancel: !!checked })
                        }
                      />
                      <span className="text-sm">
                        취소 및 환불 정책에 동의합니다. <span className="text-red-600">*</span>
                      </span>
                    </label>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: 예약 완료 */}
            {currentStep === 4 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">예약이 완료되었습니다!</h2>
                  <p className="text-gray-600 mb-6">
                    예약번호: <span className="font-mono font-semibold">#{bookingId}</span>
                  </p>
                  <p className="text-sm text-gray-600 mb-8">
                    예약 확인 메일이 {driverInfo.email}로 발송되었습니다.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={() => router.push('/mypage/rentcars')}>
                      예약 내역 보기
                    </Button>
                    <Button onClick={() => router.push('/rentcars')}>
                      다른 차량 검색
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 네비게이션 버튼 */}
            {currentStep < 4 && (
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (currentStep === 1) {
                      router.back();
                    } else {
                      setCurrentStep((prev) => (prev - 1) as BookingStep);
                    }
                  }}
                  disabled={isLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  {currentStep === 1 ? '검색으로 돌아가기' : '이전'}
                </Button>
                <Button onClick={goToNextStep} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      처리 중...
                    </>
                  ) : currentStep === 3 ? (
                    '결제하기'
                  ) : (
                    <>
                      다음
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* 우측 사이드바: 예약 요약 */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>예약 요약</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 차량 정보 */}
                <div>
                  <div className="font-semibold">{carData.vehicle.model}</div>
                  <div className="text-sm text-gray-600">{carData.vehicle.make}</div>
                </div>

                <Separator />

                {/* 날짜 정보 */}
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">픽업</span>
                    <span className="font-medium">2024-01-15 10:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">반납</span>
                    <span className="font-medium">2024-01-18 10:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">대여 기간</span>
                    <span className="font-medium">3일</span>
                  </div>
                </div>

                <Separator />

                {/* 가격 상세 */}
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">기본 요금</span>
                    <span>₩{carData.price.base.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">세금</span>
                    <span>₩{carData.price.taxes.toLocaleString()}</span>
                  </div>
                  {selectedExtras.length > 0 && (
                    <>
                      {carData.extras
                        .filter((e) => selectedExtras.includes(e.code))
                        .map((extra) => (
                          <div key={extra.code} className="flex justify-between">
                            <span className="text-gray-600">{extra.name}</span>
                            <span>₩{extra.price.toLocaleString()}</span>
                          </div>
                        ))}
                    </>
                  )}
                </div>

                <Separator />

                {/* 총 금액 */}
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>총 금액</span>
                  <span className="text-blue-600">₩{calculateTotal().toLocaleString()}</span>
                </div>

                {/* 결제 유형 */}
                <div className="text-xs text-gray-600 text-center">
                  {carData.price.paymentType === 'PREPAID' ? '선불 결제' : '현장 결제'}
                </div>

                {/* 보증금 안내 */}
                {carData.price.depositRequired && (
                  <div className="p-2 bg-yellow-50 rounded text-xs text-yellow-800">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    보증금 ₩{carData.price.depositRequired.toLocaleString()} 필요
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mock 데이터 생성
function generateMockCarData(): CarSearchResult {
  return {
    rateKey: 'MOCK_RATE_KEY',
    vehicle: {
      code: 'VEH_001',
      category: 'COMPACT',
      make: '현대',
      model: '아반떼',
      year: 2023,
      seats: 5,
      luggage: { large: 2, small: 1 },
      transmission: 'Automatic',
      fuel: 'Gasoline',
      airConditioning: true,
      images: ['https://images.unsplash.com/photo-1549317661-bd32c8ce0db2'],
    },
    price: {
      base: 150000,
      taxes: 15000,
      fees: [{ name: '공항세', amount: 5000 }],
      total: 170000,
      currency: 'KRW',
      paymentType: 'PREPAID',
      depositRequired: 300000,
    },
    policies: {
      mileage: 'UNLIMITED',
      fuel: 'FULL_TO_FULL',
      cancellation: {
        free: true,
        deadline: '2024-01-14T00:00:00Z',
        fee: 0,
      },
      insurance: {
        included: true,
        type: 'CDW',
        excess: 300000,
        deposit: 500000,
      },
    },
    extras: [
      { code: 'GPS', name: 'GPS 내비게이션', price: 10000, required: false },
      { code: 'CHILD_SEAT', name: '어린이 카시트', price: 15000, required: false },
      { code: 'ADDITIONAL_DRIVER', name: '추가 운전자', price: 20000, required: false },
    ],
    vendor: {
      id: 1,
      code: 'VENDOR_1',
      name: '프리미엄 렌트카',
      rating: 4.5,
    },
    location: {
      pickup: { name: '인천공항', address: '인천광역시 중구 공항로', lat: 37.4563, lng: 126.4414 },
      dropoff: { name: '인천공항', address: '인천광역시 중구 공항로', lat: 37.4563, lng: 126.4414 },
    },
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
}

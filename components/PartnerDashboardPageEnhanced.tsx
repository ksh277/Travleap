/**
 * 파트너(가맹점) 메인 대시보드
 * /partner/dashboard
 *
 * 탭 구성:
 * - 홈: 통계 요약
 * - 쿠폰 스캔: QR/코드 입력으로 쿠폰 사용 처리
 * - 사용 내역: 쿠폰 사용 기록
 * - 정산: 정산 내역 (추후)
 * - 설정: 업체 정보 수정
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Store,
  QrCode,
  Receipt,
  Settings,
  Loader2,
  LogOut,
  Search,
  CheckCircle,
  AlertCircle,
  Calculator,
  Percent,
  RefreshCw,
  History,
  Wallet,
  TrendingUp,
  Users,
  Edit,
  Save,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

interface PartnerInfo {
  id: number;
  user_id: number;
  business_name: string;
  business_type?: string;
  partner_type?: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  address?: string;
  services?: string;
  is_verified: boolean;
  is_coupon_partner: boolean;
  coupon_settings: {
    discount_type: string;
    discount_value: number;
    max_discount: number | null;
    min_order: number | null;
  };
  stats: {
    total_coupon_usage: number;
    total_discount_given: number;
  };
}

interface CouponValidation {
  user_coupon_id: number;
  coupon_code: string;
  coupon_name: string;
  coupon_description?: string;
  customer_name: string;
  discount: {
    type: 'PERCENT' | 'AMOUNT';
    value: number;
    max_discount: number | null;
    min_order: number;
  };
}

interface UsageRecord {
  id: number;
  coupon_code: string;
  customer_name: string;
  order_amount: number;
  discount_amount: number;
  final_amount: number;
  used_at: string;
}

export function PartnerDashboardPageEnhanced() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout, sessionRestored } = useAuth();

  const [loading, setLoading] = useState(true);
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [activeTab, setActiveTab] = useState('home');

  // 쿠폰 스캔 상태
  const [couponCode, setCouponCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<CouponValidation | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [orderAmount, setOrderAmount] = useState('');
  const [calculatedDiscount, setCalculatedDiscount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [useSuccess, setUseSuccess] = useState(false);
  const [useError, setUseError] = useState<string | null>(null);

  // 사용 내역 상태
  const [usageHistory, setUsageHistory] = useState<UsageRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyStats, setHistoryStats] = useState({ totalCount: 0, totalDiscount: 0 });

  // 업체 정보 수정
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editedInfo, setEditedInfo] = useState<Partial<PartnerInfo>>({});

  // 세션 복원 대기
  if (!sessionRestored) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">세션을 확인하는 중...</p>
        </div>
      </div>
    );
  }

  // 파트너 정보 로드
  useEffect(() => {
    if (user?.id) {
      loadPartnerData();
    }
  }, [user?.id]);

  // URL에서 쿠폰 코드 가져오기
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setCouponCode(codeFromUrl.toUpperCase());
      setActiveTab('scan');
      handleValidate(codeFromUrl.toUpperCase());
    }
  }, [searchParams]);

  // 금액 변경 시 할인 계산
  useEffect(() => {
    if (!validation || !orderAmount) {
      setCalculatedDiscount(0);
      setFinalAmount(0);
      return;
    }

    const amount = parseInt(orderAmount) || 0;
    const { type, value, max_discount, min_order } = validation.discount;

    if (amount < min_order) {
      setCalculatedDiscount(0);
      setFinalAmount(amount);
      return;
    }

    let discount = 0;
    if (type === 'PERCENT') {
      discount = Math.floor(amount * value / 100);
      if (max_discount && discount > max_discount) {
        discount = max_discount;
      }
    } else {
      discount = value;
    }

    setCalculatedDiscount(discount);
    setFinalAmount(amount - discount);
  }, [orderAmount, validation]);

  const loadPartnerData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/partner/info?userId=${user.id}`);
      const data = await response.json();

      if (!data.success || !data.data) {
        toast.error('파트너 정보를 찾을 수 없습니다.');
        return;
      }

      setPartnerInfo(data.data);
      console.log('✅ 파트너 데이터 로드 완료:', data.data.business_name);
    } catch (error) {
      console.error('파트너 데이터 로드 실패:', error);
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 쿠폰 검증
  const handleValidate = async (code?: string) => {
    const targetCode = code || couponCode;
    if (!targetCode.trim()) {
      setValidationError('쿠폰 코드를 입력해주세요');
      return;
    }

    setValidating(true);
    setValidation(null);
    setValidationError(null);
    setUseSuccess(false);
    setUseError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/coupon/validate?code=${targetCode}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok) {
        setValidationError(data.message || '쿠폰 검증 실패');
        return;
      }

      setValidation(data.data);
    } catch (error) {
      setValidationError('쿠폰 검증 중 오류가 발생했습니다');
    } finally {
      setValidating(false);
    }
  };

  // 쿠폰 사용 처리
  const handleUseCoupon = async () => {
    if (!validation || !orderAmount) return;

    const amount = parseInt(orderAmount);
    if (amount < validation.discount.min_order) {
      setUseError(`최소 주문 금액은 ${validation.discount.min_order.toLocaleString()}원입니다`);
      return;
    }

    setProcessing(true);
    setUseError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/coupon/use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          coupon_code: couponCode,
          order_amount: amount
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setUseError(data.message || '쿠폰 사용 처리 실패');
        return;
      }

      setUseSuccess(true);
      setValidation(null);
      // 파트너 데이터 새로고침 (통계 업데이트)
      loadPartnerData();
    } catch (error) {
      setUseError('쿠폰 사용 처리 중 오류가 발생했습니다');
    } finally {
      setProcessing(false);
    }
  };

  // 사용 내역 조회
  const loadUsageHistory = async () => {
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/partner/coupon-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUsageHistory(data.data || []);
        setHistoryStats({
          totalCount: data.totalCount || 0,
          totalDiscount: data.totalDiscount || 0
        });
      }
    } catch (error) {
      console.error('사용 내역 조회 실패:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 탭 변경 시 데이터 로드
  useEffect(() => {
    if (activeTab === 'history') {
      loadUsageHistory();
    }
  }, [activeTab]);

  // 쿠폰 스캔 초기화
  const handleReset = () => {
    setCouponCode('');
    setValidation(null);
    setValidationError(null);
    setOrderAmount('');
    setCalculatedDiscount(0);
    setFinalAmount(0);
    setUseSuccess(false);
    setUseError(null);
  };

  // 업체 정보 수정
  const handleEditInfo = () => {
    setIsEditingInfo(true);
    setEditedInfo({
      business_name: partnerInfo?.business_name,
      contact_name: partnerInfo?.contact_name,
      contact_email: partnerInfo?.contact_email,
      contact_phone: partnerInfo?.contact_phone,
      address: partnerInfo?.address
    });
  };

  const handleSaveInfo = async () => {
    if (!partnerInfo?.id || !user?.id) return;

    try {
      const response = await fetch('/api/partner/info', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({
          userId: user.id,
          business_name: editedInfo.business_name,
          contact_name: editedInfo.contact_name,
          contact_email: editedInfo.contact_email,
          contact_phone: editedInfo.contact_phone,
          address: editedInfo.address
        })
      });

      const result = await response.json();
      if (result.success) {
        setPartnerInfo({
          ...partnerInfo,
          business_name: editedInfo.business_name || partnerInfo.business_name,
          contact_name: editedInfo.contact_name || partnerInfo.contact_name,
          contact_email: editedInfo.contact_email || partnerInfo.contact_email,
          contact_phone: editedInfo.contact_phone || partnerInfo.contact_phone,
          address: editedInfo.address || partnerInfo.address
        });
        setIsEditingInfo(false);
        toast.success('파트너 정보가 수정되었습니다!');
      } else {
        toast.error(result.message || '정보 수정에 실패했습니다.');
      }
    } catch (error) {
      toast.error('정보 수정에 실패했습니다.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('로그아웃되었습니다.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!partnerInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>파트너 정보 없음</CardTitle>
            <CardDescription>파트너 정보를 찾을 수 없습니다. 승인된 파트너 계정으로 로그인해주세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')}>로그인 페이지로</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-green-600 text-white py-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{partnerInfo.business_name}</h1>
              <p className="text-green-100 text-sm flex items-center gap-2">
                파트너 대시보드
                {partnerInfo.is_verified && (
                  <Badge className="bg-white/20 text-white text-xs">인증됨</Badge>
                )}
              </p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="text-white hover:bg-white/20">
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="max-w-4xl mx-auto px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="home" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">홈</span>
            </TabsTrigger>
            <TabsTrigger value="scan" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">쿠폰 스캔</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">사용 내역</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">설정</span>
            </TabsTrigger>
          </TabsList>

          {/* 홈 탭 */}
          <TabsContent value="home" className="space-y-6 mt-6">
            {/* 통계 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Users className="w-8 h-8 mx-auto text-green-600 mb-2" />
                  <p className="text-2xl font-bold">{partnerInfo.stats.total_coupon_usage}</p>
                  <p className="text-sm text-gray-500">쿠폰 사용 건수</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Wallet className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                  <p className="text-2xl font-bold">{partnerInfo.stats.total_discount_given.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">총 할인 제공액</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Percent className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold">
                    {partnerInfo.coupon_settings.discount_type === 'PERCENT'
                      ? `${partnerInfo.coupon_settings.discount_value}%`
                      : `${partnerInfo.coupon_settings.discount_value?.toLocaleString() || 0}원`}
                  </p>
                  <p className="text-sm text-gray-500">할인율/할인액</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
                  <p className="text-2xl font-bold">{partnerInfo.is_coupon_partner ? 'ON' : 'OFF'}</p>
                  <p className="text-sm text-gray-500">쿠폰 참여</p>
                </CardContent>
              </Card>
            </div>

            {/* 빠른 액션 */}
            <Card>
              <CardHeader>
                <CardTitle>빠른 액션</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => setActiveTab('scan')}
                    className="h-20 flex flex-col items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <QrCode className="w-6 h-6" />
                    <span>쿠폰 스캔</span>
                  </Button>
                  <Button
                    onClick={() => setActiveTab('history')}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center gap-2"
                  >
                    <Receipt className="w-6 h-6" />
                    <span>사용 내역</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 쿠폰 설정 정보 */}
            {partnerInfo.is_coupon_partner && (
              <Card>
                <CardHeader>
                  <CardTitle>쿠폰 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">할인 타입</span>
                    <span className="font-medium">
                      {partnerInfo.coupon_settings.discount_type === 'PERCENT' ? '퍼센트 할인' : '정액 할인'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">할인</span>
                    <span className="font-medium text-green-600">
                      {partnerInfo.coupon_settings.discount_type === 'PERCENT'
                        ? `${partnerInfo.coupon_settings.discount_value}%`
                        : `${partnerInfo.coupon_settings.discount_value?.toLocaleString()}원`}
                    </span>
                  </div>
                  {partnerInfo.coupon_settings.max_discount && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">최대 할인</span>
                      <span className="font-medium">{partnerInfo.coupon_settings.max_discount.toLocaleString()}원</span>
                    </div>
                  )}
                  {partnerInfo.coupon_settings.min_order && partnerInfo.coupon_settings.min_order > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">최소 주문</span>
                      <span className="font-medium">{partnerInfo.coupon_settings.min_order.toLocaleString()}원</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 쿠폰 스캔 탭 */}
          <TabsContent value="scan" className="space-y-4 mt-6">
            {useSuccess ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">쿠폰 사용 완료!</h2>
                  <p className="text-gray-600 mb-2">할인 금액: {calculatedDiscount.toLocaleString()}원</p>
                  <p className="text-gray-600 mb-6">최종 결제: {finalAmount.toLocaleString()}원</p>
                  <Button onClick={handleReset} className="bg-green-600 hover:bg-green-700">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    새 쿠폰 스캔
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* 쿠폰 코드 입력 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Search className="h-5 w-5" />
                      쿠폰 코드 입력
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="쿠폰 코드 (예: ABC123XY)"
                        className="flex-1 font-mono"
                        maxLength={20}
                      />
                      <Button
                        onClick={() => handleValidate()}
                        disabled={validating || !couponCode.trim()}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : '검증'}
                      </Button>
                    </div>

                    {validationError && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">{validationError}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 검증 결과 */}
                {validation && (
                  <>
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg text-green-700">
                          <CheckCircle className="h-5 w-5" />
                          유효한 쿠폰
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">쿠폰명</span>
                          <span className="font-medium">{validation.coupon_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">고객명</span>
                          <span className="font-medium">{validation.customer_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">할인</span>
                          <span className="font-medium text-green-600">
                            {validation.discount.type === 'PERCENT'
                              ? `${validation.discount.value}%`
                              : `${validation.discount.value.toLocaleString()}원`}
                            {validation.discount.max_discount && (
                              <span className="text-gray-500 text-sm">
                                {' '}(최대 {validation.discount.max_discount.toLocaleString()}원)
                              </span>
                            )}
                          </span>
                        </div>
                        {validation.discount.min_order > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">최소 주문</span>
                            <span className="font-medium">{validation.discount.min_order.toLocaleString()}원</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* 금액 입력 */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Calculator className="h-5 w-5" />
                          주문 금액 입력
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="orderAmount">주문 금액 (원)</Label>
                          <Input
                            id="orderAmount"
                            type="number"
                            value={orderAmount}
                            onChange={(e) => setOrderAmount(e.target.value)}
                            placeholder="0"
                            className="mt-1 text-lg"
                          />
                        </div>

                        {orderAmount && parseInt(orderAmount) > 0 && (
                          <div className="space-y-2 pt-4 border-t">
                            <div className="flex justify-between text-gray-600">
                              <span>주문 금액</span>
                              <span>{parseInt(orderAmount).toLocaleString()}원</span>
                            </div>
                            <div className="flex justify-between text-green-600">
                              <span className="flex items-center gap-1">
                                <Percent className="h-4 w-4" />
                                할인 금액
                              </span>
                              <span>-{calculatedDiscount.toLocaleString()}원</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold pt-2 border-t">
                              <span>최종 결제</span>
                              <span>{finalAmount.toLocaleString()}원</span>
                            </div>
                          </div>
                        )}

                        {useError && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">{useError}</span>
                          </div>
                        )}

                        <Button
                          onClick={handleUseCoupon}
                          disabled={processing || !orderAmount || calculatedDiscount === 0}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          {processing ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Receipt className="h-4 w-4 mr-2" />
                          )}
                          쿠폰 사용 처리
                        </Button>
                      </CardContent>
                    </Card>
                  </>
                )}
              </>
            )}
          </TabsContent>

          {/* 사용 내역 탭 */}
          <TabsContent value="history" className="space-y-4 mt-6">
            {/* 통계 카드 */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-gray-500 text-sm">총 사용 건수</p>
                  <p className="text-2xl font-bold text-green-600">{historyStats.totalCount}건</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-gray-500 text-sm">총 할인 제공액</p>
                  <p className="text-2xl font-bold text-green-600">{historyStats.totalDiscount.toLocaleString()}원</p>
                </CardContent>
              </Card>
            </div>

            {/* 사용 내역 리스트 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">사용 내역</CardTitle>
                <Button variant="ghost" size="sm" onClick={loadUsageHistory}>
                  <RefreshCw className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                </Button>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600" />
                  </div>
                ) : usageHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    아직 쿠폰 사용 내역이 없습니다
                  </div>
                ) : (
                  <div className="space-y-3">
                    {usageHistory.map((record) => (
                      <div key={record.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{record.customer_name}</p>
                            <p className="text-sm text-gray-500">{record.coupon_code}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-600 font-medium">-{record.discount_amount.toLocaleString()}원</p>
                            <p className="text-sm text-gray-500">
                              {new Date(record.used_at).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 설정 탭 */}
          <TabsContent value="settings" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>업체 정보</CardTitle>
                <CardDescription>파트너 기본 정보</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>업체명</Label>
                  <Input
                    value={isEditingInfo ? (editedInfo.business_name || '') : partnerInfo.business_name}
                    onChange={(e) => setEditedInfo({ ...editedInfo, business_name: e.target.value })}
                    disabled={!isEditingInfo}
                  />
                </div>
                <div>
                  <Label>담당자</Label>
                  <Input
                    value={isEditingInfo ? (editedInfo.contact_name || '') : partnerInfo.contact_name}
                    onChange={(e) => setEditedInfo({ ...editedInfo, contact_name: e.target.value })}
                    disabled={!isEditingInfo}
                  />
                </div>
                <div>
                  <Label>이메일</Label>
                  <Input
                    value={isEditingInfo ? (editedInfo.contact_email || '') : partnerInfo.contact_email}
                    onChange={(e) => setEditedInfo({ ...editedInfo, contact_email: e.target.value })}
                    disabled={!isEditingInfo}
                  />
                </div>
                <div>
                  <Label>전화번호</Label>
                  <Input
                    value={isEditingInfo ? (editedInfo.contact_phone || '') : partnerInfo.contact_phone}
                    onChange={(e) => setEditedInfo({ ...editedInfo, contact_phone: e.target.value })}
                    disabled={!isEditingInfo}
                  />
                </div>
                <div>
                  <Label>주소</Label>
                  <Textarea
                    value={isEditingInfo ? (editedInfo.address || '') : (partnerInfo.address || '미등록')}
                    onChange={(e) => setEditedInfo({ ...editedInfo, address: e.target.value })}
                    disabled={!isEditingInfo}
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  {!isEditingInfo ? (
                    <Button onClick={handleEditInfo}>
                      <Edit className="w-4 h-4 mr-2" />
                      정보 수정
                    </Button>
                  ) : (
                    <>
                      <Button onClick={handleSaveInfo}>
                        <Save className="w-4 h-4 mr-2" />
                        저장
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditingInfo(false)}>
                        <X className="w-4 h-4 mr-2" />
                        취소
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 쿠폰 도움말 */}
            <Card>
              <CardHeader>
                <CardTitle>쿠폰 사용 안내</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>1. 고객의 쿠폰 QR을 스캔하거나 코드를 입력합니다.</li>
                  <li>2. 쿠폰이 유효하면 주문 금액을 입력합니다.</li>
                  <li>3. 할인 금액을 확인하고 "사용 처리"를 누릅니다.</li>
                  <li>4. 고객에게 최종 결제 금액을 안내합니다.</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default PartnerDashboardPageEnhanced;

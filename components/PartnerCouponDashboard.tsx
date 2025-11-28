/**
 * 파트너(가맹점) 쿠폰 대시보드
 * /partner/coupon?code=ABC123XY
 *
 * QR 스캔 시 이 페이지로 자동 이동
 * - 쿠폰 검증 → 금액 입력 → 할인 계산 → 사용 완료
 * - 사용 내역/정산
 * - 설정
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  QrCode,
  Receipt,
  Settings,
  Search,
  Percent,
  Calculator,
  History,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

type TabType = 'scan' | 'history' | 'settings';

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
  expires_at: string | null;
  partner: {
    id: number;
    name: string;
  } | null;
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

export function PartnerCouponDashboard() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('scan');

  // 스캔 탭 상태
  const [couponCode, setCouponCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<CouponValidation | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // 금액 입력 상태
  const [orderAmount, setOrderAmount] = useState('');
  const [calculatedDiscount, setCalculatedDiscount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);

  // 사용 처리 상태
  const [processing, setProcessing] = useState(false);
  const [useSuccess, setUseSuccess] = useState(false);
  const [useError, setUseError] = useState<string | null>(null);

  // 사용 내역 상태
  const [usageHistory, setUsageHistory] = useState<UsageRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyStats, setHistoryStats] = useState({
    totalCount: 0,
    totalDiscount: 0
  });

  // URL에서 쿠폰 코드 가져오기
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setCouponCode(codeFromUrl.toUpperCase());
      // 자동 검증
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  // 초기화
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

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* 헤더 */}
      <div className="bg-purple-600 text-white py-6 px-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold">파트너 쿠폰 관리</h1>
          <p className="text-purple-200 text-sm mt-1">{user?.businessName || '가맹점'}</p>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="max-w-lg mx-auto px-4">
        <div className="flex bg-white rounded-lg shadow mt-4 overflow-hidden">
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              activeTab === 'scan'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <QrCode className="h-4 w-4" />
            쿠폰 스캔
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <History className="h-4 w-4" />
            사용내역
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Settings className="h-4 w-4" />
            설정
          </button>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="max-w-lg mx-auto px-4 mt-4">
        {/* 스캔 탭 */}
        {activeTab === 'scan' && (
          <div className="space-y-4">
            {/* 사용 완료 상태 */}
            {useSuccess ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">쿠폰 사용 완료!</h2>
                  <p className="text-gray-600 mb-2">할인 금액: {calculatedDiscount.toLocaleString()}원</p>
                  <p className="text-gray-600 mb-6">최종 결제: {finalAmount.toLocaleString()}원</p>
                  <Button onClick={handleReset} className="bg-purple-600 hover:bg-purple-700">
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
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {validating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          '검증'
                        )}
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
                          <span className="font-medium text-purple-600">
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
                            <div className="flex justify-between text-purple-600">
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
          </div>
        )}

        {/* 사용 내역 탭 */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* 통계 카드 */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-gray-500 text-sm">총 사용 건수</p>
                  <p className="text-2xl font-bold text-purple-600">{historyStats.totalCount}건</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-gray-500 text-sm">총 할인 제공액</p>
                  <p className="text-2xl font-bold text-purple-600">{historyStats.totalDiscount.toLocaleString()}원</p>
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
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
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
                            <p className="text-purple-600 font-medium">-{record.discount_amount.toLocaleString()}원</p>
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
          </div>
        )}

        {/* 설정 탭 */}
        {activeTab === 'settings' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">쿠폰 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">현재 할인 설정</h3>
                <p className="text-gray-600 text-sm">
                  할인 설정은 관리자에게 문의하세요.
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-medium mb-2 text-purple-700">도움말</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>1. 고객의 쿠폰 QR을 스캔하거나 코드를 입력합니다.</li>
                  <li>2. 쿠폰이 유효하면 주문 금액을 입력합니다.</li>
                  <li>3. 할인 금액을 확인하고 "사용 처리"를 누릅니다.</li>
                  <li>4. 고객에게 최종 결제 금액을 안내합니다.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default PartnerCouponDashboard;

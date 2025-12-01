/**
 * 파트너(가맹점) 쿠폰 대시보드
 * /partner/coupon?code=ABC123XY
 *
 * QR 스캔 시 이 페이지로 자동 이동
 * - 쿠폰 검증 → 금액 입력 → 할인 계산 → 사용 완료
 * - 사용 내역/정산
 * - 설정
 */

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation, Navigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
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
  RefreshCw,
  CalendarDays,
  Phone,
  Mail,
  Users,
  Clock,
  Camera,
  X
} from 'lucide-react';
import { Badge } from './ui/badge';
import { useAuth } from '../hooks/useAuth';

type TabType = 'scan' | 'history' | 'reservations' | 'settings';
type CouponType = 'campaign' | 'integrated';

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
  coupon_type?: 'campaign' | 'integrated';
}

// 연동 쿠폰 검증 결과
interface IntegratedCouponValidation {
  id: number;
  code: string;
  name: string;
  user_id: number;
  customer_name: string;
  region_name: string;
  total_merchants: number;
  used_merchants: number;
  remaining_merchants: number;
  expires_at: string;
  status: string;
  merchants: {
    id: number;
    business_name: string;
    location: string;
    discount_type: string;
    discount_value: number;
    max_discount: number;
    already_used: boolean;
  }[];
}

interface Reservation {
  id: number;
  user_id: number;
  listing_id: number;
  listing_title: string;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  special_requests?: string;
  contact_phone?: string;
  contact_email?: string;
  customer_name: string;
  customer_email?: string;
  created_at: string;
}

export function PartnerCouponDashboard() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user, isLoggedIn, isPartner, sessionRestored, canUseCouponScanner } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('scan');

  // 현재 URL 전체 (쿠폰 코드 포함)를 returnUrl로 사용
  const currentUrl = location.pathname + location.search;

  // 세션 복원 중
  if (!sessionRestored) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">세션을 확인하는 중...</p>
        </div>
      </div>
    );
  }

  // 로그인 안됨 → 로그인 페이지로 (현재 URL 유지)
  if (!isLoggedIn) {
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(currentUrl)}`} replace />;
  }

  // 로그인은 됐지만 파트너가 아님
  if (!canUseCouponScanner()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">접근 권한 없음</h2>
          <p className="text-gray-600 mb-6">
            이 페이지는 승인된 파트너(가맹점)만 접근할 수 있습니다.
          </p>
          <p className="text-sm text-gray-500">
            파트너 등록이 필요하시면 관리자에게 문의하세요.
          </p>
        </div>
      </div>
    );
  }

  // 스캔 탭 상태
  const [couponType, setCouponType] = useState<CouponType>('integrated'); // 기본: 연동 쿠폰
  const [couponCode, setCouponCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<CouponValidation | null>(null);
  const [integratedValidation, setIntegratedValidation] = useState<IntegratedCouponValidation | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // QR 카메라 스캐너 상태
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader';

  // 금액 입력 상태
  const [orderAmount, setOrderAmount] = useState('');
  const [calculatedDiscount, setCalculatedDiscount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);

  // 사용 처리 상태
  const [processing, setProcessing] = useState(false);
  const [useSuccess, setUseSuccess] = useState(false);
  const [useError, setUseError] = useState<string | null>(null);
  const [usedResult, setUsedResult] = useState<{ discount_amount: number; final_amount: number } | null>(null);

  // 사용 내역 상태
  const [usageHistory, setUsageHistory] = useState<UsageRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyStats, setHistoryStats] = useState({
    totalCount: 0,
    totalDiscount: 0
  });

  // 예약 상태
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [reservationStats, setReservationStats] = useState({
    total_count: 0,
    pending_count: 0,
    confirmed_count: 0,
    cancelled_count: 0,
    total_revenue: 0
  });
  const [reservationFilter, setReservationFilter] = useState<string>('all');

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
    const amount = parseInt(orderAmount) || 0;

    // 캠페인 쿠폰
    if (couponType === 'campaign' && validation) {
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
      return;
    }

    // 연동 쿠폰 - 파트너 할인 규칙 적용
    if (couponType === 'integrated' && integratedValidation) {
      // 현재 파트너의 할인 규칙 찾기
      const partnerId = user?.partnerId;
      const merchantRule = integratedValidation.merchants.find(m => m.id === partnerId);

      if (!merchantRule) {
        setCalculatedDiscount(0);
        setFinalAmount(amount);
        return;
      }

      let discount = 0;
      const discountType = (merchantRule.discount_type || '').toUpperCase();

      if (discountType === 'PERCENT' || discountType === 'PERCENTAGE') {
        discount = Math.floor(amount * merchantRule.discount_value / 100);
        if (merchantRule.max_discount && discount > merchantRule.max_discount) {
          discount = merchantRule.max_discount;
        }
      } else {
        discount = merchantRule.discount_value;
        if (discount > amount) {
          discount = amount;
        }
      }

      setCalculatedDiscount(discount);
      setFinalAmount(amount - discount);
      return;
    }

    // 기본값
    setCalculatedDiscount(0);
    setFinalAmount(0);
  }, [orderAmount, validation, integratedValidation, couponType, user?.partnerId]);

  // 쿠폰 검증
  const handleValidate = async (code?: string) => {
    const targetCode = code || couponCode;
    if (!targetCode.trim()) {
      setValidationError('쿠폰 코드를 입력해주세요');
      return;
    }

    setValidating(true);
    setValidation(null);
    setIntegratedValidation(null);
    setValidationError(null);
    setUseSuccess(false);
    setUseError(null);

    try {
      const token = localStorage.getItem('auth_token');

      // GOGO- 로 시작하면 연동 쿠폰, 아니면 캠페인 쿠폰
      const isIntegrated = targetCode.toUpperCase().startsWith('GOGO-');
      const actualCouponType = isIntegrated ? 'integrated' : 'campaign';
      setCouponType(actualCouponType);

      if (actualCouponType === 'integrated') {
        // 연동 쿠폰 검증
        const response = await fetch(`/api/coupon/${targetCode}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setValidationError(data.message || '연동 쿠폰 검증 실패');
          return;
        }

        // 현재 가맹점에서 이미 사용했는지 확인
        const partnerId = user?.partnerId;
        const merchantInfo = data.data.merchants?.find((m: any) => m.id === partnerId);

        if (!merchantInfo) {
          setValidationError('이 쿠폰은 현재 가맹점에서 사용할 수 없습니다');
          return;
        }

        if (merchantInfo.already_used) {
          setValidationError('이 쿠폰은 이미 현재 가맹점에서 사용되었습니다');
          return;
        }

        setIntegratedValidation(data.data);
      } else {
        // 캠페인 쿠폰 검증
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
      }
    } catch (error) {
      setValidationError('쿠폰 검증 중 오류가 발생했습니다');
    } finally {
      setValidating(false);
    }
  };

  // 쿠폰 사용 처리
  const handleUseCoupon = async () => {
    const amount = parseInt(orderAmount);
    if (!amount || amount <= 0) {
      setUseError('주문 금액을 입력해주세요');
      return;
    }

    setProcessing(true);
    setUseError(null);

    try {
      const token = localStorage.getItem('auth_token');

      if (couponType === 'integrated' && integratedValidation) {
        // 연동 쿠폰 사용 처리
        const response = await fetch('/api/coupon/use-integrated', {
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

        if (!response.ok || !data.success) {
          setUseError(data.message || '연동 쿠폰 사용 처리 실패');
          return;
        }

        // API 응답에서 실제 할인금액/최종금액 저장
        setUsedResult({
          discount_amount: data.data?.discount_amount || calculatedDiscount,
          final_amount: data.data?.final_amount || finalAmount
        });
        setUseSuccess(true);
        setIntegratedValidation(null);
      } else if (couponType === 'campaign' && validation) {
        // 캠페인 쿠폰 사용 처리
        if (amount < validation.discount.min_order) {
          setUseError(`최소 주문 금액은 ${validation.discount.min_order.toLocaleString()}원입니다`);
          setProcessing(false);
          return;
        }

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

        // API 응답에서 실제 할인금액/최종금액 저장
        setUsedResult({
          discount_amount: data.data?.discount_amount || calculatedDiscount,
          final_amount: data.data?.final_amount || finalAmount
        });
        setUseSuccess(true);
        setValidation(null);
      } else {
        setUseError('유효한 쿠폰이 없습니다');
      }
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

  // 예약 목록 조회
  const loadReservations = async () => {
    setLoadingReservations(true);
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      if (reservationFilter !== 'all') {
        params.append('status', reservationFilter);
      }

      const response = await fetch(`/api/partner/reservations?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReservations(data.data || []);
        setReservationStats(data.stats || {
          total_count: 0,
          pending_count: 0,
          confirmed_count: 0,
          cancelled_count: 0,
          total_revenue: 0
        });
      }
    } catch (error) {
      console.error('예약 조회 실패:', error);
    } finally {
      setLoadingReservations(false);
    }
  };

  // 탭 변경 시 데이터 로드
  useEffect(() => {
    if (activeTab === 'history') {
      loadUsageHistory();
    } else if (activeTab === 'reservations') {
      loadReservations();
    }
  }, [activeTab]);

  // 예약 필터 변경 시 재조회
  useEffect(() => {
    if (activeTab === 'reservations') {
      loadReservations();
    }
  }, [reservationFilter]);

  // QR 스캐너 시작
  const startScanner = async () => {
    setScannerError(null);

    // 먼저 isScanning을 true로 설정하여 DOM 요소 렌더링
    setIsScanning(true);

    // DOM 렌더링을 위해 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      // 기존 스캐너가 있으면 정리
      if (html5QrcodeRef.current) {
        try {
          await html5QrcodeRef.current.stop();
        } catch (e) {
          // 이미 중지됨
        }
      }

      const html5Qrcode = new Html5Qrcode(scannerContainerId);
      html5QrcodeRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: 'environment' }, // 후면 카메라
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          // QR 코드 스캔 성공
          console.log('QR 스캔 성공:', decodedText);

          // URL에서 쿠폰 코드 추출 (예: https://site.com/partner/coupon?code=ABC123)
          let code = decodedText;
          try {
            const url = new URL(decodedText);
            const codeParam = url.searchParams.get('code');
            if (codeParam) {
              code = codeParam;
            }
          } catch {
            // URL이 아니면 그냥 코드로 사용
          }

          // 스캐너 중지 후 코드 설정 및 검증
          stopScanner();
          setCouponCode(code.toUpperCase());
          handleValidate(code.toUpperCase());
        },
        (errorMessage) => {
          // 스캔 중 오류 (무시 - QR 못찾는 것은 정상)
        }
      );
    } catch (error: any) {
      console.error('스캐너 시작 오류:', error);
      if (error.name === 'NotAllowedError') {
        setScannerError('카메라 접근 권한이 필요합니다. 브라우저 설정에서 허용해주세요.');
      } else if (error.name === 'NotFoundError') {
        setScannerError('카메라를 찾을 수 없습니다.');
      } else {
        setScannerError('카메라를 시작할 수 없습니다: ' + (error.message || '알 수 없는 오류'));
      }
      setIsScanning(false);
    }
  };

  // QR 스캐너 중지
  const stopScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
      } catch (e) {
        // 이미 중지됨
      }
      html5QrcodeRef.current = null;
    }
    setIsScanning(false);
  };

  // 컴포넌트 언마운트 시 스캐너 정리
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  // 탭 변경 시 스캐너 중지
  useEffect(() => {
    if (activeTab !== 'scan') {
      stopScanner();
    }
  }, [activeTab]);

  // 초기화
  const handleReset = () => {
    stopScanner();
    setCouponCode('');
    setCouponType('integrated');
    setValidation(null);
    setIntegratedValidation(null);
    setValidationError(null);
    setOrderAmount('');
    setCalculatedDiscount(0);
    setFinalAmount(0);
    setUseSuccess(false);
    setUseError(null);
    setUsedResult(null);
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
            쿠폰
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              activeTab === 'reservations'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            예약
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
            내역
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
                  <p className="text-gray-600 mb-2">할인 금액: {(usedResult?.discount_amount || 0).toLocaleString()}원</p>
                  <p className="text-gray-600 mb-6">최종 결제: {(usedResult?.final_amount || 0).toLocaleString()}원</p>
                  <Button onClick={handleReset} className="bg-purple-600 hover:bg-purple-700">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    새 쿠폰 스캔
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* QR 카메라 스캐너 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        QR 코드 스캔
                      </div>
                      {isScanning && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={stopScanner}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-1" />
                          닫기
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!isScanning ? (
                      <Button
                        onClick={startScanner}
                        className="w-full bg-purple-600 hover:bg-purple-700 h-14 text-lg"
                      >
                        <Camera className="h-5 w-5 mr-2" />
                        카메라로 QR 스캔하기
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <div
                          id={scannerContainerId}
                          className="w-full rounded-lg overflow-hidden"
                          style={{ minHeight: '280px' }}
                        />
                        <p className="text-sm text-center text-gray-500">
                          고객의 쿠폰 QR 코드를 카메라에 비춰주세요
                        </p>
                      </div>
                    )}

                    {scannerError && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">{scannerError}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 또는 직접 입력 */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-50 text-gray-500">또는 직접 입력</span>
                  </div>
                </div>

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

                {/* 캠페인 쿠폰 검증 결과 */}
                {validation && couponType === 'campaign' && (
                  <>
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg text-green-700">
                          <CheckCircle className="h-5 w-5" />
                          유효한 쿠폰 (캠페인)
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

                {/* 연동 쿠폰 검증 결과 */}
                {integratedValidation && couponType === 'integrated' && (
                  <>
                    <Card className="border-emerald-300 bg-emerald-50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg text-emerald-700">
                          <CheckCircle className="h-5 w-5" />
                          유효한 쿠폰 (연동)
                          <Badge className="bg-emerald-600 ml-2">GOGO</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">쿠폰명</span>
                          <span className="font-medium">{integratedValidation.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">쿠폰 코드</span>
                          <span className="font-mono font-medium">{integratedValidation.code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">고객명</span>
                          <span className="font-medium">{integratedValidation.customer_name || '회원'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">지역</span>
                          <span className="font-medium">{integratedValidation.region_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">사용 현황</span>
                          <span className="font-medium">
                            {integratedValidation.used_merchants} / {integratedValidation.total_merchants} 가맹점
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">유효기간</span>
                          <span className="font-medium">
                            {new Date(integratedValidation.expires_at).toLocaleDateString('ko-KR')}까지
                          </span>
                        </div>

                        {/* 현재 가맹점 할인 정보 */}
                        {(() => {
                          const partnerId = user?.partnerId;
                          const myRule = integratedValidation.merchants.find(m => m.id === partnerId);
                          if (myRule) {
                            return (
                              <div className="pt-3 mt-3 border-t border-emerald-200">
                                <p className="text-sm text-emerald-700 font-medium mb-2">현재 가맹점 할인 규칙:</p>
                                <div className="bg-white p-3 rounded-lg">
                                  <p className="font-bold text-lg text-emerald-700">
                                    {myRule.discount_type.toUpperCase() === 'PERCENT' || myRule.discount_type.toUpperCase() === 'PERCENTAGE'
                                      ? `${myRule.discount_value}% 할인`
                                      : `${myRule.discount_value.toLocaleString()}원 할인`}
                                  </p>
                                  {myRule.max_discount > 0 && (
                                    <p className="text-sm text-gray-500">최대 {myRule.max_discount.toLocaleString()}원</p>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </CardContent>
                    </Card>

                    {/* 연동 쿠폰 금액 입력 */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Calculator className="h-5 w-5" />
                          주문 금액 입력
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="orderAmountIntegrated">주문 금액 (원)</Label>
                          <Input
                            id="orderAmountIntegrated"
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
                            <div className="flex justify-between text-emerald-600">
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
                          className="w-full bg-emerald-600 hover:bg-emerald-700"
                        >
                          {processing ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Receipt className="h-4 w-4 mr-2" />
                          )}
                          연동 쿠폰 사용 처리
                        </Button>

                        <p className="text-xs text-gray-500 text-center">
                          * 이 쿠폰은 현재 가맹점에서 1회만 사용 가능합니다
                        </p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* 예약 탭 */}
        {activeTab === 'reservations' && (
          <div className="space-y-4">
            {/* 예약 통계 카드 */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-gray-500 text-sm">대기중</p>
                  <p className="text-2xl font-bold text-yellow-600">{reservationStats.pending_count}건</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-gray-500 text-sm">확정</p>
                  <p className="text-2xl font-bold text-green-600">{reservationStats.confirmed_count}건</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-gray-500 text-sm">총 매출</p>
                <p className="text-2xl font-bold text-purple-600">{reservationStats.total_revenue.toLocaleString()}원</p>
              </CardContent>
            </Card>

            {/* 필터 버튼 */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { value: 'all', label: '전체' },
                { value: 'pending', label: '대기중' },
                { value: 'confirmed', label: '확정' },
                { value: 'cancelled', label: '취소' },
              ].map(({ value, label }) => (
                <Button
                  key={value}
                  variant={reservationFilter === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReservationFilter(value)}
                  className={reservationFilter === value ? 'bg-purple-600 hover:bg-purple-700' : ''}
                >
                  {label}
                </Button>
              ))}
            </div>

            {/* 예약 리스트 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">예약 목록</CardTitle>
                <Button variant="ghost" size="sm" onClick={loadReservations}>
                  <RefreshCw className={`h-4 w-4 ${loadingReservations ? 'animate-spin' : ''}`} />
                </Button>
              </CardHeader>
              <CardContent>
                {loadingReservations ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
                  </div>
                ) : reservations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarDays className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p>예약이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reservations.map((reservation) => (
                      <div key={reservation.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{reservation.customer_name}</p>
                            <p className="text-sm text-gray-500 line-clamp-1">{reservation.listing_title || '상품'}</p>
                          </div>
                          <Badge
                            className={
                              reservation.status === 'confirmed' ? 'bg-green-500' :
                              reservation.status === 'pending' ? 'bg-yellow-500' :
                              reservation.status === 'cancelled' ? 'bg-red-500' :
                              'bg-gray-500'
                            }
                          >
                            {reservation.status === 'confirmed' ? '확정' :
                             reservation.status === 'pending' ? '대기' :
                             reservation.status === 'cancelled' ? '취소' :
                             reservation.status === 'completed' ? '완료' : reservation.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(reservation.check_in_date).toLocaleDateString('ko-KR')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {reservation.guests}명
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-sm">
                            {reservation.contact_phone && (
                              <a href={`tel:${reservation.contact_phone}`} className="flex items-center gap-1 text-blue-600">
                                <Phone className="h-3 w-3" />
                                {reservation.contact_phone}
                              </a>
                            )}
                          </div>
                          <p className="font-bold text-purple-600">{reservation.total_price?.toLocaleString()}원</p>
                        </div>

                        {reservation.special_requests && (
                          <div className="mt-2 p-2 bg-yellow-50 rounded text-sm text-yellow-700">
                            요청: {reservation.special_requests}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{record.customer_name}</p>
                            <p className="text-sm text-gray-500">{record.coupon_code}</p>
                          </div>
                          <p className="text-sm text-gray-500">
                            {new Date(record.used_at).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                        <div className="text-sm space-y-1 pt-2 border-t border-gray-200">
                          <div className="flex justify-between">
                            <span className="text-gray-500">주문금액</span>
                            <span>{record.order_amount?.toLocaleString() || 0}원</span>
                          </div>
                          <div className="flex justify-between text-purple-600">
                            <span>할인</span>
                            <span>-{record.discount_amount?.toLocaleString() || 0}원</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>최종결제</span>
                            <span>{record.final_amount?.toLocaleString() || 0}원</span>
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

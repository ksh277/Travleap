/**
 * 쿠폰 받기 페이지
 * /coupon/claim?code=TESTCOUPON2024
 *
 * - 로그인 필요 (비로그인 시 로그인 유도)
 * - 쿠폰 코드 입력 또는 URL 파라미터로 받기
 * - 발급 후 QR 코드 표시
 * - "가맹점 보기" 버튼 → 쿠폰 사용 가능 가맹점 페이지로 이동
 *
 * 나중에는 채널톡/알림톡에서 이 페이지 링크로 연결
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { QRCodeSVG } from 'qrcode.react';
import {
  Ticket,
  Gift,
  Loader2,
  CheckCircle,
  AlertCircle,
  Store,
  Copy,
  ExternalLink,
  LogIn
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

interface ClaimedCoupon {
  coupon_code: string;
  coupon_name: string;
  coupon_description: string;
  discount_type: string;
  discount_value: number;
  max_discount: number;
  expires_at: string | null;
  qr_url: string;
}

export function CouponClaimPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();

  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimedCoupon, setClaimedCoupon] = useState<ClaimedCoupon | null>(null);

  // URL에서 쿠폰 코드 가져오기
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setCouponCode(codeFromUrl.toUpperCase());
    }
  }, [searchParams]);

  // 쿠폰 발급 요청
  const handleClaim = async () => {
    if (!couponCode.trim()) {
      setError('쿠폰 코드를 입력해주세요');
      return;
    }

    if (!isLoggedIn) {
      // 로그인 페이지로 이동 (현재 URL을 returnUrl로 전달)
      const returnUrl = `/coupon/claim?code=${couponCode}`;
      navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/coupon/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ coupon_code: couponCode })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || '쿠폰 발급에 실패했습니다');
        return;
      }

      setClaimedCoupon(data.data);
      toast.success('쿠폰이 발급되었습니다!');
    } catch (err) {
      setError('쿠폰 발급 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 쿠폰 코드 복사
  const copyCode = () => {
    if (claimedCoupon) {
      navigator.clipboard.writeText(claimedCoupon.coupon_code);
      toast.success('쿠폰 코드가 복사되었습니다');
    }
  };

  // 가맹점 보기 (쿠폰 필터 적용)
  const goToPartners = () => {
    navigate('/partners?couponOnly=true');
  };

  // 내 쿠폰함으로 이동
  const goToMyCoupons = () => {
    navigate('/my/coupons');
  };

  // 할인 표시 포맷
  const formatDiscount = (type: string, value: number, maxDiscount?: number) => {
    if (type === 'percentage' || type === 'percent') {
      return maxDiscount
        ? `${value}% 할인 (최대 ${maxDiscount.toLocaleString()}원)`
        : `${value}% 할인`;
    }
    return `${value.toLocaleString()}원 할인`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <Gift className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">쿠폰 받기</h1>
          <p className="text-gray-600 mt-2">쿠폰 코드를 입력하고 할인 혜택을 받으세요</p>
        </div>

        {/* 발급 완료 상태 */}
        {claimedCoupon ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">쿠폰 발급 완료!</h2>
              <p className="text-gray-600 mb-6">{claimedCoupon.coupon_name}</p>

              {/* QR 코드 */}
              <div className="bg-white p-6 rounded-lg inline-block mb-4">
                <QRCodeSVG
                  value={claimedCoupon.qr_url}
                  size={180}
                  level="H"
                  includeMargin
                />
              </div>

              {/* 쿠폰 코드 */}
              <div className="bg-white border-2 border-dashed border-purple-300 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-500 mb-1">나의 쿠폰 코드</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-mono font-bold text-purple-700">
                    {claimedCoupon.coupon_code}
                  </span>
                  <Button variant="ghost" size="sm" onClick={copyCode}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* 할인 정보 */}
              <div className="bg-purple-100 rounded-lg p-4 mb-6">
                <p className="text-purple-800 font-bold text-lg">
                  {formatDiscount(
                    claimedCoupon.discount_type,
                    claimedCoupon.discount_value,
                    claimedCoupon.max_discount
                  )}
                </p>
                {claimedCoupon.expires_at && (
                  <p className="text-purple-600 text-sm mt-1">
                    유효기간: {new Date(claimedCoupon.expires_at).toLocaleDateString('ko-KR')}까지
                  </p>
                )}
              </div>

              {/* 사용 안내 */}
              <div className="text-left bg-gray-50 rounded-lg p-4 mb-6 text-sm text-gray-600">
                <p className="font-medium text-gray-800 mb-2">사용 방법</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>쿠폰 사용 가능 가맹점을 방문하세요</li>
                  <li>결제 시 위 QR 코드를 직원에게 보여주세요</li>
                  <li>할인이 적용된 금액을 결제하세요</li>
                </ol>
              </div>

              {/* 버튼들 */}
              <div className="space-y-3">
                <Button
                  onClick={goToPartners}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Store className="w-4 h-4 mr-2" />
                  쿠폰 사용 가능 가맹점 보기
                </Button>
                <Button
                  variant="outline"
                  onClick={goToMyCoupons}
                  className="w-full"
                >
                  내 쿠폰함 보기
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* 쿠폰 코드 입력 */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-purple-600" />
                쿠폰 코드 입력
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 로그인 필요 안내 */}
              {!isLoggedIn && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <LogIn className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">로그인이 필요합니다</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        쿠폰을 받으려면 먼저 로그인해주세요
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 쿠폰 코드 입력 */}
              <div>
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="쿠폰 코드 입력 (예: TESTCOUPON2024)"
                  className="text-center font-mono text-lg"
                  maxLength={30}
                />
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* 발급 버튼 */}
              <Button
                onClick={handleClaim}
                disabled={loading || !couponCode.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 py-6 text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    발급 중...
                  </>
                ) : isLoggedIn ? (
                  <>
                    <Gift className="w-5 h-5 mr-2" />
                    쿠폰 받기
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    로그인하고 쿠폰 받기
                  </>
                )}
              </Button>

              {/* 가맹점 보기 링크 */}
              <div className="text-center pt-4 border-t">
                <Button
                  variant="link"
                  onClick={goToPartners}
                  className="text-purple-600"
                >
                  <Store className="w-4 h-4 mr-1" />
                  쿠폰 사용 가능 가맹점 미리보기
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 하단 안내 */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>문의: 신안군 관광과</p>
          <p className="mt-1">쿠폰은 1인 1회만 발급 가능합니다</p>
        </div>
      </div>
    </div>
  );
}

export default CouponClaimPage;

/**
 * 쿠폰 받기 페이지
 * /coupon/claim?code=SHINAN2025
 *
 * - URL에 code 파라미터가 있으면 버튼 클릭만으로 바로 발급
 * - 로그인 필요 (비로그인 시 로그인 유도)
 * - 발급 후 QR 코드 표시
 * - "가맹점 보기" 버튼 → 쿠폰 사용 가능 가맹점 페이지로 이동
 *
 * 채널톡/알림톡에서 이 페이지 링크로 연결
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

interface CouponInfo {
  code: string;
  name: string;
  description: string;
  discount_type: string;
  discount_value: number;
  max_discount: number | null;
  valid_until: string | null;
}

export function CouponClaimPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isLoggedIn, user, sessionRestored } = useAuth();

  const [couponCode, setCouponCode] = useState('');
  const [couponInfo, setCouponInfo] = useState<CouponInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimedCoupon, setClaimedCoupon] = useState<ClaimedCoupon | null>(null);

  // URL에서 쿠폰 코드 가져오기 & 쿠폰 정보 조회
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      const code = codeFromUrl.toUpperCase();
      setCouponCode(code);
      // 쿠폰 정보 조회 (미리보기용)
      fetchCouponInfo(code);
    }
  }, [searchParams]);

  // 쿠폰 정보 조회 (발급 전 미리보기)
  const fetchCouponInfo = async (code: string) => {
    setLoadingInfo(true);
    try {
      const response = await fetch(`/api/coupon/info?code=${code}`);
      const data = await response.json();
      if (data.success && data.data) {
        setCouponInfo(data.data);
      }
    } catch (err) {
      console.error('쿠폰 정보 조회 실패:', err);
    } finally {
      setLoadingInfo(false);
    }
  };

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

              {/* 할인 정보 - 가맹점별 다름 표시 */}
              <div className="bg-purple-100 rounded-lg p-4 mb-6">
                <p className="text-purple-800 font-bold text-lg">
                  가맹점별 할인 적용
                </p>
                <p className="text-purple-600 text-sm mt-1">
                  할인율은 가맹점마다 다릅니다
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
        ) : couponInfo ? (
          /* URL에 code가 있을 때: 쿠폰 정보 미리보기 + 버튼 클릭으로 발급 */
          <Card>
            <CardContent className="py-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 rounded-full mb-4">
                <Ticket className="w-10 h-10 text-purple-600" />
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-2">{couponInfo.name}</h2>
              {couponInfo.description && (
                <p className="text-gray-600 mb-4">{couponInfo.description}</p>
              )}

              {/* 할인 정보 - 가맹점별 다름 */}
              <div className="bg-purple-100 rounded-lg p-4 mb-6">
                <p className="text-purple-800 font-bold text-lg">
                  가맹점별 할인 적용
                </p>
                <p className="text-purple-600 text-sm mt-1">
                  할인율은 가맹점마다 다릅니다
                </p>
                {couponInfo.valid_until && (
                  <p className="text-purple-600 text-sm mt-2">
                    유효기간: {new Date(couponInfo.valid_until).toLocaleDateString('ko-KR')}까지
                  </p>
                )}
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-center gap-2 text-red-700 mb-4">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* 발급 버튼 */}
              <Button
                onClick={handleClaim}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 py-6 text-lg mb-4"
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
              <Button
                variant="link"
                onClick={goToPartners}
                className="text-purple-600"
              >
                <Store className="w-4 h-4 mr-1" />
                쿠폰 사용 가능 가맹점 보기
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        ) : loadingInfo ? (
          /* 쿠폰 정보 로딩 중 */
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-4" />
              <p className="text-gray-600">쿠폰 정보를 확인하는 중...</p>
            </CardContent>
          </Card>
        ) : (
          /* URL에 code가 없을 때: 안내 메시지 */
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">쿠폰 링크가 필요합니다</h2>
              <p className="text-gray-600 mb-6">
                채널톡이나 알림톡에서 받은<br />쿠폰 링크를 통해 접속해주세요
              </p>
              <Button
                variant="outline"
                onClick={goToPartners}
              >
                <Store className="w-4 h-4 mr-2" />
                가맹점 둘러보기
              </Button>
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

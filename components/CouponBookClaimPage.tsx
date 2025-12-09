import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Ticket,
  Loader2,
  CheckCircle,
  XCircle,
  LogIn,
  MapPin,
  Calendar,
  Gift,
  AlertCircle,
  Download,
  Store,
  QrCode,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';

interface CampaignInfo {
  id: number;
  name: string;
  description: string;
  coupon_name: string;
  discount_type: string;
  discount_value: number;
  expires_at: string;
  target_islands: string[];
  remaining: number | null;
}

interface ClaimedCoupon {
  code: string;
  name: string;
  discount_type: string;
  discount_value: number;
  expires_at: string;
}

const ISLANDS_MAP: Record<string, { name: string; region: string }> = {
  gaudo: { name: '가우도', region: '강진' },
  jangdo: { name: '장도', region: '보성' },
  nangdo: { name: '낭도', region: '여수' },
  songdo: { name: '송도', region: '여수' }
};

export function CouponBookClaimPage() {
  const router = useRouter();
  const { campaign: campaignId, auto_claim } = router.query;
  const couponCardRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [campaign, setCampaign] = useState<CampaignInfo | null>(null);
  const [claimedCoupon, setClaimedCoupon] = useState<ClaimedCoupon | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [autoClaimAttempted, setAutoClaimAttempted] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  // 로그인 후 자동 쿠폰 발급
  useEffect(() => {
    if (campaignId && user && auto_claim === 'true' && !autoClaimAttempted) {
      setAutoClaimAttempted(true);
      handleClaim();
    }
  }, [campaignId, user, auto_claim, autoClaimAttempted]);

  useEffect(() => {
    if (campaignId && user) {
      fetchCampaign();
    } else if (campaignId && !user && !loading) {
      setLoading(false);
    }
  }, [campaignId, user]);

  // QR 코드 생성
  useEffect(() => {
    if (claimedCoupon?.code) {
      generateQRCode(claimedCoupon.code);
    }
  }, [claimedCoupon]);

  const generateQRCode = async (code: string) => {
    try {
      const url = await QRCode.toDataURL(code, {
        width: 200,
        margin: 2,
        color: {
          dark: '#7c3aed',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('QR Code generation error:', error);
    }
  };

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/coupon-book/campaign/${campaignId}`);
      const data = await response.json();

      if (data.success) {
        setCampaign(data.campaign);
      } else {
        setError(data.message || '캠페인 정보를 불러올 수 없습니다');
      }
    } catch (error) {
      console.error('Campaign fetch error:', error);
      setError('캠페인 정보를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!user || !campaignId) {
      toast.error('로그인이 필요합니다');
      return;
    }

    try {
      setClaiming(true);

      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/coupon-book/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          campaignId: Number(campaignId),
          userId: user.id
        })
      });

      const data = await response.json();

      if (data.success) {
        setClaimedCoupon(data.coupon);
        toast.success('쿠폰이 발급되었습니다!');
      } else {
        if (data.error === 'ALREADY_CLAIMED') {
          toast.error('이미 발급받은 쿠폰입니다');
        } else {
          toast.error(data.message || '쿠폰 발급에 실패했습니다');
        }
      }
    } catch (error) {
      console.error('Claim error:', error);
      toast.error('쿠폰 발급 중 오류가 발생했습니다');
    } finally {
      setClaiming(false);
    }
  };

  const handleLogin = () => {
    // 현재 URL을 저장하고 로그인 페이지로 이동
    // auto_claim=true 파라미터 추가하여 로그인 후 자동 발급
    const currentUrl = `${window.location.origin}/coupon-book/claim?campaign=${campaignId}&auto_claim=true`;
    localStorage.setItem('redirect_after_login', currentUrl);
    router.push('/login');
  };

  const handleCopyCode = async () => {
    if (!claimedCoupon?.code) return;

    try {
      await navigator.clipboard.writeText(claimedCoupon.code);
      setCopied(true);
      toast.success('쿠폰 코드가 복사되었습니다');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('복사에 실패했습니다');
    }
  };

  const handleSaveImage = async () => {
    if (!couponCardRef.current) return;

    try {
      // html2canvas 동적 로드
      const html2canvas = (await import('html2canvas')).default;

      const canvas = await html2canvas(couponCardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });

      const link = document.createElement('a');
      link.download = `travleap-coupon-${claimedCoupon?.code || 'coupon'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success('쿠폰 이미지가 저장되었습니다');
    } catch (error) {
      console.error('Image save error:', error);
      toast.error('이미지 저장에 실패했습니다');
    }
  };

  const handleViewPartners = () => {
    // 쿠폰 적용 상태 + 타겟 섬 필터로 가맹점 페이지 이동
    const targetIsland = campaign?.target_islands?.[0] || '';
    router.push(`/partners?coupon=true${targetIsland ? `&island=${targetIsland}` : ''}`);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getIslandNames = (codes: string[]) => {
    if (!codes || codes.length === 0) return '모든 섬';
    return codes.map(code => {
      const island = ISLANDS_MAP[code];
      return island ? `${island.region} ${island.name}` : code;
    }).join(', ');
  };

  const formatDiscount = (type: string, value: number) => {
    return type === 'percentage'
      ? `${value}% 할인`
      : `${value?.toLocaleString()}원 할인`;
  };

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">쿠폰 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 쿠폰 발급 완료 - 팝업 스타일
  if (claimedCoupon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <Card className="max-w-md w-full overflow-hidden">
          <CardContent className="p-0">
            {/* 발급 완료 헤더 */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-3" />
              <h2 className="text-2xl font-bold">쿠폰 발급 완료!</h2>
              <p className="text-sm opacity-90 mt-1">아래 쿠폰을 가맹점에서 사용하세요</p>
            </div>

            {/* 쿠폰 카드 (이미지 저장용) */}
            <div ref={couponCardRef} className="bg-white p-6">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl p-6 text-white text-center">
                <Ticket className="w-10 h-10 mx-auto mb-3" />
                <h3 className="text-xl font-bold mb-2">{claimedCoupon.name}</h3>
                <div className="text-3xl font-bold mb-4">
                  {formatDiscount(claimedCoupon.discount_type, claimedCoupon.discount_value)}
                </div>

                {/* QR 코드 */}
                {qrCodeUrl && (
                  <div className="bg-white rounded-lg p-3 inline-block mb-4">
                    <img src={qrCodeUrl} alt="쿠폰 QR 코드" className="w-32 h-32" />
                  </div>
                )}

                {/* 쿠폰 코드 */}
                <div className="bg-white/20 rounded-lg px-4 py-2 mb-3">
                  <p className="text-sm opacity-80 mb-1">쿠폰 코드</p>
                  <p className="text-xl font-mono font-bold tracking-wider">{claimedCoupon.code}</p>
                </div>

                <div className="flex items-center justify-center gap-1 text-sm opacity-80">
                  <Calendar className="w-4 h-4" />
                  {formatDate(claimedCoupon.expires_at)}까지 사용 가능
                </div>
              </div>

              {/* Travleap 로고 */}
              <div className="text-center mt-4 text-gray-400 text-sm">
                Travleap 쿠폰
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="p-6 pt-0 space-y-3">
              {/* 쿠폰 코드 복사 */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleCopyCode}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    쿠폰 코드 복사
                  </>
                )}
              </Button>

              {/* 이미지로 저장 */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSaveImage}
              >
                <Download className="w-4 h-4 mr-2" />
                이미지로 저장
              </Button>

              {/* 주변 가맹점 보기 */}
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={handleViewPartners}
              >
                <Store className="w-4 h-4 mr-2" />
                주변 가맹점 보기
              </Button>

              {/* 내 쿠폰함 */}
              <Button
                variant="ghost"
                className="w-full text-gray-500"
                onClick={() => router.push('/my/coupons')}
              >
                내 쿠폰함에서 확인하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">오류 발생</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => router.push('/')} className="w-full">
              홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 로그인 필요
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <Card className="max-w-md w-full overflow-hidden">
          {/* 쿠폰 미리보기 */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-white text-center">
            <Gift className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">무료 쿠폰 받기</h2>
            <p className="opacity-90">
              로그인하면 할인 쿠폰을 바로 받을 수 있어요!
            </p>
          </div>

          <CardContent className="pt-6">
            <Button
              onClick={handleLogin}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold"
              size="lg"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.48 3 2 6.48 2 11c0 2.66 1.46 5.03 3.77 6.44l-.9 3.33c-.07.26.16.49.41.41l3.9-1.56C10.18 19.88 11.08 20 12 20c5.52 0 10-3.48 10-8s-4.48-8-10-8z"/>
              </svg>
              카카오로 시작하기
            </Button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">또는</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleLogin}
              >
                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
                  <path fill="#03C75A" d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
                </svg>
                네이버
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleLogin}
              >
                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                구글
              </Button>
            </div>

            <p className="text-xs text-gray-400 mt-4 text-center">
              간편 로그인으로 10초만에 쿠폰 받기
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 캠페인 정보 표시 & 발급 버튼
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-md mx-auto pt-8">
        {campaign ? (
          <Card className="overflow-hidden">
            {/* 쿠폰 헤더 */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white text-center">
              <Gift className="w-12 h-12 mx-auto mb-3" />
              <h1 className="text-2xl font-bold mb-2">{campaign.name}</h1>
              {campaign.description && (
                <p className="text-sm opacity-90">{campaign.description}</p>
              )}
            </div>

            <CardContent className="pt-6">
              {/* 할인 정보 */}
              <div className="bg-purple-50 rounded-xl p-6 text-center mb-6">
                <Ticket className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <h2 className="text-lg font-bold text-gray-800 mb-1">
                  {campaign.coupon_name}
                </h2>
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {formatDiscount(campaign.discount_type, campaign.discount_value)}
                </div>
                {campaign.expires_at && (
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    {formatDate(campaign.expires_at)}까지
                  </div>
                )}
              </div>

              {/* 상세 정보 */}
              <div className="space-y-3 mb-6">
                {campaign.target_islands && campaign.target_islands.length > 0 && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">사용 가능 지역</p>
                      <p className="text-sm text-gray-800">{getIslandNames(campaign.target_islands)}</p>
                    </div>
                  </div>
                )}
                {campaign.remaining !== null && (
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">남은 수량</p>
                      <p className="text-sm text-orange-600 font-bold">{campaign.remaining}개 남음</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 발급 버튼 */}
              <Button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                size="lg"
              >
                {claiming ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    발급 중...
                  </>
                ) : (
                  <>
                    <Gift className="w-5 h-5 mr-2" />
                    무료 쿠폰 받기
                  </>
                )}
              </Button>

              {/* 안내 문구 */}
              <div className="mt-4 text-xs text-gray-500 text-center space-y-1">
                <p>발급받은 쿠폰은 참여 가맹점에서 사용 가능합니다</p>
                <p>1인 1회 발급 가능, 타인에게 양도 불가</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-8 text-center">
              <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">캠페인 정보가 없습니다</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default CouponBookClaimPage;

import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

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
  songdo: { name: '송도', region: '송도' }
};

export function CouponBookClaimPage() {
  const router = useRouter();
  const { campaign: campaignId } = router.query;

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [campaign, setCampaign] = useState<CampaignInfo | null>(null);
  const [claimedCoupon, setClaimedCoupon] = useState<ClaimedCoupon | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (campaignId && user) {
      fetchCampaign();
    } else if (campaignId && !user && !loading) {
      // 로그인 필요
      setLoading(false);
    }
  }, [campaignId, user]);

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
    const currentUrl = window.location.href;
    localStorage.setItem('redirect_after_login', currentUrl);
    router.push('/login');
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
      return island ? `${island.name} (${island.region})` : code;
    }).join(', ');
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

  // 쿠폰 발급 완료
  if (claimedCoupon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">쿠폰 발급 완료!</h2>
            <p className="text-gray-600 mb-6">쿠폰이 성공적으로 발급되었습니다</p>

            {/* 쿠폰 정보 */}
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl p-6 text-white mb-6">
              <Ticket className="w-10 h-10 mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-2">{claimedCoupon.name}</h3>
              <div className="text-3xl font-bold mb-2">
                {claimedCoupon.discount_type === 'percentage'
                  ? `${claimedCoupon.discount_value}% 할인`
                  : `${claimedCoupon.discount_value?.toLocaleString()}원 할인`}
              </div>
              <div className="text-sm opacity-90 mb-3">
                쿠폰 코드: {claimedCoupon.code}
              </div>
              <div className="flex items-center justify-center gap-1 text-sm opacity-80">
                <Calendar className="w-4 h-4" />
                {formatDate(claimedCoupon.expires_at)}까지 사용 가능
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              내 쿠폰함에서 확인할 수 있습니다
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push('/my/coupons')}
              >
                내 쿠폰함
              </Button>
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                onClick={() => router.push('/partners')}
              >
                가맹점 보기
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
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <Gift className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">무료 쿠폰 받기</h2>
            <p className="text-gray-600 mb-6">
              로그인하면 무료 쿠폰을 받을 수 있습니다
            </p>

            <Button
              onClick={handleLogin}
              className="w-full bg-purple-600 hover:bg-purple-700"
              size="lg"
            >
              <LogIn className="w-5 h-5 mr-2" />
              로그인하고 쿠폰 받기
            </Button>

            <p className="text-xs text-gray-400 mt-4">
              카카오, 네이버, 구글 계정으로 간편 로그인
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
                  {campaign.discount_type === 'percentage'
                    ? `${campaign.discount_value}% 할인`
                    : `${campaign.discount_value?.toLocaleString()}원 할인`}
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

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Ticket, Download, Check, MapPin, Gift, Loader2, Store, AlertCircle, DownloadCloud } from 'lucide-react';
import { toast } from 'sonner';

interface Partner {
  id: number;
  name: string;
  type: string;
  description: string;
  logo: string;
  coverImage: string;
  address: string;
  phone: string;
  couponText: string;
  location: {
    lat: number;
    lng: number;
  };
}

interface UserCoupon {
  partnerId: number;
  couponCode: string;
  expiresAt: string;
}

interface CampaignInfo {
  id: number;
  name: string;
  description: string;
}

export default function CouponBookPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('campaign');

  const [partners, setPartners] = useState<Partner[]>([]);
  const [campaign, setCampaign] = useState<CampaignInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // 로그인 상태 확인
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);

    // 캠페인 정보 로드
    if (campaignId) {
      fetchCampaign();
    }

    // 파트너 목록 로드
    fetchPartners();

    // 로그인된 경우 보유 쿠폰 확인
    if (token) {
      fetchUserCoupons(token);
    }
  }, [campaignId]);

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/coupon-book/campaign/${campaignId}`);
      const data = await res.json();
      if (data.success && data.campaign) {
        setCampaign(data.campaign);
      }
    } catch (error) {
      console.error('Failed to fetch campaign:', error);
    }
  };

  const fetchPartners = async () => {
    try {
      const url = campaignId
        ? `/api/coupon-book/partners?campaign=${campaignId}`
        : '/api/coupon-book/partners';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setPartners(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCoupons = async (token: string) => {
    try {
      const res = await fetch('/api/coupons/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        // claim_source가 'coupon_book'인 쿠폰만 필터링
        const couponBookCoupons = data.data
          .filter((c: any) => c.claim_source === 'coupon_book' && c.status === 'ISSUED')
          .map((c: any) => ({
            partnerId: c.used_partner_id,
            couponCode: c.coupon_code,
            expiresAt: c.expires_at
          }));
        setUserCoupons(couponBookCoupons);
      }
    } catch (error) {
      console.error('Failed to fetch user coupons:', error);
    }
  };

  const handleDownload = async (partnerId: number) => {
    if (!isLoggedIn) {
      toast.error('로그인이 필요합니다');
      const redirectUrl = campaignId ? `/coupon-book?campaign=${campaignId}` : '/coupon-book';
      navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    setDownloadingId(partnerId);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/coupon-book/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ partnerId })
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`${data.data.partner.name} 쿠폰이 발급되었습니다!`);

        // 쿠폰 목록 업데이트
        setUserCoupons(prev => [...prev, {
          partnerId,
          couponCode: data.data.couponCode,
          expiresAt: data.data.expiresAt
        }]);
      } else {
        toast.error(data.error || '쿠폰 발급에 실패했습니다');
      }
    } catch (error) {
      toast.error('쿠폰 발급 중 오류가 발생했습니다');
    } finally {
      setDownloadingId(null);
    }
  };

  const hasCoupon = (partnerId: number) => {
    return userCoupons.some(c => c.partnerId === partnerId);
  };

  const handleDownloadAll = async () => {
    if (!isLoggedIn) {
      toast.error('로그인이 필요합니다');
      const redirectUrl = campaignId ? `/coupon-book?campaign=${campaignId}` : '/coupon-book';
      navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    // 이미 모든 쿠폰을 보유하고 있는지 확인
    const availablePartners = partners.filter(p => !hasCoupon(p.id));
    if (availablePartners.length === 0) {
      toast.info('이미 모든 쿠폰을 보유하고 있습니다');
      return;
    }

    setDownloadingAll(true);

    try {
      const token = localStorage.getItem('token');
      const url = campaignId
        ? `/api/coupon-book/download-all?campaign=${campaignId}`
        : '/api/coupon-book/download-all';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message || `${data.data.issued}개의 쿠폰이 발급되었습니다!`);

        // 쿠폰 목록 업데이트
        if (data.data.coupons && data.data.coupons.length > 0) {
          const newCoupons = data.data.coupons.map((c: any) => ({
            partnerId: c.partner.id,
            couponCode: c.couponCode,
            expiresAt: c.expiresAt
          }));
          setUserCoupons(prev => [...prev, ...newCoupons]);
        }
      } else {
        toast.error(data.error || '쿠폰 발급에 실패했습니다');
      }
    } catch (error) {
      toast.error('쿠폰 발급 중 오류가 발생했습니다');
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white pb-20">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/20 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Ticket className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{campaign?.name || '쿠폰북'}</h1>
                <p className="text-purple-100 text-xs">{campaign?.description || '참여 가맹점에서 할인 혜택을 받으세요'}</p>
              </div>
            </div>
          </div>

          {/* 안내 텍스트 */}
          <div className="bg-white/10 rounded-xl p-4 mt-2">
            <p className="text-sm text-purple-100 leading-relaxed">
              제휴 가맹점에서 사용할 수 있는 할인 쿠폰입니다.
              쿠폰을 다운로드 받고 가맹점 방문 시 사용해주세요!
            </p>
          </div>
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="max-w-lg mx-auto px-4 -mt-4 relative z-10">
        <div className="bg-white rounded-xl shadow-lg p-4 flex gap-3">
          <button
            className="flex-1 h-12 border border-purple-200 text-purple-700 hover:bg-purple-50 rounded-lg flex items-center justify-center gap-2 font-medium transition"
            onClick={() => navigate('/partner?coupon=true')}
          >
            <MapPin className="h-4 w-4" />
            주변 가맹점 보기
          </button>
          <button
            className="flex-1 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition"
            onClick={() => navigate('/my/coupons')}
          >
            <Gift className="h-4 w-4" />
            쿠폰함 가기
          </button>
        </div>
      </div>

      {/* 가맹점 목록 */}
      <div className="max-w-lg mx-auto px-4 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            참여 가맹점 <span className="text-purple-600">{partners.length}</span>
          </h2>
          {partners.length > 0 && (
            <button
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition disabled:opacity-50"
              onClick={handleDownloadAll}
              disabled={downloadingAll || partners.every(p => hasCoupon(p.id))}
            >
              {downloadingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  발급 중...
                </>
              ) : partners.every(p => hasCoupon(p.id)) ? (
                <>
                  <Check className="h-4 w-4" />
                  전체 보유
                </>
              ) : (
                <>
                  <DownloadCloud className="h-4 w-4" />
                  전체 받기
                </>
              )}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <span className="ml-2 text-gray-600">가맹점 목록을 불러오는 중...</span>
          </div>
        ) : partners.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 py-12 text-center">
            <Store className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">아직 참여 가맹점이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {partners.map((partner) => {
              const hasDownloaded = hasCoupon(partner.id);
              const isDownloading = downloadingId === partner.id;

              return (
                <div key={partner.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition">
                  {/* 커버 이미지 */}
                  {partner.coverImage && (
                    <div className="relative h-32 bg-gray-100">
                      <img
                        src={partner.coverImage}
                        alt={partner.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <span className="absolute top-3 left-3 px-2 py-1 bg-purple-600 text-white text-xs font-medium rounded">
                        {partner.type}
                      </span>
                    </div>
                  )}

                  <div className="p-4">
                    {/* 가맹점 정보 */}
                    <div className="flex items-start gap-3 mb-3">
                      {partner.logo ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <img
                            src={partner.logo}
                            alt={partner.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <Store className="h-6 w-6 text-purple-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{partner.name}</h3>
                        {partner.address && (
                          <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {partner.address}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 할인 정보 */}
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-5 w-5 text-purple-600" />
                        <span className="text-lg font-bold text-purple-700">
                          {partner.couponText}
                        </span>
                      </div>
                    </div>

                    {/* 설명 */}
                    {partner.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {partner.description}
                      </p>
                    )}

                    {/* 다운로드 버튼 */}
                    {hasDownloaded ? (
                      <button
                        disabled
                        className="w-full py-2.5 bg-gray-100 text-gray-500 rounded-lg font-medium flex items-center justify-center gap-2 cursor-not-allowed"
                      >
                        <Check className="h-4 w-4" />
                        이미 보유중
                      </button>
                    ) : (
                      <button
                        className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition disabled:opacity-50"
                        onClick={() => handleDownload(partner.id)}
                        disabled={isDownloading}
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            발급 중...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            쿠폰 받기
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 하단 안내 */}
      <div className="max-w-lg mx-auto px-4 mt-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">쿠폰 사용 안내</p>
              <ul className="space-y-1 text-amber-700">
                <li>- 쿠폰은 발급일로부터 30일간 유효합니다.</li>
                <li>- 가맹점 방문 시 결제 전 쿠폰을 제시해주세요.</li>
                <li>- 다른 할인과 중복 적용이 불가할 수 있습니다.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

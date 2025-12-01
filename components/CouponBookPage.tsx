import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Ticket, Download, Check, Clock, Gift, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CouponBookCoupon {
  id: number;
  code: string;
  name: string;
  title: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_amount: number;
  max_discount: number | null;
  valid_from: string | null;
  valid_until: string | null;
  usage_limit: number | null;
  issued_count: number;
  max_issues_per_user: number;
  already_issued: boolean;
  can_download: boolean;
  remaining: number | null;
}

export default function CouponBookPage() {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<CouponBookCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // 사용자 정보 가져오기
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const userData = localStorage.getItem('user');
      const userId = userData ? JSON.parse(userData).id : null;

      const url = userId
        ? `/api/couponbook?user_id=${userId}`
        : '/api/couponbook';

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setCoupons(data.data || []);
      } else {
        toast.error(data.message || '쿠폰 목록을 불러오는데 실패했습니다');
      }
    } catch (error) {
      console.error('쿠폰북 조회 오류:', error);
      toast.error('쿠폰 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (couponId: number) => {
    if (!user) {
      toast.error('로그인이 필요합니다');
      navigate('/login');
      return;
    }

    try {
      setDownloadingId(couponId);

      const response = await fetch('/api/couponbook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: user.id,
          coupon_id: couponId
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('쿠폰이 발급되었습니다!');
        // 목록 새로고침
        fetchCoupons();
      } else {
        toast.error(data.message || '쿠폰 발급에 실패했습니다');
      }
    } catch (error) {
      console.error('쿠폰 발급 오류:', error);
      toast.error('쿠폰 발급 중 오류가 발생했습니다');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다');
      navigate('/login');
      return;
    }

    const downloadableCoupons = coupons.filter(c => c.can_download && !c.already_issued);
    if (downloadableCoupons.length === 0) {
      toast.info('발급 가능한 쿠폰이 없습니다');
      return;
    }

    for (const coupon of downloadableCoupons) {
      await handleDownload(coupon.id);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '제한 없음';
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getDiscountText = (coupon: CouponBookCoupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% 할인`;
    }
    return `${coupon.discount_value.toLocaleString()}원 할인`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/20 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">쿠폰북</h1>
          </div>
          <p className="text-purple-100 text-sm">
            다양한 할인 쿠폰을 받아 가맹점에서 사용하세요!
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* 전체 다운로드 버튼 */}
        {coupons.some(c => c.can_download && !c.already_issued) && (
          <button
            onClick={handleDownloadAll}
            className="w-full mb-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition"
          >
            <Gift className="w-5 h-5" />
            모든 쿠폰 한번에 받기
          </button>
        )}

        {/* 쿠폰 목록 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <span className="ml-2 text-gray-600">쿠폰 목록을 불러오는 중...</span>
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-20">
            <Ticket className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">현재 받을 수 있는 쿠폰이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 ${
                  coupon.already_issued ? 'border-gray-200 opacity-70' : 'border-purple-200'
                }`}
              >
                {/* 쿠폰 상단 */}
                <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl font-bold text-purple-700">
                          {getDiscountText(coupon)}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-800">
                        {coupon.name || coupon.title}
                      </h3>
                    </div>
                    {coupon.already_issued ? (
                      <div className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-sm flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        발급완료
                      </div>
                    ) : coupon.remaining !== null && coupon.remaining <= 10 ? (
                      <div className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-sm">
                        {coupon.remaining}장 남음
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* 쿠폰 하단 */}
                <div className="p-4 border-t border-dashed border-gray-200">
                  <p className="text-sm text-gray-600 mb-3">
                    {coupon.description || '가맹점에서 사용 가능한 할인 쿠폰'}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>~{formatDate(coupon.valid_until)}</span>
                    </div>
                    {coupon.min_amount > 0 && (
                      <span>최소 {coupon.min_amount.toLocaleString()}원 이상</span>
                    )}
                    {coupon.max_discount && (
                      <span>최대 {coupon.max_discount.toLocaleString()}원</span>
                    )}
                  </div>

                  {/* 다운로드 버튼 */}
                  {coupon.can_download && !coupon.already_issued ? (
                    <button
                      onClick={() => handleDownload(coupon.id)}
                      disabled={downloadingId === coupon.id}
                      className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-purple-700 transition disabled:opacity-50"
                    >
                      {downloadingId === coupon.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      쿠폰 받기
                    </button>
                  ) : coupon.already_issued ? (
                    <button
                      onClick={() => navigate('/my/coupons')}
                      className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition"
                    >
                      내 쿠폰함 보기
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2.5 bg-gray-200 text-gray-400 rounded-lg font-medium cursor-not-allowed"
                    >
                      발급 불가
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 안내 문구 */}
        <div className="mt-8 p-4 bg-purple-50 rounded-lg">
          <h4 className="font-medium text-purple-800 mb-2">쿠폰 사용 안내</h4>
          <ul className="text-sm text-purple-700 space-y-1">
            <li>- 발급받은 쿠폰은 마이페이지 &gt; 쿠폰함에서 확인할 수 있습니다</li>
            <li>- 쿠폰은 쿠폰 참여 가맹점에서 사용 가능합니다</li>
            <li>- 하나의 쿠폰으로 여러 가맹점에서 각 1회씩 사용 가능합니다</li>
            <li>- 유효기간이 지난 쿠폰은 자동으로 만료됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * 마이페이지 쿠폰함
 * /my/coupons
 *
 * - 발급받은 쿠폰 목록 (사용가능/사용완료/만료)
 * - 각 쿠폰 QR 코드 표시
 * - 가맹점 찾기 링크
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import {
  Ticket,
  Loader2,
  ChevronDown,
  ChevronUp,
  Store,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  RefreshCw,
  ArrowLeft,
  Star,
  Gift,
  X,
  MapPin
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

interface Coupon {
  id: number;
  coupon_code: string;
  status: 'ISSUED' | 'USED' | 'EXPIRED';
  issued_at: string;
  used_at: string | null;
  campaign_code: string;
  coupon_name: string;
  coupon_description: string;
  discount_type: string;
  discount_value: number;
  max_discount: number | null;
  valid_from: string | null;
  valid_until: string | null;
  target_type: string;
  target_categories: string | null;
  used_info: {
    partner_name: string;
    order_amount: number;
    discount_amount: number;
    final_amount: number;
  } | null;
  qr_url: string;
  claim_source?: string;
  used_partner_id?: number;
  partner_name?: string;
  partner_discount_text?: string;
}

interface Stats {
  total: number;
  issued: number;
  used: number;
  expired: number;
}

type FilterType = 'all' | 'issued' | 'used' | 'expired';

export function MyCouponsPage() {
  const navigate = useNavigate();
  const { isLoggedIn, sessionRestored } = useAuth();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, issued: 0, used: 0, expired: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [usingCouponId, setUsingCouponId] = useState<number | null>(null);
  const [showUseConfirm, setShowUseConfirm] = useState<number | null>(null);

  // 리뷰 팝업 상태
  const [showReviewPopup, setShowReviewPopup] = useState<{
    couponId: number;
    partnerName: string;
  } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // 쿠폰 조회
  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/my/coupons?status=${filter}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCoupons(data.data || []);
        setStats(data.stats || { total: 0, issued: 0, used: 0, expired: 0 });
      } else {
        toast.error(data.message || '쿠폰 조회 실패');
      }
    } catch (error) {
      console.error('쿠폰 조회 오류:', error);
      toast.error('쿠폰을 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionRestored && isLoggedIn) {
      fetchCoupons();
    }
  }, [sessionRestored, isLoggedIn, filter]);

  // 쿠폰북 쿠폰 사용처리
  const handleUseCoupon = async (couponId: number) => {
    setUsingCouponId(couponId);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/coupon-book/use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ couponId })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`${data.data.partner?.name || '가맹점'}에서 쿠폰이 사용되었습니다!`);
        setShowUseConfirm(null);

        // 리뷰 팝업 표시
        setShowReviewPopup({
          couponId: couponId,
          partnerName: data.data.partner?.name || '가맹점'
        });
        setReviewRating(5);
        setReviewComment('');

        // 쿠폰 목록 새로고침
        fetchCoupons();
      } else {
        toast.error(data.error || '쿠폰 사용에 실패했습니다');
      }
    } catch (error) {
      console.error('쿠폰 사용 오류:', error);
      toast.error('쿠폰 사용 중 오류가 발생했습니다');
    } finally {
      setUsingCouponId(null);
    }
  };

  // 리뷰 제출
  const handleSubmitReview = async () => {
    if (!showReviewPopup) return;

    setSubmittingReview(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/coupon-book/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userCouponId: showReviewPopup.couponId,
          rating: reviewRating,
          comment: reviewComment
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`리뷰가 등록되었습니다! ${data.data.pointsAwarded}포인트가 지급되었습니다 🎉`);
        setShowReviewPopup(null);
      } else {
        toast.error(data.error || '리뷰 등록에 실패했습니다');
      }
    } catch (error) {
      console.error('리뷰 제출 오류:', error);
      toast.error('리뷰 등록 중 오류가 발생했습니다');
    } finally {
      setSubmittingReview(false);
    }
  };

  // 세션 복원 중
  if (!sessionRestored) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // 로그인 필요
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <Ticket className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
            <p className="text-gray-600 mb-6">쿠폰함을 확인하려면 로그인해주세요</p>
            <Button
              onClick={() => navigate('/login?returnUrl=/my/coupons')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              로그인하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 쿠폰 코드 복사
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('쿠폰 코드가 복사되었습니다');
  };

  // 할인 표시
  const formatDiscount = (type: string, value: number, maxDiscount?: number | null) => {
    if (type === 'PERCENT' || type === 'percentage' || type === 'percent') {
      return maxDiscount
        ? `${value}% 할인 (최대 ${maxDiscount.toLocaleString()}원)`
        : `${value}% 할인`;
    }
    return `${value.toLocaleString()}원 할인`;
  };

  // 상태 배지
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ISSUED':
        return <Badge className="bg-green-500">사용가능</Badge>;
      case 'USED':
        return <Badge className="bg-gray-500">사용완료</Badge>;
      case 'EXPIRED':
        return <Badge className="bg-red-500">만료됨</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // 필터 버튼
  const filterButtons: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: '전체', count: stats.total },
    { key: 'issued', label: '사용가능', count: stats.issued },
    { key: 'used', label: '사용완료', count: stats.used },
    { key: 'expired', label: '만료', count: stats.expired }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="bg-purple-600 text-white py-6 px-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-purple-500 -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">내 쿠폰함</h1>
          </div>
          <p className="text-purple-200 text-sm ml-9">
            발급받은 쿠폰을 확인하고 사용하세요
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4">
        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-xs text-gray-500">사용가능</p>
              <p className="text-2xl font-bold text-green-600">{stats.issued}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-xs text-gray-500">사용완료</p>
              <p className="text-2xl font-bold text-gray-600">{stats.used}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-xs text-gray-500">만료</p>
              <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
            </CardContent>
          </Card>
        </div>

        {/* 주변 가맹점 보기 버튼 */}
        <Button
          variant="outline"
          className="w-full mt-4 border-purple-200 text-purple-700 hover:bg-purple-50"
          onClick={() => navigate('/partner?coupon=true')}
        >
          <MapPin className="h-4 w-4 mr-2" />
          주변 가맹점 보기 (가고싶은섬)
        </Button>

        {/* 필터 버튼 */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {filterButtons.map(({ key, label, count }) => (
            <Button
              key={key}
              variant={filter === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(key)}
              className={filter === key ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              {label} ({count})
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={fetchCoupons}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* 쿠폰 목록 */}
        <div className="mt-4 space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
              <p className="text-gray-500 mt-2">쿠폰을 불러오는 중...</p>
            </div>
          ) : coupons.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Ticket className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  {filter === 'all' ? '발급받은 쿠폰이 없습니다' : `${filterButtons.find(f => f.key === filter)?.label} 쿠폰이 없습니다`}
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/coupon/claim')}
                >
                  쿠폰 받으러 가기
                </Button>
              </CardContent>
            </Card>
          ) : (
            coupons.map((coupon) => (
              <Card
                key={coupon.id}
                className={`overflow-hidden ${
                  coupon.status === 'EXPIRED' ? 'opacity-60' : ''
                }`}
              >
                <CardContent className="p-4">
                  {/* 쿠폰 헤더 */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(coupon.status)}
                        <span className="text-xs text-gray-500">
                          {new Date(coupon.issued_at).toLocaleDateString('ko-KR')} 발급
                        </span>
                      </div>
                      <h3 className="font-bold text-lg">{coupon.coupon_name}</h3>
                      {coupon.coupon_description && (
                        <p className="text-sm text-gray-600 mt-1">{coupon.coupon_description}</p>
                      )}
                    </div>
                  </div>

                  {/* 할인 정보 */}
                  <div className="bg-purple-50 rounded-lg p-3 mb-3">
                    {coupon.status === 'ISSUED' ? (
                      <>
                        <p className="text-purple-700 font-bold text-lg">
                          가맹점별 할인 적용
                        </p>
                        <p className="text-purple-600 text-sm mt-1">
                          할인율은 가맹점마다 다릅니다
                        </p>
                      </>
                    ) : (
                      <p className="text-purple-700 font-bold text-lg">
                        {formatDiscount(coupon.discount_type, coupon.discount_value, coupon.max_discount)}
                      </p>
                    )}
                    {coupon.valid_until && (
                      <p className="text-purple-600 text-sm flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(coupon.valid_until).toLocaleDateString('ko-KR')}까지
                      </p>
                    )}
                  </div>

                  {/* 쿠폰 코드 & QR 토글 */}
                  {coupon.status === 'ISSUED' ? (
                    <>
                      <button
                        onClick={() => setExpandedId(expandedId === coupon.id ? null : coupon.id)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-lg">{coupon.coupon_code}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyCode(coupon.coupon_code);
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        {expandedId === coupon.id ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </button>

                      {/* QR 코드 확장 */}
                      {expandedId === coupon.id && (
                        <div className="mt-4 text-center">
                          <div className="inline-block p-4 bg-white rounded-lg shadow-inner border">
                            <QRCodeSVG
                              value={coupon.qr_url}
                              size={180}
                              level="H"
                              includeMargin
                            />
                          </div>
                          <p className="text-sm text-gray-500 mt-3">
                            가맹점에서 이 QR을 보여주세요
                          </p>

                          {/* 쿠폰북 쿠폰인 경우 사용처리 버튼 표시 */}
                          {coupon.claim_source === 'coupon_book' && (
                            <div className="mt-4 space-y-2">
                              {showUseConfirm === coupon.id ? (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                  <p className="text-sm text-amber-800 mb-3 font-medium">
                                    {coupon.partner_name || '가맹점'}에서 쿠폰을 사용하시겠습니까?
                                  </p>
                                  <p className="text-xs text-amber-600 mb-3">
                                    (가맹점 직원이 고객 휴대폰에서 직접 눌러주세요)
                                  </p>
                                  <div className="flex gap-2 justify-center">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setShowUseConfirm(null)}
                                      disabled={usingCouponId === coupon.id}
                                    >
                                      취소
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => handleUseCoupon(coupon.id)}
                                      disabled={usingCouponId === coupon.id}
                                    >
                                      {usingCouponId === coupon.id ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                          처리 중...
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="h-4 w-4 mr-1" />
                                          사용 완료
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  className="w-full bg-green-600 hover:bg-green-700"
                                  onClick={() => setShowUseConfirm(coupon.id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  사용처리 (가맹점 직원용)
                                </Button>
                              )}
                            </div>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/partner?coupon=true')}
                            className="mt-3"
                          >
                            <Store className="h-4 w-4 mr-1" />
                            사용 가능 가맹점 보기
                          </Button>
                        </div>
                      )}
                    </>
                  ) : coupon.status === 'USED' && coupon.used_info ? (
                    // 사용 완료 정보
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-700 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="font-medium">{coupon.used_info.partner_name}에서 사용</span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span>결제 금액</span>
                          <span>{coupon.used_info.order_amount?.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between text-purple-600">
                          <span>할인 금액</span>
                          <span>-{coupon.used_info.discount_amount?.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between font-bold pt-1 border-t">
                          <span>최종 결제</span>
                          <span>{coupon.used_info.final_amount?.toLocaleString()}원</span>
                        </div>
                      </div>
                      {coupon.used_at && (
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(coupon.used_at).toLocaleString('ko-KR')}
                        </p>
                      )}
                    </div>
                  ) : (
                    // 만료됨
                    <div className="flex items-center gap-2 text-gray-500 p-3 bg-gray-50 rounded-lg">
                      <XCircle className="h-4 w-4" />
                      <span>유효기간이 만료되었습니다</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="mt-6 space-y-3">
          <Button
            onClick={() => navigate('/coupon/claim')}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Ticket className="h-4 w-4 mr-2" />
            새 쿠폰 받기
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/partner?coupon=true')}
            className="w-full"
          >
            <Store className="h-4 w-4 mr-2" />
            쿠폰 사용 가능 가맹점 보기
          </Button>
        </div>
      </div>

      {/* 리뷰 팝업 */}
      {showReviewPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  <h3 className="font-bold text-lg">리뷰 작성하고 포인트 받기!</h3>
                </div>
                <button
                  onClick={() => setShowReviewPopup(null)}
                  className="p-1 hover:bg-white/20 rounded-full transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-purple-100 text-sm mt-1">
                {showReviewPopup.partnerName} 이용 후기를 남겨주세요
              </p>
            </div>

            {/* 포인트 안내 */}
            <div className="bg-amber-50 border-b border-amber-100 p-3 flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <Gift className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800">리뷰 작성 시 100포인트 지급!</p>
                <p className="text-xs text-amber-600">포인트는 다음 주문 시 사용 가능합니다</p>
              </div>
            </div>

            {/* 별점 선택 */}
            <div className="p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">만족도를 선택해주세요</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= reviewRating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-gray-500 mt-1">
                {reviewRating === 5 && '매우 만족'}
                {reviewRating === 4 && '만족'}
                {reviewRating === 3 && '보통'}
                {reviewRating === 2 && '불만족'}
                {reviewRating === 1 && '매우 불만족'}
              </p>
            </div>

            {/* 리뷰 내용 */}
            <div className="px-4 pb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">이용 후기 (선택)</p>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="어떤 점이 좋았나요? 다른 분들께 도움이 될 수 있어요."
                className="w-full h-24 border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                maxLength={500}
              />
              <p className="text-xs text-gray-400 text-right mt-1">
                {reviewComment.length}/500
              </p>
            </div>

            {/* 버튼 */}
            <div className="p-4 bg-gray-50 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowReviewPopup(null)}
              >
                나중에
              </Button>
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                onClick={handleSubmitReview}
                disabled={submittingReview}
              >
                {submittingReview ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    등록 중...
                  </>
                ) : (
                  <>
                    <Gift className="h-4 w-4 mr-2" />
                    리뷰 등록하고 100P 받기
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyCouponsPage;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ArrowLeft, Copy, Ticket, CheckCircle, Loader2, X, Star, Gift } from 'lucide-react';
import { toast } from 'sonner';

export function CouponQRPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  // 쿠폰 정보 및 사용처리 상태
  const [couponInfo, setCouponInfo] = useState<{
    id: number;
    claim_source?: string;
    partner_name?: string;
    status?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUseConfirm, setShowUseConfirm] = useState(false);
  const [usingCoupon, setUsingCoupon] = useState(false);

  // 리뷰 팝업 상태
  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // 쿠폰 정보 조회
  useEffect(() => {
    const fetchCouponInfo = async () => {
      if (!code) return;

      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`/api/my/coupons?status=all`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();
        if (response.ok && data.success && data.data) {
          const coupon = data.data.find((c: any) => c.coupon_code === code);
          if (coupon) {
            setCouponInfo({
              id: coupon.id,
              claim_source: coupon.claim_source,
              partner_name: coupon.partner_name,
              status: coupon.status
            });
          }
        }
      } catch (error) {
        console.error('쿠폰 정보 조회 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCouponInfo();
  }, [code]);

  // 쿠폰 사용처리
  const handleUseCoupon = async () => {
    if (!couponInfo?.id) return;

    setUsingCoupon(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/coupon-book/use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ couponId: couponInfo.id })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`${data.data.partner?.name || '가맹점'}에서 쿠폰이 사용되었습니다!`);
        setShowUseConfirm(false);

        // 리뷰 팝업 표시
        setShowReviewPopup(true);
        setReviewRating(5);
        setReviewComment('');

        // 쿠폰 상태 업데이트
        setCouponInfo(prev => prev ? { ...prev, status: 'USED' } : null);
      } else {
        toast.error(data.error || '쿠폰 사용에 실패했습니다');
      }
    } catch (error) {
      console.error('쿠폰 사용 오류:', error);
      toast.error('쿠폰 사용 중 오류가 발생했습니다');
    } finally {
      setUsingCoupon(false);
    }
  };

  // 리뷰 제출
  const handleSubmitReview = async () => {
    if (!couponInfo?.id) return;

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
          userCouponId: couponInfo.id,
          rating: reviewRating,
          comment: reviewComment
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`리뷰가 등록되었습니다! ${data.data.pointsAwarded}포인트가 지급되었습니다`);
        setShowReviewPopup(false);
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

  // QR 코드가 담을 URL (가맹점에서 스캔용)
  // 프로덕션에서는 실제 도메인 사용, 로컬에서는 현재 origin 사용
  const isProduction = window.location.hostname !== 'localhost';
  const siteUrl = isProduction
    ? window.location.origin  // 프로덕션: https://travleap.com 등
    : 'https://travleap.com';  // 로컬 개발 시 프로덕션 URL 사용
  const qrUrl = `${siteUrl}/partner/coupon?code=${code}`;

  const handleCopyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success('쿠폰 코드가 복사되었습니다');
    }
  };

  if (!code) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Ticket className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold mb-2">쿠폰 코드가 없습니다</h2>
            <Button onClick={() => navigate('/mypage')} variant="outline" className="mt-4">
              마이페이지로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="absolute left-4 top-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            뒤로
          </Button>
          <CardTitle className="flex items-center justify-center gap-2 pt-8">
            <Ticket className="w-6 h-6 text-purple-600" />
            쿠폰 QR 코드
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* QR 코드 */}
          <div className="flex justify-center p-4 bg-white rounded-lg border">
            <QRCodeSVG
              value={qrUrl}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>

          {/* 쿠폰 코드 */}
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-2">쿠폰 코드</div>
              <div className="font-mono text-2xl font-bold tracking-wider text-purple-600">
                {code}
              </div>
            </div>
          </div>

          {/* 안내 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 text-center">
              가맹점에서 이 QR 코드를 스캔하거나<br />
              쿠폰 코드를 보여주세요
            </p>
          </div>

          {/* 쿠폰북 쿠폰인 경우 사용처리 버튼 */}
          {couponInfo?.claim_source === 'coupon_book' && couponInfo?.status === 'ISSUED' && (
            <div className="space-y-2">
              {showUseConfirm ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800 mb-3 font-medium text-center">
                    {couponInfo.partner_name || '가맹점'}에서 쿠폰을 사용하시겠습니까?
                  </p>
                  <p className="text-xs text-amber-600 mb-3 text-center">
                    (가맹점 직원이 고객 휴대폰에서 직접 눌러주세요)
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowUseConfirm(false)}
                      disabled={usingCoupon}
                    >
                      취소
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={handleUseCoupon}
                      disabled={usingCoupon}
                    >
                      {usingCoupon ? (
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
                  onClick={() => setShowUseConfirm(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  사용처리 (가맹점 직원용)
                </Button>
              )}
            </div>
          )}

          {/* 사용 완료 표시 */}
          {couponInfo?.status === 'USED' && (
            <div className="bg-gray-100 rounded-lg p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-gray-600 font-medium">이미 사용된 쿠폰입니다</p>
            </div>
          )}

          {/* 버튼들 */}
          <div className="flex gap-2">
            <Button
              onClick={handleCopyCode}
              variant="outline"
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              코드 복사
            </Button>
            <Button
              onClick={() => navigate('/my/coupons')}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              쿠폰함
            </Button>
          </div>
        </CardContent>
      </Card>

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
                  onClick={() => setShowReviewPopup(false)}
                  className="p-1 hover:bg-white/20 rounded-full transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-purple-100 text-sm mt-1">
                {couponInfo?.partner_name || '가맹점'} 이용 후기를 남겨주세요
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
                onClick={() => setShowReviewPopup(false)}
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

export default CouponQRPage;

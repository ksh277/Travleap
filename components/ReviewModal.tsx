/**
 * 리뷰 작성 모달 컴포넌트
 *
 * 사이트 입장 시 리뷰 대기 목록 확인 후 모달 표시
 * - /api/my/pending-reviews 호출
 * - 대기 리뷰가 있으면 모달 표시
 * - 별점 + 텍스트 입력
 * - 제출 시 /api/reviews/create 호출
 * - 성공 시 "500P 적립!" 토스트
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Star, Gift, Loader2, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

interface PendingReview {
  user_coupon_id: number;
  coupon_code: string;
  used_at: string;
  partner_id: number;
  partner_name: string;
  partner_address: string;
  partner_category: string;
  coupon_name: string;
  coupon_description: string;
  order_amount: number;
  discount_amount: number;
  final_amount: number;
}

export function ReviewModal() {
  const { isLoggedIn, sessionRestored } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  // 세션 체크 후 대기 리뷰 조회
  useEffect(() => {
    if (sessionRestored && isLoggedIn) {
      // 로컬 스토리지에서 마지막 체크 시간 확인 (24시간 내 체크했으면 스킵)
      const lastCheck = localStorage.getItem('review_modal_last_check');
      const now = Date.now();

      if (lastCheck && now - parseInt(lastCheck) < 24 * 60 * 60 * 1000) {
        // 24시간 내 이미 체크함
        return;
      }

      checkPendingReviews();
    }
  }, [sessionRestored, isLoggedIn]);

  const checkPendingReviews = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/my/pending-reviews', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.data && data.data.length > 0) {
          setPendingReviews(data.data);
          setIsOpen(true);
        }

        // 체크 시간 저장
        localStorage.setItem('review_modal_last_check', Date.now().toString());
      }
    } catch (error) {
      console.error('리뷰 대기 목록 조회 실패:', error);
    }
  };

  const currentReview = pendingReviews[currentReviewIndex];

  const handleSubmit = async () => {
    if (!currentReview) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/reviews/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_coupon_id: currentReview.user_coupon_id,
          rating,
          comment
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setPointsEarned(data.data?.points_earned || 500);

        toast.success(`리뷰 작성 완료! ${data.data?.points_earned || 500}P가 적립되었습니다!`);

        // 2초 후 다음 리뷰로 또는 닫기
        setTimeout(() => {
          if (currentReviewIndex < pendingReviews.length - 1) {
            setCurrentReviewIndex(prev => prev + 1);
            setRating(5);
            setComment('');
            setSuccess(false);
          } else {
            setIsOpen(false);
          }
        }, 2000);
      } else {
        toast.error(data.message || '리뷰 작성에 실패했습니다');
      }
    } catch (error) {
      console.error('리뷰 작성 실패:', error);
      toast.error('리뷰 작성 중 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (currentReviewIndex < pendingReviews.length - 1) {
      setCurrentReviewIndex(prev => prev + 1);
      setRating(5);
      setComment('');
    } else {
      setIsOpen(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!currentReview) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-600" />
              리뷰 작성하고 500P 받기!
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">리뷰 작성 완료!</h3>
            <p className="text-purple-600 font-semibold text-lg">
              +{pointsEarned}P 적립되었습니다!
            </p>
          </div>
        ) : (
          <>
            {/* 가맹점 정보 */}
            <div className="bg-purple-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">방문 가맹점</span>
                <span className="text-xs text-gray-400">
                  {currentReviewIndex + 1} / {pendingReviews.length}
                </span>
              </div>
              <h3 className="font-bold text-lg">{currentReview.partner_name}</h3>
              <p className="text-sm text-gray-600">{currentReview.partner_address}</p>
              <div className="mt-2 text-sm text-purple-600">
                {currentReview.coupon_name} 사용
              </div>
            </div>

            {/* 별점 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                방문 경험은 어떠셨나요?
              </label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-10 w-10 ${
                        star <= rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-gray-500 mt-1">
                {rating === 5 && '최고예요!'}
                {rating === 4 && '좋아요'}
                {rating === 3 && '보통이에요'}
                {rating === 2 && '별로예요'}
                {rating === 1 && '아쉬워요'}
              </p>
            </div>

            {/* 리뷰 내용 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                리뷰 내용 (선택)
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="가맹점 방문 경험을 자유롭게 작성해주세요..."
                className="min-h-[100px]"
              />
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="ghost" onClick={handleSkip}>
                나중에
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    작성 중...
                  </>
                ) : (
                  <>
                    <Gift className="h-4 w-4 mr-2" />
                    리뷰 작성하고 500P 받기
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ReviewModal;

/**
 * 리뷰 작성 모달 컴포넌트
 *
 * 사이트 입장 시 리뷰 대기 목록 확인 후 모달 표시
 * - /api/my/pending-reviews 호출
 * - 대기 리뷰가 있으면 모달 표시
 * - 별점 + 메뉴 선택(버튼) + 텍스트 입력
 * - 제출 시 /api/reviews/create 호출
 * - 성공 시 "500P 적립!" 토스트
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Star, Gift, Loader2, CheckCircle, X, Utensils, Plus } from 'lucide-react';
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

interface PartnerMenu {
  id: number;
  name: string;
  price: number;
  category: string;
  is_popular: boolean;
}

export function ReviewModal() {
  const { isLoggedIn, sessionRestored } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [rating, setRating] = useState(5);
  const [menuItem, setMenuItem] = useState('');
  const [customMenuInput, setCustomMenuInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [partnerMenus, setPartnerMenus] = useState<PartnerMenu[]>([]);
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  // 세션 체크 후 대기 리뷰 조회
  useEffect(() => {
    if (sessionRestored && isLoggedIn) {
      // 페이지 진입 시 항상 체크 (대기 리뷰가 있으면 모달 표시)
      // 단, 사용자가 "나중에" 버튼을 눌렀다면 해당 세션에서는 다시 안 띄움
      const dismissed = sessionStorage.getItem('review_modal_dismissed');
      if (dismissed) {
        return;
      }

      checkPendingReviews();
    }
  }, [sessionRestored, isLoggedIn]);

  // 현재 리뷰의 파트너 메뉴 조회
  const currentReview = pendingReviews[currentReviewIndex];

  useEffect(() => {
    if (currentReview?.partner_id) {
      fetchPartnerMenus(currentReview.partner_id);
    }
  }, [currentReview?.partner_id]);

  const fetchPartnerMenus = async (partnerId: number) => {
    setLoadingMenus(true);
    try {
      const response = await fetch(`/api/partners/${partnerId}/menus`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setPartnerMenus(data.data);
        }
      }
    } catch (error) {
      console.error('메뉴 목록 조회 실패:', error);
    } finally {
      setLoadingMenus(false);
    }
  };

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
      }
    } catch (error) {
      console.error('리뷰 대기 목록 조회 실패:', error);
    }
  };

  const handleSelectMenu = (menu: string) => {
    setMenuItem(menu);
    setShowCustomInput(false);
    setCustomMenuInput('');
  };

  const handleCustomMenuSubmit = () => {
    if (customMenuInput.trim()) {
      setMenuItem(customMenuInput.trim());
      setShowCustomInput(false);
    }
  };

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
          menu_item: menuItem,
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
            setMenuItem('');
            setCustomMenuInput('');
            setShowCustomInput(false);
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
      setMenuItem('');
      setCustomMenuInput('');
      setShowCustomInput(false);
      setComment('');
    } else {
      // 모든 리뷰를 스킵하면 이 세션에서는 다시 안 띄움
      sessionStorage.setItem('review_modal_dismissed', 'true');
      setIsOpen(false);
    }
  };

  const handleClose = () => {
    // X 버튼으로 닫으면 이 세션에서는 다시 안 띄움
    sessionStorage.setItem('review_modal_dismissed', 'true');
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

            {/* 구매 메뉴 선택 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Utensils className="inline h-4 w-4 mr-1" />
                구매한 메뉴/상품
              </label>

              {/* 선택된 메뉴 표시 */}
              {menuItem && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-purple-100 rounded-lg">
                  <span className="text-sm text-purple-800 font-medium">{menuItem}</span>
                  <button
                    type="button"
                    onClick={() => setMenuItem('')}
                    className="text-purple-600 hover:text-purple-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* 메뉴 버튼 목록 */}
              {loadingMenus ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500">메뉴 불러오는 중...</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {partnerMenus.filter(m => m.name !== '기타').map((menu) => (
                    <button
                      key={menu.id}
                      type="button"
                      onClick={() => handleSelectMenu(menu.name)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                        menuItem === menu.name
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                      }`}
                    >
                      {menu.name}
                      {menu.is_popular && <span className="ml-1 text-xs">★</span>}
                    </button>
                  ))}

                  {/* 직접 입력 버튼 */}
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(!showCustomInput)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-all flex items-center gap-1 ${
                      showCustomInput
                        ? 'bg-gray-100 border-gray-400'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Plus className="h-3 w-3" />
                    직접 입력
                  </button>
                </div>
              )}

              {/* 직접 입력 필드 */}
              {showCustomInput && (
                <div className="mt-2 flex gap-2">
                  <Input
                    value={customMenuInput}
                    onChange={(e) => setCustomMenuInput(e.target.value)}
                    placeholder="메뉴명 입력..."
                    className="flex-1"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCustomMenuSubmit();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCustomMenuSubmit}
                    disabled={!customMenuInput.trim()}
                  >
                    확인
                  </Button>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-2">선택사항</p>
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
                리뷰 내용 <span className="text-red-500">*</span>
                <span className="text-xs text-gray-400 ml-1">(최소 10글자)</span>
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="가맹점 방문 경험을 10글자 이상 작성해주세요..."
                className={`min-h-[100px] ${comment.length > 0 && comment.length < 10 ? 'border-red-300' : ''}`}
              />
              <div className="flex justify-between mt-1">
                <span className={`text-xs ${comment.length < 10 ? 'text-red-500' : 'text-green-500'}`}>
                  {comment.length}/10글자 {comment.length >= 10 ? '✓' : ''}
                </span>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="ghost" onClick={handleSkip}>
                나중에
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || comment.length < 10}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300"
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

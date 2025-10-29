/**
 * 결제 내역 카드 컴포넌트
 *
 * 기능:
 * - 주문 상세 정보 표시
 * - 배송지 정보 표시
 * - 포인트 사용/적립 정보 표시
 * - 환불 버튼 및 모달
 * - 환불 정책 계산
 */

import React, { useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Receipt, MapPin, Calendar, Clock, Users, Package, Coins, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentHistoryCardProps {
  payment: any;
  onRefund: (paymentKey: string, reason: string) => Promise<void>;
  onDelete?: (paymentId: number) => Promise<void>;
}

export function PaymentHistoryCard({ payment, onRefund, onDelete }: PaymentHistoryCardProps) {
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // notes 파싱
  let notesData: any = null;
  if (payment.notes) {
    try {
      notesData = JSON.parse(payment.notes);
    } catch (e) {
      console.error('notes 파싱 오류:', e);
    }
  }

  // 이미지 및 제목 결정
  const getDefaultImage = (category: string) => {
    const defaults: Record<string, string> = {
      tour: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800',
      accommodation: 'https://images.unsplash.com/photo-1566073771259-6a8506099945',
      rentcar: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d',
      popup: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86'
    };
    return defaults[category] || defaults.tour;
  };

  let displayImage = getDefaultImage(payment.category || 'tour');
  let displayTitle = payment.listing_title || '주문';
  let itemCount = 1;

  // 장바구니 주문인 경우
  if (notesData?.items && Array.isArray(notesData.items)) {
    itemCount = notesData.items.length;
    if (itemCount > 1) {
      displayTitle = `${notesData.items[0].title || '상품'} 외 ${itemCount - 1}개`;
    } else if (itemCount === 1) {
      displayTitle = notesData.items[0].title || '상품';
    }
  }

  // listing 이미지
  if (payment.listing_images) {
    try {
      const images = typeof payment.listing_images === 'string'
        ? JSON.parse(payment.listing_images)
        : payment.listing_images;
      if (Array.isArray(images) && images.length > 0) {
        displayImage = images[0];
      }
    } catch (e) {
      console.error('이미지 파싱 오류:', e);
    }
  }

  // 환불 가능 여부
  const isPaid = payment.payment_status === 'paid' || payment.payment_status === 'completed';
  const isRefunded = payment.payment_status === 'refunded';
  const canRefund = isPaid && payment.payment_key;

  // 환불 처리
  const handleRefund = async () => {
    if (!refundReason) {
      toast.error('환불 사유를 선택해주세요.');
      return;
    }

    setIsRefunding(true);
    try {
      await onRefund(payment.payment_key, refundReason);
      toast.success('환불이 완료되었습니다.');
      setShowRefundDialog(false);
    } catch (error: any) {
      toast.error(error.message || '환불 처리 중 오류가 발생했습니다.');
    } finally {
      setIsRefunding(false);
    }
  };

  // 결제 내역 삭제 (사용자 화면에서만 숨김)
  const handleDelete = async () => {
    if (!onDelete) return;

    if (!confirm('이 결제 내역을 삭제하시겠습니까?\n(관리자는 계속 볼 수 있습니다)')) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(payment.id);
      toast.success('결제 내역이 삭제되었습니다.');
    } catch (error: any) {
      toast.error(error.message || '삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex flex-col space-y-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{displayTitle}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {payment.category || '일반'}
                  </Badge>
                  <Badge
                    className={
                      isPaid
                        ? 'bg-green-100 text-green-800'
                        : isRefunded
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }
                  >
                    {isPaid ? '결제 완료' : isRefunded ? '환불 완료' : '결제 실패'}
                  </Badge>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xl font-bold text-purple-600">
                  {Math.floor(payment.amount).toLocaleString()}원
                </div>
                {/* 가격 분해 표시 */}
                {notesData && (notesData.subtotal || notesData.deliveryFee) && (
                  <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                    {notesData.subtotal > 0 && (
                      <div>상품 {Math.floor(notesData.subtotal).toLocaleString()}원</div>
                    )}
                    {notesData.deliveryFee > 0 && (
                      <div>배송비 {Math.floor(notesData.deliveryFee).toLocaleString()}원</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 주문 기본 정보 */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">주문번호:</span>
                <p className="font-mono text-xs mt-1 break-all">
                  {payment.gateway_transaction_id || payment.order_id_str || '-'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">결제일:</span>
                <p className="mt-1">
                  {new Date(payment.approved_at || payment.created_at).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short'
                  })}
                </p>
              </div>
            </div>

            {/* 포인트 정보 */}
            {notesData && (notesData.pointsUsed > 0 || notesData.pointsEarned > 0) && (
              <div className="mt-3 p-2 bg-purple-50 rounded-lg">
                <div className="flex items-center text-sm">
                  <Coins className="w-4 h-4 mr-2 text-purple-600" />
                  <div className="flex-1">
                    {notesData.pointsUsed > 0 && (
                      <span className="text-gray-700">
                        사용: <strong className="text-purple-700">-{notesData.pointsUsed.toLocaleString()}P</strong>
                      </span>
                    )}
                    {notesData.pointsUsed > 0 && notesData.pointsEarned > 0 && ' | '}
                    {notesData.pointsEarned > 0 && (
                      <span className="text-gray-700">
                        적립: <strong className="text-green-700">+{notesData.pointsEarned.toLocaleString()}P</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 배송지 정보 (팝업 상품) */}
            {notesData?.shippingInfo && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex items-start">
                  <Package className="w-4 h-4 mr-2 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-700 mb-1">배송지 정보</p>
                    <p className="text-gray-600">{notesData.shippingInfo.name} | {notesData.shippingInfo.phone}</p>
                    <p className="text-gray-600 mt-1">
                      [{notesData.shippingInfo.zipcode}] {notesData.shippingInfo.address}
                    </p>
                    {notesData.shippingInfo.addressDetail && (
                      <p className="text-gray-600">{notesData.shippingInfo.addressDetail}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 예약 상세 정보 (숙박/렌트카/음식 등 - 팝업 제외) */}
            {payment.start_date && payment.end_date && payment.category !== 'popup' && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                    <span className="text-gray-700">
                      {new Date(payment.start_date).toLocaleDateString('ko-KR')} ~ {new Date(payment.end_date).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  {(payment.adults || payment.children || payment.infants) && (
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-blue-600" />
                      <span className="text-gray-700">
                        {payment.adults > 0 && `성인 ${payment.adults}명`}
                        {payment.children > 0 && ` / 아동 ${payment.children}명`}
                        {payment.infants > 0 && ` / 유아 ${payment.infants}명`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 하단 버튼 영역 */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {payment.receipt_url && (
                <a
                  href={payment.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  <Receipt className="w-4 h-4 mr-1" />
                  영수증
                </a>
              )}

              {canRefund && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRefundDialog(true)}
                  className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                >
                  환불 신청
                </Button>
              )}

              {!isPaid && !isRefunded && onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-gray-600 hover:text-gray-700 border-gray-200 hover:border-gray-300"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      삭제 중...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3 h-3 mr-1" />
                      삭제
                    </>
                  )}
                </Button>
              )}

              {isRefunded && payment.refunded_at && (
                <span className="text-xs text-gray-500">
                  환불일: {new Date(payment.refunded_at).toLocaleDateString('ko-KR')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 환불 모달 */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>환불 신청</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">환불 전 확인사항</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>환불 정책에 따라 수수료가 차감될 수 있습니다</li>
                    <li>배송 완료된 상품은 반송 택배비가 차감됩니다</li>
                    <li>사용한 포인트는 환불 후 복구됩니다</li>
                    <li>환불은 영업일 기준 3-5일 소요됩니다</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                환불 사유 <span className="text-red-500">*</span>
              </label>
              <Select value={refundReason} onValueChange={setRefundReason}>
                <SelectTrigger>
                  <SelectValue placeholder="환불 사유를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="change_of_mind">단순 변심</SelectItem>
                  <SelectItem value="product_defect">상품 불량/하자</SelectItem>
                  <SelectItem value="wrong_product">상품 오배송</SelectItem>
                  <SelectItem value="schedule_change">일정 변경</SelectItem>
                  <SelectItem value="other">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">결제 금액:</span>
                <span className="font-semibold">{Math.floor(payment.amount).toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>환불 예상 금액:</span>
                <span className="text-gray-700">환불 정책에 따라 결정됩니다</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRefundDialog(false)}
              disabled={isRefunding}
            >
              취소
            </Button>
            <Button
              onClick={handleRefund}
              disabled={!refundReason || isRefunding}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRefunding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                '환불 신청'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

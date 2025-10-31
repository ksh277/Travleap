/**
 * 배송 관리 다이얼로그
 *
 * 기능:
 * - 송장번호 입력
 * - 택배사 선택
 * - 배송 상태 변경
 * - 배송 정보 조회
 *
 * 사용 위치: 벤더 대시보드, 관리자 페이지
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Package, Truck, CheckCircle, XCircle, Clock, Copy, ExternalLink } from 'lucide-react';

interface ShippingInfo {
  id: number;
  booking_number: string;
  shipping_name?: string;
  shipping_phone?: string;
  shipping_address?: string;
  shipping_address_detail?: string;
  shipping_zipcode?: string;
  shipping_memo?: string;
  tracking_number?: string;
  courier_company?: string;
  delivery_status?: 'PENDING' | 'READY' | 'SHIPPING' | 'DELIVERED' | 'CANCELED';
  shipped_at?: string;
  delivered_at?: string;
}

interface ShippingManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: ShippingInfo | null;
  onUpdate?: () => void;
}

// 주요 택배사 목록 + 추적 URL
const COURIER_COMPANIES = [
  {
    value: 'cj',
    label: 'CJ대한통운',
    trackingUrl: (invoice: string) => `https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=${invoice}`
  },
  {
    value: 'hanjin',
    label: '한진택배',
    trackingUrl: (invoice: string) => `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${invoice}`
  },
  {
    value: 'lotte',
    label: '롯데택배',
    trackingUrl: (invoice: string) => `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${invoice}`
  },
  {
    value: 'post',
    label: '우체국택배',
    trackingUrl: (invoice: string) => `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${invoice}`
  },
  {
    value: 'logen',
    label: '로젠택배',
    trackingUrl: (invoice: string) => `https://www.ilogen.com/web/personal/trace/${invoice}`
  },
  {
    value: 'kdexp',
    label: '경동택배',
    trackingUrl: (invoice: string) => `https://kdexp.com/service/delivery/delivery_result.asp?barcode=${invoice}`
  },
  {
    value: 'gsg',
    label: 'GSPostbox택배',
    trackingUrl: (invoice: string) => `https://www.gspostbox.kr/m/service/htmlView/tracking_result.jsp?invoice_no=${invoice}`
  },
  {
    value: 'chunil',
    label: '천일택배',
    trackingUrl: (invoice: string) => `http://www.chunil.co.kr/HTrace/HTrace.jsp?transNo=${invoice}`
  },
  {
    value: 'etc',
    label: '기타',
    trackingUrl: null
  },
];

// 배송 상태 옵션
const DELIVERY_STATUSES = [
  { value: 'PENDING', label: '결제대기', icon: Clock, color: 'gray' },
  { value: 'READY', label: '배송준비', icon: Package, color: 'blue' },
  { value: 'SHIPPING', label: '배송중', icon: Truck, color: 'orange' },
  { value: 'DELIVERED', label: '배송완료', icon: CheckCircle, color: 'green' },
  { value: 'CANCELED', label: '취소', icon: XCircle, color: 'red' },
];

export function ShippingManagementDialog({
  open,
  onOpenChange,
  booking,
  onUpdate
}: ShippingManagementDialogProps) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierCompany, setCourierCompany] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<string>('PENDING');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 송장번호 복사
  const handleCopyTracking = () => {
    if (trackingNumber) {
      navigator.clipboard.writeText(trackingNumber);
      toast.success('송장번호가 복사되었습니다.');
    }
  };

  // 배송 추적 URL 열기
  const handleOpenTracking = () => {
    const courier = COURIER_COMPANIES.find(c => c.value === courierCompany);
    if (courier && courier.trackingUrl && trackingNumber) {
      const url = courier.trackingUrl(trackingNumber);
      window.open(url, '_blank');
    } else {
      toast.error('택배사 추적 URL이 없거나 송장번호가 입력되지 않았습니다.');
    }
  };

  // 예약 정보가 변경되면 폼 초기화
  useEffect(() => {
    if (booking) {
      setTrackingNumber(booking.tracking_number || '');
      setCourierCompany(booking.courier_company || '');
      setDeliveryStatus(booking.delivery_status || 'PENDING');
    }
  }, [booking]);

  // 송장번호와 택배사 입력 시 자동으로 배송중 상태로 변경
  useEffect(() => {
    // 배송완료나 취소 상태가 아닌 경우에만 자동 변경
    if (trackingNumber && courierCompany && deliveryStatus !== 'DELIVERED' && deliveryStatus !== 'CANCELED') {
      setDeliveryStatus('SHIPPING');
      toast.info('송장번호와 택배사 입력으로 배송 상태가 "배송중"으로 자동 변경되었습니다.');
    }
  }, [trackingNumber, courierCompany]);

  const handleSubmit = async () => {
    if (!booking) return;

    // 배송중/배송완료 상태로 변경 시 송장번호 필수
    if (['SHIPPING', 'DELIVERED'].includes(deliveryStatus) && !trackingNumber) {
      toast.error('송장번호를 입력해주세요.');
      return;
    }

    if (['SHIPPING', 'DELIVERED'].includes(deliveryStatus) && !courierCompany) {
      toast.error('택배사를 선택해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      // JWT 토큰 가져오기
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('로그인이 필요합니다.');
        return;
      }

      const response = await fetch(`/api/bookings/${booking.id}/shipping`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tracking_number: trackingNumber || null,
          courier_company: courierCompany || null,
          delivery_status: deliveryStatus,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('배송 정보가 업데이트되었습니다.');
        onUpdate?.();
        onOpenChange(false);
      } else {
        throw new Error(data.error || '배송 정보 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('배송 정보 업데이트 실패:', error);
      toast.error(error instanceof Error ? error.message : '업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!booking) return null;

  const currentStatus = DELIVERY_STATUSES.find(s => s.value === deliveryStatus);
  const StatusIcon = currentStatus?.icon || Package;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              배송 관리
            </div>
          </DialogTitle>
          <DialogDescription>
            예약번호: {booking.booking_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 배송지 정보 (읽기 전용) */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-sm mb-3">배송지 정보</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">수령인:</span>
                <span className="ml-2 font-medium">{booking.shipping_name || '-'}</span>
              </div>
              <div>
                <span className="text-gray-600">연락처:</span>
                <span className="ml-2 font-medium">{booking.shipping_phone || '-'}</span>
              </div>
            </div>
            {booking.shipping_address && (
              <div className="text-sm pt-2 border-t">
                <span className="text-gray-600">주소:</span>
                <div className="mt-1 font-medium">
                  [{booking.shipping_zipcode}] {booking.shipping_address}
                  {booking.shipping_address_detail && (
                    <div className="text-gray-600">{booking.shipping_address_detail}</div>
                  )}
                </div>
              </div>
            )}
            {booking.shipping_memo && (
              <div className="text-sm pt-2 border-t">
                <span className="text-gray-600">배송 메모:</span>
                <div className="mt-1">{booking.shipping_memo}</div>
              </div>
            )}
          </div>

          {/* 현재 배송 상태 */}
          <div>
            <Label className="mb-2">현재 배송 상태</Label>
            <div className="flex items-center gap-2 mt-2">
              <StatusIcon className={`w-5 h-5 text-${currentStatus?.color}-500`} />
              <Badge variant="outline" className="text-base py-1">
                {currentStatus?.label}
              </Badge>
            </div>
            {booking.shipped_at && (
              <div className="text-xs text-gray-500 mt-1">
                발송: {new Date(booking.shipped_at).toLocaleString('ko-KR')}
              </div>
            )}
            {booking.delivered_at && (
              <div className="text-xs text-gray-500 mt-1">
                배송완료: {new Date(booking.delivered_at).toLocaleString('ko-KR')}
              </div>
            )}
          </div>

          {/* 택배사 선택 */}
          <div>
            <Label htmlFor="courier">택배사 *</Label>
            <Select value={courierCompany} onValueChange={setCourierCompany}>
              <SelectTrigger id="courier" className="mt-2">
                <SelectValue placeholder="택배사를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {COURIER_COMPANIES.map((courier) => (
                  <SelectItem key={courier.value} value={courier.value}>
                    {courier.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 송장번호 입력 */}
          <div>
            <Label htmlFor="tracking">송장번호 *</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="tracking"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="송장번호를 입력하세요"
                className="flex-1"
              />
              {trackingNumber && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyTracking}
                    title="송장번호 복사"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {courierCompany && courierCompany !== 'etc' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleOpenTracking}
                      title="배송 추적"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
            {trackingNumber && courierCompany && courierCompany !== 'etc' && (
              <p className="text-xs text-blue-600 mt-1">
                → 배송 추적 버튼을 클릭하면 택배사 사이트에서 배송 현황을 확인할 수 있습니다.
              </p>
            )}
          </div>

          {/* 배송 상태 변경 */}
          <div>
            <Label htmlFor="status">배송 상태 변경 *</Label>
            <Select value={deliveryStatus} onValueChange={setDeliveryStatus}>
              <SelectTrigger id="status" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_STATUSES.map((status) => {
                  const Icon = status.icon;
                  return (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 text-${status.color}-500`} />
                        {status.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              * 배송중/배송완료 변경 시 송장번호와 택배사 정보가 필수입니다.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

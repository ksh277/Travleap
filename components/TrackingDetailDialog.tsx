/**
 * 배송 조회 상세 다이얼로그
 *
 * 기능:
 * - 스마트택배 API로 실시간 배송 현황 조회
 * - 배송 단계별 타임라인 표시
 * - 배송 완료 여부 표시
 *
 * 사용 위치: 벤더 대시보드, 관리자 페이지, 사용자 마이페이지
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import {
  Package,
  Truck,
  CheckCircle,
  MapPin,
  Clock,
  User,
  Phone,
  Home,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { getLevelLabel } from '../utils/sweettracker';

interface TrackingLevel {
  level: number;
  label?: string;
  manName?: string;
  manPic?: string;
  telno?: string;
  telno2?: string;
  time?: string;
  timeString?: string;
  where?: string;
  kind?: string;
  remark?: string;
}

interface TrackingData {
  invoiceNo: string;
  level: number;
  complete: boolean;
  senderName?: string;
  receiverName?: string;
  receiverAddr?: string;
  itemName?: string;
  orderNumber?: string;
  estimate?: string;
  recipient?: string;
  result?: string;
  trackingDetails?: TrackingLevel[];
}

interface TrackingDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courierCompany: string;
  trackingNumber: string;
}

export function TrackingDetailDialog({
  open,
  onOpenChange,
  courierCompany,
  trackingNumber,
}: TrackingDetailDialogProps) {
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 배송 조회
  const handleQuery = async () => {
    if (!courierCompany || !trackingNumber) {
      toast.error('택배사와 송장번호가 필요합니다.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/tracking/query?courier=${encodeURIComponent(courierCompany)}&invoice=${encodeURIComponent(trackingNumber)}`
      );

      const result = await response.json();

      if (result.success) {
        setTrackingData(result.data);
        toast.success('배송 정보를 조회했습니다.');
      } else {
        throw new Error(result.error || '배송 조회에 실패했습니다.');
      }
    } catch (err) {
      console.error('배송 조회 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '배송 조회 중 오류가 발생했습니다.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 다이얼로그 열릴 때 자동 조회
  useState(() => {
    if (open && !trackingData) {
      handleQuery();
    }
  });

  const getLevelBadgeColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-blue-100 text-blue-700';
      case 2:
        return 'bg-orange-100 text-orange-700';
      case 3:
        return 'bg-purple-100 text-purple-700';
      case 4:
        return 'bg-green-100 text-green-700';
      case 5:
        return 'bg-gray-100 text-gray-700';
      case 6:
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getLevelIcon = (level: number) => {
    switch (level) {
      case 1:
        return Package;
      case 2:
      case 3:
        return Truck;
      case 4:
        return CheckCircle;
      case 5:
      case 6:
        return AlertCircle;
      default:
        return Package;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              배송 조회
            </div>
          </DialogTitle>
          <DialogDescription>
            송장번호: {trackingNumber}
          </DialogDescription>
        </DialogHeader>

        {/* 로딩 */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">배송 정보를 조회하고 있습니다...</p>
          </div>
        )}

        {/* 에러 */}
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">조회 실패</h3>
                <p className="text-sm text-red-700">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleQuery}
                  className="mt-3"
                >
                  다시 조회
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 배송 정보 */}
        {trackingData && !isLoading && (
          <div className="space-y-6">
            {/* 현재 상태 */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = getLevelIcon(trackingData.level);
                    return <Icon className="w-8 h-8 text-blue-600" />;
                  })()}
                  <div>
                    <Badge className={getLevelBadgeColor(trackingData.level)}>
                      {getLevelLabel(trackingData.level)}
                    </Badge>
                    {trackingData.complete && (
                      <Badge className="ml-2 bg-green-600 text-white">
                        배송완료
                      </Badge>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleQuery}>
                  새로고침
                </Button>
              </div>

              {trackingData.result && (
                <p className="text-sm text-gray-700 mb-2">
                  {trackingData.result}
                </p>
              )}

              {trackingData.estimate && (
                <p className="text-xs text-gray-600">
                  예상 배송: {trackingData.estimate}
                </p>
              )}
            </div>

            {/* 배송 정보 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {trackingData.senderName && (
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <span className="text-gray-600">발신인</span>
                    <p className="font-medium">{trackingData.senderName}</p>
                  </div>
                </div>
              )}

              {trackingData.receiverName && (
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <span className="text-gray-600">수취인</span>
                    <p className="font-medium">{trackingData.receiverName}</p>
                  </div>
                </div>
              )}

              {trackingData.receiverAddr && (
                <div className="col-span-2 flex items-start gap-2">
                  <Home className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <span className="text-gray-600">배송지</span>
                    <p className="font-medium">{trackingData.receiverAddr}</p>
                  </div>
                </div>
              )}

              {trackingData.itemName && (
                <div className="col-span-2 flex items-start gap-2">
                  <Package className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <span className="text-gray-600">상품명</span>
                    <p className="font-medium">{trackingData.itemName}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 배송 추적 상세 */}
            {trackingData.trackingDetails && trackingData.trackingDetails.length > 0 && (
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  배송 추적 내역
                </h3>
                <div className="space-y-3">
                  {trackingData.trackingDetails.map((detail, index) => (
                    <div
                      key={index}
                      className={`flex gap-4 pb-3 ${
                        index !== trackingData.trackingDetails!.length - 1
                          ? 'border-b border-gray-200'
                          : ''
                      }`}
                    >
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          index === 0
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {index === 0 ? (
                            <Truck className="w-4 h-4" />
                          ) : (
                            <MapPin className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            {detail.where && (
                              <p className="font-medium text-gray-900">{detail.where}</p>
                            )}
                            {detail.kind && (
                              <p className="text-gray-700">{detail.kind}</p>
                            )}
                            {detail.remark && (
                              <p className="text-xs text-gray-500 mt-1">{detail.remark}</p>
                            )}
                            {detail.manName && (
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                                <User className="w-3 h-3" />
                                {detail.manName}
                                {detail.telno && (
                                  <>
                                    <Phone className="w-3 h-3 ml-2" />
                                    {detail.telno}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          {detail.timeString && (
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {detail.timeString}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

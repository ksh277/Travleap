/**
 * 렌트카 예약 관리 페이지
 * - 내 렌트카 예약 조회
 * - 예약 취소 (정책 기반 환불)
 * - 바우처 확인 (QR 코드)
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import {
  Car,
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  Loader2,
  XCircle,
  CheckCircle,
  QrCode,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import QRCodeLib from 'qrcode';

interface RentcarBooking {
  id: number;
  booking_number: string;
  vehicle: {
    id: number;
    brand: string;
    model: string;
    display_name: string;
    vehicle_class: string;
    image: string;
  };
  vendor: {
    id: number;
    business_name: string;
    brand_name: string;
  };
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  driver: {
    name: string;
    birth: string;
    license_no: string;
    license_exp: string;
  };
  pickup_at: string;
  return_at: string;
  pickup_location: string;
  dropoff_location: string;
  status: 'pending' | 'confirmed' | 'picked_up' | 'returned' | 'completed' | 'canceled';
  payment_status: string;
  total_price_krw: number;
  deposit_amount_krw?: number;
  voucher_code?: string;
  qr_code?: string;
  created_at: string;
  hold_expires_at?: string;
  check_in?: {
    checked_in_at: string;
    checked_in_by: string;
    mileage: number;
    fuel_level: string;
    condition: string;
    damage_notes?: string;
    photos?: string[];
  };
  check_out?: {
    checked_out_at: string;
    checked_out_by: string;
    actual_return_at: string;
    mileage: number;
    fuel_level: string;
    condition: string;
    damage_notes?: string;
    photos?: string[];
    late_return_hours?: number;
    late_return_fee_krw?: number;
    total_additional_fee_krw?: number;
  };
  deposit_settlement?: {
    deposit_amount: number;
    status: string;
    preauth_at: string;
    captured_at?: string;
    captured_amount?: number;
    refunded_at?: string;
    refunded_amount?: number;
    cancel_reason?: string;
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '결제대기', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: '예약확정', color: 'bg-blue-100 text-blue-800' },
  picked_up: { label: '대여중', color: 'bg-green-100 text-green-800' },
  returned: { label: '반납완료', color: 'bg-purple-100 text-purple-800' },
  completed: { label: '정산완료', color: 'bg-gray-100 text-gray-800' },
  canceled: { label: '취소됨', color: 'bg-red-100 text-red-800' }
};

export function RentcarBookingsPage() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();

  const [bookings, setBookings] = useState<RentcarBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingBookingId, setCancellingBookingId] = useState<number | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<RentcarBooking | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrVoucherCode, setQrVoucherCode] = useState('');
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // 데이터 로드
  useEffect(() => {
    if (!isLoggedIn) {
      toast.error('로그인이 필요합니다');
      navigate('/login');
      return;
    }

    fetchRentcarBookings();
  }, [isLoggedIn]);

  const fetchRentcarBookings = async () => {
    try {
      setLoading(true);

      // MVP API 사용 - 체크인/체크아웃 정보 포함
      const response = await fetch(`/api/rentcar/user/rentals?user_id=${user?.id || ''}&customer_email=${user?.email || ''}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setBookings(result.data || []);
      } else {
        console.error('Failed to fetch rentcar bookings:', result.error);
      }
    } catch (error) {
      console.error('렌트카 예약 조회 오류:', error);
      toast.error('예약 내역을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 취소 정책 기반 환불 금액 계산
  const calculateRefund = (booking: RentcarBooking) => {
    const now = new Date();
    const pickupTime = new Date(booking.pickup_at);
    const hoursUntilPickup = (pickupTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // 취소 정책 (렌트카)
    let refundRate = 0;
    if (hoursUntilPickup >= 72) {
      refundRate = 100; // 3일 전: 100% 환불
    } else if (hoursUntilPickup >= 48) {
      refundRate = 80; // 2일 전: 80% 환불
    } else if (hoursUntilPickup >= 24) {
      refundRate = 50; // 1일 전: 50% 환불
    } else {
      refundRate = 0; // 당일: 환불 불가
    }

    const refundAmount = Math.floor(booking.total_price_krw * refundRate / 100);
    const cancellationFee = booking.total_price_krw - refundAmount;

    return {
      refundRate,
      refundAmount,
      cancellationFee,
      hoursUntilPickup: Math.floor(hoursUntilPickup)
    };
  };

  // 취소 처리
  const handleCancelBooking = async (booking: RentcarBooking) => {
    setSelectedBooking(booking);
    setShowCancelDialog(true);
  };

  const confirmCancel = async () => {
    if (!selectedBooking) return;

    try {
      setCancellingBookingId(selectedBooking.id);

      // 새 MVP API 사용
      const response = await fetch(`/api/rentals/${selectedBooking.booking_number}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          cancel_reason: cancelReason || '고객 요청'
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '예약 취소에 실패했습니다');
      }

      toast.success(`예약이 취소되었습니다. 환불 금액: ₩${result.data.refund?.refund_amount?.toLocaleString() || 0}`);

      // 목록 새로고침
      await fetchRentcarBookings();

      setShowCancelDialog(false);
      setSelectedBooking(null);
      setCancelReason('');

    } catch (error: any) {
      console.error('예약 취소 오류:', error);
      toast.error(error.message || '예약 취소 중 오류가 발생했습니다');
    } finally {
      setCancellingBookingId(null);
    }
  };

  // 상태 배지
  const getStatusBadge = (status: string) => {
    const statusInfo = STATUS_LABELS[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <Badge className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  // 바우처 표시
  const showVoucher = (booking: RentcarBooking) => {
    if (!booking.voucher_code) {
      toast.error('바우처가 아직 생성되지 않았습니다');
      return;
    }

    // QR 코드 표시 모달 열기
    setQrVoucherCode(booking.voucher_code);
    setShowQRDialog(true);
  };

  // QR 코드 생성
  useEffect(() => {
    if (showQRDialog && qrVoucherCode && qrCanvasRef.current) {
      QRCodeLib.toCanvas(
        qrCanvasRef.current,
        qrVoucherCode,
        {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        },
        (error) => {
          if (error) {
            console.error('QR code generation failed:', error);
            toast.error('QR 코드 생성에 실패했습니다');
          }
        }
      );
    }
  }, [showQRDialog, qrVoucherCode]);

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Car className="h-8 w-8" />
            렌트카 예약 관리
          </h1>
          <p className="text-gray-600 mt-2">내 렌트카 예약을 확인하고 관리할 수 있습니다</p>
        </div>

        {/* 예약 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>예약 내역</span>
              <Button variant="outline" size="sm" onClick={fetchRentcarBookings}>
                <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                새로고침
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2">예약 내역을 불러오는 중...</span>
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12">
                <Car className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">예약 내역이 없습니다</h3>
                <p className="text-gray-600 mb-4">렌트카를 예약하고 편리하게 여행하세요</p>
                <Button onClick={() => navigate('/rentcar')}>
                  렌트카 검색하기
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => {
                  const refundInfo = calculateRefund(booking);
                  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
                  const showVoucherBtn = booking.status === 'confirmed' || booking.status === 'picked_up';

                  return (
                    <div key={booking.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex gap-4">
                        {/* 차량 이미지 */}
                        <img
                          src={booking.vehicle?.image || 'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=400'}
                          alt={booking.vehicle?.display_name}
                          className="w-32 h-32 rounded-lg object-cover"
                        />

                        {/* 예약 정보 */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-semibold">{booking.vehicle?.display_name}</h3>
                              <p className="text-sm text-gray-600">예약 번호: {booking.booking_number}</p>
                              <p className="text-xs text-gray-500">{booking.vendor?.brand_name}</p>
                            </div>
                            <div className="text-right">
                              {getStatusBadge(booking.status)}
                              {booking.status === 'pending' && booking.hold_expires_at && (
                                <p className="text-xs text-orange-600 mt-1">
                                  {format(new Date(booking.hold_expires_at), 'MM/dd HH:mm', { locale: ko })} 만료
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600">인수:</span>
                              <span className="font-medium">
                                {format(new Date(booking.pickup_at), 'MM/dd HH:mm', { locale: ko })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600">반납:</span>
                              <span className="font-medium">
                                {format(new Date(booking.return_at), 'MM/dd HH:mm', { locale: ko })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-600">픽업:</span>
                              <span className="font-medium">{booking.pickup_location || '위치 미정'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">총 금액:</span>
                              <span className="font-semibold text-blue-600">
                                ₩{booking.total_price_krw.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* 운전자 정보 */}
                          {booking.driver?.name && (
                            <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                              <span className="text-gray-600">운전자:</span>{' '}
                              <span className="font-medium">{booking.driver.name}</span>
                              {booking.driver.license_no && (
                                <span className="ml-3 text-gray-600">
                                  면허: {booking.driver.license_no}
                                </span>
                              )}
                            </div>
                          )}

                          {/* 체크인 정보 */}
                          {booking.check_in && (
                            <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-900">차량 인수 완료</span>
                              </div>
                              <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">인수 시간:</span>
                                  <span className="font-medium">
                                    {format(new Date(booking.check_in.checked_in_at), 'MM/dd HH:mm', { locale: ko })}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">주행거리:</span>
                                  <span className="font-medium">{booking.check_in.mileage.toLocaleString()}km</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">연료:</span>
                                  <span className="font-medium">{booking.check_in.fuel_level}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">차량 상태:</span>
                                  <span className="font-medium">{booking.check_in.condition}</span>
                                </div>
                                {booking.check_in.damage_notes && (
                                  <div className="mt-2 pt-2 border-t">
                                    <span className="text-gray-600">손상 메모:</span>
                                    <p className="text-gray-800 mt-1">{booking.check_in.damage_notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 체크아웃 정보 */}
                          {booking.check_out && (
                            <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-900">차량 반납 완료</span>
                              </div>
                              <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">반납 시간:</span>
                                  <span className="font-medium">
                                    {format(new Date(booking.check_out.actual_return_at), 'MM/dd HH:mm', { locale: ko })}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">주행거리:</span>
                                  <span className="font-medium">{booking.check_out.mileage.toLocaleString()}km</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">연료:</span>
                                  <span className="font-medium">{booking.check_out.fuel_level}</span>
                                </div>
                                {booking.check_out.late_return_hours && booking.check_out.late_return_hours > 0 && (
                                  <div className="mt-2 pt-2 border-t">
                                    <div className="flex justify-between text-orange-600">
                                      <span>연체 시간:</span>
                                      <span className="font-medium">{booking.check_out.late_return_hours}시간</span>
                                    </div>
                                    <div className="flex justify-between text-orange-600">
                                      <span>연체료:</span>
                                      <span className="font-medium">₩{booking.check_out.late_return_fee_krw?.toLocaleString()}</span>
                                    </div>
                                  </div>
                                )}
                                {booking.check_out.damage_notes && (
                                  <div className="mt-2 pt-2 border-t">
                                    <span className="text-gray-600">손상 메모:</span>
                                    <p className="text-gray-800 mt-1">{booking.check_out.damage_notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 보증금 정산 정보 */}
                          {booking.deposit_settlement && (
                            <div className="mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="h-4 w-4 text-purple-600" />
                                <span className="text-sm font-medium text-purple-900">보증금 정산</span>
                              </div>
                              <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">보증금:</span>
                                  <span className="font-medium">₩{booking.deposit_settlement.deposit_amount.toLocaleString()}</span>
                                </div>
                                {booking.deposit_settlement.captured_amount && booking.deposit_settlement.captured_amount > 0 && (
                                  <div className="flex justify-between text-red-600">
                                    <span>차감:</span>
                                    <span className="font-medium">₩{booking.deposit_settlement.captured_amount.toLocaleString()}</span>
                                  </div>
                                )}
                                {booking.deposit_settlement.refunded_amount && booking.deposit_settlement.refunded_amount > 0 && (
                                  <div className="flex justify-between text-green-600">
                                    <span>환불:</span>
                                    <span className="font-medium">₩{booking.deposit_settlement.refunded_amount.toLocaleString()}</span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-gray-600">상태:</span>
                                  <span className="font-medium">{booking.deposit_settlement.status}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 취소 정책 정보 */}
                          {canCancel && (
                            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 mb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="h-4 w-4 text-orange-600" />
                                <span className="text-sm font-medium">취소 시 환불 금액</span>
                              </div>
                              <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">환불률:</span>
                                  <span className="font-medium">{refundInfo.refundRate}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">환불 금액:</span>
                                  <span className="font-medium text-green-600">
                                    ₩{refundInfo.refundAmount.toLocaleString()}
                                  </span>
                                </div>
                                {refundInfo.cancellationFee > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">취소 수수료:</span>
                                    <span className="font-medium text-red-600">
                                      ₩{refundInfo.cancellationFee.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                <p className="text-xs text-gray-500 mt-2 pt-2 border-t">
                                  인수 {refundInfo.hoursUntilPickup}시간 전
                                </p>
                              </div>
                            </div>
                          )}

                          {/* 액션 버튼 */}
                          <div className="flex gap-2">
                            {showVoucherBtn && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => showVoucher(booking)}
                              >
                                <QrCode className="h-4 w-4 mr-2" />
                                바우처 확인
                              </Button>
                            )}
                            {canCancel && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelBooking(booking)}
                                disabled={cancellingBookingId === booking.id}
                                className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                              >
                                {cancellingBookingId === booking.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    취소 중...
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    예약 취소
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 취소 확인 다이얼로그 */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>예약 취소</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold mb-2">{selectedBooking.vehicle?.display_name}</p>
                <p className="text-sm text-gray-600">예약 번호: {selectedBooking.booking_number}</p>
              </div>

              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h4 className="font-medium mb-2">환불 정보</h4>
                {(() => {
                  const refund = calculateRefund(selectedBooking);
                  return (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>환불률:</span>
                        <span className="font-medium">{refund.refundRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>환불 금액:</span>
                        <span className="font-semibold text-green-600">
                          ₩{refund.refundAmount.toLocaleString()}
                        </span>
                      </div>
                      {refund.cancellationFee > 0 && (
                        <div className="flex justify-between">
                          <span>취소 수수료:</span>
                          <span className="font-semibold text-red-600">
                            ₩{refund.cancellationFee.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">취소 사유 (선택)</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="취소 사유를 입력해주세요"
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ 취소 후에는 복구할 수 없으며, 환불은 영업일 기준 3-5일 소요됩니다.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false);
                setSelectedBooking(null);
                setCancelReason('');
              }}
            >
              닫기
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={!!cancellingBookingId}
            >
              {cancellingBookingId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  취소 처리 중...
                </>
              ) : (
                '예약 취소하기'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR 코드 모달 */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              바우처 QR 코드
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
              <canvas ref={qrCanvasRef} />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">바우처 코드</p>
              <p className="font-mono font-semibold text-lg">{qrVoucherCode}</p>
            </div>
            <div className="w-full p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800 text-center">
                현장에서 이 QR 코드를 제시하여 차량을 인수하세요
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQRDialog(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

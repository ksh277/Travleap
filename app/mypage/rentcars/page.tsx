'use client';

/**
 * 마이페이지 - 렌트카 예약 내역
 * - 예약 내역 조회 (현재/과거/취소)
 * - 예약 상세 정보
 * - 예약 취소
 * - 리뷰 작성
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar,
  MapPin,
  Car,
  CreditCard,
  FileText,
  Star,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';

interface RentcarBooking {
  id: number;
  bookingNumber: string;
  status: 'pending' | 'confirmed' | 'picked_up' | 'in_use' | 'returned' | 'completed' | 'cancelled' | 'no_show';
  vehicle: {
    model: string;
    make: string;
    image: string;
    seats: number;
    transmission: string;
  };
  dates: {
    pickup: string;
    dropoff: string;
  };
  location: {
    pickup: string;
    dropoff: string;
  };
  price: {
    total: number;
    currency: string;
  };
  vendor: {
    name: string;
    phone: string;
  };
  canCancel: boolean;
  canReview: boolean;
  hasReview: boolean;
}

export default function MyRentcarsPage() {
  const [bookings, setBookings] = useState<RentcarBooking[]>([]);
  const [activeTab, setActiveTab] = useState<'current' | 'past' | 'cancelled'>('current');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<RentcarBooking | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      // TODO: API 호출
      // const response = await fetch('/api/rentcar/my-bookings');
      // const data = await response.json();

      // Mock data
      await new Promise(resolve => setTimeout(resolve, 800));
      setBookings(generateMockBookings());
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;

    setIsSubmitting(true);
    try {
      // TODO: API 호출
      // await fetch(`/api/rentcar/bookings/${selectedBooking.id}/cancel`, {
      //   method: 'POST'
      // });

      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('예약이 취소되었습니다.');
      setIsCancelDialogOpen(false);
      loadBookings();
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      alert('취소 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedBooking) return;

    if (reviewText.length < 10) {
      alert('리뷰는 최소 10자 이상 작성해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: API 호출
      // await fetch('/api/rentcar/reviews', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     bookingId: selectedBooking.id,
      //     rating: reviewRating,
      //     text: reviewText
      //   })
      // });

      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('리뷰가 등록되었습니다.');
      setIsReviewDialogOpen(false);
      setReviewText('');
      setReviewRating(5);
      loadBookings();
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('리뷰 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: RentcarBooking['status']) => {
    const statusConfig = {
      pending: { label: '대기중', variant: 'secondary' as const, icon: Clock },
      confirmed: { label: '예약확정', variant: 'default' as const, icon: CheckCircle2 },
      picked_up: { label: '픽업완료', variant: 'default' as const, icon: Car },
      in_use: { label: '사용중', variant: 'default' as const, icon: Car },
      returned: { label: '반납완료', variant: 'default' as const, icon: CheckCircle2 },
      completed: { label: '이용완료', variant: 'default' as const, icon: CheckCircle2 },
      cancelled: { label: '취소됨', variant: 'destructive' as const, icon: XCircle },
      no_show: { label: '노쇼', variant: 'destructive' as const, icon: AlertCircle },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const filterBookings = (type: typeof activeTab) => {
    const now = new Date();
    return bookings.filter((booking) => {
      const pickupDate = new Date(booking.dates.pickup);

      if (type === 'current') {
        return ['pending', 'confirmed', 'picked_up', 'in_use'].includes(booking.status);
      } else if (type === 'past') {
        return ['returned', 'completed'].includes(booking.status);
      } else {
        return ['cancelled', 'no_show'].includes(booking.status);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-2xl font-bold mb-6">렌트카 예약 내역</h1>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="current">
              현재 예약 ({filterBookings('current').length})
            </TabsTrigger>
            <TabsTrigger value="past">
              과거 예약 ({filterBookings('past').length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              취소 내역 ({filterBookings('cancelled').length})
            </TabsTrigger>
          </TabsList>

          {(['current', 'past', 'cancelled'] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-6 space-y-4">
              {filterBookings(tab).length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Car className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">예약 내역이 없습니다.</p>
                  </CardContent>
                </Card>
              ) : (
                filterBookings(tab).map((booking) => (
                  <Card key={booking.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
                        {/* 좌측: 차량 이미지 */}
                        <div className="md:col-span-1">
                          <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                            <ImageWithFallback
                              src={booking.vehicle.image}
                              alt={booking.vehicle.model}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>

                        {/* 중앙: 예약 정보 */}
                        <div className="md:col-span-2 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {booking.vehicle.model}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {booking.vehicle.make} • {booking.vehicle.seats}인승 •{' '}
                                {booking.vehicle.transmission === 'Automatic' ? '자동' : '수동'}
                              </p>
                            </div>
                            {getStatusBadge(booking.status)}
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-2">
                              <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
                              <div>
                                <div>
                                  픽업: {new Date(booking.dates.pickup).toLocaleString('ko-KR')}
                                </div>
                                <div>
                                  반납: {new Date(booking.dates.dropoff).toLocaleString('ko-KR')}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                              <div>
                                <div>{booking.location.pickup}</div>
                                {booking.location.dropoff !== booking.location.pickup && (
                                  <div>→ {booking.location.dropoff}</div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span className="font-mono text-xs">
                                {booking.bookingNumber}
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 border-t">
                            <div className="text-sm text-gray-600">
                              {booking.vendor.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {booking.vendor.phone}
                            </div>
                          </div>
                        </div>

                        {/* 우측: 가격 & 액션 */}
                        <div className="md:col-span-1 flex flex-col justify-between">
                          <div>
                            <div className="text-sm text-gray-600">총 금액</div>
                            <div className="text-xl font-bold text-blue-600">
                              ₩{booking.price.total.toLocaleString()}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Button variant="outline" size="sm" className="w-full">
                              <FileText className="h-4 w-4 mr-2" />
                              예약 상세
                            </Button>

                            {booking.canCancel && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-red-600 hover:text-red-700"
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setIsCancelDialogOpen(true);
                                }}
                              >
                                <X className="h-4 w-4 mr-2" />
                                예약 취소
                              </Button>
                            )}

                            {booking.canReview && !booking.hasReview && (
                              <Button
                                variant="default"
                                size="sm"
                                className="w-full"
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setIsReviewDialogOpen(true);
                                }}
                              >
                                <Star className="h-4 w-4 mr-2" />
                                리뷰 작성
                              </Button>
                            )}

                            {booking.hasReview && (
                              <Button variant="outline" size="sm" className="w-full" disabled>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                리뷰 작성완료
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* 예약 취소 다이얼로그 */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>예약을 취소하시겠습니까?</DialogTitle>
            <DialogDescription>
              예약번호: {selectedBooking?.bookingNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              취소 정책에 따라 취소 수수료가 발생할 수 있습니다.
            </div>

            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">총 결제 금액</span>
                <span className="font-semibold">
                  ₩{selectedBooking?.price.total.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">취소 수수료</span>
                <span className="font-semibold text-red-600">-₩10,000</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">환불 예정 금액</span>
                <span className="font-bold text-blue-600">
                  ₩{((selectedBooking?.price.total || 0) - 10000).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCancelDialogOpen(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelBooking}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                '예약 취소'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 리뷰 작성 다이얼로그 */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>리뷰 작성</DialogTitle>
            <DialogDescription>
              {selectedBooking?.vehicle.make} {selectedBooking?.vehicle.model}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 별점 선택 */}
            <div>
              <Label>별점</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="transition-colors"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= reviewRating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* 리뷰 내용 */}
            <div>
              <Label>리뷰 내용</Label>
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="차량 상태, 서비스, 전반적인 경험에 대해 자세히 작성해주세요. (최소 10자)"
                rows={5}
                className="mt-2"
              />
              <div className="text-xs text-gray-500 mt-1">
                {reviewText.length} / 500자
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReviewDialogOpen(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button onClick={handleSubmitReview} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  등록 중...
                </>
              ) : (
                '리뷰 등록'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Label({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className="text-sm font-medium" {...props}>
      {children}
    </label>
  );
}

// Mock 데이터 생성
function generateMockBookings(): RentcarBooking[] {
  const now = new Date();
  const statuses: RentcarBooking['status'][] = [
    'confirmed',
    'picked_up',
    'completed',
    'cancelled',
  ];

  return [
    {
      id: 1,
      bookingNumber: 'RC20240112001',
      status: 'confirmed',
      vehicle: {
        model: '아반떼',
        make: '현대',
        image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2',
        seats: 5,
        transmission: 'Automatic',
      },
      dates: {
        pickup: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        dropoff: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      location: {
        pickup: '인천국제공항',
        dropoff: '인천국제공항',
      },
      price: {
        total: 180000,
        currency: 'KRW',
      },
      vendor: {
        name: '프리미엄 렌트카',
        phone: '1588-1234',
      },
      canCancel: true,
      canReview: false,
      hasReview: false,
    },
    {
      id: 2,
      bookingNumber: 'RC20240105002',
      status: 'completed',
      vehicle: {
        model: 'K5',
        make: '기아',
        image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888',
        seats: 5,
        transmission: 'Automatic',
      },
      dates: {
        pickup: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        dropoff: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      location: {
        pickup: '제주국제공항',
        dropoff: '제주국제공항',
      },
      price: {
        total: 240000,
        currency: 'KRW',
      },
      vendor: {
        name: '제주 렌트카',
        phone: '064-123-4567',
      },
      canCancel: false,
      canReview: true,
      hasReview: false,
    },
    {
      id: 3,
      bookingNumber: 'RC20231220003',
      status: 'cancelled',
      vehicle: {
        model: '쏘나타',
        make: '현대',
        image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb',
        seats: 5,
        transmission: 'Automatic',
      },
      dates: {
        pickup: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        dropoff: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      },
      location: {
        pickup: '김포국제공항',
        dropoff: '김포국제공항',
      },
      price: {
        total: 120000,
        currency: 'KRW',
      },
      vendor: {
        name: '서울 렌트카',
        phone: '02-1234-5678',
      },
      canCancel: false,
      canReview: false,
      hasReview: false,
    },
  ];
}

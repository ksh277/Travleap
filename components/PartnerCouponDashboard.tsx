/**
 * 파트너(가맹점) 쿠폰 대시보드
 * /partner/coupon
 *
 * 파트너 통계 대시보드
 * - 쿠폰 사용 내역/정산
 * - 예약 현황
 * - 쿠폰북 통계
 */

import { useState, useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  Loader2,
  AlertCircle,
  History,
  RefreshCw,
  CalendarDays,
  Phone,
  Users,
  Clock,
  BookOpen,
  Star,
  TrendingUp,
  Ticket
} from 'lucide-react';
import { Badge } from './ui/badge';
import { useAuth } from '../hooks/useAuth';

type TabType = 'history' | 'reservations' | 'coupon-book';

interface UsageRecord {
  id: number;
  coupon_code: string;
  customer_name: string;
  order_amount: number;
  discount_amount: number;
  final_amount: number;
  used_at: string;
  coupon_type?: 'campaign' | 'integrated';
}

interface Reservation {
  id: number;
  user_id: number;
  listing_id: number;
  listing_title: string;
  check_in_date: string;
  check_out_date: string;
  guests: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  special_requests?: string;
  contact_phone?: string;
  contact_email?: string;
  customer_name: string;
  customer_email?: string;
  created_at: string;
}

export function PartnerCouponDashboard() {
  const location = useLocation();
  const { user, isLoggedIn, sessionRestored, canUseCouponScanner } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('history');

  // 현재 URL을 returnUrl로 사용
  const currentUrl = location.pathname;

  // 세션 복원 중
  if (!sessionRestored) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">세션을 확인하는 중...</p>
        </div>
      </div>
    );
  }

  // 로그인 안됨 → 로그인 페이지로 (현재 URL 유지)
  if (!isLoggedIn) {
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(currentUrl)}`} replace />;
  }

  // 로그인은 됐지만 파트너가 아님
  if (!canUseCouponScanner()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">접근 권한 없음</h2>
          <p className="text-gray-600 mb-6">
            이 페이지는 승인된 파트너(가맹점)만 접근할 수 있습니다.
          </p>
          <p className="text-sm text-gray-500">
            파트너 등록이 필요하시면 관리자에게 문의하세요.
          </p>
        </div>
      </div>
    );
  }

  // 사용 내역 상태
  const [usageHistory, setUsageHistory] = useState<UsageRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyPeriod, setHistoryPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [historyStats, setHistoryStats] = useState({
    totalCount: 0,
    totalDiscount: 0,
    totalOrder: 0,
    avgDiscount: 0,
    avgOrder: 0,
    allTime: { count: 0, discount: 0, order: 0 },
    today: { count: 0, discount: 0 },
    week: { count: 0, discount: 0 },
    month: { count: 0, discount: 0 }
  });

  // 예약 상태
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [reservationStats, setReservationStats] = useState({
    total_count: 0,
    pending_count: 0,
    confirmed_count: 0,
    cancelled_count: 0,
    total_revenue: 0
  });
  const [reservationFilter, setReservationFilter] = useState<string>('all');

  // 쿠폰북 통계 상태
  const [couponBookStats, setCouponBookStats] = useState<{
    isParticipating: boolean;
    partner: { id: number; name: string; discountText: string } | null;
    stats: { totalIssued: number; totalUsed: number; totalActive: number; totalExpired: number; usageRate: number };
    reviews: { count: number; avgRating: number; totalPointsAwarded: number };
    periods: { today: number; week: number; month: number };
    recentUsage: { id: number; coupon_code: string; used_at: string; rating?: number; comment?: string }[];
  } | null>(null);
  const [loadingCouponBookStats, setLoadingCouponBookStats] = useState(false);

  // 사용 내역 조회
  const loadUsageHistory = async (period: string = historyPeriod) => {
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/partner/coupon-history?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsageHistory(data.data || []);
        setHistoryStats({
          totalCount: data.totalCount || 0,
          totalDiscount: data.totalDiscount || 0,
          totalOrder: data.totalOrder || 0,
          avgDiscount: data.avgDiscount || 0,
          avgOrder: data.avgOrder || 0,
          allTime: data.allTime || { count: 0, discount: 0, order: 0 },
          today: data.today || { count: 0, discount: 0 },
          week: data.week || { count: 0, discount: 0 },
          month: data.month || { count: 0, discount: 0 }
        });
      }
    } catch (error) {
      console.error('사용 내역 조회 실패:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 예약 목록 조회
  const loadReservations = async () => {
    setLoadingReservations(true);
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      if (reservationFilter !== 'all') {
        params.append('status', reservationFilter);
      }

      const response = await fetch(`/api/partner/reservations?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReservations(data.data || []);
        setReservationStats(data.stats || {
          total_count: 0,
          pending_count: 0,
          confirmed_count: 0,
          cancelled_count: 0,
          total_revenue: 0
        });
      }
    } catch (error) {
      console.error('예약 조회 실패:', error);
    } finally {
      setLoadingReservations(false);
    }
  };

  // 쿠폰북 통계 조회
  const loadCouponBookStats = async () => {
    setLoadingCouponBookStats(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/partner/coupon-book-stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCouponBookStats(data.data);
        }
      }
    } catch (error) {
      console.error('쿠폰북 통계 조회 실패:', error);
    } finally {
      setLoadingCouponBookStats(false);
    }
  };

  // 탭 변경 시 데이터 로드
  useEffect(() => {
    if (activeTab === 'history') {
      loadUsageHistory();
    } else if (activeTab === 'reservations') {
      loadReservations();
    } else if (activeTab === 'coupon-book') {
      loadCouponBookStats();
    }
  }, [activeTab]);

  // 예약 필터 변경 시 재조회
  useEffect(() => {
    if (activeTab === 'reservations') {
      loadReservations();
    }
  }, [reservationFilter]);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* 헤더 */}
      <div className="bg-purple-600 text-white py-6 px-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold">파트너 대시보드</h1>
          <p className="text-purple-200 text-sm mt-1">{user?.businessName || '가맹점'}</p>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="max-w-lg mx-auto px-4">
        <div className="flex bg-white rounded-lg shadow mt-4 overflow-hidden">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <History className="h-4 w-4" />
            내역
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              activeTab === 'reservations'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            예약
          </button>
          <button
            onClick={() => setActiveTab('coupon-book')}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              activeTab === 'coupon-book'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            쿠폰북
          </button>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="max-w-lg mx-auto px-4 mt-4">
        {/* 사용 내역 탭 */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* 기간별 간편 통계 */}
            <div className="grid grid-cols-3 gap-2">
              <Card
                className={`cursor-pointer transition-all ${historyPeriod === 'today' ? 'ring-2 ring-purple-500 bg-purple-50' : ''}`}
                onClick={() => { setHistoryPeriod('today'); loadUsageHistory('today'); }}
              >
                <CardContent className="py-3 text-center">
                  <p className="text-gray-500 text-xs">오늘</p>
                  <p className="text-lg font-bold text-purple-600">{historyStats.today.count}건</p>
                  <p className="text-xs text-gray-400">{historyStats.today.discount.toLocaleString()}원</p>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all ${historyPeriod === 'week' ? 'ring-2 ring-purple-500 bg-purple-50' : ''}`}
                onClick={() => { setHistoryPeriod('week'); loadUsageHistory('week'); }}
              >
                <CardContent className="py-3 text-center">
                  <p className="text-gray-500 text-xs">이번 주</p>
                  <p className="text-lg font-bold text-purple-600">{historyStats.week.count}건</p>
                  <p className="text-xs text-gray-400">{historyStats.week.discount.toLocaleString()}원</p>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all ${historyPeriod === 'month' ? 'ring-2 ring-purple-500 bg-purple-50' : ''}`}
                onClick={() => { setHistoryPeriod('month'); loadUsageHistory('month'); }}
              >
                <CardContent className="py-3 text-center">
                  <p className="text-gray-500 text-xs">이번 달</p>
                  <p className="text-lg font-bold text-purple-600">{historyStats.month.count}건</p>
                  <p className="text-xs text-gray-400">{historyStats.month.discount.toLocaleString()}원</p>
                </CardContent>
              </Card>
            </div>

            {/* 전체 통계 요약 */}
            <Card className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold">전체 누적 통계</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setHistoryPeriod('all'); loadUsageHistory('all'); }}
                    className={`text-white hover:bg-white/20 ${historyPeriod === 'all' ? 'bg-white/20' : ''}`}
                  >
                    전체보기
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-white/70 text-xs">총 사용 건수</p>
                    <p className="text-xl font-bold">{historyStats.allTime.count}건</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-xs">총 할인 제공</p>
                    <p className="text-xl font-bold">{historyStats.allTime.discount.toLocaleString()}원</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-xs">총 주문 금액</p>
                    <p className="text-xl font-bold">{historyStats.allTime.order.toLocaleString()}원</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 선택 기간 상세 통계 */}
            {historyPeriod !== 'all' && (
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="py-4 text-center">
                    <p className="text-gray-500 text-sm">평균 주문 금액</p>
                    <p className="text-xl font-bold text-blue-600">{historyStats.avgOrder.toLocaleString()}원</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-center">
                    <p className="text-gray-500 text-sm">평균 할인 금액</p>
                    <p className="text-xl font-bold text-green-600">{historyStats.avgDiscount.toLocaleString()}원</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 사용 내역 리스트 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  사용 내역
                  {historyPeriod !== 'all' && (
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({historyPeriod === 'today' ? '오늘' : historyPeriod === 'week' ? '이번 주' : '이번 달'})
                    </span>
                  )}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => loadUsageHistory(historyPeriod)}>
                  <RefreshCw className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                </Button>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
                  </div>
                ) : usageHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    아직 쿠폰 사용 내역이 없습니다
                  </div>
                ) : (
                  <div className="space-y-3">
                    {usageHistory.map((record) => (
                      <div key={record.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{record.customer_name}</p>
                            <p className="text-sm text-gray-500">{record.coupon_code}</p>
                          </div>
                          <p className="text-sm text-gray-500">
                            {new Date(record.used_at).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                        <div className="text-sm space-y-1 pt-2 border-t border-gray-200">
                          <div className="flex justify-between">
                            <span className="text-gray-500">주문금액</span>
                            <span>{record.order_amount?.toLocaleString() || 0}원</span>
                          </div>
                          <div className="flex justify-between text-purple-600">
                            <span>할인</span>
                            <span>-{record.discount_amount?.toLocaleString() || 0}원</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>최종결제</span>
                            <span>{record.final_amount?.toLocaleString() || 0}원</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 예약 탭 */}
        {activeTab === 'reservations' && (
          <div className="space-y-4">
            {/* 예약 통계 카드 */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-gray-500 text-sm">대기중</p>
                  <p className="text-2xl font-bold text-yellow-600">{reservationStats.pending_count}건</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <p className="text-gray-500 text-sm">확정</p>
                  <p className="text-2xl font-bold text-green-600">{reservationStats.confirmed_count}건</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-gray-500 text-sm">총 매출</p>
                <p className="text-2xl font-bold text-purple-600">{reservationStats.total_revenue.toLocaleString()}원</p>
              </CardContent>
            </Card>

            {/* 필터 버튼 */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { value: 'all', label: '전체' },
                { value: 'pending', label: '대기중' },
                { value: 'confirmed', label: '확정' },
                { value: 'cancelled', label: '취소' },
              ].map(({ value, label }) => (
                <Button
                  key={value}
                  variant={reservationFilter === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReservationFilter(value)}
                  className={reservationFilter === value ? 'bg-purple-600 hover:bg-purple-700' : ''}
                >
                  {label}
                </Button>
              ))}
            </div>

            {/* 예약 리스트 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">예약 목록</CardTitle>
                <Button variant="ghost" size="sm" onClick={loadReservations}>
                  <RefreshCw className={`h-4 w-4 ${loadingReservations ? 'animate-spin' : ''}`} />
                </Button>
              </CardHeader>
              <CardContent>
                {loadingReservations ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
                  </div>
                ) : reservations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarDays className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p>예약이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reservations.map((reservation) => (
                      <div key={reservation.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{reservation.customer_name}</p>
                            <p className="text-sm text-gray-500 line-clamp-1">{reservation.listing_title || '상품'}</p>
                          </div>
                          <Badge
                            className={
                              reservation.status === 'confirmed' ? 'bg-green-500' :
                              reservation.status === 'pending' ? 'bg-yellow-500' :
                              reservation.status === 'cancelled' ? 'bg-red-500' :
                              'bg-gray-500'
                            }
                          >
                            {reservation.status === 'confirmed' ? '확정' :
                             reservation.status === 'pending' ? '대기' :
                             reservation.status === 'cancelled' ? '취소' :
                             reservation.status === 'completed' ? '완료' : reservation.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(reservation.check_in_date).toLocaleDateString('ko-KR')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {reservation.guests}명
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-sm">
                            {reservation.contact_phone && (
                              <a href={`tel:${reservation.contact_phone}`} className="flex items-center gap-1 text-blue-600">
                                <Phone className="h-3 w-3" />
                                {reservation.contact_phone}
                              </a>
                            )}
                          </div>
                          <p className="font-bold text-purple-600">{reservation.total_price?.toLocaleString()}원</p>
                        </div>

                        {reservation.special_requests && (
                          <div className="mt-2 p-2 bg-yellow-50 rounded text-sm text-yellow-700">
                            요청: {reservation.special_requests}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 쿠폰북 통계 탭 */}
        {activeTab === 'coupon-book' && (
          <div className="space-y-4">
            {loadingCouponBookStats ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
                <p className="text-gray-500 mt-2">쿠폰북 통계 불러오는 중...</p>
              </div>
            ) : !couponBookStats?.isParticipating ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">쿠폰북 미참여</h2>
                  <p className="text-gray-600">
                    쿠폰북에 참여하지 않은 가맹점입니다.
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    참여를 원하시면 관리자에게 문의하세요.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* 가맹점 정보 */}
                <Card className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Ticket className="h-6 w-6" />
                      <div>
                        <h3 className="font-bold">{couponBookStats.partner?.name}</h3>
                        <p className="text-white/80 text-sm">{couponBookStats.partner?.discountText}</p>
                      </div>
                    </div>
                    <Badge className="bg-white/20 text-white">쿠폰북 참여 가맹점</Badge>
                  </CardContent>
                </Card>

                {/* 기간별 사용 현황 */}
                <div className="grid grid-cols-3 gap-2">
                  <Card>
                    <CardContent className="py-3 text-center">
                      <p className="text-gray-500 text-xs">오늘</p>
                      <p className="text-lg font-bold text-purple-600">{couponBookStats.periods.today}건</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-3 text-center">
                      <p className="text-gray-500 text-xs">이번 주</p>
                      <p className="text-lg font-bold text-purple-600">{couponBookStats.periods.week}건</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-3 text-center">
                      <p className="text-gray-500 text-xs">이번 달</p>
                      <p className="text-lg font-bold text-purple-600">{couponBookStats.periods.month}건</p>
                    </CardContent>
                  </Card>
                </div>

                {/* 전체 통계 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <TrendingUp className="h-5 w-5" />
                      쿠폰 사용 통계
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-500 text-sm">총 사용</p>
                        <p className="text-2xl font-bold text-green-600">{couponBookStats.stats.totalUsed}건</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-500 text-sm">사용률</p>
                        <p className="text-2xl font-bold text-blue-600">{couponBookStats.stats.usageRate}%</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2 text-center text-sm">
                      <div>
                        <p className="text-gray-500">발급</p>
                        <p className="font-bold">{couponBookStats.stats.totalIssued}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">미사용</p>
                        <p className="font-bold text-yellow-600">{couponBookStats.stats.totalActive}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">만료</p>
                        <p className="font-bold text-gray-400">{couponBookStats.stats.totalExpired}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 리뷰 통계 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Star className="h-5 w-5 text-yellow-500" />
                      리뷰 현황
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">총 리뷰 수</p>
                        <p className="text-2xl font-bold">{couponBookStats.reviews.count}건</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">평균 평점</p>
                        <div className="flex items-center gap-1">
                          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                          <span className="text-2xl font-bold">{couponBookStats.reviews.avgRating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 최근 사용 내역 */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">최근 사용 내역</CardTitle>
                    <Button variant="ghost" size="sm" onClick={loadCouponBookStats}>
                      <RefreshCw className={`h-4 w-4 ${loadingCouponBookStats ? 'animate-spin' : ''}`} />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {couponBookStats.recentUsage.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Ticket className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                        <p>아직 사용 내역이 없습니다</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {couponBookStats.recentUsage.map((usage) => (
                          <div key={usage.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-mono text-sm">{usage.coupon_code}</p>
                                <p className="text-sm text-gray-500">
                                  {new Date(usage.used_at).toLocaleDateString('ko-KR')}
                                </p>
                              </div>
                              {usage.rating && (
                                <div className="flex items-center gap-1 text-yellow-500">
                                  <Star className="h-4 w-4 fill-yellow-500" />
                                  <span className="font-medium">{usage.rating}</span>
                                </div>
                              )}
                            </div>
                            {usage.comment && (
                              <p className="mt-2 text-sm text-gray-600 line-clamp-2">"{usage.comment}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PartnerCouponDashboard;

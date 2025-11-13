import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  DollarSign,
  Download,
  RefreshCw,
  Eye,
  X,
  Building2,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface Settlement {
  partner_id: number;
  business_name: string;
  partner_type: 'rentcar' | 'lodging';
  email: string;
  total_orders: number;
  total_sales: number;
  total_refunded: number;
  net_sales: number;
  commission_rate: number;
  commission_amount: number;
  settlement_amount: number;
  first_order_date: string;
  last_order_date: string;
  status: 'pending' | 'completed';
}

interface SettlementStats {
  total_partners: number;
  total_orders: number;
  total_sales: number;
  total_refunded: number;
  total_net_sales: number;
  total_commission: number;
  total_settlement: number;
}

interface PeriodStats {
  total_orders: number;
  total_sales: number;
  total_refunded: number;
  net_sales: number;
  commission_rate: number;
  commission_amount: number;
  settlement_amount: number;
}

export function AdminSettlements() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [stats, setStats] = useState<SettlementStats>({
    total_partners: 0,
    total_orders: 0,
    total_sales: 0,
    total_refunded: 0,
    total_net_sales: 0,
    total_commission: 0,
    total_settlement: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'rentcar' | 'lodging'>('all');
  const [periodStats, setPeriodStats] = useState<{
    today: PeriodStats | null;
    this_week: PeriodStats | null;
    this_month: PeriodStats | null;
    total: PeriodStats | null;
  }>({
    today: null,
    this_week: null,
    this_month: null,
    total: null
  });
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'this_week' | 'this_month' | 'total'>('total');
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  // 정산 데이터 로드
  const loadSettlements = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(`/api/admin/settlements?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setSettlements(data.data || []);
        setStats(data.stats || {
          total_partners: 0,
          total_orders: 0,
          total_sales: 0,
          total_refunded: 0,
          total_net_sales: 0,
          total_commission: 0,
          total_settlement: 0
        });
        toast.success(`${data.data?.length || 0}개 업체 정산 내역 로드 완료`);
      } else {
        toast.error('정산 내역 로드 실패');
      }
    } catch (error) {
      console.error('정산 내역 로드 오류:', error);
      toast.error('정산 내역을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettlements();
  }, []);

  // 상세 정보 로드
  useEffect(() => {
    if (selectedSettlement) {
      loadPeriodStats();
      loadBookings();
    }
  }, [selectedSettlement]);

  // 기간 변경 시 예약 목록 다시 로드
  useEffect(() => {
    if (selectedSettlement) {
      loadBookings();
    }
  }, [selectedPeriod]);

  const loadPeriodStats = async () => {
    if (!selectedSettlement) return;

    try {
      setIsLoadingDetail(true);

      const response = await fetch(
        `/api/admin/settlements/detail?partner_id=${selectedSettlement.partner_id}&partner_type=${selectedSettlement.partner_type}`
      );
      const data = await response.json();

      if (data.success) {
        setPeriodStats(data.data.period_stats);
        toast.success('기간별 매출 로드 완료');
      } else {
        toast.error('기간별 매출 로드 실패');
      }
    } catch (error) {
      console.error('기간별 매출 로드 오류:', error);
      toast.error('기간별 매출을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // 예약 목록 로드
  const loadBookings = async () => {
    if (!selectedSettlement) return;

    try {
      setIsLoadingBookings(true);

      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
      if (!token) {
        toast.error('인증 토큰이 없습니다.');
        return;
      }

      const response = await fetch(
        `/api/admin/settlements/bookings?partner_id=${selectedSettlement.partner_id}&partner_type=${selectedSettlement.partner_type}&period=${selectedPeriod}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const data = await response.json();

      if (data.success) {
        setBookings(data.data || []);
        console.log(`✅ 예약 목록 로드: ${data.data?.length || 0}건`);
      } else {
        toast.error('예약 목록 로드 실패');
        setBookings([]);
      }
    } catch (error) {
      console.error('예약 목록 로드 오류:', error);
      toast.error('예약 목록을 불러오는 중 오류가 발생했습니다.');
      setBookings([]);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  // 필터링된 정산 데이터
  const filteredSettlements = settlements.filter(s => {
    if (filterType === 'all') return true;
    return s.partner_type === filterType;
  });

  // CSV 다운로드
  const downloadCSV = () => {
    if (filteredSettlements.length === 0) {
      toast.error('다운로드할 데이터가 없습니다.');
      return;
    }

    const headers = [
      '업체명',
      '업체유형',
      '이메일',
      '총주문수',
      '총매출',
      '환불금액',
      '순매출',
      '수수료율',
      '수수료',
      '정산금액',
      '첫주문일',
      '마지막주문일'
    ];

    const rows = filteredSettlements.map(s => [
      s.business_name,
      s.partner_type === 'rentcar' ? '렌트카' : '숙박',
      s.email,
      s.total_orders,
      s.total_sales,
      s.total_refunded,
      s.net_sales,
      `${s.commission_rate}%`,
      s.commission_amount,
      s.settlement_amount,
      s.first_order_date ? new Date(s.first_order_date).toLocaleDateString('ko-KR') : '-',
      s.last_order_date ? new Date(s.last_order_date).toLocaleDateString('ko-KR') : '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `settlements_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('CSV 파일 다운로드 완료');
  };

  // 파트너 타입 뱃지
  const getPartnerTypeBadge = (type: string) => {
    if (type === 'rentcar') {
      return <Badge className="bg-blue-500">렌트카</Badge>;
    } else if (type === 'lodging') {
      return <Badge className="bg-purple-500">숙박</Badge>;
    }
    return <Badge variant="outline">기타</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            정산 관리
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            렌트카 벤더 및 숙박 파트너별 정산 내역
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            CSV 다운로드
          </Button>
          <Button onClick={loadSettlements}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* 날짜 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <Button onClick={loadSettlements}>
              <Calendar className="h-4 w-4 mr-2" />
              조회
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                loadSettlements();
              }}
            >
              초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 업체 유형 필터 */}
      <div className="flex gap-2">
        <Button
          onClick={() => setFilterType('all')}
          variant={filterType === 'all' ? 'default' : 'outline'}
        >
          전체 ({settlements.length})
        </Button>
        <Button
          onClick={() => setFilterType('rentcar')}
          variant={filterType === 'rentcar' ? 'default' : 'outline'}
        >
          렌트카 ({settlements.filter(s => s.partner_type === 'rentcar').length})
        </Button>
        <Button
          onClick={() => setFilterType('lodging')}
          variant={filterType === 'lodging' ? 'default' : 'outline'}
        >
          숙박 ({settlements.filter(s => s.partner_type === 'lodging').length})
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">등록 업체</p>
                <p className="text-2xl font-bold">{stats.total_partners}개</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">총 주문 건수</p>
                <p className="text-2xl font-bold">{stats.total_orders}건</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-500">총 매출액</p>
              <p className="text-2xl font-bold">₩{stats.total_sales.toLocaleString()}</p>
              {stats.total_refunded > 0 && (
                <p className="text-xs text-red-500 mt-1">
                  환불: -₩{stats.total_refunded.toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-500">총 정산 금액</p>
              <p className="text-2xl font-bold text-green-600">₩{stats.total_settlement.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                수수료: ₩{stats.total_commission.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 정산 내역 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>업체별 정산 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">업체명</th>
                  <th className="text-left p-3">유형</th>
                  <th className="text-right p-3">주문수</th>
                  <th className="text-right p-3">총 매출</th>
                  <th className="text-right p-3">환불</th>
                  <th className="text-right p-3">순 매출</th>
                  <th className="text-right p-3">수수료</th>
                  <th className="text-right p-3">정산 금액</th>
                  <th className="text-center p-3">작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredSettlements.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-500">
                      정산 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredSettlements.map((settlement) => (
                    <tr key={settlement.partner_id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{settlement.business_name}</p>
                          <a
                            href={`mailto:${settlement.email}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {settlement.email}
                          </a>
                        </div>
                      </td>
                      <td className="p-3">
                        {getPartnerTypeBadge(settlement.partner_type)}
                      </td>
                      <td className="text-right p-3">
                        <span className="font-medium">{settlement.total_orders}건</span>
                      </td>
                      <td className="text-right p-3">
                        ₩{settlement.total_sales.toLocaleString()}
                      </td>
                      <td className="text-right p-3 text-red-600">
                        {settlement.total_refunded > 0 ? `-₩${settlement.total_refunded.toLocaleString()}` : '-'}
                      </td>
                      <td className="text-right p-3 font-medium">
                        ₩{settlement.net_sales.toLocaleString()}
                      </td>
                      <td className="text-right p-3 text-gray-600">
                        <div>
                          <p>-₩{settlement.commission_amount.toLocaleString()}</p>
                          <p className="text-xs">({settlement.commission_rate}%)</p>
                        </div>
                      </td>
                      <td className="text-right p-3">
                        <span className="text-lg font-bold text-green-600">
                          ₩{settlement.settlement_amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="text-center p-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSettlement(settlement)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          상세
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 상세보기 모달 */}
      {selectedSettlement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {selectedSettlement.business_name}
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">정산 상세 정보 - 기간별 매출</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSettlement(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 업체 정보 */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">업체 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">업체 ID</p>
                    <p className="font-medium">{selectedSettlement.partner_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">업체 유형</p>
                    {getPartnerTypeBadge(selectedSettlement.partner_type)}
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">이메일</p>
                    <a
                      href={`mailto:${selectedSettlement.email}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {selectedSettlement.email}
                    </a>
                  </div>
                </div>
              </div>

              {/* 기간 선택 탭 */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">기간별 매출</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setSelectedPeriod('today')}
                    variant={selectedPeriod === 'today' ? 'default' : 'outline'}
                    size="sm"
                  >
                    하루
                  </Button>
                  <Button
                    onClick={() => setSelectedPeriod('this_week')}
                    variant={selectedPeriod === 'this_week' ? 'default' : 'outline'}
                    size="sm"
                  >
                    한주
                  </Button>
                  <Button
                    onClick={() => setSelectedPeriod('this_month')}
                    variant={selectedPeriod === 'this_month' ? 'default' : 'outline'}
                    size="sm"
                  >
                    한달
                  </Button>
                  <Button
                    onClick={() => setSelectedPeriod('total')}
                    variant={selectedPeriod === 'total' ? 'default' : 'outline'}
                    size="sm"
                  >
                    전체
                  </Button>
                </div>

                {/* 로딩 중 */}
                {isLoadingDetail && (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                )}

                {/* 기간별 통계 */}
                {!isLoadingDetail && periodStats[selectedPeriod] && (
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">주문 건수</span>
                      <span className="text-lg font-bold">{periodStats[selectedPeriod]!.total_orders}건</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">총 매출</span>
                      <span className="text-lg font-bold">₩{periodStats[selectedPeriod]!.total_sales.toLocaleString()}</span>
                    </div>
                    {periodStats[selectedPeriod]!.total_refunded > 0 && (
                      <div className="flex justify-between items-center text-red-600">
                        <span>환불 금액</span>
                        <span className="font-medium">-₩{periodStats[selectedPeriod]!.total_refunded.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-medium">순 매출</span>
                      <span className="text-lg font-bold">₩{periodStats[selectedPeriod]!.net_sales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-orange-600">
                      <span>플랫폼 수수료 ({periodStats[selectedPeriod]!.commission_rate}%)</span>
                      <span className="font-medium">-₩{periodStats[selectedPeriod]!.commission_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
                      <span className="text-lg font-bold">정산 금액</span>
                      <span className="text-2xl font-bold text-green-600">
                        ₩{periodStats[selectedPeriod]!.settlement_amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* 데이터 없음 */}
                {!isLoadingDetail && !periodStats[selectedPeriod] && (
                  <div className="text-center py-8 text-gray-500">
                    해당 기간의 데이터가 없습니다.
                  </div>
                )}
              </div>

              {/* 상태 */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">정산 상태</h3>
                <div>
                  <Badge variant="outline" className="text-base py-1 px-3">
                    {selectedSettlement.status === 'pending' ? '정산 대기' : '정산 완료'}
                  </Badge>
                </div>
              </div>

              {/* 예약/결제 목록 */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">
                  결제 완료 예약 목록 ({bookings.length}건)
                </h3>

                {isLoadingBookings ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    해당 기간의 예약이 없습니다.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr className="border-b">
                          <th className="text-left p-2">예약번호</th>
                          <th className="text-left p-2">고객명</th>
                          <th className="text-left p-2">연락처</th>
                          {selectedSettlement.partner_type === 'rentcar' && (
                            <>
                              <th className="text-left p-2">차량</th>
                              <th className="text-left p-2">픽업일</th>
                              <th className="text-left p-2">반납일</th>
                            </>
                          )}
                          <th className="text-right p-2">결제금액</th>
                          <th className="text-left p-2">결제일시</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map((booking) => (
                          <tr key={booking.id} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-mono text-xs">
                              {booking.booking_number || `#${booking.id}`}
                            </td>
                            <td className="p-2">{booking.customer_name}</td>
                            <td className="p-2 text-xs">{booking.customer_phone}</td>
                            {selectedSettlement.partner_type === 'rentcar' && (
                              <>
                                <td className="p-2">{booking.vehicle_name || '-'}</td>
                                <td className="p-2 text-xs">
                                  {new Date(booking.pickup_date).toLocaleDateString('ko-KR')}
                                  {booking.pickup_time && <div className="text-gray-500">{booking.pickup_time}</div>}
                                </td>
                                <td className="p-2 text-xs">
                                  {new Date(booking.dropoff_date).toLocaleDateString('ko-KR')}
                                  {booking.dropoff_time && <div className="text-gray-500">{booking.dropoff_time}</div>}
                                </td>
                              </>
                            )}
                            <td className="p-2 text-right font-medium">
                              ₩{(booking.total_amount || 0).toLocaleString()}
                            </td>
                            <td className="p-2 text-xs">
                              {new Date(booking.created_at).toLocaleString('ko-KR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

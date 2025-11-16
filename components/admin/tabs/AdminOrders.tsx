import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { Search, RefreshCw, DollarSign, Eye, Download, ArrowUpDown, ArrowUp, ArrowDown, X, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface OrderItem {
  title?: string;
  name?: string;
  quantity: number;
  price?: number;
  selectedOption?: {
    name?: string;
    priceAdjustment?: number;
  };
}

interface BookingItem {
  booking_id: number;
  listing_id: number;
  status: string;
  delivery_status: string | null;
  guests: number;
  adults?: number;
  children?: number;
  infants?: number;
  product_title: string;
  category: string;
}

interface Order {
  id: number;
  booking_id: number | null; // ✅ 단일 예약 환불용
  user_name: string;
  user_email: string;
  user_phone?: string; // ✅ 주문자 전화번호
  product_title: string;
  product_name?: string; // ✅ 실제 상품명
  listing_id: number;
  amount: number;
  total_amount?: number; // ✅ API에서 사용
  subtotal?: number; // ✅ 상품 금액
  delivery_fee?: number; // ✅ 배송비
  insurance_fee?: number; // ✅ 보험료
  insurance_info?: any; // ✅ 보험 상세 정보
  items_info?: OrderItem[]; // ✅ 주문 상품 상세 정보
  bookings_list?: BookingItem[]; // 🔧 혼합 주문의 모든 bookings (부분 환불용)
  item_count?: number; // ✅ 상품 종류 수
  total_quantity?: number; // ✅ 총 수량
  status: string;
  payment_status: string;
  created_at: string;
  start_date: string;
  end_date: string;
  pickup_time?: string; // ✅ 렌트카 픽업 시간
  dropoff_time?: string; // ✅ 렌트카 반납 시간
  guests: number;
  adults?: number; // ✅ 투어/음식/관광지/이벤트/체험 성인 수
  children?: number; // ✅ 어린이 수
  infants?: number; // ✅ 유아 수
  category: string;
  is_popup: boolean;
  order_number: string;
  // ✅ 배송지 정보
  delivery_status?: string;
  shipping_name?: string;
  shipping_phone?: string;
  shipping_address?: string;
  shipping_address_detail?: string;
  shipping_zipcode?: string;
}

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState<'created_at' | 'amount' | 'user_name' | 'status'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1
  });
  const [showRevenueChart, setShowRevenueChart] = useState(false);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  const loadOrders = async (page: number = 1) => {
    try {
      setIsLoading(true);
      // ✅ Authorization 헤더 추가 (관리자 인증 필요)
      const token = localStorage.getItem('auth_token');

      // 날짜 필터 파라미터 추가
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(`/api/orders?${params.toString()}`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      const result = await response.json();
      console.log('🔍 [AdminOrders] API 응답:', result);

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      // ✅ /api/orders는 orders 필드로 반환
      const orders = result.data || result.orders || [];
      console.log(`🔍 [AdminOrders] 로드된 주문 수: ${orders.length} (${page}/${result.pagination?.total_pages || 1} 페이지)`);
      if (orders.length > 0) {
        console.log('🔍 [AdminOrders] 첫 번째 주문 샘플:', orders[0]);
      }
      setOrders(orders);
      setFilteredOrders(orders);
      setCurrentPage(page);
      setPagination(result.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 1
      });
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('주문 목록을 불러오는데 실패했습니다');
      setOrders([]);
      setFilteredOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefund = async (order: Order, bookingId?: number, bookingTitle?: string) => {
    // 혼합 주문에서 특정 booking 환불
    const isPartialRefund = bookingId !== undefined;
    const targetBookingId = bookingId || order.booking_id;
    const targetOrderId = !targetBookingId ? order.id : undefined;

    const confirmMsg = isPartialRefund
      ? `이 상품을 환불하시겠습니까?\n\n상품: ${bookingTitle}\n주문번호: #${order.id}\n고객: ${order.user_name}\n\n⚠️ 이 상품만 환불됩니다 (다른 상품은 유지됨)`
      : `이 주문을 환불하시겠습니까?\n\n주문번호: #${order.id}\n고객: ${order.user_name}\n금액: ₩${order.amount.toLocaleString()}\n\n이 작업은 즉시 토스 페이먼츠로 환불을 요청합니다.`;

    if (!confirm(confirmMsg)) {
      return;
    }

    // 환불 사유 입력
    const reason = prompt('환불 사유를 입력해주세요:');
    if (!reason || reason.trim() === '') {
      toast.error('환불 사유를 입력해주세요');
      return;
    }

    try {
      // ✅ booking_id가 있으면 단일/부분 예약, 없으면 장바구니 주문 전체
      const requestBody: any = {
        cancelReason: `[관리자 환불] ${reason}`,
      };

      if (targetBookingId) {
        // 단일 예약 또는 혼합 주문의 특정 상품 환불
        requestBody.bookingId = targetBookingId;
        console.log('🔍 [Admin Refund] 특정 booking 환불:', { bookingId: targetBookingId, isPartial: isPartialRefund });
      } else {
        // 장바구니 주문 전체 환불 (order.id는 payments 테이블의 id)
        requestBody.orderId = order.id;
        console.log('🔍 [Admin Refund] 장바구니 주문 전체 환불:', { orderId: order.id });
      }

      const response = await fetch('/api/admin/refund-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      console.log('🔍 [Admin] 환불 응답:', data);

      if (data.success) {
        // ✅ 환불 성공
        let message = `환불이 완료되었습니다 (${data.refundAmount?.toLocaleString() || order.amount.toLocaleString()}원)`;

        // ⚠️ Toss API 실패 경고 표시
        if (data.warning || data.requiresManualTossRefund) {
          toast.warning(
            `${message}\n\n⚠️ 주의: ${data.warning || 'Toss Payments 수동 처리 필요'}\n${data.tossError ? `\n에러: ${data.tossError}` : ''}`,
            { duration: 10000 }
          );
        } else {
          toast.success(message);
        }

        // 현재 페이지 유지하며 새로고침
        loadOrders(currentPage);
      } else {
        console.error('❌ [Admin] 환불 실패:', data);
        toast.error(data.message || '환불 처리에 실패했습니다');
      }
    } catch (error: any) {
      console.error('❌ [Admin] Refund request failed:', error);
      console.error('❌ [Admin] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      toast.error(`환불 요청 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // 정렬 함수
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 inline" />;
    return sortDirection === 'asc' ?
      <ArrowUp className="h-4 w-4 ml-1 inline" /> :
      <ArrowDown className="h-4 w-4 ml-1 inline" />;
  };

  // CSV Export 함수
  const handleExportCSV = () => {
    const csvData = filteredOrders.map(order => ({
      '주문번호': order.order_number,
      '주문자': order.user_name,
      '이메일': order.user_email,
      '전화번호': order.user_phone || '-',
      '상품명': order.product_title || order.product_name || '-',
      '카테고리': order.category,
      '금액': order.total_amount || order.amount,
      '상태': order.status,
      '결제상태': order.payment_status,
      '주문일시': new Date(order.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('CSV 파일이 다운로드되었습니다.');
  };

  // 매출 차트 데이터 로드
  const loadRevenueChart = async () => {
    setLoadingChart(true);
    try {
      const response = await fetch('/api/admin/revenue-chart');
      const data = await response.json();

      if (data.success) {
        setRevenueData(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load revenue chart:', error);
      toast.error('차트 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoadingChart(false);
    }
  };

  const handleRevenueCardClick = () => {
    setShowRevenueChart(true);
    if (revenueData.length === 0) {
      loadRevenueChart();
    }
  };

  useEffect(() => {
    let filtered = orders;

    if (searchQuery) {
      filtered = filtered.filter(order =>
        order.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.product_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // 정렬 적용
    filtered = [...filtered].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'amount':
          aValue = a.total_amount || a.amount || 0;
          bValue = b.total_amount || b.amount || 0;
          break;
        case 'user_name':
          aValue = a.user_name || '';
          bValue = b.user_name || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc' ?
          aValue.localeCompare(bValue) :
          bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });

    setFilteredOrders(filtered);
  }, [searchQuery, statusFilter, orders, sortField, sortDirection]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: '대기중', variant: 'secondary' },
      confirmed: { label: '확정', variant: 'default' },
      completed: { label: '완료', variant: 'outline' },
      cancelled: { label: '취소', variant: 'destructive' },
      refund_requested: { label: '환불대기', variant: 'destructive' }
    };

    const statusInfo = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* 매출 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">총 주문</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">확정 주문</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {orders.filter(o => o.status === 'confirmed').length}건
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:scale-105 hover:shadow-lg transition-all"
          onClick={handleRevenueCardClick}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">총 매출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {orders
                .filter(o => o.payment_status === 'paid' || o.payment_status === 'captured')
                .reduce((sum, o) => sum + (o.total_amount || o.amount || 0), 0)
                .toLocaleString()}원
            </div>
            <p className="text-xs text-gray-500 mt-1">클릭하여 차트 보기</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">평균 주문금액</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.length > 0
                ? Math.round(
                    orders.reduce((sum, o) => sum + (o.total_amount || o.amount || 0), 0) / orders.length
                  ).toLocaleString()
                : 0}원
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">주문 관리</h2>
          <p className="text-gray-600">
            총 {pagination.total}개의 주문
            {pagination.total > 0 && ` (현재 페이지: ${orders.length}개)`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            disabled={filteredOrders.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            CSV 다운로드
          </Button>
          <Button onClick={() => loadOrders(currentPage)} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>필터</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
            <div>
              <Label>시작일</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>종료일</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label>고객 검색</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="주문번호, 고객명, 이메일"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>상태 필터</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="pending">대기중</SelectItem>
                  <SelectItem value="confirmed">확정</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                  <SelectItem value="refund_requested">환불대기</SelectItem>
                  <SelectItem value="cancelled">취소</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => loadOrders(1)}
                className="w-full"
              >
                <Search className="h-4 w-4 mr-2" />
                조회
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-600 mt-2">주문을 불러오는 중...</p>
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">주문번호</th>
                    <th
                      className="text-left py-3 px-4 cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => handleSort('user_name')}
                    >
                      주문자 정보 {getSortIcon('user_name')}
                    </th>
                    <th className="text-left py-3 px-4">상품명</th>
                    <th className="text-left py-3 px-4">예약일/인원</th>
                    <th
                      className="text-left py-3 px-4 cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => handleSort('amount')}
                    >
                      금액 {getSortIcon('amount')}
                    </th>
                    <th
                      className="text-left py-3 px-4 cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => handleSort('status')}
                    >
                      결제/예약상태 {getSortIcon('status')}
                    </th>
                    <th
                      className="text-left py-3 px-4 cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => handleSort('created_at')}
                    >
                      주문일시 {getSortIcon('created_at')}
                    </th>
                    <th className="text-right py-3 px-4">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={`${order.id}-${order.category}-${order.booking_number || order.order_number}`} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-mono text-sm space-y-1">
                          <div className="font-semibold">#{order.id}</div>
                          {order.order_number && (
                            <div className="text-xs text-gray-500 break-all max-w-[150px]">
                              {order.order_number.substring(0, 20)}{order.order_number.length > 20 ? '...' : ''}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm space-y-1">
                          {/* 주문자 정보 */}
                          <div>
                            <div className="font-medium text-gray-900">
                              {order.user_name ? (
                                order.user_name
                              ) : (
                                <span className="text-red-600 text-xs font-semibold">⚠️ 이름 정보 없음</span>
                              )}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {order.user_email ? (
                                <a href={`mailto:${order.user_email}`} className="text-blue-600 hover:underline">
                                  {order.user_email}
                                </a>
                              ) : (
                                <span className="text-red-600 font-semibold">⚠️ 이메일 정보 없음</span>
                              )}
                            </div>
                            {order.user_phone ? (
                              <div className="text-gray-500 text-xs">
                                <a href={`tel:${order.user_phone}`} className="text-blue-600 hover:underline">
                                  {order.user_phone}
                                </a>
                              </div>
                            ) : (
                              <div className="text-red-600 text-xs font-semibold">⚠️ 전화번호 정보 없음</div>
                            )}
                          </div>
                          {/* 배송지 정보 (팝업 상품인 경우) */}
                          {order.is_popup && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="text-xs text-gray-600 font-semibold mb-1">📦 배송지</div>
                              {order.shipping_address ? (
                                <>
                                  {order.shipping_name && (
                                    <div className="text-xs text-gray-700 font-medium">{order.shipping_name}</div>
                                  )}
                                  {order.shipping_phone && (
                                    <div className="text-xs text-gray-500">
                                      <a href={`tel:${order.shipping_phone}`} className="text-blue-600 hover:underline">
                                        {order.shipping_phone}
                                      </a>
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-500">
                                    ({order.shipping_zipcode}) {order.shipping_address}
                                    {order.shipping_address_detail && ` ${order.shipping_address_detail}`}
                                  </div>
                                </>
                              ) : (
                                <div className="text-xs text-red-600 font-medium">⚠️ 배송지 미입력</div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="max-w-xs">
                          {order.items_info && order.items_info.length > 0 ? (
                            <div className="space-y-1">
                              {order.items_info.map((item, idx) => (
                                <div key={idx} className="text-sm">
                                  <span className="font-medium">{item.title || item.name}</span>
                                  <span className="text-gray-500 ml-1">x {item.quantity}</span>
                                </div>
                              ))}
                              {order.item_count && order.item_count > 3 && (
                                <div className="text-xs text-gray-400">
                                  외 {order.item_count - 3}개 상품
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="truncate">{order.product_title}</div>
                          )}
                          {/* 카테고리 표시 */}
                          <div className="mt-1">
                            <Badge variant="outline" className="text-xs">
                              {order.category || '기타'}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {order.is_popup ? (
                            // 팝업 상품: 총 수량 표시
                            <div className="text-gray-700 font-medium">
                              총 {order.total_quantity || order.guests}개
                            </div>
                          ) : (
                            // 예약 상품: 날짜와 인원
                            <>
                              {order.start_date && order.end_date ? (
                                <>
                                  {order.category === '렌트카' && order.pickup_time && order.dropoff_time ? (
                                    // 렌트카: 날짜 + 시간 표시
                                    <>
                                      <div>
                                        {new Date(order.start_date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Seoul' })}
                                        {' '}
                                        {order.pickup_time.substring(0, 5)}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        ~ {new Date(order.end_date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Seoul' })}
                                        {' '}
                                        {order.dropoff_time.substring(0, 5)}
                                      </div>
                                    </>
                                  ) : (
                                    // 일반 예약: 날짜와 시간
                                    <>
                                      <div>{new Date(order.start_date).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })}</div>
                                      <div className="text-xs text-gray-500">
                                        ~ {new Date(order.end_date).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' })}
                                      </div>
                                    </>
                                  )}
                                </>
                              ) : (
                                <div className="text-gray-400">-</div>
                              )}
                              <div className="text-xs text-gray-500 mt-1">
                                {/* ✅ 투어/음식/관광지/이벤트/체험: 성인/어린이/유아 상세 표시 */}
                                {(order.adults !== undefined && order.adults > 0) ||
                                 (order.children !== undefined && order.children > 0) ||
                                 (order.infants !== undefined && order.infants > 0) ? (
                                  <div className="space-y-0.5">
                                    {order.adults !== undefined && order.adults > 0 && (
                                      <div>성인 {order.adults}명</div>
                                    )}
                                    {order.children !== undefined && order.children > 0 && (
                                      <div>어린이 {order.children}명</div>
                                    )}
                                    {order.infants !== undefined && order.infants > 0 && (
                                      <div>유아 {order.infants}명</div>
                                    )}
                                  </div>
                                ) : (
                                  order.guests ? `${order.guests}명` : '-'
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold">₩{order.amount?.toLocaleString() || '0'}</div>
                        {order.subtotal && (
                          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                            <div>상품 {order.subtotal.toLocaleString()}원</div>
                            {(() => {
                              // 옵션 가격 계산
                              const optionsTotalPrice = order.items_info?.reduce((sum, item) => {
                                const optionPrice = (item.selectedOption?.priceAdjustment || 0) * item.quantity;
                                return sum + optionPrice;
                              }, 0) || 0;
                              return optionsTotalPrice > 0 && (
                                <div>옵션 {optionsTotalPrice.toLocaleString()}원</div>
                              );
                            })()}
                            {order.insurance_fee && order.insurance_fee > 0 && (
                              <div>보험 {order.insurance_fee.toLocaleString()}원</div>
                            )}
                            {order.delivery_fee && order.delivery_fee > 0 && (
                              <div>배송비 {order.delivery_fee.toLocaleString()}원</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {getStatusBadge(order.status)}
                          <div className="text-xs text-gray-500">
                            {order.payment_status === 'paid' ? '대기' :
                             order.payment_status === 'pending' ? '미결제' :
                             order.payment_status === 'refunded' ? '환불완료' : order.payment_status}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div>
                          {order.created_at ? (
                            new Date(order.created_at).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Asia/Seoul'
                            })
                          ) : '-'}
                        </div>
                        {order.refunded_at && (order.status === 'cancelled' || order.payment_status === 'refunded') && (
                          <div className="text-xs text-red-600 mt-1">
                            환불: {new Date(order.refunded_at).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Asia/Seoul'
                            })}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2 flex-col items-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/detail/${order.listing_id}`, '_blank')}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            확인
                          </Button>
                          {order.status !== 'refund_requested' &&
                           order.status !== 'cancelled' &&
                           order.payment_status === 'paid' &&
                           order.payment_status !== 'refunded' && (
                            <>
                              {/* 🔧 혼합 주문: 각 상품마다 개별 환불 버튼 */}
                              {order.bookings_list && order.bookings_list.length > 1 ? (
                                <div className="space-y-1 w-full">
                                  <div className="text-xs text-gray-500 mb-1">개별 환불:</div>
                                  {order.bookings_list.map((booking) => (
                                    <Button
                                      key={booking.booking_id}
                                      variant="destructive"
                                      size="sm"
                                      className="w-full text-xs"
                                      onClick={() => handleRefund(order, booking.booking_id, booking.product_title)}
                                    >
                                      <DollarSign className="h-3 w-3 mr-1" />
                                      {booking.product_title.substring(0, 15)}
                                      {booking.product_title.length > 15 ? '...' : ''}
                                    </Button>
                                  ))}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-xs border-red-300 text-red-600 hover:bg-red-50"
                                    onClick={() => handleRefund(order)}
                                  >
                                    전체 환불
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRefund(order)}
                                >
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  환불
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">
                {searchQuery || statusFilter !== 'all'
                  ? '검색 결과가 없습니다'
                  : '주문이 없습니다'}
              </p>
            </div>
          )}

          {/* 페이지네이션 */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-gray-700">
                총 {pagination.total}개 중 {((currentPage - 1) * pagination.limit) + 1}-
                {Math.min(currentPage * pagination.limit, pagination.total)}개 표시
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadOrders(1)}
                  disabled={currentPage === 1 || isLoading}
                >
                  처음
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadOrders(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                >
                  이전
                </Button>
                <span className="px-4 py-2 text-sm">
                  {currentPage} / {pagination.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadOrders(currentPage + 1)}
                  disabled={currentPage === pagination.total_pages || isLoading}
                >
                  다음
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadOrders(pagination.total_pages)}
                  disabled={currentPage === pagination.total_pages || isLoading}
                >
                  마지막
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue Chart Modal */}
      {showRevenueChart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  매출 추이
                </h3>
                <p className="text-sm text-gray-500 mt-1">최근 30일간의 매출 데이터</p>
              </div>
              <button
                onClick={() => setShowRevenueChart(false)}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {loadingChart ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="ml-3 text-gray-600">차트 데이터를 불러오는 중...</p>
                </div>
              ) : revenueData.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">매출 데이터가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Line Chart */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">일별 매출 추이 (선 그래프)</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => `₩${value.toLocaleString()}`}
                          labelFormatter={(label) => `날짜: ${label}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#10b981"
                          strokeWidth={2}
                          name="매출"
                          dot={{ fill: '#10b981', r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="orders"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="주문 수"
                          dot={{ fill: '#3b82f6', r: 4 }}
                          yAxisId="right"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Bar Chart */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">일별 매출 (막대 그래프)</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => `₩${value.toLocaleString()}`}
                          labelFormatter={(label) => `날짜: ${label}`}
                        />
                        <Legend />
                        <Bar dataKey="revenue" fill="#10b981" name="매출" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm text-gray-500">총 매출</div>
                        <div className="text-2xl font-bold text-green-600">
                          ₩{revenueData.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm text-gray-500">평균 일매출</div>
                        <div className="text-2xl font-bold text-blue-600">
                          ₩{Math.round(revenueData.reduce((sum, d) => sum + d.revenue, 0) / revenueData.length).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm text-gray-500">총 주문 수</div>
                        <div className="text-2xl font-bold text-purple-600">
                          {revenueData.reduce((sum, d) => sum + d.orders, 0)}건
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

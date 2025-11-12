/**
 * 행사 벤더 전용 대시보드
 *
 * 기능:
 * - 내 행사 관리
 * - 티켓 주문 목록 조회 및 필터링
 * - 티켓 판매 통계
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  PartyPopper,
  Ticket,
  DollarSign,
  TrendingUp,
  Calendar,
  LogOut,
  Search,
  Filter,
  Loader2,
  MapPin,
  RefreshCw,
  Download,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { exportToCSV, generateCSVFilename } from '../utils/csv-export';
import { VendorDashboardSkeleton } from './VendorDashboardSkeleton';

interface Event {
  id: number;
  title: string;
  description: string;
  venue_name: string;
  venue_address: string;
  start_datetime: string;
  general_price: number;
  vip_price: number;
  tickets_remaining: number;
  is_active: boolean;
}

interface Order {
  id: number;
  order_number: string;
  event_title: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  start_datetime: string;
  ticket_type: string;
  quantity: number;
  total_amount: number;
  payment_status: string;
  payment_key?: string;
  status: string;
  created_at: string;
}

interface DashboardStats {
  total_revenue: number;
  total_orders: number;
  upcoming_events: number;
  completed_orders: number;
}

export function EventsVendorDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  const [events, setEvents] = useState<Event[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_revenue: 0,
    total_orders: 0,
    upcoming_events: 0,
    completed_orders: 0
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // 정렬
  const [sortField, setSortField] = useState<'order_number' | 'event_title' | 'customer_name' | 'total_amount' | 'payment_status' | 'created_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadDashboardData();
  }, [user, navigate]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('로그인이 필요합니다.');
        navigate('/login');
        return;
      }

      // 행사 목록
      const eventsResponse = await fetch('/api/vendor/events/events', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const eventsData = await eventsResponse.json();
      if (eventsData.success) {
        const eventsList = eventsData.data || [];
        setEvents(eventsList);

        const now = new Date();
        const upcomingEvents = eventsList.filter(
          (e: Event) => new Date(e.start_datetime) > now
        ).length;

        setStats(prev => ({ ...prev, upcoming_events: upcomingEvents }));
      }

      // 주문 목록
      const ordersResponse = await fetch('/api/vendor/events/tickets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const ordersData = await ordersResponse.json();
      if (ordersData.success) {
        const ordersList = ordersData.data || [];
        setOrders(ordersList);
        setFilteredOrders(ordersList);

        const totalRevenue = ordersList
          .filter((o: Order) => o.payment_status === 'paid')
          .reduce((sum: number, o: Order) => sum + o.total_amount, 0);

        const completedOrders = ordersList.filter(
          (o: Order) => o.status === 'completed'
        ).length;

        setStats(prev => ({
          ...prev,
          total_revenue: totalRevenue,
          total_orders: ordersList.length,
          completed_orders: completedOrders
        }));
      }
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefund = async (order: Order) => {
    if (!order.payment_key) {
      toast.error('결제 정보를 찾을 수 없습니다.');
      return;
    }

    if (!confirm(`${order.event_title} 티켓 주문을 환불하시겠습니까?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentKey: order.payment_key,
          cancelReason: '벤더 요청 환불',
          skipPolicy: true
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('환불이 완료되었습니다.');
        loadDashboardData();
      } else {
        toast.error(result.message || '환불에 실패했습니다.');
      }
    } catch (error) {
      console.error('환불 오류:', error);
      toast.error('환불 처리 중 오류가 발생했습니다.');
    }
  };

  const handleUpdateStatus = async (order: Order, newStatus: string) => {
    const statusMessages = {
      confirmed: '확정',
      canceled: '취소',
      completed: '완료'
    };

    const message = statusMessages[newStatus as keyof typeof statusMessages] || newStatus;

    if (!confirm(`${order.event_title} 티켓 주문을 ${message}하시겠습니까?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/vendor/events/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_id: order.id,
          status: newStatus
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`티켓 주문이 ${message}되었습니다.`);
        loadDashboardData();
      } else {
        toast.error(result.message || `${message} 처리에 실패했습니다.`);
      }
    } catch (error) {
      console.error('상태 변경 오류:', error);
      toast.error('상태 변경 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    let filtered = orders;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(o =>
        o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.event_title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 정렬 적용
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'order_number':
          aValue = a.order_number || '';
          bValue = b.order_number || '';
          break;
        case 'event_title':
          aValue = a.event_title || '';
          bValue = b.event_title || '';
          break;
        case 'customer_name':
          aValue = a.customer_name || '';
          bValue = b.customer_name || '';
          break;
        case 'total_amount':
          aValue = a.total_amount || 0;
          bValue = b.total_amount || 0;
          break;
        case 'payment_status':
          aValue = a.payment_status || '';
          bValue = b.payment_status || '';
          break;
        case 'created_at':
          aValue = a.created_at ? new Date(a.created_at).getTime() : 0;
          bValue = b.created_at ? new Date(b.created_at).getTime() : 0;
          break;
        default:
          return 0;
      }

      // 문자열 또는 숫자 비교
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, 'ko-KR');
        return sortDirection === 'asc' ? comparison : -comparison;
      } else {
        const comparison = aValue - bValue;
        return sortDirection === 'asc' ? comparison : -comparison;
      }
    });

    setFilteredOrders(filtered);
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 리셋
  }, [searchQuery, statusFilter, orders, sortField, sortDirection]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      // 같은 필드를 클릭하면 방향 토글
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 다른 필드를 클릭하면 해당 필드로 변경하고 기본 내림차순
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-30" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1 inline text-blue-600" />
      : <ArrowDown className="h-3 w-3 ml-1 inline text-blue-600" />;
  };

  const getAriaSort = (field: typeof sortField): 'ascending' | 'descending' | 'none' => {
    if (sortField !== field) return 'none';
    return sortDirection === 'asc' ? 'ascending' : 'descending';
  };

  const handleSortKeyDown = (e: React.KeyboardEvent, field: typeof sortField) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSort(field);
    }
  };

  const handleExportCSV = () => {
    const exportData = filteredOrders.map(order => ({
      '예약번호': order.order_number,
      '이벤트명': order.event_title,
      '고객명': order.customer_name,
      '전화번호': order.customer_phone || '-',
      '이메일': order.customer_email || '-',
      '이벤트일시': order.start_datetime ? new Date(order.start_datetime).toLocaleString('ko-KR') : '-',
      '티켓종류': order.ticket_type === 'general' ? '일반석' : 'VIP석',
      '수량': order.quantity,
      '금액': order.total_amount,
      '결제상태': order.payment_status === 'paid' ? '결제완료' :
                   order.payment_status === 'pending' ? '결제대기' :
                   order.payment_status === 'failed' ? '결제실패' : '환불완료',
      '주문상태': order.status === 'pending' ? '대기중' :
                  order.status === 'confirmed' ? '확정' :
                  order.status === 'completed' ? '완료' : '취소',
      '주문일시': order.created_at ? new Date(order.created_at).toLocaleString('ko-KR') : '-'
    }));

    const filename = generateCSVFilename('event_tickets');
    exportToCSV(exportData, filename);
    toast.success('CSV 파일이 다운로드되었습니다.');
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      canceled: 'bg-red-100 text-red-800'
    };

    const statusLabels: Record<string, string> = {
      pending: '대기중',
      confirmed: '확정',
      completed: '완료',
      canceled: '취소'
    };

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800'
    };

    const statusLabels: Record<string, string> = {
      pending: '결제대기',
      paid: '결제완료',
      failed: '결제실패',
      refunded: '환불완료'
    };

    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  if (isLoading) {
    return <VendorDashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <PartyPopper className="h-6 w-6 text-pink-600" />
              행사 벤더 대시보드
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {user?.name || '벤더'} 님, 환영합니다!
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 매출</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total_revenue.toLocaleString()}원
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">전체 티켓</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_orders}건</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">예정 행사</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcoming_events}개</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">완료 주문</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed_orders}건</div>
            </CardContent>
          </Card>
        </div>

        {/* 메인 컨텐츠 */}
        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders">티켓 주문</TabsTrigger>
            <TabsTrigger value="events">행사 정보</TabsTrigger>
          </TabsList>

          {/* 티켓 주문 탭 */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>티켓 주문 목록</CardTitle>
                    <CardDescription>판매된 티켓을 관리하세요</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCSV}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      CSV 내보내기
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadDashboardData}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                      새로고침
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* 필터 */}
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="주문번호, 고객명으로 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 상태</SelectItem>
                      <SelectItem value="pending">대기중</SelectItem>
                      <SelectItem value="confirmed">확정</SelectItem>
                      <SelectItem value="completed">완료</SelectItem>
                      <SelectItem value="canceled">취소</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 주문 테이블 */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          role="button"
                          tabIndex={0}
                          aria-sort={getAriaSort('order_number')}
                          aria-label="주문번호로 정렬"
                          className="cursor-pointer hover:bg-gray-50 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
                          onClick={() => handleSort('order_number')}
                          onKeyDown={(e) => handleSortKeyDown(e, 'order_number')}
                        >
                          주문번호 {getSortIcon('order_number')}
                        </TableHead>
                        <TableHead
                          role="button"
                          tabIndex={0}
                          aria-sort={getAriaSort('event_title')}
                          aria-label="행사명으로 정렬"
                          className="cursor-pointer hover:bg-gray-50 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
                          onClick={() => handleSort('event_title')}
                          onKeyDown={(e) => handleSortKeyDown(e, 'event_title')}
                        >
                          행사명 {getSortIcon('event_title')}
                        </TableHead>
                        <TableHead
                          role="button"
                          tabIndex={0}
                          aria-sort={getAriaSort('customer_name')}
                          aria-label="고객명으로 정렬"
                          className="cursor-pointer hover:bg-gray-50 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
                          onClick={() => handleSort('customer_name')}
                          onKeyDown={(e) => handleSortKeyDown(e, 'customer_name')}
                        >
                          고객명 {getSortIcon('customer_name')}
                        </TableHead>
                        <TableHead>행사일시</TableHead>
                        <TableHead>좌석/수량</TableHead>
                        <TableHead
                          role="button"
                          tabIndex={0}
                          aria-sort={getAriaSort('total_amount')}
                          aria-label="금액으로 정렬"
                          className="cursor-pointer hover:bg-gray-50 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
                          onClick={() => handleSort('total_amount')}
                          onKeyDown={(e) => handleSortKeyDown(e, 'total_amount')}
                        >
                          금액 {getSortIcon('total_amount')}
                        </TableHead>
                        <TableHead
                          role="button"
                          tabIndex={0}
                          aria-sort={getAriaSort('payment_status')}
                          aria-label="결제상태로 정렬"
                          className="cursor-pointer hover:bg-gray-50 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
                          onClick={() => handleSort('payment_status')}
                          onKeyDown={(e) => handleSortKeyDown(e, 'payment_status')}
                        >
                          결제상태 {getSortIcon('payment_status')}
                        </TableHead>
                        <TableHead>주문상태</TableHead>
                        <TableHead>액션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                            주문 내역이 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">
                              {order.order_number}
                            </TableCell>
                            <TableCell>{order.event_title}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{order.customer_name}</div>
                                {order.customer_email && (
                                  <div className="text-xs text-gray-500">
                                    <a href={`mailto:${order.customer_email}`} className="text-blue-600 hover:underline">
                                      {order.customer_email}
                                    </a>
                                  </div>
                                )}
                                {order.customer_phone && (
                                  <div className="text-xs text-gray-500">
                                    <a href={`tel:${order.customer_phone}`} className="text-blue-600 hover:underline">
                                      {order.customer_phone}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(order.start_datetime).toLocaleString('ko-KR')}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{order.ticket_type === 'general' ? '일반석' : 'VIP석'}</div>
                                <div className="text-gray-500">{order.quantity}매</div>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">
                              {order.total_amount.toLocaleString()}원
                            </TableCell>
                            <TableCell>{getPaymentStatusBadge(order.payment_status)}</TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2 flex-wrap">
                                {order.status === 'pending' && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleUpdateStatus(order, 'confirmed')}
                                  >
                                    확정
                                  </Button>
                                )}
                                {order.status === 'confirmed' && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleUpdateStatus(order, 'completed')}
                                  >
                                    완료
                                  </Button>
                                )}
                                {order.status !== 'canceled' &&
                                 order.status !== 'completed' && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleUpdateStatus(order, 'canceled')}
                                  >
                                    취소
                                  </Button>
                                )}
                                {order.payment_status === 'paid' &&
                                 order.status !== 'canceled' &&
                                 order.status !== 'completed' && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRefund(order)}
                                  >
                                    환불
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* 페이지네이션 */}
                {filteredOrders.length > 0 && (
                  <div className="mt-6">
                    <div className="text-center mb-4">
                      <p className="text-sm text-gray-500">
                        총 {filteredOrders.length}개의 주문
                        {searchQuery || statusFilter !== 'all'
                          ? ` (전체 ${orders.length}개)`
                          : ''}
                      </p>
                    </div>

                    {Math.ceil(filteredOrders.length / itemsPerPage) > 1 && (
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          이전
                        </Button>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-600">
                            페이지 {currentPage} / {Math.ceil(filteredOrders.length / itemsPerPage)}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredOrders.length / itemsPerPage), prev + 1))}
                          disabled={currentPage === Math.ceil(filteredOrders.length / itemsPerPage)}
                        >
                          다음
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 행사 정보 탭 */}
          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>내 행사</CardTitle>
                <CardDescription>등록된 행사 정보</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {events.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      등록된 행사가 없습니다.
                    </div>
                  ) : (
                    events.map((event) => (
                      <Card key={event.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-lg">{event.title}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {event.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">장소</span>
                              <span className="font-medium">{event.venue_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">일시</span>
                              <span className="font-medium">
                                {new Date(event.start_datetime).toLocaleString('ko-KR')}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">일반석</span>
                              <span className="font-semibold text-pink-600">
                                {event.general_price.toLocaleString()}원
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">VIP석</span>
                              <span className="font-semibold text-pink-600">
                                {event.vip_price.toLocaleString()}원
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">잔여 티켓</span>
                              <span className="font-medium">{event.tickets_remaining}매</span>
                            </div>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t">
                              <span className="text-gray-600">상태</span>
                              <Badge variant={event.is_active ? 'default' : 'secondary'}>
                                {event.is_active ? '활성' : '종료'}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

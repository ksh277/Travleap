/**
 * 관광지 벤더 전용 대시보드
 *
 * 기능:
 * - 내 관광지 관리
 * - 티켓 주문 목록 조회 및 필터링
 * - 입장권 판매 통계
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
  Camera,
  Ticket,
  DollarSign,
  TrendingUp,
  Users,
  LogOut,
  Search,
  Filter,
  Loader2,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

interface Attraction {
  id: number;
  name: string;
  description: string;
  address: string;
  admission_fee_adult: number;
  admission_fee_child: number;
  is_active: boolean;
}

interface Order {
  id: number;
  order_number: string;
  attraction_name: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  visit_date: string;
  tickets: any;
  total_amount: number;
  payment_status: string;
  payment_key?: string;
  status: string;
  created_at: string;
}

interface DashboardStats {
  total_revenue: number;
  total_orders: number;
  upcoming_visits: number;
  completed_orders: number;
}

export function AttractionsVendorDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_revenue: 0,
    total_orders: 0,
    upcoming_visits: 0,
    completed_orders: 0
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

      // 관광지 목록
      const attrResponse = await fetch('/api/vendor/attractions/attractions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const attrData = await attrResponse.json();
      if (attrData.success) {
        setAttractions(attrData.data || []);
      }

      // 주문 목록
      const ordersResponse = await fetch('/api/vendor/attractions/tickets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const ordersData = await ordersResponse.json();
      if (ordersData.success) {
        const ordersList = ordersData.data || [];
        setOrders(ordersList);
        setFilteredOrders(ordersList);

        const now = new Date();
        const totalRevenue = ordersList
          .filter((o: Order) => o.payment_status === 'paid')
          .reduce((sum: number, o: Order) => sum + o.total_amount, 0);

        const upcomingVisits = ordersList.filter(
          (o: Order) => o.status === 'confirmed' && new Date(o.visit_date) > now
        ).length;

        const completedOrders = ordersList.filter(
          (o: Order) => o.status === 'completed'
        ).length;

        setStats({
          total_revenue: totalRevenue,
          total_orders: ordersList.length,
          upcoming_visits: upcomingVisits,
          completed_orders: completedOrders
        });
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

    if (!confirm(`${order.attraction_name} 티켓 주문을 환불하시겠습니까?`)) {
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

    if (!confirm(`${order.attraction_name} 티켓 주문을 ${message}하시겠습니까?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/vendor/attractions/update-status', {
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
        o.attraction_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredOrders(filtered);
  }, [searchQuery, statusFilter, orders]);

  const handleLogout = () => {
    logout();
    navigate('/login');
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">대시보드를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Camera className="h-6 w-6 text-blue-600" />
              관광지 벤더 대시보드
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
              <CardTitle className="text-sm font-medium">예정 방문</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcoming_visits}건</div>
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
            <TabsTrigger value="attractions">관광지 정보</TabsTrigger>
          </TabsList>

          {/* 티켓 주문 탭 */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>티켓 주문 목록</CardTitle>
                <CardDescription>판매된 입장권을 관리하세요</CardDescription>
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
                        <TableHead>주문번호</TableHead>
                        <TableHead>관광지</TableHead>
                        <TableHead>고객명</TableHead>
                        <TableHead>방문일</TableHead>
                        <TableHead>티켓</TableHead>
                        <TableHead>금액</TableHead>
                        <TableHead>결제상태</TableHead>
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
                        filteredOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">
                              {order.order_number}
                            </TableCell>
                            <TableCell>{order.attraction_name}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{order.customer_name}</div>
                                {order.customer_email && (
                                  <div className="text-xs text-gray-500">{order.customer_email}</div>
                                )}
                                {order.customer_phone && (
                                  <div className="text-xs text-gray-500">{order.customer_phone}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(order.visit_date).toLocaleDateString('ko-KR')}
                            </TableCell>
                            <TableCell>
                              {Array.isArray(order.tickets) ? (
                                <div className="text-sm">
                                  {order.tickets.map((t: any, i: number) => (
                                    <div key={i}>{t.type_name} {t.count}매</div>
                                  ))}
                                </div>
                              ) : '티켓 정보'}
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* 관광지 정보 탭 */}
          <TabsContent value="attractions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>내 관광지</CardTitle>
                <CardDescription>등록된 관광지 정보</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {attractions.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      등록된 관광지가 없습니다.
                    </div>
                  ) : (
                    attractions.map((attraction) => (
                      <Card key={attraction.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-lg">{attraction.name}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {attraction.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">주소</span>
                              <span className="font-medium text-right">{attraction.address}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">성인 요금</span>
                              <span className="font-semibold text-blue-600">
                                {attraction.admission_fee_adult.toLocaleString()}원
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">어린이 요금</span>
                              <span className="font-medium">
                                {attraction.admission_fee_child.toLocaleString()}원
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t">
                              <span className="text-gray-600">상태</span>
                              <Badge variant={attraction.is_active ? 'default' : 'secondary'}>
                                {attraction.is_active ? '운영중' : '휴무'}
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

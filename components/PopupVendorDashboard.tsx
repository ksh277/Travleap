/**
 * 팝업 스토어 벤더 전용 대시보드
 *
 * 기능:
 * - 내 팝업 상품 목록 조회
 * - 주문 목록 조회 및 필터링
 * - 배송 관리 (송장번호 입력, 배송 상태 변경)
 * - 판매 통계 확인
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Package,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Truck,
  LogOut,
  Search,
  Filter,
  Eye,
  X,
  Loader2,
  Download,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RefreshCw,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { ShippingManagementDialog } from './ShippingManagementDialog';
import { exportToCSV, generateCSVFilename } from '../utils/csv-export';
import { VendorDashboardSkeleton } from './VendorDashboardSkeleton';
import RefundPolicySettings from './vendor/RefundPolicySettings';

interface Product {
  id: number;
  title: string;
  category: string;
  price: number;
  stock?: number;
  status: string;
  is_active: boolean;
}

interface Order {
  id: number;
  order_number: string;
  product_name: string;
  category: string;
  customer_info?: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    detailed_address?: string;
    postal_code?: string;
  };
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  user_address?: string;
  user_detailed_address?: string;
  user_postal_code?: string;
  total_amount: number;
  points_used?: number;
  insurance?: {
    name: string;
    price: number;
  };
  payment_status: string;
  payment_method?: string;
  card_company?: string;
  virtual_account_bank?: string;
  refund_amount?: number;
  refund_reason?: string;
  refunded_at?: string;
  status: string;
  delivery_status?: string;
  tracking_number?: string;
  courier_company?: string;
  created_at: string;
  start_date?: string;
  num_adults?: number;
}

interface DashboardStats {
  total_sales: number;
  total_orders: number;
  pending_shipments: number;
  completed_orders: number;
}

export function PopupVendorDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  // 상태 관리
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_sales: 0,
    total_orders: 0,
    pending_shipments: 0,
    completed_orders: 0
  });

  // 배송 관리 다이얼로그
  const [selectedShippingOrder, setSelectedShippingOrder] = useState<Order | null>(null);
  const [isShippingDialogOpen, setIsShippingDialogOpen] = useState(false);

  // 상세보기 모달
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // 필터
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 정렬
  const [sortField, setSortField] = useState<'order_number' | 'product_name' | 'customer_name' | 'total_amount' | 'payment_status' | 'delivery_status' | 'created_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 초기 데이터 로드
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'vendor') {
      toast.error('벤더 권한이 필요합니다.');
      navigate('/');
      return;
    }

    loadDashboardData();
  }, [user]);

  // 필터 및 정렬 적용
  useEffect(() => {
    applyFilters();
  }, [orders, searchQuery, statusFilter, deliveryStatusFilter, startDate, endDate, sortField, sortDirection]);

  // 날짜 필터 유효성 검사
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        toast.error('시작일은 종료일보다 이전이어야 합니다.');
      }
    }

    // 미래 날짜 체크
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (endDate) {
      const end = new Date(endDate);
      if (end > today) {
        toast.warning('종료일이 미래 날짜입니다.');
      }
    }
  }, [startDate, endDate]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // 1. 내 상품 목록 조회 (JWT에서 vendorId 자동 추출)
      const productsResponse = await fetch(`/api/vendor/products`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      // JWT 만료 처리
      if (productsResponse.status === 401) {
        toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
        logout();
        navigate('/login');
        return;
      }

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        if (productsData.success) {
          setProducts(productsData.data || []);
        }
      }

      // 2. 주문 목록 조회 (JWT에서 vendorId 자동 추출)
      const ordersResponse = await fetch(`/api/vendor/orders`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      // JWT 만료 처리
      if (ordersResponse.status === 401) {
        toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
        logout();
        navigate('/login');
        return;
      }

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        if (ordersData.success) {
          const ordersList = ordersData.data || [];
          setOrders(ordersList);

          // 통계 계산
          const totalSales = ordersList
            .filter((o: Order) => o.payment_status === 'completed')
            .reduce((sum: number, o: Order) => sum + o.total_amount, 0);

          const pendingShipments = ordersList.filter(
            (o: Order) => o.delivery_status && ['PENDING', 'READY'].includes(o.delivery_status)
          ).length;

          const completedOrders = ordersList.filter(
            (o: Order) => o.delivery_status === 'DELIVERED' || o.status === 'completed'
          ).length;

          setStats({
            total_sales: totalSales,
            total_orders: ordersList.length,
            pending_shipments: pendingShipments,
            completed_orders: completedOrders
          });
        }
      }

    } catch (error) {
      console.error('데이터 로드 오류:', error);
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 결제 수단 표시 포맷팅
  const formatPaymentMethod = (method?: string, cardCompany?: string, bankName?: string) => {
    if (!method) return '-';

    const methodMap: Record<string, string> = {
      'card': '카드',
      'bank_transfer': '계좌이체',
      'kakaopay': '카카오페이',
      'toss_pay': '토스페이',
      'payco': '페이코',
      'naver_pay': '네이버페이',
      'samsung_pay': '삼성페이',
      'virtual_account': '가상계좌',
      'mobile_carrier': '휴대폰',
      'easy_payment': '간편결제'
    };

    let displayText = methodMap[method] || method;

    // 카드인 경우 카드사 표시
    if (method === 'card' && cardCompany) {
      displayText += ` (${cardCompany})`;
    }

    // 가상계좌인 경우 은행명 표시
    if (method === 'virtual_account' && bankName) {
      displayText += ` (${bankName})`;
    }

    return displayText;
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // 검색어 필터
    if (searchQuery) {
      filtered = filtered.filter(order =>
        order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_info?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.user_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 주문 상태 필터
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // 배송 상태 필터
    if (deliveryStatusFilter !== 'all') {
      filtered = filtered.filter(order => order.delivery_status === deliveryStatusFilter);
    }

    // 날짜 범위 필터
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(order => {
        if (!order.created_at) return false;
        const orderDate = new Date(order.created_at);
        return orderDate >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(order => {
        if (!order.created_at) return false;
        const orderDate = new Date(order.created_at);
        return orderDate <= end;
      });
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
        case 'product_name':
          aValue = a.product_name || '';
          bValue = b.product_name || '';
          break;
        case 'customer_name':
          aValue = a.customer_info?.name || a.user_name || '';
          bValue = b.customer_info?.name || b.user_name || '';
          break;
        case 'total_amount':
          aValue = a.total_amount || 0;
          bValue = b.total_amount || 0;
          break;
        case 'payment_status':
          aValue = a.payment_status || '';
          bValue = b.payment_status || '';
          break;
        case 'delivery_status':
          aValue = a.delivery_status || '';
          bValue = b.delivery_status || '';
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleExportCSV = () => {
    const exportData = filteredOrders.map(order => ({
      '주문번호': order.order_number,
      '상품명': order.product_name,
      '고객명': order.customer_info?.name || order.user_name || '-',
      '고객전화': order.customer_info?.phone || order.user_phone || '-',
      '주문금액': order.total_amount,
      '결제수단': formatPaymentMethod(order.payment_method, order.card_company, order.virtual_account_bank),
      '결제상태': order.payment_status === 'completed' ? '결제완료' : order.payment_status === 'refunded' ? '환불완료' : order.payment_status === 'pending' ? '대기중' : '실패',
      '환불금액': order.refund_amount || '',
      '환불사유': order.refund_reason || '',
      '배송상태': order.delivery_status || '-',
      '송장번호': order.tracking_number || '-',
      '주문일시': order.created_at ? new Date(order.created_at).toLocaleString('ko-KR') : '-'
    }));

    const filename = generateCSVFilename('popup_orders');
    exportToCSV(exportData, filename);
    toast.success('CSV 파일이 다운로드되었습니다.');
  };

  const getDeliveryStatusBadge = (status?: string) => {
    if (!status) return null;

    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'PENDING': { label: '배송 준비중', variant: 'secondary' },
      'READY': { label: '발송 대기', variant: 'outline' },
      'SHIPPING': { label: '배송중', variant: 'default' },
      'DELIVERED': { label: '배송 완료', variant: 'default' },
      'CANCELED': { label: '취소', variant: 'destructive' }
    };

    const config = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return <VendorDashboardSkeleton />;
  }

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">팝업 벤더 대시보드</h1>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 판매액</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₩{(stats.total_sales || 0).toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 주문</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_orders}건</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">발송 대기</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending_shipments}건</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">완료된 주문</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed_orders}건</div>
            </CardContent>
          </Card>
        </div>

        {/* 탭 */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList>
            <TabsTrigger value="orders">주문 관리</TabsTrigger>
            <TabsTrigger value="products">내 상품</TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              설정
            </TabsTrigger>
          </TabsList>

          {/* 주문 관리 탭 */}
          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>주문 목록</CardTitle>
                  <div className="flex gap-2">
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
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="주문번호, 상품명, 고객명 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="주문 상태" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="pending">대기</SelectItem>
                      <SelectItem value="confirmed">확정</SelectItem>
                      <SelectItem value="completed">완료</SelectItem>
                      <SelectItem value="cancelled">취소</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={deliveryStatusFilter} onValueChange={setDeliveryStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="배송 상태" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="PENDING">배송 준비중</SelectItem>
                      <SelectItem value="READY">발송 대기</SelectItem>
                      <SelectItem value="SHIPPING">배송중</SelectItem>
                      <SelectItem value="DELIVERED">배송 완료</SelectItem>
                      <SelectItem value="CANCELED">취소</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-[150px]"
                      placeholder="시작일"
                    />
                    <span className="text-gray-500">~</span>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-[150px]"
                      placeholder="종료일"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleExportCSV}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    CSV 내보내기
                  </Button>
                </div>

                {/* 주문 테이블 */}
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
                        aria-sort={getAriaSort('product_name')}
                        aria-label="상품명으로 정렬"
                        className="cursor-pointer hover:bg-gray-50 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
                        onClick={() => handleSort('product_name')}
                        onKeyDown={(e) => handleSortKeyDown(e, 'product_name')}
                      >
                        상품명 {getSortIcon('product_name')}
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
                        고객 정보 {getSortIcon('customer_name')}
                      </TableHead>
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
                      <TableHead>결제 수단</TableHead>
                      <TableHead
                        role="button"
                        tabIndex={0}
                        aria-sort={getAriaSort('payment_status')}
                        aria-label="결제 상태로 정렬"
                        className="cursor-pointer hover:bg-gray-50 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
                        onClick={() => handleSort('payment_status')}
                        onKeyDown={(e) => handleSortKeyDown(e, 'payment_status')}
                      >
                        결제 상태 {getSortIcon('payment_status')}
                      </TableHead>
                      <TableHead
                        role="button"
                        tabIndex={0}
                        aria-sort={getAriaSort('delivery_status')}
                        aria-label="배송 상태로 정렬"
                        className="cursor-pointer hover:bg-gray-50 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
                        onClick={() => handleSort('delivery_status')}
                        onKeyDown={(e) => handleSortKeyDown(e, 'delivery_status')}
                      >
                        배송 상태 {getSortIcon('delivery_status')}
                      </TableHead>
                      <TableHead
                        role="button"
                        tabIndex={0}
                        aria-sort={getAriaSort('created_at')}
                        aria-label="주문일시로 정렬"
                        className="cursor-pointer hover:bg-gray-50 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
                        onClick={() => handleSort('created_at')}
                        onKeyDown={(e) => handleSortKeyDown(e, 'created_at')}
                      >
                        주문일시 {getSortIcon('created_at')}
                      </TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOrders.length > 0 ? paginatedOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium text-blue-600">
                          {order.order_number}
                        </TableCell>
                        <TableCell>{order.product_name}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {order.customer_info?.name || order.user_name || '-'}
                            </div>
                            <div className="text-sm text-gray-500">
                              <a href={`tel:${order.customer_info?.phone || order.user_phone}`} className="text-blue-600 hover:underline">
                                {order.customer_info?.phone || order.user_phone || '-'}
                              </a>
                            </div>
                            {(order.customer_info?.address || order.user_address) && (
                              <div className="text-xs text-gray-600 mt-1 max-w-xs">
                                <span className="font-semibold">배송지:</span> {order.customer_info?.postal_code || order.user_postal_code ? `(${order.customer_info?.postal_code || order.user_postal_code}) ` : ''}
                                {order.customer_info?.address || order.user_address}
                                {(order.customer_info?.detailed_address || order.user_detailed_address) && `, ${order.customer_info?.detailed_address || order.user_detailed_address}`}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          <div>
                            ₩{(order.total_amount || 0).toLocaleString()}
                            {order.insurance && order.insurance.price > 0 && (
                              <div className="text-xs text-blue-600 font-normal mt-1">
                                보험: {order.insurance.name} +₩{order.insurance.price.toLocaleString()}
                              </div>
                            )}
                            {order.points_used && order.points_used > 0 && (
                              <div className="text-xs text-red-600 font-normal mt-1">
                                포인트 사용 -₩{order.points_used.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatPaymentMethod(order.payment_method, order.card_company, order.virtual_account_bank)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            order.payment_status === 'completed' ? 'default' :
                            order.payment_status === 'refunded' ? 'destructive' :
                            order.payment_status === 'pending' ? 'secondary' :
                            'destructive'
                          }>
                            {order.payment_status === 'completed' ? '결제완료' :
                             order.payment_status === 'refunded' ? '환불완료' :
                             order.payment_status === 'pending' ? '대기중' : '실패'}
                          </Badge>
                          {order.payment_status === 'refunded' && order.refund_amount && (
                            <div className="text-xs text-red-600 font-semibold mt-1">
                              환불금액: ₩{(order.refund_amount || 0).toLocaleString()}
                            </div>
                          )}
                          {order.refund_reason && (
                            <div className="text-xs text-gray-500 mt-1 max-w-xs">
                              사유: {order.refund_reason}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {getDeliveryStatusBadge(order.delivery_status)}
                          {order.tracking_number && (
                            <div className="text-xs text-gray-500 mt-1">
                              송장: {order.tracking_number}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {order.created_at ? new Date(order.created_at).toLocaleDateString('ko-KR') : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsDetailModalOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              상세보기
                            </Button>
                            {order.delivery_status && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700"
                                onClick={() => {
                                  setSelectedShippingOrder(order);
                                  setIsShippingDialogOpen(true);
                                }}
                              >
                                <Truck className="h-4 w-4 mr-1" />
                                배송 관리
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          주문 데이터가 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="mt-4">
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-500">
                      총 {filteredOrders.length}개의 주문
                      {searchQuery || statusFilter !== 'all' || deliveryStatusFilter !== 'all'
                        ? ` (전체 ${orders.length}개)`
                        : ''}
                    </p>
                  </div>

                  {/* 페이지네이션 */}
                  {totalPages > 1 && (
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
                          페이지 {currentPage} / {totalPages}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        다음
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 배송 관리 다이얼로그 */}
            <ShippingManagementDialog
              open={isShippingDialogOpen}
              onOpenChange={setIsShippingDialogOpen}
              booking={selectedShippingOrder}
              onUpdate={loadDashboardData}
            />

            {/* 주문 상세보기 모달 */}
            {isDetailModalOpen && selectedOrder && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  {/* Modal Header */}
                  <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">주문 상세 정보</h2>
                    <button
                      onClick={() => setIsDetailModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-6 space-y-6">
                    {/* 주문 기본 정보 */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">주문 기본 정보</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">주문번호:</span>
                          <span className="font-medium text-blue-600">{selectedOrder.order_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">상품명:</span>
                          <span className="font-medium">{selectedOrder.product_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">카테고리:</span>
                          <span className="font-medium">{selectedOrder.category || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">주문 상태:</span>
                          <span className="font-medium">
                            {selectedOrder.status === 'pending' ? '대기' :
                             selectedOrder.status === 'confirmed' ? '확정' :
                             selectedOrder.status === 'completed' ? '완료' : '취소'}
                          </span>
                        </div>
                        {selectedOrder.start_date && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">시작일:</span>
                            <span className="font-medium">{new Date(selectedOrder.start_date).toLocaleDateString('ko-KR')}</span>
                          </div>
                        )}
                        {selectedOrder.num_adults !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">인원:</span>
                            <span className="font-medium">{selectedOrder.num_adults}명</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 고객 정보 */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">고객 정보</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">이름:</span>
                          <span className="font-medium">{selectedOrder.customer_info?.name || selectedOrder.user_name || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">이메일:</span>
                          <a
                            href={`mailto:${selectedOrder.customer_info?.email || selectedOrder.user_email}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {selectedOrder.customer_info?.email || selectedOrder.user_email || '-'}
                          </a>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">전화번호:</span>
                          <a
                            href={`tel:${selectedOrder.customer_info?.phone || selectedOrder.user_phone}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {selectedOrder.customer_info?.phone || selectedOrder.user_phone || '-'}
                          </a>
                        </div>
                        {(selectedOrder.customer_info?.address || selectedOrder.user_address) && (
                          <div>
                            <span className="text-gray-600 block mb-1">배송지:</span>
                            <div className="bg-white rounded p-2 text-gray-800">
                              {(selectedOrder.customer_info?.postal_code || selectedOrder.user_postal_code) && (
                                <div className="text-gray-500 text-xs mb-1">
                                  우편번호: {selectedOrder.customer_info?.postal_code || selectedOrder.user_postal_code}
                                </div>
                              )}
                              <div>{selectedOrder.customer_info?.address || selectedOrder.user_address}</div>
                              {(selectedOrder.customer_info?.detailed_address || selectedOrder.user_detailed_address) && (
                                <div className="text-gray-600">{selectedOrder.customer_info?.detailed_address || selectedOrder.user_detailed_address}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 배송 정보 */}
                    {selectedOrder.delivery_status && (
                      <div className="bg-green-50 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">배송 정보</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">배송 상태:</span>
                            <span className="font-medium">
                              {selectedOrder.delivery_status === 'PENDING' ? '배송 준비중' :
                               selectedOrder.delivery_status === 'READY' ? '발송 대기' :
                               selectedOrder.delivery_status === 'SHIPPING' ? '배송중' :
                               selectedOrder.delivery_status === 'DELIVERED' ? '배송 완료' : '취소'}
                            </span>
                          </div>
                          {selectedOrder.tracking_number && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">송장번호:</span>
                              <span className="font-medium">{selectedOrder.tracking_number}</span>
                            </div>
                          )}
                          {selectedOrder.courier_company && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">택배사:</span>
                              <span className="font-medium">{selectedOrder.courier_company}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 결제 정보 */}
                    <div className="bg-purple-50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">결제 정보</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">결제 금액:</span>
                          <span className="text-lg font-bold text-purple-700">₩{(selectedOrder.total_amount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">결제 수단:</span>
                          <span className="font-medium">{formatPaymentMethod(selectedOrder.payment_method, selectedOrder.card_company, selectedOrder.virtual_account_bank)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">결제 상태:</span>
                          <span className="font-medium">
                            {selectedOrder.payment_status === 'completed' ? '결제완료' :
                             selectedOrder.payment_status === 'refunded' ? '환불완료' :
                             selectedOrder.payment_status === 'pending' ? '대기중' : '실패'}
                          </span>
                        </div>
                        {selectedOrder.payment_status === 'refunded' && selectedOrder.refund_amount && (
                          <>
                            <div className="flex justify-between border-t pt-2">
                              <span className="text-gray-600">환불 금액:</span>
                              <span className="font-bold text-red-600">₩{(selectedOrder.refund_amount || 0).toLocaleString()}</span>
                            </div>
                            {selectedOrder.refund_reason && (
                              <div>
                                <span className="text-gray-600 block mb-1">환불 사유:</span>
                                <div className="bg-white rounded p-2 text-gray-800">{selectedOrder.refund_reason}</div>
                              </div>
                            )}
                            {selectedOrder.refunded_at && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">환불 일시:</span>
                                <span className="text-gray-800">{new Date(selectedOrder.refunded_at).toLocaleString('ko-KR')}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* 등록일시 */}
                    <div className="text-center text-sm text-gray-500 pt-2 border-t">
                      주문일시: {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString('ko-KR') : '-'}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="sticky bottom-0 bg-white border-t px-6 py-4">
                    <Button
                      onClick={() => setIsDetailModalOpen(false)}
                      className="w-full"
                    >
                      닫기
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* 내 상품 탭 */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>내 팝업 상품</CardTitle>
                <CardDescription>등록된 상품 {products.length}개</CardDescription>
              </CardHeader>
              <CardContent>
                {products.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>상품명</TableHead>
                        <TableHead>카테고리</TableHead>
                        <TableHead>가격</TableHead>
                        <TableHead>재고</TableHead>
                        <TableHead>상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.title}</TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell>₩{(product.price || 0).toLocaleString()}</TableCell>
                          <TableCell>
                            {product.stock !== undefined ? `${product.stock}개` : '무제한'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={product.is_active ? 'default' : 'secondary'}>
                              {product.is_active ? '판매중' : '판매 중지'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">등록된 상품이 없습니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 설정 탭 */}
          <TabsContent value="settings" className="space-y-4">
            <RefundPolicySettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default PopupVendorDashboard;

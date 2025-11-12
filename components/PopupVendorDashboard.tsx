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
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { ShippingManagementDialog } from './ShippingManagementDialog';

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
  payment_status: string;
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

  // 필터
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState('all');

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

  // 필터 적용
  useEffect(() => {
    applyFilters();
  }, [orders, searchQuery, statusFilter, deliveryStatusFilter]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // 1. 내 상품 목록 조회 (JWT에서 vendorId 자동 추출)
      const productsResponse = await fetch(`/api/vendor/products`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

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

    setFilteredOrders(filtered);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

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
              <div className="text-2xl font-bold">₩{stats.total_sales.toLocaleString()}</div>
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
                    >
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
                </div>

                {/* 주문 테이블 */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>주문번호</TableHead>
                      <TableHead>상품명</TableHead>
                      <TableHead>고객 정보</TableHead>
                      <TableHead>금액</TableHead>
                      <TableHead>결제 상태</TableHead>
                      <TableHead>배송 상태</TableHead>
                      <TableHead>주문일시</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length > 0 ? filteredOrders.map((order) => (
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
                          ₩{order.total_amount?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            order.payment_status === 'completed' ? 'default' :
                            order.payment_status === 'pending' ? 'secondary' :
                            'destructive'
                          }>
                            {order.payment_status === 'completed' ? '결제완료' :
                             order.payment_status === 'pending' ? '대기중' : '실패'}
                          </Badge>
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

                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    총 {filteredOrders.length}개의 주문
                    {searchQuery || statusFilter !== 'all' || deliveryStatusFilter !== 'all'
                      ? ` (전체 ${orders.length}개)`
                      : ''}
                  </p>
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
                          <TableCell>₩{product.price.toLocaleString()}</TableCell>
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
        </Tabs>
      </div>
    </div>
  );
}

export default PopupVendorDashboard;

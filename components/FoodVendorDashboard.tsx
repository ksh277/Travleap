/**
 * 음식점 벤더 전용 대시보드
 *
 * 기능:
 * - 내 음식점 및 메뉴 관리
 * - 주문 목록 조회 및 필터링
 * - 예약 관리
 * - 판매 통계 확인
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
  UtensilsCrossed,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  LogOut,
  Search,
  Filter,
  Loader2,
  ChefHat,
  RefreshCw,
  Download,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Eye,
  X,
  Settings,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { exportToCSV, generateCSVFilename } from '../utils/csv-export';
import { VendorDashboardSkeleton } from './VendorDashboardSkeleton';
import RefundPolicySettings from './vendor/RefundPolicySettings';
import AccountSettings from './vendor/AccountSettings';
import ListingOptionsManager from './vendor/ListingOptionsManager';
import TimeSlotManager from './vendor/TimeSlotManager';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { ImageUploader } from './ui/ImageUploader';

interface Restaurant {
  id: number;
  name: string;
  cuisine_type: string;
  address: string;
  phone: string;
  is_active: boolean;
  price_from?: number;
  description?: string;
  images?: string[];
  location?: string;
  max_capacity?: number;
}

interface MenuItem {
  name: string;
  quantity: number;
  price?: number;
  options?: string;
}

interface Order {
  id: number;
  order_number: string;
  restaurant_name: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  reservation_datetime: string;
  reservation_time?: string;
  party_size: number;
  adults?: number;
  children?: number;
  infants?: number;
  menu_items?: MenuItem[];
  special_requests?: string;
  total_amount: number;
  points_used?: number;
  insurance?: {
    name: string;
    price: number;
  };
  payment_status: string;
  payment_key?: string;
  status: string;
  created_at: string;
}

interface DashboardStats {
  total_revenue: number;
  total_orders: number;
  upcoming_reservations: number;
  completed_orders: number;
}

interface ListingWithStock {
  id: number;
  title: string;
  category: string;
  stock: number | null;
  stock_enabled: boolean;
}

export function FoodVendorDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_revenue: 0,
    total_orders: 0,
    upcoming_reservations: 0,
    completed_orders: 0
  });
  const [listings, setListings] = useState<ListingWithStock[]>([]);

  // 음식점 추가/수정 폼 상태
  const [isAddingRestaurant, setIsAddingRestaurant] = useState(false);
  const [isEditingRestaurant, setIsEditingRestaurant] = useState(false);
  const [editingRestaurantId, setEditingRestaurantId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [restaurantForm, setRestaurantForm] = useState({
    title: '',
    short_description: '',
    description_md: '',
    price_from: 0,
    location: '',
    address: '',
    max_capacity: 20,
    images: [] as string[],
    is_active: true
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // 정렬
  const [sortField, setSortField] = useState<'order_number' | 'restaurant_name' | 'customer_name' | 'total_amount' | 'payment_status' | 'created_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 예약 상세보기 모달
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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

      // 음식점 목록
      const restResponse = await fetch('/api/vendor/food/restaurants', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const restData = await restResponse.json();
      if (restData.success) {
        setRestaurants(restData.data || []);
      }

      // 주문 목록 (API 경로 수정: bookings)
      const ordersResponse = await fetch('/api/vendor/food/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const ordersData = await ordersResponse.json();
      if (ordersData.success) {
        const bookingsData = ordersData.data?.bookings || [];

        // API 데이터를 UI Order 인터페이스에 맞게 매핑
        const ordersList = bookingsData.map((b: any) => ({
          id: b.id,
          order_number: b.booking_number,
          restaurant_name: b.restaurant_name,
          customer_name: b.customer_name,
          customer_email: b.customer_email,
          customer_phone: b.customer_phone,
          reservation_datetime: b.reservation_date + (b.reservation_time ? ' ' + b.reservation_time : ''),
          reservation_time: b.reservation_time,
          party_size: b.party_size || b.num_adults || 1,
          adults: b.adults || b.num_adults,
          children: b.children || b.num_children,
          infants: b.infants || b.num_infants,
          menu_items: b.menu_items || [],
          special_requests: b.special_requests,
          total_amount: b.total_amount,
          payment_status: b.payment_status,
          payment_key: b.payment_key,
          status: b.status,
          created_at: b.created_at
        }));

        setOrders(ordersList);
        setFilteredOrders(ordersList);

        const now = new Date();
        const totalRevenue = ordersList
          .filter((o: Order) => o.payment_status === 'paid')
          .reduce((sum: number, o: Order) => sum + o.total_amount, 0);

        const upcomingReservations = ordersList.filter(
          (o: Order) => o.status === 'confirmed' && new Date(o.reservation_datetime) > now
        ).length;

        const completedOrders = ordersList.filter(
          (o: Order) => o.status === 'completed'
        ).length;

        setStats({
          total_revenue: totalRevenue,
          total_orders: ordersList.length,
          upcoming_reservations: upcomingReservations,
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

  const fetchListingsForStock = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
      if (!token) {
        toast.error('인증 토큰이 없습니다.');
        return;
      }

      const response = await fetch('/api/vendor/listings?category=food&include_stock=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success && result.data) {
        setListings(result.data);
      } else {
        toast.error(result.message || '상품 목록을 불러오는데 실패했습니다.');
      }
    } catch (error: any) {
      console.error('재고 목록 로드 실패:', error);
      toast.error(error.message || '서버 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateListingStock = async (listingId: number, newStock: number) => {
    if (newStock < 0) {
      toast.error('재고는 0 이상이어야 합니다.');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
      if (!token) {
        toast.error('인증 토큰이 없습니다.');
        return;
      }

      const response = await fetch('/api/vendor/stock', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          listing_id: listingId,
          stock: newStock
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('재고가 업데이트되었습니다.');
        fetchListingsForStock(); // 목록 새로고침
      } else {
        toast.error(result.message || '재고 업데이트에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('재고 업데이트 오류:', error);
      toast.error(error.message || '서버 오류가 발생했습니다.');
    }
  };

  // 음식점 폼 초기화
  const resetRestaurantForm = () => {
    setRestaurantForm({
      title: '',
      short_description: '',
      description_md: '',
      price_from: 0,
      location: '',
      address: '',
      max_capacity: 20,
      images: [],
      is_active: true
    });
    setIsAddingRestaurant(false);
    setIsEditingRestaurant(false);
    setEditingRestaurantId(null);
  };

  // 음식점 추가 폼 열기
  const handleAddRestaurant = () => {
    resetRestaurantForm();
    setIsAddingRestaurant(true);
  };

  // 음식점 수정 폼 열기
  const handleEditRestaurant = (restaurant: Restaurant) => {
    setRestaurantForm({
      title: restaurant.name,
      short_description: restaurant.cuisine_type || '',
      description_md: restaurant.description || '',
      price_from: restaurant.price_from || 0,
      location: restaurant.location || '',
      address: restaurant.address || '',
      max_capacity: restaurant.max_capacity || 20,
      images: restaurant.images || [],
      is_active: restaurant.is_active
    });
    setEditingRestaurantId(restaurant.id);
    setIsEditingRestaurant(true);
    setIsAddingRestaurant(true);
  };

  // 음식점 저장 (추가/수정)
  const handleSaveRestaurant = async () => {
    if (!restaurantForm.title.trim()) {
      toast.error('음식점 이름을 입력해주세요.');
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('인증 토큰이 없습니다.');
        return;
      }

      const payload = {
        id: isEditingRestaurant ? editingRestaurantId : undefined,
        title: restaurantForm.title,
        short_description: restaurantForm.short_description,
        description_md: restaurantForm.description_md,
        price_from: restaurantForm.price_from,
        location: restaurantForm.location,
        address: restaurantForm.address,
        max_capacity: restaurantForm.max_capacity,
        images: restaurantForm.images,
        is_active: restaurantForm.is_active,
        category: 'food'
      };

      const response = await fetch('/api/vendor/listings', {
        method: isEditingRestaurant ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'API 오류');
      }

      toast.success(isEditingRestaurant ? '음식점이 수정되었습니다.' : '음식점이 등록되었습니다.');
      resetRestaurantForm();
      loadDashboardData();
    } catch (error: any) {
      console.error('음식점 저장 실패:', error);
      toast.error(error.message || '음식점 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 음식점 삭제
  const handleDeleteRestaurant = async (restaurantId: number) => {
    if (!confirm('정말 이 음식점을 삭제하시겠습니까?\n관련된 메뉴와 예약 정보도 함께 삭제됩니다.')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/vendor/listings?id=${restaurantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        toast.success('음식점이 삭제되었습니다.');
        loadDashboardData();
      } else {
        toast.error(result.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('삭제 오류:', error);
      toast.error('삭제 처리 중 오류가 발생했습니다.');
    }
  };

  const handleRefund = async (order: Order) => {
    if (!order.payment_key) {
      toast.error('결제 정보를 찾을 수 없습니다.');
      return;
    }

    if (!confirm(`${order.restaurant_name} 주문을 환불하시겠습니까?`)) {
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

    if (!confirm(`${order.restaurant_name} 주문을 ${message}하시겠습니까?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/vendor/food/update-status', {
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
        toast.success(`주문이 ${message}되었습니다.`);
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
        o.restaurant_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
        case 'restaurant_name':
          aValue = a.restaurant_name || '';
          bValue = b.restaurant_name || '';
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
      '식당명': order.restaurant_name,
      '고객명': order.customer_name || '-',
      '전화번호': order.customer_phone || '-',
      '이메일': order.customer_email || '-',
      '예약시간': order.reservation_datetime ? new Date(order.reservation_datetime).toLocaleString('ko-KR') : '-',
      '성인': order.adults || 0,
      '어린이': order.children || 0,
      '유아': order.infants || 0,
      '총인원': (order.adults || 0) + (order.children || 0) + (order.infants || 0) || order.party_size || 0,
      '금액': order.total_amount ? `${order.total_amount.toLocaleString()}원` : '-',
      '결제상태': order.payment_status === 'paid' ? '결제완료' : order.payment_status === 'pending' ? '결제대기' : order.payment_status === 'failed' ? '결제실패' : order.payment_status === 'refunded' ? '환불완료' : order.payment_status,
      '예약일시': order.created_at ? new Date(order.created_at).toLocaleString('ko-KR') : '-'
    }));

    const filename = generateCSVFilename('food_orders');
    exportToCSV(exportData, filename);
    toast.success('CSV 파일이 다운로드되었습니다.');
  };

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
    return <VendorDashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <UtensilsCrossed className="h-6 w-6 text-orange-600" />
              음식점 벤더 대시보드
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
              <CardTitle className="text-sm font-medium">전체 주문</CardTitle>
              <ChefHat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_orders}건</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">예정 예약</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcoming_reservations}건</div>
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
            <TabsTrigger value="orders">주문 관리</TabsTrigger>
            <TabsTrigger value="timeslots">시간대 관리</TabsTrigger>
            <TabsTrigger value="menus">메뉴 관리</TabsTrigger>
            <TabsTrigger value="restaurants">음식점 관리</TabsTrigger>
            <TabsTrigger value="stock">재고 관리</TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              설정
            </TabsTrigger>
          </TabsList>

          {/* 주문 관리 탭 */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>주문 목록</CardTitle>
                    <CardDescription>고객 주문 내역을 관리하세요</CardDescription>
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
                          aria-sort={getAriaSort('restaurant_name')}
                          aria-label="음식점으로 정렬"
                          className="cursor-pointer hover:bg-gray-50 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
                          onClick={() => handleSort('restaurant_name')}
                          onKeyDown={(e) => handleSortKeyDown(e, 'restaurant_name')}
                        >
                          음식점 {getSortIcon('restaurant_name')}
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
                        <TableHead>예약일시</TableHead>
                        <TableHead>인원</TableHead>
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
                      {(() => {
                        // 페이지네이션 계산
                        const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

                        if (paginatedOrders.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                                주문 내역이 없습니다.
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return paginatedOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">
                              {order.order_number}
                            </TableCell>
                            <TableCell>{order.restaurant_name}</TableCell>
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
                                {order.menu_items && order.menu_items.length > 0 && (
                                  <div className="text-xs text-gray-700 mt-1 pt-1 border-t">
                                    <span className="font-semibold text-orange-700">주문 메뉴:</span>
                                    <div className="mt-0.5">
                                      {order.menu_items.map((item, idx) => (
                                        <div key={idx} className="text-gray-600">
                                          • {item.name} x{item.quantity}
                                          {item.options && <span className="text-gray-500 ml-1">({item.options})</span>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {order.special_requests && (
                                  <div className="text-xs text-gray-600 italic mt-1">
                                    💬 {order.special_requests}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(order.reservation_datetime).toLocaleString('ko-KR')}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <Users className="h-4 w-4 text-gray-400" />
                                  {(order.adults !== undefined && order.adults > 0) ||
                                   (order.children !== undefined && order.children > 0) ||
                                   (order.infants !== undefined && order.infants > 0) ? (
                                    <div className="text-sm">
                                      {order.adults > 0 && `성인 ${order.adults}명`}
                                      {order.children > 0 && `${order.adults > 0 ? ', ' : ''}어린이 ${order.children}명`}
                                      {order.infants > 0 && `${(order.adults > 0 || order.children > 0) ? ', ' : ''}유아 ${order.infants}명`}
                                    </div>
                                  ) : (
                                    <span>{order.party_size}명</span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">
                              <div>
                                {order.total_amount.toLocaleString()}원
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
                            <TableCell>{getPaymentStatusBadge(order.payment_status)}</TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2 flex-wrap">
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
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </div>

                {/* 페이지네이션 */}
                <div className="mt-4">
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* 시간대 관리 탭 */}
          <TabsContent value="timeslots" className="space-y-4">
            <TimeSlotManager
              listings={restaurants.map(r => ({ id: r.id, title: r.name, category: 'food' }))}
              categoryLabel="예약 시간대"
              defaultCapacity={5}
            />
          </TabsContent>

          {/* 메뉴 관리 탭 */}
          <TabsContent value="menus" className="space-y-4">
            <ListingOptionsManager
              listings={restaurants.map(r => ({ id: r.id, title: r.name, category: 'food' }))}
              defaultOptionType="menu"
              categoryLabel="메뉴"
            />
          </TabsContent>

          {/* 음식점 관리 탭 */}
          <TabsContent value="restaurants" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>내 음식점 관리</CardTitle>
                    <CardDescription>음식점을 추가하고 관리하세요</CardDescription>
                  </div>
                  {!isAddingRestaurant && !isEditingRestaurant && (
                    <Button onClick={handleAddRestaurant} className="gap-2">
                      <Plus className="h-4 w-4" />
                      음식점 추가
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* 음식점 추가/수정 폼 */}
                {(isAddingRestaurant || isEditingRestaurant) && (
                  <div className="mb-6 p-6 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">
                        {isEditingRestaurant ? '음식점 수정' : '새 음식점 추가'}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsAddingRestaurant(false);
                          setIsEditingRestaurant(false);
                          setEditingRestaurantId(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">음식점명 *</Label>
                        <Input
                          id="title"
                          value={restaurantForm.title}
                          onChange={(e) => setRestaurantForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="음식점 이름을 입력하세요"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location">지역</Label>
                        <Input
                          id="location"
                          value={restaurantForm.location}
                          onChange={(e) => setRestaurantForm(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="예: 제주시, 서귀포시"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address">상세 주소</Label>
                        <Input
                          id="address"
                          value={restaurantForm.address}
                          onChange={(e) => setRestaurantForm(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="상세 주소를 입력하세요"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="short_description">간단 설명</Label>
                        <Input
                          id="short_description"
                          value={restaurantForm.short_description}
                          onChange={(e) => setRestaurantForm(prev => ({ ...prev, short_description: e.target.value }))}
                          placeholder="음식점 한줄 소개"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="price_from">가격대 (원)</Label>
                        <Input
                          id="price_from"
                          type="number"
                          value={restaurantForm.price_from}
                          onChange={(e) => setRestaurantForm(prev => ({ ...prev, price_from: parseInt(e.target.value) || 0 }))}
                          placeholder="1인 기준 가격"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="max_capacity">최대 수용 인원</Label>
                        <Input
                          id="max_capacity"
                          type="number"
                          value={restaurantForm.max_capacity}
                          onChange={(e) => setRestaurantForm(prev => ({ ...prev, max_capacity: parseInt(e.target.value) || 0 }))}
                          placeholder="최대 수용 인원"
                        />
                      </div>

                      <div className="space-y-2 flex items-center gap-2 pt-6">
                        <Switch
                          id="is_active"
                          checked={restaurantForm.is_active}
                          onCheckedChange={(checked) => setRestaurantForm(prev => ({ ...prev, is_active: checked }))}
                        />
                        <Label htmlFor="is_active">영업중</Label>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="description_md">상세 설명</Label>
                        <Textarea
                          id="description_md"
                          value={restaurantForm.description_md}
                          onChange={(e) => setRestaurantForm(prev => ({ ...prev, description_md: e.target.value }))}
                          placeholder="음식점 상세 설명을 입력하세요"
                          rows={4}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>음식점 이미지</Label>
                        <ImageUploader
                          images={restaurantForm.images}
                          onImagesChange={(images) => setRestaurantForm(prev => ({ ...prev, images }))}
                          maxImages={5}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddingRestaurant(false);
                          setIsEditingRestaurant(false);
                          setEditingRestaurantId(null);
                        }}
                      >
                        취소
                      </Button>
                      <Button
                        onClick={handleSaveRestaurant}
                        disabled={isSaving || !restaurantForm.title}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            저장 중...
                          </>
                        ) : (
                          isEditingRestaurant ? '수정 완료' : '추가 완료'
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* 음식점 목록 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {restaurants.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      <p>등록된 음식점이 없습니다.</p>
                      <p className="text-sm mt-2">위의 "음식점 추가" 버튼을 눌러 음식점을 등록하세요.</p>
                    </div>
                  ) : (
                    restaurants.map((restaurant) => (
                      <Card key={restaurant.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                              <CardDescription>{restaurant.cuisine_type}</CardDescription>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRestaurant(restaurant)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRestaurant(restaurant.id)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            {restaurant.description && (
                              <p className="text-gray-600 text-xs line-clamp-2">{restaurant.description}</p>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-600">주소</span>
                              <span className="font-medium text-right text-xs">{restaurant.address || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">전화번호</span>
                              <span className="font-medium">{restaurant.phone || '-'}</span>
                            </div>
                            {restaurant.price_from && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">가격대</span>
                                <span className="font-medium">{restaurant.price_from.toLocaleString()}원~</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center mt-3 pt-3 border-t">
                              <span className="text-gray-600">상태</span>
                              <Badge variant={restaurant.is_active ? 'default' : 'secondary'}>
                                {restaurant.is_active ? '영업중' : '휴업'}
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

          {/* 재고 관리 탭 */}
          <TabsContent value="stock" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>📦 음식 상품 재고 관리</CardTitle>
                    <CardDescription>등록된 음식 상품의 재고를 관리하세요</CardDescription>
                  </div>
                  <Button
                    onClick={fetchListingsForStock}
                    disabled={isLoading}
                    variant="outline"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    새로고침
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* 재고 관리 안내 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-blue-900 mb-2">💡 재고 관리 안내</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 재고를 설정하면 예약 시 자동으로 차감됩니다.</li>
                    <li>• 예약 시간이 만료되면 재고가 자동으로 복구됩니다.</li>
                    <li>• 재고가 0이 되면 더 이상 예약을 받을 수 없습니다.</li>
                    <li>• 무제한 재고로 운영하려면 재고를 비워두세요.</li>
                  </ul>
                </div>

                {/* 재고 테이블 */}
                {listings.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p className="mb-4">등록된 음식 상품이 없습니다.</p>
                    <Button onClick={fetchListingsForStock} variant="outline">
                      목록 새로고침
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">ID</TableHead>
                        <TableHead>상품명</TableHead>
                        <TableHead className="w-32 text-center">현재 재고</TableHead>
                        <TableHead className="w-48">재고 수정</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {listings.map((listing) => (
                        <TableRow key={listing.id}>
                          <TableCell className="font-mono text-sm">#{listing.id}</TableCell>
                          <TableCell className="font-medium">{listing.title}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={listing.stock === null ? 'secondary' : listing.stock > 10 ? 'default' : listing.stock > 0 ? 'outline' : 'destructive'}>
                              {listing.stock !== null ? `${listing.stock}개` : '무제한'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                defaultValue={listing.stock || 0}
                                className="w-24"
                                id={`stock-${listing.id}`}
                              />
                              <Button
                                size="sm"
                                onClick={() => {
                                  const input = document.getElementById(`stock-${listing.id}`) as HTMLInputElement;
                                  const newStock = parseInt(input.value);
                                  if (!isNaN(newStock)) {
                                    updateListingStock(listing.id, newStock);
                                  } else {
                                    toast.error('올바른 숫자를 입력하세요.');
                                  }
                                }}
                              >
                                저장
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 설정 탭 */}
          <TabsContent value="settings" className="space-y-4">
            <AccountSettings />
            <RefundPolicySettings />
          </TabsContent>
        </Tabs>
      </div>

      {/* 예약 상세보기 모달 */}
      {isDetailModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">예약 상세 정보</h2>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedOrder(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 예약 기본 정보 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <UtensilsCrossed className="h-5 w-5 text-orange-600" />
                  예약 기본 정보
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">주문번호:</span>
                    <span className="ml-2 text-gray-900 font-mono">{selectedOrder.order_number}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">음식점:</span>
                    <span className="ml-2 text-gray-900">{selectedOrder.restaurant_name}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">예약일시:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(selectedOrder.reservation_datetime).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">인원:</span>
                    <span className="ml-2 text-gray-900">
                      {(selectedOrder.adults !== undefined && selectedOrder.adults > 0) ||
                       (selectedOrder.children !== undefined && selectedOrder.children > 0) ||
                       (selectedOrder.infants !== undefined && selectedOrder.infants > 0) ? (
                        <>
                          {selectedOrder.adults > 0 && `성인 ${selectedOrder.adults}명`}
                          {selectedOrder.children > 0 && `${selectedOrder.adults > 0 ? ', ' : ''}어린이 ${selectedOrder.children}명`}
                          {selectedOrder.infants > 0 && `${(selectedOrder.adults > 0 || selectedOrder.children > 0) ? ', ' : ''}유아 ${selectedOrder.infants}명`}
                        </>
                      ) : (
                        `${selectedOrder.party_size}명`
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">주문상태:</span>
                    <span className="ml-2">{getStatusBadge(selectedOrder.status)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">결제상태:</span>
                    <span className="ml-2">{getPaymentStatusBadge(selectedOrder.payment_status)}</span>
                  </div>
                </div>
              </div>

              {/* 고객 정보 */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  고객 정보
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">이름:</span>
                    <span className="ml-2 text-gray-900">{selectedOrder.customer_name}</span>
                  </div>
                  {selectedOrder.customer_email && (
                    <div>
                      <span className="font-medium text-gray-700">이메일:</span>
                      <a
                        href={`mailto:${selectedOrder.customer_email}`}
                        className="ml-2 text-blue-600 hover:underline"
                      >
                        {selectedOrder.customer_email}
                      </a>
                    </div>
                  )}
                  {selectedOrder.customer_phone && (
                    <div>
                      <span className="font-medium text-gray-700">전화번호:</span>
                      <a
                        href={`tel:${selectedOrder.customer_phone}`}
                        className="ml-2 text-blue-600 hover:underline"
                      >
                        {selectedOrder.customer_phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* 주문 메뉴 */}
              {selectedOrder.menu_items && selectedOrder.menu_items.length > 0 && (
                <div className="bg-orange-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-orange-600" />
                    주문 메뉴
                  </h3>
                  <div className="space-y-2">
                    {selectedOrder.menu_items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-white rounded border">
                        <div>
                          <div className="font-medium text-gray-900">{item.name}</div>
                          {item.options && (
                            <div className="text-xs text-gray-600">옵션: {item.options}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-700">x{item.quantity}</div>
                          {item.price && (
                            <div className="text-sm font-medium text-gray-900">
                              {item.price.toLocaleString()}원
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 특별 요청사항 */}
              {selectedOrder.special_requests && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    💬 특별 요청사항
                  </h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedOrder.special_requests}
                  </p>
                </div>
              )}

              {/* 결제 정보 */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  결제 정보
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">총 금액:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {selectedOrder.total_amount.toLocaleString()}원
                    </span>
                  </div>
                  {selectedOrder.payment_key && (
                    <div>
                      <span className="font-medium text-gray-700">결제 키:</span>
                      <span className="ml-2 text-gray-600 text-xs font-mono">
                        {selectedOrder.payment_key}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 등록일시 */}
              <div className="text-xs text-gray-500 text-center pt-2 border-t">
                등록일시: {new Date(selectedOrder.created_at).toLocaleString('ko-KR')}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedOrder(null);
                }}
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 체험 벤더 전용 대시보드
 *
 * 기능:
 * - 내 체험 프로그램 목록 조회
 * - 예약 목록 조회 및 필터링
 * - 슬롯 관리 (시간대별 예약)
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
import { VendorDashboardSkeleton } from './VendorDashboardSkeleton';
import {
  Sparkles,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  LogOut,
  Search,
  Filter,
  Eye,
  X,
  Loader2,
  Clock,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { exportToCSV, generateCSVFilename } from '../utils/csv-export';

interface Experience {
  id: number;
  title: string;
  description: string;
  duration_minutes: number;
  price_per_person: number;
  max_participants: number;
  is_active: boolean;
}

interface Booking {
  id: number;
  booking_number: string;
  experience_name: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  slot_datetime: string;
  participant_count: number;
  adults?: number;
  children?: number;
  infants?: number;
  total_amount: number;
  payment_status: string;
  payment_key?: string;
  status: string;
  created_at: string;
}

interface DashboardStats {
  total_revenue: number;
  total_bookings: number;
  upcoming_bookings: number;
  completed_bookings: number;
}

export function ExperienceVendorDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  // 상태 관리
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_revenue: 0,
    total_bookings: 0,
    upcoming_bookings: 0,
    completed_bookings: 0
  });

  // 상세보기 모달
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // 필터
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // 정렬
  const [sortField, setSortField] = useState<'booking_number' | 'experience_name' | 'customer_name' | 'total_amount' | 'payment_status' | 'created_at'>('created_at');
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

      // 체험 프로그램 목록
      const expResponse = await fetch('/api/vendor/experience/experiences', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const expData = await expResponse.json();
      if (expData.success) {
        setExperiences(expData.data || []);
      }

      // 예약 목록
      const bookingsResponse = await fetch('/api/vendor/experience/bookings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const bookingsData = await bookingsResponse.json();
      if (bookingsData.success) {
        const bookingsList = (bookingsData.data?.bookings || bookingsData.data || []).map((b: any) => ({
          ...b,
          adults: b.adults,
          children: b.children,
          infants: b.infants
        }));
        setBookings(bookingsList);
        setFilteredBookings(bookingsList);

        // 통계 계산
        const now = new Date();
        const totalRevenue = bookingsList
          .filter((b: Booking) => b.payment_status === 'paid')
          .reduce((sum: number, b: Booking) => sum + b.total_amount, 0);

        const upcomingBookings = bookingsList.filter(
          (b: Booking) => b.status === 'confirmed' && new Date(b.slot_datetime) > now
        ).length;

        const completedBookings = bookingsList.filter(
          (b: Booking) => b.status === 'completed'
        ).length;

        setStats({
          total_revenue: totalRevenue,
          total_bookings: bookingsList.length,
          upcoming_bookings: upcomingBookings,
          completed_bookings: completedBookings
        });
      }
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefund = async (booking: Booking) => {
    if (!booking.payment_key) {
      toast.error('결제 정보를 찾을 수 없습니다.');
      return;
    }

    if (!confirm(`${booking.experience_name} 예약을 환불하시겠습니까?`)) {
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
          paymentKey: booking.payment_key,
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

  const handleUpdateStatus = async (booking: Booking, newStatus: string) => {
    const statusMessages = {
      confirmed: '확정',
      canceled: '취소',
      completed: '완료'
    };

    const message = statusMessages[newStatus as keyof typeof statusMessages] || newStatus;

    if (!confirm(`${booking.experience_name} 예약을 ${message}하시겠습니까?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/vendor/experience/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          booking_id: booking.id,
          status: newStatus
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`예약이 ${message}되었습니다.`);
        loadDashboardData();
      } else {
        toast.error(result.message || `${message} 처리에 실패했습니다.`);
      }
    } catch (error) {
      console.error('상태 변경 오류:', error);
      toast.error('상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 필터링 및 정렬
  useEffect(() => {
    let filtered = [...bookings];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(b =>
        b.booking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.experience_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 정렬 적용
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'booking_number':
          aValue = a.booking_number || '';
          bValue = b.booking_number || '';
          break;
        case 'experience_name':
          aValue = a.experience_name || '';
          bValue = b.experience_name || '';
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

    setFilteredBookings(filtered);
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 리셋
  }, [searchQuery, statusFilter, bookings, sortField, sortDirection]);

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
    const exportData = filteredBookings.map(booking => ({
      '예약번호': booking.booking_number,
      '체험명': booking.experience_name,
      '고객명': booking.customer_name,
      '전화번호': booking.customer_phone || '-',
      '이메일': booking.customer_email || '-',
      '체험일시': booking.slot_datetime ? new Date(booking.slot_datetime).toLocaleString('ko-KR') : '-',
      '인원': booking.participant_count,
      '성인': booking.adults || 0,
      '어린이': booking.children || 0,
      '유아': booking.infants || 0,
      '총인원': (booking.adults || 0) + (booking.children || 0) + (booking.infants || 0),
      '금액': booking.total_amount,
      '결제상태': booking.payment_status === 'paid' ? '결제완료' : booking.payment_status === 'pending' ? '결제대기' : booking.payment_status === 'failed' ? '결제실패' : booking.payment_status === 'refunded' ? '환불완료' : booking.payment_status,
      '예약상태': booking.status === 'pending' ? '대기중' : booking.status === 'confirmed' ? '확정' : booking.status === 'completed' ? '완료' : booking.status === 'canceled' ? '취소' : booking.status,
      '예약일시': booking.created_at ? new Date(booking.created_at).toLocaleString('ko-KR') : '-'
    }));

    const filename = generateCSVFilename('experience_bookings');
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
              <Sparkles className="h-6 w-6 text-purple-600" />
              체험 벤더 대시보드
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
              <CardTitle className="text-sm font-medium">전체 예약</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_bookings}건</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">예정 예약</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcoming_bookings}건</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">완료 예약</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed_bookings}건</div>
            </CardContent>
          </Card>
        </div>

        {/* 메인 컨텐츠 */}
        <Tabs defaultValue="bookings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="bookings">예약 관리</TabsTrigger>
            <TabsTrigger value="experiences">체험 프로그램</TabsTrigger>
          </TabsList>

          {/* 예약 관리 탭 */}
          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>예약 목록</CardTitle>
                    <CardDescription>고객 예약 내역을 관리하세요</CardDescription>
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
                        placeholder="예약번호, 고객명으로 검색..."
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

                {/* 예약 테이블 */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          role="button"
                          tabIndex={0}
                          aria-sort={getAriaSort('booking_number')}
                          aria-label="예약번호로 정렬"
                          className="cursor-pointer hover:bg-gray-50 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
                          onClick={() => handleSort('booking_number')}
                          onKeyDown={(e) => handleSortKeyDown(e, 'booking_number')}
                        >
                          예약번호 {getSortIcon('booking_number')}
                        </TableHead>
                        <TableHead
                          role="button"
                          tabIndex={0}
                          aria-sort={getAriaSort('experience_name')}
                          aria-label="체험명으로 정렬"
                          className="cursor-pointer hover:bg-gray-50 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
                          onClick={() => handleSort('experience_name')}
                          onKeyDown={(e) => handleSortKeyDown(e, 'experience_name')}
                        >
                          체험명 {getSortIcon('experience_name')}
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
                        <TableHead>날짜/시간</TableHead>
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
                        <TableHead>예약상태</TableHead>
                        <TableHead>액션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                            예약 내역이 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (() => {
                          // 페이지네이션 계산
                          const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
                          const startIndex = (currentPage - 1) * itemsPerPage;
                          const paginatedBookings = filteredBookings.slice(startIndex, startIndex + itemsPerPage);

                          return paginatedBookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell className="font-mono text-sm">
                              {booking.booking_number}
                            </TableCell>
                            <TableCell>{booking.experience_name}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{booking.customer_name}</div>
                                {booking.customer_email && (
                                  <div className="text-xs text-gray-500">
                                    <a href={`mailto:${booking.customer_email}`} className="text-blue-600 hover:underline">
                                      {booking.customer_email}
                                    </a>
                                  </div>
                                )}
                                {booking.customer_phone && (
                                  <div className="text-xs text-gray-500">
                                    <a href={`tel:${booking.customer_phone}`} className="text-blue-600 hover:underline">
                                      {booking.customer_phone}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(booking.slot_datetime).toLocaleString('ko-KR')}
                            </TableCell>
                            <TableCell>
                              {(booking.adults !== undefined && booking.adults > 0) ||
                               (booking.children !== undefined && booking.children > 0) ||
                               (booking.infants !== undefined && booking.infants > 0) ? (
                                <div className="text-sm space-y-0.5">
                                  {booking.adults > 0 && <div>성인 {booking.adults}명</div>}
                                  {booking.children > 0 && <div>어린이 {booking.children}명</div>}
                                  {booking.infants > 0 && <div>유아 {booking.infants}명</div>}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Users className="h-4 w-4 text-gray-400" />
                                  {booking.participant_count}명
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {booking.total_amount.toLocaleString()}원
                            </TableCell>
                            <TableCell>{getPaymentStatusBadge(booking.payment_status)}</TableCell>
                            <TableCell>{getStatusBadge(booking.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setIsDetailModalOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  상세보기
                                </Button>
                                {booking.status === 'pending' && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleUpdateStatus(booking, 'confirmed')}
                                  >
                                    확정
                                  </Button>
                                )}
                                {booking.status === 'confirmed' && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleUpdateStatus(booking, 'completed')}
                                  >
                                    완료
                                  </Button>
                                )}
                                {booking.status !== 'canceled' &&
                                 booking.status !== 'completed' && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleUpdateStatus(booking, 'canceled')}
                                  >
                                    취소
                                  </Button>
                                )}
                                {booking.payment_status === 'paid' &&
                                 booking.status !== 'canceled' &&
                                 booking.status !== 'completed' && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRefund(booking)}
                                  >
                                    환불
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ));
                        })()
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* 페이지네이션 */}
                {filteredBookings.length > 0 && (
                  <div className="mt-6">
                    <div className="text-center mb-4">
                      <p className="text-sm text-gray-500">
                        총 {filteredBookings.length}개의 예약
                        {searchQuery || statusFilter !== 'all'
                          ? ` (전체 ${bookings.length}개)`
                          : ''}
                      </p>
                    </div>

                    {Math.ceil(filteredBookings.length / itemsPerPage) > 1 && (
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
                            페이지 {currentPage} / {Math.ceil(filteredBookings.length / itemsPerPage)}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredBookings.length / itemsPerPage), prev + 1))}
                          disabled={currentPage === Math.ceil(filteredBookings.length / itemsPerPage)}
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

          {/* 체험 프로그램 탭 */}
          <TabsContent value="experiences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>내 체험 프로그램</CardTitle>
                <CardDescription>등록된 체험 프로그램 목록</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {experiences.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      등록된 체험 프로그램이 없습니다.
                    </div>
                  ) : (
                    experiences.map((exp) => (
                      <Card key={exp.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-lg">{exp.title}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {exp.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">소요시간</span>
                              <span className="font-medium">{exp.duration_minutes}분</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">가격</span>
                              <span className="font-semibold text-purple-600">
                                {exp.price_per_person.toLocaleString()}원/인
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">최대인원</span>
                              <span className="font-medium">{exp.max_participants}명</span>
                            </div>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t">
                              <span className="text-gray-600">상태</span>
                              <Badge variant={exp.is_active ? 'default' : 'secondary'}>
                                {exp.is_active ? '활성' : '비활성'}
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

        {/* 예약 상세보기 모달 */}
        {isDetailModalOpen && selectedBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">예약 상세 정보</h2>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* 예약 기본 정보 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">예약 기본 정보</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">예약번호:</span>
                      <span className="font-medium text-blue-600">{selectedBooking.booking_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">체험명:</span>
                      <span className="font-medium">{selectedBooking.experience_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">체험 일시:</span>
                      <span className="font-medium">{new Date(selectedBooking.slot_datetime).toLocaleString('ko-KR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">참가 인원:</span>
                      <span className="font-medium">{selectedBooking.participant_count}명</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">예약 상태:</span>
                      <span className="font-medium">
                        {selectedBooking.status === 'pending' ? '대기중' :
                         selectedBooking.status === 'confirmed' ? '확정' :
                         selectedBooking.status === 'completed' ? '완료' : '취소'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 인원 정보 */}
                {((selectedBooking.adults !== undefined && selectedBooking.adults > 0) ||
                  (selectedBooking.children !== undefined && selectedBooking.children > 0) ||
                  (selectedBooking.infants !== undefined && selectedBooking.infants > 0)) && (
                  <div className="bg-orange-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">인원 상세</h3>
                    <div className="space-y-2 text-sm">
                      {selectedBooking.adults > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">성인:</span>
                          <span className="font-medium">{selectedBooking.adults}명</span>
                        </div>
                      )}
                      {selectedBooking.children > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">어린이:</span>
                          <span className="font-medium">{selectedBooking.children}명</span>
                        </div>
                      )}
                      {selectedBooking.infants > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">유아:</span>
                          <span className="font-medium">{selectedBooking.infants}명</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-orange-200">
                        <span className="text-gray-700 font-semibold">총 인원:</span>
                        <span className="font-bold text-orange-700">
                          {(selectedBooking.adults || 0) + (selectedBooking.children || 0) + (selectedBooking.infants || 0)}명
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 고객 정보 */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">고객 정보</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">이름:</span>
                      <span className="font-medium">{selectedBooking.customer_name}</span>
                    </div>
                    {selectedBooking.customer_email && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">이메일:</span>
                        <a
                          href={`mailto:${selectedBooking.customer_email}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {selectedBooking.customer_email}
                        </a>
                      </div>
                    )}
                    {selectedBooking.customer_phone && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">전화번호:</span>
                        <a
                          href={`tel:${selectedBooking.customer_phone}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {selectedBooking.customer_phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* 결제 정보 */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">결제 정보</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">결제 금액:</span>
                      <span className="text-lg font-bold text-purple-700">{selectedBooking.total_amount.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">결제 상태:</span>
                      <span className="font-medium">
                        {selectedBooking.payment_status === 'pending' ? '결제대기' :
                         selectedBooking.payment_status === 'paid' ? '결제완료' :
                         selectedBooking.payment_status === 'failed' ? '결제실패' : '환불완료'}
                      </span>
                    </div>
                    {selectedBooking.payment_key && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">결제 키:</span>
                        <span className="text-xs font-mono text-gray-500">{selectedBooking.payment_key}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 등록일시 */}
                <div className="text-center text-sm text-gray-500 pt-2 border-t">
                  예약일시: {new Date(selectedBooking.created_at).toLocaleString('ko-KR')}
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
      </div>
    </div>
  );
}

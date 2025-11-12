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
  Loader2,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

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

  // 필터
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
        const bookingsList = bookingsData.data || [];
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

  // 필터링
  useEffect(() => {
    let filtered = bookings;

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

    setFilteredBookings(filtered);
  }, [searchQuery, statusFilter, bookings]);

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
                <CardTitle>예약 목록</CardTitle>
                <CardDescription>고객 예약 내역을 관리하세요</CardDescription>
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
                        <TableHead>예약번호</TableHead>
                        <TableHead>체험명</TableHead>
                        <TableHead>고객명</TableHead>
                        <TableHead>날짜/시간</TableHead>
                        <TableHead>인원</TableHead>
                        <TableHead>금액</TableHead>
                        <TableHead>결제상태</TableHead>
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
                        filteredBookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell className="font-mono text-sm">
                              {booking.booking_number}
                            </TableCell>
                            <TableCell>{booking.experience_name}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{booking.customer_name}</div>
                                {booking.customer_email && (
                                  <div className="text-xs text-gray-500">{booking.customer_email}</div>
                                )}
                                {booking.customer_phone && (
                                  <div className="text-xs text-gray-500">{booking.customer_phone}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(booking.slot_datetime).toLocaleString('ko-KR')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-gray-400" />
                                {booking.participant_count}명
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">
                              {booking.total_amount.toLocaleString()}원
                            </TableCell>
                            <TableCell>{getPaymentStatusBadge(booking.payment_status)}</TableCell>
                            <TableCell>{getStatusBadge(booking.status)}</TableCell>
                            <TableCell>
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
      </div>
    </div>
  );
}

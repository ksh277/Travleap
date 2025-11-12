/**
 * 관리자 전용 렌트카 관리 페이지
 *
 * 기능:
 * - 모든 업체 조회
 * - 모든 차량 조회/수정/삭제
 * - 모든 예약 조회
 * - 업체별 필터링
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
  Car,
  Plus,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  Users,
  Loader2,
  Building2,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

interface Vendor {
  id: number;
  name: string;
  contact_email: string;
  contact_phone: string;
  is_verified: boolean;
  vehicle_count: number;
  created_at: string;
}

interface Vehicle {
  id: number;
  vendor_id: number;
  vendor_name: string;
  display_name: string;
  vehicle_class: string;
  seating_capacity: number;
  transmission_type: string;
  fuel_type: string;
  daily_rate_krw: number;
  is_available: boolean;
  created_at: string;
}

interface Booking {
  id: number;
  booking_number: string;
  vehicle_id: number;
  vehicle_name: string;
  vendor_name: string;
  customer_name: string;
  customer_phone: string;
  driver_name: string;
  driver_license_number: string;
  driver_birth_date: string;
  pickup_date: string;
  dropoff_date: string;
  pickup_location: string;
  return_location: string;
  total_amount: number;
  status: string;
  payment_key: string;
  order_id: string;
  has_voucher: boolean;
  voucher_verified_at: string | null;
  picked_up_at: string | null;
  returned_at: string | null;
  created_at: string;
  deposit_id: number | null;
  deposit_status: string | null;
  deposit_amount_krw: number | null;
  refund_amount_krw: number | null;
}

export function AdminRentcarPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState('vendors');
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 권한 체크
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      toast.error('관리자 권한이 필요합니다.');
      navigate('/');
      return;
    }
    loadAllData();
  }, [user]);

  const loadAllData = async () => {
    try {
      setLoading(true);

      // 1. 모든 업체 조회 API
      const vendorsResponse = await fetch('/api/admin/rentcar/vendors');
      const vendorsData = await vendorsResponse.json();
      if (vendorsData.success && vendorsData.data) {
        setVendors(vendorsData.data);
      } else {
        setVendors([]);
      }

      // 2. 모든 차량 조회 API (업체명 포함)
      const vehiclesResponse = await fetch('/api/admin/rentcar/vehicles');
      const vehiclesData = await vehiclesResponse.json();
      if (vehiclesData.success && vehiclesData.data) {
        setVehicles(vehiclesData.data);
      } else {
        setVehicles([]);
      }

      // 3. 모든 예약 조회 API (차량명, 업체명 포함)
      const bookingsResponse = await fetch('/api/admin/rentcar/bookings');
      const bookingsData = await bookingsResponse.json();
      if (bookingsData.success && bookingsData.data) {
        setBookings(bookingsData.data);
      } else {
        setBookings([]);
      }

      console.log(`✅ 관리자 렌트카 데이터 로드 완료`);
      console.log(`   업체: ${vendorsData.data?.length || 0}개`);
      console.log(`   차량: ${vehiclesData.data?.length || 0}대`);
      console.log(`   예약: ${bookingsData.data?.length || 0}건`);

    } catch (error) {
      console.error('데이터 로드 실패:', error);
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: number, vehicleName: string) => {
    if (!confirm(`정말 "${vehicleName}" 차량을 삭제하시겠습니까?`)) return;

    try {
      const response = await fetch(`/api/admin/rentcar/vehicles/${vehicleId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        toast.success('차량이 삭제되었습니다.');
        loadAllData();
      } else {
        toast.error(result.message || '차량 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('차량 삭제 실패:', error);
      toast.error('차량 삭제에 실패했습니다.');
    }
  };

  const handleDeleteVendor = async (vendorId: number, vendorName: string) => {
    if (!confirm(`정말 "${vendorName}" 업체를 삭제하시겠습니까?\n\n⚠️ 해당 업체의 모든 차량도 함께 삭제됩니다.`)) return;

    try {
      const response = await fetch(`http://localhost:3004/api/admin/rentcar/vendors/${vendorId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        toast.success('업체가 삭제되었습니다.');
        loadAllData();
      } else {
        toast.error(result.message || '업체 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('업체 삭제 실패:', error);
      toast.error('업체 삭제에 실패했습니다.');
    }
  };

  // 필터링된 데이터
  const filteredVehicles = selectedVendorId
    ? vehicles.filter(v => v.vendor_id === selectedVendorId)
    : vehicles;

  const filteredBookings = selectedVendorId
    ? bookings.filter(b => {
        const vehicle = vehicles.find(v => v.id === b.vehicle_id);
        return vehicle?.vendor_id === selectedVendorId;
      })
    : bookings;

  // 검색 필터
  const searchedVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.contact_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Car className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">렌트카 관리</h1>
              <p className="text-gray-600 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                관리자 전용
              </p>
            </div>
          </div>
          <Button onClick={() => navigate('/admin')}>
            관리자 대시보드로
          </Button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                전체 업체
              </CardTitle>
              <Building2 className="w-4 h-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{vendors.length}개</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                전체 차량
              </CardTitle>
              <Car className="w-4 h-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{vehicles.length}대</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                전체 예약
              </CardTitle>
              <Calendar className="w-4 h-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{bookings.length}건</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                총 매출
              </CardTitle>
              <DollarSign className="w-4 h-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {bookings
                  .filter(b => b.status === 'completed')
                  .reduce((sum, b) => sum + b.total_amount, 0)
                  .toLocaleString()}원
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 업체 필터 */}
        {selectedVendorId && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    필터: {vendors.find(v => v.id === selectedVendorId)?.name}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedVendorId(null)}
                >
                  필터 해제
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 탭 메뉴 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="vendors">업체 관리</TabsTrigger>
            <TabsTrigger value="vehicles">차량 관리</TabsTrigger>
            <TabsTrigger value="bookings">예약 관리</TabsTrigger>
          </TabsList>

          {/* 업체 관리 */}
          <TabsContent value="vendors">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>업체 목록</CardTitle>
                    <CardDescription>등록된 업체 {searchedVendors.length}개</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="업체명 또는 이메일 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {searchedVendors.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">등록된 업체가 없습니다.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>업체명</TableHead>
                        <TableHead>이메일</TableHead>
                        <TableHead>전화번호</TableHead>
                        <TableHead>차량 수</TableHead>
                        <TableHead>인증 상태</TableHead>
                        <TableHead>가입일</TableHead>
                        <TableHead>관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchedVendors.map((vendor) => (
                        <TableRow key={vendor.id}>
                          <TableCell className="font-medium">
                            {vendor.name}
                          </TableCell>
                          <TableCell>
                            <a href={`mailto:${vendor.contact_email}`} className="text-blue-600 hover:underline">
                              {vendor.contact_email}
                            </a>
                          </TableCell>
                          <TableCell>
                            <a href={`tel:${vendor.contact_phone}`} className="text-blue-600 hover:underline">
                              {vendor.contact_phone}
                            </a>
                          </TableCell>
                          <TableCell>{vendor.vehicle_count}대</TableCell>
                          <TableCell>
                            <Badge variant={vendor.is_verified ? 'default' : 'secondary'}>
                              {vendor.is_verified ? '인증됨' : '미인증'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(vendor.created_at).toLocaleDateString('ko-KR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedVendorId(vendor.id)}
                              >
                                <Filter className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toast.info('수정 기능은 준비 중입니다.')}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteVendor(vendor.id, vendor.name)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
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

          {/* 차량 관리 */}
          <TabsContent value="vehicles">
            <Card>
              <CardHeader>
                <CardTitle>차량 목록</CardTitle>
                <CardDescription>
                  {selectedVendorId
                    ? `${vendors.find(v => v.id === selectedVendorId)?.name} 차량 ${filteredVehicles.length}대`
                    : `전체 차량 ${filteredVehicles.length}대`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredVehicles.length === 0 ? (
                  <div className="text-center py-12">
                    <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">등록된 차량이 없습니다.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>업체</TableHead>
                        <TableHead>차량명</TableHead>
                        <TableHead>등급</TableHead>
                        <TableHead>인승</TableHead>
                        <TableHead>변속기</TableHead>
                        <TableHead>연료</TableHead>
                        <TableHead>일일 요금</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVehicles.map((vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto"
                              onClick={() => setSelectedVendorId(vehicle.vendor_id)}
                            >
                              {vehicle.vendor_name}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">
                            {vehicle.display_name}
                          </TableCell>
                          <TableCell>{vehicle.vehicle_class}</TableCell>
                          <TableCell>{vehicle.seating_capacity}인승</TableCell>
                          <TableCell>{vehicle.transmission_type}</TableCell>
                          <TableCell>{vehicle.fuel_type}</TableCell>
                          <TableCell>{vehicle.daily_rate_krw.toLocaleString()}원</TableCell>
                          <TableCell>
                            <Badge variant={vehicle.is_available ? 'default' : 'secondary'}>
                              {vehicle.is_available ? '예약 가능' : '예약 불가'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toast.info('수정 기능은 준비 중입니다.')}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteVehicle(vehicle.id, vehicle.display_name)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
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

          {/* 예약 관리 */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>예약 내역</CardTitle>
                <CardDescription>
                  {selectedVendorId
                    ? `${vendors.find(v => v.id === selectedVendorId)?.name} 예약 ${filteredBookings.length}건`
                    : `전체 예약 ${filteredBookings.length}건`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">예약 내역이 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredBookings.map((booking) => (
                      <Card key={booking.id} className="border-2">
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* 왼쪽: 예약 기본 정보 */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h3 className="font-bold text-lg">예약 #{booking.booking_number}</h3>
                                <Badge
                                  variant={
                                    booking.status === 'completed'
                                      ? 'default'
                                      : booking.status === 'picked_up'
                                      ? 'secondary'
                                      : booking.status === 'returned'
                                      ? 'secondary'
                                      : booking.status === 'confirmed'
                                      ? 'secondary'
                                      : booking.status === 'canceled'
                                      ? 'destructive'
                                      : 'outline'
                                  }
                                >
                                  {booking.status === 'completed'
                                    ? '완료'
                                    : booking.status === 'picked_up'
                                    ? '대여 중'
                                    : booking.status === 'returned'
                                    ? '반납완료'
                                    : booking.status === 'confirmed'
                                    ? '확정'
                                    : booking.status === 'canceled'
                                    ? '취소됨'
                                    : booking.status === 'pending'
                                    ? '결제 대기'
                                    : booking.status}
                                </Badge>
                              </div>

                              <div className="text-sm space-y-1">
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-4 h-4 text-gray-500" />
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 h-auto font-medium"
                                    onClick={() => {
                                      const vehicle = vehicles.find(v => v.id === booking.vehicle_id);
                                      if (vehicle) setSelectedVendorId(vehicle.vendor_id);
                                    }}
                                  >
                                    {booking.vendor_name}
                                  </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Car className="w-4 h-4 text-gray-500" />
                                  <span className="font-medium">{booking.vehicle_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-gray-500" />
                                  <span>{booking.customer_name} (
                                    <a href={`tel:${booking.customer_phone}`} className="text-blue-600 hover:underline">
                                      {booking.customer_phone}
                                    </a>
                                  )</span>
                                </div>
                              </div>

                              {/* 운전자 정보 */}
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <div className="text-xs font-semibold text-gray-600 mb-2">운전자 정보</div>
                                <div className="text-sm space-y-1">
                                  <div>이름: <span className="font-medium">{booking.driver_name}</span></div>
                                  <div>면허: {booking.driver_license_number}</div>
                                  <div>생년월일: {new Date(booking.driver_birth_date).toLocaleDateString('ko-KR')}</div>
                                </div>
                              </div>
                            </div>

                            {/* 중간: 예약 일정 및 위치 */}
                            <div className="space-y-3">
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <div className="text-xs font-semibold text-blue-700 mb-2">예약 일정</div>
                                <div className="text-sm space-y-1">
                                  <div>
                                    <span className="text-blue-600 font-medium">픽업:</span>{' '}
                                    {new Date(booking.pickup_date).toLocaleString('ko-KR')}
                                  </div>
                                  <div>
                                    <span className="text-blue-600 font-medium">반납:</span>{' '}
                                    {new Date(booking.dropoff_date).toLocaleString('ko-KR')}
                                  </div>
                                </div>
                              </div>

                              <div className="bg-green-50 p-3 rounded-lg">
                                <div className="text-xs font-semibold text-green-700 mb-2">위치 정보</div>
                                <div className="text-sm space-y-1">
                                  <div>픽업: {booking.pickup_location || '미정'}</div>
                                  <div>반납: {booking.return_location || '미정'}</div>
                                </div>
                              </div>

                              {/* 바우처 상태 */}
                              <div className={`p-3 rounded-lg ${booking.has_voucher ? 'bg-purple-50' : 'bg-gray-100'}`}>
                                <div className="text-xs font-semibold mb-2" style={{ color: booking.has_voucher ? '#7c3aed' : '#6b7280' }}>
                                  바우처 상태
                                </div>
                                <div className="text-sm">
                                  {booking.has_voucher ? (
                                    <>
                                      <div className="text-purple-700 font-medium">✓ 발급됨</div>
                                      {booking.voucher_verified_at && (
                                        <div className="text-xs text-purple-600 mt-1">
                                          인증: {new Date(booking.voucher_verified_at).toLocaleString('ko-KR')}
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div className="text-gray-500">미발급</div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* 오른쪽: 결제 및 보증금 정보 */}
                            <div className="space-y-3">
                              <div className="bg-yellow-50 p-3 rounded-lg">
                                <div className="text-xs font-semibold text-yellow-700 mb-2">결제 정보</div>
                                <div className="text-sm space-y-1">
                                  <div className="text-2xl font-bold text-yellow-900">
                                    ₩{booking.total_amount.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-yellow-600">
                                    {booking.payment_key && `결제키: ${booking.payment_key.slice(0, 20)}...`}
                                  </div>
                                </div>
                              </div>

                              {/* 체크인/체크아웃 상태 */}
                              {(booking.picked_up_at || booking.returned_at) && (
                                <div className="bg-teal-50 p-3 rounded-lg">
                                  <div className="text-xs font-semibold text-teal-700 mb-2">체크인/아웃</div>
                                  <div className="text-sm space-y-1">
                                    {booking.picked_up_at && (
                                      <div className="text-teal-700">
                                        ✓ 체크인: {new Date(booking.picked_up_at).toLocaleString('ko-KR')}
                                      </div>
                                    )}
                                    {booking.returned_at && (
                                      <div className="text-teal-700">
                                        ✓ 체크아웃: {new Date(booking.returned_at).toLocaleString('ko-KR')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* 보증금 정보 */}
                              {booking.deposit_id && (
                                <div className="bg-orange-50 p-3 rounded-lg">
                                  <div className="text-xs font-semibold text-orange-700 mb-2">보증금 정보</div>
                                  <div className="text-sm space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span>보증금:</span>
                                      <span className="font-bold text-orange-900">
                                        ₩{booking.deposit_amount_krw?.toLocaleString()}
                                      </span>
                                    </div>
                                    {booking.refund_amount_krw !== null && (
                                      <div className="flex items-center justify-between">
                                        <span>환불액:</span>
                                        <span className="font-bold text-green-600">
                                          ₩{booking.refund_amount_krw?.toLocaleString()}
                                        </span>
                                      </div>
                                    )}
                                    <div className="mt-2">
                                      <Badge variant="outline" className="text-xs">
                                        {booking.deposit_status === 'preauthorized'
                                          ? '사전승인됨'
                                          : booking.deposit_status === 'captured'
                                          ? '결제됨'
                                          : booking.deposit_status === 'refunded'
                                          ? '환불됨'
                                          : booking.deposit_status === 'partial_refunded'
                                          ? '부분 환불됨'
                                          : booking.deposit_status}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="text-xs text-gray-500 pt-2 border-t">
                                예약일: {new Date(booking.created_at).toLocaleString('ko-KR')}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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

export default AdminRentcarPage;

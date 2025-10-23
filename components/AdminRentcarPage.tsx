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
  vehicle_id: number;
  vehicle_name: string;
  vendor_name: string;
  customer_name: string;
  customer_phone: string;
  pickup_date: string;
  dropoff_date: string;
  total_amount: number;
  status: string;
  created_at: string;
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
                          <TableCell>{vendor.contact_email}</TableCell>
                          <TableCell>{vendor.contact_phone}</TableCell>
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>예약번호</TableHead>
                        <TableHead>업체</TableHead>
                        <TableHead>차량</TableHead>
                        <TableHead>고객명</TableHead>
                        <TableHead>연락처</TableHead>
                        <TableHead>픽업일</TableHead>
                        <TableHead>반납일</TableHead>
                        <TableHead>금액</TableHead>
                        <TableHead>상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>#{booking.id}</TableCell>
                          <TableCell>
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto"
                              onClick={() => {
                                const vehicle = vehicles.find(v => v.id === booking.vehicle_id);
                                if (vehicle) setSelectedVendorId(vehicle.vendor_id);
                              }}
                            >
                              {booking.vendor_name}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">
                            {booking.vehicle_name}
                          </TableCell>
                          <TableCell>{booking.customer_name}</TableCell>
                          <TableCell>{booking.customer_phone}</TableCell>
                          <TableCell>
                            {new Date(booking.pickup_date).toLocaleDateString('ko-KR')}
                          </TableCell>
                          <TableCell>
                            {new Date(booking.dropoff_date).toLocaleDateString('ko-KR')}
                          </TableCell>
                          <TableCell>{booking.total_amount.toLocaleString()}원</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                booking.status === 'completed'
                                  ? 'default'
                                  : booking.status === 'confirmed'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {booking.status === 'completed'
                                ? '완료'
                                : booking.status === 'confirmed'
                                ? '확정'
                                : '대기'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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

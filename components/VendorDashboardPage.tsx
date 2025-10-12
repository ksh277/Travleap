/**
 * 렌트카 업체 전용 대시보드
 *
 * 기능:
 * - 자기 업체 차량만 조회/등록/수정/삭제
 * - 자기 업체 예약만 조회
 * - 업체 정보 수정
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
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
  Settings,
  Loader2,
  LogOut,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { db } from '../utils/database-cloud';

interface Vehicle {
  id: number;
  vendor_id: number;
  display_name: string;
  vehicle_class: string;
  seating_capacity: number;
  transmission_type: string;
  fuel_type: string;
  daily_rate_krw: number;
  images: string[];
  is_available: boolean;
  mileage_limit_km: number;
  created_at: string;
}

interface Booking {
  id: number;
  vehicle_id: number;
  vehicle_name: string;
  customer_name: string;
  customer_phone: string;
  pickup_date: string;
  dropoff_date: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface VendorInfo {
  id: number;
  name: string;
  contact_email: string;
  contact_phone: string;
  contact_person: string;
  address: string;
  is_verified: boolean;
  vehicle_count: number;
}

export function VendorDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vendorInfo, setVendorInfo] = useState<VendorInfo | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState('vehicles');

  // 업체 정보 수정 관련 state
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editedInfo, setEditedInfo] = useState<Partial<VendorInfo>>({});

  // 차량 추가 관련 state
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    display_name: '',
    vehicle_class: '중형',
    seating_capacity: 5,
    transmission_type: '자동',
    fuel_type: '가솔린',
    daily_rate_krw: 50000,
    weekly_rate_krw: 300000,
    monthly_rate_krw: 1000000,
    mileage_limit_km: 200,
    excess_mileage_fee_krw: 100,
    is_available: true
  });

  // 업체 정보 로드
  useEffect(() => {
    loadVendorData();
  }, [user?.id]);

  const loadVendorData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // 1. 업체 정보 조회 (user_id로 조회)
      const vendorResult = await db.query(`
        SELECT * FROM rentcar_vendors WHERE user_id = ? LIMIT 1
      `, [user.id]);

      if (vendorResult.length === 0) {
        toast.error('업체 정보를 찾을 수 없습니다.');
        navigate('/login');
        return;
      }

      const vendor = vendorResult[0];
      setVendorInfo(vendor);

      // 2. 자기 업체 차량만 조회
      const vehiclesResult = await db.query(`
        SELECT * FROM rentcar_vehicles
        WHERE vendor_id = ?
        ORDER BY created_at DESC
      `, [vendor.id]);

      setVehicles(vehiclesResult);

      // 3. 자기 업체 예약만 조회
      const bookingsResult = await db.query(`
        SELECT
          rb.id,
          rb.vehicle_id,
          rv.display_name as vehicle_name,
          rb.customer_name,
          rb.customer_phone,
          rb.pickup_date,
          rb.dropoff_date,
          rb.total_amount,
          rb.status,
          rb.created_at
        FROM rentcar_bookings rb
        INNER JOIN rentcar_vehicles rv ON rb.vehicle_id = rv.id
        WHERE rv.vendor_id = ?
        ORDER BY rb.created_at DESC
        LIMIT 50
      `, [vendor.id]);

      setBookings(bookingsResult);

      console.log(`✅ 업체 데이터 로드 완료: ${vendor.name}`);
      console.log(`   차량: ${vehiclesResult.length}대`);
      console.log(`   예약: ${bookingsResult.length}건`);

    } catch (error) {
      console.error('업체 데이터 로드 실패:', error);
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('로그아웃되었습니다.');
  };

  const handleAddVehicle = () => {
    setIsAddingVehicle(true);
    setNewVehicle({
      display_name: '',
      vehicle_class: '중형',
      seating_capacity: 5,
      transmission_type: '자동',
      fuel_type: '가솔린',
      daily_rate_krw: 50000,
      weekly_rate_krw: 300000,
      monthly_rate_krw: 1000000,
      mileage_limit_km: 200,
      excess_mileage_fee_krw: 100,
      is_available: true
    });
  };

  const handleCancelAddVehicle = () => {
    setIsAddingVehicle(false);
  };

  const handleSaveVehicle = async () => {
    if (!vendorInfo?.id) return;

    if (!newVehicle.display_name.trim()) {
      toast.error('차량명을 입력해주세요.');
      return;
    }

    try {
      // rentcar_vehicles 테이블에 삽입
      await db.execute(`
        INSERT INTO rentcar_vehicles (
          vendor_id, display_name, vehicle_class, seating_capacity,
          transmission_type, fuel_type, daily_rate_krw, weekly_rate_krw,
          monthly_rate_krw, mileage_limit_km, excess_mileage_fee_krw,
          is_available, images, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        vendorInfo.id,
        newVehicle.display_name,
        newVehicle.vehicle_class,
        newVehicle.seating_capacity,
        newVehicle.transmission_type,
        newVehicle.fuel_type,
        newVehicle.daily_rate_krw,
        newVehicle.weekly_rate_krw,
        newVehicle.monthly_rate_krw,
        newVehicle.mileage_limit_km,
        newVehicle.excess_mileage_fee_krw,
        newVehicle.is_available ? 1 : 0,
        '[]'
      ]);

      toast.success('차량이 등록되었습니다!');
      setIsAddingVehicle(false);
      loadVendorData(); // 새로고침
    } catch (error) {
      console.error('차량 등록 실패:', error);
      toast.error('차량 등록에 실패했습니다.');
    }
  };

  const handleDeleteVehicle = async (vehicleId: number) => {
    if (!confirm('정말 이 차량을 삭제하시겠습니까?')) return;

    try {
      await db.execute(`
        DELETE FROM rentcar_vehicles WHERE id = ? AND vendor_id = ?
      `, [vehicleId, vendorInfo?.id]);

      toast.success('차량이 삭제되었습니다.');
      loadVendorData();
    } catch (error) {
      console.error('차량 삭제 실패:', error);
      toast.error('차량 삭제에 실패했습니다.');
    }
  };

  const handleEditInfo = () => {
    setIsEditingInfo(true);
    setEditedInfo({
      name: vendorInfo?.name,
      contact_person: vendorInfo?.contact_person,
      contact_email: vendorInfo?.contact_email,
      contact_phone: vendorInfo?.contact_phone,
      address: vendorInfo?.address
    });
  };

  const handleCancelEdit = () => {
    setIsEditingInfo(false);
    setEditedInfo({});
  };

  const handleSaveInfo = async () => {
    if (!vendorInfo?.id) return;

    try {
      await db.execute(`
        UPDATE rentcar_vendors
        SET name = ?, contact_person = ?, contact_email = ?, contact_phone = ?, address = ?
        WHERE id = ?
      `, [
        editedInfo.name,
        editedInfo.contact_person,
        editedInfo.contact_email,
        editedInfo.contact_phone,
        editedInfo.address,
        vendorInfo.id
      ]);

      // Update local state
      setVendorInfo({
        ...vendorInfo,
        name: editedInfo.name!,
        contact_person: editedInfo.contact_person!,
        contact_email: editedInfo.contact_email!,
        contact_phone: editedInfo.contact_phone!,
        address: editedInfo.address!
      });

      setIsEditingInfo(false);
      setEditedInfo({});
      toast.success('업체 정보가 수정되었습니다!');
    } catch (error) {
      console.error('정보 수정 실패:', error);
      toast.error('정보 수정에 실패했습니다.');
    }
  };

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

  if (!vendorInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>업체 정보 없음</CardTitle>
            <CardDescription>업체 정보를 찾을 수 없습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')}>로그인 페이지로</Button>
          </CardContent>
        </Card>
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
              <h1 className="text-3xl font-bold text-gray-900">{vendorInfo.name}</h1>
              <p className="text-gray-600 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                렌트카 업체 대시보드
                {vendorInfo.is_verified && (
                  <Badge variant="default" className="ml-2">인증됨</Badge>
                )}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                등록 차량
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
                총 예약
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
                이번 달 매출
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

        {/* 탭 메뉴 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="vehicles">차량 관리</TabsTrigger>
            <TabsTrigger value="bookings">예약 관리</TabsTrigger>
            <TabsTrigger value="settings">업체 정보</TabsTrigger>
          </TabsList>

          {/* 차량 관리 */}
          <TabsContent value="vehicles">
            {/* 차량 추가 폼 */}
            {isAddingVehicle && (
              <Card className="mb-6 border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle>새 차량 등록</CardTitle>
                  <CardDescription>차량 정보를 입력해주세요</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>차량명 *</Label>
                      <Input
                        placeholder="예: 현대 그랜저 2024"
                        value={newVehicle.display_name}
                        onChange={(e) => setNewVehicle({...newVehicle, display_name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>차량 등급</Label>
                      <select
                        className="w-full p-2 border rounded"
                        value={newVehicle.vehicle_class}
                        onChange={(e) => setNewVehicle({...newVehicle, vehicle_class: e.target.value})}
                      >
                        <option value="경형">경형</option>
                        <option value="소형">소형</option>
                        <option value="준중형">준중형</option>
                        <option value="중형">중형</option>
                        <option value="대형">대형</option>
                        <option value="SUV">SUV</option>
                        <option value="승합">승합</option>
                      </select>
                    </div>
                    <div>
                      <Label>인승</Label>
                      <Input
                        type="number"
                        min="2"
                        max="15"
                        value={newVehicle.seating_capacity}
                        onChange={(e) => setNewVehicle({...newVehicle, seating_capacity: parseInt(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label>변속기</Label>
                      <select
                        className="w-full p-2 border rounded"
                        value={newVehicle.transmission_type}
                        onChange={(e) => setNewVehicle({...newVehicle, transmission_type: e.target.value})}
                      >
                        <option value="자동">자동</option>
                        <option value="수동">수동</option>
                      </select>
                    </div>
                    <div>
                      <Label>연료</Label>
                      <select
                        className="w-full p-2 border rounded"
                        value={newVehicle.fuel_type}
                        onChange={(e) => setNewVehicle({...newVehicle, fuel_type: e.target.value})}
                      >
                        <option value="가솔린">가솔린</option>
                        <option value="디젤">디젤</option>
                        <option value="LPG">LPG</option>
                        <option value="하이브리드">하이브리드</option>
                        <option value="전기">전기</option>
                      </select>
                    </div>
                    <div>
                      <Label>일일 요금 (원)</Label>
                      <Input
                        type="number"
                        min="10000"
                        step="5000"
                        value={newVehicle.daily_rate_krw}
                        onChange={(e) => setNewVehicle({...newVehicle, daily_rate_krw: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <Button onClick={handleSaveVehicle}>
                      <Plus className="w-4 h-4 mr-2" />
                      등록
                    </Button>
                    <Button variant="outline" onClick={handleCancelAddVehicle}>
                      취소
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>차량 목록</CardTitle>
                  <CardDescription>등록된 차량 {vehicles.length}대</CardDescription>
                </div>
                <Button onClick={handleAddVehicle} disabled={isAddingVehicle}>
                  <Plus className="w-4 h-4 mr-2" />
                  차량 추가
                </Button>
              </CardHeader>
              <CardContent>
                {vehicles.length === 0 ? (
                  <div className="text-center py-12">
                    <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">등록된 차량이 없습니다.</p>
                    <Button onClick={handleAddVehicle}>
                      <Plus className="w-4 h-4 mr-2" />
                      첫 차량 등록하기
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                      {vehicles.map((vehicle) => (
                        <TableRow key={vehicle.id}>
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
                                onClick={() => toast.info('수정 기능은 관리자에게 문의하세요.')}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteVehicle(vehicle.id)}
                              >
                                <Trash2 className="w-4 h-4" />
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
                <CardDescription>최근 예약 {bookings.length}건</CardDescription>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">예약 내역이 없습니다.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>예약번호</TableHead>
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
                      {bookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>#{booking.id}</TableCell>
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

          {/* 업체 정보 */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>업체 정보</CardTitle>
                <CardDescription>업체 기본 정보 및 연락처</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>업체명</Label>
                  <Input
                    value={isEditingInfo ? (editedInfo.name || '') : vendorInfo.name}
                    onChange={(e) => setEditedInfo({ ...editedInfo, name: e.target.value })}
                    disabled={!isEditingInfo}
                  />
                </div>
                <div>
                  <Label>담당자</Label>
                  <Input
                    value={isEditingInfo ? (editedInfo.contact_person || '') : vendorInfo.contact_person}
                    onChange={(e) => setEditedInfo({ ...editedInfo, contact_person: e.target.value })}
                    disabled={!isEditingInfo}
                  />
                </div>
                <div>
                  <Label>이메일</Label>
                  <Input
                    value={isEditingInfo ? (editedInfo.contact_email || '') : vendorInfo.contact_email}
                    onChange={(e) => setEditedInfo({ ...editedInfo, contact_email: e.target.value })}
                    disabled={!isEditingInfo}
                  />
                </div>
                <div>
                  <Label>전화번호</Label>
                  <Input
                    value={isEditingInfo ? (editedInfo.contact_phone || '') : vendorInfo.contact_phone}
                    onChange={(e) => setEditedInfo({ ...editedInfo, contact_phone: e.target.value })}
                    disabled={!isEditingInfo}
                  />
                </div>
                <div>
                  <Label>주소</Label>
                  <Textarea
                    value={isEditingInfo ? (editedInfo.address || '') : (vendorInfo.address || '미등록')}
                    onChange={(e) => setEditedInfo({ ...editedInfo, address: e.target.value })}
                    disabled={!isEditingInfo}
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  {!isEditingInfo ? (
                    <Button onClick={handleEditInfo}>
                      <Edit className="w-4 h-4 mr-2" />
                      정보 수정
                    </Button>
                  ) : (
                    <>
                      <Button onClick={handleSaveInfo}>
                        <Settings className="w-4 h-4 mr-2" />
                        저장
                      </Button>
                      <Button variant="outline" onClick={handleCancelEdit}>
                        취소
                      </Button>
                    </>
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

export default VendorDashboardPage;

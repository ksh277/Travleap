import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Car,
  MapPin,
  Building2,
  Calendar,
  DollarSign,
  Users,
  Star,
  Check,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { rentcarApi } from '../../utils/rentcar-api';
import { RentcarAdvancedFeatures } from './RentcarAdvancedFeatures';
import type {
  RentcarVendor,
  RentcarVehicle,
  RentcarLocation,
  RentcarBooking,
  RentcarVehicleFormData,
  RentcarVendorFormData,
  RentcarLocationFormData,
  VehicleClass,
  FuelType,
  TransmissionType
} from '../../types/rentcar';

export const RentcarManagement: React.FC = () => {
  // State for vendors
  const [vendors, setVendors] = useState<RentcarVendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<RentcarVendor | null>(null);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [vendorFormData, setVendorFormData] = useState<RentcarVendorFormData>({
    vendor_code: '',
    business_name: '',
    brand_name: '',
    business_number: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    description: '',
    logo_url: '',
    commission_rate: 15
  });

  // State for vehicles
  const [vehicles, setVehicles] = useState<RentcarVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<RentcarVehicle | null>(null);
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [vehicleFormData, setVehicleFormData] = useState<RentcarVehicleFormData>({
    vehicle_code: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    display_name: '',
    vehicle_class: 'compact',
    vehicle_type: '',
    fuel_type: 'gasoline',
    transmission: 'automatic',
    seating_capacity: 5,
    door_count: 4,
    large_bags: 2,
    small_bags: 2,
    thumbnail_url: '',
    images: [],
    features: [],
    age_requirement: 21,
    license_requirement: '1년 이상',
    mileage_limit_per_day: 200,
    unlimited_mileage: false,
    deposit_amount_krw: 500000,
    smoking_allowed: false,
    daily_rate_krw: 0
  });

  // State for locations
  const [locations, setLocations] = useState<RentcarLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<RentcarLocation | null>(null);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [locationFormData, setLocationFormData] = useState<RentcarLocationFormData>({
    location_code: '',
    name: '',
    location_type: 'airport',
    address: '',
    city: '',
    postal_code: '',
    lat: 0,
    lng: 0,
    phone: '',
    pickup_fee_krw: 0,
    dropoff_fee_krw: 0
  });

  // State for bookings
  const [bookings, setBookings] = useState<RentcarBooking[]>([]);

  // State for filters
  const [vendorFilter, setVendorFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load initial data
  useEffect(() => {
    loadVendors();
    loadVehicles();
    loadBookings();
  }, []);

  // Load vendors
  const loadVendors = async () => {
    const response = await rentcarApi.vendors.getAll();
    if (response.success && response.data) {
      setVendors(response.data);
    }
  };

  // Load vehicles
  const loadVehicles = async () => {
    const response = vendorFilter
      ? await rentcarApi.vehicles.getByVendor(vendorFilter)
      : await rentcarApi.vehicles.getAll();
    if (response.success && response.data) {
      setVehicles(response.data);
    }
  };

  // Load locations for vendor
  const loadLocations = async (vendorId: number) => {
    const response = await rentcarApi.locations.getByVendor(vendorId);
    if (response.success && response.data) {
      setLocations(response.data);
    }
  };

  // Load bookings
  const loadBookings = async () => {
    const response = await rentcarApi.bookings.getAll();
    if (response.success && response.data) {
      setBookings(response.data);
    }
  };

  // Vendor handlers
  const handleOpenVendorDialog = (vendor?: RentcarVendor) => {
    if (vendor) {
      setSelectedVendor(vendor);
      setVendorFormData({
        vendor_code: vendor.vendor_code,
        business_name: vendor.business_name,
        brand_name: vendor.brand_name,
        business_number: vendor.business_number,
        contact_name: vendor.contact_name,
        contact_email: vendor.contact_email,
        contact_phone: vendor.contact_phone,
        description: vendor.description,
        logo_url: vendor.logo_url,
        commission_rate: vendor.commission_rate
      });
    } else {
      setSelectedVendor(null);
      setVendorFormData({
        vendor_code: '',
        business_name: '',
        brand_name: '',
        business_number: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        description: '',
        logo_url: '',
        commission_rate: 15
      });
    }
    setIsVendorDialogOpen(true);
  };

  const handleSaveVendor = async () => {
    try {
      if (selectedVendor) {
        // Update
        const response = await rentcarApi.vendors.update(selectedVendor.id, vendorFormData);
        if (response.success) {
          toast.success('벤더 정보가 수정되었습니다.');
          loadVendors();
          setIsVendorDialogOpen(false);
        } else {
          toast.error(response.error || '벤더 수정에 실패했습니다.');
        }
      } else {
        // Create
        const response = await rentcarApi.vendors.create(vendorFormData);
        if (response.success) {
          toast.success('벤더가 등록되었습니다.');
          loadVendors();
          setIsVendorDialogOpen(false);
        } else {
          toast.error(response.error || '벤더 등록에 실패했습니다.');
        }
      }
    } catch (error) {
      toast.error('오류가 발생했습니다.');
    }
  };

  const handleDeleteVendor = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const response = await rentcarApi.vendors.delete(id);
    if (response.success) {
      toast.success('벤더가 삭제되었습니다.');
      loadVendors();
    } else {
      toast.error(response.error || '벤더 삭제에 실패했습니다.');
    }
  };

  const handleUpdateVendorStatus = async (id: number, status: 'pending' | 'active' | 'suspended') => {
    const response = await rentcarApi.vendors.updateStatus(id, status);
    if (response.success) {
      toast.success('상태가 변경되었습니다.');
      loadVendors();
    } else {
      toast.error(response.error || '상태 변경에 실패했습니다.');
    }
  };

  // Vehicle handlers
  const handleOpenVehicleDialog = (vehicle?: RentcarVehicle) => {
    if (vehicle) {
      setSelectedVehicle(vehicle);
      setVehicleFormData({
        vehicle_code: vehicle.vehicle_code,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        display_name: vehicle.display_name,
        vehicle_class: vehicle.vehicle_class,
        vehicle_type: vehicle.vehicle_type,
        fuel_type: vehicle.fuel_type,
        transmission: vehicle.transmission,
        seating_capacity: vehicle.seating_capacity,
        door_count: vehicle.door_count,
        large_bags: vehicle.large_bags,
        small_bags: vehicle.small_bags,
        thumbnail_url: vehicle.thumbnail_url,
        images: vehicle.images,
        features: vehicle.features,
        age_requirement: vehicle.age_requirement,
        license_requirement: vehicle.license_requirement,
        mileage_limit_per_day: vehicle.mileage_limit_per_day,
        unlimited_mileage: vehicle.unlimited_mileage,
        deposit_amount_krw: vehicle.deposit_amount_krw,
        smoking_allowed: vehicle.smoking_allowed,
        daily_rate_krw: vehicle.daily_rate_krw
      });
    } else {
      setSelectedVehicle(null);
      setVehicleFormData({
        vehicle_code: '',
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        display_name: '',
        vehicle_class: 'compact',
        vehicle_type: '',
        fuel_type: 'gasoline',
        transmission: 'automatic',
        seating_capacity: 5,
        door_count: 4,
        large_bags: 2,
        small_bags: 2,
        thumbnail_url: '',
        images: [],
        features: [],
        age_requirement: 21,
        license_requirement: '1년 이상',
        mileage_limit_per_day: 200,
        unlimited_mileage: false,
        deposit_amount_krw: 500000,
        smoking_allowed: false,
        daily_rate_krw: 0
      });
    }
    setIsVehicleDialogOpen(true);
  };

  const handleSaveVehicle = async () => {
    if (!vendorFilter) {
      toast.error('벤더를 먼저 선택해주세요.');
      return;
    }

    try {
      if (selectedVehicle) {
        // Update
        const response = await rentcarApi.vehicles.update(selectedVehicle.id, vehicleFormData);
        if (response.success) {
          toast.success('차량 정보가 수정되었습니다.');
          loadVehicles();
          setIsVehicleDialogOpen(false);
        } else {
          toast.error(response.error || '차량 수정에 실패했습니다.');
        }
      } else {
        // Create
        const response = await rentcarApi.vehicles.create(vendorFilter, vehicleFormData);
        if (response.success) {
          toast.success('차량이 등록되었습니다.');
          loadVehicles();
          setIsVehicleDialogOpen(false);
        } else {
          toast.error(response.error || '차량 등록에 실패했습니다.');
        }
      }
    } catch (error) {
      toast.error('오류가 발생했습니다.');
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const response = await rentcarApi.vehicles.delete(id);
    if (response.success) {
      toast.success('차량이 삭제되었습니다.');
      loadVehicles();
    } else {
      toast.error(response.error || '차량 삭제에 실패했습니다.');
    }
  };

  const handleToggleVehicleActive = async (id: number, isActive: boolean) => {
    const response = await rentcarApi.vehicles.toggleActive(id, isActive);
    if (response.success) {
      toast.success(isActive ? '차량이 활성화되었습니다.' : '차량이 비활성화되었습니다.');
      loadVehicles();
    } else {
      toast.error(response.error || '상태 변경에 실패했습니다.');
    }
  };

  // Location handlers
  const handleOpenLocationDialog = (location?: RentcarLocation) => {
    if (location) {
      setSelectedLocation(location);
      setLocationFormData({
        location_code: location.location_code,
        name: location.name,
        location_type: location.location_type,
        address: location.address,
        city: location.city,
        postal_code: location.postal_code,
        lat: location.lat,
        lng: location.lng,
        phone: location.phone,
        pickup_fee_krw: location.pickup_fee_krw,
        dropoff_fee_krw: location.dropoff_fee_krw
      });
    } else {
      setSelectedLocation(null);
      setLocationFormData({
        location_code: '',
        name: '',
        location_type: 'airport',
        address: '',
        city: '',
        postal_code: '',
        lat: 0,
        lng: 0,
        phone: '',
        pickup_fee_krw: 0,
        dropoff_fee_krw: 0
      });
    }
    setIsLocationDialogOpen(true);
  };

  const handleSaveLocation = async () => {
    if (!vendorFilter) {
      toast.error('벤더를 먼저 선택해주세요.');
      return;
    }

    try {
      if (selectedLocation) {
        // Update
        const response = await rentcarApi.locations.update(selectedLocation.id, locationFormData);
        if (response.success) {
          toast.success('지점 정보가 수정되었습니다.');
          loadLocations(vendorFilter);
          setIsLocationDialogOpen(false);
        } else {
          toast.error(response.error || '지점 수정에 실패했습니다.');
        }
      } else {
        // Create
        const response = await rentcarApi.locations.create(vendorFilter, locationFormData);
        if (response.success) {
          toast.success('지점이 등록되었습니다.');
          loadLocations(vendorFilter);
          setIsLocationDialogOpen(false);
        } else {
          toast.error(response.error || '지점 등록에 실패했습니다.');
        }
      }
    } catch (error) {
      toast.error('오류가 발생했습니다.');
    }
  };

  const handleDeleteLocation = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const response = await rentcarApi.locations.delete(id);
    if (response.success) {
      toast.success('지점이 삭제되었습니다.');
      if (vendorFilter) loadLocations(vendorFilter);
    } else {
      toast.error(response.error || '지점 삭제에 실패했습니다.');
    }
  };

  // Update booking status
  const handleUpdateBookingStatus = async (id: number, status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled') => {
    const response = await rentcarApi.bookings.updateStatus(id, status);
    if (response.success) {
      toast.success('예약 상태가 변경되었습니다.');
      loadBookings();
    } else {
      toast.error(response.error || '상태 변경에 실패했습니다.');
    }
  };

  // Reload vehicles when vendor filter changes
  useEffect(() => {
    loadVehicles();
    if (vendorFilter) {
      loadLocations(vendorFilter);
    }
  }, [vendorFilter]);

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: '대기중', className: 'bg-yellow-100 text-yellow-800' },
      active: { label: '활성', className: 'bg-green-100 text-green-800' },
      suspended: { label: '정지', className: 'bg-red-100 text-red-800' },
      confirmed: { label: '확정', className: 'bg-blue-100 text-blue-800' },
      in_progress: { label: '진행중', className: 'bg-purple-100 text-purple-800' },
      completed: { label: '완료', className: 'bg-gray-100 text-gray-800' },
      cancelled: { label: '취소', className: 'bg-red-100 text-red-800' }
    };
    const config = statusMap[status] || { label: status, className: '' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // Get vehicle class label
  const getVehicleClassLabel = (vehicleClass: VehicleClass) => {
    const labels: Record<VehicleClass, string> = {
      compact: '소형',
      midsize: '중형',
      fullsize: '대형',
      luxury: '럭셔리',
      suv: 'SUV',
      van: '밴',
      electric: '전기차'
    };
    return labels[vehicleClass] || vehicleClass;
  };

  // Get fuel type label
  const getFuelTypeLabel = (fuelType: FuelType) => {
    const labels: Record<FuelType, string> = {
      gasoline: '가솔린',
      diesel: '디젤',
      electric: '전기',
      hybrid: '하이브리드'
    };
    return labels[fuelType] || fuelType;
  };

  // Get transmission label
  const getTransmissionLabel = (transmission: TransmissionType) => {
    const labels: Record<TransmissionType, string> = {
      manual: '수동',
      automatic: '자동'
    };
    return labels[transmission] || transmission;
  };

  return (
    <Tabs defaultValue="vendors" className="space-y-6">
      <TabsList className="grid grid-cols-5 w-full max-w-3xl">
        <TabsTrigger value="vendors">벤더 관리</TabsTrigger>
        <TabsTrigger value="vehicles">차량 관리</TabsTrigger>
        <TabsTrigger value="locations">지점 관리</TabsTrigger>
        <TabsTrigger value="bookings">예약 관리</TabsTrigger>
        <TabsTrigger value="advanced">고급 기능</TabsTrigger>
      </TabsList>

      {/* 벤더 관리 */}
      <TabsContent value="vendors" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>벤더 관리</CardTitle>
              <Button
                className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                onClick={() => handleOpenVendorDialog()}
              >
                <Plus className="h-4 w-4 mr-2" />
                벤더 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>벤더 코드</TableHead>
                    <TableHead>사업자명</TableHead>
                    <TableHead>브랜드명</TableHead>
                    <TableHead>담당자</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>차량 수</TableHead>
                    <TableHead>예약 수</TableHead>
                    <TableHead>평균 평점</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.vendor_code}</TableCell>
                      <TableCell>{vendor.business_name}</TableCell>
                      <TableCell>{vendor.brand_name || '-'}</TableCell>
                      <TableCell>{vendor.contact_name}</TableCell>
                      <TableCell>{vendor.contact_email}</TableCell>
                      <TableCell>
                        <Select
                          value={vendor.status}
                          onValueChange={(value) => handleUpdateVendorStatus(vendor.id, value as any)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">대기중</SelectItem>
                            <SelectItem value="active">활성</SelectItem>
                            <SelectItem value="suspended">정지</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{vendor.total_vehicles}</TableCell>
                      <TableCell>{vendor.total_bookings}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                          {vendor.average_rating.toFixed(1)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenVendorDialog(vendor)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteVendor(vendor.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* 차량 관리 */}
      <TabsContent value="vehicles" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>차량 관리</CardTitle>
              <div className="flex gap-2">
                <Select
                  value={vendorFilter?.toString() || ''}
                  onValueChange={(value) => setVendorFilter(value ? parseInt(value) : null)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="벤더 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">전체 벤더</SelectItem>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.business_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                  onClick={() => handleOpenVehicleDialog()}
                  disabled={!vendorFilter}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  차량 추가
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>차량 코드</TableHead>
                    <TableHead>차량명</TableHead>
                    <TableHead>브랜드</TableHead>
                    <TableHead>모델</TableHead>
                    <TableHead>연식</TableHead>
                    <TableHead>클래스</TableHead>
                    <TableHead>연료</TableHead>
                    <TableHead>변속기</TableHead>
                    <TableHead>승차인원</TableHead>
                    <TableHead>일일 요금</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">{vehicle.vehicle_code}</TableCell>
                      <TableCell>{vehicle.display_name}</TableCell>
                      <TableCell>{vehicle.brand}</TableCell>
                      <TableCell>{vehicle.model}</TableCell>
                      <TableCell>{vehicle.year}</TableCell>
                      <TableCell>{getVehicleClassLabel(vehicle.vehicle_class)}</TableCell>
                      <TableCell>{getFuelTypeLabel(vehicle.fuel_type)}</TableCell>
                      <TableCell>{getTransmissionLabel(vehicle.transmission)}</TableCell>
                      <TableCell>{vehicle.seating_capacity}명</TableCell>
                      <TableCell>₩{vehicle.daily_rate_krw.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={vehicle.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {vehicle.is_active ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleVehicleActive(vehicle.id, !vehicle.is_active)}
                          >
                            {vehicle.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenVehicleDialog(vehicle)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteVehicle(vehicle.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* 지점 관리 */}
      <TabsContent value="locations" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>지점 관리</CardTitle>
              <div className="flex gap-2">
                <Select
                  value={vendorFilter?.toString() || ''}
                  onValueChange={(value) => setVendorFilter(value ? parseInt(value) : null)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="벤더 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.business_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                  onClick={() => handleOpenLocationDialog()}
                  disabled={!vendorFilter}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  지점 추가
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>지점 코드</TableHead>
                    <TableHead>지점명</TableHead>
                    <TableHead>타입</TableHead>
                    <TableHead>주소</TableHead>
                    <TableHead>도시</TableHead>
                    <TableHead>전화번호</TableHead>
                    <TableHead>픽업 수수료</TableHead>
                    <TableHead>반납 수수료</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.location_code}</TableCell>
                      <TableCell>{location.name}</TableCell>
                      <TableCell>{location.location_type}</TableCell>
                      <TableCell>{location.address}</TableCell>
                      <TableCell>{location.city || '-'}</TableCell>
                      <TableCell>{location.phone || '-'}</TableCell>
                      <TableCell>₩{location.pickup_fee_krw.toLocaleString()}</TableCell>
                      <TableCell>₩{location.dropoff_fee_krw.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={location.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {location.is_active ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenLocationDialog(location)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteLocation(location.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* 예약 관리 */}
      <TabsContent value="bookings" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>예약 관리</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>예약 번호</TableHead>
                    <TableHead>고객명</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>전화번호</TableHead>
                    <TableHead>픽업일</TableHead>
                    <TableHead>반납일</TableHead>
                    <TableHead>렌탈 일수</TableHead>
                    <TableHead>총 금액</TableHead>
                    <TableHead>예약 상태</TableHead>
                    <TableHead>결제 상태</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.booking_number}</TableCell>
                      <TableCell>{booking.customer_name}</TableCell>
                      <TableCell>{booking.customer_email}</TableCell>
                      <TableCell>{booking.customer_phone}</TableCell>
                      <TableCell>{booking.pickup_date}</TableCell>
                      <TableCell>{booking.dropoff_date}</TableCell>
                      <TableCell>{booking.rental_days}일</TableCell>
                      <TableCell>₩{booking.total_krw.toLocaleString()}</TableCell>
                      <TableCell>
                        <Select
                          value={booking.status}
                          onValueChange={(value) => handleUpdateBookingStatus(booking.id, value as any)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">대기중</SelectItem>
                            <SelectItem value="confirmed">확정</SelectItem>
                            <SelectItem value="in_progress">진행중</SelectItem>
                            <SelectItem value="completed">완료</SelectItem>
                            <SelectItem value="cancelled">취소</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{getStatusBadge(booking.payment_status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Vendor Dialog */}
      <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedVendor ? '벤더 수정' : '벤더 추가'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>벤더 코드*</Label>
                <Input
                  value={vendorFormData.vendor_code}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, vendor_code: e.target.value })}
                  placeholder="예: JEJU001"
                />
              </div>
              <div>
                <Label>사업자명*</Label>
                <Input
                  value={vendorFormData.business_name}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, business_name: e.target.value })}
                  placeholder="예: 제주렌트카"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>브랜드명</Label>
                <Input
                  value={vendorFormData.brand_name || ''}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, brand_name: e.target.value })}
                  placeholder="예: JEJU Car Rental"
                />
              </div>
              <div>
                <Label>사업자번호</Label>
                <Input
                  value={vendorFormData.business_number || ''}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, business_number: e.target.value })}
                  placeholder="예: 123-45-67890"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>담당자명*</Label>
                <Input
                  value={vendorFormData.contact_name}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, contact_name: e.target.value })}
                  placeholder="예: 홍길동"
                />
              </div>
              <div>
                <Label>이메일*</Label>
                <Input
                  type="email"
                  value={vendorFormData.contact_email}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, contact_email: e.target.value })}
                  placeholder="예: contact@example.com"
                />
              </div>
              <div>
                <Label>전화번호*</Label>
                <Input
                  value={vendorFormData.contact_phone}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, contact_phone: e.target.value })}
                  placeholder="예: 010-1234-5678"
                />
              </div>
            </div>
            <div>
              <Label>설명</Label>
              <Textarea
                value={vendorFormData.description || ''}
                onChange={(e) => setVendorFormData({ ...vendorFormData, description: e.target.value })}
                placeholder="벤더 설명을 입력하세요"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>로고 URL</Label>
                <Input
                  value={vendorFormData.logo_url || ''}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, logo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>수수료율 (%)</Label>
                <Input
                  type="number"
                  value={vendorFormData.commission_rate || 15}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, commission_rate: parseFloat(e.target.value) })}
                  placeholder="15"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsVendorDialogOpen(false)}>
                취소
              </Button>
              <Button className="bg-[#8B5FBF] hover:bg-[#7A4FB5]" onClick={handleSaveVendor}>
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vehicle Dialog */}
      <Dialog open={isVehicleDialogOpen} onOpenChange={setIsVehicleDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedVehicle ? '차량 수정' : '차량 추가'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>차량 코드*</Label>
                <Input
                  value={vehicleFormData.vehicle_code}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, vehicle_code: e.target.value })}
                  placeholder="예: AVANTE2024"
                />
              </div>
              <div>
                <Label>브랜드*</Label>
                <Input
                  value={vehicleFormData.brand}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, brand: e.target.value })}
                  placeholder="예: 현대"
                />
              </div>
              <div>
                <Label>모델*</Label>
                <Input
                  value={vehicleFormData.model}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, model: e.target.value })}
                  placeholder="예: 아반떼"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>차량 표시명*</Label>
                <Input
                  value={vehicleFormData.display_name}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, display_name: e.target.value })}
                  placeholder="예: 현대 아반떼 2024"
                />
              </div>
              <div>
                <Label>연식*</Label>
                <Input
                  type="number"
                  value={vehicleFormData.year}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, year: parseInt(e.target.value) })}
                  placeholder="2024"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>차량 클래스*</Label>
                <Select
                  value={vehicleFormData.vehicle_class}
                  onValueChange={(value) => setVehicleFormData({ ...vehicleFormData, vehicle_class: value as VehicleClass })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">소형</SelectItem>
                    <SelectItem value="midsize">중형</SelectItem>
                    <SelectItem value="fullsize">대형</SelectItem>
                    <SelectItem value="luxury">럭셔리</SelectItem>
                    <SelectItem value="suv">SUV</SelectItem>
                    <SelectItem value="van">밴</SelectItem>
                    <SelectItem value="electric">전기차</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>연료 타입*</Label>
                <Select
                  value={vehicleFormData.fuel_type}
                  onValueChange={(value) => setVehicleFormData({ ...vehicleFormData, fuel_type: value as FuelType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gasoline">가솔린</SelectItem>
                    <SelectItem value="diesel">디젤</SelectItem>
                    <SelectItem value="electric">전기</SelectItem>
                    <SelectItem value="hybrid">하이브리드</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>변속기*</Label>
                <Select
                  value={vehicleFormData.transmission}
                  onValueChange={(value) => setVehicleFormData({ ...vehicleFormData, transmission: value as TransmissionType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automatic">자동</SelectItem>
                    <SelectItem value="manual">수동</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>승차인원*</Label>
                <Input
                  type="number"
                  value={vehicleFormData.seating_capacity}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, seating_capacity: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>문 개수</Label>
                <Input
                  type="number"
                  value={vehicleFormData.door_count || 4}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, door_count: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>큰 가방</Label>
                <Input
                  type="number"
                  value={vehicleFormData.large_bags || 2}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, large_bags: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>작은 가방</Label>
                <Input
                  type="number"
                  value={vehicleFormData.small_bags || 2}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, small_bags: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>일일 요금 (KRW)*</Label>
                <Input
                  type="number"
                  value={vehicleFormData.daily_rate_krw}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, daily_rate_krw: parseInt(e.target.value) })}
                  placeholder="50000"
                />
              </div>
              <div>
                <Label>보증금 (KRW)</Label>
                <Input
                  type="number"
                  value={vehicleFormData.deposit_amount_krw || 500000}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, deposit_amount_krw: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>썸네일 이미지 URL</Label>
              <Input
                value={vehicleFormData.thumbnail_url || ''}
                onChange={(e) => setVehicleFormData({ ...vehicleFormData, thumbnail_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsVehicleDialogOpen(false)}>
                취소
              </Button>
              <Button className="bg-[#8B5FBF] hover:bg-[#7A4FB5]" onClick={handleSaveVehicle}>
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Location Dialog */}
      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedLocation ? '지점 수정' : '지점 추가'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>지점 코드*</Label>
                <Input
                  value={locationFormData.location_code}
                  onChange={(e) => setLocationFormData({ ...locationFormData, location_code: e.target.value })}
                  placeholder="예: JEJU-AIRPORT"
                />
              </div>
              <div>
                <Label>지점명*</Label>
                <Input
                  value={locationFormData.name}
                  onChange={(e) => setLocationFormData({ ...locationFormData, name: e.target.value })}
                  placeholder="예: 제주공항점"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>지점 타입*</Label>
                <Select
                  value={locationFormData.location_type}
                  onValueChange={(value) => setLocationFormData({ ...locationFormData, location_type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="airport">공항</SelectItem>
                    <SelectItem value="downtown">시내</SelectItem>
                    <SelectItem value="station">역</SelectItem>
                    <SelectItem value="hotel">호텔</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>전화번호</Label>
                <Input
                  value={locationFormData.phone || ''}
                  onChange={(e) => setLocationFormData({ ...locationFormData, phone: e.target.value })}
                  placeholder="예: 064-123-4567"
                />
              </div>
            </div>
            <div>
              <Label>주소*</Label>
              <Input
                value={locationFormData.address}
                onChange={(e) => setLocationFormData({ ...locationFormData, address: e.target.value })}
                placeholder="예: 제주특별자치도 제주시 공항로 2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>도시</Label>
                <Input
                  value={locationFormData.city || ''}
                  onChange={(e) => setLocationFormData({ ...locationFormData, city: e.target.value })}
                  placeholder="예: 제주시"
                />
              </div>
              <div>
                <Label>우편번호</Label>
                <Input
                  value={locationFormData.postal_code || ''}
                  onChange={(e) => setLocationFormData({ ...locationFormData, postal_code: e.target.value })}
                  placeholder="예: 63211"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>픽업 수수료 (KRW)</Label>
                <Input
                  type="number"
                  value={locationFormData.pickup_fee_krw || 0}
                  onChange={(e) => setLocationFormData({ ...locationFormData, pickup_fee_krw: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>반납 수수료 (KRW)</Label>
                <Input
                  type="number"
                  value={locationFormData.dropoff_fee_krw || 0}
                  onChange={(e) => setLocationFormData({ ...locationFormData, dropoff_fee_krw: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsLocationDialogOpen(false)}>
                취소
              </Button>
              <Button className="bg-[#8B5FBF] hover:bg-[#7A4FB5]" onClick={handleSaveLocation}>
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 고급 기능 탭 */}
      <TabsContent value="advanced" className="space-y-6">
        <RentcarAdvancedFeatures vendors={vendors} selectedVendorId={vendorFilter} />
      </TabsContent>
    </Tabs>
  );
};

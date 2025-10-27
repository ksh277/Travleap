/**
 * 렌트카 업체 전용 대시보드 (강화 버전)
 *
 * 새 기능:
 * - 이미지 URL 입력 (최대 5개)
 * - CSV 대량 업로드
 * - 차량 수정 기능
 * - 차량 이용가능 여부 토글
 * - 보험/옵션 정보
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import {
  Car,
  Plus,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  Settings,
  Loader2,
  LogOut,
  Building2,
  Tag,
  Upload,
  X,
  Image as ImageIcon,
  FileUp,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ImageUploader } from './ui/ImageUploader';
import { getGoogleMapsApiKey } from '../utils/env';
import { MapPin } from 'lucide-react';
import { VendorRentcarCalendar } from './VendorRentcarCalendar';

interface Vehicle {
  id: number;
  vendor_id: number;
  display_name: string;
  vehicle_class: string;
  seating_capacity: number;
  transmission_type: string;
  fuel_type: string;
  daily_rate_krw: number;
  hourly_rate_krw?: number;
  weekly_rate_krw: number;
  monthly_rate_krw: number;
  mileage_limit_km: number;
  excess_mileage_fee_krw: number;
  deposit_krw?: number;
  images: string[];
  is_available: boolean;
  created_at: string;
  // 추가 정보
  insurance_included?: boolean;
  insurance_options?: string;
  available_options?: string;
  // 새로운 필드
  pickup_location?: string;
  dropoff_location?: string;
  min_rental_days?: number;
  max_rental_days?: number;
  instant_booking?: boolean;
}

interface Booking {
  id: number;
  booking_number?: string;
  vehicle_id: number;
  vehicle_name: string;
  customer_name: string;
  customer_phone: string;
  pickup_date: string;
  pickup_time?: string;
  dropoff_date: string;
  dropoff_time?: string;
  total_amount: number;
  status: string;
  created_at: string;
  picked_up_at?: string;
  returned_at?: string;
}

interface Insurance {
  id: number;
  vendor_id: number;
  name: string;
  description: string | null;
  coverage_details: string | null;
  hourly_rate_krw: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface VendorInfo {
  id: number;
  name: string;
  contact_email: string;
  contact_phone: string;
  contact_person: string;
  address: string;
  address_detail?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  logo_url?: string;
  images?: string[];
  is_verified: boolean;
  vehicle_count: number;
  cancellation_policy?: string;
  rental_guide?: string;
  cancellation_rules?: {
    '3_days_before': number;
    '1_2_days_before': number;
    'same_day': number;
  };
  check_in_time?: string;
  check_out_time?: string;
}

interface VehicleFormData {
  display_name: string;
  vehicle_class: string;
  seating_capacity: number;
  transmission_type: string;
  fuel_type: string;
  daily_rate_krw: number;
  hourly_rate_krw: number;
  weekly_rate_krw: number;
  monthly_rate_krw: number;
  mileage_limit_km: number;
  excess_mileage_fee_krw: number;
  deposit_krw: number;
  is_available: boolean;
  image_urls: string[];
  insurance_included: boolean;
  insurance_options: string;
  available_options: string;
  // 새로운 필드
  pickup_location: string;
  dropoff_location: string;
  min_rental_days: number;
  max_rental_days: number;
  instant_booking: boolean;
}

export function VendorDashboardPageEnhanced() {
  const navigate = useNavigate();
  const { user, logout, sessionRestored, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vendorInfo, setVendorInfo] = useState<VendorInfo | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [activeTab, setActiveTab] = useState('vehicles');
  const [revenueData, setRevenueData] = useState<Array<{ date: string; revenue: number }>>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 예약 필터
  const [bookingFilters, setBookingFilters] = useState({
    startDate: '',
    endDate: '',
    vehicleId: '',
    status: '',
    searchQuery: ''
  });

  // 업체 정보 수정
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editedInfo, setEditedInfo] = useState<Partial<VendorInfo>>({});
  const [newPassword, setNewPassword] = useState('');

  // 차량 추가/수정
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [vehicleForm, setVehicleForm] = useState<VehicleFormData>({
    display_name: '',
    vehicle_class: '중형',
    seating_capacity: 5,
    transmission_type: '자동',
    fuel_type: '가솔린',
    daily_rate_krw: 50000,
    hourly_rate_krw: 3000,
    weekly_rate_krw: 300000,
    monthly_rate_krw: 1000000,
    mileage_limit_km: 200,
    excess_mileage_fee_krw: 100,
    deposit_krw: 0,
    is_available: true,
    image_urls: [],
    insurance_included: true,
    insurance_options: '자차보험, 대인배상, 대물배상',
    available_options: 'GPS, 블랙박스, 하이패스, 휴대폰 거치대',
    pickup_location: '신안군 렌트카 본점',
    dropoff_location: '신안군 렌트카 본점',
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: true
  });

  // 이미지 URL 입력용
  const [currentImageUrl, setCurrentImageUrl] = useState('');

  // 보험 추가/수정
  const [isAddingInsurance, setIsAddingInsurance] = useState(false);
  const [isEditingInsurance, setIsEditingInsurance] = useState(false);
  const [editingInsuranceId, setEditingInsuranceId] = useState<number | null>(null);
  const [insuranceForm, setInsuranceForm] = useState({
    name: '',
    description: '',
    coverage_details: '',
    hourly_rate_krw: 1000,
    is_active: true,
    display_order: 0
  });

  // 픽업 처리 상태
  const [isProcessingPickup, setIsProcessingPickup] = useState(false);
  const [pickupModalOpen, setPickupModalOpen] = useState(false);
  const [pickupBooking, setPickupBooking] = useState<Booking | null>(null);
  const [pickupForm, setPickupForm] = useState({
    mileage: 0,
    fuel_level: 100,
    damage_notes: ''
  });

  // 반납 처리 상태
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [returnForm, setReturnForm] = useState({
    mileage: 0,
    fuel_level: 100,
    damage_notes: '',
    additional_charges: 0
  });
  const [actualReturnDateTime, setActualReturnDateTime] = useState('');
  const [vendorNote, setVendorNote] = useState('');

  // 픽업 처리 모달 열기
  const handlePickup = (booking: Booking) => {
    setPickupBooking(booking);
    setPickupForm({
      mileage: 0,
      fuel_level: 100,
      damage_notes: ''
    });
    setPickupModalOpen(true);
  };

  // 픽업 처리 제출
  const handleSubmitPickup = async () => {
    if (!pickupBooking) {
      toast.error('예약 정보가 없습니다.');
      return;
    }

    if (pickupForm.mileage <= 0) {
      toast.error('주행거리를 입력해주세요.');
      return;
    }

    setIsProcessingPickup(true);

    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
      if (!token) {
        toast.error('인증 토큰이 없습니다. 다시 로그인해주세요.');
        navigate('/login');
        return;
      }

      const response = await fetch('/api/rentcar/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          booking_number: pickupBooking.booking_number || pickupBooking.id,
          mileage: pickupForm.mileage,
          fuel_level: pickupForm.fuel_level,
          damage_notes: pickupForm.damage_notes || undefined,
          checked_in_by: user?.name || user?.email
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('픽업 처리가 완료되었습니다.');
        setPickupModalOpen(false);
        setPickupBooking(null);
        loadVendorData();
      } else {
        toast.error(result.error || '픽업 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('픽업 처리 오류:', error);
      toast.error('픽업 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessingPickup(false);
    }
  };

  // 반납 처리 모달 열기
  const handleProcessReturn = (booking: Booking) => {
    setSelectedBooking(booking);
    setReturnForm({
      mileage: 0,
      fuel_level: 100,
      damage_notes: '',
      additional_charges: 0
    });
    setReturnModalOpen(true);
  };

  // 반납 처리 제출
  const handleSubmitReturn = async () => {
    if (!selectedBooking) {
      toast.error('예약 정보가 없습니다.');
      return;
    }

    if (returnForm.mileage <= 0) {
      toast.error('반납 시 주행거리를 입력해주세요.');
      return;
    }

    setIsProcessingReturn(true);

    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
      if (!token) {
        toast.error('인증 토큰이 없습니다. 다시 로그인해주세요.');
        navigate('/login');
        return;
      }

      const response = await fetch('/api/rentcar/check-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          booking_number: selectedBooking.booking_number || selectedBooking.id,
          mileage: returnForm.mileage,
          fuel_level: returnForm.fuel_level,
          damage_notes: returnForm.damage_notes || undefined,
          additional_charges: returnForm.additional_charges || 0,
          checked_out_by: user?.name || user?.email
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('반납 처리가 완료되었습니다.');
        setReturnModalOpen(false);
        setSelectedBooking(null);
        loadVendorData();
      } else {
        toast.error(result.error || '반납 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('반납 처리 오류:', error);
      toast.error('반납 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessingReturn(false);
    }
  };

  // 예약 삭제
  const handleDeleteBooking = async (booking: Booking) => {
    if (!confirm(`예약번호 #${booking.id}를 삭제하시겠습니까?\n\n고객: ${booking.customer_name}\n차량: ${booking.vehicle_name}\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
      if (!token) {
        toast.error('인증 토큰이 없습니다.');
        return;
      }

      const response = await fetch(`/api/vendor/bookings?id=${booking.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        toast.success('예약이 삭제되었습니다.');
        loadVendorData();
      } else {
        toast.error(result.message || '예약 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('예약 삭제 오류:', error);
      toast.error('예약 삭제 중 오류가 발생했습니다.');
    }
  };

  // 예약 환불
  const handleRefundBooking = async (booking: Booking) => {
    if (!confirm(`예약번호 #${booking.id}를 환불 처리하시겠습니까?\n\n고객: ${booking.customer_name}\n금액: ₩${booking.total_amount.toLocaleString()}\n\n환불 후 예약 상태가 'cancelled'로 변경됩니다.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
      if (!token) {
        toast.error('인증 토큰이 없습니다.');
        return;
      }

      const response = await fetch(`/api/vendor/bookings?id=${booking.id}&action=refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          refund_amount: booking.total_amount,
          refund_reason: '벤더 요청 환불'
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('환불 처리가 완료되었습니다.');
        loadVendorData();
      } else {
        toast.error(result.message || '환불 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('환불 처리 오류:', error);
      toast.error('환불 처리 중 오류가 발생했습니다.');
    }
  };

  // 업체 정보 로드
  useEffect(() => {
    // 🔒 보안: 세션 복원 완료 후에만 데이터 로드
    if (!sessionRestored) return;
    loadVendorData();
  }, [user?.id, sessionRestored]);

  const loadVendorData = async () => {
    if (!user?.id) {
      console.log('⚠️ user.id 없음 - 데이터 로드 스킵');
      return;
    }

    try {
      setLoading(true);

      // JWT 토큰 가져오기
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];

      if (!token) {
        toast.error('인증 토큰이 없습니다. 다시 로그인해주세요.');
        navigate('/login');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // 1. 업체 정보 조회 API - 관리자 페이지와 동일한 /api/vendors 사용
      const vendorResponse = await fetch(`/api/vendors`, { headers });
      const vendorData = await vendorResponse.json();

      console.log('🔍 [DEBUG] API Response:', vendorData);
      console.log('🔍 [DEBUG] User Email:', user.email);

      if (!vendorData.success || !vendorData.data) {
        console.error('❌ API 응답 실패:', vendorData);
        toast.error('업체 정보를 찾을 수 없습니다.');
        navigate('/login');
        return;
      }

      console.log('🔍 [DEBUG] 전체 벤더 목록:', vendorData.data);
      console.log('🔍 [DEBUG] 벤더 이메일들:', vendorData.data.map((v: any) => v.contact_email));

      // 현재 로그인한 사용자의 이메일로 벤더 찾기
      const vendor = vendorData.data.find((v: any) => v.contact_email === user.email);

      console.log('🔍 [DEBUG] 매칭된 벤더:', vendor);

      if (!vendor) {
        console.error('❌ 벤더를 찾을 수 없습니다. User email:', user.email);
        toast.error(`해당 이메일(${user.email})의 업체 정보를 찾을 수 없습니다.`);
        navigate('/login');
        return;
      }

      console.log('✅ 벤더 정보 설정:', vendor);
      setVendorInfo(vendor);

      const vendorId = vendor.id; // 벤더 ID 가져오기
      console.log('🔍 [DEBUG] Vendor ID:', vendorId);

      // 2. 차량 목록 조회 API - JWT 토큰으로 인증
      const vehiclesResponse = await fetch(`/api/vendor/vehicles`, { headers });
      const vehiclesData = await vehiclesResponse.json();

      console.log('🔍 [DEBUG] 차량 API 응답:', vehiclesData);

      if (vehiclesData.success && vehiclesData.data) {
        // Parse images from JSON string to array
        const parsedVehicles = vehiclesData.data.map((v: any) => ({
          ...v,
          images: typeof v.images === 'string' ? JSON.parse(v.images) : v.images
        }));
        setVehicles(parsedVehicles);
        console.log('✅ 차량 데이터 로드 완료:', parsedVehicles.length, '대');
      } else {
        console.warn('⚠️ 차량 데이터 없음');
        setVehicles([]);
      }

      // 3. 예약 목록 조회 API - JWT 토큰으로 인증
      const bookingsResponse = await fetch(`/api/vendor/bookings`, { headers });
      const bookingsData = await bookingsResponse.json();

      console.log('🔍 [DEBUG] 예약 API 응답:', bookingsData);

      if (bookingsData.success && bookingsData.data) {
        setBookings(bookingsData.data);
        setFilteredBookings(bookingsData.data);
        console.log('✅ 예약 데이터 로드 완료:', bookingsData.data.length, '건');
      } else {
        console.warn('⚠️ 예약 데이터 없음');
        setBookings([]);
        setFilteredBookings([]);
      }

      // 4. 매출 통계 조회 API - JWT 토큰으로 인증
      const revenueResponse = await fetch(`/api/vendor/revenue`, { headers });
      const revenueData = await revenueResponse.json();

      console.log('🔍 [DEBUG] 매출 API 응답:', revenueData);

      if (revenueData.success && revenueData.data) {
        setRevenueData(revenueData.data.map((r: any) => ({
          date: new Date(r.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
          revenue: r.revenue
        })));
        console.log('✅ 매출 데이터 로드 완료');
      } else {
        console.warn('⚠️ 매출 데이터 없음');
        setRevenueData([]);
      }

      // 5. 보험 상품 목록 조회 API - JWT 토큰으로 인증
      const insuranceResponse = await fetch(`/api/vendor/insurance`, { headers });
      const insuranceData = await insuranceResponse.json();

      console.log('🔍 [DEBUG] 보험 API 응답:', insuranceData);

      if (insuranceData.success && insuranceData.data) {
        setInsurances(insuranceData.data);
        console.log('✅ 보험 데이터 로드 완료:', insuranceData.data.length, '개');
      } else {
        console.warn('⚠️ 보험 데이터 없음');
        setInsurances([]);
      }

      console.log(`✅ 업체 데이터 로드 완료: ${vendor.name}`);
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

  const resetVehicleForm = () => {
    setVehicleForm({
      display_name: '',
      vehicle_class: '중형',
      seating_capacity: 5,
      transmission_type: '자동',
      fuel_type: '가솔린',
      daily_rate_krw: 50000,
      hourly_rate_krw: 3000,
      weekly_rate_krw: 300000,
      monthly_rate_krw: 1000000,
      mileage_limit_km: 200,
      excess_mileage_fee_krw: 100,
      deposit_krw: 0,
      is_available: true,
      image_urls: [],
      insurance_included: true,
      insurance_options: '자차보험, 대인배상, 대물배상',
      available_options: 'GPS, 블랙박스, 하이패스, 휴대폰 거치대',
      pickup_location: '신안군 렌트카 본점',
      dropoff_location: '신안군 렌트카 본점',
      min_rental_days: 1,
      max_rental_days: 30,
      instant_booking: true
    });
    setCurrentImageUrl('');
  };

  const handleAddVehicle = () => {
    resetVehicleForm();
    setIsAddingVehicle(true);
    setIsEditingVehicle(false);
    setEditingVehicleId(null);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setVehicleForm({
      display_name: vehicle.display_name,
      vehicle_class: vehicle.vehicle_class,
      seating_capacity: vehicle.seating_capacity,
      transmission_type: vehicle.transmission_type,
      fuel_type: vehicle.fuel_type,
      daily_rate_krw: vehicle.daily_rate_krw,
      hourly_rate_krw: vehicle.hourly_rate_krw || Math.round(((vehicle.daily_rate_krw / 24) * 1.2) / 1000) * 1000,
      weekly_rate_krw: vehicle.weekly_rate_krw,
      monthly_rate_krw: vehicle.monthly_rate_krw,
      mileage_limit_km: vehicle.mileage_limit_km,
      excess_mileage_fee_krw: vehicle.excess_mileage_fee_krw,
      deposit_krw: vehicle.deposit_krw || 0,
      is_available: vehicle.is_available,
      image_urls: Array.isArray(vehicle.images) ? vehicle.images : [],
      insurance_included: vehicle.insurance_included || true,
      insurance_options: vehicle.insurance_options || '자차보험, 대인배상, 대물배상',
      available_options: vehicle.available_options || 'GPS, 블랙박스',
      pickup_location: vehicle.pickup_location || '신안군 렌트카 본점',
      dropoff_location: vehicle.dropoff_location || '신안군 렌트카 본점',
      min_rental_days: vehicle.min_rental_days || 1,
      max_rental_days: vehicle.max_rental_days || 30,
      instant_booking: vehicle.instant_booking !== undefined ? vehicle.instant_booking : true
    });
    setEditingVehicleId(vehicle.id);
    setIsEditingVehicle(true);
    setIsAddingVehicle(true);
  };

  const handleCancelForm = () => {
    setIsAddingVehicle(false);
    setIsEditingVehicle(false);
    setEditingVehicleId(null);
    resetVehicleForm();
  };

  const addImageUrl = () => {
    if (!currentImageUrl.trim()) {
      toast.error('이미지 URL을 입력해주세요.');
      return;
    }

    if (vehicleForm.image_urls.length >= 5) {
      toast.error('최대 5개까지 이미지를 추가할 수 있습니다.');
      return;
    }

    setVehicleForm({
      ...vehicleForm,
      image_urls: [...vehicleForm.image_urls, currentImageUrl.trim()]
    });
    setCurrentImageUrl('');
  };

  const removeImageUrl = (index: number) => {
    setVehicleForm({
      ...vehicleForm,
      image_urls: vehicleForm.image_urls.filter((_, i) => i !== index)
    });
  };

  const handleSaveVehicle = async () => {
    if (!vendorInfo?.id || !user?.id) return;

    if (!vehicleForm.display_name.trim()) {
      toast.error('차량명을 입력해주세요.');
      return;
    }

    try {
      // JWT 토큰 가져오기
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];

      if (!token) {
        toast.error('인증 토큰이 없습니다. 다시 로그인해주세요.');
        navigate('/login');
        return;
      }

      const image_urls = vehicleForm.image_urls.length > 0
        ? vehicleForm.image_urls
        : [
            'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop'
          ];

      if (isEditingVehicle && editingVehicleId) {
        // 수정 - PUT API
        const updatePayload = {
          id: editingVehicleId,
          ...vehicleForm,
          image_urls
        };

        console.log('🚗 [차량 수정] 전송 데이터:', updatePayload);

        const response = await fetch(`/api/vendor/vehicles`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updatePayload)
        });

        const result = await response.json();
        console.log('🚗 [차량 수정] 응답:', result);

        if (result.success) {
          toast.success('차량이 수정되었습니다!');
        } else {
          toast.error(result.message || '차량 수정에 실패했습니다.');
          return;
        }
      } else {
        // 신규 등록 - POST API
        const response = await fetch('/api/vendor/vehicles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...vehicleForm,
            image_urls
          })
        });

        const result = await response.json();
        if (result.success) {
          toast.success('차량이 등록되었습니다!');
        } else {
          toast.error(result.message || '차량 등록에 실패했습니다.');
          return;
        }
      }

      handleCancelForm();
      loadVendorData();
    } catch (error) {
      console.error('차량 저장 실패:', error);
      toast.error('차량 저장에 실패했습니다.');
    }
  };

  const handleDeleteVehicle = async (vehicleId: number) => {
    if (!confirm('정말 이 차량을 삭제하시겠습니까?')) return;
    if (!user?.id) return;

    try {
      // JWT 토큰 가져오기
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];

      if (!token) {
        toast.error('인증 토큰이 없습니다. 다시 로그인해주세요.');
        navigate('/login');
        return;
      }

      // DELETE API
      const response = await fetch(`/api/vendor/vehicles?id=${vehicleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        toast.success('차량이 삭제되었습니다.');
        loadVendorData();
      } else {
        toast.error(result.message || '차량 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('차량 삭제 실패:', error);
      toast.error('차량 삭제에 실패했습니다.');
    }
  };

  const toggleVehicleAvailability = async (vehicleId: number, currentStatus: boolean) => {
    const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
    if (!token) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    try {
      // PUT API - Toggle availability
      const response = await fetch(`/api/vendor/vehicles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: vehicleId,
          is_available: !currentStatus
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(currentStatus ? '차량이 예약 불가로 변경되었습니다.' : '차량이 예약 가능으로 변경되었습니다.');
        loadVendorData();
      } else {
        toast.error(result.message || '상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('상태 변경 실패:', error);
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  // 보험 CRUD
  const handleAddInsurance = () => {
    setInsuranceForm({
      name: '',
      description: '',
      coverage_details: '',
      hourly_rate_krw: 1000,
      is_active: true,
      display_order: insurances.length + 1
    });
    setIsEditingInsurance(false);
    setEditingInsuranceId(null);
    setIsAddingInsurance(true);
  };

  const handleEditInsurance = (insurance: Insurance) => {
    setInsuranceForm({
      name: insurance.name,
      description: insurance.description || '',
      coverage_details: insurance.coverage_details || '',
      hourly_rate_krw: insurance.hourly_rate_krw,
      is_active: insurance.is_active,
      display_order: insurance.display_order
    });
    setIsEditingInsurance(true);
    setEditingInsuranceId(insurance.id);
    setIsAddingInsurance(true);
  };

  const handleSaveInsurance = async () => {
    if (!insuranceForm.name || insuranceForm.hourly_rate_krw <= 0) {
      toast.error('보험 상품명과 시간당 요금은 필수 항목입니다.');
      return;
    }

    const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
    if (!token) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    try {
      const url = '/api/vendor/insurance';
      const method = isEditingInsurance ? 'PUT' : 'POST';
      const body = isEditingInsurance
        ? { ...insuranceForm, id: editingInsuranceId }
        : insuranceForm;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      if (result.success) {
        toast.success(isEditingInsurance ? '보험 상품이 수정되었습니다.' : '보험 상품이 추가되었습니다.');
        setIsAddingInsurance(false);
        loadVendorData();
      } else {
        toast.error(result.message || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('보험 저장 실패:', error);
      toast.error('저장에 실패했습니다.');
    }
  };

  const handleDeleteInsurance = async (insuranceId: number) => {
    if (!confirm('정말 이 보험 상품을 삭제하시겠습니까?')) return;

    const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
    if (!token) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    try {
      const response = await fetch(`/api/vendor/insurance?id=${insuranceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        toast.success('보험 상품이 삭제되었습니다.');
        loadVendorData();
      } else {
        toast.error(result.message || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('보험 삭제 실패:', error);
      toast.error('삭제에 실패했습니다.');
    }
  };

  const toggleInsuranceActive = async (insuranceId: number, currentStatus: boolean) => {
    const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
    if (!token) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    try {
      const response = await fetch(`/api/vendor/insurance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: insuranceId,
          is_active: !currentStatus
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(currentStatus ? '보험 상품이 비활성화되었습니다.' : '보험 상품이 활성화되었습니다.');
        loadVendorData();
      } else {
        toast.error(result.message || '상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('상태 변경 실패:', error);
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  // CSV 업로드
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('CSV 파일만 업로드할 수 있습니다.');
      return;
    }

    try {
      const text = await file.text();
      // BOM 제거 (UTF-8 BOM: \uFEFF)
      const cleanedText = text.replace(/^\uFEFF/, '');
      const lines = cleanedText.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        toast.error('CSV 파일에 데이터가 없습니다.');
        return;
      }

      // 헤더 자동 감지 (컬럼 순서 자유롭게)
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      // 컬럼 이름 매핑 (여러 가지 가능한 이름 허용)
      const columnMap = {
        display_name: ['차량명', '차량이름', '모델명', '차종명', 'name', 'vehicle_name', 'model'],
        brand: ['제조사', '브랜드', 'brand', 'manufacturer', '메이커'],
        model: ['모델', 'model', '차량모델'],
        year: ['연식', '년식', 'year', '제조년도', '제조연도'],
        vehicle_class: ['차량등급', '등급', '차종', 'class', 'type', '클래스'],
        seating_capacity: ['승차인원', '인승', '좌석수', 'seats', 'capacity', '탑승인원'],
        transmission_type: ['변속기', '기어', 'transmission', '트랜스미션'],
        fuel_type: ['연료', '연료타입', 'fuel', '연료종류'],
        daily_rate_krw: ['일일요금', '1일요금', '일요금', 'daily_rate', 'price', '하루요금', '데일리요금'],
        weekly_rate_krw: ['주간요금', '주요금', 'weekly_rate', '주중요금', '7일요금'],
        monthly_rate_krw: ['월간요금', '월요금', 'monthly_rate', '한달요금', '30일요금'],
        mileage_limit_km: ['주행제한', '주행거리제한', '주행제한(km)', '주행제한km', 'mileage_limit', 'mileage'],
        excess_mileage_fee_krw: ['초과요금', '초과비용', 'excess_fee', 'overage_fee', '초과주행요금'],
        deposit_krw: ['보증금', '보증금액', 'deposit', '예치금', '보증비']
      };

      // 헤더에서 각 필드의 인덱스 찾기
      const findColumnIndex = (field: string): number => {
        const possibleNames = columnMap[field].map(n => n.toLowerCase());
        return headers.findIndex(h => possibleNames.includes(h));
      };

      const colIndexes = {
        display_name: findColumnIndex('display_name'),
        brand: findColumnIndex('brand'),
        model: findColumnIndex('model'),
        year: findColumnIndex('year'),
        vehicle_class: findColumnIndex('vehicle_class'),
        seating_capacity: findColumnIndex('seating_capacity'),
        transmission_type: findColumnIndex('transmission_type'),
        fuel_type: findColumnIndex('fuel_type'),
        daily_rate_krw: findColumnIndex('daily_rate_krw'),
        weekly_rate_krw: findColumnIndex('weekly_rate_krw'),
        monthly_rate_krw: findColumnIndex('monthly_rate_krw'),
        mileage_limit_km: findColumnIndex('mileage_limit_km'),
        excess_mileage_fee_krw: findColumnIndex('excess_mileage_fee_krw'),
        deposit_krw: findColumnIndex('deposit_krw')
      };

      // 필수 컬럼 체크
      if (colIndexes.display_name === -1 || colIndexes.daily_rate_krw === -1) {
        toast.error('필수 컬럼이 없습니다. "차량명"과 "일일요금" 컬럼은 반드시 필요합니다.');
        return;
      }

      const dataLines = lines.slice(1);

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      const validVehicleClasses = ['소형', '중형', '대형', '럭셔리', 'SUV', '밴'];
      const validTransmissions = ['자동', '수동'];
      const validFuelTypes = ['가솔린', '디젤', '하이브리드', '전기'];

      toast.info(`CSV 분석 중... (총 ${dataLines.length}건)`);

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        const values = line.split(',').map(v => v.trim());
        const rowNumber = i + 2; // CSV row number (header is row 1)

        try {

          // 헤더 인덱스를 사용해 데이터 추출
          const displayName = values[colIndexes.display_name]?.trim();
          if (!displayName) {
            errors.push(`${rowNumber}행: 차량명이 비어있습니다`);
            errorCount++;
            continue;
          }

          // 차량등급 검증
          const vehicleClass = colIndexes.vehicle_class >= 0 ? (values[colIndexes.vehicle_class]?.trim() || '중형') : '중형';
          if (!validVehicleClasses.includes(vehicleClass)) {
            errors.push(`${rowNumber}행: 잘못된 차량등급 "${vehicleClass}" (허용: ${validVehicleClasses.join(', ')})`);
            errorCount++;
            continue;
          }

          // 변속기 검증
          const transmission = colIndexes.transmission_type >= 0 ? (values[colIndexes.transmission_type]?.trim() || '자동') : '자동';
          if (!validTransmissions.includes(transmission)) {
            errors.push(`${rowNumber}행: 잘못된 변속기 "${transmission}" (허용: ${validTransmissions.join(', ')})`);
            errorCount++;
            continue;
          }

          // 연료 검증
          const fuelType = colIndexes.fuel_type >= 0 ? (values[colIndexes.fuel_type]?.trim() || '가솔린') : '가솔린';
          if (!validFuelTypes.includes(fuelType)) {
            errors.push(`${rowNumber}행: 잘못된 연료 "${fuelType}" (허용: ${validFuelTypes.join(', ')})`);
            errorCount++;
            continue;
          }

          // 일일요금 검증
          const dailyRate = parseInt(values[colIndexes.daily_rate_krw]);
          if (isNaN(dailyRate) || dailyRate < 10000) {
            errors.push(`${rowNumber}행: 일일요금이 잘못되었습니다 (최소 10,000원)`);
            errorCount++;
            continue;
          }

          // 선택적 컬럼들
          const brand = colIndexes.brand >= 0 ? values[colIndexes.brand]?.trim() : (displayName.split(' ')[0] || '기타');
          const model = colIndexes.model >= 0 ? values[colIndexes.model]?.trim() : (displayName.split(' ')[1] || displayName);
          const year = colIndexes.year >= 0 ? parseInt(values[colIndexes.year]) : new Date().getFullYear();
          const seatingCapacity = colIndexes.seating_capacity >= 0 ? parseInt(values[colIndexes.seating_capacity]) : 5;
          const weeklyRate = colIndexes.weekly_rate_krw >= 0 ? parseInt(values[colIndexes.weekly_rate_krw]) : dailyRate * 6;
          const monthlyRate = colIndexes.monthly_rate_krw >= 0 ? parseInt(values[colIndexes.monthly_rate_krw]) : dailyRate * 25;
          const mileageLimit = colIndexes.mileage_limit_km >= 0 ? parseInt(values[colIndexes.mileage_limit_km]) : 200;
          const excessFee = colIndexes.excess_mileage_fee_krw >= 0 ? parseInt(values[colIndexes.excess_mileage_fee_krw]) : 100;
          const depositKrw = colIndexes.deposit_krw >= 0 ? parseInt(values[colIndexes.deposit_krw]) : 0;

          const vehicleData = {
            display_name: displayName,
            brand: brand,
            model: model,
            year: year || new Date().getFullYear(),
            vehicle_class: vehicleClass,
            seating_capacity: seatingCapacity || 5,
            transmission_type: transmission,
            fuel_type: fuelType,
            daily_rate_krw: dailyRate,
            weekly_rate_krw: weeklyRate || dailyRate * 6,
            monthly_rate_krw: monthlyRate || dailyRate * 25,
            mileage_limit_km: mileageLimit || 200,
            excess_mileage_fee_krw: excessFee || 100,
            deposit_krw: depositKrw || 0,
            is_available: true,
            image_urls: [
              'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop',
              'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop'
            ],
            insurance_included: true,
            insurance_options: '자차보험, 대인배상, 대물배상',
            available_options: 'GPS, 블랙박스',
            pickup_location: '신안군 렌트카 본점',
            dropoff_location: '신안군 렌트카 본점',
            min_rental_days: 1,
            max_rental_days: 30,
            instant_booking: true
          };

          // POST API로 차량 등록
          const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
          if (!token) {
            errorCount++;
            continue;
          }

          const response = await fetch('/api/vendor/vehicles', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(vehicleData)
          });

          const result = await response.json();
          if (result.success) {
            successCount++;
          } else {
            errors.push(`${rowNumber}행 (${displayName}): ${result.message || 'API 오류'}`);
            errorCount++;
          }
        } catch (err) {
          console.error('차량 등록 실패:', err);
          errors.push(`${rowNumber}행: 네트워크 오류`);
          errorCount++;
        }
      }

      // 결과 메시지 표시
      if (errorCount === 0) {
        toast.success(`✅ CSV 업로드 완료! 총 ${successCount}건 성공`);
      } else {
        toast.error(`⚠️ CSV 업로드 완료: 성공 ${successCount}건, 실패 ${errorCount}건`);

        // 에러 상세 정보 콘솔 출력
        if (errors.length > 0) {
          console.error('=== CSV 업로드 에러 상세 ===');
          errors.slice(0, 10).forEach(err => console.error(err));
          if (errors.length > 10) {
            console.error(`... 외 ${errors.length - 10}건의 에러`);
          }

          // 첫 5개 에러만 toast로 표시
          const errorSummary = errors.slice(0, 5).join('\n');
          setTimeout(() => {
            toast.error(errorSummary, { duration: 10000 });
          }, 500);
        }
      }

      loadVendorData();
    } catch (error) {
      console.error('CSV 파일 읽기 실패:', error);
      toast.error('CSV 파일을 읽는데 실패했습니다.');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadCSVTemplate = () => {
    const csv = `차량명,제조사,모델,연식,차량등급,승차인원,변속기,연료,일일요금,주간요금,월간요금,주행제한(km),초과요금,보증금
아반떼 2024,현대,아반떼,2024,중형,5,자동,가솔린,50000,300000,1000000,200,100,500000
쏘나타 2024,현대,쏘나타,2024,중형,5,자동,가솔린,70000,420000,1400000,200,100,500000
그랜저 2024,현대,그랜저,2024,대형,5,자동,가솔린,100000,600000,2000000,200,150,1000000
싼타페 2024,현대,싼타페,2024,SUV,7,자동,디젤,90000,540000,1800000,200,150,1000000`;

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'vehicles_template.csv';
    link.click();
    toast.success('CSV 템플릿이 다운로드되었습니다!');
  };

  // 예약 필터 적용
  const applyBookingFilters = () => {
    let filtered = [...bookings];

    if (bookingFilters.startDate) {
      filtered = filtered.filter(
        (b) => new Date(b.pickup_date) >= new Date(bookingFilters.startDate)
      );
    }
    if (bookingFilters.endDate) {
      filtered = filtered.filter(
        (b) => new Date(b.pickup_date) <= new Date(bookingFilters.endDate)
      );
    }

    if (bookingFilters.vehicleId) {
      filtered = filtered.filter(
        (b) => b.vehicle_id === parseInt(bookingFilters.vehicleId)
      );
    }

    if (bookingFilters.status) {
      filtered = filtered.filter((b) => b.status === bookingFilters.status);
    }

    if (bookingFilters.searchQuery) {
      const query = bookingFilters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.customer_name.toLowerCase().includes(query) ||
          b.id.toString().includes(query)
      );
    }

    setFilteredBookings(filtered);
  };

  const resetBookingFilters = () => {
    setBookingFilters({
      startDate: '',
      endDate: '',
      vehicleId: '',
      status: '',
      searchQuery: ''
    });
    setFilteredBookings(bookings);
  };

  useEffect(() => {
    applyBookingFilters();
  }, [bookingFilters, bookings]);

  const handleEditInfo = () => {
    setIsEditingInfo(true);
    setEditedInfo({
      name: vendorInfo?.name,
      contact_person: vendorInfo?.contact_person,
      contact_email: vendorInfo?.contact_email,
      contact_phone: vendorInfo?.contact_phone,
      address: vendorInfo?.address,
      address_detail: vendorInfo?.address_detail,
      description: vendorInfo?.description,
      logo_url: vendorInfo?.logo_url,
      cancellation_policy: vendorInfo?.cancellation_policy,
      rental_guide: vendorInfo?.rental_guide,
      cancellation_rules: vendorInfo?.cancellation_rules || {
        '3_days_before': 100,
        '1_2_days_before': 50,
        'same_day': 0
      }
    });
  };

  const handleCancelEdit = () => {
    setIsEditingInfo(false);
    setEditedInfo({});
    setNewPassword('');
  };

  const handleSaveInfo = async () => {
    if (!vendorInfo?.id) return;

    try {
      // JWT 토큰 가져오기
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];

      if (!token) {
        toast.error('인증 토큰이 없습니다. 다시 로그인해주세요.');
        navigate('/login');
        return;
      }

      // PUT API로 업체 정보 수정 (/api/vendor/info 사용)
      const response = await fetch('/api/vendor/info', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editedInfo.name || vendorInfo.name,
          contact_person: editedInfo.contact_person || vendorInfo.contact_person,
          contact_email: editedInfo.contact_email || vendorInfo.contact_email,
          contact_phone: editedInfo.contact_phone || vendorInfo.contact_phone,
          address: editedInfo.address || vendorInfo.address,
          address_detail: editedInfo.address_detail !== undefined ? editedInfo.address_detail : vendorInfo.address_detail,
          latitude: editedInfo.latitude !== undefined ? editedInfo.latitude : vendorInfo.latitude,
          longitude: editedInfo.longitude !== undefined ? editedInfo.longitude : vendorInfo.longitude,
          description: editedInfo.description || vendorInfo.description,
          logo_url: editedInfo.logo_url || vendorInfo.logo_url,
          images: editedInfo.images !== undefined ? editedInfo.images : vendorInfo.images,
          cancellation_policy: editedInfo.cancellation_policy || vendorInfo.cancellation_policy,
          rental_guide: editedInfo.rental_guide !== undefined ? editedInfo.rental_guide : vendorInfo.rental_guide,
          cancellation_rules: editedInfo.cancellation_rules !== undefined ? editedInfo.cancellation_rules : vendorInfo.cancellation_rules,
          check_in_time: editedInfo.check_in_time || vendorInfo.check_in_time,
          check_out_time: editedInfo.check_out_time || vendorInfo.check_out_time
        })
      });

      const result = await response.json();
      if (result.success) {
        // 업체 정보 업데이트 - 실제로 변경된 필드만 업데이트
        setVendorInfo({
          ...vendorInfo,
          name: editedInfo.name || vendorInfo.name,
          contact_person: editedInfo.contact_person || vendorInfo.contact_person,
          contact_email: editedInfo.contact_email || vendorInfo.contact_email,
          contact_phone: editedInfo.contact_phone || vendorInfo.contact_phone,
          address: editedInfo.address || vendorInfo.address,
          address_detail: editedInfo.address_detail !== undefined ? editedInfo.address_detail : vendorInfo.address_detail,
          latitude: editedInfo.latitude !== undefined ? editedInfo.latitude : vendorInfo.latitude,
          longitude: editedInfo.longitude !== undefined ? editedInfo.longitude : vendorInfo.longitude,
          description: editedInfo.description !== undefined ? editedInfo.description : vendorInfo.description,
          logo_url: editedInfo.logo_url !== undefined ? editedInfo.logo_url : vendorInfo.logo_url,
          images: editedInfo.images !== undefined ? editedInfo.images : vendorInfo.images,
          cancellation_policy: editedInfo.cancellation_policy !== undefined ? editedInfo.cancellation_policy : vendorInfo.cancellation_policy,
          rental_guide: editedInfo.rental_guide !== undefined ? editedInfo.rental_guide : vendorInfo.rental_guide,
          cancellation_rules: editedInfo.cancellation_rules !== undefined ? editedInfo.cancellation_rules : vendorInfo.cancellation_rules,
          check_in_time: editedInfo.check_in_time || vendorInfo.check_in_time,
          check_out_time: editedInfo.check_out_time || vendorInfo.check_out_time
        });

        setIsEditingInfo(false);
        setEditedInfo({});
        setNewPassword('');
        toast.success('업체 정보가 수정되었습니다!');

        // 데이터 다시 로드하여 DB와 동기화
        await loadVendorData();
      } else {
        toast.error(result.message || result.error || '정보 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('정보 수정 실패:', error);
      toast.error('정보 수정에 실패했습니다.');
    }
  };

  // 🔒 보안: 인증 로딩 중이거나 데이터 로딩 중일 때 로딩 화면 표시
  if (authLoading || loading || !sessionRestored) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{authLoading || !sessionRestored ? '세션 복원 중...' : '데이터를 불러오는 중...'}</p>
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
                렌트카 업체 관리 대시보드
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

        {/* 최근 7일 매출 차트 */}
        {revenueData.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>최근 7일 매출 추이</CardTitle>
              <CardDescription>
                일별 매출 현황 (확정 + 완료 예약 기준)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis
                    tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString()}원`, '매출']}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* 빠른 액션 버튼 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => setActiveTab('vehicles')}
          >
            <Car className="w-6 h-6" />
            <span>차량 관리</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => navigate('/vendor/pms')}
          >
            <Zap className="w-6 h-6 text-purple-600" />
            <span className="text-purple-600 font-semibold">PMS 연동</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => setActiveTab('bookings')}
          >
            <Calendar className="w-6 h-6" />
            <span>예약 관리</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="w-6 h-6" />
            <span>업체 정보</span>
          </Button>
        </div>

        {/* 탭 메뉴 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="vehicles">차량 관리</TabsTrigger>
            <TabsTrigger value="bookings">예약 관리</TabsTrigger>
            <TabsTrigger value="calendar">예약 캘린더</TabsTrigger>
            <TabsTrigger value="insurance">보험 관리</TabsTrigger>
            <TabsTrigger value="settings">업체 정보</TabsTrigger>
          </TabsList>

          {/* 차량 관리 */}
          <TabsContent value="vehicles">
            {/* 차량 추가/수정 폼 */}
            {isAddingVehicle && (
              <Card className="mb-6 border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle>{isEditingVehicle ? '차량 수정' : '새 차량 등록'}</CardTitle>
                  <CardDescription>차량 정보를 입력해주세요</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>차량명 *</Label>
                      <Input
                        placeholder="예: 현대 그랜저 2024"
                        value={vehicleForm.display_name}
                        onChange={(e) => setVehicleForm({...vehicleForm, display_name: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label>차량 등급</Label>
                      <select
                        className="w-full p-2 border rounded"
                        value={vehicleForm.vehicle_class}
                        onChange={(e) => setVehicleForm({...vehicleForm, vehicle_class: e.target.value})}
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
                        value={vehicleForm.seating_capacity}
                        onChange={(e) => setVehicleForm({...vehicleForm, seating_capacity: parseInt(e.target.value)})}
                      />
                    </div>

                    <div>
                      <Label>변속기</Label>
                      <select
                        className="w-full p-2 border rounded"
                        value={vehicleForm.transmission_type}
                        onChange={(e) => setVehicleForm({...vehicleForm, transmission_type: e.target.value})}
                      >
                        <option value="자동">자동</option>
                        <option value="수동">수동</option>
                      </select>
                    </div>

                    <div>
                      <Label>연료</Label>
                      <select
                        className="w-full p-2 border rounded"
                        value={vehicleForm.fuel_type}
                        onChange={(e) => setVehicleForm({...vehicleForm, fuel_type: e.target.value})}
                      >
                        <option value="가솔린">가솔린</option>
                        <option value="디젤">디젤</option>
                        <option value="LPG">LPG</option>
                        <option value="하이브리드">하이브리드</option>
                        <option value="전기">전기</option>
                      </select>
                    </div>

                    <div>
                      <Label>시간당 요금 (원)</Label>
                      <Input
                        type="number"
                        min="1000"
                        step="1000"
                        value={vehicleForm.hourly_rate_krw}
                        onChange={(e) => setVehicleForm({...vehicleForm, hourly_rate_krw: parseInt(e.target.value)})}
                        placeholder="자동 계산됨"
                      />
                      <p className="text-xs text-gray-500 mt-1">권장: 일일 요금 기준 자동 계산 (일일 / 24 * 1.2)</p>
                    </div>

                    <div>
                      <Label>일일 요금 (원)</Label>
                      <Input
                        type="number"
                        min="10000"
                        step="5000"
                        value={vehicleForm.daily_rate_krw}
                        onChange={(e) => {
                          const dailyRate = parseInt(e.target.value);
                          const calculatedHourly = Math.round(((dailyRate / 24) * 1.2) / 1000) * 1000;
                          setVehicleForm({
                            ...vehicleForm,
                            daily_rate_krw: dailyRate,
                            hourly_rate_krw: calculatedHourly
                          });
                        }}
                      />
                    </div>

                    <div>
                      <Label>주간 요금 (원)</Label>
                      <Input
                        type="number"
                        min="50000"
                        step="10000"
                        value={vehicleForm.weekly_rate_krw}
                        onChange={(e) => setVehicleForm({...vehicleForm, weekly_rate_krw: parseInt(e.target.value)})}
                      />
                    </div>

                    <div>
                      <Label>월간 요금 (원)</Label>
                      <Input
                        type="number"
                        min="100000"
                        step="50000"
                        value={vehicleForm.monthly_rate_krw}
                        onChange={(e) => setVehicleForm({...vehicleForm, monthly_rate_krw: parseInt(e.target.value)})}
                      />
                    </div>

                    <div>
                      <Label>주행거리 제한 (km/일)</Label>
                      <Input
                        type="number"
                        min="50"
                        step="10"
                        value={vehicleForm.mileage_limit_km}
                        onChange={(e) => setVehicleForm({...vehicleForm, mileage_limit_km: parseInt(e.target.value)})}
                      />
                    </div>

                    <div>
                      <Label>초과 주행료 (원/km)</Label>
                      <Input
                        type="number"
                        min="10"
                        step="10"
                        value={vehicleForm.excess_mileage_fee_krw}
                        onChange={(e) => setVehicleForm({...vehicleForm, excess_mileage_fee_krw: parseInt(e.target.value)})}
                      />
                    </div>

                    <div>
                      <Label>보증금 (원) - 선택사항</Label>
                      <Input
                        type="number"
                        min="0"
                        step="10000"
                        placeholder="0 (없음)"
                        value={vehicleForm.deposit_krw}
                        onChange={(e) => setVehicleForm({...vehicleForm, deposit_krw: parseInt(e.target.value) || 0})}
                      />
                    </div>

                    <div className="md:col-span-2 flex items-center gap-2">
                      <Switch
                        checked={vehicleForm.insurance_included}
                        onCheckedChange={(checked) => setVehicleForm({...vehicleForm, insurance_included: checked})}
                      />
                      <Label>보험 포함</Label>
                    </div>

                    <div className="md:col-span-2">
                      <Label>보험 옵션</Label>
                      <Input
                        placeholder="예: 자차보험, 대인배상, 대물배상"
                        value={vehicleForm.insurance_options}
                        onChange={(e) => setVehicleForm({...vehicleForm, insurance_options: e.target.value})}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>차량 옵션</Label>
                      <Textarea
                        placeholder="예: GPS, 블랙박스, 하이패스, 휴대폰 거치대"
                        value={vehicleForm.available_options}
                        onChange={(e) => setVehicleForm({...vehicleForm, available_options: e.target.value})}
                        rows={2}
                      />
                    </div>

                    <div className="md:col-span-2 flex items-center gap-2">
                      <Switch
                        checked={vehicleForm.is_available}
                        onCheckedChange={(checked) => setVehicleForm({...vehicleForm, is_available: checked})}
                      />
                      <Label>예약 가능</Label>
                    </div>

                    {/* 픽업/반납 위치 */}
                    <div className="md:col-span-2 border-t pt-4">
                      <Label className="mb-2 font-semibold">픽업/반납 위치</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>픽업 위치</Label>
                          <Input
                            placeholder="예: 신안군 렌트카 본점"
                            value={vehicleForm.pickup_location}
                            onChange={(e) => setVehicleForm({...vehicleForm, pickup_location: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>반납 위치</Label>
                          <Input
                            placeholder="예: 신안군 렌트카 본점"
                            value={vehicleForm.dropoff_location}
                            onChange={(e) => setVehicleForm({...vehicleForm, dropoff_location: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 렌탈 기간 제한 */}
                    <div className="md:col-span-2 border-t pt-4">
                      <Label className="mb-2 font-semibold">렌탈 기간 제한</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>최소 렌탈 기간 (일)</Label>
                          <Input
                            type="number"
                            min="1"
                            value={vehicleForm.min_rental_days}
                            onChange={(e) => setVehicleForm({...vehicleForm, min_rental_days: parseInt(e.target.value)})}
                          />
                        </div>
                        <div>
                          <Label>최대 렌탈 기간 (일)</Label>
                          <Input
                            type="number"
                            min="1"
                            value={vehicleForm.max_rental_days}
                            onChange={(e) => setVehicleForm({...vehicleForm, max_rental_days: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 즉시 예약 설정 */}
                    <div className="md:col-span-2 border-t pt-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={vehicleForm.instant_booking}
                          onCheckedChange={(checked) => setVehicleForm({...vehicleForm, instant_booking: checked})}
                        />
                        <div>
                          <Label>즉시 예약 가능</Label>
                          <p className="text-sm text-gray-500">
                            {vehicleForm.instant_booking
                              ? '예약 즉시 자동 확정됩니다'
                              : '예약 후 수동 승인이 필요합니다'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 이미지 업로드 */}
                    <div className="md:col-span-2 border-t pt-4">
                      <ImageUploader
                        images={vehicleForm.image_urls}
                        onImagesChange={(urls) => setVehicleForm({ ...vehicleForm, image_urls: urls })}
                        maxImages={5}
                        label="차량 이미지 (최대 5개)"
                      />

                      {/* URL 직접 입력 옵션 */}
                      <div className="mt-4 p-4 border border-dashed rounded-lg">
                        <Label className="mb-2 text-sm text-gray-600">또는 이미지 URL 직접 입력</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="https://example.com/image.jpg"
                            value={currentImageUrl}
                            onChange={(e) => setCurrentImageUrl(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addImageUrl();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={addImageUrl}
                            disabled={vehicleForm.image_urls.length >= 5}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <Button onClick={handleSaveVehicle}>
                      {isEditingVehicle ? '수정' : '등록'}
                    </Button>
                    <Button variant="outline" onClick={handleCancelForm}>
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
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    CSV 업로드
                  </Button>
                  <Button variant="outline" onClick={downloadCSVTemplate}>
                    <FileUp className="w-4 h-4 mr-2" />
                    CSV 템플릿
                  </Button>
                  <Button onClick={handleAddVehicle} disabled={isAddingVehicle}>
                    <Plus className="w-4 h-4 mr-2" />
                    차량 추가
                  </Button>
                </div>
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
                        <TableHead>시간/일일 요금</TableHead>
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
                          <TableCell>
                            <div className="text-sm">
                              <div className="text-gray-600">시간: ₩{vehicle.hourly_rate_krw?.toLocaleString() || 'N/A'}</div>
                              <div className="font-medium">일일: ₩{vehicle.daily_rate_krw.toLocaleString()}</div>
                              {vehicle.deposit_krw && vehicle.deposit_krw > 0 && (
                                <div className="text-blue-600 text-xs mt-1">보증금: ₩{vehicle.deposit_krw.toLocaleString()}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={vehicle.is_available}
                                onCheckedChange={() => toggleVehicleAvailability(vehicle.id, vehicle.is_available)}
                              />
                              <Badge variant={vehicle.is_available ? 'default' : 'secondary'}>
                                {vehicle.is_available ? '예약 가능' : '예약 불가'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditVehicle(vehicle)}
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
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>예약 검색 및 필터</CardTitle>
                <CardDescription>
                  총 {bookings.length}건 중 {filteredBookings.length}건 표시
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label>픽업일 시작</Label>
                    <Input
                      type="date"
                      value={bookingFilters.startDate}
                      onChange={(e) =>
                        setBookingFilters({ ...bookingFilters, startDate: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>픽업일 종료</Label>
                    <Input
                      type="date"
                      value={bookingFilters.endDate}
                      onChange={(e) =>
                        setBookingFilters({ ...bookingFilters, endDate: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>차량 선택</Label>
                    <select
                      className="w-full p-2 border rounded"
                      value={bookingFilters.vehicleId}
                      onChange={(e) =>
                        setBookingFilters({ ...bookingFilters, vehicleId: e.target.value })
                      }
                    >
                      <option value="">전체 차량</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.display_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>예약 상태</Label>
                    <select
                      className="w-full p-2 border rounded"
                      value={bookingFilters.status}
                      onChange={(e) =>
                        setBookingFilters({ ...bookingFilters, status: e.target.value })
                      }
                    >
                      <option value="">전체 상태</option>
                      <option value="pending">대기</option>
                      <option value="confirmed">확정</option>
                      <option value="completed">완료</option>
                      <option value="cancelled">취소</option>
                    </select>
                  </div>
                  <div>
                    <Label>고객명 / 예약번호 검색</Label>
                    <Input
                      type="text"
                      placeholder="홍길동 또는 예약번호"
                      value={bookingFilters.searchQuery}
                      onChange={(e) =>
                        setBookingFilters({ ...bookingFilters, searchQuery: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={resetBookingFilters}
                      className="w-full"
                    >
                      필터 초기화
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>예약 목록</CardTitle>
                <CardDescription>필터링된 예약 {filteredBookings.length}건</CardDescription>
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
                        <TableHead>차량</TableHead>
                        <TableHead>고객명</TableHead>
                        <TableHead>연락처</TableHead>
                        <TableHead>픽업일시</TableHead>
                        <TableHead>반납일시</TableHead>
                        <TableHead>금액</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>#{booking.id}</TableCell>
                          <TableCell className="font-medium">
                            {booking.vehicle_name}
                          </TableCell>
                          <TableCell>{booking.customer_name}</TableCell>
                          <TableCell>{booking.customer_phone}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{new Date(booking.pickup_date).toLocaleDateString('ko-KR')}</div>
                              {booking.pickup_time && (
                                <div className="text-gray-500 text-xs">{booking.pickup_time}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{new Date(booking.dropoff_date).toLocaleDateString('ko-KR')}</div>
                              {booking.dropoff_time && (
                                <div className="text-gray-500 text-xs">{booking.dropoff_time}</div>
                              )}
                            </div>
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
                          <TableCell>
                            <div className="flex gap-2">
                              {booking.status === 'confirmed' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePickup(booking)}
                                >
                                  픽업 처리
                                </Button>
                              )}
                              {booking.status === 'picked_up' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleProcessReturn(booking)}
                                >
                                  반납 처리
                                </Button>
                              )}
                              {booking.status === 'completed' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRefundBooking(booking)}
                                >
                                  환불
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteBooking(booking)}
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

          {/* 예약 캘린더 */}
          <TabsContent value="calendar">
            <VendorRentcarCalendar />
          </TabsContent>

          {/* 보험 관리 */}
          <TabsContent value="insurance">
            {/* 보험 추가/수정 폼 */}
            {isAddingInsurance && (
              <Card className="mb-6 border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle>{isEditingInsurance ? '보험 상품 수정' : '새 보험 상품 추가'}</CardTitle>
                  <CardDescription>시간당 요금으로 보험 상품을 관리하세요</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>보험 상품명 *</Label>
                      <Input
                        placeholder="예: 기본 자차보험"
                        value={insuranceForm.name}
                        onChange={(e) => setInsuranceForm({...insuranceForm, name: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label>시간당 요금 (원) *</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="1000"
                        value={insuranceForm.hourly_rate_krw}
                        onChange={(e) => setInsuranceForm({...insuranceForm, hourly_rate_krw: parseInt(e.target.value) || 0})}
                      />
                      <p className="text-sm text-gray-500 mt-1">차량 렌트 시간만큼 곱해서 보험료가 계산됩니다</p>
                    </div>

                    <div>
                      <Label>보험 설명</Label>
                      <Textarea
                        placeholder="예: 기본적인 자차 손해를 보장합니다"
                        value={insuranceForm.description}
                        onChange={(e) => setInsuranceForm({...insuranceForm, description: e.target.value})}
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label>보장 내역</Label>
                      <Textarea
                        placeholder="예: 자차 손해 최대 500만원 보장&#10;면책금: 50만원"
                        value={insuranceForm.coverage_details}
                        onChange={(e) => setInsuranceForm({...insuranceForm, coverage_details: e.target.value})}
                        rows={4}
                      />
                      <p className="text-sm text-gray-500 mt-1">줄바꿈으로 항목을 구분하세요</p>
                    </div>

                    <div>
                      <Label>표시 순서</Label>
                      <Input
                        type="number"
                        min="0"
                        value={insuranceForm.display_order}
                        onChange={(e) => setInsuranceForm({...insuranceForm, display_order: parseInt(e.target.value) || 0})}
                      />
                      <p className="text-sm text-gray-500 mt-1">숫자가 작을수록 먼저 표시됩니다</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={insuranceForm.is_active}
                        onCheckedChange={(checked) => setInsuranceForm({...insuranceForm, is_active: checked})}
                      />
                      <Label>활성화 (고객에게 표시)</Label>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleSaveInsurance} className="bg-green-600 hover:bg-green-700">
                        {isEditingInsurance ? '수정 완료' : '추가'}
                      </Button>
                      <Button variant="outline" onClick={() => setIsAddingInsurance(false)}>
                        취소
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 보험 상품 목록 */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>보험 상품 목록</CardTitle>
                    <CardDescription>고객이 선택할 수 있는 보험 상품을 관리하세요</CardDescription>
                  </div>
                  <Button onClick={handleAddInsurance} className="bg-green-600 hover:bg-green-700">
                    <Plus className="mr-2 h-4 w-4" /> 보험 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {insurances.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>등록된 보험 상품이 없습니다.</p>
                    <p className="text-sm mt-2">고객이 예약 시 선택할 수 있는 보험 상품을 추가하세요.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>순서</TableHead>
                        <TableHead>보험명</TableHead>
                        <TableHead>시간당 요금</TableHead>
                        <TableHead>설명</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead className="text-right">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {insurances
                        .sort((a, b) => a.display_order - b.display_order)
                        .map((insurance) => (
                          <TableRow key={insurance.id}>
                            <TableCell>{insurance.display_order}</TableCell>
                            <TableCell className="font-medium">{insurance.name}</TableCell>
                            <TableCell>{insurance.hourly_rate_krw.toLocaleString()}원/시간</TableCell>
                            <TableCell className="max-w-xs truncate">{insurance.description || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={insurance.is_active}
                                  onCheckedChange={() => toggleInsuranceActive(insurance.id, insurance.is_active)}
                                />
                                <span className="text-sm">
                                  {insurance.is_active ? '활성' : '비활성'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditInsurance(insurance)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteInsurance(insurance.id)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* 보험 안내 */}
            <Card className="mt-6 bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">보험 시스템 안내</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-blue-800">
                <p>• <strong>시간당 요금</strong>: 차량 렌트 시간에 비례하여 보험료가 자동 계산됩니다</p>
                <p>• <strong>선택 사항</strong>: 고객은 보험을 선택하지 않고도 예약할 수 있습니다</p>
                <p>• <strong>다중 옵션</strong>: 여러 보험 상품 중 하나를 선택할 수 있습니다</p>
                <p>• <strong>예시</strong>: 24시간 렌트 × 1,000원/시간 = 24,000원 보험료</p>
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
                  <Label>이메일 (로그인 계정)</Label>
                  <Input
                    type="email"
                    value={isEditingInfo ? (editedInfo.contact_email || '') : vendorInfo.contact_email}
                    onChange={(e) => setEditedInfo({ ...editedInfo, contact_email: e.target.value })}
                    disabled={!isEditingInfo}
                  />
                  {isEditingInfo && (
                    <p className="text-xs text-gray-500 mt-1">
                      * 이메일 변경 시 다시 로그인해야 합니다
                    </p>
                  )}
                </div>
                <div>
                  <Label>새 비밀번호 (변경 시에만 입력)</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={!isEditingInfo}
                    placeholder={isEditingInfo ? "변경할 비밀번호 입력" : ""}
                  />
                  {isEditingInfo && newPassword && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ 저장 시 비밀번호가 변경됩니다
                    </p>
                  )}
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
                  {isEditingInfo ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={editedInfo.address || ''}
                          placeholder="주소 검색 버튼을 클릭하세요"
                          readOnly
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          onClick={async () => {
                            // 구글 Maps API 로드 확인 및 로드
                            const loadGoogleMaps = (): Promise<void> => {
                              return new Promise((resolve, reject) => {
                                if ((window as any).google && (window as any).google.maps) {
                                  console.log('✅ 구글 Maps API 이미 로드됨');
                                  resolve();
                                  return;
                                }

                                console.log('📡 구글 Maps API 로드 중...');
                                const apiKey = getGoogleMapsApiKey();

                                if (!apiKey) {
                                  reject(new Error('구글 Maps API 키가 설정되지 않았습니다.'));
                                  return;
                                }

                                const script = document.createElement('script');
                                script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
                                script.async = true;
                                script.defer = true;
                                script.onload = () => {
                                  console.log('✅ 구글 Maps API 로드 완료');
                                  resolve();
                                };
                                script.onerror = () => {
                                  reject(new Error('구글 Maps API 로드 실패'));
                                };
                                document.head.appendChild(script);
                              });
                            };

                            try {
                              // 구글 Maps API 로드
                              await loadGoogleMaps();

                              // Daum 주소 검색 팝업
                              new (window as any).daum.Postcode({
                                oncomplete: function(data: any) {
                                  // 도로명 주소 또는 지번 주소 선택
                                  const fullAddress = data.roadAddress || data.jibunAddress;

                                  console.log('🔍 주소 선택됨:', fullAddress);

                                  // 구글 Maps Geocoding API로 좌표 검색
                                  const geocoder = new (window as any).google.maps.Geocoder();

                                  geocoder.geocode({ address: fullAddress }, (results: any, status: any) => {
                                    console.log('📡 Google Geocoder 응답:', { results, status });

                                    if (status === 'OK' && results && results.length > 0) {
                                      const location = results[0].geometry.location;
                                      const lat = location.lat();
                                      const lng = location.lng();

                                      console.log('✅ 좌표 검색 성공!', {
                                        address: fullAddress,
                                        lat: lat,
                                        lng: lng
                                      });

                                      setEditedInfo(prev => ({
                                        ...prev,
                                        address: fullAddress,
                                        latitude: lat,
                                        longitude: lng
                                      }));

                                      toast.success(`주소가 저장되었습니다.\n위도: ${lat.toFixed(6)}, 경도: ${lng.toFixed(6)}`);
                                    } else {
                                      console.error('❌ 좌표 검색 실패:', { fullAddress, status, results });
                                      toast.error('좌표를 찾을 수 없습니다. 주소를 다시 확인해주세요.');

                                      setEditedInfo(prev => ({
                                        ...prev,
                                        address: fullAddress
                                      }));
                                    }
                                  });
                                }
                              }).open();
                            } catch (error: any) {
                              console.error('❌ 구글 Maps API 로드 오류:', error);
                              toast.error(`구글 Maps API 로드 실패: ${error.message}`);
                            }
                          }}
                          className="whitespace-nowrap"
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          주소 검색
                        </Button>
                      </div>
                      {editedInfo.latitude && editedInfo.longitude && (
                        <p className="text-xs text-gray-500">
                          좌표: {editedInfo.latitude.toFixed(6)}, {editedInfo.longitude.toFixed(6)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm">{vendorInfo.address || '미등록'}</p>
                      {vendorInfo.latitude && vendorInfo.longitude && (
                        <p className="text-xs text-gray-500">
                          좌표: {vendorInfo.latitude.toFixed(6)}, {vendorInfo.longitude.toFixed(6)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <Label>상세주소</Label>
                  <Input
                    value={isEditingInfo ? (editedInfo.address_detail || '') : (vendorInfo.address_detail || '미등록')}
                    onChange={(e) => setEditedInfo({ ...editedInfo, address_detail: e.target.value })}
                    disabled={!isEditingInfo}
                    placeholder="상세주소를 입력하세요 (예: 3층 301호)"
                  />
                </div>
                <div>
                  <Label>업체 소개</Label>
                  <Textarea
                    value={isEditingInfo ? (editedInfo.description || '') : (vendorInfo.description || '미등록')}
                    onChange={(e) => setEditedInfo({ ...editedInfo, description: e.target.value })}
                    disabled={!isEditingInfo}
                    rows={3}
                    placeholder="업체에 대한 간단한 소개를 작성하세요"
                  />
                </div>
                <div>
                  <Label>로고 URL</Label>
                  <Input
                    value={isEditingInfo ? (editedInfo.logo_url || '') : (vendorInfo.logo_url || '미등록')}
                    onChange={(e) => setEditedInfo({ ...editedInfo, logo_url: e.target.value })}
                    disabled={!isEditingInfo}
                    placeholder="https://..."
                  />
                </div>

                {/* 업체 이미지 업로드 */}
                <div>
                  <Label>업체 이미지</Label>
                  <p className="text-sm text-gray-500 mb-2">
                    업체 상세페이지와 카테고리 카드에 표시될 이미지를 업로드하세요. (최대 5개)
                  </p>
                  {isEditingInfo ? (
                    <ImageUploader
                      category="rentcar"
                      maxImages={5}
                      images={editedInfo.images || vendorInfo.images || []}
                      onImagesChange={(urls) => {
                        setEditedInfo({ ...editedInfo, images: urls });
                      }}
                    />
                  ) : (
                    <div className="space-y-2">
                      {vendorInfo.images && vendorInfo.images.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {vendorInfo.images.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`업체 이미지 ${idx + 1}`}
                              className="w-full h-32 object-cover rounded"
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">등록된 이미지가 없습니다</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label>취소/환불 정책</Label>
                  <Textarea
                    value={isEditingInfo ? (editedInfo.cancellation_policy || '') : (vendorInfo.cancellation_policy || '미등록')}
                    onChange={(e) => setEditedInfo({ ...editedInfo, cancellation_policy: e.target.value })}
                    disabled={!isEditingInfo}
                    rows={4}
                    placeholder="예: 예약 3일 전: 전액 환불&#10;예약 1-2일 전: 50% 환불&#10;예약 당일: 환불 불가"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    고객에게 표시될 환불 정책 텍스트입니다.
                  </p>
                </div>

                <div>
                  <Label>환불 비율 설정 (자동 계산용)</Label>
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">72시간 이상 전 취소 (≥3일)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={isEditingInfo ? (editedInfo.cancellation_rules?.['3_days_before'] ?? 100) : (vendorInfo.cancellation_rules?.['3_days_before'] ?? 100)}
                            onChange={(e) => setEditedInfo({
                              ...editedInfo,
                              cancellation_rules: {
                                ...(editedInfo.cancellation_rules || {}),
                                '3_days_before': parseInt(e.target.value) || 0
                              }
                            })}
                            disabled={!isEditingInfo}
                            className="w-24"
                          />
                          <span className="text-sm text-gray-600">% 환불</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm">48-72시간 전 취소 (2-3일)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={isEditingInfo ? (editedInfo.cancellation_rules?.['2_days_before'] ?? 80) : (vendorInfo.cancellation_rules?.['2_days_before'] ?? 80)}
                            onChange={(e) => setEditedInfo({
                              ...editedInfo,
                              cancellation_rules: {
                                ...(editedInfo.cancellation_rules || {}),
                                '2_days_before': parseInt(e.target.value) || 0
                              }
                            })}
                            disabled={!isEditingInfo}
                            className="w-24"
                          />
                          <span className="text-sm text-gray-600">% 환불</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm">24-48시간 전 취소 (1-2일)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={isEditingInfo ? (editedInfo.cancellation_rules?.['1_day_before'] ?? 50) : (vendorInfo.cancellation_rules?.['1_day_before'] ?? 50)}
                            onChange={(e) => setEditedInfo({
                              ...editedInfo,
                              cancellation_rules: {
                                ...(editedInfo.cancellation_rules || {}),
                                '1_day_before': parseInt(e.target.value) || 0
                              }
                            })}
                            disabled={!isEditingInfo}
                            className="w-24"
                          />
                          <span className="text-sm text-gray-600">% 환불</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm">24시간 이내 취소 (당일)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={isEditingInfo ? (editedInfo.cancellation_rules?.['same_day'] ?? 0) : (vendorInfo.cancellation_rules?.['same_day'] ?? 0)}
                            onChange={(e) => setEditedInfo({
                              ...editedInfo,
                              cancellation_rules: {
                                ...(editedInfo.cancellation_rules || {}),
                                'same_day': parseInt(e.target.value) || 0
                              }
                            })}
                            disabled={!isEditingInfo}
                            className="w-24"
                          />
                          <span className="text-sm text-gray-600">% 환불</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      💡 환불 요청 시 이 비율에 따라 자동 계산됩니다. (권장: 72h+ → 100%, 48-72h → 80%, 24-48h → 50%, 24h 이내 → 0%)
                    </p>
                  </div>
                </div>

                <div>
                  <Label>대여 안내</Label>
                  <Textarea
                    value={isEditingInfo ? (editedInfo.rental_guide || '') : (vendorInfo.rental_guide || '미등록')}
                    onChange={(e) => setEditedInfo({ ...editedInfo, rental_guide: e.target.value })}
                    disabled={!isEditingInfo}
                    rows={6}
                    placeholder="예:&#10;• 운전면허 취득 1년 이상 필수&#10;• 만 21세 이상 대여 가능&#10;• 대여 시 신분증, 운전면허증, 신용카드 필요&#10;• 보험 가입 필수 (기본 보험 포함)&#10;• 주행거리 제한: 1일 200km (초과 시 km당 ₩100)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    업체 상세페이지에 표시될 대여 안내사항입니다.
                  </p>
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

      {/* 픽업 처리 모달 */}
      <Dialog open={pickupModalOpen} onOpenChange={setPickupModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>차량 픽업 처리</DialogTitle>
            <DialogDescription>
              {pickupBooking && `예약번호: #${pickupBooking.booking_number || pickupBooking.id} | ${pickupBooking.vehicle_name}`}
            </DialogDescription>
          </DialogHeader>

          {pickupBooking && (
            <div className="space-y-4">
              {/* 예약 정보 */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">고객명:</span>
                  <span className="font-medium">{pickupBooking.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">픽업 예정일시:</span>
                  <span className="font-medium">
                    {new Date(pickupBooking.pickup_date).toLocaleDateString('ko-KR')} {pickupBooking.pickup_time || ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">예약 금액:</span>
                  <span className="font-medium">₩{pickupBooking.total_amount.toLocaleString()}</span>
                </div>
              </div>

              {/* 차량 상태 입력 */}
              <div>
                <Label>현재 주행거리 (km) *</Label>
                <Input
                  type="number"
                  value={pickupForm.mileage}
                  onChange={(e) => setPickupForm({ ...pickupForm, mileage: Number(e.target.value) })}
                  placeholder="예: 12345"
                  min="0"
                />
              </div>

              <div>
                <Label>연료 상태 (%) *</Label>
                <Input
                  type="number"
                  value={pickupForm.fuel_level}
                  onChange={(e) => setPickupForm({ ...pickupForm, fuel_level: Number(e.target.value) })}
                  placeholder="0-100"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <Label>차량 상태 / 파손 여부</Label>
                <Textarea
                  value={pickupForm.damage_notes}
                  onChange={(e) => setPickupForm({ ...pickupForm, damage_notes: e.target.value })}
                  placeholder="차량 외관/내부 상태, 기존 파손 사항 등을 기록하세요..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPickupModalOpen(false);
                setPickupBooking(null);
              }}
              disabled={isProcessingPickup}
            >
              취소
            </Button>
            <Button
              onClick={handleSubmitPickup}
              disabled={isProcessingPickup}
            >
              {isProcessingPickup ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                '픽업 완료'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 반납 처리 모달 */}
      <Dialog open={returnModalOpen} onOpenChange={setReturnModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>차량 반납 처리</DialogTitle>
            <DialogDescription>
              {selectedBooking && `예약번호: #${selectedBooking.booking_number || selectedBooking.id} | ${selectedBooking.vehicle_name}`}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4">
              {/* 예약 정보 */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">고객명:</span>
                  <span className="font-medium">{selectedBooking.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">예정 반납일시:</span>
                  <span className="font-medium">
                    {new Date(selectedBooking.dropoff_date).toLocaleDateString('ko-KR')} {selectedBooking.dropoff_time || ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">예약 금액:</span>
                  <span className="font-medium">₩{selectedBooking.total_amount.toLocaleString()}</span>
                </div>
              </div>

              {/* 차량 상태 입력 */}
              <div>
                <Label>반납 시 주행거리 (km) *</Label>
                <Input
                  type="number"
                  value={returnForm.mileage}
                  onChange={(e) => setReturnForm({ ...returnForm, mileage: Number(e.target.value) })}
                  placeholder="예: 12567"
                  min="0"
                />
              </div>

              <div>
                <Label>연료 상태 (%) *</Label>
                <Input
                  type="number"
                  value={returnForm.fuel_level}
                  onChange={(e) => setReturnForm({ ...returnForm, fuel_level: Number(e.target.value) })}
                  placeholder="0-100"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <Label>차량 상태 / 파손 여부</Label>
                <Textarea
                  value={returnForm.damage_notes}
                  onChange={(e) => setReturnForm({ ...returnForm, damage_notes: e.target.value })}
                  placeholder="반납 시 차량 외관/내부 상태, 신규 파손 사항 등을 기록하세요..."
                  rows={3}
                />
              </div>

              <div>
                <Label>추가 요금 (원)</Label>
                <Input
                  type="number"
                  value={returnForm.additional_charges}
                  onChange={(e) => setReturnForm({ ...returnForm, additional_charges: Number(e.target.value) })}
                  placeholder="0"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  * 지연 수수료, 파손 수수료, 초과 주행거리 수수료 등
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReturnModalOpen(false);
                setSelectedBooking(null);
              }}
              disabled={isProcessingReturn}
            >
              취소
            </Button>
            <Button
              onClick={handleSubmitReturn}
              disabled={isProcessingReturn}
            >
              {isProcessingReturn ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                '반납 완료'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default VendorDashboardPageEnhanced;

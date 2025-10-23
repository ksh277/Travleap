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
  description?: string;
  logo_url?: string;
  images?: string[];
  is_verified: boolean;
  vehicle_count: number;
  cancellation_policy?: string;
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
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vendorInfo, setVendorInfo] = useState<VendorInfo | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
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

  // 업체 정보 로드
  useEffect(() => {
    loadVendorData();
  }, [user?.id]);

  const loadVendorData = async () => {
    if (!user?.id) return;

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
        const response = await fetch(`/api/vendor/vehicles`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            id: editingVehicleId,
            ...vehicleForm,
            image_urls
          })
        });

        const result = await response.json();
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
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        toast.error('CSV 파일에 데이터가 없습니다.');
        return;
      }

      const dataLines = lines.slice(1);

      let successCount = 0;
      let errorCount = 0;

      for (const line of dataLines) {
        const values = line.split(',');

        try {
          const vehicleData = {
            display_name: values[0] || '',
            vehicle_class: values[4] || '중형',
            seating_capacity: parseInt(values[5]) || 5,
            transmission_type: values[6] || '자동',
            fuel_type: values[7] || '가솔린',
            daily_rate_krw: parseInt(values[8]) || 50000,
            weekly_rate_krw: parseInt(values[9]) || 300000,
            monthly_rate_krw: parseInt(values[10]) || 1000000,
            mileage_limit_km: parseInt(values[11]) || 200,
            excess_mileage_fee_krw: parseInt(values[12]) || 100,
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

          if (!vehicleData.display_name.trim()) {
            errorCount++;
            continue;
          }

          // POST API로 차량 등록
          const response = await fetch('/api/vendor/rentcar/vehicles', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': user.id.toString()
            },
            body: JSON.stringify({
              userId: user.id,
              ...vehicleData
            })
          });

          const result = await response.json();
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          console.error('차량 등록 실패:', err);
          errorCount++;
        }
      }

      toast.success(`CSV 업로드 완료! 성공: ${successCount}건, 실패: ${errorCount}건`);
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
    const csv = `차량명,제조사,모델,연식,차량등급,승차인원,변속기,연료,일일요금,주간요금,월간요금,주행제한(km),초과요금
아반떼 2024,현대,아반떼,2024,중형,5,자동,가솔린,50000,300000,1000000,200,100
쏘나타 2024,현대,쏘나타,2024,중형,5,자동,가솔린,70000,420000,1400000,200,100
그랜저 2024,현대,그랜저,2024,대형,5,자동,가솔린,100000,600000,2000000,200,150
싼타페 2024,현대,싼타페,2024,SUV,7,자동,디젤,90000,540000,1800000,200,150`;

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
      description: vendorInfo?.description,
      logo_url: vendorInfo?.logo_url,
      cancellation_policy: vendorInfo?.cancellation_policy
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
      // PUT API로 업체 정보 수정 (/api/vendors 사용)
      const response = await fetch('/api/vendors', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: vendorInfo.id,
          name: editedInfo.name,
          contact_person: editedInfo.contact_person,
          contact_email: editedInfo.contact_email,
          contact_phone: editedInfo.contact_phone,
          address: editedInfo.address,
          description: editedInfo.description,
          logo_url: editedInfo.logo_url,
          cancellation_policy: editedInfo.cancellation_policy,
          old_email: vendorInfo.contact_email, // 이전 이메일 (Neon DB 업데이트용)
          new_password: newPassword || undefined // 비밀번호가 입력되었을 때만
        })
      });

      const result = await response.json();
      if (result.success) {
        // 업체 정보 업데이트
        setVendorInfo({
          ...vendorInfo,
          name: editedInfo.name!,
          contact_person: editedInfo.contact_person!,
          contact_email: editedInfo.contact_email!,
          contact_phone: editedInfo.contact_phone!,
          address: editedInfo.address!,
          description: editedInfo.description,
          logo_url: editedInfo.logo_url,
          cancellation_policy: editedInfo.cancellation_policy
        });

        setIsEditingInfo(false);
        setEditedInfo({});
        setNewPassword('');
        toast.success('업체 정보가 수정되었습니다!' + (newPassword ? ' 비밀번호도 변경되었습니다.' : ''));

        // 이메일이 변경되었으면 다시 로그인 필요
        if (vendorInfo.contact_email !== editedInfo.contact_email) {
          toast.info('이메일이 변경되었습니다. 다시 로그인해주세요.');
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
      } else {
        toast.error(result.error || '정보 수정에 실패했습니다.');
      }
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
            onClick={() => navigate('/vendor/pricing')}
          >
            <Tag className="w-6 h-6" />
            <span>요금 설정</span>
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
                  <Textarea
                    value={isEditingInfo ? (editedInfo.address || '') : (vendorInfo.address || '미등록')}
                    onChange={(e) => setEditedInfo({ ...editedInfo, address: e.target.value })}
                    disabled={!isEditingInfo}
                    rows={2}
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
                <div>
                  <Label>취소/환불 정책</Label>
                  <Textarea
                    value={isEditingInfo ? (editedInfo.cancellation_policy || '') : (vendorInfo.cancellation_policy || '미등록')}
                    onChange={(e) => setEditedInfo({ ...editedInfo, cancellation_policy: e.target.value })}
                    disabled={!isEditingInfo}
                    rows={4}
                    placeholder="예: 예약 3일 전: 전액 환불&#10;예약 1-2일 전: 50% 환불&#10;예약 당일: 환불 불가"
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

export default VendorDashboardPageEnhanced;

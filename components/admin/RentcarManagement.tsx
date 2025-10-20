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
  X,
  Upload,
  Download,
  FileSpreadsheet
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
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [vendorCurrentPage, setVendorCurrentPage] = useState(1);
  const [vendorItemsPerPage] = useState(10);
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
    api_url: '',
    api_key: '',
    api_auth_type: 'bearer',
    api_enabled: false
  });
  const [logoImageFile, setLogoImageFile] = useState<File | null>(null);
  const [logoImagePreview, setLogoImagePreview] = useState<string>('');

  // State for vehicles
  const [vehicles, setVehicles] = useState<RentcarVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<RentcarVehicle | null>(null);
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [isCsvUploadDialogOpen, setIsCsvUploadDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [vehicleCurrentPage, setVehicleCurrentPage] = useState(1);
  const [vehicleItemsPerPage] = useState(10);
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
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationCurrentPage, setLocationCurrentPage] = useState(1);
  const [locationItemsPerPage] = useState(10);
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
  const [bookingSearchQuery, setBookingSearchQuery] = useState('');
  const [bookingCurrentPage, setBookingCurrentPage] = useState(1);
  const [bookingItemsPerPage] = useState(10);

  // State for filters
  const [vendorFilter, setVendorFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Active tab state
  const [activeTab, setActiveTab] = useState('vendors');

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
        api_url: vendor.api_url || '',
        api_key: vendor.api_key || '',
        api_auth_type: vendor.api_auth_type || 'bearer',
        api_enabled: vendor.api_enabled || false
      });
      setLogoImagePreview(vendor.logo_url || '');
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
        api_url: '',
        api_key: '',
        api_auth_type: 'bearer',
        api_enabled: false
      });
      setLogoImagePreview('');
    }
    setLogoImageFile(null);
    setIsVendorDialogOpen(true);
  };

  // Handle logo image upload
  const handleLogoImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('이미지 파일만 업로드 가능합니다.');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('이미지 크기는 5MB 이하여야 합니다.');
        return;
      }

      setLogoImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoImagePreview(base64);
        setVendorFormData({ ...vendorFormData, logo_url: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveVendor = async () => {
    try {
      // Use the form data with the base64 image already set
      const dataToSave = { ...vendorFormData };

      if (selectedVendor) {
        // Update
        const response = await rentcarApi.vendors.update(selectedVendor.id, dataToSave);
        if (response.success) {
          toast.success('벤더 정보가 수정되었습니다.');
          loadVendors();
          setIsVendorDialogOpen(false);
        } else {
          toast.error(response.error || '벤더 수정에 실패했습니다.');
        }
      } else {
        // Create
        const response = await rentcarApi.vendors.create(dataToSave);
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

  const handleDeleteVendor = async (id: number, vendorName: string) => {
    // 2단계 확인 다이얼로그
    const confirmMessage = `업체 "${vendorName}"를 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.\n- 해당 업체의 모든 차량이 삭제됩니다.\n- 완료되지 않은 예약이 있으면 삭제가 차단됩니다.\n\n계속하시려면 확인을 눌러주세요.`;

    if (!confirm(confirmMessage)) return;

    // 2차 확인
    const finalConfirm = confirm(`정말로 "${vendorName}" 업체를 삭제하시겠습니까?`);
    if (!finalConfirm) return;

    try {
      // 관리자 전용 API 사용
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`/api/admin/vendors/${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-id': user.id
        }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('벤더가 삭제되었습니다.');
        loadVendors();
      } else {
        toast.error(data.message || '벤더 삭제에 실패했습니다.');
      }
    } catch (error) {
      toast.error('벤더 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleApiSync = async (vendorId: number, vendorName: string) => {
    const confirmMessage = `"${vendorName}" 업체 API에서 차량 데이터를 동기화하시겠습니까?\n\n이 작업은 업체의 API 서버에서 차량 목록을 가져와 자동으로 등록/업데이트합니다.`;

    if (!confirm(confirmMessage)) return;

    const loadingToast = toast.loading('API에서 차량 데이터를 가져오는 중...');

    try {
      const response = await fetch(`/api/admin/rentcar/sync/${vendorId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      toast.dismiss(loadingToast);

      if (data.success) {
        toast.success(data.message || 'API 동기화가 완료되었습니다.');
        if (data.data?.errors && data.data.errors.length > 0) {
          console.warn('일부 차량 동기화 실패:', data.data.errors);
        }
        loadVehicles();
        loadVendors();
      } else {
        toast.error(data.message || 'API 동기화에 실패했습니다.');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('API 동기화 중 오류가 발생했습니다.');
      console.error('API sync error:', error);
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

  // CSV 업로드 관련 함수
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      parseCsvFile(file);
    }
  };

  const parseCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        toast.error('CSV 파일에 데이터가 없습니다.');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      setCsvPreview(rows);
      toast.success(`${rows.length}개 차량 데이터를 읽었습니다.`);
    };
    reader.readAsText(file);
  };

  const handleCsvUpload = async () => {
    if (!vendorFilter) {
      toast.error('벤더를 먼저 선택해주세요.');
      return;
    }

    if (csvPreview.length === 0) {
      toast.error('업로드할 데이터가 없습니다.');
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const row of csvPreview) {
        try {
          const vehicleData: RentcarVehicleFormData = {
            vehicle_code: row['vehicle_code'] || row['차량코드'] || `AUTO-${Date.now()}`,
            brand: row['brand'] || row['브랜드'] || '',
            model: row['model'] || row['모델'] || '',
            year: parseInt(row['year'] || row['연식']) || new Date().getFullYear(),
            display_name: row['display_name'] || row['차량명'] || `${row['brand']} ${row['model']}`,
            vehicle_class: (row['vehicle_class'] || row['차량클래스'] || 'compact') as VehicleClass,
            vehicle_type: row['vehicle_type'] || row['차량타입'] || '',
            fuel_type: (row['fuel_type'] || row['연료타입'] || 'gasoline') as FuelType,
            transmission: (row['transmission'] || row['변속기'] || 'automatic') as TransmissionType,
            seating_capacity: parseInt(row['seating_capacity'] || row['승차인원']) || 5,
            door_count: parseInt(row['door_count'] || row['문수']) || 4,
            large_bags: parseInt(row['large_bags'] || row['대형수하물']) || 2,
            small_bags: parseInt(row['small_bags'] || row['소형수하물']) || 2,
            daily_rate_krw: parseInt(row['daily_rate_krw'] || row['일일요금']) || 50000,
            deposit_amount_krw: parseInt(row['deposit_amount_krw'] || row['보증금']) || 100000,
            license_requirement: row['license_requirement'] || row['면허조건'] || '',
            age_requirement: parseInt(row['age_requirement'] || row['최소나이']) || 21,
            mileage_limit_per_day: parseInt(row['mileage_limit_per_day'] || row['주행제한']) || 200,
            unlimited_mileage: (row['unlimited_mileage'] || row['무제한주행']) === 'true' || (row['unlimited_mileage'] || row['무제한주행']) === '1',
            smoking_allowed: (row['smoking_allowed'] || row['흡연허용']) === 'true' || (row['smoking_allowed'] || row['흡연허용']) === '1',
            thumbnail_url: row['thumbnail_url'] || row['썸네일'] || '',
            images: row['images'] ? row['images'].split('|').map((s: string) => s.trim()) : [],
            features: row['features'] || row['특징'] ? (row['features'] || row['특징']).split('|').map((s: string) => s.trim()) : []
          };

          const response = await rentcarApi.vehicles.create(vendorFilter, vehicleData);
          if (response.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }

      toast.success(`업로드 완료: 성공 ${successCount}개, 실패 ${errorCount}개`);
      loadVehicles();
      setIsCsvUploadDialogOpen(false);
      setCsvFile(null);
      setCsvPreview([]);
    } catch (error) {
      toast.error('CSV 업로드 중 오류가 발생했습니다.');
    }
  };

  const downloadCsvTemplate = () => {
    const headers = [
      'vehicle_code', 'brand', 'model', 'year', 'display_name',
      'vehicle_class', 'vehicle_type', 'fuel_type', 'transmission',
      'seating_capacity', 'door_count', 'large_bags', 'small_bags',
      'daily_rate_krw', 'deposit_amount_krw',
      'license_requirement', 'age_requirement', 'mileage_limit_per_day',
      'unlimited_mileage', 'smoking_allowed',
      'thumbnail_url', 'images', 'features'
    ];

    const examples = [
      // 예시 1: 소형 세단
      [
        'AVANTE2024', '현대', '아반떼', '2024', '현대 아반떼 2024',
        'compact', '세단', 'gasoline', 'automatic',
        '5', '4', '2', '2',
        '50000', '100000',
        '1종 보통 1년 이상', '21', '200',
        'false', 'false',
        'https://example.com/avante.jpg', 'https://img1.jpg|https://img2.jpg', '블루투스|후방카메라|크루즈컨트롤|열선시트'
      ],
      // 예시 2: 중형 SUV
      [
        'TUCSON2024', '현대', '투싼', '2024', '현대 투싼 하이브리드',
        'suv', 'SUV', 'hybrid', 'automatic',
        '5', '4', '3', '2',
        '80000', '150000',
        '2종 보통', '23', '250',
        'false', 'false',
        'https://example.com/tucson.jpg', '', '사각지대경고|스마트크루즈|파노라마선루프|전동시트'
      ],
      // 예시 3: 고급 세단
      [
        'GENESIS2024', '제네시스', 'G80', '2024', '제네시스 G80 3.5',
        'luxury', '세단', 'gasoline', 'automatic',
        '5', '4', '3', '2',
        '150000', '300000',
        '1종 보통 3년 이상', '26', '',
        'true', 'false',
        'https://example.com/g80.jpg', '', '어댑티브크루즈|HUD|마사지시트|Bang&Olufsen|자율주행2단계'
      ],
      // 예시 4: 전기차
      [
        'IONIQ5', '현대', '아이오닉5', '2024', '현대 아이오닉5 롱레인지',
        'electric', 'SUV', 'electric', 'automatic',
        '5', '4', '2', '1',
        '90000', '200000',
        '2종 보통', '21', '',
        'true', 'false',
        'https://example.com/ioniq5.jpg', '', 'V2L|급속충전|열펌프시스템|원격주차'
      ],
      // 예시 5: 승합차
      [
        'CARNIVAL2024', '기아', '카니발', '2024', '기아 카니발 11인승',
        'van', '승합', 'diesel', 'automatic',
        '11', '4', '4', '3',
        '120000', '200000',
        '1종 보통', '26', '300',
        'false', 'false',
        'https://example.com/carnival.jpg', '', '듀얼선루프|전좌석통풍|후석모니터|빌트인캠'
      ]
    ];

    const csv = [
      headers.join(','),
      ...examples.map(ex => ex.join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'rentcar_vehicle_template_5examples.csv';
    link.click();

    toast.success('CSV 템플릿이 다운로드되었습니다 (5개 예시 포함)');
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

  // Reload vehicles when vendor filter changes and auto-switch to vehicles tab
  useEffect(() => {
    loadVehicles();
    if (vendorFilter) {
      loadLocations(vendorFilter);
      setActiveTab('vehicles'); // Auto-switch to vehicles tab when vendor is selected
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
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="벤더코드, 사업자명, 브랜드명 검색..."
                  className="pl-10"
                  value={vendorSearchQuery}
                  onChange={(e) => {
                    setVendorSearchQuery(e.target.value);
                    setVendorCurrentPage(1);
                  }}
                />
              </div>
            </div>
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
                  {(() => {
                    const filtered = vendors.filter(vendor =>
                      vendor.vendor_code?.toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
                      vendor.business_name?.toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
                      vendor.brand_name?.toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
                      vendor.contact_name?.toLowerCase().includes(vendorSearchQuery.toLowerCase())
                    );
                    const startIndex = (vendorCurrentPage - 1) * vendorItemsPerPage;
                    const paginatedVendors = filtered.slice(startIndex, startIndex + vendorItemsPerPage);

                    return paginatedVendors.map((vendor) => (
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
                          {vendor.average_rating ? Number(vendor.average_rating).toFixed(1) : '0.0'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {vendor.api_enabled && vendor.api_url && vendor.api_key && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApiSync(vendor.id, vendor.business_name)}
                              title="업체 API에서 차량 데이터 동기화"
                              className="text-green-600 hover:text-green-700"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setVendorFilter(vendor.id);
                              setActiveTab('vehicles');
                            }}
                            title="차량 관리로 이동"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
                            onClick={() => handleDeleteVendor(vendor.id, vendor.business_name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </div>

            {/* 페이지네이션 */}
            {(() => {
              const filtered = vendors.filter(vendor =>
                vendor.vendor_code?.toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
                vendor.business_name?.toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
                vendor.brand_name?.toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
                vendor.contact_name?.toLowerCase().includes(vendorSearchQuery.toLowerCase())
              );
              const totalPages = Math.ceil(filtered.length / vendorItemsPerPage);
              if (totalPages <= 1) return null;

              return (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    총 {filtered.length}개 벤더 (페이지 {vendorCurrentPage} / {totalPages})
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setVendorCurrentPage(prev => Math.max(1, prev - 1))} disabled={vendorCurrentPage === 1}>이전</Button>
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum = totalPages <= 5 ? i + 1 : vendorCurrentPage <= 3 ? i + 1 : vendorCurrentPage >= totalPages - 2 ? totalPages - 4 + i : vendorCurrentPage - 2 + i;
                      return <Button key={pageNum} variant={vendorCurrentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setVendorCurrentPage(pageNum)} className={vendorCurrentPage === pageNum ? "bg-[#8B5FBF] hover:bg-[#7A4FB5]" : ""}>{pageNum}</Button>;
                    })}
                    <Button variant="outline" size="sm" onClick={() => setVendorCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={vendorCurrentPage === totalPages}>다음</Button>
                  </div>
                </div>
              );
            })()}
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
                  value={vendorFilter?.toString() || 'all'}
                  onValueChange={(value) => setVendorFilter(value === 'all' ? null : parseInt(value))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="벤더 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 벤더</SelectItem>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.business_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setIsCsvUploadDialogOpen(true)}
                  disabled={!vendorFilter}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  CSV 대량 업로드
                </Button>
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
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="차량명, 브랜드, 모델 검색..."
                  className="pl-10"
                  value={vehicleSearchQuery}
                  onChange={(e) => {
                    setVehicleSearchQuery(e.target.value);
                    setVehicleCurrentPage(1);
                  }}
                />
              </div>
            </div>
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
                    <TableHead>특징</TableHead>
                    <TableHead>일일 요금</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const filtered = vehicles.filter(vehicle =>
                      vehicle.display_name?.toLowerCase().includes(vehicleSearchQuery.toLowerCase()) ||
                      vehicle.brand?.toLowerCase().includes(vehicleSearchQuery.toLowerCase()) ||
                      vehicle.model?.toLowerCase().includes(vehicleSearchQuery.toLowerCase()) ||
                      vehicle.vehicle_code?.toLowerCase().includes(vehicleSearchQuery.toLowerCase())
                    );
                    const totalPages = Math.ceil(filtered.length / vehicleItemsPerPage);
                    const startIndex = (vehicleCurrentPage - 1) * vehicleItemsPerPage;
                    const paginatedVehicles = filtered.slice(startIndex, startIndex + vehicleItemsPerPage);

                    return paginatedVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">{vehicle.vehicle_code}</TableCell>
                      <TableCell>{vehicle.display_name}</TableCell>
                      <TableCell>{vehicle.brand}</TableCell>
                      <TableCell>{vehicle.model}</TableCell>
                      <TableCell>{vehicle.year}</TableCell>
                      <TableCell>{getVehicleClassLabel(vehicle.vehicle_class)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {vehicle.features && vehicle.features.length > 0 ? (
                            vehicle.features.slice(0, 3).map((feature, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {feature}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                          {vehicle.features && vehicle.features.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{vehicle.features.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
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
                    ));
                  })()}
                </TableBody>
              </Table>
            </div>

            {/* 페이지네이션 */}
            {(() => {
              const filtered = vehicles.filter(vehicle =>
                vehicle.display_name?.toLowerCase().includes(vehicleSearchQuery.toLowerCase()) ||
                vehicle.brand?.toLowerCase().includes(vehicleSearchQuery.toLowerCase()) ||
                vehicle.model?.toLowerCase().includes(vehicleSearchQuery.toLowerCase()) ||
                vehicle.vehicle_code?.toLowerCase().includes(vehicleSearchQuery.toLowerCase())
              );
              const totalPages = Math.ceil(filtered.length / vehicleItemsPerPage);

              if (totalPages <= 1) return null;

              return (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    총 {filtered.length}개 차량 (페이지 {vehicleCurrentPage} / {totalPages})
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVehicleCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={vehicleCurrentPage === 1}
                    >
                      이전
                    </Button>
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (vehicleCurrentPage <= 3) {
                        pageNum = i + 1;
                      } else if (vehicleCurrentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = vehicleCurrentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={vehicleCurrentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setVehicleCurrentPage(pageNum)}
                          className={vehicleCurrentPage === pageNum ? "bg-[#8B5FBF] hover:bg-[#7A4FB5]" : ""}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    {totalPages > 5 && vehicleCurrentPage < totalPages - 2 && (
                      <>
                        <span className="px-2 py-1 text-gray-400">...</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setVehicleCurrentPage(totalPages)}
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVehicleCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={vehicleCurrentPage === totalPages}
                    >
                      다음
                    </Button>
                  </div>
                </div>
              );
            })()}
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
                  value={vendorFilter?.toString() || 'none'}
                  onValueChange={(value) => setVendorFilter(value === 'none' ? null : parseInt(value))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="벤더 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">벤더 선택 (필수)</SelectItem>
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
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="지점명, 도시, 주소 검색..."
                  className="pl-10"
                  value={locationSearchQuery}
                  onChange={(e) => {
                    setLocationSearchQuery(e.target.value);
                    setLocationCurrentPage(1);
                  }}
                />
              </div>
            </div>
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
                  {(() => {
                    const filtered = locations.filter(location =>
                      location.name?.toLowerCase().includes(locationSearchQuery.toLowerCase()) ||
                      location.city?.toLowerCase().includes(locationSearchQuery.toLowerCase()) ||
                      location.address?.toLowerCase().includes(locationSearchQuery.toLowerCase()) ||
                      location.location_code?.toLowerCase().includes(locationSearchQuery.toLowerCase())
                    );
                    const startIndex = (locationCurrentPage - 1) * locationItemsPerPage;
                    const paginatedLocations = filtered.slice(startIndex, startIndex + locationItemsPerPage);

                    return paginatedLocations.map((location) => (
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
                    ));
                  })()}
                </TableBody>
              </Table>
            </div>

            {/* 페이지네이션 */}
            {(() => {
              const filtered = locations.filter(location =>
                location.name?.toLowerCase().includes(locationSearchQuery.toLowerCase()) ||
                location.city?.toLowerCase().includes(locationSearchQuery.toLowerCase()) ||
                location.address?.toLowerCase().includes(locationSearchQuery.toLowerCase()) ||
                location.location_code?.toLowerCase().includes(locationSearchQuery.toLowerCase())
              );
              const totalPages = Math.ceil(filtered.length / locationItemsPerPage);
              if (totalPages <= 1) return null;

              return (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    총 {filtered.length}개 지점 (페이지 {locationCurrentPage} / {totalPages})
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setLocationCurrentPage(prev => Math.max(1, prev - 1))} disabled={locationCurrentPage === 1}>이전</Button>
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum = totalPages <= 5 ? i + 1 : locationCurrentPage <= 3 ? i + 1 : locationCurrentPage >= totalPages - 2 ? totalPages - 4 + i : locationCurrentPage - 2 + i;
                      return <Button key={pageNum} variant={locationCurrentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setLocationCurrentPage(pageNum)} className={locationCurrentPage === pageNum ? "bg-[#8B5FBF] hover:bg-[#7A4FB5]" : ""}>{pageNum}</Button>;
                    })}
                    <Button variant="outline" size="sm" onClick={() => setLocationCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={locationCurrentPage === totalPages}>다음</Button>
                  </div>
                </div>
              );
            })()}
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
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="예약번호, 고객명, 이메일 검색..."
                  className="pl-10"
                  value={bookingSearchQuery}
                  onChange={(e) => {
                    setBookingSearchQuery(e.target.value);
                    setBookingCurrentPage(1);
                  }}
                />
              </div>
            </div>
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
                  {(() => {
                    const filtered = bookings.filter(booking =>
                      booking.booking_number?.toLowerCase().includes(bookingSearchQuery.toLowerCase()) ||
                      booking.customer_name?.toLowerCase().includes(bookingSearchQuery.toLowerCase()) ||
                      booking.customer_email?.toLowerCase().includes(bookingSearchQuery.toLowerCase())
                    );
                    const startIndex = (bookingCurrentPage - 1) * bookingItemsPerPage;
                    const paginatedBookings = filtered.slice(startIndex, startIndex + bookingItemsPerPage);

                    return paginatedBookings.map((booking) => (
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
                    ));
                  })()}
                </TableBody>
              </Table>
            </div>

            {/* 페이지네이션 */}
            {(() => {
              const filtered = bookings.filter(booking =>
                booking.booking_number?.toLowerCase().includes(bookingSearchQuery.toLowerCase()) ||
                booking.customer_name?.toLowerCase().includes(bookingSearchQuery.toLowerCase()) ||
                booking.customer_email?.toLowerCase().includes(bookingSearchQuery.toLowerCase())
              );
              const totalPages = Math.ceil(filtered.length / bookingItemsPerPage);
              if (totalPages <= 1) return null;

              return (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    총 {filtered.length}개 예약 (페이지 {bookingCurrentPage} / {totalPages})
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setBookingCurrentPage(prev => Math.max(1, prev - 1))} disabled={bookingCurrentPage === 1}>이전</Button>
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum = totalPages <= 5 ? i + 1 : bookingCurrentPage <= 3 ? i + 1 : bookingCurrentPage >= totalPages - 2 ? totalPages - 4 + i : bookingCurrentPage - 2 + i;
                      return <Button key={pageNum} variant={bookingCurrentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setBookingCurrentPage(pageNum)} className={bookingCurrentPage === pageNum ? "bg-[#8B5FBF] hover:bg-[#7A4FB5]" : ""}>{pageNum}</Button>;
                    })}
                    <Button variant="outline" size="sm" onClick={() => setBookingCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={bookingCurrentPage === totalPages}>다음</Button>
                  </div>
                </div>
              );
            })()}
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
            <div>
              <Label>로고 이미지</Label>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoImageChange}
                  className="cursor-pointer"
                />
                {logoImagePreview && (
                  <div className="mt-2 border rounded-lg p-2 bg-gray-50">
                    <img
                      src={logoImagePreview}
                      alt="로고 미리보기"
                      className="h-20 w-auto object-contain mx-auto"
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  또는 URL 직접 입력:
                </p>
                <Input
                  value={vendorFormData.logo_url || ''}
                  onChange={(e) => {
                    setVendorFormData({ ...vendorFormData, logo_url: e.target.value });
                    setLogoImagePreview(e.target.value);
                  }}
                  placeholder="https://... (이미지 URL)"
                />
              </div>
            </div>

            {/* PMS 연동 설정 */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-3">API 연동 설정 (선택)</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="api_enabled"
                    checked={vendorFormData.api_enabled || false}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, api_enabled: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="api_enabled" className="cursor-pointer">
                    API 자동 동기화 활성화
                  </Label>
                </div>
                {vendorFormData.api_enabled && (
                  <>
                    <div>
                      <Label>API URL*</Label>
                      <Input
                        value={vendorFormData.api_url || ''}
                        onChange={(e) => setVendorFormData({ ...vendorFormData, api_url: e.target.value })}
                        placeholder="https://api.업체.com/vehicles"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>API Key*</Label>
                        <Input
                          type="password"
                          value={vendorFormData.api_key || ''}
                          onChange={(e) => setVendorFormData({ ...vendorFormData, api_key: e.target.value })}
                          placeholder="API 인증 키 입력"
                        />
                      </div>
                      <div>
                        <Label>인증 방식</Label>
                        <Select
                          value={vendorFormData.api_auth_type || 'bearer'}
                          onValueChange={(value: any) => setVendorFormData({ ...vendorFormData, api_auth_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bearer">Bearer Token</SelectItem>
                            <SelectItem value="apikey">API Key Header</SelectItem>
                            <SelectItem value="basic">Basic Auth</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                API 연동 시 업체 시스템에서 차량 목록을 자동으로 가져와 동기화합니다.
              </p>
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
                <Label>차량 타입</Label>
                <Input
                  value={vehicleFormData.vehicle_type || ''}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, vehicle_type: e.target.value })}
                  placeholder="예: 세단, 쿠페, 해치백, 왜건"
                />
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
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <Label>면허 조건</Label>
                <Input
                  value={vehicleFormData.license_requirement || ''}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, license_requirement: e.target.value })}
                  placeholder="예: 1종 보통 1년 이상"
                />
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
            <div className="grid grid-cols-3 gap-4">
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
              <div>
                <Label>최소 운전자 나이</Label>
                <Input
                  type="number"
                  value={vehicleFormData.age_requirement || 21}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, age_requirement: parseInt(e.target.value) })}
                  placeholder="21"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>일일 주행거리 제한 (km)</Label>
                <Input
                  type="number"
                  value={vehicleFormData.mileage_limit_per_day || 200}
                  onChange={(e) => setVehicleFormData({ ...vehicleFormData, mileage_limit_per_day: parseInt(e.target.value) })}
                  placeholder="200"
                />
              </div>
              <div className="flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vehicleFormData.unlimited_mileage || false}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, unlimited_mileage: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>무제한 주행</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vehicleFormData.smoking_allowed || false}
                    onChange={(e) => setVehicleFormData({ ...vehicleFormData, smoking_allowed: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>흡연 허용</span>
                </label>
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
            <div>
              <Label>추가 이미지 URL (쉼표로 구분)</Label>
              <Input
                value={vehicleFormData.images?.join(', ') || ''}
                onChange={(e) => setVehicleFormData({ ...vehicleFormData, images: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                placeholder="https://image1.jpg, https://image2.jpg"
              />
            </div>
            <div>
              <Label>차량 특징/옵션 (쉼표로 구분)</Label>
              <Textarea
                value={vehicleFormData.features?.join(', ') || ''}
                onChange={(e) => setVehicleFormData({ ...vehicleFormData, features: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                placeholder="예: 블루투스, 후방카메라, 크루즈 컨트롤, 열선시트"
                rows={2}
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

      {/* CSV Upload Dialog */}
      <Dialog open={isCsvUploadDialogOpen} onOpenChange={setIsCsvUploadDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>CSV 대량 업로드</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  CSV 파일 형식 안내
                </h4>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• 첫 번째 줄은 반드시 헤더(컬럼명)여야 합니다</li>
                  <li>• 영어 또는 한글 헤더 모두 지원 (예: vehicle_code 또는 차량코드)</li>
                  <li>• 여러 이미지나 특징은 <code className="bg-white px-1 font-bold">|</code> (파이프) 문자로 구분</li>
                  <li>• 필수 항목: 차량코드, 브랜드, 모델, 일일요금</li>
                </ul>
              </div>

              <div className="bg-white p-3 rounded border">
                <p className="font-semibold text-sm mb-2">📌 필수 컬럼 (영어/한글)</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><Badge variant="outline">vehicle_code</Badge> 또는 <Badge variant="outline">차량코드</Badge></div>
                  <div><Badge variant="outline">brand</Badge> 또는 <Badge variant="outline">브랜드</Badge></div>
                  <div><Badge variant="outline">model</Badge> 또는 <Badge variant="outline">모델</Badge></div>
                  <div><Badge variant="outline">daily_rate_krw</Badge> 또는 <Badge variant="outline">일일요금</Badge></div>
                </div>
              </div>

              <div className="bg-white p-3 rounded border">
                <p className="font-semibold text-sm mb-2">📋 선택 컬럼</p>
                <div className="text-xs space-y-1 text-gray-600">
                  <p><strong>기본:</strong> year(연식), display_name(차량명), vehicle_type(차량타입)</p>
                  <p><strong>사양:</strong> vehicle_class(클래스), fuel_type(연료), transmission(변속기)</p>
                  <p><strong>용량:</strong> seating_capacity(승차인원), door_count(문수), large_bags(대형수하물), small_bags(소형수하물)</p>
                  <p><strong>가격:</strong> deposit_amount_krw(보증금)</p>
                  <p><strong>조건:</strong> license_requirement(면허), age_requirement(최소나이)</p>
                  <p><strong>주행:</strong> mileage_limit_per_day(주행제한), unlimited_mileage(무제한주행: true/false)</p>
                  <p><strong>기타:</strong> smoking_allowed(흡연: true/false)</p>
                  <p><strong>이미지:</strong> thumbnail_url(썸네일), images(추가이미지들, | 구분)</p>
                  <p><strong>특징:</strong> features(특징들, | 구분)</p>
                </div>
              </div>

              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <p className="text-sm font-semibold mb-1">⚠️ 중요</p>
                <ul className="text-xs space-y-1 text-gray-700">
                  <li>• 비어있는 컬럼은 기본값으로 자동 설정됩니다</li>
                  <li>• vehicle_class: compact, sedan, suv, luxury, van, truck, electric</li>
                  <li>• fuel_type: gasoline, diesel, electric, hybrid</li>
                  <li>• transmission: automatic, manual</li>
                  <li>• true/false 값: true, 1, yes → true / 나머지 → false</li>
                </ul>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={downloadCsvTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                📥 CSV 템플릿 다운로드 (예시 포함)
              </Button>
            </div>

            <div>
              <Label>CSV 파일 선택</Label>
              <div className="mt-2">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                />
              </div>
            </div>

            {csvPreview.length > 0 && (
              <div>
                <Label>미리보기 ({csvPreview.length}개 차량)</Label>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>차량코드</TableHead>
                          <TableHead>브랜드</TableHead>
                          <TableHead>모델</TableHead>
                          <TableHead>연식</TableHead>
                          <TableHead>클래스</TableHead>
                          <TableHead>일일요금</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvPreview.slice(0, 10).map((row, index) => (
                          <TableRow key={index}>
                            <TableCell>{row['vehicle_code'] || row['차량코드']}</TableCell>
                            <TableCell>{row['brand'] || row['브랜드']}</TableCell>
                            <TableCell>{row['model'] || row['모델']}</TableCell>
                            <TableCell>{row['year'] || row['연식']}</TableCell>
                            <TableCell>{row['vehicle_class'] || row['차량클래스']}</TableCell>
                            <TableCell>{row['daily_rate_krw'] || row['일일요금']}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {csvPreview.length > 10 && (
                      <div className="text-center text-sm text-gray-500 py-2 bg-gray-50">
                        ...외 {csvPreview.length - 10}개 차량 더보기
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCsvUploadDialogOpen(false);
                  setCsvFile(null);
                  setCsvPreview([]);
                }}
              >
                취소
              </Button>
              <Button
                className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                onClick={handleCsvUpload}
                disabled={csvPreview.length === 0}
              >
                <Upload className="h-4 w-4 mr-2" />
                업로드 ({csvPreview.length}개)
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

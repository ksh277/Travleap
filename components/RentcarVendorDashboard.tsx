import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

// JWT 디코딩 헬퍼 함수
function decodeJWT(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('JWT decode error:', error);
    return null;
  }
}

interface RentcarBooking {
  id: number;
  booking_number: string;
  status: string;
  vehicle_id: number;
  vehicle_model: string;
  vehicle_code: string;
  vehicle_image?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  driver_name: string;
  driver_birth?: string;  // 생년월일
  driver_license_no: string;
  pickup_at_utc: string;
  return_at_utc: string;
  actual_pickup_at?: string;  // 실제 픽업 시간
  actual_return_at_utc?: string;
  pickup_location: string;
  total_price_krw: number;
  late_return_hours?: number;
  late_return_fee_krw?: number;
  voucher_code?: string;
  pickup_vehicle_condition?: {
    condition: string;
    fuel_level: string;
    mileage: number;
    damage_notes: string;
    images: string[];
  };
  return_vehicle_condition?: {
    condition: string;
    fuel_level: string;
    mileage: number;
    damage_notes: string;
    images: string[];
  };
  extras?: Array<{
    extra_id: number;
    name: string;
    category: string;
    price_type: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  extras_count?: number;
  extras_total?: number;
  insurance_name?: string;
  insurance_fee_krw?: number;
}

type TabType = 'all' | 'voucher' | 'check-in' | 'check-out' | 'today' | 'refunds' | 'blocks' | 'extras' | 'vehicles' | 'calendar' | 'damage-claims';

export default function RentcarVendorDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [bookings, setBookings] = useState<RentcarBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 정렬, 페이지네이션, 필터
  const [sortBy, setSortBy] = useState<'date' | 'customer' | 'vehicle' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDetailBooking, setSelectedDetailBooking] = useState<RentcarBooking | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Voucher verification
  const [voucherCode, setVoucherCode] = useState('');
  const [verifiedBooking, setVerifiedBooking] = useState<RentcarBooking | null>(null);
  const [voucherError, setVoucherError] = useState('');

  // Check-in state
  const [checkInBooking, setCheckInBooking] = useState<RentcarBooking | null>(null);
  const [vehicleCondition, setVehicleCondition] = useState('');
  const [fuelLevel, setFuelLevel] = useState('');
  const [mileage, setMileage] = useState('');
  const [damageNotes, setDamageNotes] = useState('');
  const [actualPickupTime, setActualPickupTime] = useState('');  // 실제 픽업 시간
  const [pickupImages, setPickupImages] = useState<string[]>([]);  // 픽업 시 이미지
  const [uploadingImage, setUploadingImage] = useState(false);

  // Check-out state
  const [checkOutBooking, setCheckOutBooking] = useState<RentcarBooking | null>(null);
  const [returnCondition, setReturnCondition] = useState('');
  const [returnFuelLevel, setReturnFuelLevel] = useState('');
  const [returnMileage, setReturnMileage] = useState('');
  const [returnDamageNotes, setReturnDamageNotes] = useState('');
  const [returnImages, setReturnImages] = useState<string[]>([]);  // 반납 시 이미지
  const [calculatedLateFee, setCalculatedLateFee] = useState(0);

  // Refunds state
  const [refundsData, setRefundsData] = useState<any>(null);

  // Vehicle blocks state
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [activeBlocks, setActiveBlocks] = useState<any[]>([]);
  const [blockForm, setBlockForm] = useState({
    vehicle_id: '',
    starts_at: '',
    ends_at: '',
    block_reason: 'external_booking',
    note: ''
  });

  // Extras management state
  const [extras, setExtras] = useState<any[]>([]);
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [editingExtra, setEditingExtra] = useState<any>(null);
  const [extraForm, setExtraForm] = useState({
    name: '',
    description: '',
    category: 'equipment',
    price_type: 'per_day',
    price_krw: '',
    max_quantity: '1',
    has_inventory: false,
    current_stock: ''
  });

  // Calendar state
  const [selectedVehicleForCalendar, setSelectedVehicleForCalendar] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDateBookings, setSelectedDateBookings] = useState<RentcarBooking[]>([]);

  // Damage claims state
  const [damageClaimForm, setDamageClaimForm] = useState({
    booking_id: '',
    damage_amount: '',
    damage_reason: '',
    damage_description: ''
  });
  const [damageImages, setDamageImages] = useState<string[]>([]);
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === 'all') {
      fetchAllBookings();
    } else if (activeTab === 'today') {
      fetchTodayBookings();
    } else if (activeTab === 'refunds') {
      fetchRefundsData();
    } else if (activeTab === 'blocks') {
      fetchVehiclesAndBlocks();
    } else if (activeTab === 'extras') {
      fetchExtras();
    } else if (activeTab === 'vehicles') {
      fetchVehiclesForStock();
    } else if (activeTab === 'calendar') {
      fetchAllBookings();
      if (vehicles.length === 0) {
        fetchVehiclesForStock();
      }
    } else if (activeTab === 'damage-claims') {
      fetchAllBookings();
    }
  }, [activeTab]);

  const fetchAllBookings = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/vendor/rentcar/bookings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setBookings(result.data || []);
      } else {
        setError(result.message || '예약 목록을 불러오는데 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayBookings = async () => {
    setLoading(true);
    setError('');

    try {
      // 오늘 날짜를 YYYY-MM-DD 형식으로 전송
      const today = format(new Date(), 'yyyy-MM-dd');

      const response = await fetch(`/api/rentcar/bookings/today?start=${today}&end=${today}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setBookings(result.data || []);
      } else {
        setError(result.message || '오늘 예약을 불러오는데 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch refunds data
  const fetchRefundsData = async () => {
    setLoading(true);
    setError('');

    try {
      // JWT에서 vendor_id 추출
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('로그인이 필요합니다.');
        setLoading(false);
        return;
      }

      const decoded = decodeJWT(token);
      if (!decoded || !decoded.userId) {
        setError('유효하지 않은 토큰입니다.');
        setLoading(false);
        return;
      }

      // JWT에서 vendorId 자동 추출 (서버에서 처리)
      const response = await fetch(`/api/rentcar/vendor/refunds`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setRefundsData(result.data);
      } else {
        setError(result.message || '환불 내역을 불러오는데 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch vehicles and blocks
  const fetchVehiclesAndBlocks = async () => {
    setLoading(true);
    setError('');

    try {
      // JWT에서 vendor_id 추출
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('로그인이 필요합니다.');
        setLoading(false);
        return;
      }

      const decoded = decodeJWT(token);
      if (!decoded || !decoded.userId) {
        setError('유효하지 않은 토큰입니다.');
        setLoading(false);
        return;
      }

      // 차량 목록 조회 (JWT에서 vendorId 자동 추출)
      const vehiclesResponse = await fetch(`/api/rentcar/vendor-vehicles/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const vehiclesData = await vehiclesResponse.json();

      if (vehiclesData.success) {
        setVehicles(vehiclesData.data || []);

        // 활성 차단 목록 조회 (모든 차량)
        const blocksPromises = vehiclesData.data.map((v: any) =>
          fetch(`/api/rentcar/vehicles/${v.id}/blocks?is_active=true`)
            .then(r => r.json())
        );

        const blocksResults = await Promise.all(blocksPromises);
        const allBlocks = blocksResults.flatMap(r => r.success ? r.data.blocks : []);
        setActiveBlocks(allBlocks);
      } else {
        setError(vehiclesData.message || '차량 목록을 불러오는데 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch extras
  const fetchExtras = async () => {
    setExtrasLoading(true);

    try {
      const response = await fetch('/api/vendor/rentcar/extras', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setExtras(result.data.extras || []);
      } else {
        setError(result.message || '옵션을 불러오는데 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '서버 오류가 발생했습니다.');
    } finally {
      setExtrasLoading(false);
    }
  };

  // Fetch vehicles for stock management
  const fetchVehiclesForStock = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/vendor/rentcar/vehicles', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setVehicles(result.data || []);
      } else {
        setError(result.message || '차량 목록을 불러오는데 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Update vehicle stock
  const updateVehicleStock = async (vehicleId: number, newStock: number) => {
    if (newStock < 0) {
      alert('재고는 0 이상이어야 합니다.');
      return;
    }

    try {
      const response = await fetch('/api/vendor/rentcar/vehicles/stock', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          stock: newStock
        })
      });

      const result = await response.json();

      if (result.success) {
        // 목록 새로고침
        fetchVehiclesForStock();
        alert('재고가 업데이트되었습니다.');
      } else {
        alert(result.message || '재고 업데이트에 실패했습니다.');
      }
    } catch (err: any) {
      alert(err.message || '서버 오류가 발생했습니다.');
    }
  };

  // Create or update extra
  const saveExtra = async () => {
    if (!extraForm.name || !extraForm.price_krw) {
      alert('옵션명과 가격은 필수입니다.');
      return;
    }

    try {
      const method = editingExtra ? 'PUT' : 'POST';

      const payload: any = {
        name: extraForm.name,
        description: extraForm.description,
        category: extraForm.category,
        price_krw: parseInt(extraForm.price_krw),
        price_type: extraForm.price_type,
        has_inventory: extraForm.has_inventory,
        current_stock: parseInt(extraForm.current_stock) || 0,
        max_quantity: parseInt(extraForm.max_quantity) || 1,
        display_order: 0,
        is_active: true
      };

      if (editingExtra) {
        payload.id = editingExtra.id;
      }

      const response = await fetch('/api/vendor/rentcar/extras', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        alert(editingExtra ? '옵션이 수정되었습니다.' : '옵션이 추가되었습니다.');
        setShowExtraForm(false);
        setEditingExtra(null);
        setExtraForm({
          name: '',
          description: '',
          category: 'equipment',
          price_type: 'per_day',
          price_krw: '',
          max_quantity: '1',
          has_inventory: false,
          current_stock: ''
        });
        fetchExtras();
      } else {
        alert(result.message || '저장에 실패했습니다.');
      }
    } catch (err: any) {
      alert(err.message || '서버 오류가 발생했습니다.');
    }
  };

  // Delete extra
  const deleteExtra = async (id: number) => {
    if (!confirm('정말 이 옵션을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/vendor/rentcar/extras?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      const result = await response.json();

      if (result.success) {
        alert('옵션이 삭제되었습니다.');
        fetchExtras();
      } else {
        alert(result.message || '삭제에 실패했습니다.');
      }
    } catch (err: any) {
      alert(err.message || '서버 오류가 발생했습니다.');
    }
  };

  // Edit extra
  const startEditExtra = (extra: any) => {
    setEditingExtra(extra);
    setExtraForm({
      name: extra.name,
      description: extra.description || '',
      category: extra.category,
      price_type: extra.price_type,
      price_krw: extra.price_krw.toString(),
      max_quantity: extra.max_quantity.toString(),
      has_inventory: extra.has_inventory === 1,
      current_stock: extra.current_stock?.toString() || ''
    });
    setShowExtraForm(true);
  };

  // Create vehicle block
  const createBlock = async () => {
    if (!blockForm.vehicle_id || !blockForm.starts_at || !blockForm.ends_at) {
      alert('모든 필수 필드를 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`/api/rentcar/vehicles/${blockForm.vehicle_id}/blocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          starts_at: blockForm.starts_at,
          ends_at: blockForm.ends_at,
          block_reason: blockForm.block_reason,
          notes: blockForm.note
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('차량 차단이 등록되었습니다.');
        setBlockForm({
          vehicle_id: '',
          starts_at: '',
          ends_at: '',
          block_reason: 'external_booking',
          note: ''
        });
        fetchVehiclesAndBlocks();
      } else {
        alert(result.error || '차단 등록에 실패했습니다.');
      }
    } catch (err: any) {
      alert(err.message || '서버 오류가 발생했습니다.');
    }
  };

  // Delete vehicle block (deactivate using PATCH)
  const deleteBlock = async (blockId: number, vehicleId: number) => {
    if (!confirm('이 차단을 해제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/rentcar/vehicles/${vehicleId}/blocks/${blockId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ is_active: false })
      });

      const result = await response.json();

      if (result.success) {
        alert('차단이 해제되었습니다.');
        fetchVehiclesAndBlocks();
      } else {
        alert(result.error || '차단 해제에 실패했습니다.');
      }
    } catch (err: any) {
      alert(err.message || '서버 오류가 발생했습니다.');
    }
  };

  // Verify voucher
  const verifyVoucher = async () => {
    if (!voucherCode.trim()) {
      setVoucherError('바우처 코드를 입력해주세요.');
      return;
    }

    setLoading(true);
    setVoucherError('');
    setVerifiedBooking(null);

    try {
      const response = await fetch(`/api/rentcar/voucher/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ voucher_code: voucherCode })
      });

      const result = await response.json();

      if (result.success) {
        setVerifiedBooking(result.data);
      } else {
        setVoucherError(result.message || '바우처 인증에 실패했습니다.');
      }
    } catch (err: any) {
      setVoucherError(err.message || '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Start check-in from verified voucher
  const startCheckInFromVoucher = () => {
    if (verifiedBooking) {
      setCheckInBooking(verifiedBooking);
      setActiveTab('check-in');
      setVoucherCode('');
      setVerifiedBooking(null);
    }
  };

  // 이미지 업로드 핸들러
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (result.success && result.url) {
          uploadedUrls.push(result.url);
        } else {
          console.error('이미지 업로드 실패:', result.error);
        }
      }

      setPickupImages([...pickupImages, ...uploadedUrls]);
      alert(`${uploadedUrls.length}개 이미지가 업로드되었습니다.`);
    } catch (err: any) {
      alert('이미지 업로드 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // 이미지 삭제 핸들러
  const removeImage = (index: number) => {
    setPickupImages(pickupImages.filter((_, i) => i !== index));
  };

  // 반납 이미지 업로드 핸들러
  const handleReturnImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (result.success && result.url) {
          uploadedUrls.push(result.url);
        } else {
          console.error('이미지 업로드 실패:', result.error);
        }
      }

      setReturnImages([...returnImages, ...uploadedUrls]);
      alert(`${uploadedUrls.length}개 이미지가 업로드되었습니다.`);
    } catch (err: any) {
      alert('이미지 업로드 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // 반납 이미지 삭제 핸들러
  const removeReturnImage = (index: number) => {
    setReturnImages(returnImages.filter((_, i) => i !== index));
  };

  // Perform check-in
  const performCheckIn = async () => {
    if (!checkInBooking) return;

    if (!vehicleCondition || !fuelLevel || !mileage) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const requestBody: any = {
        booking_number: checkInBooking.booking_number,
        vehicle_condition: vehicleCondition,
        fuel_level: fuelLevel,
        mileage: parseInt(mileage),
        damage_notes: damageNotes || ''
      };

      // 실제 픽업 시간이 입력된 경우 추가
      if (actualPickupTime) {
        requestBody.actual_pickup_time = new Date(actualPickupTime).toISOString();
      }

      // 이미지가 있는 경우 추가
      if (pickupImages.length > 0) {
        requestBody.pickup_images = pickupImages;
      }

      const response = await fetch(`/api/rentcar/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (result.success) {
        alert('체크인이 완료되었습니다!');
        // Reset form
        setCheckInBooking(null);
        setVehicleCondition('');
        setFuelLevel('');
        setMileage('');
        setDamageNotes('');
        setActualPickupTime('');
        setPickupImages([]);
        setActiveTab('today');
        fetchTodayBookings();
      } else {
        alert(result.message || '체크인에 실패했습니다.');
      }
    } catch (err: any) {
      alert(err.message || '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Start check-out from booking
  const startCheckOut = (booking: RentcarBooking) => {
    setCheckOutBooking(booking);
    setActiveTab('check-out');
  };

  // Calculate late fee preview
  const calculateLateFeePreview = () => {
    if (!checkOutBooking) return;

    const now = new Date();
    const plannedReturnTime = new Date(checkOutBooking.return_at_utc);
    const graceMinutes = 30;
    const gracePeriodMs = graceMinutes * 60 * 1000;
    const timeAfterGrace = now.getTime() - plannedReturnTime.getTime() - gracePeriodMs;

    if (timeAfterGrace > 0) {
      const lateHours = Math.ceil(timeAfterGrace / (60 * 60 * 1000));
      // Assume hourly rate is 10% of daily rate (estimate)
      const estimatedHourlyRate = Math.floor(checkOutBooking.total_price_krw * 0.1);
      const lateFee = lateHours * estimatedHourlyRate;
      setCalculatedLateFee(lateFee);
    } else {
      setCalculatedLateFee(0);
    }
  };

  useEffect(() => {
    if (checkOutBooking) {
      calculateLateFeePreview();
    }
  }, [checkOutBooking]);

  // Perform check-out
  const performCheckOut = async () => {
    if (!checkOutBooking) return;

    if (!returnCondition || !returnFuelLevel || !returnMileage) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/rentcar/check-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          booking_number: checkOutBooking.booking_number,
          vehicle_condition: returnCondition,
          fuel_level: returnFuelLevel,
          mileage: parseInt(returnMileage),
          damage_notes: returnDamageNotes || '',
          return_images: returnImages  // 반납 이미지 추가
        })
      });

      const result = await response.json();

      if (result.success) {
        const finalLateFee = result.data.late_return_fee_krw || 0;

        let message = '체크아웃이 완료되었습니다!';

        // 연체료 표시
        if (finalLateFee > 0) {
          message += `\n\n연체료: ₩${finalLateFee.toLocaleString()}`;
        }

        alert(message);

        // Reset form
        setCheckOutBooking(null);
        setReturnCondition('');
        setReturnFuelLevel('');
        setReturnMileage('');
        setReturnDamageNotes('');
        setReturnImages([]);
        setCalculatedLateFee(0);
        setActiveTab('today');
        fetchTodayBookings();
      } else {
        alert(result.message || '체크아웃에 실패했습니다.');
      }
    } catch (err: any) {
      alert(err.message || '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Handle refund
  const handleRefund = async (booking: RentcarBooking) => {
    if (!confirm(`예약 ${booking.booking_number}을(를) 환불하시겠습니까?`)) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/rentcar/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          booking_number: booking.booking_number
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('환불이 완료되었습니다!');
        fetchTodayBookings();
      } else {
        alert(result.message || '환불에 실패했습니다.');
      }
    } catch (err: any) {
      alert(err.message || '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // View pickup record
  const viewPickupRecord = async (booking: RentcarBooking) => {
    if (!booking.pickup_vehicle_condition) {
      alert('픽업 기록이 없습니다.');
      return;
    }

    const condition = typeof booking.pickup_vehicle_condition === 'string'
      ? JSON.parse(booking.pickup_vehicle_condition)
      : booking.pickup_vehicle_condition;

    let message = `=== 픽업 기록 ===\n\n`;
    message += `예약번호: ${booking.booking_number}\n`;
    message += `차량: ${booking.vehicle_model}\n\n`;
    message += `차량 상태: ${condition.condition || '-'}\n`;
    message += `연료량: ${condition.fuel_level || '-'}\n`;
    message += `주행거리: ${condition.mileage || '-'} km\n`;
    message += `파손/손상: ${condition.damage_notes || '없음'}\n`;

    if (condition.images && condition.images.length > 0) {
      message += `\n이미지: ${condition.images.length}장\n`;
    }

    alert(message);
  };

  // View return record
  const viewReturnRecord = async (booking: RentcarBooking) => {
    if (!booking.return_vehicle_condition) {
      alert('반납 기록이 없습니다.');
      return;
    }

    const returnCond = typeof booking.return_vehicle_condition === 'string'
      ? JSON.parse(booking.return_vehicle_condition)
      : booking.return_vehicle_condition;

    let message = `=== 반납 기록 ===\n\n`;
    message += `예약번호: ${booking.booking_number}\n`;
    message += `차량: ${booking.vehicle_model}\n\n`;
    message += `차량 상태: ${returnCond.condition || '-'}\n`;
    message += `연료량: ${returnCond.fuel_level || '-'}\n`;
    message += `주행거리: ${returnCond.mileage || '-'} km\n`;
    message += `파손/손상: ${returnCond.damage_notes || '없음'}\n`;

    if (returnCond.images && returnCond.images.length > 0) {
      message += `\n이미지: ${returnCond.images.length}장\n`;
    }

    if (booking.late_return_hours && booking.late_return_hours > 0) {
      message += `\n⚠️ 연체: ${booking.late_return_hours}시간 (₩${booking.late_return_fee_krw?.toLocaleString()})\n`;
    }

    alert(message);
  };

  // Pending booking handlers
  const handleConfirmBooking = async (booking: RentcarBooking) => {
    if (!confirm(`예약 ${booking.booking_number}을(를) 확정하시겠습니까?`)) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/rentcar/bookings/${booking.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ booking_status: 'confirmed' })
      });

      const result = await response.json();

      if (result.success) {
        alert('예약이 확정되었습니다!');
        fetchTodayBookings();
      } else {
        alert(result.error || '예약 확정에 실패했습니다.');
      }
    } catch (err: any) {
      alert(err.message || '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (booking: RentcarBooking) => {
    const reason = prompt(`예약 ${booking.booking_number}을(를) 취소하시겠습니까?\n\n취소 사유를 입력하세요:`);
    if (!reason) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/rentcar/bookings/${booking.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          booking_status: 'canceled',
          cancellation_reason: reason
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('예약이 취소되었습니다.');
        fetchTodayBookings();
      } else {
        alert(result.error || '예약 취소에 실패했습니다.');
      }
    } catch (err: any) {
      alert(err.message || '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Sorting and filtering logic
  const getSortedAndFilteredBookings = () => {
    let filtered = [...bookings];

    // Date filtering
    if (startDate || endDate) {
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.pickup_at_utc);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start && bookingDate < start) return false;
        if (end && bookingDate > end) return false;
        return true;
      });
    }

    // Search filtering
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.customer_name?.toLowerCase().includes(query) ||
        booking.booking_number?.toLowerCase().includes(query) ||
        booking.customer_email?.toLowerCase().includes(query) ||
        booking.customer_phone?.toLowerCase().includes(query) ||
        booking.vehicle_model?.toLowerCase().includes(query) ||
        booking.vehicle_code?.toLowerCase().includes(query) ||
        booking.driver_name?.toLowerCase().includes(query)
      );
    }

    // Status filtering
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Sorting
    filtered.sort((a, b) => {
      let compareA: any, compareB: any;

      switch (sortBy) {
        case 'date':
          compareA = new Date(a.pickup_at_utc).getTime();
          compareB = new Date(b.pickup_at_utc).getTime();
          break;
        case 'customer':
          compareA = a.customer_name.toLowerCase();
          compareB = b.customer_name.toLowerCase();
          break;
        case 'vehicle':
          compareA = a.vehicle_model.toLowerCase();
          compareB = b.vehicle_model.toLowerCase();
          break;
        case 'status':
          compareA = a.status;
          compareB = b.status;
          break;
        default:
          return 0;
      }

      if (compareA < compareB) return sortOrder === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  // Pagination logic
  const getPaginatedBookings = () => {
    const filtered = getSortedAndFilteredBookings();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(getSortedAndFilteredBookings().length / itemsPerPage);

  // CSV Export
  const exportToCSV = () => {
    const data = getSortedAndFilteredBookings();
    if (data.length === 0) {
      alert('내보낼 데이터가 없습니다.');
      return;
    }

    const headers = [
      '예약번호', '차량', '차량번호', '고객명', '전화번호', '이메일',
      '운전자', '면허번호', '픽업예정', '반납예정', '픽업위치', '결제금액', '상태'
    ];

    const rows = data.map(booking => [
      booking.booking_number,
      booking.vehicle_model,
      booking.vehicle_code,
      booking.customer_name,
      booking.customer_phone,
      booking.customer_email,
      booking.driver_name,
      booking.driver_license_no,
      format(new Date(booking.pickup_at_utc), 'yyyy-MM-dd HH:mm', { locale: ko }),
      format(new Date(booking.return_at_utc), 'yyyy-MM-dd HH:mm', { locale: ko }),
      booking.pickup_location || '-',
      booking.total_price_krw,
      booking.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rentcar_bookings_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Revenue stats
  const getRevenueStats = () => {
    const filtered = getSortedAndFilteredBookings();
    const totalRevenue = filtered.reduce((sum, b) => sum + b.total_price_krw, 0);
    const confirmedRevenue = filtered
      .filter(b => b.status === 'confirmed' || b.status === 'picked_up' || b.status === 'returned' || b.status === 'completed')
      .reduce((sum, b) => sum + b.total_price_krw, 0);
    const pendingRevenue = filtered
      .filter(b => b.status === 'pending')
      .reduce((sum, b) => sum + b.total_price_krw, 0);

    return {
      totalBookings: filtered.length,
      totalRevenue,
      confirmedRevenue,
      pendingRevenue,
      confirmedCount: filtered.filter(b => b.status === 'confirmed' || b.status === 'picked_up' || b.status === 'returned' || b.status === 'completed').length,
      pendingCount: filtered.filter(b => b.status === 'pending').length
    };
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: '결제대기', className: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: '확정', className: 'bg-blue-100 text-blue-800' },
      picked_up: { label: '대여중', className: 'bg-green-100 text-green-800' },
      returned: { label: '반납완료', className: 'bg-purple-100 text-purple-800' },
      completed: { label: '완료', className: 'bg-gray-100 text-gray-800' },
      canceled: { label: '취소', className: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-600' };

    return (
      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">렌트카 벤더 대시보드</h1>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-4 px-6 text-center font-medium transition ${
                activeTab === 'all'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              전체 예약
            </button>
            <button
              onClick={() => setActiveTab('today')}
              className={`flex-1 py-4 px-6 text-center font-medium transition ${
                activeTab === 'today'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              오늘 예약
            </button>
            <button
              onClick={() => setActiveTab('voucher')}
              className={`flex-1 py-4 px-6 text-center font-medium transition ${
                activeTab === 'voucher'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              바우처 인증
            </button>
            <button
              onClick={() => setActiveTab('check-in')}
              className={`flex-1 py-4 px-6 text-center font-medium transition ${
                activeTab === 'check-in'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              체크인
            </button>
            <button
              onClick={() => setActiveTab('check-out')}
              className={`flex-1 py-4 px-6 text-center font-medium transition ${
                activeTab === 'check-out'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              체크아웃
            </button>
            <button
              onClick={() => setActiveTab('refunds')}
              className={`flex-1 py-4 px-6 text-center font-medium transition ${
                activeTab === 'refunds'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              환불/정산 관리
            </button>
            <button
              onClick={() => setActiveTab('blocks')}
              className={`flex-1 py-4 px-6 text-center font-medium transition ${
                activeTab === 'blocks'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🚫 차량 차단
            </button>
            <button
              onClick={() => setActiveTab('extras')}
              className={`flex-1 py-4 px-6 text-center font-medium transition ${
                activeTab === 'extras'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ⚙️ 옵션 관리
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex-1 py-4 px-6 text-center font-medium transition ${
                activeTab === 'calendar'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📅 차량 캘린더
            </button>
            <button
              onClick={() => setActiveTab('damage-claims')}
              className={`flex-1 py-4 px-6 text-center font-medium transition ${
                activeTab === 'damage-claims'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              💰 손해 배상 청구
            </button>
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`flex-1 py-4 px-6 text-center font-medium transition ${
                activeTab === 'vehicles'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🚗 차량 재고
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {/* All Bookings Tab */}
          {activeTab === 'all' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">전체 예약 목록</h2>
                <button
                  onClick={fetchAllBookings}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  🔄 새로고침
                </button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="text-center py-8 text-gray-600">예약 목록을 불러오는 중...</div>
              ) : sortedAndPagedBookings.length > 0 ? (
                <>
                  {/* 검색 및 필터 */}
                  <div className="mb-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <input
                        type="text"
                        placeholder="고객명, 예약번호, 전화번호, 이메일, 차량명..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">전체 상태</option>
                        <option value="pending">결제대기</option>
                        <option value="confirmed">확정</option>
                        <option value="picked_up">대여중</option>
                        <option value="returned">반납완료</option>
                        <option value="completed">완료</option>
                        <option value="canceled">취소</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-700">시작일:</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-700">종료일:</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">정렬 기준</label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="date">날짜</option>
                          <option value="customer">고객명</option>
                          <option value="vehicle">차량</option>
                          <option value="status">상태</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">정렬 순서</label>
                        <button
                          onClick={() =>
                            sortOrder === 'asc' ? setSortOrder('desc') : setSortOrder('asc')
                          }
                          className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                        >
                          {sortOrder === 'asc' ? '오름차순 ↑' : '내림차순 ↓'}
                        </button>
                      </div>

                      <button
                        onClick={exportToCSV}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        📥 CSV 내보내기
                      </button>
                    </div>
                  </div>

                  {/* 예약 목록 테이블 */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border p-3 text-left">예약번호</th>
                          <th className="border p-3 text-left">차량</th>
                          <th className="border p-3 text-left">고객</th>
                          <th className="border p-3 text-left">픽업/반납</th>
                          <th className="border p-3 text-left">금액</th>
                          <th className="border p-3 text-left">상태</th>
                          <th className="border p-3 text-left">작업</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedAndPagedBookings.map((booking) => (
                          <tr key={booking.id} className="hover:bg-gray-50">
                            <td className="border p-3">{booking.booking_number}</td>
                            <td className="border p-3">{booking.vehicle_model}</td>
                            <td className="border p-3">
                              <div className="space-y-1">
                                <div>{booking.customer_name}</div>
                                <a href={`mailto:${booking.customer_email}`} className="font-medium text-blue-600 hover:underline">{booking.customer_email}</a>
                                <div>
                                  <a href={`tel:${booking.customer_phone}`} className="font-medium text-blue-600 hover:underline">{booking.customer_phone}</a>
                                </div>
                              </div>
                            </td>
                            <td className="border p-3">
                              <div className="space-y-1">
                                <div className="text-sm">픽업: {format(new Date(booking.pickup_at_utc), 'yyyy-MM-dd HH:mm', { locale: ko })}</div>
                                <div className="text-sm">반납: {format(new Date(booking.return_at_utc), 'yyyy-MM-dd HH:mm', { locale: ko })}</div>
                              </div>
                            </td>
                            <td className="border p-3">₩{booking.total_price_krw.toLocaleString()}</td>
                            <td className="border p-3">{getStatusBadge(booking.status)}</td>
                            <td className="border p-3">
                              <button
                                onClick={() => setSelectedDetailBooking(booking)}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                              >
                                상세보기
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 페이지네이션 */}
                  <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className={`px-4 py-2 border rounded-lg ${
                          currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                        }`}
                      >
                        이전
                      </button>

                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-4 py-2 border rounded-lg ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className={`px-4 py-2 border rounded-lg ${
                          currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                        }`}
                      >
                        다음
                      </button>
                    </div>

                    <div className="text-sm text-gray-600">
                      페이지 {currentPage} / {totalPages}
                    </div>
                  </div>

                  {/* Detail Modal */}
                  {selectedDetailBooking && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-2xl font-bold">예약 상세 정보</h3>
                          <button
                            onClick={() => setSelectedDetailBooking(null)}
                            className="text-gray-400 hover:text-gray-600 text-2xl"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-lg">{selectedDetailBooking.vehicle_model}</h4>
                              {getStatusBadge(selectedDetailBooking.status)}
                            </div>
                            {selectedDetailBooking.vehicle_image && (
                              <img
                                src={selectedDetailBooking.vehicle_image}
                                alt={selectedDetailBooking.vehicle_model}
                                className="w-32 h-24 object-cover rounded"
                              />
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 border-t pt-4">
                            <div>
                              <p className="text-sm text-gray-500">예약번호</p>
                              <p className="font-medium">{selectedDetailBooking.booking_number}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">차량 코드</p>
                              <p className="font-medium">{selectedDetailBooking.vehicle_code}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">고객명</p>
                              <p className="font-medium">{selectedDetailBooking.customer_name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">전화번호</p>
                              <a href={`tel:${selectedDetailBooking.customer_phone}`} className="font-medium text-blue-600 hover:underline">
                                {selectedDetailBooking.customer_phone}
                              </a>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">이메일</p>
                              <a href={`mailto:${selectedDetailBooking.customer_email}`} className="font-medium text-blue-600 hover:underline">
                                {selectedDetailBooking.customer_email}
                              </a>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">운전자명</p>
                              <p className="font-medium">{selectedDetailBooking.driver_name}</p>
                            </div>
                            {selectedDetailBooking.driver_birth && (
                              <div>
                                <p className="text-sm text-gray-500">생년월일</p>
                                <p className="font-medium">{selectedDetailBooking.driver_birth}</p>
                              </div>
                            )}
                            {selectedDetailBooking.driver_birth && (() => {
                              const birthDate = new Date(selectedDetailBooking.driver_birth);
                              const today = new Date();
                              let age = today.getFullYear() - birthDate.getFullYear();
                              const monthDiff = today.getMonth() - birthDate.getMonth();
                              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                                age--;
                              }
                              return (
                                <div className="col-span-2">
                                  <p className="text-sm text-gray-500">운전자 나이</p>
                                  <p className="font-medium">
                                    만 {age}세
                                    {age < 21 && <span className="ml-2 text-red-600 font-bold">⚠️ 만 21세 미만 - 렌트 제한 확인 필요</span>}
                                    {age < 26 && age >= 21 && <span className="ml-2 text-orange-600">ℹ️ 만 26세 미만 - 추가 보험료 발생 가능</span>}
                                  </p>
                                </div>
                              );
                            })()}
                            <div>
                              <p className="text-sm text-gray-500">면허번호</p>
                              <p className="font-medium">{selectedDetailBooking.driver_license_no}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">픽업 시간</p>
                              <p className="font-medium">{format(new Date(selectedDetailBooking.pickup_at_utc), 'yyyy-MM-dd HH:mm', { locale: ko })}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">반납 시간</p>
                              <p className="font-medium">{format(new Date(selectedDetailBooking.return_at_utc), 'yyyy-MM-dd HH:mm', { locale: ko })}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">픽업 장소</p>
                              <p className="font-medium">{selectedDetailBooking.pickup_location}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">대여 금액</p>
                              <p className="font-medium text-xl">₩{selectedDetailBooking.total_price_krw.toLocaleString()}</p>
                            </div>
                            {selectedDetailBooking.insurance_name && (
                              <div>
                                <p className="text-sm text-gray-500">보험</p>
                                <p className="font-medium">{selectedDetailBooking.insurance_name} (₩{selectedDetailBooking.insurance_fee_krw?.toLocaleString()})</p>
                              </div>
                            )}
                            {selectedDetailBooking.extras_count && selectedDetailBooking.extras_count > 0 && (
                              <div className="col-span-2">
                                <p className="text-sm text-gray-500 mb-2">추가 옵션 ({selectedDetailBooking.extras_count}개)</p>
                                <div className="space-y-1">
                                  {selectedDetailBooking.extras?.map((extra, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                      <span>{extra.name} x {extra.quantity}</span>
                                      <span className="font-medium">₩{extra.total_price.toLocaleString()}</span>
                                    </div>
                                  ))}
                                  <div className="flex justify-between font-bold text-sm pt-1 border-t">
                                    <span>추가 옵션 합계</span>
                                    <span>₩{selectedDetailBooking.extras_total?.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => setSelectedDetailBooking(null)}
                            className="w-full mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                          >
                            닫기
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-600">예약이 없습니다.</div>
              )}
            </div>
          )}

          {/* Today's Bookings Tab */}
          {activeTab === 'today' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">오늘의 예약</h2>
                <button
                  onClick={fetchTodayBookings}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  disabled={loading}
                >
                  새로고침
                </button>
              </div>

              {/* Revenue Stats */}
              {!loading && !error && bookings.length > 0 && (() => {
                const stats = getRevenueStats();
                return (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white border rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">총 예약</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalBookings}건</p>
                    </div>
                    <div className="bg-white border rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">총 매출</p>
                      <p className="text-2xl font-bold text-blue-600">₩{stats.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="bg-white border rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">확정 매출 ({stats.confirmedCount}건)</p>
                      <p className="text-2xl font-bold text-green-600">₩{stats.confirmedRevenue.toLocaleString()}</p>
                    </div>
                    <div className="bg-white border rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">대기 매출 ({stats.pendingCount}건)</p>
                      <p className="text-2xl font-bold text-yellow-600">₩{stats.pendingRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Filters and Controls */}
              {!loading && !error && bookings.length > 0 && (
                <div className="bg-white border rounded-lg p-4 mb-6">
                  {/* Search Bar */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">검색</label>
                    <input
                      type="text"
                      placeholder="고객명, 예약번호, 전화번호, 이메일, 차량명..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Status Filter Buttons */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">상태</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setStatusFilter('all');
                          setCurrentPage(1);
                        }}
                        className={`px-4 py-2 rounded-lg transition ${
                          statusFilter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        전체
                      </button>
                      <button
                        onClick={() => {
                          setStatusFilter('confirmed');
                          setCurrentPage(1);
                        }}
                        className={`px-4 py-2 rounded-lg transition ${
                          statusFilter === 'confirmed'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        확정
                      </button>
                      <button
                        onClick={() => {
                          setStatusFilter('in_use');
                          setCurrentPage(1);
                        }}
                        className={`px-4 py-2 rounded-lg transition ${
                          statusFilter === 'in_use'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        이용중
                      </button>
                      <button
                        onClick={() => {
                          setStatusFilter('completed');
                          setCurrentPage(1);
                        }}
                        className={`px-4 py-2 rounded-lg transition ${
                          statusFilter === 'completed'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        완료
                      </button>
                      <button
                        onClick={() => {
                          setStatusFilter('cancelled');
                          setCurrentPage(1);
                        }}
                        className={`px-4 py-2 rounded-lg transition ${
                          statusFilter === 'cancelled'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        취소
                      </button>
                      <button
                        onClick={() => {
                          setStatusFilter('refunded');
                          setCurrentPage(1);
                        }}
                        className={`px-4 py-2 rounded-lg transition ${
                          statusFilter === 'refunded'
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        환불
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Date Range */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">정렬 기준</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="date">날짜</option>
                        <option value="customer">고객명</option>
                        <option value="vehicle">차량</option>
                        <option value="status">상태</option>
                      </select>
                    </div>

                    {/* Sort Order */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">정렬 순서</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSortOrder('asc')}
                          className={`flex-1 px-3 py-2 rounded-lg border transition ${
                            sortOrder === 'asc'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          오름차순
                        </button>
                        <button
                          onClick={() => setSortOrder('desc')}
                          className={`flex-1 px-3 py-2 rounded-lg border transition ${
                            sortOrder === 'desc'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          내림차순
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={exportToCSV}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      CSV 내보내기
                    </button>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                        setStartDate('');
                        setEndDate('');
                        setSortBy('date');
                        setSortOrder('desc');
                        setCurrentPage(1);
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                    >
                      필터 초기화
                    </button>
                  </div>
                </div>
              )}

              {loading && <div className="text-center py-8 text-gray-600">로딩 중...</div>}
              {error && <div className="text-center py-8 text-red-600">{error}</div>}

              {!loading && !error && bookings.length === 0 && (
                <div className="text-center py-8 text-gray-600">오늘 예약이 없습니다.</div>
              )}

              {!loading && !error && bookings.length > 0 && (
                <>
                  {/* 테이블 뷰 */}
                  <div className="bg-white border rounded-lg overflow-x-auto mb-6">
                    <table className="min-w-full w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">예약번호</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">차량</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">고객명</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">연락처</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">운전자</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">면허</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">나이</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">픽업일시</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">반납일시</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">보험</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">옵션</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">금액</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">상태</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">관리</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {getPaginatedBookings().map((booking) => (
                          <tr key={booking.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-xs">{booking.booking_number}</td>
                            <td className="px-3 py-2 text-xs">{booking.vehicle_model}</td>
                            <td className="px-3 py-2 text-xs">{booking.customer_name}</td>
                            <td className="px-3 py-2 text-xs">
                              {booking.customer_phone ? (
                                <a href={`tel:${booking.customer_phone}`} className="text-blue-600 hover:underline">
                                  {booking.customer_phone}
                                </a>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs">{booking.driver_name || '-'}</td>
                            <td className="px-3 py-2 text-xs">{booking.driver_license_no || '-'}</td>
                            <td className="px-3 py-2 text-xs">
                              {booking.driver_birth ? (() => {
                                const birthDate = new Date(booking.driver_birth);
                                const today = new Date();
                                let age = today.getFullYear() - birthDate.getFullYear();
                                const monthDiff = today.getMonth() - birthDate.getMonth();
                                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                                  age--;
                                }
                                return (
                                  <div>
                                    <div>만 {age}세</div>
                                    {age < 21 && <div className="text-red-600 font-bold text-xs">⚠️ 제한</div>}
                                    {age < 26 && age >= 21 && <div className="text-orange-600 text-xs">ℹ️ 보험</div>}
                                  </div>
                                );
                              })() : '-'}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {format(new Date(booking.pickup_at_utc), 'yyyy. MM. dd. HH:mm', { locale: ko })}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {format(new Date(booking.return_at_utc), 'yyyy. MM. dd. HH:mm', { locale: ko })}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {booking.insurance_name ? (
                                <div className="text-xs">
                                  <div className="font-medium">{booking.insurance_name}</div>
                                  <div className="text-gray-500">₩{booking.insurance_fee?.toLocaleString()}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {booking.extras && booking.extras.length > 0 ? (
                                <div className="text-xs">
                                  {booking.extras.map((extra: any, idx: number) => (
                                    <div key={idx} className="text-gray-700">
                                      {extra.name} {extra.quantity > 1 && `x${extra.quantity}`}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs font-medium">
                              ₩{booking.total_price_krw.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {getStatusBadge(booking.status)}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              <div className="flex flex-col gap-1">
                                {booking.status === 'confirmed' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setCheckInBooking(booking);
                                        setActiveTab('check-in');
                                      }}
                                      className="w-full px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                    >
                                      픽업
                                    </button>
                                    <button
                                      onClick={() => handleRefund(booking)}
                                      className="w-full px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                    >
                                      환불
                                    </button>
                                  </>
                                )}
                                {booking.status === 'picked_up' && (
                                  <>
                                    <button
                                      onClick={() => startCheckOut(booking)}
                                      className="w-full px-2 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700"
                                    >
                                      반납
                                    </button>
                                    <button
                                      onClick={() => handleRefund(booking)}
                                      className="w-full px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                    >
                                      환불
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => setSelectedDetailBooking(booking)}
                                  className="w-full px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700"
                                >
                                  상세
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        이전
                      </button>
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-2 border rounded-lg ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        다음
                      </button>
                      <span className="ml-4 text-sm text-gray-600">
                        페이지 {currentPage} / {totalPages}
                      </span>
                    </div>
                  )}

                  {/* Detail Modal */}
                  {selectedDetailBooking && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                          <h3 className="text-xl font-bold">예약 상세 정보</h3>
                          <button
                            onClick={() => setSelectedDetailBooking(null)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <div className="p-6 space-y-4">
                          {/* Booking Info */}
                          <div className="border-b pb-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-bold text-lg">{selectedDetailBooking.vehicle_model}</h4>
                              {getStatusBadge(selectedDetailBooking.status)}
                            </div>
                            {selectedDetailBooking.vehicle_image && (
                              <img
                                src={selectedDetailBooking.vehicle_image}
                                alt={selectedDetailBooking.vehicle_model}
                                className="w-full h-48 object-cover rounded-lg"
                              />
                            )}
                          </div>

                          {/* Basic Info */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">예약 번호</p>
                              <p className="font-medium">{selectedDetailBooking.booking_number}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">차량 번호</p>
                              <p className="font-medium">{selectedDetailBooking.vehicle_code}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">고객명</p>
                              <p className="font-medium">{selectedDetailBooking.customer_name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">전화번호</p>
                              <a href={`tel:${selectedDetailBooking.customer_phone}`} className="font-medium text-blue-600 hover:underline">
                                {selectedDetailBooking.customer_phone}
                              </a>
                            </div>
                            <div className="col-span-2">
                              <p className="text-sm text-gray-500">이메일</p>
                              <a href={`mailto:${selectedDetailBooking.customer_email}`} className="font-medium text-blue-600 hover:underline">
                                {selectedDetailBooking.customer_email}
                              </a>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">운전자</p>
                              <p className="font-medium">{selectedDetailBooking.driver_name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">면허번호</p>
                              <p className="font-medium">{selectedDetailBooking.driver_license_no}</p>
                            </div>
                            {selectedDetailBooking.driver_birth && (
                              <div>
                                <p className="text-sm text-gray-500">생년월일</p>
                                <p className="font-medium">{selectedDetailBooking.driver_birth}</p>
                              </div>
                            )}
                          </div>

                          {/* Rental Period */}
                          <div className="border-t pt-4">
                            <h5 className="font-semibold mb-2">대여 기간</h5>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-500">인수 예정</p>
                                <p className="font-medium">{format(new Date(selectedDetailBooking.pickup_at_utc), 'yyyy-MM-dd HH:mm', { locale: ko })}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">반납 예정</p>
                                <p className="font-medium">{format(new Date(selectedDetailBooking.return_at_utc), 'yyyy-MM-dd HH:mm', { locale: ko })}</p>
                              </div>
                              {selectedDetailBooking.pickup_location && (
                                <div className="col-span-2">
                                  <p className="text-sm text-gray-500">픽업 위치</p>
                                  <p className="font-medium">{selectedDetailBooking.pickup_location}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Payment Info */}
                          <div className="border-t pt-4">
                            <h5 className="font-semibold mb-2">결제 정보</h5>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <p className="text-sm text-blue-600 mb-1">총 결제 금액</p>
                              <p className="text-2xl font-bold text-blue-900">₩{selectedDetailBooking.total_price_krw.toLocaleString()}</p>
                            </div>
                          </div>

                          {/* Extras */}
                          {selectedDetailBooking.extras && selectedDetailBooking.extras.length > 0 && (
                            <div className="border-t pt-4">
                              <h5 className="font-semibold mb-2">추가 옵션</h5>
                              <div className="space-y-2">
                                {selectedDetailBooking.extras.map((extra, idx) => (
                                  <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                    <div>
                                      <p className="font-medium">{extra.name}</p>
                                      <p className="text-sm text-gray-500">
                                        {extra.category} • {extra.price_type} {extra.quantity > 1 && `x ${extra.quantity}`}
                                      </p>
                                    </div>
                                    <p className="font-bold">₩{extra.total_price.toLocaleString()}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Insurance */}
                          {selectedDetailBooking.insurance_name && (
                            <div className="border-t pt-4">
                              <h5 className="font-semibold mb-2">보험</h5>
                              <div className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-lg">
                                <div>
                                  <p className="font-medium text-green-900">{selectedDetailBooking.insurance_name}</p>
                                </div>
                                <p className="font-bold text-green-900">₩{selectedDetailBooking.insurance_fee_krw?.toLocaleString()}</p>
                              </div>
                            </div>
                          )}

                          {/* Late Return Fee */}
                          {selectedDetailBooking.late_return_hours && selectedDetailBooking.late_return_hours > 0 && (
                            <div className="border-t pt-4">
                              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-sm text-red-600 mb-1">연체 정보</p>
                                <p className="font-medium">연체 시간: {selectedDetailBooking.late_return_hours}시간</p>
                                <p className="text-lg font-bold text-red-900">연체료: ₩{selectedDetailBooking.late_return_fee_krw?.toLocaleString()}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Voucher Verification Tab */}
          {activeTab === 'voucher' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">바우처 인증</h2>

              <div className="max-w-md mx-auto">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    바우처 코드
                  </label>
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && verifyVoucher()}
                    placeholder="VOUCHER-XXXXX"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={verifyVoucher}
                  disabled={loading || !voucherCode.trim()}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? '인증 중...' : '바우처 인증'}
                </button>

                {voucherError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {voucherError}
                  </div>
                )}

                {verifiedBooking && (
                  <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <h3 className="text-lg font-bold text-green-900">인증 완료!</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                      <p><span className="font-medium">예약 번호:</span> {verifiedBooking.booking_number}</p>
                      <p><span className="font-medium">차량:</span> {verifiedBooking.vehicle_model}</p>
                      <p><span className="font-medium">고객:</span> {verifiedBooking.customer_name} ({verifiedBooking.customer_phone})</p>
                      <p><span className="font-medium">운전자:</span> {verifiedBooking.driver_name}</p>
                      <p><span className="font-medium">면허:</span> {verifiedBooking.driver_license_no}</p>
                      <p><span className="font-medium">차량 번호:</span> {verifiedBooking.vehicle_code}</p>
                      <p className="col-span-2">
                        <span className="font-medium">인수 예정:</span>{' '}
                        {format(new Date(verifiedBooking.pickup_at_utc), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                      </p>
                      <p className="col-span-2">
                        <span className="font-medium">반납 예정:</span>{' '}
                        {format(new Date(verifiedBooking.return_at_utc), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                      </p>
                      {verifiedBooking.pickup_location && (
                        <p className="col-span-2"><span className="font-medium">픽업 위치:</span> {verifiedBooking.pickup_location}</p>
                      )}
                      <p className="col-span-2">
                        <span className="font-medium text-blue-600">총 결제 금액:</span>{' '}
                        <span className="text-lg font-bold text-blue-900">₩{verifiedBooking.total_price_krw.toLocaleString()}</span>
                      </p>
                    </div>

                    {verifiedBooking.status === 'confirmed' && (
                      <button
                        onClick={startCheckInFromVoucher}
                        className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        체크인 진행하기
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Check-in Tab */}
          {activeTab === 'check-in' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">체크인</h2>

              {!checkInBooking ? (
                <div className="text-center py-8 text-gray-600">
                  <p>오늘 예약 탭 또는 바우처 인증에서 체크인을 시작하세요.</p>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto">
                  {/* Booking Info */}
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-bold text-blue-900 mb-2">예약 정보</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p><span className="font-medium">예약 번호:</span> {checkInBooking.booking_number}</p>
                      <p><span className="font-medium">차량:</span> {checkInBooking.vehicle_model}</p>
                      <p><span className="font-medium">고객:</span> {checkInBooking.customer_name} ({checkInBooking.customer_phone})</p>
                      <p><span className="font-medium">운전자:</span> {checkInBooking.driver_name}</p>
                      <p><span className="font-medium">면허:</span> {checkInBooking.driver_license_no}</p>
                      {checkInBooking.driver_birth && (
                        <p><span className="font-medium">생년월일:</span> {checkInBooking.driver_birth}</p>
                      )}
                      {checkInBooking.driver_birth && (() => {
                        const birthDate = new Date(checkInBooking.driver_birth);
                        const today = new Date();
                        let age = today.getFullYear() - birthDate.getFullYear();
                        const monthDiff = today.getMonth() - birthDate.getMonth();
                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                          age--;
                        }
                        return (
                          <p className="col-span-2">
                            <span className="font-medium">나이:</span> 만 {age}세
                            {age < 21 && <span className="ml-2 text-red-600 font-bold">⚠️ 만 21세 미만 - 렌트 제한 확인 필요</span>}
                            {age < 26 && age >= 21 && <span className="ml-2 text-orange-600 font-medium">ℹ️ 만 26세 미만 - 추가 보험료 발생 가능</span>}
                          </p>
                        );
                      })()}
                      <p><span className="font-medium">차량 번호:</span> {checkInBooking.vehicle_code}</p>
                      <p className="col-span-2">
                        <span className="font-medium">인수 예정:</span>{' '}
                        {format(new Date(checkInBooking.pickup_at_utc), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                      </p>
                      <p className="col-span-2">
                        <span className="font-medium">반납 예정:</span>{' '}
                        {format(new Date(checkInBooking.return_at_utc), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                      </p>
                      {checkInBooking.pickup_location && (
                        <p className="col-span-2"><span className="font-medium">픽업 위치:</span> {checkInBooking.pickup_location}</p>
                      )}
                      <p className="col-span-2 pt-2 border-t border-blue-300">
                        <span className="font-medium text-blue-600">총 결제 금액:</span>{' '}
                        <span className="text-lg font-bold text-blue-900">₩{checkInBooking.total_price_krw.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>

                  {/* Check-in Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        차량 상태 * <span className="text-gray-500 text-xs">(good, fair, damaged)</span>
                      </label>
                      <select
                        value={vehicleCondition}
                        onChange={(e) => setVehicleCondition(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">선택하세요</option>
                        <option value="good">양호 (Good)</option>
                        <option value="fair">보통 (Fair)</option>
                        <option value="damaged">손상 (Damaged)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        연료 레벨 * <span className="text-gray-500 text-xs">(0-100%)</span>
                      </label>
                      <input
                        type="text"
                        value={fuelLevel}
                        onChange={(e) => setFuelLevel(e.target.value)}
                        placeholder="예: 100, 75, 50"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        주행거리 (km) *
                      </label>
                      <input
                        type="number"
                        value={mileage}
                        onChange={(e) => setMileage(e.target.value)}
                        placeholder="예: 12500"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        손상 메모 (선택)
                      </label>
                      <textarea
                        value={damageNotes}
                        onChange={(e) => setDamageNotes(e.target.value)}
                        rows={3}
                        placeholder="차량의 손상 부위나 특이사항을 기록하세요"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        실제 픽업 시간 (선택)
                      </label>
                      <input
                        type="datetime-local"
                        value={actualPickupTime}
                        onChange={(e) => setActualPickupTime(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        * 입력하지 않으면 현재 시간으로 자동 기록됩니다
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        차량 상태 이미지 (선택)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        * 차량 외관, 파손 부위 등을 촬영하여 업로드하세요
                      </p>
                      {uploadingImage && (
                        <p className="text-sm text-blue-600 mt-2">이미지 업로드 중...</p>
                      )}
                      {pickupImages.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm font-medium text-gray-700">업로드된 이미지 ({pickupImages.length}개):</p>
                          <div className="grid grid-cols-3 gap-2">
                            {pickupImages.map((url, idx) => (
                              <div key={idx} className="relative">
                                <img src={url} alt={`차량 이미지 ${idx + 1}`} className="w-full h-24 object-cover rounded border" />
                                <button
                                  onClick={() => removeImage(idx)}
                                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => {
                          setCheckInBooking(null);
                          setVehicleCondition('');
                          setFuelLevel('');
                          setMileage('');
                          setDamageNotes('');
                          setActualPickupTime('');
                          setPickupImages([]);
                          setActiveTab('today');
                        }}
                        className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                      >
                        취소
                      </button>
                      <button
                        onClick={performCheckIn}
                        disabled={loading || uploadingImage || !vehicleCondition || !fuelLevel || !mileage}
                        className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {loading ? '처리 중...' : '체크인 완료'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Check-out Tab */}
          {activeTab === 'check-out' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">체크아웃</h2>

              {!checkOutBooking ? (
                <div className="text-center py-8 text-gray-600">
                  <p>오늘 예약 탭에서 체크아웃을 시작하세요.</p>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto">
                  {/* Booking Info */}
                  <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <h3 className="font-bold text-orange-900 mb-2">예약 정보</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p><span className="font-medium">예약 번호:</span> {checkOutBooking.booking_number}</p>
                      <p><span className="font-medium">차량:</span> {checkOutBooking.vehicle_model}</p>
                      <p><span className="font-medium">고객:</span> {checkOutBooking.customer_name} ({checkOutBooking.customer_phone})</p>
                      <p><span className="font-medium">운전자:</span> {checkOutBooking.driver_name}</p>
                      <p><span className="font-medium">면허:</span> {checkOutBooking.driver_license_no}</p>
                      <p><span className="font-medium">차량 번호:</span> {checkOutBooking.vehicle_code}</p>
                      <p className="col-span-2">
                        <span className="font-medium">인수:</span>{' '}
                        {format(new Date(checkOutBooking.pickup_at_utc), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                      </p>
                      <p className="col-span-2">
                        <span className="font-medium">반납 예정:</span>{' '}
                        {format(new Date(checkOutBooking.return_at_utc), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                      </p>
                      {checkOutBooking.pickup_location && (
                        <p className="col-span-2"><span className="font-medium">픽업 위치:</span> {checkOutBooking.pickup_location}</p>
                      )}
                      <p className="col-span-2 pt-2 border-t border-orange-300">
                        <span className="font-medium text-orange-600">총 결제 금액:</span>{' '}
                        <span className="text-lg font-bold text-orange-900">₩{checkOutBooking.total_price_krw.toLocaleString()}</span>
                      </p>
                    </div>

                    {calculatedLateFee > 0 && (
                      <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded text-red-900">
                        <p className="font-bold">⚠️ 연체 예상 금액: ₩{calculatedLateFee.toLocaleString()}</p>
                        <p className="text-xs mt-1">* 정확한 금액은 체크아웃 시 계산됩니다 (30분 유예 시간 포함)</p>
                      </div>
                    )}
                  </div>

                  {/* Check-out Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        차량 상태 * <span className="text-gray-500 text-xs">(good, fair, damaged)</span>
                      </label>
                      <select
                        value={returnCondition}
                        onChange={(e) => setReturnCondition(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">선택하세요</option>
                        <option value="good">양호 (Good)</option>
                        <option value="fair">보통 (Fair)</option>
                        <option value="damaged">손상 (Damaged)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        연료 레벨 * <span className="text-gray-500 text-xs">(0-100%)</span>
                      </label>
                      <input
                        type="text"
                        value={returnFuelLevel}
                        onChange={(e) => setReturnFuelLevel(e.target.value)}
                        placeholder="예: 100, 75, 50"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        반납 시 주행거리 (km) *
                      </label>
                      <input
                        type="number"
                        value={returnMileage}
                        onChange={(e) => setReturnMileage(e.target.value)}
                        placeholder="예: 12800"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        손상 메모 (선택)
                      </label>
                      <textarea
                        value={returnDamageNotes}
                        onChange={(e) => setReturnDamageNotes(e.target.value)}
                        rows={3}
                        placeholder="차량의 손상 부위나 특이사항을 기록하세요"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        반납 차량 상태 이미지 (선택)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleReturnImageUpload}
                        disabled={uploadingImage}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        * 반납 시 차량 외관, 파손 부위 등을 촬영하여 업로드하세요
                      </p>
                      {uploadingImage && (
                        <p className="text-sm text-blue-600 mt-2">이미지 업로드 중...</p>
                      )}
                      {returnImages.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm font-medium text-gray-700">업로드된 이미지 ({returnImages.length}개):</p>
                          <div className="grid grid-cols-3 gap-2">
                            {returnImages.map((url, idx) => (
                              <div key={idx} className="relative">
                                <img src={url} alt={`반납 차량 이미지 ${idx + 1}`} className="w-full h-24 object-cover rounded border" />
                                <button
                                  onClick={() => removeReturnImage(idx)}
                                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => {
                          setCheckOutBooking(null);
                          setReturnCondition('');
                          setReturnFuelLevel('');
                          setReturnMileage('');
                          setReturnDamageNotes('');
                          setReturnImages([]);
                          setCalculatedLateFee(0);
                          setActiveTab('today');
                        }}
                        className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                      >
                        취소
                      </button>
                      <button
                        onClick={performCheckOut}
                        disabled={loading || !returnCondition || !returnFuelLevel || !returnMileage}
                        className="flex-1 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {loading ? '처리 중...' : '체크아웃 완료'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Refunds Tab */}
          {activeTab === 'refunds' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">환불/정산 관리</h2>
                <button
                  onClick={fetchRefundsData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  disabled={loading}
                >
                  새로고침
                </button>
              </div>

              {loading && <div className="text-center py-8 text-gray-600">로딩 중...</div>}
              {error && <div className="text-center py-8 text-red-600">{error}</div>}

              {!loading && !error && refundsData && (
                <div className="space-y-6">
                  {/* 통계 요약 */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-sm text-blue-600 mb-1">취소된 예약</div>
                      <div className="text-2xl font-bold text-blue-900">{refundsData.stats?.total_canceled || 0}건</div>
                      <div className="text-xs text-blue-700 mt-1">
                        환불 완료: {refundsData.stats?.total_refunded || 0}건
                      </div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-sm text-green-600 mb-1">추가 결제</div>
                      <div className="text-2xl font-bold text-green-900">{refundsData.stats?.total_additional_payments || 0}건</div>
                      <div className="text-xs text-green-700 mt-1">
                        ₩{(refundsData.stats?.total_additional_payment_amount || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* 탭 내부 섹션 */}
                  <div className="border-b border-gray-200">
                    <div className="flex gap-4">
                      <button className="px-4 py-2 border-b-2 border-blue-600 text-blue-600 font-medium">
                        취소 환불 ({refundsData.canceled_rentals?.length || 0})
                      </button>
                      <button className="px-4 py-2 text-gray-600 hover:text-gray-900">
                        추가 결제 ({refundsData.additional_payments?.length || 0})
                      </button>
                    </div>
                  </div>

                  {/* 취소 환불 목록 */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">취소된 예약 환불 내역</h3>
                    {refundsData.canceled_rentals && refundsData.canceled_rentals.length > 0 ? (
                      refundsData.canceled_rentals.map((rental: any) => (
                        <div key={rental.id} className="border rounded-lg p-4 hover:shadow-md transition">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-semibold text-gray-900">{rental.vehicle?.display_name}</div>
                              <div className="text-sm text-gray-600">예약번호: {rental.booking_number}</div>
                              <div className="text-sm text-gray-600">고객: {rental.customer?.name} ({rental.customer?.phone})</div>
                            </div>
                            <div className="text-right">
                              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                                rental.refund_status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {rental.refund_status === 'completed' ? '환불 완료' : '환불 대기'}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm mt-3 pt-3 border-t">
                            <div>
                              <span className="text-gray-600">취소 시간:</span>{' '}
                              <span className="font-medium">{new Date(rental.canceled_at).toLocaleString('ko-KR')}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">원 금액:</span>{' '}
                              <span className="font-medium">₩{rental.total_price?.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">환불 금액:</span>{' '}
                              <span className="font-medium text-green-600">₩{rental.refund_amount?.toLocaleString()}</span>
                            </div>
                            {rental.cancel_reason && (
                              <div className="col-span-2">
                                <span className="text-gray-600">취소 사유:</span>{' '}
                                <span className="font-medium">{rental.cancel_reason}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">취소된 예약이 없습니다.</div>
                    )}
                  </div>

                  {/* 추가 결제 목록 */}
                  <div className="space-y-3 mt-8">
                    <h3 className="font-semibold text-gray-900">추가 결제 내역</h3>
                    {refundsData.additional_payments && refundsData.additional_payments.length > 0 ? (
                      refundsData.additional_payments.map((payment: any) => (
                        <div key={payment.id} className="border rounded-lg p-4 hover:shadow-md transition bg-green-50">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-semibold text-gray-900">{payment.vehicle?.display_name}</div>
                              <div className="text-sm text-gray-600">예약번호: {payment.booking_number}</div>
                              <div className="text-sm text-gray-600">고객: {payment.customer?.name}</div>
                            </div>
                            <div className="text-right">
                              <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                {payment.payment_method === 'card' ? '카드 결제' : '현금 결제'}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm mt-3 pt-3 border-t border-green-200">
                            <div>
                              <span className="text-gray-600">결제 금액:</span>{' '}
                              <span className="font-medium text-green-600">₩{payment.amount?.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">결제 시간:</span>{' '}
                              <span className="font-medium">{new Date(payment.paid_at).toLocaleString('ko-KR')}</span>
                            </div>
                            {payment.reason && (
                              <div className="col-span-2">
                                <span className="text-gray-600">사유:</span>{' '}
                                <span className="font-medium">{payment.reason}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">추가 결제 내역이 없습니다.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Vehicle Blocks Tab */}
          {activeTab === 'blocks' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">차량 차단 관리</h2>
                <button
                  onClick={fetchVehiclesAndBlocks}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  disabled={loading}
                >
                  새로고침
                </button>
              </div>

              {loading && <div className="text-center py-8 text-gray-600">로딩 중...</div>}
              {error && <div className="text-center py-8 text-red-600">{error}</div>}

              {!loading && !error && (
                <div className="space-y-6">
                  {/* Quick Block Form */}
                  <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-orange-900 mb-4">🚫 빠른 외부예약 차단 등록</h3>
                    <p className="text-sm text-orange-700 mb-4">
                      네이버, 전화, 현장 등 외부 채널에서 예약을 받았을 때 즉시 차단하세요.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          차량 선택 *
                        </label>
                        <select
                          value={blockForm.vehicle_id}
                          onChange={(e) => setBlockForm({ ...blockForm, vehicle_id: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="">차량을 선택하세요</option>
                          {vehicles.map((vehicle: any) => (
                            <option key={vehicle.id} value={vehicle.id}>
                              {vehicle.display_name || vehicle.model} ({vehicle.license_plate})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          차단 사유 *
                        </label>
                        <select
                          value={blockForm.block_reason}
                          onChange={(e) => setBlockForm({ ...blockForm, block_reason: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="external_booking">외부 예약 (네이버/카카오/전화)</option>
                          <option value="maintenance">유지보수</option>
                          <option value="repair">수리</option>
                          <option value="inspection">검사</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          차단 시작 시간 *
                        </label>
                        <input
                          type="datetime-local"
                          value={blockForm.starts_at}
                          onChange={(e) => setBlockForm({ ...blockForm, starts_at: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          차단 종료 시간 *
                        </label>
                        <input
                          type="datetime-local"
                          value={blockForm.ends_at}
                          onChange={(e) => setBlockForm({ ...blockForm, ends_at: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          메모 (선택)
                        </label>
                        <input
                          type="text"
                          value={blockForm.note}
                          onChange={(e) => setBlockForm({ ...blockForm, note: e.target.value })}
                          placeholder="예: 네이버 예약 - 홍길동"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <button
                        onClick={createBlock}
                        className="w-full px-6 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition"
                      >
                        🚫 차단 등록하기
                      </button>
                    </div>
                  </div>

                  {/* Active Blocks List */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      활성 차단 목록 ({activeBlocks.length}건)
                    </h3>

                    {activeBlocks.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">활성화된 차단이 없습니다.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeBlocks.map((block: any) => {
                          const vehicle = vehicles.find((v: any) => v.id === block.vehicle_id);
                          return (
                            <div key={block.id} className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-bold text-gray-900 mb-2">
                                    {vehicle?.display_name || vehicle?.model || `차량 ID ${block.vehicle_id}`}
                                  </h4>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <span className="text-gray-600">차단 사유:</span>{' '}
                                      <span className="font-medium">
                                        {block.block_reason === 'external_booking' && '외부 예약'}
                                        {block.block_reason === 'maintenance' && '유지보수'}
                                        {block.block_reason === 'repair' && '수리'}
                                        {block.block_reason === 'inspection' && '검사'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-600">등록자:</span>{' '}
                                      <span className="font-medium">{block.created_by}</span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-gray-600">차단 기간:</span>{' '}
                                      <span className="font-medium">
                                        {new Date(block.starts_at).toLocaleString('ko-KR')} ~{' '}
                                        {new Date(block.ends_at).toLocaleString('ko-KR')}
                                      </span>
                                    </div>
                                    {block.notes && (
                                      <div className="col-span-2">
                                        <span className="text-gray-600">메모:</span>{' '}
                                        <span className="font-medium">{block.notes}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => deleteBlock(block.id, block.vehicle_id)}
                                  className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                                >
                                  차단 해제
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Help Text */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-bold text-blue-900 mb-2">💡 사용 가이드</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• 외부 채널(네이버/카카오/전화)에서 예약을 받으면 즉시 차단을 등록하세요.</li>
                      <li>• 차단된 기간에는 우리 플랫폼에서 해당 차량 예약이 불가능합니다.</li>
                      <li>• 결제 확정 시 차단 여부를 재확인하므로 오버부킹이 방지됩니다.</li>
                      <li>• 차단 기간이 끝나면 수동으로 해제하거나 자동 해제 옵션을 사용하세요.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Extras Management Tab */}
          {activeTab === 'extras' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">옵션 관리</h2>
                <button
                  onClick={() => {
                    setShowExtraForm(!showExtraForm);
                    setEditingExtra(null);
                    setExtraForm({
                      name: '',
                      description: '',
                      category: 'equipment',
                      price_type: 'per_day',
                      price_krw: '',
                      max_quantity: '1',
                      has_inventory: false,
                      current_stock: ''
                    });
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {showExtraForm ? '취소' : '+ 새 옵션 추가'}
                </button>
              </div>

              {/* Extra Form */}
              {showExtraForm && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-bold mb-4">
                    {editingExtra ? '옵션 수정' : '새 옵션 추가'}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        옵션명 *
                      </label>
                      <input
                        type="text"
                        value={extraForm.name}
                        onChange={(e) => setExtraForm({ ...extraForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="예: GPS 네비게이션"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        카테고리 *
                      </label>
                      <select
                        value={extraForm.category}
                        onChange={(e) => setExtraForm({ ...extraForm, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="equipment">장비 (Equipment)</option>
                        <option value="service">서비스 (Service)</option>
                        <option value="driver">운전자 (Driver)</option>
                        <option value="insurance">보험 (Insurance)</option>
                        <option value="misc">기타 (Misc)</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        설명
                      </label>
                      <textarea
                        value={extraForm.description}
                        onChange={(e) => setExtraForm({ ...extraForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={2}
                        placeholder="옵션에 대한 상세 설명"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        가격 유형 *
                      </label>
                      <select
                        value={extraForm.price_type}
                        onChange={(e) => setExtraForm({ ...extraForm, price_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="per_day">일당 (Per Day)</option>
                        <option value="per_rental">예약당 (Per Rental)</option>
                        <option value="per_hour">시간당 (Per Hour)</option>
                        <option value="per_item">개당 (Per Item)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        가격 (원) *
                      </label>
                      <input
                        type="number"
                        value={extraForm.price_krw}
                        onChange={(e) => setExtraForm({ ...extraForm, price_krw: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="10000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        최대 수량
                      </label>
                      <input
                        type="number"
                        value={extraForm.max_quantity}
                        onChange={(e) => setExtraForm({ ...extraForm, max_quantity: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="1"
                      />
                    </div>

                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={extraForm.has_inventory}
                          onChange={(e) => setExtraForm({ ...extraForm, has_inventory: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium text-gray-700">재고 관리 활성화</span>
                      </label>
                      {extraForm.has_inventory && (
                        <input
                          type="number"
                          value={extraForm.current_stock}
                          onChange={(e) => setExtraForm({ ...extraForm, current_stock: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-2"
                          placeholder="현재 재고 수량"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      onClick={() => {
                        setShowExtraForm(false);
                        setEditingExtra(null);
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                    >
                      취소
                    </button>
                    <button
                      onClick={saveExtra}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      {editingExtra ? '수정' : '추가'}
                    </button>
                  </div>
                </div>
              )}

              {/* Extras List */}
              {extrasLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">옵션 로딩 중...</p>
                </div>
              ) : extras.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">등록된 옵션이 없습니다.</p>
                  <p className="text-sm text-gray-400 mt-1">
                    새 옵션을 추가하여 차량 예약 시 추가 서비스를 제공하세요.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          옵션명
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          카테고리
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          가격
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          재고
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          상태
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          액션
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {extras.map((extra) => (
                        <tr key={extra.id}>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{extra.name}</div>
                            {extra.description && (
                              <div className="text-sm text-gray-500">{extra.description}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {extra.category === 'equipment' && '장비'}
                            {extra.category === 'service' && '서비스'}
                            {extra.category === 'driver' && '운전자'}
                            {extra.category === 'insurance' && '보험'}
                            {extra.category === 'misc' && '기타'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {extra.price_krw.toLocaleString()}원
                            <div className="text-xs text-gray-500">
                              ({extra.price_type === 'per_day' && '일당'}
                              {extra.price_type === 'per_rental' && '예약당'}
                              {extra.price_type === 'per_hour' && '시간당'}
                              {extra.price_type === 'per_item' && '개당'})
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {extra.has_inventory ? `${extra.current_stock}개` : '무제한'}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                extra.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {extra.is_active ? '활성' : '비활성'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-sm space-x-2">
                            <button
                              onClick={() => startEditExtra(extra)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => deleteExtra(extra.id)}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Help Text */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h4 className="font-bold text-blue-900 mb-2">💡 사용 가이드</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• GPS, 아동 안전 시트, 보험 등 차량에 추가할 수 있는 옵션을 관리합니다.</li>
                  <li>• 가격 유형을 선택하여 일당/예약당/시간당/개당 요금을 설정할 수 있습니다.</li>
                  <li>• 재고 관리를 활성화하면 옵션의 수량을 제한할 수 있습니다.</li>
                  <li>• 등록된 옵션은 차량별로 연결하여 사용자에게 제공됩니다.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Calendar Tab */}
          {activeTab === 'calendar' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">📅 차량별 예약 캘린더</h2>
                <button
                  onClick={() => {
                    fetchAllBookings();
                    fetchVehiclesForStock();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  🔄 새로고침
                </button>
              </div>

              {/* 차량 선택 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">차량 선택</label>
                <select
                  value={selectedVehicleForCalendar || ''}
                  onChange={(e) => setSelectedVehicleForCalendar(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- 차량을 선택하세요 --</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.brand} {vehicle.model} {vehicle.year && `(${vehicle.year})`} - {vehicle.vehicle_code}
                    </option>
                  ))}
                </select>
              </div>

              {selectedVehicleForCalendar ? (
                <>
                  {/* 월 네비게이션 */}
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                    >
                      ← 이전 달
                    </button>
                    <h3 className="text-xl font-bold">
                      {format(currentMonth, 'yyyy년 MM월', { locale: ko })}
                    </h3>
                    <button
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                    >
                      다음 달 →
                    </button>
                  </div>

                  {/* 캘린더 그리드 */}
                  <div className="border rounded-lg overflow-hidden">
                    {/* 요일 헤더 */}
                    <div className="grid grid-cols-7 bg-gray-100">
                      {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                        <div
                          key={day}
                          className={`p-3 text-center font-medium ${
                            idx === 0 ? 'text-red-600' : idx === 6 ? 'text-blue-600' : 'text-gray-700'
                          }`}
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* 날짜 그리드 */}
                    <div className="grid grid-cols-7">
                      {(() => {
                        const monthStart = startOfMonth(currentMonth);
                        const monthEnd = endOfMonth(currentMonth);
                        const startDate = new Date(monthStart);
                        startDate.setDate(startDate.getDate() - monthStart.getDay());
                        const endDate = new Date(monthEnd);
                        endDate.setDate(endDate.getDate() + (6 - monthEnd.getDay()));
                        const days = eachDayOfInterval({ start: startDate, end: endDate });

                        // 선택된 차량의 예약 필터링
                        const vehicleBookings = bookings.filter(
                          (b) => b.vehicle_id === selectedVehicleForCalendar
                        );

                        return days.map((day, dayIdx) => {
                          const isCurrentMonth = isSameMonth(day, currentMonth);
                          const isToday = isSameDay(day, new Date());

                          // 해당 날짜에 예약이 있는지 확인
                          const dayBookings = vehicleBookings.filter((booking) => {
                            const pickupDate = parseISO(booking.pickup_at_utc);
                            const returnDate = parseISO(booking.return_at_utc);
                            return day >= pickupDate && day <= returnDate;
                          });

                          const hasBookings = dayBookings.length > 0;
                          const confirmedCount = dayBookings.filter((b) => b.status === 'confirmed' || b.status === 'picked_up').length;

                          return (
                            <div
                              key={dayIdx}
                              onClick={() => {
                                if (hasBookings) {
                                  setSelectedDateBookings(dayBookings);
                                }
                              }}
                              className={`
                                min-h-[100px] p-2 border border-gray-200
                                ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                                ${isToday ? 'ring-2 ring-blue-500' : ''}
                                ${hasBookings ? 'cursor-pointer hover:bg-blue-50' : ''}
                              `}
                            >
                              <div className={`text-sm font-medium mb-1 ${dayIdx % 7 === 0 ? 'text-red-600' : dayIdx % 7 === 6 ? 'text-blue-600' : ''}`}>
                                {format(day, 'd')}
                              </div>
                              {hasBookings && (
                                <div className="space-y-1">
                                  <div className="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded">
                                    예약 {dayBookings.length}건
                                  </div>
                                  {confirmedCount > 0 && (
                                    <div className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                                      확정 {confirmedCount}건
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* 범례 */}
                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                      <span>예약 있음</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                      <span>확정된 예약</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 ring-2 ring-blue-500 rounded"></div>
                      <span>오늘</span>
                    </div>
                  </div>

                  {/* 선택된 날짜의 예약 목록 모달 */}
                  {selectedDateBookings.length > 0 && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-2xl font-bold">선택된 날짜의 예약 목록</h3>
                          <button
                            onClick={() => setSelectedDateBookings([])}
                            className="text-gray-400 hover:text-gray-600 text-2xl"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="space-y-4">
                          {selectedDateBookings.map((booking) => (
                            <div key={booking.id} className="border rounded-lg p-4 hover:shadow-md transition">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <h4 className="font-bold">{booking.booking_number}</h4>
                                  <p className="text-sm text-gray-600">{booking.vehicle_model}</p>
                                </div>
                                {getStatusBadge(booking.status)}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-gray-600">고객:</span> {booking.customer_name}
                                </div>
                                <div>
                                  <span className="text-gray-600">전화:</span>{' '}
                                  <a href={`tel:${booking.customer_phone}`} className="text-blue-600 hover:underline">
                                    {booking.customer_phone}
                                  </a>
                                </div>
                                <div>
                                  <span className="text-gray-600">픽업:</span> {format(parseISO(booking.pickup_at_utc), 'yyyy-MM-dd HH:mm', { locale: ko })}
                                </div>
                                <div>
                                  <span className="text-gray-600">반납:</span> {format(parseISO(booking.return_at_utc), 'yyyy-MM-dd HH:mm', { locale: ko })}
                                </div>
                                <div className="col-span-2">
                                  <span className="text-gray-600">금액:</span> ₩{booking.total_price_krw.toLocaleString()}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedDetailBooking(booking);
                                  setSelectedDateBookings([]);
                                }}
                                className="mt-3 w-full px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                              >
                                상세보기
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => setSelectedDateBookings([])}
                          className="w-full mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                        >
                          닫기
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-600">
                  <p className="text-lg">차량을 선택하면 예약 캘린더를 확인할 수 있습니다.</p>
                </div>
              )}
            </div>
          )}

          {/* Damage Claims Tab */}
          {activeTab === 'damage-claims' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">💰 손해 배상 청구</h2>
                <button
                  onClick={fetchAllBookings}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  🔄 새로고침
                </button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-600">로딩 중...</p>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto">
                  <div className="bg-white rounded-lg border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">손해 배상 청구서 작성</h3>

                    {/* Booking Selection */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        예약 선택 *
                      </label>
                      <select
                        value={damageClaimForm.booking_id}
                        onChange={(e) => setDamageClaimForm({ ...damageClaimForm, booking_id: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">예약을 선택하세요</option>
                        {bookings
                          .filter(b =>
                            b.status === 'returned' ||
                            b.status === 'picked_up' ||
                            b.status === 'completed'
                          )
                          .map(booking => (
                            <option key={booking.id} value={booking.id}>
                              {booking.booking_number} - {booking.vehicle_name || booking.model} - {booking.customer_name}
                            </option>
                          ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        픽업 완료 또는 반납 완료된 예약만 표시됩니다
                      </p>
                    </div>

                    {/* Selected Booking Info */}
                    {damageClaimForm.booking_id && (
                      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                        {(() => {
                          const selectedBooking = bookings.find(b => b.id === parseInt(damageClaimForm.booking_id));
                          if (!selectedBooking) return null;
                          return (
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">예약번호:</span>
                                <span className="ml-2 text-gray-900">{selectedBooking.booking_number}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">차량:</span>
                                <span className="ml-2 text-gray-900">{selectedBooking.vehicle_name || selectedBooking.model}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">고객명:</span>
                                <span className="ml-2 text-gray-900">{selectedBooking.customer_name}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">연락처:</span>
                                <span className="ml-2 text-gray-900">{selectedBooking.customer_phone}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">픽업:</span>
                                <span className="ml-2 text-gray-900">
                                  {format(new Date(selectedBooking.pickup_at_utc), 'yyyy-MM-dd HH:mm')}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">반납:</span>
                                <span className="ml-2 text-gray-900">
                                  {format(new Date(selectedBooking.dropoff_at_utc), 'yyyy-MM-dd HH:mm')}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Damage Amount */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        손해 배상 금액 (원) *
                      </label>
                      <input
                        type="number"
                        value={damageClaimForm.damage_amount}
                        onChange={(e) => setDamageClaimForm({ ...damageClaimForm, damage_amount: e.target.value })}
                        placeholder="예: 500000"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        step="1000"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        손해 배상으로 청구할 금액을 입력하세요
                      </p>
                    </div>

                    {/* Damage Reason (Short) */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        손해 사유 (간단히) *
                      </label>
                      <input
                        type="text"
                        value={damageClaimForm.damage_reason}
                        onChange={(e) => setDamageClaimForm({ ...damageClaimForm, damage_reason: e.target.value })}
                        placeholder="예: 차량 외부 스크래치, 내부 시트 오염 등"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        maxLength={100}
                      />
                    </div>

                    {/* Damage Description (Detailed) */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        상세 설명 *
                      </label>
                      <textarea
                        value={damageClaimForm.damage_description}
                        onChange={(e) => setDamageClaimForm({ ...damageClaimForm, damage_description: e.target.value })}
                        placeholder="손해 발생 경위 및 상세 내용을 입력하세요..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32 resize-none"
                        maxLength={1000}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {damageClaimForm.damage_description.length}/1000
                      </p>
                    </div>

                    {/* Image Upload */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        손해 증빙 사진
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length === 0) return;

                            const uploadPromises = files.map(async (file) => {
                              const formData = new FormData();
                              formData.append('file', file);

                              try {
                                const response = await fetch('/api/upload', {
                                  method: 'POST',
                                  body: formData
                                });

                                const result = await response.json();
                                if (result.success) {
                                  return result.url;
                                }
                                return null;
                              } catch (err) {
                                console.error('이미지 업로드 실패:', err);
                                return null;
                              }
                            });

                            const uploadedUrls = await Promise.all(uploadPromises);
                            const validUrls = uploadedUrls.filter(url => url !== null) as string[];

                            setDamageImages([...damageImages, ...validUrls]);
                          }}
                          className="hidden"
                          id="damage-images-upload"
                        />
                        <label
                          htmlFor="damage-images-upload"
                          className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                          📷 사진 추가
                        </label>
                        <p className="mt-2 text-xs text-gray-500">
                          손해 상태를 증명할 수 있는 사진을 업로드하세요
                        </p>
                      </div>

                      {/* Image Preview */}
                      {damageImages.length > 0 && (
                        <div className="mt-4 grid grid-cols-3 gap-4">
                          {damageImages.map((url, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={url}
                                alt={`손해 증빙 ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg border"
                              />
                              <button
                                onClick={() => {
                                  setDamageImages(damageImages.filter((_, i) => i !== index));
                                }}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-3">
                      <button
                        onClick={async () => {
                          // Validation
                          if (!damageClaimForm.booking_id) {
                            alert('예약을 선택해주세요.');
                            return;
                          }
                          if (!damageClaimForm.damage_amount || parseInt(damageClaimForm.damage_amount) <= 0) {
                            alert('손해 배상 금액을 입력해주세요.');
                            return;
                          }
                          if (!damageClaimForm.damage_reason.trim()) {
                            alert('손해 사유를 입력해주세요.');
                            return;
                          }
                          if (!damageClaimForm.damage_description.trim()) {
                            alert('상세 설명을 입력해주세요.');
                            return;
                          }

                          const selectedBooking = bookings.find(b => b.id === parseInt(damageClaimForm.booking_id));
                          if (!selectedBooking) {
                            alert('예약 정보를 찾을 수 없습니다.');
                            return;
                          }

                          if (!confirm(`${selectedBooking.customer_name}님에게 ${parseInt(damageClaimForm.damage_amount).toLocaleString()}원의 손해 배상을 청구하시겠습니까?`)) {
                            return;
                          }

                          setSubmittingClaim(true);

                          try {
                            const damageAmount = parseInt(damageClaimForm.damage_amount);

                            const requestBody = {
                              booking_number: selectedBooking.booking_number,
                              amount: damageAmount,
                              reason: `차량 손해 배상: ${damageClaimForm.damage_reason}`,
                              breakdown: {
                                damage_fee: damageAmount,
                                late_fee: 0,
                                other: 0
                              },
                              payment_method: 'cash', // 벤더가 현장에서 청구/수령
                              notes: damageClaimForm.damage_description,
                              damage_images: damageImages
                            };

                            const response = await fetch('/api/rentcar/additional-payment', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                              },
                              body: JSON.stringify(requestBody)
                            });

                            const result = await response.json();

                            if (result.success) {
                              alert('손해 배상 청구가 성공적으로 등록되었습니다.');

                              // Reset form
                              setDamageClaimForm({
                                booking_id: '',
                                damage_amount: '',
                                damage_reason: '',
                                damage_description: ''
                              });
                              setDamageImages([]);

                              // Refresh bookings
                              await fetchAllBookings();
                            } else {
                              alert(`손해 배상 청구 실패: ${result.message || result.error}`);
                            }
                          } catch (err: any) {
                            console.error('손해 배상 청구 오류:', err);
                            alert(`오류 발생: ${err.message}`);
                          } finally {
                            setSubmittingClaim(false);
                          }
                        }}
                        disabled={submittingClaim}
                        className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                      >
                        {submittingClaim ? '청구 처리 중...' : '💰 손해 배상 청구'}
                      </button>

                      <button
                        onClick={() => {
                          setDamageClaimForm({
                            booking_id: '',
                            damage_amount: '',
                            damage_reason: '',
                            damage_description: ''
                          });
                          setDamageImages([]);
                        }}
                        className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                      >
                        초기화
                      </button>
                    </div>
                  </div>

                  {/* Claims History (Optional - Simple List) */}
                  <div className="mt-8 bg-white rounded-lg border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 손해 배상 청구 내역</h3>

                    {bookings
                      .filter(b => b.damage_fee && parseInt(b.damage_fee) > 0)
                      .slice(0, 10)
                      .map(booking => (
                        <div key={booking.id} className="border-b last:border-b-0 py-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-gray-900">
                                {booking.booking_number} - {booking.customer_name}
                              </div>
                              <div className="text-sm text-gray-600">
                                {booking.vehicle_name || booking.model}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {format(new Date(booking.created_at), 'yyyy-MM-dd HH:mm')}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-red-600">
                                {parseInt(booking.damage_fee).toLocaleString()}원
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {booking.payment_status === 'captured' ? '✅ 결제 완료' : '⏳ 대기 중'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                    {bookings.filter(b => b.damage_fee && parseInt(b.damage_fee) > 0).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        손해 배상 청구 내역이 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Vehicles Stock Management Tab */}
          {activeTab === 'vehicles' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">🚗 차량 재고 관리</h2>
                <button
                  onClick={fetchVehiclesForStock}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  disabled={loading}
                >
                  {loading ? '로딩중...' : '새로고침'}
                </button>
              </div>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-600">로딩 중...</p>
                </div>
              ) : vehicles.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">등록된 차량이 없습니다.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          차량 정보
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          차종
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          현재 재고
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          재고 수정
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {vehicles.map((vehicle) => (
                        <tr key={vehicle.id}>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            #{vehicle.id}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">
                              {vehicle.brand} {vehicle.model}
                            </div>
                            {vehicle.display_name && (
                              <div className="text-sm text-gray-500">{vehicle.display_name}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {vehicle.vehicle_type || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                              {vehicle.stock || 0}대
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center space-x-2">
                              <input
                                type="number"
                                min="0"
                                defaultValue={vehicle.stock || 0}
                                className="w-20 px-3 py-1 border border-gray-300 rounded-lg text-center"
                                id={`stock-${vehicle.id}`}
                              />
                              <button
                                onClick={() => {
                                  const input = document.getElementById(`stock-${vehicle.id}`) as HTMLInputElement;
                                  const newStock = parseInt(input.value);
                                  if (!isNaN(newStock)) {
                                    updateVehicleStock(vehicle.id, newStock);
                                  }
                                }}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                              >
                                저장
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Help Text */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h4 className="font-bold text-blue-900 mb-2">💡 재고 관리 안내</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 각 차량 종류별로 보유하고 있는 대수를 설정할 수 있습니다.</li>
                  <li>• 예약 시 해당 기간에 재고가 부족하면 예약이 불가능합니다.</li>
                  <li>• 재고는 0 이상의 숫자로 입력해주세요.</li>
                  <li>• 변경 후 반드시 "저장" 버튼을 클릭해야 적용됩니다.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

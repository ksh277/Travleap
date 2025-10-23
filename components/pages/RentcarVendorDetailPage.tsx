/**
 * 렌트카 업체 상세 페이지 (야놀자 스타일)
 * AccommodationDetailPage와 동일한 구조
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Separator } from '../ui/separator';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import {
  MapPin,
  Users,
  Calendar as CalendarIcon,
  Car,
  Fuel,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';

interface Vehicle {
  id: number;
  vehicle_class: string;
  brand: string;
  model: string;
  year: number;
  display_name: string;
  transmission: string;
  fuel_type: string;
  seating_capacity: number;
  large_bags: number;
  small_bags: number;
  daily_rate_krw: number;
  hourly_rate_krw?: number;
  images: string[];
  features: string[];
  is_active: boolean;
  is_featured: boolean;
  average_rating: number;
  total_bookings: number;
  stock: number;
  description?: string;
  insurance_options?: string;
  available_options?: string;
  mileage_limit_per_day?: number;
  excess_mileage_fee_krw?: number;
  fuel_efficiency?: number;
  self_insurance_krw?: number;
}

interface VendorData {
  vendor: {
    id: number;
    vendor_code: string;
    vendor_name: string;
    business_name?: string;
    contact_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    cancellation_policy?: string;
  };
  vehicles: Vehicle[];
  total_vehicles: number;
}

export function RentcarVendorDetailPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();

  // 상태 관리
  const [vendorData, setVendorData] = useState<VendorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  // 예약 폼 상태
  const [pickupDate, setPickupDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [pickupTime, setPickupTime] = useState('10:00');
  const [returnTime, setReturnTime] = useState('10:00');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 데이터 로드
  useEffect(() => {
    const fetchVendorData = async () => {
      if (!vendorId) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/rentcars/${vendorId}`);
        const result = await response.json();

        if (result.success && result.data) {
          setVendorData(result.data);

          // 예약 데이터 로드 (중복 방지용)
          try {
            const bookingsRes = await fetch(`/api/rentcars/${vendorId}/bookings`);
            const bookingsData = await bookingsRes.json();
            if (bookingsData.success) {
              setExistingBookings(bookingsData.data || []);
            }
          } catch (err) {
            console.error('예약 데이터 로드 실패:', err);
          }
        } else {
          setError('업체 정보를 찾을 수 없습니다');
        }
      } catch (err) {
        console.error('업체 데이터 로드 오류:', err);
        setError('업체 정보를 불러오는데 실패했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [vendorId]);

  // 이미지 갤러리용 - 모든 차량의 이미지 수집
  const allImages = vendorData?.vehicles.flatMap(v => v.images || []) || [];

  // 이미지 네비게이션
  const nextImage = () => {
    if (allImages.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
    }
  };

  const prevImage = () => {
    if (allImages.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    }
  };

  // 총 대여 시간 계산 (시간 단위)
  const calculateRentalHours = () => {
    if (!pickupDate || !returnDate) return 0;

    // 날짜 + 시간 조합
    const [pickupHour, pickupMinute] = pickupTime.split(':').map(Number);
    const [returnHour, returnMinute] = returnTime.split(':').map(Number);

    const pickup = new Date(pickupDate);
    pickup.setHours(pickupHour, pickupMinute, 0, 0);

    const returnD = new Date(returnDate);
    returnD.setHours(returnHour, returnMinute, 0, 0);

    const diffMs = returnD.getTime() - pickup.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    return Math.max(0, diffHours);
  };

  // 차량 재고 확인 (선택한 날짜/시간에 사용 가능한지)
  const checkVehicleAvailability = (vehicle: Vehicle) => {
    if (!pickupDate || !returnDate) return vehicle.stock;

    const [pickupHour, pickupMinute] = pickupTime.split(':').map(Number);
    const [returnHour, returnMinute] = returnTime.split(':').map(Number);

    const pickup = new Date(pickupDate);
    pickup.setHours(pickupHour, pickupMinute, 0, 0);

    const returnD = new Date(returnDate);
    returnD.setHours(returnHour, returnMinute, 0, 0);

    // 버퍼 타임 설정 (차량 청소/점검용 1시간)
    const BUFFER_TIME_MS = 60 * 60 * 1000; // 1시간

    // 해당 차량의 예약 중 겹치는 것 찾기
    const conflictingBookings = existingBookings.filter(booking => {
      if (booking.vehicle_id !== vehicle.id) return false;

      // 예약 시작/종료 시간 조합
      const bookingStart = new Date(booking.pickup_date + ' ' + (booking.pickup_time || '00:00'));
      let bookingEnd = new Date(booking.dropoff_date + ' ' + (booking.dropoff_time || '23:59'));

      // ⚠️ 중요: 기존 예약 종료 시간에 버퍼 타임 추가
      // 예) 14:00 반납 → 버퍼 타임 포함 15:00까지 사용 불가
      bookingEnd = new Date(bookingEnd.getTime() + BUFFER_TIME_MS);

      // 시간 겹침 체크 (버퍼 타임 포함)
      return !(returnD.getTime() <= bookingStart.getTime() || pickup.getTime() >= bookingEnd.getTime());
    });

    return Math.max(0, vehicle.stock - conflictingBookings.length);
  };

  // 예약 처리
  const handleBooking = async () => {
    // 로그인 체크
    if (!isLoggedIn || !user) {
      toast.error('로그인이 필요한 서비스입니다');
      navigate('/login', { state: { returnUrl: `/rentcar/${vendorId}` } });
      return;
    }

    if (!pickupDate || !returnDate) {
      toast.error('대여/반납 날짜를 선택해주세요');
      return;
    }

    if (!selectedVehicle) {
      toast.error('차량을 선택해주세요');
      return;
    }

    const totalHours = calculateRentalHours();

    if (totalHours < 4) {
      toast.error('최소 4시간 이상 대여 가능합니다');
      return;
    }

    if (totalHours <= 0) {
      toast.error('반납 시간은 대여 시간 이후여야 합니다');
      return;
    }

    // 재고 확인
    const availableStock = checkVehicleAvailability(selectedVehicle);
    if (availableStock <= 0) {
      toast.error('선택한 날짜/시간에 해당 차량을 이용할 수 없습니다');
      return;
    }

    try {
      setIsBooking(true);

      // 1. 가용성 확인
      const availabilityResponse = await fetch(
        `/api/rentcar/check-availability?vehicle_id=${selectedVehicle.id}&pickup_date=${format(pickupDate, 'yyyy-MM-dd')}&pickup_time=${pickupTime}&dropoff_date=${format(returnDate, 'yyyy-MM-dd')}&dropoff_time=${returnTime}`
      );
      const availabilityResult = await availabilityResponse.json();

      if (!availabilityResult.success || !availabilityResult.available) {
        toast.error(availabilityResult.reason || '선택한 날짜/시간에 예약할 수 없습니다');
        return;
      }

      // 2. 예약 생성 (실제 사용자 정보 사용)
      const bookingPayload = {
        vendor_id: vendorData?.vendor.id,
        vehicle_id: selectedVehicle.id,
        user_id: user.id,
        customer_name: user.name,
        customer_email: user.email,
        customer_phone: user.phone || '',
        pickup_location_id: 1,
        dropoff_location_id: 1,
        pickup_date: format(pickupDate, 'yyyy-MM-dd'),
        pickup_time: pickupTime,
        dropoff_date: format(returnDate, 'yyyy-MM-dd'),
        dropoff_time: returnTime,
        special_requests: ''
      };

      const bookingResponse = await fetch('/api/rentcar/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingPayload)
      });

      const bookingResult = await bookingResponse.json();

      if (!bookingResult.success) {
        toast.error(bookingResult.error || '예약 생성에 실패했습니다');
        return;
      }

      // 3. 결제 페이지로 이동 (bookingId와 함께)
      const bookingData = bookingResult.data;
      const hourlyRate = selectedVehicle.hourly_rate_krw || Math.ceil(selectedVehicle.daily_rate_krw / 24);
      const totalPrice = Math.ceil(hourlyRate * totalHours);

      navigate(
        `/payment?bookingId=${bookingData.id}&bookingNumber=${bookingData.booking_number}&amount=${totalPrice}&title=${encodeURIComponent(selectedVehicle.display_name || selectedVehicle.model)}&customerName=${encodeURIComponent(user.name)}&customerEmail=${encodeURIComponent(user.email)}`
      );

    } catch (error) {
      console.error('예약 처리 오류:', error);
      toast.error('예약 처리 중 오류가 발생했습니다');
    } finally {
      setIsBooking(false);
    }
  };

  // 즐겨찾기 토글
  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? '즐겨찾기에서 제거되었습니다' : '즐겨찾기에 추가되었습니다');
  };

  // 공유
  const handleShare = async () => {
    try {
      await navigator.share({
        title: vendorData?.vendor.vendor_name || '',
        text: `${vendorData?.vendor.vendor_name} - ${vendorData?.total_vehicles}대 차량`,
        url: window.location.href
      });
    } catch (error) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('링크가 클립보드에 복사되었습니다');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !vendorData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">오류 발생</h3>
            <p className="text-gray-600 mb-4">{error || '업체를 찾을 수 없습니다'}</p>
            <Button onClick={() => navigate(-1)}>돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const minPrice = vendorData.vehicles.length > 0
    ? Math.min(...vendorData.vehicles.map(v => v.daily_rate_krw))
    : 0;

  // 차량 정렬: 재고 있는 것 먼저, 그 다음 가격순
  const sortedVehicles = [...vendorData.vehicles].sort((a, b) => {
    const stockA = checkVehicleAvailability(a);
    const stockB = checkVehicleAvailability(b);

    // 재고 없는 것은 맨 아래로
    if (stockA === 0 && stockB > 0) return 1;
    if (stockA > 0 && stockB === 0) return -1;

    // 둘 다 재고가 있거나 없으면 가격순
    return a.daily_rate_krw - b.daily_rate_krw;
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(sortedVehicles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentVehicles = sortedVehicles.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 이미지 갤러리 */}
        <div className="mb-6">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-200">
            {allImages.length > 0 ? (
              <>
                <ImageWithFallback
                  src={allImages[currentImageIndex]}
                  alt={vendorData.vendor.vendor_name}
                  className="w-full h-full object-cover"
                />
                {allImages.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
                      onClick={nextImage}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {allImages.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                이미지 없음
              </div>
            )}
          </div>

          {/* 썸네일 */}
          {allImages.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {allImages.slice(0, 5).map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`flex-shrink-0 w-20 h-20 rounded border-2 overflow-hidden ${
                    idx === currentImageIndex ? 'border-blue-500' : 'border-gray-200'
                  }`}
                >
                  <ImageWithFallback src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 메인 컨텐츠 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 기본 정보 */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-2">{vendorData.vendor.vendor_name}</h1>
                    <div className="flex items-center gap-4 text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <Car className="h-4 w-4" />
                        <span>{vendorData.total_vehicles}대 운영 중</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {vendorData.vendor.vendor_code.includes('TURO') && (
                        <Badge className="bg-purple-500">Turo 공식 파트너</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleFavorite}
                      className={isFavorite ? 'text-red-500' : ''}
                    >
                      <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleShare}>
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-gray-700">
                  {vendorData.vendor.business_name && (
                    <p><strong>업체명:</strong> {vendorData.vendor.business_name}</p>
                  )}
                  {vendorData.vendor.contact_name && (
                    <p><strong>담당자:</strong> {vendorData.vendor.contact_name}</p>
                  )}
                  {vendorData.vendor.phone && (
                    <p><strong>전화:</strong> {vendorData.vendor.phone}</p>
                  )}
                  {vendorData.vendor.email && (
                    <p><strong>이메일:</strong> {vendorData.vendor.email}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 예약 정보 */}
            {pickupDate && returnDate && selectedVehicle && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    예약 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">대여 기간</p>
                      <p className="text-sm text-gray-600">
                        {format(pickupDate, 'yyyy년 M월 d일 (E) ' + pickupTime, { locale: ko })} ~ {format(returnDate, 'M월 d일 (E) ' + returnTime, { locale: ko })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        총 {Math.floor(calculateRentalHours())}시간
                        {calculateRentalHours() % 1 !== 0 && ` ${Math.round((calculateRentalHours() % 1) * 60)}분`}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Car className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">선택 차량</p>
                      <p className="text-sm text-gray-600">
                        {selectedVehicle.display_name || `${selectedVehicle.brand} ${selectedVehicle.model}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedVehicle.seating_capacity}인승 · {selectedVehicle.transmission} · {selectedVehicle.fuel_type}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">인수/반납 위치</p>
                      <p className="text-sm text-gray-600">{vendorData.vendor.business_name || vendorData.vendor.vendor_name}</p>
                      {vendorData.vendor.phone && (
                        <p className="text-xs text-gray-500 mt-1">{vendorData.vendor.phone}</p>
                      )}
                    </div>
                  </div>
                  <Separator />
                  <div className="bg-white rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">
                        차량 대여료 ({Math.floor(calculateRentalHours())}시간
                        {calculateRentalHours() % 1 !== 0 && ` ${Math.round((calculateRentalHours() % 1) * 60)}분`})
                      </span>
                      <span className="font-medium">
                        ₩{Math.ceil((selectedVehicle.hourly_rate_krw || Math.ceil(selectedVehicle.daily_rate_krw / 24)) * calculateRentalHours()).toLocaleString()}
                      </span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">총 결제 금액</span>
                      <span className="text-xl font-bold text-blue-600">
                        ₩{Math.ceil((selectedVehicle.hourly_rate_krw || Math.ceil(selectedVehicle.daily_rate_krw / 24)) * calculateRentalHours()).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 차량 선택 */}
            <Card>
              <CardHeader>
                <CardTitle>차량 선택 ({vendorData.total_vehicles}대)</CardTitle>
                {pickupDate && returnDate && (
                  <p className="text-sm text-gray-600">
                    {format(pickupDate, 'M월 d일', { locale: ko })} ~ {format(returnDate, 'M월 d일', { locale: ko })} 기준 재고
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {/* Empty State */}
                {vendorData.vehicles.length === 0 ? (
                  <div className="text-center py-12">
                    <Car className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">등록된 차량이 없습니다</h3>
                    <p className="text-gray-500">업체에서 곧 차량을 등록할 예정입니다</p>
                  </div>
                ) : currentVehicles.length === 0 && pickupDate && returnDate ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-20 w-20 text-orange-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">선택한 날짜에 이용 가능한 차량이 없습니다</h3>
                    <p className="text-gray-500 mb-4">다른 날짜를 선택하시거나 문의해주세요</p>
                    <Button onClick={() => { setPickupDate(undefined); setReturnDate(undefined); }}>
                      날짜 다시 선택
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* 2열 그리드 레이아웃 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 auto-rows-fr">
                      {currentVehicles.map((vehicle) => {
                    const availableStock = checkVehicleAvailability(vehicle);
                    const isAvailable = availableStock > 0;

                    return (
                      <div
                        key={vehicle.id}
                        className={`w-full text-left rounded-lg border overflow-hidden transition-all ${
                          !isAvailable
                            ? 'opacity-50 bg-gray-50'
                            : selectedVehicle?.id === vehicle.id
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        {/* 차량 이미지 */}
                        <div className="relative w-full aspect-video">
                          {vehicle.images && vehicle.images.length > 0 ? (
                            <img
                              src={vehicle.images[0]}
                              alt={`${vehicle.display_name || vehicle.model} - ${vehicle.brand} ${vehicle.year}년식`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              sizes="(max-width: 768px) 100vw, 50vw"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling;
                                if (fallback) fallback.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center ${vehicle.images && vehicle.images.length > 0 ? 'hidden' : ''}`}>
                            <Car className="h-16 w-16 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-500">이미지 준비 중</span>
                          </div>
                          {vehicle.is_featured && (
                            <Badge className="absolute top-2 left-2 bg-blue-500">인기</Badge>
                          )}
                          {!isAvailable && (
                            <Badge variant="destructive" className="absolute top-2 right-2">예약 불가</Badge>
                          )}
                        </div>

                        {/* 차량 정보 */}
                        <div className="p-4">
                          <div className="mb-2">
                            <h3 className="font-semibold text-lg mb-1">
                              {vehicle.display_name || `${vehicle.brand} ${vehicle.model}`}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {vehicle.year}년식 · {vehicle.vehicle_class}
                            </p>
                          </div>

                          {/* 차량 스펙 */}
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Users className="h-4 w-4 flex-shrink-0" />
                              <span>{vehicle.seating_capacity}인승</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Settings className="h-4 w-4 flex-shrink-0" />
                              <span>{vehicle.transmission}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Fuel className="h-4 w-4 flex-shrink-0" />
                              <span>{vehicle.fuel_type}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Car className="h-4 w-4 flex-shrink-0" />
                              <span>짐 {vehicle.large_bags}/{vehicle.small_bags}</span>
                            </div>
                          </div>

                          {/* 가격 및 재고 */}
                          <div className="flex items-center justify-between pt-3 border-t">
                            <div>
                              {vehicle.hourly_rate_krw && (
                                <div className="text-sm text-gray-600 mb-1">
                                  시간: ₩{vehicle.hourly_rate_krw.toLocaleString()}
                                </div>
                              )}
                              <div className={`text-xl font-bold ${isAvailable ? 'text-blue-600' : 'text-gray-400'}`}>
                                ₩{vehicle.daily_rate_krw.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">1일 기준</div>
                            </div>
                            {isAvailable && pickupDate && returnDate && (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                                {availableStock}대 가능
                              </Badge>
                            )}
                          </div>

                          {/* 액션 버튼 */}
                          <div className="flex gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => navigate(`/rentcar/vehicle/${vehicle.id}`)}
                            >
                              상세보기
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1"
                              disabled={!isAvailable}
                              onClick={() => setSelectedVehicle(vehicle)}
                            >
                              {selectedVehicle?.id === vehicle.id ? '선택됨' : '선택'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      이전
                    </Button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="min-w-[40px]"
                      >
                        {page}
                      </Button>
                    ))}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      다음
                    </Button>
                  </div>
                )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* 위치 정보 */}
            {vendorData.vendor.address && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    위치
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">주소</p>
                    <p className="text-gray-600">{vendorData.vendor.address}</p>
                  </div>
                  {vendorData.vendor.latitude && vendorData.vendor.longitude && (
                    <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                      <iframe
                        width="100%"
                        height="100%"
                          style={{ border: 0 }}
                        src={`https://www.google.com/maps?q=${vendorData.vendor.latitude},${vendorData.vendor.longitude}&hl=ko&z=15&output=embed`}
                        allowFullScreen
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 취소/환불 정책 */}
            {vendorData.vendor.cancellation_policy && (
              <Card>
                <CardHeader>
                  <CardTitle>취소/환불 정책</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm text-gray-700 whitespace-pre-line">
                    {vendorData.vendor.cancellation_policy}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 안내사항 */}
            <Card>
              <CardHeader>
                <CardTitle>대여 안내</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>• 운전면허 취득 1년 이상 필수</p>
                  <p>• 만 21세 이상 대여 가능</p>
                  <p>• 대여 시 신분증, 운전면허증, 신용카드 필요</p>
                  <p>• 보험 가입 필수 (기본 보험 포함)</p>
                  <p>• 주행거리 제한: 1일 200km (초과 시 km당 ₩100)</p>
                </div>
              </CardContent>
            </Card>

            {/* 리뷰 섹션 */}
            <Card>
              <CardHeader>
                <CardTitle>이용 후기</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  리뷰 컴포넌트는 별도로 구현됩니다
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 예약 사이드바 */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-40 lg:self-start lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto">
              <Card>
                <CardContent className="p-6">
                <div className="mb-6">
                  <div className="text-sm text-gray-600 mb-1">
                    {selectedVehicle
                      ? `${selectedVehicle.display_name || selectedVehicle.model} - 1일 기준`
                      : '1일 기준'}
                  </div>
                  <div className="text-3xl font-bold text-blue-600">
                    ₩{selectedVehicle
                      ? selectedVehicle.daily_rate_krw.toLocaleString()
                      : minPrice.toLocaleString()}
                    {!selectedVehicle && <span className="text-sm text-gray-500 ml-2">~</span>}
                  </div>
                  {pickupDate && returnDate && selectedVehicle && calculateRentalHours() >= 4 && (
                    <div className="mt-2 text-sm text-gray-600">
                      총 {Math.floor(calculateRentalHours())}시간
                      {calculateRentalHours() % 1 !== 0 && ` ${Math.round((calculateRentalHours() % 1) * 60)}분`} = {' '}
                      <span className="font-semibold text-blue-600">
                        ₩{Math.ceil((selectedVehicle.hourly_rate_krw || Math.ceil(selectedVehicle.daily_rate_krw / 24)) * calculateRentalHours()).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                {/* 날짜 및 시간 선택 */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">대여 시작</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {pickupDate ? format(pickupDate, 'PPP', { locale: ko }) : '날짜 선택'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={pickupDate}
                          onSelect={setPickupDate}
                          locale={ko}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <select
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md mt-2"
                    >
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <option key={`${hour}-00`} value={`${hour}:00`}>{hour}:00</option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">반납 시간</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {returnDate ? format(returnDate, 'PPP', { locale: ko }) : '날짜 선택'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={returnDate}
                          onSelect={setReturnDate}
                          locale={ko}
                          disabled={(date) => date < (pickupDate || new Date())}
                        />
                      </PopoverContent>
                    </Popover>
                    <select
                      value={returnTime}
                      onChange={(e) => setReturnTime(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md mt-2"
                    >
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <option key={`${hour}-00`} value={`${hour}:00`}>{hour}:00</option>
                        );
                      })}
                    </select>
                  </div>

                  {pickupDate && returnDate && calculateRentalHours() >= 4 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-900">
                        <strong>총 대여 시간:</strong> {Math.floor(calculateRentalHours())}시간
                        {calculateRentalHours() % 1 !== 0 && ` ${Math.round((calculateRentalHours() % 1) * 60)}분`}
                      </p>
                    </div>
                  )}

                  {pickupDate && returnDate && calculateRentalHours() < 4 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-sm text-orange-900">
                        최소 4시간 이상 대여 가능합니다
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleBooking}
                  className="w-full"
                  size="lg"
                  disabled={isBooking || !pickupDate || !returnDate || !selectedVehicle || calculateRentalHours() < 4}
                >
                  {isBooking ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      예약 처리 중...
                    </div>
                  ) : (
                    '바로 예약하기'
                  )}
                </Button>

                <p className="text-xs text-center text-gray-500 mt-3">
                  즉시 확정됩니다
                </p>
              </CardContent>
            </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

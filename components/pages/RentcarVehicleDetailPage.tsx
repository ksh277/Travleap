/**
 * 렌트카 차량 상세 페이지
 * 개별 차량의 상세 정보, 이미지, 예약 기능
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  ChevronRight,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';

interface VehicleDetail {
  id: number;
  vendor_id: number;
  vendor_name: string;
  vendor_phone?: string;
  vendor_address?: string;
  display_name: string;
  daily_rate_krw: number;
  hourly_rate_krw?: number;
  images: string[];
  thumbnail_url?: string;
  is_active: boolean;
  description?: string;
}

interface Insurance {
  id: number;
  name: string;
  description: string | null;
  coverage_details: string | null;
  hourly_rate_krw: number;
  is_required?: boolean;
  display_order: number;
}

export function RentcarVehicleDetailPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoggedIn } = useAuth();

  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
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

  // MVP API 가격 정보 (업체 페이지에서 전달받음)
  const [mvpPricing, setMvpPricing] = useState<any>(null);

  // 운전자 정보 상태 (MVP API 필수)
  const [driverName, setDriverName] = useState('');
  const [driverBirth, setDriverBirth] = useState(''); // YYYY-MM-DD 형식
  const [driverLicenseNo, setDriverLicenseNo] = useState('');
  const [driverLicenseExp, setDriverLicenseExp] = useState(''); // YYYY-MM-DD 형식

  // 보험 상태
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [selectedInsuranceId, setSelectedInsuranceId] = useState<number | null>(null);

  // 업체 페이지에서 전달받은 날짜/가격 정보 초기화
  useEffect(() => {
    const state = location.state as any;
    if (state) {
      console.log('업체 페이지에서 전달받은 정보:', state);

      // 대여 시작 날짜/시간 설정
      if (state.pickupAt) {
        const pickupDateTime = new Date(state.pickupAt);
        setPickupDate(pickupDateTime);
        setPickupTime(`${pickupDateTime.getHours().toString().padStart(2, '0')}:${pickupDateTime.getMinutes().toString().padStart(2, '0')}`);
      }

      // 반납 날짜/시간 설정
      if (state.returnAt) {
        const returnDateTime = new Date(state.returnAt);
        setReturnDate(returnDateTime);
        setReturnTime(`${returnDateTime.getHours().toString().padStart(2, '0')}:${returnDateTime.getMinutes().toString().padStart(2, '0')}`);
      }

      // MVP API 가격 정보 저장
      if (state.pricing) {
        setMvpPricing(state.pricing);
        console.log('MVP API 가격 정보:', state.pricing);
      }
    }
  }, [location.state]);

  // 데이터 로드
  useEffect(() => {
    const fetchVehicleDetail = async () => {
      if (!vehicleId) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/rentcar/vehicle/${vehicleId}`);
        const result = await response.json();

        if (result.success && result.data) {
          setVehicle(result.data);

          // 보험 상품 로드
          const insuranceResponse = await fetch(`/api/rentcar/insurance?vendor_id=${result.data.vendor_id}`);
          const insuranceResult = await insuranceResponse.json();

          if (insuranceResult.success && insuranceResult.data) {
            setInsurances(insuranceResult.data);
          }
        } else {
          setError('차량 정보를 찾을 수 없습니다');
        }
      } catch (err) {
        console.error('차량 데이터 로드 오류:', err);
        setError('차량 정보를 불러오는데 실패했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicleDetail();
  }, [vehicleId]);

  // 이미지 네비게이션
  const nextImage = () => {
    if (vehicle && vehicle.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % vehicle.images.length);
    }
  };

  const prevImage = () => {
    if (vehicle && vehicle.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + vehicle.images.length) % vehicle.images.length);
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

  // 보험료 계산
  const calculateInsuranceFee = () => {
    if (!selectedInsuranceId) return 0;

    const selectedInsurance = insurances.find(ins => ins.id === selectedInsuranceId);
    if (!selectedInsurance) return 0;

    const totalHours = calculateRentalHours();
    return Math.ceil(selectedInsurance.hourly_rate_krw * totalHours);
  };

  // 가격 계산 (시간 단위 + 보험료)
  const calculateTotalPrice = () => {
    if (!vehicle || !pickupDate || !returnDate) return 0;

    const totalHours = calculateRentalHours();
    if (totalHours < 4) return 0; // 최소 4시간

    // MVP API 가격이 있으면 사용 (업체 페이지에서 전달받은 경우)
    let rentalFee = 0;
    if (mvpPricing && mvpPricing.base_amount) {
      rentalFee = mvpPricing.base_amount;
      console.log('MVP API 가격 사용:', rentalFee);
    } else {
      // 없으면 로컬 계산
      const hourlyRate = vehicle.hourly_rate_krw || Math.ceil(vehicle.daily_rate_krw / 24);
      rentalFee = Math.ceil(hourlyRate * totalHours);
      console.log('로컬 계산 가격:', rentalFee);
    }

    const insuranceFee = calculateInsuranceFee();

    return rentalFee + insuranceFee;
  };

  // 예약 처리 (새 MVP API 사용)
  const handleBooking = async () => {
    if (!vehicle) return;

    // 로그인 체크
    if (!isLoggedIn || !user) {
      toast.error('로그인이 필요한 서비스입니다');
      navigate('/login', { state: { returnUrl: `/rentcar/vehicle/${vehicleId}` } });
      return;
    }

    if (!pickupDate || !returnDate) {
      toast.error('대여/반납 날짜를 선택해주세요');
      return;
    }

    // 운전자 정보 검증
    if (!driverName.trim()) {
      toast.error('운전자 이름을 입력해주세요');
      return;
    }
    if (!driverBirth) {
      toast.error('운전자 생년월일을 입력해주세요');
      return;
    }
    if (!driverLicenseNo.trim()) {
      toast.error('운전면허 번호를 입력해주세요');
      return;
    }
    if (!driverLicenseExp) {
      toast.error('운전면허 만료일을 입력해주세요');
      return;
    }

    // 필수 보험 체크
    const requiredInsurances = insurances.filter(ins => ins.is_required);
    if (requiredInsurances.length > 0 && !selectedInsuranceId) {
      toast.error('필수 보험을 선택해주세요');
      return;
    }

    const totalHours = calculateRentalHours();

    if (totalHours < 4) {
      toast.error('최소 4시간부터 대여 가능합니다');
      return;
    }

    if (totalHours <= 0) {
      toast.error('반납 시간은 대여 시간 이후여야 합니다');
      return;
    }

    try {
      setIsBooking(true);

      // ISO 8601 형식으로 변환 (KST UTC+9)
      const pickupDateTime = `${format(pickupDate, 'yyyy-MM-dd')}T${pickupTime}:00+09:00`;
      const returnDateTime = `${format(returnDate, 'yyyy-MM-dd')}T${returnTime}:00+09:00`;

      // 새 MVP API로 예약 생성 (운전자 정보 포함)
      const bookingPayload = {
        vehicle_id: vehicle.id,
        pickup_at: pickupDateTime,
        return_at: returnDateTime,
        pickup_location_id: 1,
        dropoff_location_id: 1,
        driver: {
          name: driverName,
          birth: driverBirth,
          license_no: driverLicenseNo,
          license_exp: driverLicenseExp
        },
        customer: {
          name: user.name,
          email: user.email,
          phone: user.phone || ''
        }
      };

      const bookingResponse = await fetch('/api/rentals', {
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

      // 결제 페이지로 이동
      const bookingData = bookingResult.data;
      const totalPrice = bookingData.pricing?.total_amount || calculateTotalPrice();

      navigate(
        `/payment?bookingId=${bookingData.rental_id}&bookingNumber=${bookingData.booking_number}&amount=${totalPrice}&title=${encodeURIComponent(vehicle.display_name)}&customerName=${encodeURIComponent(user.name)}&customerEmail=${encodeURIComponent(user.email)}`
      );

      toast.success('예약이 생성되었습니다!');

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
        title: vehicle?.display_name || '',
        text: `${vehicle?.display_name} - ${vehicle?.vendor_name}`,
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

  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">오류 발생</h3>
            <p className="text-gray-600 mb-4">{error || '차량을 찾을 수 없습니다'}</p>
            <Button onClick={() => navigate(-1)}>돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 뒤로가기 버튼 */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ChevronLeft className="h-4 w-4 mr-2" />
          돌아가기
        </Button>

        {/* 이미지 갤러리 */}
        <div className="mb-6">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-200">
            {vehicle.images && vehicle.images.length > 0 ? (
              <>
                <ImageWithFallback
                  src={vehicle.images[currentImageIndex]}
                  alt={vehicle.display_name}
                  className="w-full h-full object-cover"
                />
                {vehicle.images.length > 1 && (
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
                      {currentImageIndex + 1} / {vehicle.images.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Car className="h-24 w-24 text-gray-400" />
              </div>
            )}
          </div>

          {/* 썸네일 */}
          {vehicle.images && vehicle.images.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {vehicle.images.slice(0, 5).map((img, idx) => (
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
                    <h1 className="text-3xl font-bold mb-2">{vehicle.display_name}</h1>
                    <p className="text-gray-600 mb-2">{vehicle.vendor_name}</p>
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

                {vehicle.description && (
                  <p className="text-gray-700 mb-4">{vehicle.description}</p>
                )}

                {/* 요금 정보 */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">일일 요금</p>
                      <p className="text-2xl font-bold text-blue-600">₩{vehicle.daily_rate_krw.toLocaleString()}</p>
                    </div>
                    {vehicle.hourly_rate_krw && (
                      <div className="text-right">
                        <p className="text-sm text-gray-600">시간당 요금</p>
                        <p className="text-xl font-semibold text-gray-700">₩{vehicle.hourly_rate_krw.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>


            {/* 업체 정보 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  업체 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-semibold">{vehicle.vendor_name}</p>
                {vehicle.vendor_phone && (
                  <p className="text-sm text-gray-600">전화: {vehicle.vendor_phone}</p>
                )}
                {vehicle.vendor_address && (
                  <p className="text-sm text-gray-600">주소: {vehicle.vendor_address}</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/rentcar/${vehicle.vendor_id}`)}
                  className="mt-2"
                >
                  업체 상세보기
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 예약 사이드바 */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-4">
              <Card>
                <CardContent className="p-6">
                  {/* 대여 날짜 및 시간 선택 */}
                  <div className="mb-6 space-y-4">
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
                        {mvpPricing ? (
                          <p className="text-xs text-blue-700 mt-1">
                            {mvpPricing.rental_days}일 {mvpPricing.remainder_hours > 0 && `+ ${mvpPricing.remainder_hours}시간`}
                            {' '}(일 ₩{mvpPricing.daily_rate?.toLocaleString() || vehicle.daily_rate_krw.toLocaleString()},
                            시간 ₩{mvpPricing.hourly_rate?.toLocaleString() || vehicle.hourly_rate_krw?.toLocaleString() || Math.ceil(vehicle.daily_rate_krw / 24).toLocaleString()})
                          </p>
                        ) : (
                          <p className="text-xs text-blue-700 mt-1">
                            시간당 약 ₩{(vehicle.hourly_rate_krw || Math.ceil(vehicle.daily_rate_krw / 24)).toLocaleString()}
                          </p>
                        )}
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

                  {/* 운전자 정보 입력 (필수) */}
                  {pickupDate && returnDate && calculateRentalHours() >= 4 && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            운전자 정보 (필수)
                          </h3>
                          <p className="text-xs text-gray-500 mb-3">차량을 직접 운전하실 분의 정보를 입력해주세요</p>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-1 block">운전자 이름 *</label>
                          <input
                            type="text"
                            value={driverName}
                            onChange={(e) => setDriverName(e.target.value)}
                            placeholder="홍길동"
                            className="w-full px-3 py-2 border rounded-md"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-1 block">생년월일 *</label>
                          <input
                            type="date"
                            value={driverBirth}
                            onChange={(e) => setDriverBirth(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 border rounded-md"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-1 block">운전면허 번호 *</label>
                          <input
                            type="text"
                            value={driverLicenseNo}
                            onChange={(e) => setDriverLicenseNo(e.target.value)}
                            placeholder="12-345678-90"
                            className="w-full px-3 py-2 border rounded-md"
                          />
                          <p className="text-xs text-gray-500 mt-1">'-' 포함하여 입력해주세요</p>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-1 block">면허 만료일 *</label>
                          <input
                            type="date"
                            value={driverLicenseExp}
                            onChange={(e) => setDriverLicenseExp(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 border rounded-md"
                          />
                          <p className="text-xs text-gray-500 mt-1">반납일 이후여야 합니다</p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* 보험 선택 (선택사항) */}
                  {insurances.length > 0 && pickupDate && returnDate && calculateRentalHours() >= 4 && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">보험 선택 (선택사항)</h3>
                          <p className="text-xs text-gray-500 mb-3">원하시는 보험을 선택하세요. 선택하지 않아도 예약 가능합니다.</p>
                        </div>

                        <div className="space-y-2">
                          {/* 보험 없음 옵션 */}
                          {(() => {
                            const hasRequiredInsurance = insurances.some(ins => ins.is_required);
                            return (
                              <label className={`block border rounded-lg p-3 transition-all ${
                                hasRequiredInsurance
                                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                                  : selectedInsuranceId === null
                                  ? 'border-blue-500 bg-blue-50 cursor-pointer'
                                  : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                              }`}>
                                <div className="flex items-start gap-3">
                                  <input
                                    type="radio"
                                    name="insurance"
                                    checked={selectedInsuranceId === null}
                                    onChange={() => !hasRequiredInsurance && setSelectedInsuranceId(null)}
                                    disabled={hasRequiredInsurance}
                                    className="mt-1"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">
                                      보험 없음
                                      {hasRequiredInsurance && (
                                        <span className="ml-2 text-xs text-red-600">(필수 보험 선택 필요)</span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500">추가 보험료 없음</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-gray-900">₩0</div>
                                  </div>
                                </div>
                              </label>
                            );
                          })()}

                          {/* 보험 상품 목록 */}
                          {insurances.map((insurance) => {
                            const insuranceFee = Math.ceil(insurance.hourly_rate_krw * calculateRentalHours());
                            return (
                              <label
                                key={insurance.id}
                                className={`block border rounded-lg p-3 cursor-pointer transition-all ${
                                  selectedInsuranceId === insurance.id
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <input
                                    type="radio"
                                    name="insurance"
                                    checked={selectedInsuranceId === insurance.id}
                                    onChange={() => setSelectedInsuranceId(insurance.id)}
                                    className="mt-1"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <div className="font-medium text-gray-900">{insurance.name}</div>
                                      {insurance.is_required && (
                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                                          필수
                                        </span>
                                      )}
                                    </div>
                                    {insurance.description && (
                                      <div className="text-sm text-gray-600 mt-1">{insurance.description}</div>
                                    )}
                                    {insurance.coverage_details && (
                                      <div className="text-xs text-gray-500 mt-1 whitespace-pre-line">
                                        {insurance.coverage_details.split('\n').slice(0, 2).join('\n')}
                                      </div>
                                    )}
                                    <div className="text-xs text-gray-500 mt-1">
                                      {insurance.hourly_rate_krw.toLocaleString()}원/시간 × {Math.floor(calculateRentalHours())}시간
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-green-700">
                                      +₩{insuranceFee.toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  <Separator className="my-4" />

                  {/* 가격 표시 */}
                  <div className="mb-6">
                    {pickupDate && returnDate && calculateRentalHours() >= 4 && (
                      <>
                        <div className="space-y-2 mb-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              차량 대여료
                              {mvpPricing && (
                                <span className="text-xs text-gray-500 ml-1">
                                  ({mvpPricing.rental_days}일 {mvpPricing.remainder_hours > 0 && `+ ${mvpPricing.remainder_hours}시간`})
                                </span>
                              )}
                            </span>
                            <span className="font-medium">
                              ₩{(calculateTotalPrice() - calculateInsuranceFee()).toLocaleString()}
                            </span>
                          </div>
                          {calculateInsuranceFee() > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">보험료</span>
                              <span className="font-medium text-green-600">
                                +₩{calculateInsuranceFee().toLocaleString()}
                              </span>
                            </div>
                          )}
                          <Separator />
                        </div>
                      </>
                    )}
                    <div className="text-sm text-gray-600 mb-1">총 결제 금액</div>
                    <div className="text-3xl font-bold text-blue-600">
                      ₩{calculateTotalPrice().toLocaleString()}
                    </div>
                    {pickupDate && returnDate && calculateRentalHours() >= 4 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {mvpPricing ? (
                          <>
                            {mvpPricing.rental_days}일 {mvpPricing.remainder_hours > 0 && `+ ${mvpPricing.remainder_hours}시간`} 대여
                            {calculateInsuranceFee() > 0 && ' (보험 포함)'}
                          </>
                        ) : (
                          <>
                            {Math.floor(calculateRentalHours())}시간
                            {calculateRentalHours() % 1 !== 0 && ` ${Math.round((calculateRentalHours() % 1) * 60)}분`} 대여
                            {calculateInsuranceFee() > 0 && ' (보험 포함)'}
                          </>
                        )}
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleBooking}
                    className="w-full"
                    size="lg"
                    disabled={
                      isBooking ||
                      !pickupDate ||
                      !returnDate ||
                      calculateRentalHours() < 4 ||
                      !driverName.trim() ||
                      !driverBirth ||
                      !driverLicenseNo.trim() ||
                      !driverLicenseExp
                    }
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

                  {pickupDate && returnDate && calculateRentalHours() >= 4 && (
                    !driverName.trim() || !driverBirth || !driverLicenseNo.trim() || !driverLicenseExp
                  ) && (
                    <p className="text-xs text-center text-orange-600 mt-2">
                      운전자 정보를 모두 입력해주세요
                    </p>
                  )}

                  <p className="text-xs text-center text-gray-500 mt-3">
                    예약 후 10분 이내 결제를 완료해주세요
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

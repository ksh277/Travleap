/**
 * 렌트카 차량 상세 페이지
 * 개별 차량의 상세 정보, 이미지, 예약 기능
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
  ChevronRight,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';

interface VehicleDetail {
  id: number;
  vendor_id: number;
  vendor_name: string;
  vendor_phone?: string;
  vendor_address?: string;
  brand: string;
  model: string;
  year: number;
  display_name: string;
  vehicle_class: string;
  transmission: string;
  fuel_type: string;
  seating_capacity: number;
  door_count: number;
  large_bags: number;
  small_bags: number;
  daily_rate_krw: number;
  hourly_rate_krw?: number;
  images: string[];
  features: string[];
  is_active: boolean;
  is_featured: boolean;
  description?: string;
  insurance_options?: string;
  available_options?: string;
  mileage_limit_per_day?: number;
  excess_mileage_fee_krw?: number;
  fuel_efficiency?: number;
  deposit_amount_krw?: number;
}

export function RentcarVehicleDetailPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  // 예약 폼 상태
  const [pickupDate, setPickupDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [rentalType, setRentalType] = useState<'hourly' | 'daily'>('daily');
  const [rentalHours, setRentalHours] = useState(4); // 최소 4시간

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

  // 가격 계산
  const calculateTotalPrice = () => {
    if (!vehicle) return 0;

    if (rentalType === 'hourly') {
      return (vehicle.hourly_rate_krw || 0) * rentalHours;
    } else {
      if (!pickupDate || !returnDate) return 0;
      const days = Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24));
      return vehicle.daily_rate_krw * Math.max(1, days);
    }
  };

  // 예약 처리
  const handleBooking = () => {
    if (!vehicle) return;

    if (rentalType === 'daily') {
      if (!pickupDate || !returnDate) {
        toast.error('대여/반납 날짜를 선택해주세요');
        return;
      }

      const days = Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 0) {
        toast.error('반납일은 대여일 이후여야 합니다');
        return;
      }

      const bookingData = {
        listingId: vehicle.id,
        listingTitle: `${vehicle.vendor_name} - ${vehicle.display_name}`,
        vehicleType: vehicle.display_name,
        vehiclePrice: vehicle.daily_rate_krw,
        pickupDate: format(pickupDate, 'yyyy-MM-dd'),
        returnDate: format(returnDate, 'yyyy-MM-dd'),
        days,
        totalPrice: calculateTotalPrice(),
        image: vehicle.images?.[0],
        vendorName: vehicle.vendor_name,
        vendorPhone: vehicle.vendor_phone,
        vendorAddress: vehicle.vendor_address
      };

      localStorage.setItem('booking_data', JSON.stringify(bookingData));
      navigate('/payment');
    } else {
      // 시간 단위 예약
      if (rentalHours < 4) {
        toast.error('최소 4시간부터 대여 가능합니다');
        return;
      }

      const bookingData = {
        listingId: vehicle.id,
        listingTitle: `${vehicle.vendor_name} - ${vehicle.display_name}`,
        vehicleType: vehicle.display_name,
        vehiclePrice: vehicle.hourly_rate_krw,
        rentalType: 'hourly',
        rentalHours,
        totalPrice: calculateTotalPrice(),
        image: vehicle.images?.[0],
        vendorName: vehicle.vendor_name,
        vendorPhone: vehicle.vendor_phone,
        vendorAddress: vehicle.vendor_address
      };

      localStorage.setItem('booking_data', JSON.stringify(bookingData));
      navigate('/payment');
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
                    <p className="text-gray-600 mb-2">
                      {vehicle.brand} {vehicle.model} · {vehicle.year}년식
                    </p>
                    <div className="flex gap-2">
                      {vehicle.is_featured && (
                        <Badge className="bg-blue-500">인기</Badge>
                      )}
                      <Badge variant="outline">{vehicle.vehicle_class}</Badge>
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

                {vehicle.description && (
                  <p className="text-gray-700 mb-4">{vehicle.description}</p>
                )}

                {/* 차량 스펙 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="text-xs text-gray-500">승차 인원</p>
                      <p className="font-semibold">{vehicle.seating_capacity}인승</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="text-xs text-gray-500">변속기</p>
                      <p className="font-semibold">{vehicle.transmission}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Fuel className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="text-xs text-gray-500">연료</p>
                      <p className="font-semibold">{vehicle.fuel_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="text-xs text-gray-500">짐 공간</p>
                      <p className="font-semibold">{vehicle.large_bags}대 / {vehicle.small_bags}소</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 포함 옵션 */}
            {vehicle.features && vehicle.features.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>포함 옵션</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {vehicle.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 대여 조건 */}
            <Card>
              <CardHeader>
                <CardTitle>대여 조건</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">주행거리 제한</span>
                  <span className="font-medium">
                    1일 {vehicle.mileage_limit_per_day || 200}km
                  </span>
                </div>
                {vehicle.excess_mileage_fee_krw && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">초과 요금</span>
                    <span className="font-medium">km당 ₩{vehicle.excess_mileage_fee_krw}</span>
                  </div>
                )}
                {vehicle.deposit_amount_krw && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">보증금</span>
                    <span className="font-medium">₩{vehicle.deposit_amount_krw.toLocaleString()}</span>
                  </div>
                )}
                {vehicle.fuel_efficiency && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">연비</span>
                    <span className="font-medium">{vehicle.fuel_efficiency}km/L</span>
                  </div>
                )}
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
                  {/* 대여 방식 선택 */}
                  <div className="mb-6">
                    <div className="flex gap-2 mb-4">
                      <Button
                        variant={rentalType === 'daily' ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => setRentalType('daily')}
                      >
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        일단위
                      </Button>
                      {vehicle.hourly_rate_krw && (
                        <Button
                          variant={rentalType === 'hourly' ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1"
                          onClick={() => setRentalType('hourly')}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          시간단위
                        </Button>
                      )}
                    </div>

                    {rentalType === 'hourly' ? (
                      /* 시간 단위 */
                      <div>
                        <p className="text-sm text-gray-600 mb-2">대여 시간 (최소 4시간)</p>
                        <input
                          type="number"
                          min="4"
                          max="24"
                          value={rentalHours}
                          onChange={(e) => setRentalHours(Math.max(4, parseInt(e.target.value) || 4))}
                          className="w-full px-3 py-2 border rounded-md"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          시간당 ₩{vehicle.hourly_rate_krw?.toLocaleString()}
                        </p>
                      </div>
                    ) : (
                      /* 일 단위 */
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">대여일</label>
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
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">반납일</label>
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
                        </div>
                        <p className="text-xs text-gray-500">
                          1일 ₩{vehicle.daily_rate_krw.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator className="my-4" />

                  {/* 가격 표시 */}
                  <div className="mb-6">
                    <div className="text-sm text-gray-600 mb-1">총 대여 요금</div>
                    <div className="text-3xl font-bold text-blue-600">
                      ₩{calculateTotalPrice().toLocaleString()}
                    </div>
                    {rentalType === 'daily' && pickupDate && returnDate && (
                      <p className="text-xs text-gray-500 mt-1">
                        {Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24))}일 대여
                      </p>
                    )}
                    {rentalType === 'hourly' && (
                      <p className="text-xs text-gray-500 mt-1">
                        {rentalHours}시간 대여
                      </p>
                    )}
                  </div>

                  <Button onClick={handleBooking} className="w-full" size="lg">
                    바로 예약하기
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

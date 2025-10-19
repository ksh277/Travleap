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
  images: string[];
  features: string[];
  is_active: boolean;
  is_featured: boolean;
  average_rating: number;
  total_bookings: number;
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
  };
  vehicles: Vehicle[];
  total_vehicles: number;
}

export function RentcarVendorDetailPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();

  // 상태 관리
  const [vendorData, setVendorData] = useState<VendorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  // 예약 폼 상태
  const [pickupDate, setPickupDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

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

  // 예약 처리
  const handleBooking = () => {
    if (!pickupDate || !returnDate) {
      toast.error('대여/반납 날짜를 선택해주세요');
      return;
    }

    if (!selectedVehicle) {
      toast.error('차량을 선택해주세요');
      return;
    }

    // 대여 일수 계산
    const days = Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = selectedVehicle.daily_rate_krw * days;

    // 예약 정보를 결제 페이지로 전달
    const bookingData = {
      listingId: selectedVehicle.id,
      listingTitle: `${vendorData?.vendor.vendor_name} - ${selectedVehicle.display_name || selectedVehicle.model}`,
      vehicleType: selectedVehicle.display_name || `${selectedVehicle.brand} ${selectedVehicle.model}`,
      vehiclePrice: selectedVehicle.daily_rate_krw,
      pickupDate: format(pickupDate, 'yyyy-MM-dd'),
      returnDate: format(returnDate, 'yyyy-MM-dd'),
      days: days,
      totalPrice: totalPrice,
      image: selectedVehicle.images?.[0]
    };

    localStorage.setItem('booking_data', JSON.stringify(bookingData));
    navigate('/payment');
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

            {/* 차량 선택 */}
            <Card>
              <CardHeader>
                <CardTitle>차량 선택 ({vendorData.total_vehicles}대)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {vendorData.vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedVehicle?.id === vehicle.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedVehicle(vehicle)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">
                            {vehicle.display_name || `${vehicle.brand} ${vehicle.model}`}
                          </h3>
                          {vehicle.is_featured && (
                            <Badge variant="outline" className="text-xs">인기</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{vehicle.seating_capacity}인승</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Settings className="h-4 w-4" />
                            <span>{vehicle.transmission}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Fuel className="h-4 w-4" />
                            <span>{vehicle.fuel_type}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Car className="h-4 w-4" />
                            <span>짐 {vehicle.large_bags}개</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-blue-600">
                          ₩{vehicle.daily_rate_krw.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">1일 기준</div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

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
            <Card className="sticky top-6">
              <CardContent className="p-6">
                <div className="mb-6">
                  <div className="text-sm text-gray-600 mb-1">1일 기준</div>
                  <div className="text-3xl font-bold text-blue-600">
                    ₩{minPrice.toLocaleString()}
                    <span className="text-sm text-gray-500 ml-2">~</span>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* 날짜 선택 */}
                <div className="space-y-4 mb-6">
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
  );
}

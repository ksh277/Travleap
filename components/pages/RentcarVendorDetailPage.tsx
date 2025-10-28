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
  display_name: string;
  daily_rate_krw: number;
  hourly_rate_krw?: number;
  images: string[];
  is_active: boolean;
  description?: string;
  // MVP API 추가 필드
  is_available?: boolean;
  pricing?: {
    total_hours: number;
    rental_days: number;
    remainder_hours: number;
    base_amount: number;
    hourly_rate: number;
    daily_rate: number;
  };
}

interface Insurance {
  id: number;
  name: string;
  description: string | null;
  coverage_details: string | null;
  hourly_rate_krw: number;
  display_order: number;
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
    address_detail?: string;
    latitude?: number;
    longitude?: number;
    cancellation_policy?: string;
    rental_guide?: string;
    cancellation_rules?: {
      '3_days_before': number;
      '1_2_days_before': number;
      'same_day': number;
    };
    images?: string[];
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

  // 예약 폼 상태 - 기본값으로 내일/모레 설정 (MVP API 자동 호출용)
  const [pickupDate, setPickupDate] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  });
  const [returnDate, setReturnDate] = useState<Date>(() => {
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    dayAfterTomorrow.setHours(0, 0, 0, 0);
    return dayAfterTomorrow;
  });
  const [pickupTime, setPickupTime] = useState('10:00');
  const [returnTime, setReturnTime] = useState('10:00');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // 보험 옵션 (UI에서 사용하므로 유지)
  const [insurances, setInsurances] = useState<Insurance[]>([]);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 데이터 로드
  // 업체 기본 정보 로드
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

  // 날짜/시간 변경 시 MVP search API로 가용성 + 가격 조회
  useEffect(() => {
    const searchAvailableVehicles = async () => {
      // vendorData가 로드된 후에만 실행
      if (!vendorId || !vendorData || !pickupDate || !returnDate) {
        return;
      }

      try {
        // ISO 8601 형식으로 변환
        const [pickupHour, pickupMinute] = pickupTime.split(':').map(Number);
        const [returnHour, returnMinute] = returnTime.split(':').map(Number);

        const pickup = new Date(pickupDate);
        pickup.setHours(pickupHour, pickupMinute, 0, 0);

        const returnD = new Date(returnDate);
        returnD.setHours(returnHour, returnMinute, 0, 0);

        const pickupISO = pickup.toISOString();
        const returnISO = returnD.toISOString();

        console.log(`🔍 [업체 상세] MVP API 호출: ${vendorId}, ${pickupISO} → ${returnISO}`);

        // MVP search API 호출
        const params = new URLSearchParams({
          pickup_at: pickupISO,
          return_at: returnISO,
          location_id: '1',
          vendor_id: vendorId
        });

        const response = await fetch(`/api/rentals/search?${params.toString()}`);
        const result = await response.json();

        if (result.success && result.data) {
          console.log(`✅ [업체 상세] MVP API 응답: ${result.data.length}개 차량`);

          // 기존 vendorData의 vehicles를 search 결과로 교체
          setVendorData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              vehicles: result.data.map((item: any) => ({
                ...item.vehicle,
                // MVP API에서 받은 가격 정보 추가
                pricing: item.pricing,
                is_available: item.available
              }))
            };
          });
        } else {
          console.warn('⚠️ [업체 상세] MVP API 응답 실패:', result);
        }
      } catch (err) {
        console.error('❌ [업체 상세] 차량 검색 오류:', err);
      }
    };

    searchAvailableVehicles();
  }, [vendorId, vendorData, pickupDate, returnDate, pickupTime, returnTime]);

  // 이미지 갤러리용 - 벤더 이미지 우선, 없으면 차량 이미지 fallback
  const allImages = (() => {
    if (vendorData?.vendor?.images && vendorData.vendor.images.length > 0) {
      return vendorData.vendor.images;
    }
    return vendorData?.vehicles.flatMap(v => v.images || []) || [];
  })();

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

  // MVP API를 사용하므로 별도의 재고 확인 함수 불필요
  // vehicle.is_available 속성을 사용

  // 예약 처리 - MVP 방식: 차량 상세 페이지로 이동 (운전자 정보 입력용)
  const handleBooking = () => {
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

    // MVP API에서 is_available로 이미 체크됨
    if (selectedVehicle.is_available === false) {
      toast.error('선택한 날짜/시간에 해당 차량을 이용할 수 없습니다');
      return;
    }

    // 차량 상세 페이지로 이동 (운전자 정보 입력 + 예약 생성)
    const [pickupHour, pickupMinute] = pickupTime.split(':').map(Number);
    const [returnHour, returnMinute] = returnTime.split(':').map(Number);

    const pickup = new Date(pickupDate);
    pickup.setHours(pickupHour, pickupMinute, 0, 0);

    const returnD = new Date(returnDate);
    returnD.setHours(returnHour, returnMinute, 0, 0);

    navigate(`/rentcar/vehicle/${selectedVehicle.id}`, {
      state: {
        pickupAt: pickup.toISOString(),
        returnAt: returnD.toISOString(),
        vendorId: vendorId,
        pricing: selectedVehicle.pricing
      }
    });
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

  // 차량 정렬: 가용 차량 먼저, 그 다음 가격순 (MVP API)
  const sortedVehicles = [...vendorData.vehicles].sort((a, b) => {
    const availableA = a.is_available !== false; // undefined는 true로 간주
    const availableB = b.is_available !== false;

    // 예약 불가능한 것은 맨 아래로
    if (!availableA && availableB) return 1;
    if (availableA && !availableB) return -1;

    // 둘 다 가용하거나 불가하면 가격순
    const priceA = a.pricing?.base_amount || a.daily_rate_krw;
    const priceB = b.pricing?.base_amount || b.daily_rate_krw;
    return priceA - priceB;
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
                    // MVP API에서 is_available로 가용성 체크
                    const isAvailable = vehicle.is_available !== false;

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
                              alt={vehicle.display_name}
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
                          {!isAvailable && (
                            <Badge variant="destructive" className="absolute top-2 right-2">예약 불가</Badge>
                          )}
                        </div>

                        {/* 차량 정보 */}
                        <div className="p-4">
                          <div className="mb-3">
                            <h3 className="font-semibold text-lg mb-1">
                              {vehicle.display_name}
                            </h3>
                            {vehicle.description && (
                              <p className="text-sm text-gray-600">{vehicle.description}</p>
                            )}
                          </div>

                          {/* 가격 및 재고 */}
                          <div className="flex items-center justify-between pt-3 border-t">
                            <div>
                              {/* MVP API에서 계산된 가격 표시 (날짜 선택 시) */}
                              {vehicle.pricing && pickupDate && returnDate ? (
                                <>
                                  <div className="text-sm text-gray-600 mb-1">
                                    {vehicle.pricing.rental_days}일 {vehicle.pricing.remainder_hours > 0 && `+ ${vehicle.pricing.remainder_hours}시간`}
                                  </div>
                                  <div className={`text-xl font-bold ${isAvailable ? 'text-blue-600' : 'text-gray-400'}`}>
                                    ₩{vehicle.pricing.base_amount.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-gray-500">총 대여료</div>
                                </>
                              ) : (
                                <>
                                  {vehicle.hourly_rate_krw && (
                                    <div className="text-sm text-gray-600 mb-1">
                                      시간: ₩{vehicle.hourly_rate_krw.toLocaleString()}
                                    </div>
                                  )}
                                  <div className={`text-xl font-bold ${isAvailable ? 'text-blue-600' : 'text-gray-400'}`}>
                                    ₩{vehicle.daily_rate_krw.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-gray-500">1일 기준</div>
                                </>
                              )}
                            </div>
                            {isAvailable && pickupDate && returnDate && (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                                예약 가능
                              </Badge>
                            )}
                            {!isAvailable && pickupDate && returnDate && (
                              <Badge variant="outline" className="text-xs text-red-600 border-red-600">
                                예약 불가
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
                    {vendorData.vendor.address_detail && (
                      <p className="text-sm text-gray-500 mt-1">{vendorData.vendor.address_detail}</p>
                    )}
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

            {/* 보험 상품 */}
            {insurances.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>보험 상품 (선택사항)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 mb-4">
                      차량 예약 시 선택 가능한 보험 상품입니다. 시간당 요금으로 계산됩니다.
                    </p>
                    {insurances.map((insurance) => (
                      <div key={insurance.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-900">{insurance.name}</h4>
                          <span className="text-green-600 font-semibold">
                            {insurance.hourly_rate_krw.toLocaleString()}원/시간
                          </span>
                        </div>
                        {insurance.description && (
                          <p className="text-sm text-gray-600 mb-2">{insurance.description}</p>
                        )}
                        {insurance.coverage_details && (
                          <div className="text-xs text-gray-500 whitespace-pre-line border-t pt-2 mt-2">
                            {insurance.coverage_details}
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                      <p className="text-xs text-blue-700">
                        💡 <strong>계산 예시:</strong> 24시간 렌트 × 1,000원/시간 = 24,000원 보험료
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 안내사항 */}
            {vendorData.vendor.rental_guide && (
              <Card>
                <CardHeader>
                  <CardTitle>대여 안내</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm text-gray-700 whitespace-pre-line">
                    {vendorData.vendor.rental_guide}
                  </div>
                </CardContent>
              </Card>
            )}

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
                      ? `${selectedVehicle.display_name} - 1일 기준`
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

                {/* 선택된 차량 정보 */}
                {selectedVehicle && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Car className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-900">선택된 차량</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedVehicle.display_name}
                    </p>
                    {selectedVehicle.description && (
                      <p className="text-xs text-gray-600 mt-1">{selectedVehicle.description}</p>
                    )}
                  </div>
                )}

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

/**
 * 호텔 상세 페이지 (야놀자 스타일)
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
  Wifi,
  Coffee,
  Wind,
  Tv,
  CheckCircle,
  AlertCircle,
  Loader2,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  Navigation
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';
import { api } from '../../utils/api';

interface Room {
  id: number;
  name: string;
  room_type: string;
  capacity: number;
  base_price_per_night: number;
  breakfast_included: boolean;
  is_available: boolean;
  images: string[];
  description: string;
  location: string;
}

interface HotelData {
  partner: {
    id: number;
    business_name: string;
    contact_name: string;
    phone: string;
    email: string;
    tier: string;
    is_verified: boolean;
  };
  rooms: Room[];
  total_rooms: number;
}

export function HotelDetailPage() {
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();

  // 상태 관리
  const [hotelData, setHotelData] = useState<HotelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  // 예약 폼 상태
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [nearbyHotels, setNearbyHotels] = useState<any[]>([]);

  // 데이터 로드
  useEffect(() => {
    const fetchHotelData = async () => {
      if (!partnerId) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/accommodations/${partnerId}`);
        const result = await response.json();

        if (result.success && result.data) {
          setHotelData(result.data);
        } else {
          setError('호텔 정보를 찾을 수 없습니다');
        }
      } catch (err) {
        console.error('호텔 데이터 로드 오류:', err);
        setError('호텔 정보를 불러오는데 실패했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchHotelData();
  }, [partnerId]);

  // 주변 숙소 로드 (위치 기반)
  useEffect(() => {
    const fetchNearbyAccommodations = async () => {
      if (!hotelData?.rooms[0]) return;

      try {
        // 카테고리 페이지 숙박 데이터 가져오기
        const response = await api.getCategoryListings('accommodation');

        if (response.success && response.data) {
          // 현재 호텔 위치
          const currentLocation = {
            lat: 34.8, // 신안군 중심 좌표 (실제로는 hotelData에서 가져와야 함)
            lng: 126.1
          };

          // 거리 계산 함수 (Haversine formula)
          const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            const R = 6371; // 지구 반지름 (km)
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a =
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c; // 거리 (km)
          };

          // 거리 계산 및 정렬
          const withDistance = response.data
            .filter((item: any) => item.id !== parseInt(partnerId || '0')) // 현재 호텔 제외
            .map((item: any) => ({
              ...item,
              distance: calculateDistance(
                currentLocation.lat,
                currentLocation.lng,
                item.lat || 34.8,
                item.lng || 126.1
              )
            }))
            .sort((a: any, b: any) => a.distance - b.distance)
            .slice(0, 6); // 가까운 6개만

          setNearbyHotels(withDistance);
        }
      } catch (error) {
        console.error('주변 숙소 로드 실패:', error);
      }
    };

    fetchNearbyAccommodations();
  }, [hotelData, partnerId]);

  // 이미지 갤러리용 - 모든 방의 이미지 수집
  const allImages = hotelData?.rooms.flatMap(room => room.images || []) || [];

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
    if (!checkIn || !checkOut) {
      toast.error('체크인/체크아웃 날짜를 선택해주세요');
      return;
    }

    if (!selectedRoom) {
      toast.error('객실을 선택해주세요');
      return;
    }

    // 숙박 일수 계산
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = selectedRoom.base_price_per_night * nights;

    // 예약 정보를 결제 페이지로 전달
    const bookingData = {
      listingId: selectedRoom.id,
      listingTitle: `${hotelData?.partner.business_name} - ${selectedRoom.name}`,
      roomType: selectedRoom.name,
      roomPrice: selectedRoom.base_price_per_night,
      checkIn: format(checkIn, 'yyyy-MM-dd'),
      checkOut: format(checkOut, 'yyyy-MM-dd'),
      nights: nights,
      totalPrice: totalPrice,
      image: selectedRoom.images?.[0],
      location: selectedRoom.location
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
        title: hotelData?.partner.business_name || '',
        text: `${hotelData?.partner.business_name} - ${hotelData?.total_rooms}개 객실`,
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

  if (error || !hotelData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">오류 발생</h3>
            <p className="text-gray-600 mb-4">{error || '호텔을 찾을 수 없습니다'}</p>
            <Button onClick={() => navigate(-1)}>돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const minPrice = Math.min(...hotelData.rooms.map(r => r.base_price_per_night));

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
                  alt={hotelData.partner.business_name}
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
                    <h1 className="text-3xl font-bold mb-2">{hotelData.partner.business_name}</h1>
                    <div className="flex items-center gap-4 text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{hotelData.rooms[0]?.location || '위치 정보 없음'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {hotelData.partner.is_verified && (
                        <Badge variant="secondary">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          인증 파트너
                        </Badge>
                      )}
                      {hotelData.partner.tier === 'premium' && (
                        <Badge className="bg-yellow-500">Premium</Badge>
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
                  <p><strong>담당자:</strong> {hotelData.partner.contact_name}</p>
                  <p><strong>전화:</strong> {hotelData.partner.phone}</p>
                  <p><strong>이메일:</strong> {hotelData.partner.email}</p>
                </div>
              </CardContent>
            </Card>

            {/* 객실 선택 */}
            <Card>
              <CardHeader>
                <CardTitle>객실 선택 ({hotelData.total_rooms}개)</CardTitle>
              </CardHeader>
              <CardContent>
                {/* 2열 그리드 레이아웃 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
                  {hotelData.rooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      className={`w-full text-left rounded-lg border overflow-hidden transition-all ${
                        selectedRoom?.id === room.id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 cursor-pointer hover:shadow-sm'
                      }`}
                      onClick={() => setSelectedRoom(room)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedRoom(room);
                        }
                      }}
                      aria-label={`${room.name} 선택하기, 1박 ${room.base_price_per_night.toLocaleString()}원`}
                      aria-pressed={selectedRoom?.id === room.id}
                    >
                      {/* 객실 이미지 */}
                      <div className="relative w-full aspect-video">
                        {room.images && room.images.length > 0 ? (
                          <img
                            src={room.images[0]}
                            alt={`${room.name} - ${room.room_type}`}
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
                        <div className={`w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex flex-col items-center justify-center ${room.images && room.images.length > 0 ? 'hidden' : ''}`}>
                          <Users className="h-16 w-16 text-blue-400 mb-2" />
                          <span className="text-sm text-blue-600">객실 이미지 준비 중</span>
                        </div>
                        {room.breakfast_included && (
                          <Badge className="absolute top-2 left-2 bg-green-500">조식 포함</Badge>
                        )}
                        {!room.is_available && (
                          <Badge variant="destructive" className="absolute top-2 right-2">예약 불가</Badge>
                        )}
                      </div>

                      {/* 객실 정보 */}
                      <div className="p-4">
                        <div className="mb-2">
                          <h3 className="font-semibold text-lg mb-1">{room.name}</h3>
                          <p className="text-sm text-gray-600">{room.room_type}</p>
                        </div>

                        {/* 객실 스펙 */}
                        <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>최대 {room.capacity}명</span>
                          </div>
                        </div>

                        {room.description && (
                          <p className="text-sm text-gray-500 mb-3 line-clamp-2">{room.description}</p>
                        )}

                        {/* 가격 */}
                        <div className="flex items-center justify-between pt-3 border-t">
                          <div>
                            <div className="text-xl font-bold text-blue-600">
                              ₩{room.base_price_per_night.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">1박 기준</div>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 편의시설 */}
            <Card>
              <CardHeader>
                <CardTitle>편의시설</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-5 w-5 text-gray-600" />
                    <span>무료 Wi-Fi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wind className="h-5 w-5 text-gray-600" />
                    <span>에어컨</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tv className="h-5 w-5 text-gray-600" />
                    <span>TV</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Coffee className="h-5 w-5 text-gray-600" />
                    <span>조식 제공</span>
                  </div>
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
                      {selectedRoom ? `${selectedRoom.name} - 1박 기준` : '1박 기준'}
                    </div>
                    <div className="text-3xl font-bold text-blue-600">
                      ₩{selectedRoom
                        ? selectedRoom.base_price_per_night.toLocaleString()
                        : minPrice.toLocaleString()}
                      {!selectedRoom && <span className="text-sm text-gray-500 ml-2">~</span>}
                    </div>
                    {checkIn && checkOut && selectedRoom && (
                      <div className="mt-2 text-sm text-gray-600">
                        총 {Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))}박 = {' '}
                        <span className="font-semibold text-blue-600">
                          ₩{(selectedRoom.base_price_per_night * Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                <Separator className="my-4" />

                {/* 날짜 선택 */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">체크인</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkIn ? format(checkIn, 'PPP', { locale: ko }) : '날짜 선택'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={checkIn}
                          onSelect={setCheckIn}
                          locale={ko}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">체크아웃</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkOut ? format(checkOut, 'PPP', { locale: ko }) : '날짜 선택'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={checkOut}
                          onSelect={setCheckOut}
                          locale={ko}
                          disabled={(date) => date < (checkIn || new Date())}
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
    </div>
  );
}

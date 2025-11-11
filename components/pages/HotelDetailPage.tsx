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
  Navigation,
  Star,
  MessageCircle,
  ThumbsUp,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';
import { api, type ExtendedReview } from '../../utils/api';
import { Textarea } from '../ui/textarea';
import { getGoogleMapsApiKey } from '../../utils/env';

// Date formatting helper
const formatDate = (date: Date) => {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

interface Review {
  id: string;
  user_id: number;
  rating: number;
  comment: string;
  author: string;
  date: string;
  helpful: number;
  images?: string[];
  verified?: boolean;
}

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

  // 리뷰 상태
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '', images: [] as string[] });

  // 지도 상태
  const [mapError, setMapError] = useState(false);

  // 사용자 정보
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isLoggedIn = !!user;

  // 데이터 로드
  useEffect(() => {
    const fetchHotelData = async () => {
      if (!partnerId) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/accommodations/partner/${partnerId}`);
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
        const response = await api.getListings({ category: 'accommodation', limit: 50 });

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
  const handleBooking = async () => {
    if (!checkIn || !checkOut) {
      toast.error('체크인/체크아웃 날짜를 선택해주세요');
      return;
    }

    if (!selectedRoom) {
      toast.error('객실을 선택해주세요');
      return;
    }

    if (!hotelData) {
      toast.error('호텔 정보를 찾을 수 없습니다');
      return;
    }

    try {
      // 숙박 일수 계산
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const roomPrice = selectedRoom.base_price_per_night * nights;
      const taxAmount = Math.floor(roomPrice * 0.10);
      const serviceCharge = Math.floor(roomPrice * 0.10);
      const totalPrice = roomPrice + taxAmount + serviceCharge;

      const userName = localStorage.getItem('user_name') || 'Guest';
      const userEmail = localStorage.getItem('user_email') || '';
      const userPhone = localStorage.getItem('user_phone') || '';

      // 예약 생성 API 호출
      const response = await fetch('/api/accommodations/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          listing_id: selectedRoom.id,
          start_date: format(checkIn, 'yyyy-MM-dd'),
          end_date: format(checkOut, 'yyyy-MM-dd'),
          user_name: userName,
          user_email: userEmail,
          user_phone: userPhone,
          num_adults: selectedRoom.capacity,
          total_amount: totalPrice,
          special_requests: ''
        })
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message || '예약 생성에 실패했습니다');
        return;
      }

      // 결제 페이지로 이동
      const bookingData = result.data;
      const totalAmount = bookingData.total_amount;

      navigate(
        `/payment?` +
        `bookingId=${bookingData.booking_id}&` +
        `bookingNumber=${bookingData.booking_number}&` +
        `amount=${totalAmount}&` +
        `title=${encodeURIComponent(`${hotelData.partner.business_name} - ${selectedRoom.name}`)}&` +
        `customerName=${encodeURIComponent(userName)}&` +
        `customerEmail=${encodeURIComponent(userEmail)}&` +
        `category=accommodation`
      );

      toast.success('예약이 생성되었습니다!');

    } catch (error) {
      console.error('예약 생성 오류:', error);
      toast.error('예약 처리 중 오류가 발생했습니다');
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
        title: hotelData?.partner.business_name || '',
        text: `${hotelData?.partner.business_name} - ${hotelData?.total_rooms}개 객실`,
        url: window.location.href
      });
    } catch (error) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('링크가 클립보드에 복사되었습니다');
    }
  };

  // 리뷰 로드
  useEffect(() => {
    const fetchReviews = async () => {
      if (!selectedRoom?.id) return;

      try {
        setReviewsLoading(true);
        const dbReviews = await api.getReviews(Number(selectedRoom.id));

        if (Array.isArray(dbReviews) && dbReviews.length > 0) {
          const formattedReviews: Review[] = dbReviews.map((review) => {
            const extendedReview = review as ExtendedReview;
            return {
              id: extendedReview.id.toString(),
              user_id: extendedReview.user_id,
              rating: extendedReview.rating,
              comment: extendedReview.comment_md || extendedReview.title || '좋은 경험이었습니다.',
              author: extendedReview.user_name || '익명',
              date: extendedReview.created_at ? new Date(extendedReview.created_at).toLocaleDateString('ko-KR') : '날짜 없음',
              helpful: extendedReview.helpful_count || 0,
              images: extendedReview.images || [],
              verified: extendedReview.is_verified || false
            };
          });
          setReviews(formattedReviews);
        } else {
          setReviews([]);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [selectedRoom?.id]);

  // 리뷰 작성
  const handleReviewSubmit = async () => {
    if (!newReview.comment.trim()) {
      toast.error('리뷰 내용을 입력해주세요.');
      return;
    }

    if (!isLoggedIn) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (!selectedRoom) {
      toast.error('객실을 선택해주세요.');
      return;
    }

    try {
      const reviewData = {
        listing_id: Number(selectedRoom.id),
        user_id: user?.id || 1,
        rating: newReview.rating,
        title: `${selectedRoom.name} 리뷰`,
        content: newReview.comment.trim(),
        images: newReview.images
      };

      const response = await api.createReview(reviewData);
      if (response.success) {
        toast.success('리뷰가 성공적으로 등록되었습니다.');
        setNewReview({ rating: 5, comment: '', images: [] });

        // 리뷰 다시 로드
        const dbReviews = await api.getReviews(Number(selectedRoom.id));
        if (Array.isArray(dbReviews) && dbReviews.length > 0) {
          const formattedReviews: Review[] = dbReviews.map((review) => {
            const extendedReview = review as ExtendedReview;
            return {
              id: extendedReview.id.toString(),
              user_id: extendedReview.user_id,
              rating: extendedReview.rating,
              comment: extendedReview.comment_md || extendedReview.title || '좋은 경험이었습니다.',
              author: extendedReview.user_name || '익명',
              date: extendedReview.created_at ? new Date(extendedReview.created_at).toLocaleDateString('ko-KR') : '날짜 없음',
              helpful: extendedReview.helpful_count || 0,
              images: extendedReview.images || [],
              verified: extendedReview.is_verified || false
            };
          });
          setReviews(formattedReviews);
        }
      } else {
        throw new Error(response.error || '리뷰 등록 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      const errorMessage = error instanceof Error ? error.message : '리뷰 등록 중 오류가 발생했습니다.';
      toast.error(errorMessage);
    }
  };

  // 리뷰 좋아요
  const handleMarkHelpful = async (reviewId: string) => {
    if (!user?.id) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    try {
      const response = await api.admin.markReviewHelpful(Number(reviewId), user.id);
      if (response.success) {
        toast.success(response.message || '좋아요');

        // 리뷰 다시 로드
        if (selectedRoom?.id) {
          const dbReviews = await api.getReviews(Number(selectedRoom.id));
          if (Array.isArray(dbReviews) && dbReviews.length > 0) {
            const formattedReviews: Review[] = dbReviews.map((review) => {
              const extendedReview = review as ExtendedReview;
              return {
                id: extendedReview.id.toString(),
                user_id: extendedReview.user_id,
                rating: extendedReview.rating,
                comment: extendedReview.comment_md || extendedReview.title || '좋은 경험이었습니다.',
                author: extendedReview.user_name || '익명',
                date: extendedReview.created_at ? new Date(extendedReview.created_at).toLocaleDateString('ko-KR') : '날짜 없음',
                helpful: extendedReview.helpful_count || 0,
                images: extendedReview.images || [],
                verified: extendedReview.is_verified || false
              };
            });
            setReviews(formattedReviews);
          }
        }
      } else {
        throw new Error(response.error || '좋아요 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error marking review helpful:', error);
      const errorMessage = error instanceof Error ? error.message : '좋아요 처리 중 오류가 발생했습니다.';
      toast.error(errorMessage);
    }
  };

  // 리뷰 삭제
  const handleDeleteReview = async (reviewId: string) => {
    if (!user?.id) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    if (!confirm('정말 이 리뷰를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await api.deleteReview(Number(reviewId), user.id);
      if (response.success) {
        toast.success('리뷰가 삭제되었습니다.');

        // 리뷰 다시 로드
        if (selectedRoom?.id) {
          const dbReviews = await api.getReviews(Number(selectedRoom.id));
          if (Array.isArray(dbReviews) && dbReviews.length > 0) {
            const formattedReviews: Review[] = dbReviews.map((review) => {
              const extendedReview = review as ExtendedReview;
              return {
                id: extendedReview.id.toString(),
                user_id: extendedReview.user_id,
                rating: extendedReview.rating,
                comment: extendedReview.comment_md || extendedReview.title || '좋은 경험이었습니다.',
                author: extendedReview.user_name || '익명',
                date: extendedReview.created_at ? new Date(extendedReview.created_at).toLocaleDateString('ko-KR') : '날짜 없음',
                helpful: extendedReview.helpful_count || 0,
                images: extendedReview.images || [],
                verified: extendedReview.is_verified || false
              };
            });
            setReviews(formattedReviews);
          } else {
            setReviews([]);
          }
        }
      } else {
        throw new Error(response.error || '리뷰 삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      const errorMessage = error instanceof Error ? error.message : '리뷰 삭제 중 오류가 발생했습니다.';
      toast.error(errorMessage);
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

  // 평균 평점 계산
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
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
                          <ImageWithFallback
                            src={room.images[0]}
                            alt={`${room.name} - ${room.room_type}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
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
            <div id="reviews" className="space-y-6 scroll-mt-24">
              {/* Review Summary */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-6">
                    <div className="text-center">
                      <div className="text-4xl mb-1">{averageRating.toFixed(1)}</div>
                      <div className="flex items-center justify-center mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < Math.round(averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <div className="text-sm text-gray-500">{reviews.length}개 리뷰</div>
                    </div>
                    <div className="flex-1">
                      {[5, 4, 3, 2, 1].map(rating => {
                        const count = reviews.filter(r => Math.round(r.rating) === rating).length;
                        const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                        return (
                          <div key={rating} className="flex items-center space-x-3 mb-1">
                            <div className="text-sm w-8">{rating}점</div>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-yellow-400 h-2 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="text-sm w-8 text-gray-500">{count}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Write Review */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageCircle className="h-5 w-5 mr-2" />
                    리뷰 작성
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2">평점</label>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map(rating => (
                        <button
                          key={rating}
                          onClick={() => setNewReview(prev => ({ ...prev, rating }))}
                          className="p-1"
                        >
                          <Star
                            className={`h-6 w-6 ${rating <= newReview.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-2">리뷰 내용</label>
                    <Textarea
                      placeholder="이용 후기를 남겨주세요..."
                      value={newReview.comment}
                      onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                      rows={4}
                    />
                  </div>
                  <Button onClick={handleReviewSubmit} className="w-full min-h-[44px]">
                    리뷰 등록
                  </Button>
                </CardContent>
              </Card>

              {/* Review List */}
              <div className="space-y-4">
                {reviewsLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    리뷰를 불러오는 중...
                  </div>
                ) : reviews.length > 0 ? (
                  reviews.map(review => (
                    <Card key={review.id}>
                      <CardContent className="p-4 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-3 space-y-3 md:space-y-0">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-medium">{review.author}</span>
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                  />
                                ))}
                              </div>
                              {review.verified && (
                                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">인증됨</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDate(new Date(review.date))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-500 hover:text-blue-600 min-h-[44px] md:min-h-[36px]"
                              onClick={() => handleMarkHelpful(review.id)}
                            >
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              좋아요 {review.helpful}
                            </Button>
                            {user && Number(user.userId || user.id) === Number(review.user_id) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 min-h-[44px] md:min-h-[36px]"
                                onClick={() => handleDeleteReview(review.id)}
                              >
                                삭제
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{review.comment}</p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    아직 작성된 리뷰가 없습니다. 첫 번째 리뷰를 작성해보세요!
                  </div>
                )}
              </div>
            </div>

            {/* 위치 및 지도 섹션 */}
            <div id="location" className="space-y-6 scroll-mt-24">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    위치 및 지도
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="mb-2 font-medium">주소</h4>
                      <p className="text-gray-700">{hotelData.rooms[0]?.location || hotelData.partner.address || '위치 정보 없음'}</p>
                      {hotelData.partner.address && hotelData.partner.address !== hotelData.rooms[0]?.location && (
                        <p className="text-gray-600 text-sm mt-1">{hotelData.partner.address}</p>
                      )}
                    </div>

                    {/* 구글 지도 */}
                    <div className="w-full">
                      <div className="w-full h-[300px] md:h-[400px] lg:h-[500px] bg-gray-200 rounded-lg overflow-hidden relative">
                        {(() => {
                          const apiKey = getGoogleMapsApiKey();
                          console.log('🗺️ Google Maps API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');
                          return apiKey;
                        })() ? (
                          <>
                            <iframe
                              src={
                                (hotelData.partner as any).coordinates
                                  ? `https://www.google.com/maps/embed/v1/place?key=${getGoogleMapsApiKey()}&q=${(hotelData.partner as any).coordinates}&zoom=15&maptype=roadmap&language=ko`
                                  : `https://www.google.com/maps/embed/v1/place?key=${getGoogleMapsApiKey()}&q=${encodeURIComponent((hotelData.partner.address || hotelData.rooms[0]?.location || hotelData.partner.business_name) + ' 제주')}&zoom=14&maptype=roadmap&language=ko`
                              }
                              className="w-full h-full border-0"
                              allowFullScreen
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                              title={`${hotelData.partner.business_name} 위치 지도`}
                              onLoad={() => {
                                console.log('✅ Google Maps iframe loaded successfully');
                                setMapError(false);
                              }}
                              onError={(e) => {
                                console.error('❌ Google Maps iframe 로드 실패:', e);
                                setMapError(true);
                              }}
                            />
                            {/* 지도 로드 에러 오버레이 */}
                            {mapError && (
                              <div className="absolute inset-0 bg-white/95 flex items-center justify-center">
                                <div className="text-center p-6">
                                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                                  <h4 className="text-lg font-semibold text-gray-800 mb-2">지도를 로드할 수 없습니다</h4>
                                  <p className="text-sm text-gray-600 mb-4">
                                    Google Maps API 키가 유효하지 않거나<br />
                                    Maps Embed API가 활성화되지 않았습니다.
                                  </p>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((hotelData.rooms[0]?.location || hotelData.partner.business_name) + ' 제주')}`;
                                      window.open(mapUrl, '_blank');
                                    }}
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Google Maps에서 보기
                                  </Button>
                                </div>
                              </div>
                            )}
                            {/* 지도 오버레이 버튼들 */}
                            <div className="absolute top-4 right-4 flex flex-col gap-2">
                              <Button
                                size="sm"
                                className="bg-white/90 text-gray-700 hover:bg-white shadow-lg"
                                onClick={() => {
                                  const query = (hotelData.partner as any).coordinates || encodeURIComponent((hotelData.rooms[0]?.location || hotelData.partner.business_name) + ' 제주');
                                  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
                                  window.open(mapUrl, '_blank');
                                }}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                크게보기
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-white/90 hover:bg-white shadow-lg"
                                onClick={() => {
                                  const destination = (hotelData.partner as any).coordinates || encodeURIComponent((hotelData.rooms[0]?.location || hotelData.partner.business_name) + ' 제주');
                                  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
                                  window.open(directionsUrl, '_blank');
                                }}
                              >
                                <Navigation className="h-3 w-3 mr-1" />
                                길찾기
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300">
                            <div className="text-center p-6">
                              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                              <h4 className="text-lg font-semibold text-gray-600 mb-2">지도를 로드할 수 없습니다</h4>
                              <p className="text-sm text-gray-500 mb-4">
                                Google Maps API 키가 설정되지 않았습니다.
                              </p>
                              <div className="flex flex-col gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((hotelData.rooms[0]?.location || hotelData.partner.business_name) + ' 제주')}`;
                                    window.open(mapUrl, '_blank');
                                  }}
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Google Maps에서 보기
                                </Button>
                                <p className="text-xs text-gray-400">주소: {hotelData.rooms[0]?.location || hotelData.partner.address || '위치 정보 없음'}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 font-medium">교통편</h4>
                      <ul className="space-y-1 text-gray-700">
                        <li>• 제주국제공항에서 차량으로 약 30-40분</li>
                        <li>• 주차 시설 이용 가능 (현장 문의)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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

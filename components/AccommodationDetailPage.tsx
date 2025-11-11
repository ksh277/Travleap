/**
 * 숙박 상세 페이지
 * PMS 연동 객실 타입 및 실시간 예약 기능 포함
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
  MapPin,
  Star,
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
  MessageCircle,
  ThumbsUp
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { api, type TravelItem, ExtendedReview } from '../utils/api';
import { formatPrice } from '../utils/translations';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

interface AccommodationDetailPageProps {
  selectedCurrency?: string;
}

interface RoomTypeDisplay {
  name: string;
  price: number;
  occupancy: string;
}

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

export function AccommodationDetailPage({ selectedCurrency = 'KRW' }: AccommodationDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // 상태 관리
  const [listing, setListing] = useState<TravelItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  // 리뷰 상태
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newReview, setNewReview] = useState<{ rating: number; comment: string; images: string[] }>({
    rating: 5,
    comment: '',
    images: []
  });

  // 예약 폼 상태
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    checked: boolean;
    available: boolean;
    reason?: string;
  }>({ checked: false, available: false });

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 객실 타입 파싱 (highlights에서)
  const roomTypes: RoomTypeDisplay[] = listing?.highlights
    ?.filter(h => h.includes('원'))
    .map(h => {
      // 형식: "Deluxe Double - 120,000원 (최대 2명)"
      const match = h.match(/(.+?)\s*-\s*([0-9,]+)원\s*\(최대\s*(\d+)명\)/);
      if (match) {
        return {
          name: match[1].trim(),
          price: parseInt(match[2].replace(/,/g, '')),
          occupancy: `최대 ${match[3]}명`
        };
      }
      return null;
    })
    .filter((r): r is RoomTypeDisplay => r !== null) || [];

  // 데이터 로드
  useEffect(() => {
    const fetchListing = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        const response = await api.getListingById(parseInt(id));

        if (response.success && response.data) {
          setListing(response.data);
        } else {
          setError('상품을 찾을 수 없습니다');
        }
      } catch (err) {
        console.error('상품 로드 오류:', err);
        setError('상품을 불러오는데 실패했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  // 리뷰 로드
  useEffect(() => {
    if (listing?.id) {
      fetchReviews();
    }
  }, [listing?.id]);

  // 날짜 선택 시 예약 가능 여부 확인
  useEffect(() => {
    const checkAvailability = async () => {
      if (!listing?.id || !checkIn || !checkOut) {
        setAvailabilityStatus({ checked: false, available: false });
        return;
      }

      try {
        const response = await fetch(
          `/api/accommodation/check-availability?listing_id=${listing.id}&start_date=${format(checkIn, 'yyyy-MM-dd')}&end_date=${format(checkOut, 'yyyy-MM-dd')}`
        );
        const result = await response.json();

        if (result.success) {
          setAvailabilityStatus({
            checked: true,
            available: result.available,
            reason: result.reason
          });

          if (!result.available && result.reason) {
            toast.warning(result.reason);
          }
        }
      } catch (error) {
        console.error('예약 가능 여부 확인 오류:', error);
      }
    };

    checkAvailability();
  }, [listing?.id, checkIn, checkOut]);

  // 이미지 네비게이션
  const nextImage = () => {
    if (listing?.images) {
      setCurrentImageIndex((prev) => (prev + 1) % listing.images.length);
    }
  };

  const prevImage = () => {
    if (listing?.images) {
      setCurrentImageIndex((prev) => (prev - 1 + listing.images.length) % listing.images.length);
    }
  };

  // 예약 처리 - 예약 생성 후 결제 페이지로
  const handleBooking = async () => {
    if (!checkIn || !checkOut) {
      toast.error('체크인/체크아웃 날짜를 선택해주세요');
      return;
    }

    if (!selectedRoom) {
      toast.error('객실 타입을 선택해주세요');
      return;
    }

    if (!listing) return;

    // 예약 가능 여부 확인
    if (availabilityStatus.checked && !availabilityStatus.available) {
      toast.error(availabilityStatus.reason || '선택하신 날짜는 예약이 불가능합니다');
      return;
    }

    // 선택한 객실 정보 찾기
    const selectedRoomInfo = roomTypes.find(r => r.name === selectedRoom);
    if (!selectedRoomInfo) {
      toast.error('객실 정보를 찾을 수 없습니다');
      return;
    }

    // 숙박 일수 계산
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = selectedRoomInfo.price * nights;

    try {
      toast.loading('예약 생성 중...');

      // 예약 생성 API 호출
      const response = await fetch('/api/accommodations/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing.id,
          user_id: user?.id,
          user_email: user?.email || '',
          user_name: user?.name || 'Guest',
          user_phone: user?.phone || '',
          start_date: format(checkIn, 'yyyy-MM-dd'),
          end_date: format(checkOut, 'yyyy-MM-dd'),
          num_adults: 2,
          num_children: 0,
          total_amount: totalPrice,
          payment_method: 'card',
          payment_status: 'pending'
        })
      });

      const result = await response.json();

      if (!result.success) {
        toast.dismiss();
        toast.error(result.error || '예약 생성에 실패했습니다');
        return;
      }

      toast.dismiss();
      toast.success('예약이 생성되었습니다. 결제를 진행해주세요.');

      // 결제 페이지로 이동 (query params로 전달)
      // 숙박은 bookingId만 사용 (bookingNumber는 렌트카 전용)
      navigate(`/payment?bookingId=${result.data.booking_id}&amount=${totalPrice}&title=${encodeURIComponent(listing.title)}&customerName=${encodeURIComponent(user?.name || 'Guest')}&customerEmail=${encodeURIComponent(user?.email || '')}`);

    } catch (error) {
      console.error('Booking creation error:', error);
      toast.dismiss();
      toast.error('예약 생성 중 오류가 발생했습니다');
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
        title: listing?.title || '',
        text: listing?.short_description || '',
        url: window.location.href
      });
    } catch (error) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('링크가 클립보드에 복사되었습니다');
    }
  };

  // 리뷰 불러오기
  const fetchReviews = async () => {
    if (!listing?.id) return;
    try {
      setReviewsLoading(true);
      const dbReviews = await api.getReviews(Number(listing.id));

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

  // 리뷰 작성
  const handleSubmitReview = async () => {
    if (!newReview.comment.trim()) {
      toast.error('리뷰 내용을 입력해주세요.');
      return;
    }

    if (!user?.id) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (!listing) return;

    try {
      const reviewData = {
        listing_id: Number(listing.id),
        user_id: user.id,
        rating: newReview.rating,
        title: `${listing.title} 리뷰`,
        content: newReview.comment.trim(),
        images: newReview.images
      };

      const response = await api.createReview(reviewData);
      if (response.success) {
        toast.success('리뷰가 성공적으로 등록되었습니다.');
        setNewReview({ rating: 5, comment: '', images: [] });
        fetchReviews();
      } else {
        throw new Error(response.error || '리뷰 등록 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      const errorMessage = error instanceof Error ? error.message : '리뷰 등록 중 오류가 발생했습니다.';
      toast.error(errorMessage);
    }
  };

  // 리뷰 도움됨 표시
  const handleMarkHelpful = async (reviewId: string) => {
    if (!user?.id) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    try {
      const response = await api.admin.markReviewHelpful(Number(reviewId), user.id);
      if (response.success) {
        toast.success(response.message || '좋아요');
        fetchReviews();
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
        fetchReviews();
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

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">오류 발생</h3>
            <p className="text-gray-600 mb-4">{error || '상품을 찾을 수 없습니다'}</p>
            <Button onClick={() => navigate(-1)}>돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const images = Array.isArray(listing.images) ? listing.images : [];
  const hasPMSIntegration = listing.highlights?.some(h => h === '실시간 예약');

  // 평균 평점 계산
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  // 날짜 포맷팅
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 페이지네이션 계산
  const totalPages = Math.ceil(roomTypes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRooms = roomTypes.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 이미지 갤러리 */}
        <div className="mb-6">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-200">
            {images.length > 0 ? (
              <>
                <ImageWithFallback
                  src={images[currentImageIndex]}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
                {images.length > 1 && (
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
                      {currentImageIndex + 1} / {images.length}
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
          {images.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {images.slice(0, 5).map((img, idx) => (
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
                    <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>
                    <div className="flex items-center gap-4 text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{listing.location}</span>
                      </div>
                      {Number(listing.rating_avg || 0) > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{Number(listing.rating_avg || 0).toFixed(1)}</span>
                          <span className="text-sm">({listing.rating_count || 0})</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {hasPMSIntegration && (
                        <Badge className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          실시간 예약
                        </Badge>
                      )}
                      {listing.partner?.is_verified && (
                        <Badge variant="secondary">Verified</Badge>
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

                <p className="text-gray-700 whitespace-pre-line">
                  {listing.description_md || listing.short_description}
                </p>
              </CardContent>
            </Card>

            {/* 객실 타입 */}
            {roomTypes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>객실 선택 ({roomTypes.length}개)</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* 2열 그리드 레이아웃 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {currentRooms.map((room, idx) => (
                      <div
                        key={idx}
                        className={`rounded-lg border overflow-hidden cursor-pointer transition-all ${
                          selectedRoom === room.name
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                        onClick={() => setSelectedRoom(room.name)}
                      >
                        {/* 객실 이미지 (이미지가 없으면 placeholder) */}
                        <div className="relative w-full aspect-video bg-gradient-to-br from-blue-50 to-blue-100">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Users className="h-16 w-16 text-blue-300" />
                          </div>
                          {selectedRoom === room.name && (
                            <Badge className="absolute top-2 right-2 bg-blue-500">선택됨</Badge>
                          )}
                        </div>

                        {/* 객실 정보 */}
                        <div className="p-4">
                          <h3 className="font-semibold text-lg mb-2">{room.name}</h3>

                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                            <Users className="h-4 w-4" />
                            <span>{room.occupancy}</span>
                          </div>

                          {/* 가격 */}
                          <div className="flex items-center justify-between pt-3 border-t">
                            <div>
                              <div className="text-xl font-bold text-blue-600">
                                {formatPrice(room.price, selectedCurrency)}
                              </div>
                              <div className="text-xs text-gray-500">1박 기준</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
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
                </CardContent>
              </Card>
            )}

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

            {/* 취소/환불 정책 */}
            {listing.cancellation_policy && (
              <Card>
                <CardHeader>
                  <CardTitle>취소/환불 정책</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm text-gray-700 whitespace-pre-line">
                    {listing.cancellation_policy}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 리뷰 섹션 */}
            <div className="space-y-6">
              {/* 리뷰 요약 */}
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

              {/* 리뷰 작성 */}
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
                  <Button onClick={handleSubmitReview} className="w-full min-h-[44px]">
                    리뷰 등록
                  </Button>
                </CardContent>
              </Card>

              {/* 리뷰 목록 */}
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
          </div>

          {/* 예약 사이드바 */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-40 lg:self-start lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto">
              <Card>
                <CardContent className="p-6">
                <div className="mb-6">
                  <div className="text-sm text-gray-600 mb-1">
                    {selectedRoom ? `${selectedRoom} - 1박 기준` : '1박 기준'}
                  </div>
                  <div className="text-3xl font-bold text-blue-600">
                    {selectedRoom
                      ? formatPrice(roomTypes.find(r => r.name === selectedRoom)?.price || listing.price_from || 0, selectedCurrency)
                      : formatPrice(listing.price_from || 0, selectedCurrency)}
                    {!selectedRoom && <span className="text-sm text-gray-500 ml-2">~</span>}
                  </div>
                  {checkIn && checkOut && selectedRoom && (
                    <div className="mt-2 text-sm text-gray-600">
                      총 {Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))}박 = {' '}
                      <span className="font-semibold text-blue-600">
                        {formatPrice(
                          (roomTypes.find(r => r.name === selectedRoom)?.price || 0) *
                          Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)),
                          selectedCurrency
                        )}
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

                {hasPMSIntegration && (
                  <p className="text-xs text-center text-gray-500 mt-3">
                    실시간 예약 - 즉시 확정됩니다
                  </p>
                )}
              </CardContent>
            </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

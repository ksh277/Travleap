import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import {
  MapPin,
  Clock,
  Users,
  Globe,
  Share2,
  Heart,
  Star,
  Phone,
  Mail,
  Camera,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  ThumbsUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPartnerPrice } from '../utils/price-formatter';
import { ReservationModal } from './ReservationModal';
import { useAuth } from '../hooks/useAuth';
import { getGoogleMapsApiKey } from '../utils/env';

interface Partner {
  id: number;
  name: string;
  category: string;
  address: string;
  promotion: string;
  description: string;
  business_hours: string;
  phone: string;
  mobile_phone?: string;
  email: string;
  images: string[];
  location: string;
  rating: number;
  review_count: number;
  discount_rate?: number;
  member_since: string;
  base_price?: number;
  base_price_text?: string;
  duration?: number;
  min_age?: number;
  max_capacity?: number;
  language?: string;
  coordinates?: string;
  lat?: number;
  lng?: number;
  user_id?: number;
  can_book?: boolean; // 예약 가능 여부 (계정 또는 전화번호 있으면 true)
}

interface Review {
  id: string;
  user_id: number;
  author: string;
  rating: number;
  comment: string;
  date: string;
  helpful: number;
  verified: boolean;
}

export function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [nearbyPartners, setNearbyPartners] = useState<Partner[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    loadPartnerDetail();
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchReviews();
    }
  }, [id]);

  // 파트너가 로드되면 근처 파트너 로드
  useEffect(() => {
    if (partner && partner.lat && partner.lng) {
      loadNearbyPartners(partner.lat, partner.lng);
    }
  }, [partner]);

  // Google Map은 이제 iframe 방식으로 렌더링 (JavaScript API 초기화 불필요)

  // 거리 계산 함수 (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // km
  };

  // 근처 파트너 로드
  const loadNearbyPartners = async (currentLat: number, currentLng: number) => {
    setNearbyLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_URL}/api/partners`);
      const result = await response.json();

      if (result.success && result.data) {
        // 현재 파트너를 제외하고 거리 계산
        const partnersWithDistance = result.data
          .filter((p: any) => p.id !== id && p.lat && p.lng) // 현재 파트너 제외 및 좌표 있는 것만
          .map((p: any) => {
            const distance = calculateDistance(
              currentLat,
              currentLng,
              parseFloat(p.lat),
              parseFloat(p.lng)
            );

            // 이미지 처리: 빈 배열은 그대로 두고 렌더링 시 placeholder 사용
            let processedImages: string[] = [];
            if (p.images) {
              try {
                const images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
                if (Array.isArray(images) && images.length > 0) {
                  // base64 이미지 제외
                  processedImages = images.filter((img: string) => img && !img.startsWith('data:image'));
                }
              } catch (e) {
                console.warn('Failed to parse nearby partner images:', e);
              }
            }

            return {
              id: p.id,
              name: p.business_name,
              category: p.services?.split(',')[0] || '여행',
              address: p.business_address || p.location,
              promotion: '',
              description: p.description || '',
              business_hours: p.business_hours || '',
              phone: p.phone || '',
              email: p.email || '',
              images: processedImages,
              location: p.location || '',
              rating: 0,
              review_count: 0,
              member_since: new Date(p.created_at).getFullYear().toString(),
              lat: parseFloat(p.lat),
              lng: parseFloat(p.lng),
              distance: distance
            };
          })
          .sort((a: any, b: any) => a.distance - b.distance) // 거리순 정렬
          .slice(0, 4); // 가장 가까운 4개만

        console.log(`✅ Nearby partners loaded: ${partnersWithDistance.length}개`, partnersWithDistance);
        setNearbyPartners(partnersWithDistance);
      }
    } catch (error) {
      console.error('Failed to load nearby partners:', error);
    } finally {
      setNearbyLoading(false);
    }
  };

  const loadPartnerDetail = async () => {
    if (!id) return;

    setLoading(true);
    try {
      // API 호출 - 환경에 따라 자동으로 URL 설정
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_URL}/api/partners/${id}`);
      const result = await response.json();

      if (result.success && result.data) {
        const partnerData = result.data;
        // 이미지 처리: 빈 배열은 placeholder 사용
        let processedImages = ['/images/placeholder.jpg'];
        if (partnerData.images) {
          try {
            const images = typeof partnerData.images === 'string'
              ? JSON.parse(partnerData.images)
              : partnerData.images;

            // 배열이고 길이가 있으면 사용, 아니면 placeholder
            if (Array.isArray(images) && images.length > 0) {
              // base64 이미지 제외 (너무 큼)
              const validImages = images.filter(img => img && !img.startsWith('data:image'));
              if (validImages.length > 0) {
                processedImages = validImages;
              }
            }
          } catch (e) {
            console.warn('Failed to parse partner images:', e);
          }
        }

        // 예약 가능 여부 계산:
        // - 계정(user_id)이 있으면 → 대시보드로 예약 알림 (예약 가능)
        // - 계정 없고 전화번호(phone/mobile_phone) 있으면 → 카카오 알림톡 (예약 가능)
        // - 둘 다 없으면 → 예약 불가
        const hasAccount = partnerData.user_id && partnerData.user_id > 1; // user_id 1은 시스템 기본값
        const hasPhone = !!(partnerData.phone || partnerData.mobile_phone);
        const canBook = hasAccount || hasPhone;

        setPartner({
          id: partnerData.id,
          name: partnerData.business_name || partnerData.name,
          category: partnerData.category,
          address: partnerData.address || partnerData.business_address,
          promotion: partnerData.promotion || '',
          description: partnerData.description || partnerData.services,
          business_hours: partnerData.business_hours || '매일 09:00-18:00',
          phone: partnerData.phone || partnerData.contact_phone,
          mobile_phone: partnerData.mobile_phone,
          email: partnerData.email || partnerData.contact_email,
          images: processedImages,
          location: partnerData.location || '신안, 대한민국',
          rating: partnerData.avg_rating || partnerData.rating || 0,
          review_count: partnerData.review_count || 0,
          discount_rate: partnerData.discount_rate,
          member_since: partnerData.created_at ? new Date(partnerData.created_at).getFullYear().toString() : new Date().getFullYear().toString(),
          base_price: partnerData.base_price || 0,
          base_price_text: partnerData.base_price_text,
          duration: partnerData.duration,
          min_age: partnerData.min_age,
          max_capacity: partnerData.max_capacity,
          language: partnerData.language,
          coordinates: partnerData.coordinates,
          lat: partnerData.lat ? Number(partnerData.lat) : undefined,
          lng: partnerData.lng ? Number(partnerData.lng) : undefined,
          user_id: partnerData.user_id,
          can_book: canBook,
        });
      } else {
        throw new Error(result.message || '파트너 정보를 찾을 수 없습니다');
      }
    } catch (error) {
      console.error('Failed to load partner:', error);
      toast.error(error instanceof Error ? error.message : '가맹점 정보를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!id) return;

    setReviewsLoading(true);
    try {
      const response = await fetch(`/api/partners/${id}/reviews`);
      const result = await response.json();

      if (result.success && result.data) {
        setReviews(result.data);
      }
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!isLoggedIn || !user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    if (!newReview.comment.trim()) {
      toast.error('리뷰 내용을 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`/api/partners/${id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          rating: newReview.rating,
          comment: newReview.comment,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('리뷰가 등록되었습니다.');
        setNewReview({ rating: 5, comment: '' });
        fetchReviews();
      } else {
        toast.error(result.message || '리뷰 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error('리뷰 등록 중 오류가 발생했습니다.');
    }
  };

  const handleMarkHelpful = async (reviewId: string) => {
    if (!isLoggedIn || !user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    try {
      const response = await fetch(`/api/reviews/helpful/${reviewId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user.id }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('좋아요가 반영되었습니다.');
        fetchReviews();
      } else {
        toast.error(result.message || '좋아요 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to mark helpful:', error);
      toast.error('좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!isLoggedIn || !user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    if (!confirm('정말 이 리뷰를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await api.deleteReview(Number(reviewId), Number(user.id));

      if (response.success) {
        toast.success('리뷰가 삭제되었습니다.');
        fetchReviews(); // 리뷰 목록 새로고침
      } else {
        toast.error(response.error || '리뷰 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete review:', error);
      toast.error('리뷰 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: partner?.name,
        text: partner?.promotion,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('링크가 복사되었습니다');
    }
  };

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
    toast.success(isFavorited ? '찜 목록에서 제거되었습니다' : '찜 목록에 추가되었습니다');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">가맹점을 찾을 수 없습니다</p>
          <Button onClick={() => navigate('/partners')}>목록으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{partner.name} - Travleap</title>
        <meta name="description" content={partner.description} />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Hero Image Section */}
        <div className="relative h-[400px] md:h-[500px] overflow-hidden bg-gray-900">
          <img
            src={partner.images[currentImageIndex]}
            alt={partner.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              e.currentTarget.src = '/images/placeholder.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40"></div>

          {/* Top Actions */}
          <div className="absolute top-4 right-4 flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full bg-white/90 hover:bg-white"
              onClick={handleShare}
            >
              <Share2 className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className={`rounded-full ${
                isFavorited ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white/90 hover:bg-white'
              }`}
              onClick={handleFavorite}
            >
              <Heart className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`} />
            </Button>
          </div>

          {/* Image Navigation Arrows */}
          {partner.images.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white"
                onClick={() => {
                  setCurrentImageIndex((prev) =>
                    prev === 0 ? partner.images.length - 1 : prev - 1
                  );
                }}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white"
                onClick={() => {
                  setCurrentImageIndex((prev) =>
                    prev === partner.images.length - 1 ? 0 : prev + 1
                  );
                }}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Image Counter */}
          {partner.images.length > 1 && (
            <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
              <Camera className="h-4 w-4" />
              {currentImageIndex + 1} / {partner.images.length}
            </div>
          )}
        </div>

        {/* Thumbnail Gallery */}
        {partner.images.length > 1 && (
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex gap-2 overflow-x-auto">
              {partner.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    currentImageIndex === index
                      ? 'border-purple-600 scale-105'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${partner.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/images/placeholder.jpg';
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Title & Location */}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                  {partner.name}
                </h1>
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <MapPin className="h-5 w-5" />
                  <span className="text-sm">{partner.location}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{partner.rating || '지'}</span>
                    <span className="text-gray-600">평가</span>
                  </div>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600">{partner.review_count} 리뷰</span>
                </div>
              </div>

              {/* Overview Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">개요</h2>
                <div className="space-y-3 text-gray-700">
                  <div>
                    <span className="font-semibold">주소 :</span> {partner.address}
                  </div>
                  {partner.promotion && (
                    <div>
                      <span className="font-semibold">프로모션 :</span> {partner.promotion}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold">내용 :</span> {partner.description}
                  </div>
                  <div>
                    <span className="font-semibold">영업시간 :</span> {partner.business_hours}
                  </div>
                </div>
              </div>

              {/* Map Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">활동의 위치</h2>
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <MapPin className="h-5 w-5" />
                  <span className="text-sm">{partner.location}</span>
                </div>
                <div className="w-full h-[400px] bg-gray-100 rounded-lg overflow-hidden relative">
                  {(() => {
                    const apiKey = getGoogleMapsApiKey();
                    console.log('🗺️ [Partner] Google Maps API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');
                    return apiKey;
                  })() ? (
                    <iframe
                      src={
                        partner.lat && partner.lng
                          ? `https://www.google.com/maps/embed/v1/place?key=${getGoogleMapsApiKey()}&q=${partner.lat},${partner.lng}&zoom=15&maptype=roadmap&language=ko`
                          : partner.coordinates
                          ? `https://www.google.com/maps/embed/v1/place?key=${getGoogleMapsApiKey()}&q=${partner.coordinates}&zoom=15&maptype=roadmap&language=ko`
                          : `https://www.google.com/maps/embed/v1/place?key=${getGoogleMapsApiKey()}&q=${encodeURIComponent(partner.address + ', ' + partner.location)}&zoom=14&maptype=roadmap&language=ko`
                      }
                      className="w-full h-full border-0"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={`${partner.name} 위치 지도`}
                      onLoad={() => {
                        console.log('✅ [Partner] Google Maps iframe loaded successfully');
                      }}
                      onError={(e) => {
                        console.error('❌ [Partner] Google Maps iframe 로드 실패:', e);
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <div className="text-center p-6">
                        <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">지도를 로드할 수 없습니다</h4>
                        <p className="text-sm text-gray-600">
                          Google Maps API 키를 확인해주세요.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Reviews Section */}
              <div className="mt-6 space-y-6">
                {/* Write Review */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MessageCircle className="h-5 w-5 mr-2" />
                      리뷰 작성
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoggedIn ? (
                      <>
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
                        <Button onClick={handleReviewSubmit} className="w-full">
                          리뷰 등록
                        </Button>
                      </>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        리뷰를 작성하려면 <button onClick={() => navigate('/login')} className="text-purple-600 underline">로그인</button>해주세요.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Review List */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold">리뷰 목록</h3>
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
                                {new Date(review.date).toLocaleDateString('ko-KR')}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-500 hover:text-blue-600"
                                onClick={() => handleMarkHelpful(review.id)}
                              >
                                <ThumbsUp className="h-4 w-4 mr-1" />
                                좋아요 {review.helpful}
                              </Button>
                              {user && Number(user.userId || user.id) === Number(review.user_id) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
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

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 space-y-6">
                {/* Price Card */}
                <Card className="overflow-hidden">
                  <div className="bg-purple-600 text-white p-6">
                    {(() => {
                      const priceDisplay = formatPartnerPrice(partner.base_price_text, partner.base_price);
                      return priceDisplay ? (
                        <>
                          <div className="text-sm mb-2">from</div>
                          <div className="text-4xl font-bold">
                            {priceDisplay}
                          </div>
                          {partner.discount_rate && partner.base_price && partner.base_price > 0 && (
                            <Badge className="mt-2 bg-red-500">
                              {partner.discount_rate}% 할인
                            </Badge>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-white/80">가격 문의</div>
                      );
                    })()}
                  </div>
                </Card>

                {/* Reservation Button - 휴대폰 또는 계정이 있어야만 예약 가능 */}
                {(partner.mobile_phone || partner.user_id) && (
                  <Card>
                    <CardContent className="p-6">
                      {partner.can_book ? (
                        <>
                          <Button
                            onClick={() => setIsReservationModalOpen(true)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                            size="lg"
                          >
                            <Clock className="h-5 w-5 mr-2" />
                            예약하기
                          </Button>
                          <p className="text-sm text-gray-500 text-center mt-3">
                            날짜와 시간을 선택하여 예약하세요
                          </p>
                        </>
                      ) : (
                        <>
                          <Button
                            disabled
                            className="w-full bg-gray-400 text-white text-lg py-6 cursor-not-allowed"
                            size="lg"
                          >
                            <Clock className="h-5 w-5 mr-2" />
                            예약 불가
                          </Button>
                          <p className="text-sm text-gray-500 text-center mt-3">
                            현재 온라인 예약을 받지 않습니다.<br />
                            방문 또는 전화 문의 부탁드립니다.
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Host Info Card */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold mb-4">주최</h3>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-bold">T</span>
                      </div>
                      <div>
                        <div className="font-semibold">{partner.name}</div>
                        <div className="text-sm text-gray-600">travleap</div>
                        <div className="text-xs text-gray-500">Member Since {partner.member_since}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4].map((star) => (
                        <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                      <Star className="h-4 w-4 text-gray-300" />
                    </div>
                    <div className="text-sm text-gray-600">{partner.review_count || 7} 리뷰</div>
                  </CardContent>
                </Card>

                {/* Contact Info Card */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold mb-4">연락처 정보</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-purple-600" />
                        <span className="text-sm">{partner.phone || partner.mobile_phone || '연락처 정보 없음'}</span>
                      </div>
                      {partner.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 text-purple-600" />
                          <span className="text-sm">{partner.email}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Nearby Partners Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">근처 제휴 프로모션 추천</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {nearbyLoading ? (
                <div className="text-center text-gray-500 col-span-full py-8">
                  근처 프로모션을 불러오는 중...
                </div>
              ) : nearbyPartners.length === 0 ? (
                <div className="text-center text-gray-500 col-span-full py-8">
                  주변에 제휴 프로모션이 없습니다.
                </div>
              ) : (
                nearbyPartners.map((nearbyPartner: any) => (
                  <Card
                    key={nearbyPartner.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/partners/${nearbyPartner.id}`)}
                  >
                    <div className="relative h-48">
                      <img
                        src={nearbyPartner.images && nearbyPartner.images.length > 0
                          ? nearbyPartner.images[0]
                          : 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'}
                        alt={nearbyPartner.name}
                        className="w-full h-full object-cover"
                      />
                      {nearbyPartner.distance !== undefined && (
                        <Badge className="absolute top-2 right-2 bg-blue-600 text-white">
                          {nearbyPartner.distance < 1
                            ? `${Math.round(nearbyPartner.distance * 1000)}m`
                            : `${nearbyPartner.distance.toFixed(1)}km`}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-1">{nearbyPartner.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <MapPin className="h-4 w-4" />
                        <span className="line-clamp-1">{nearbyPartner.location}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {nearbyPartner.category}
                      </Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reservation Modal */}
      <ReservationModal
        isOpen={isReservationModalOpen}
        onClose={() => setIsReservationModalOpen(false)}
        vendorId={partner.id.toString()}
        vendorName={partner.name}
        serviceName={partner.category}
        category={partner.category as any}
      />
    </>
  );
}

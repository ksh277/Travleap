import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { 
  Star, 
  MapPin, 
  Clock, 
  Users, 
  Share2, 
  Heart,
  Calendar as CalendarIcon,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Shield,
  Award,
  ShoppingCart
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { useCartStore } from '../hooks/useCartStore';
import { useAuthStore } from '../hooks/useAuthStore';

// Date formatting helper
const formatDate = (date: Date) => {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

interface DetailPageProps {
  onBooking?: (bookingData: any) => void;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  author: string;
  date: string;
  helpful: number;
}

export function DetailPage() {
  const { id: itemId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const { isLoggedIn, user } = useAuthStore();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [guests, setGuests] = useState(2);
  const [customGuestCount, setCustomGuestCount] = useState('');
  const [isCustomGuests, setIsCustomGuests] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingData, setBookingData] = useState({
    name: '',
    phone: '',
    email: '',
    requests: ''
  });

  useEffect(() => {
    if (itemId) {
      fetchItemDetails();
    }
  }, [itemId]);

  useEffect(() => {
    if (item?.id) {
      fetchReviews();
    }
  }, [item?.id]);

  const fetchItemDetails = async () => {
    setLoading(true);
    try {
      const response = await api.getListingById(Number(itemId));
      if (response.success && response.data) {
        setItem({
          id: response.data.id,
          title: response.data.title,
          description: response.data.description_md || response.data.short_description || '',
          shortDescription: response.data.short_description || '',
          price: response.data.price_from || 0,
          location: response.data.location || '신안군',
          duration: response.data.duration,
          category: response.data.category,
          rating: response.data.rating_avg || 0,
          reviewCount: response.data.rating_count || 0,
          images: Array.isArray(response.data.images) && response.data.images.length > 0
            ? response.data.images
            : [getDefaultImage(response.data.category)],
          isPartner: response.data.partner?.is_verified || false,
          isSponsor: response.data.partner?.tier === 'gold' || response.data.partner?.tier === 'platinum',
          partnerName: response.data.partner?.business_name || '신안관광협회',
          maxCapacity: response.data.max_capacity || 10,
          features: response.data.features || [],
          included: response.data.included_items || [],
          excluded: response.data.excluded_items || [],
          policies: response.data.policies || {}
        });
      } else {
        toast.error('상품 정보를 불러올 수 없습니다.');
        navigate(-1);
      }
    } catch (error) {
      console.error('Error fetching item details:', error);
      toast.error('상품 정보를 불러오는 중 오류가 발생했습니다.');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultImage = (category: string) => {
    const defaultImages: { [key: string]: string } = {
      tour: "https://images.unsplash.com/photo-1746427397703-ea04f0b59e14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      accommodation: "https://images.unsplash.com/photo-1712880437462-f1ef10364859?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      food: "https://images.unsplash.com/photo-1703925155035-fd10b9c19b24?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      rentcar: "https://images.unsplash.com/photo-1684082018938-9c30f2a7045d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      package: "https://images.unsplash.com/photo-1666507074532-ec7a461de551?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      event: "https://images.unsplash.com/photo-1506905760138-9e8f7f36bdd0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      attraction: "https://images.unsplash.com/photo-1746427397703-ea04f0b59e14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      experience: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
    };
    return defaultImages[category] || defaultImages.tour;
  };

  const fetchReviews = async () => {
    try {
      const response = await api.getReviews(Number(item.id));
      if (Array.isArray(response)) {
        const formattedReviews = response.map((review: any) => ({
          id: review.id.toString(),
          rating: review.rating,
          comment: review.comment,
          author: review.user?.name || '익명',
          date: review.created_at,
          helpful: review.helpful_count || 0
        }));
        setReviews(formattedReviews);
      } else {
        // DB에 리뷰가 없으면 샘플 리뷰 생성
        const sampleReviews: Review[] = Array.from({ length: 5 }, (_, i) => ({
          id: `review_${i + 1}`,
          rating: 4 + Math.random(),
          comment: `정말 좋은 경험이었습니다. ${item.title}은(는) 기대 이상이었어요. 다음에도 이용하고 싶습니다.`,
          author: `사용자${i + 1}`,
          date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          helpful: Math.floor(Math.random() * 20)
        }));
        setReviews(sampleReviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
    }
  };

  const handleBooking = async () => {
    if (!selectedDate || !bookingData.name || !bookingData.phone) {
      toast.error('필수 정보를 모두 입력해주세요.');
      return;
    }

    const bookingRequest = {
      listing_id: Number(item.id),
      user_id: Number(user?.id) || 1, // 실제 로그인된 사용자 ID 사용
      start_date: selectedDate.toISOString().split('T')[0],
      end_date: selectedDate.toISOString().split('T')[0], // 당일 예약
      num_adults: guests,
      num_children: 0,
      num_seniors: 0,
      customer_info: bookingData,
      special_requests: bookingData.requests || ''
    };

    try {
      const response = await api.createBooking(bookingRequest);
      if (response.success && response.data) {
        toast.success(`예약이 성공적으로 접수되었습니다! 결제 페이지로 이동합니다.`);

        // 예약 확정 후 결제 페이지로 이동
        const paymentData = {
          bookingId: response.data.id,
          itemId: item.id,
          itemTitle: item.title,
          selectedDate: selectedDate.toISOString().split('T')[0],
          guests: guests,
          totalAmount: (item.price || 0) * guests,
          customerInfo: bookingData
        };

        // 결제 페이지로 이동 (URL params로 데이터 전달)
        navigate(`/payment?bookingId=${response.data.id}&amount=${(item.price || 0) * guests}&title=${encodeURIComponent(item.title)}`);
      } else {
        toast.error(response.error || '예약 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('예약 처리 중 오류가 발생했습니다.');
    }
  };

  const handleReviewSubmit = async () => {
    if (!newReview.comment.trim()) {
      toast.error('리뷰 내용을 입력해주세요.');
      return;
    }

    // Note: Authentication check removed - implement if needed

    const reviewData = {
      listing_id: Number(item.id),
      user_id: 1, // Replace with actual user ID
      rating: newReview.rating,
      title: '리뷰 제목',
      content: newReview.comment
    };

    try {
      const response = await api.createReview(reviewData);
      if (response.success) {
        toast.success('리뷰가 성공적으로 등록되었습니다.');
        setNewReview({ rating: 5, comment: '' });
        fetchReviews();
      } else {
        toast.error(response.error || '리뷰 등록 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('리뷰 등록 중 오류가 발생했습니다.');
    }
  };

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : (item?.rating || 4.5);

  // 로딩 상태 처리
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>상품 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 아이템 ID가 없는 경우
  if (!itemId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl mb-4">상품 ID를 찾을 수 없습니다</h2>
          <Button onClick={() => navigate('/')}>홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  // 아이템이 없는 경우
  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl mb-4">상품을 찾을 수 없습니다</h2>
          <Button onClick={() => navigate(-1)}>뒤로가기</Button>
        </div>
      </div>
    );
  }

  const images = item.images || [getDefaultImage(item.category)];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          뒤로가기
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <Card className="overflow-hidden">
              <div className="relative">
                <ImageWithFallback
                  src={images[currentImageIndex]}
                  alt={item.title}
                  className="w-full h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                
                {/* Navigation buttons */}
                {images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
                      onClick={() => setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
                      onClick={() => setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {/* Badges */}
                <div className="absolute top-4 left-4 flex gap-2">
                  {item.isPartner && (
                    <Badge className="bg-blue-500 text-white">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {item.isSponsor && (
                    <Badge className="bg-yellow-500 text-black">
                      <Award className="h-3 w-3 mr-1" />
                      스폰서
                    </Badge>
                  )}
                </div>

                {/* Action buttons */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button size="icon" variant="ghost" className="bg-white/80 hover:bg-white">
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="bg-white/80 hover:bg-white">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Image indicators */}
                {images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Title and basic info */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl mb-2">{item.title}</h1>
                  <div className="flex items-center space-x-4 text-gray-600">
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{item.location}</span>
                    </div>
                    {item.duration && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{item.duration}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{averageRating.toFixed(1)}</span>
                      <span className="text-gray-400">({reviews.length}개 리뷰)</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">부터</div>
                  <div className="text-3xl text-blue-600">{(item.price || 0).toLocaleString()}원</div>
                  <div className="text-sm text-gray-500">/ 1인</div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="description">소개</TabsTrigger>
                <TabsTrigger value="details">포함/불포함</TabsTrigger>
                <TabsTrigger value="location">위치</TabsTrigger>
                <TabsTrigger value="policy">취소정책</TabsTrigger>
                <TabsTrigger value="reviews">리뷰 ({reviews.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="description" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>상품 소개</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="mt-6 space-y-4">
                      <div>
                        <h4 className="text-lg mb-2">특징</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                          {item.features && item.features.length > 0 ? (
                            item.features.map((feature: string, index: number) => (
                              <li key={index}>{feature}</li>
                            ))
                          ) : (
                            <>
                              <li>전문 가이드와 함께하는 안전한 투어</li>
                              <li>소규룹으로 진행되는 프리미엄 서비스</li>
                              <li>현지 맛집 및 명소 추천</li>
                              <li>기념품 증정</li>
                            </>
                          )}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-green-600 flex items-center">
                        <Check className="h-5 w-5 mr-2" />
                        포함사항
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-gray-700">
                        {item.included && item.included.length > 0 ? (
                          item.included.map((includedItem: string, index: number) => (
                            <li key={index} className="flex items-center">
                              <Check className="h-4 w-4 text-green-500 mr-2" />
                              {includedItem}
                            </li>
                          ))
                        ) : (
                          <>
                            <li className="flex items-center">
                              <Check className="h-4 w-4 text-green-500 mr-2" />
                              전문 가이드
                            </li>
                            <li className="flex items-center">
                              <Check className="h-4 w-4 text-green-500 mr-2" />
                              이동 차량
                            </li>
                            <li className="flex items-center">
                              <Check className="h-4 w-4 text-green-500 mr-2" />
                              입장료
                            </li>
                            <li className="flex items-center">
                              <Check className="h-4 w-4 text-green-500 mr-2" />
                              기념품
                            </li>
                          </>
                        )}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-600 flex items-center">
                        <X className="h-5 w-5 mr-2" />
                        불포함사항
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-gray-700">
                        {item.excluded && item.excluded.length > 0 ? (
                          item.excluded.map((excludedItem: string, index: number) => (
                            <li key={index} className="flex items-center">
                              <X className="h-4 w-4 text-red-500 mr-2" />
                              {excludedItem}
                            </li>
                          ))
                        ) : (
                          <>
                            <li className="flex items-center">
                              <X className="h-4 w-4 text-red-500 mr-2" />
                              개인 식사비
                            </li>
                            <li className="flex items-center">
                              <X className="h-4 w-4 text-red-500 mr-2" />
                              개인 용품
                            </li>
                            <li className="flex items-center">
                              <X className="h-4 w-4 text-red-500 mr-2" />
                              여행자 보험
                            </li>
                            <li className="flex items-center">
                              <X className="h-4 w-4 text-red-500 mr-2" />
                              추가 액티비티
                            </li>
                          </>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="location" className="space-y-6">
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
                        <h4 className="mb-2">주소</h4>
                        <p className="text-gray-700">{item.location}</p>
                      </div>
                      
                      {/* 구글 지도 */}
                      <div className="w-full">
                        <div className="w-full h-[800px] bg-gray-200 rounded-lg overflow-hidden">
                          <iframe
                            src={`https://www.google.com/maps/embed/v1/place?key=${process.env.GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(item.location)}&zoom=15`}
                            className="w-full h-full border-0"
                            style={{ minWidth: '220%', transform: 'scale(0.45)', transformOrigin: 'top left' }}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="위치 지도"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="mb-2">교통편</h4>
                        <ul className="space-y-1 text-gray-700">
                          <li>• 대중교통: 신안군청에서 버스 이용 (약 30분)</li>
                          <li>• 자가용: 신안대교 경유 (주차장 완비)</li>
                          <li>• 페리: 목포항에서 출발 (1일 3회 운항)</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="mb-2">주변 명소</h4>
                        <ul className="space-y-1 text-gray-700">
                          <li>• 퍼플섬 (도보 10분)</li>
                          <li>• 신안 염전 (차량 5분)</li>
                          <li>• 천사대교 (차량 15분)</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="policy" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>취소 및 환불 정책</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="mb-2">취소 수수료</h4>
                      <ul className="space-y-1 text-gray-700">
                        <li>• 3일 전: 무료 취소</li>
                        <li>• 1-2일 전: 50% 환불</li>
                        <li>• 당일: 환불 불가</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="mb-2">주의사항</h4>
                      <ul className="space-y-1 text-gray-700">
                        <li>• 악천후 시 일정 변경 가능</li>
                        <li>• 최소 출발 인원 미달 시 취소 가능</li>
                        <li>• 안전상의 이유로 참여 제한 가능</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="space-y-6">
                {/* Review Summary */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-6">
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

                {/* Review List */}
                <div className="space-y-4">
                  {reviews.map(review => (
                    <Card key={review.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <span>{review.author}</span>
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`h-3 w-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDate(new Date(review.date))}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="text-gray-500">
                            도움됨 {review.helpful}
                          </Button>
                        </div>
                        <p className="text-gray-700">{review.comment}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

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
                    <Button onClick={handleReviewSubmit} className="w-full">
                      리뷰 등록
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <Card>
                <CardHeader>
                  <CardTitle>예약하기</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!showBookingForm ? (
                    <>
                      <div>
                        <label className="block text-sm mb-2">날짜 선택</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedDate ? formatDate(selectedDate) : '날짜를 선택하세요'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={setSelectedDate}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <label className="block text-sm mb-2">인원</label>
                        <Select value={isCustomGuests ? 'custom' : guests.toString()} onValueChange={(value) => {
                          if (value === 'custom') {
                            setIsCustomGuests(true);
                            setCustomGuestCount('');
                          } else {
                            setIsCustomGuests(false);
                            setGuests(parseInt(value));
                            setCustomGuestCount('');
                          }
                        }}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {/* 1-20명 개별 선택 */}
                            {Array.from({length: 20}, (_, i) => i + 1).map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                {num}명
                              </SelectItem>
                            ))}
                            {/* 대규모 그룹 옵션 */}
                            {[25, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200, 300, 500].map(num => (
                              <SelectItem key={num} value={num.toString()}>
                                {num}명
                              </SelectItem>
                            ))}
                            {/* 직접 입력 옵션 */}
                            <SelectItem value="custom">
                              직접 입력 (500명 이상)
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {/* 커스텀 인원 입력 */}
                        {isCustomGuests && (
                          <div className="mt-2">
                            <Input
                              type="number"
                              min="1"
                              max="10000"
                              placeholder="인원수를 입력하세요"
                              value={customGuestCount}
                              onChange={(e) => {
                                const value = e.target.value;
                                setCustomGuestCount(value);
                                if (value && parseInt(value) > 0) {
                                  setGuests(parseInt(value));
                                }
                              }}
                              className="w-full"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              대규모 단체의 경우 별도 문의 바랍니다 (최대 10,000명)
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-2">
                          <span>상품 가격</span>
                          <span>{(item.price || 0).toLocaleString()}원 x {guests}명</span>
                        </div>
                        <div className="flex justify-between items-center mb-4 text-lg">
                          <span>총 금액</span>
                          <span className="text-blue-600">{((item.price || 0) * guests).toLocaleString()}원</span>
                        </div>
                      </div>

                      {/* 장바구니 추가 버튼 */}
                      <Button
                        variant="outline"
                        className="w-full"
                        size="lg"
                        onClick={() => {
                          if (!isLoggedIn) {
                            toast.error('로그인이 필요합니다');
                            navigate('/login');
                            return;
                          }

                          const cartItem = {
                            id: item.id,
                            title: item.title,
                            category: item.category || '여행',
                            price: item.price,
                            image: images[0],
                            location: item.location
                          };
                          addToCart(cartItem);
                          toast.success('장바구니에 추가되었습니다!');
                        }}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        장바구니 담기
                      </Button>

                      <Button
                        className="w-full"
                        size="lg"
                        onClick={() => {
                          if (!isLoggedIn) {
                            toast.error('로그인이 필요합니다');
                            navigate('/login');
                            return;
                          }
                          setShowBookingForm(true);
                        }}
                        disabled={!selectedDate}
                      >
                        예약하기
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm mb-2">이름 *</label>
                          <Input
                            value={bookingData.name}
                            onChange={(e) => setBookingData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="이름을 입력하세요"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">연락처 *</label>
                          <Input
                            value={bookingData.phone}
                            onChange={(e) => setBookingData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="연락처를 입력하세요"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">이메일</label>
                          <Input
                            type="email"
                            value={bookingData.email}
                            onChange={(e) => setBookingData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="이메일을 입력하세요"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">요청사항</label>
                          <Textarea
                            value={bookingData.requests}
                            onChange={(e) => setBookingData(prev => ({ ...prev, requests: e.target.value }))}
                            placeholder="특별한 요청사항이 있으시면 입력해주세요"
                            rows={3}
                          />
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <div className="text-sm text-gray-600 mb-4">
                          <div>날짜: {selectedDate && formatDate(selectedDate)}</div>
                          <div>인원: {guests}명</div>
                          <div>총 금액: {((item.price || 0) * guests).toLocaleString()}원</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Button 
                          className="w-full" 
                          size="lg"
                          onClick={handleBooking}
                        >
                          예약 확정
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => setShowBookingForm(false)}
                        >
                          뒤로가기
                        </Button>
                      </div>
                    </>
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
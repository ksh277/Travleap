import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  User,
  Calendar,
  Heart,
  MessageSquare,
  Settings,
  CreditCard,
  MapPin,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  Camera,
  Edit,
  Save,
  X,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../utils/api';
import { useAuthStore } from '../hooks/useAuthStore';

interface Booking {
  id: string;
  title: string;
  category: string;
  date: string;
  time: string;
  guests: number;
  price: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  image: string;
  location: string;
}

interface Favorite {
  id: string;
  title: string;
  category: string;
  price: number;
  rating: number;
  reviewCount: number;
  image: string;
  location: string;
}

interface Review {
  id: string;
  title: string;
  rating: number;
  comment: string;
  date: string;
  image: string;
  category: string;
}

// 가상 데이터
const mockBookings: Booking[] = [
  {
    id: '1',
    title: '신안 갯벌 투어',
    category: '투어',
    date: '2024-02-15',
    time: '09:00',
    guests: 2,
    price: 90000,
    status: 'confirmed',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=200&fit=crop',
    location: '증도면'
  },
  {
    id: '2',
    title: '바다뷰 민박',
    category: '숙박',
    date: '2024-02-20',
    time: '15:00',
    guests: 2,
    price: 130000,
    status: 'pending',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=300&h=200&fit=crop',
    location: '도초면'
  }
];

const mockFavorites: Favorite[] = [
  {
    id: '1',
    title: '신안 특산물 맛집',
    category: '음식',
    price: 25000,
    rating: 4.7,
    reviewCount: 234,
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&h=200&fit=crop',
    location: '비금면'
  },
  {
    id: '2',
    title: '해변 캠핑카',
    category: '캠핑카',
    price: 120000,
    rating: 4.5,
    reviewCount: 89,
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=200&fit=crop',
    location: '증도면'
  }
];

const mockReviews: Review[] = [
  {
    id: '1',
    title: '신안 갯벌 투어',
    rating: 5,
    comment: '정말 멋진 경험이었습니다! 갯벌의 신비로운 생태계를 체험할 수 있어서 좋았어요.',
    date: '2024-01-20',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=200&fit=crop',
    category: '투어'
  }
];

export function MyPage() {
  const navigate = useNavigate();
  const { user, logout, isLoggedIn } = useAuthStore();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    birthDate: '',
    bio: '',
    avatar: ''
  });
  const [editProfile, setEditProfile] = useState(userProfile);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setUserProfile({
        name: user.name,
        email: user.email,
        phone: '',
        birthDate: '',
        bio: '',
        avatar: ''
      });
      setEditProfile({
        name: user.name,
        email: user.email,
        phone: '',
        birthDate: '',
        bio: '',
        avatar: ''
      });
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // 병렬로 데이터 가져오기
      const [bookingsResponse, reviewsResponse] = await Promise.all([
        api.getBookings(Number(user.id)),
        api.getReviews(Number(user.id))
      ]);

      // 예약 내역 처리
      if (Array.isArray(bookingsResponse)) {
        const formattedBookings = bookingsResponse.map((booking: any) => ({
          id: booking.id.toString(),
          title: booking.listing?.title || '상품명 없음',
          category: booking.listing?.category || '카테고리 없음',
          date: booking.start_date || '',
          time: '시간 정보 없음',
          guests: booking.num_adults + booking.num_children + booking.num_seniors,
          price: booking.total_price || 0,
          status: booking.status === 'confirmed' ? 'confirmed' as const :
                  booking.status === 'cancelled' ? 'cancelled' as const : 'pending' as const,
          image: Array.isArray(booking.listing?.images) && booking.listing.images.length > 0
            ? booking.listing.images[0]
            : getDefaultImage(booking.listing?.category),
          location: booking.listing?.location || '위치 정보 없음'
        }));
        setBookings(formattedBookings);
      } else {
        setBookings([]);
      }

      // 리뷰 내역 처리
      if (Array.isArray(reviewsResponse)) {
        const formattedReviews = reviewsResponse.map((review: any) => ({
          id: review.id.toString(),
          title: review.listing?.title || '상품명 없음',
          rating: review.rating,
          comment: review.comment,
          date: review.created_at ? new Date(review.created_at).toLocaleDateString() : '',
          image: Array.isArray(review.listing?.images) && review.listing.images.length > 0
            ? review.listing.images[0]
            : getDefaultImage(review.listing?.category),
          category: review.listing?.category || '카테고리 없음'
        }));
        setReviews(formattedReviews);
      } else {
        setReviews([]);
      }

      // 찜한 상품은 아직 API가 없으므로 빈 배열로 설정
      setFavorites([]);

    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultImage = (category: string) => {
    const defaultImages: { [key: string]: string } = {
      tour: "https://images.unsplash.com/photo-1746427397703-ea04f0b59e14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=300",
      accommodation: "https://images.unsplash.com/photo-1712880437462-f1ef10364859?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=300",
      food: "https://images.unsplash.com/photo-1703925155035-fd10b9c19b24?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=300",
      rentcar: "https://images.unsplash.com/photo-1684082018938-9c30f2a7045d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=300",
      package: "https://images.unsplash.com/photo-1666507074532-ec7a461de551?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=300",
      event: "https://images.unsplash.com/photo-1506905760138-9e8f7f36bdd0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=300",
      attraction: "https://images.unsplash.com/photo-1746427397703-ea04f0b59e14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=300",
      experience: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=300"
    };
    return defaultImages[category] || defaultImages.tour;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />확정</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />대기</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />취소</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleSaveProfile = () => {
    setUserProfile(editProfile);
    setIsEditingProfile(false);
    toast.success('프로필이 업데이트되었습니다.');
  };

  const handleCancelEdit = () => {
    setEditProfile(userProfile);
    setIsEditingProfile(false);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  // 취소 수수료 계산 함수
  const calculateCancellationFee = (bookingDate: string, originalPrice: number) => {
    const today = new Date();
    const booking = new Date(bookingDate);
    const daysDifference = Math.ceil((booking.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDifference >= 3) {
      // 3일 전: 무료 취소
      return {
        refundAmount: originalPrice,
        cancellationFee: 0,
        refundRate: 100,
        description: '무료 취소'
      };
    } else if (daysDifference >= 1) {
      // 1-2일 전: 50% 환불
      const refundAmount = Math.floor(originalPrice * 0.5);
      const cancellationFee = originalPrice - refundAmount;
      return {
        refundAmount,
        cancellationFee,
        refundRate: 50,
        description: '50% 환불'
      };
    } else {
      // 당일: 환불 불가
      return {
        refundAmount: 0,
        cancellationFee: originalPrice,
        refundRate: 0,
        description: '환불 불가'
      };
    }
  };

  // 예약 취소 함수
  const handleCancelBooking = async (bookingId: string, bookingDate: string, originalPrice: number) => {
    const cancellationInfo = calculateCancellationFee(bookingDate, originalPrice);

    const confirmMessage = `정말로 예약을 취소하시겠습니까?\n\n취소 수수료: ${cancellationInfo.cancellationFee.toLocaleString()}원\n환불 금액: ${cancellationInfo.refundAmount.toLocaleString()}원 (${cancellationInfo.refundRate}%)\n\n취소하시려면 확인을 눌러주세요.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setCancellingBookingId(bookingId);
    try {
      const response = await api.cancelBooking(bookingId, {
        cancellationFee: cancellationInfo.cancellationFee,
        refundAmount: cancellationInfo.refundAmount,
        reason: '사용자 요청'
      });

      if (response.success) {
        // 예약 목록 새로고침
        await fetchUserData();
        toast.success(`예약이 취소되었습니다. ${cancellationInfo.refundAmount.toLocaleString()}원이 환불됩니다.`);
      } else {
        throw new Error(response.error || '취소 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('예약 취소 실패:', error);
      toast.error(error instanceof Error ? error.message : '예약 취소 중 오류가 발생했습니다.');
    } finally {
      setCancellingBookingId(null);
    }
  };

  // 로그인하지 않은 경우
  if (!isLoggedIn || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl mb-4">로그인이 필요합니다</h2>
          <Button onClick={() => navigate('/')}>홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">마이페이지</h1>
              <p className="text-gray-600">내 정보와 예약 내역을 관리하세요</p>
            </div>
            <Button onClick={() => navigate('/')} variant="outline">
              홈으로
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 프로필 카드 */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start space-x-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={userProfile.avatar} />
                  <AvatarFallback className="text-2xl">
                    {userProfile.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {isEditingProfile && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <div className="flex-1">
                {isEditingProfile ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">이름</label>
                        <Input
                          value={editProfile.name}
                          onChange={(e) => setEditProfile(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">전화번호</label>
                        <Input
                          value={editProfile.phone}
                          onChange={(e) => setEditProfile(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">자기소개</label>
                      <Textarea
                        value={editProfile.bio}
                        onChange={(e) => setEditProfile(prev => ({ ...prev, bio: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={handleSaveProfile} size="sm" className="bg-[#8B5FBF] hover:bg-[#7A4FB5]">
                        <Save className="w-4 h-4 mr-1" />
                        저장
                      </Button>
                      <Button onClick={handleCancelEdit} variant="outline" size="sm">
                        <X className="w-4 h-4 mr-1" />
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-2xl font-bold">{userProfile.name}</h2>
                      <Button
                        onClick={() => setIsEditingProfile(true)}
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        편집
                      </Button>
                    </div>
                    <p className="text-gray-600 mb-2">{userProfile.email}</p>
                    <p className="text-gray-600 mb-2">{userProfile.phone}</p>
                    <p className="text-gray-700">{userProfile.bio}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 탭 메뉴 */}
        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="bookings">예약 내역</TabsTrigger>
            <TabsTrigger value="favorites">찜한 상품</TabsTrigger>
            <TabsTrigger value="reviews">내 리뷰</TabsTrigger>
            <TabsTrigger value="settings">설정</TabsTrigger>
          </TabsList>

          {/* 예약 내역 탭 */}
          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  예약 내역
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2">예약 내역을 불러오는 중...</span>
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    예약 내역이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => {
                      const cancellationInfo = calculateCancellationFee(booking.date, booking.price);
                      const canCancel = booking.status === 'confirmed' || booking.status === 'pending';

                      return (
                        <div key={booking.id} className="border rounded-lg p-4">
                          <div className="flex space-x-4">
                            <img
                              src={booking.image}
                              alt={booking.title}
                              className="w-24 h-24 rounded-lg object-cover"
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-semibold text-lg">{booking.title}</h3>
                                  <div className="flex items-center text-gray-600 text-sm mt-1">
                                    <MapPin className="w-4 h-4 mr-1" />
                                    {booking.location}
                                  </div>
                                  <Badge variant="outline" className="mt-2">
                                    {booking.category}
                                  </Badge>
                                </div>
                                <div className="text-right">
                                  {getStatusBadge(booking.status)}
                                  {canCancel && (
                                    <div className="mt-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCancelBooking(booking.id, booking.date, booking.price)}
                                        disabled={cancellingBookingId === booking.id}
                                        className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                                      >
                                        {cancellingBookingId === booking.id ? (
                                          <>
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></div>
                                            취소 중...
                                          </>
                                        ) : (
                                          <>
                                            <XCircle className="w-3 h-3 mr-1" />
                                            취소
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">날짜:</span> {booking.date}
                                </div>
                                <div>
                                  <span className="text-gray-600">시간:</span> {booking.time}
                                </div>
                                <div>
                                  <span className="text-gray-600">인원:</span> {booking.guests}명
                                </div>
                                <div>
                                  <span className="text-gray-600">금액:</span> ₩{booking.price.toLocaleString()}
                                </div>
                              </div>

                              {/* 취소 수수료 정보 표시 */}
                              {canCancel && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                                    <span className="text-sm font-medium text-gray-700">취소 정책</span>
                                  </div>
                                  <div className="text-xs text-gray-600 space-y-1">
                                    <div className="flex justify-between">
                                      <span>현재 취소 시:</span>
                                      <span className="font-medium">{cancellationInfo.description}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>환불 금액:</span>
                                      <span className="font-medium text-green-600">
                                        ₩{cancellationInfo.refundAmount.toLocaleString()}
                                      </span>
                                    </div>
                                    {cancellationInfo.cancellationFee > 0 && (
                                      <div className="flex justify-between">
                                        <span>취소 수수료:</span>
                                        <span className="font-medium text-red-600">
                                          ₩{cancellationInfo.cancellationFee.toLocaleString()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                                    <div>• 3일 전: 무료 취소</div>
                                    <div>• 1-2일 전: 50% 환불</div>
                                    <div>• 당일: 환불 불가</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 찜한 상품 탭 */}
          <TabsContent value="favorites" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="w-5 h-5 mr-2" />
                  찜한 상품
                </CardTitle>
              </CardHeader>
              <CardContent>
                {favorites.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    찜한 상품이 없습니다.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {favorites.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex space-x-4">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.title}</h3>
                          <div className="flex items-center text-gray-600 text-sm mt-1">
                            <MapPin className="w-3 h-3 mr-1" />
                            {item.location}
                          </div>
                          <div className="flex items-center mt-2">
                            <div className="flex items-center">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1" />
                              <span className="text-sm">{item.rating}</span>
                            </div>
                            <span className="text-sm text-gray-500 ml-2">({item.reviewCount})</span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <Badge variant="outline">{item.category}</Badge>
                            <div className="font-semibold text-[#ff6a3d]">
                              ₩{item.price.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 내 리뷰 탭 */}
          <TabsContent value="reviews" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  내 리뷰
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    작성한 리뷰가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                    <div key={review.id} className="border rounded-lg p-4">
                      <div className="flex space-x-4">
                        <img
                          src={review.image}
                          alt={review.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{review.title}</h3>
                            <span className="text-sm text-gray-500">{review.date}</span>
                          </div>
                          <div className="flex items-center mt-1">
                            {renderStars(review.rating)}
                            <Badge variant="outline" className="ml-2">
                              {review.category}
                            </Badge>
                          </div>
                          <p className="mt-2 text-gray-700">{review.comment}</p>
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 설정 탭 */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  설정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 언어 설정 */}
                <div>
                  <label className="text-sm font-medium mb-2 block">언어 설정</label>
                  <Select value="ko" onValueChange={() => {}}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ko">한국어</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ja">日本語</SelectItem>
                      <SelectItem value="zh">中文</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 통화 설정 */}
                <div>
                  <label className="text-sm font-medium mb-2 block">통화 설정</label>
                  <Select value="KRW" onValueChange={() => {}}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KRW">₩ 원 (KRW)</SelectItem>
                      <SelectItem value="USD">$ 달러 (USD)</SelectItem>
                      <SelectItem value="JPY">¥ 엔 (JPY)</SelectItem>
                      <SelectItem value="CNY">¥ 위안 (CNY)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 알림 설정 */}
                <div>
                  <label className="text-sm font-medium mb-2 block">알림 설정</label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span>예약 확인 알림</span>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span>마케팅 정보 수신</span>
                      <input type="checkbox" className="rounded" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span>이벤트 정보 수신</span>
                      <input type="checkbox" className="rounded" />
                    </div>
                  </div>
                </div>

                {/* 계정 관리 */}
                <div>
                  <label className="text-sm font-medium mb-2 block">계정 관리</label>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <CreditCard className="w-4 h-4 mr-2" />
                      결제 수단 관리
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <User className="w-4 h-4 mr-2" />
                      비밀번호 변경
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                      <XCircle className="w-4 h-4 mr-2" />
                      계정 탈퇴
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
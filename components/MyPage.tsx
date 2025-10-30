import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
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
  AlertTriangle,
  Loader2,
  RefreshCcw,
  Trash2,
  Eye,
  EyeOff,
  Receipt,
  Coins,
  Ticket,
  Key
} from 'lucide-react';
import { toast } from 'sonner';
import { api, type TravelItem } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { AddressSearchModal } from './AddressSearchModal';
import { PaymentHistoryCard } from './PaymentHistoryCard';

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

// Favorite는 TravelItem으로 통일
type FavoriteItem = TravelItem;

interface Review {
  id: string;
  title: string;
  rating: number;
  comment: string;
  date: string;
  image: string;
  category: string;
}

interface PaymentHistory {
  id: number;
  booking_id: number | null;
  order_id: number | null;
  order_id_str: string;
  payment_key: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  approved_at: string;
  receipt_url: string | null;
  card_company: string | null;
  card_number: string | null;
  created_at: string;
  booking_number: string | null;
  listing_id: number | null;
  listing_title: string | null;
  category: string | null;
  images: string[] | null;
  notes: string | null;
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

// mockFavorites 제거 - DB에서 실시간으로 가져옴

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
  const { user, logout, isLoggedIn } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [pointHistory, setPointHistory] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [userProfile, setUserProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    birthDate: '',
    bio: '',
    avatar: '',
    postalCode: '',
    address: '',
    detailAddress: ''
  });
  const [editProfile, setEditProfile] = useState(userProfile);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 설정 상태
  const [settings, setSettings] = useState({
    language: 'ko',
    currency: 'KRW',
    notifications: {
      booking: true,
      marketing: false,
      events: false
    }
  });


  // 계정 탈퇴 다이얼로그
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 설정 불러오기
  useEffect(() => {
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('설정 불러오기 오류:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      // 프로필 정보 불러오기 (API에서)
      fetchUserProfile();
      fetchUserData();
      fetchPayments();
      fetchPoints();
      fetchCoupons();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-user-id': user.id.toString()
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const profile = {
            name: data.user.name || '',
            email: data.user.email || '',
            phone: data.user.phone || '',
            birthDate: '',
            bio: '',
            avatar: '',
            postalCode: data.user.postalCode || '',
            address: data.user.address || '',
            detailAddress: data.user.detailAddress || ''
          };

          // localStorage에서 bio, avatar, birthDate 가져오기 (아직 DB에 없는 필드)
          const savedProfile = localStorage.getItem(`userProfile_${user.id}`);
          if (savedProfile) {
            try {
              const localProfile = JSON.parse(savedProfile);
              profile.bio = localProfile.bio || '';
              profile.avatar = localProfile.avatar || '';
              profile.birthDate = localProfile.birthDate || '';
            } catch (error) {
              console.error('localStorage 프로필 파싱 오류:', error);
            }
          }

          setUserProfile(profile);
          setEditProfile(profile);
        }
      }
    } catch (error) {
      console.error('프로필 불러오기 오류:', error);
    }
  };

  const fetchUserData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // 병렬로 데이터 가져오기
      const [bookingsResponse, favoriteIdsResponse, reviewsResponse] = await Promise.all([
        api.getBookings(Number(user.id)),
        api.getFavorites(Number(user.id)),
        api.getUserReviews(Number(user.id))
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
          price: booking.total_amount || 0,
          status: booking.status === 'confirmed' ? 'confirmed' as const :
                  booking.status === 'cancelled' ? 'cancelled' as const : 'pending' as const,
          image: Array.isArray(booking.listing?.images) && booking.listing.images.length > 0
            ? booking.listing.images[0]
            : getDefaultImage(booking.listing?.category),
          location: booking.listing?.location || '위치 정보 없음',
          // ✅ 배송 정보 추가 (팝업 상품용)
          delivery_status: booking.delivery_status,
          tracking_number: booking.tracking_number,
          courier_company: booking.courier_company,
          shipping_name: booking.shipping_name,
          shipping_phone: booking.shipping_phone,
          shipping_address: booking.shipping_address,
          shipping_address_detail: booking.shipping_address_detail,
          shipping_zipcode: booking.shipping_zipcode,
          shipped_at: booking.shipped_at,
          delivered_at: booking.delivered_at
        }));
        setBookings(formattedBookings);
      } else {
        setBookings([]);
      }

      // 리뷰 처리
      if (Array.isArray(reviewsResponse)) {
        setReviews(reviewsResponse);
      } else {
        setReviews([]);
      }

      // 찜한 상품 ID 저장
      if (Array.isArray(favoriteIdsResponse)) {
        setFavoriteIds(favoriteIdsResponse);
        // 찜한 상품 상세 정보 가져오기
        if (favoriteIdsResponse.length > 0) {
          fetchFavoriteDetails(favoriteIdsResponse);
        } else {
          setFavorites([]);
        }
      } else {
        setFavoriteIds([]);
        setFavorites([]);
      }

      // 리뷰는 나중에 별도로 불러오기
      fetchUserReviews();

    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 찜한 상품 상세 정보 가져오기
  const fetchFavoriteDetails = async (ids: number[]) => {
    setFavoritesLoading(true);
    try {
      const favoriteDetails = await Promise.all(
        ids.map(id => api.getListing(id))
      );
      const validFavorites = favoriteDetails.filter((item): item is TravelItem => item !== null);
      setFavorites(validFavorites);
    } catch (error) {
      console.error('찜한 상품 불러오기 오류:', error);
    } finally {
      setFavoritesLoading(false);
    }
  };

  // 사용자 리뷰 가져오기
  const fetchUserReviews = async () => {
    if (!user) return;

    try {
      // 모든 예약에서 리뷰 가져오기
      const bookingsResponse = await api.getBookings(Number(user.id));

      if (Array.isArray(bookingsResponse)) {
        const reviewPromises = bookingsResponse
          .filter((b: any) => b.listing_id)
          .map((b: any) => api.getReviews(b.listing_id));

        const allReviews = await Promise.all(reviewPromises);
        const userReviews = allReviews
          .flat()
          .filter((review: any) => review.user_id === user.id)
          .map((review: any) => ({
            id: review.id.toString(),
            title: review.listing?.title || '상품명 없음',
            rating: review.rating,
            comment: review.comment || review.content,
            date: review.created_at ? new Date(review.created_at).toLocaleDateString() : '',
            image: Array.isArray(review.listing?.images) && review.listing.images.length > 0
              ? review.listing.images[0]
              : getDefaultImage(review.listing?.category),
            category: review.listing?.category || '카테고리 없음'
          }));

        setReviews(userReviews);
      }
    } catch (error) {
      console.error('리뷰 불러오기 오류:', error);
      setReviews([]);
    }
  };

  // 사용자 결제 내역 가져오기
  const fetchPayments = async () => {
    if (!user) return;

    setPaymentsLoading(true);
    try {
      const response = await fetch('/api/user/payments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-user-id': user.id.toString()
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPayments(data.data || []);
          console.log('✅ [결제 내역] 로드 완료:', data.data.length, '개');
        } else {
          throw new Error(data.message || '결제 내역 조회 실패');
        }
      } else {
        throw new Error('결제 내역 조회 요청 실패');
      }
    } catch (error) {
      console.error('결제 내역 불러오기 오류:', error);
      toast.error('결제 내역을 불러오는 중 오류가 발생했습니다.');
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  };

  // 환불 처리 함수
  const handleRefund = async (paymentKey: string, reason: string) => {
    try {
      const response = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentKey, cancelReason: reason })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('환불이 완료되었습니다.');
        fetchPayments();
      } else {
        throw new Error(data.message || '환불 처리에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('환불 실패:', error);
      throw error;
    }
  };

  // 결제 내역 삭제 함수 (사용자 화면에서만 숨김)
  const handleDeletePayment = async (paymentId: number) => {
    try {
      const response = await fetch('/api/payments/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-user-id': user?.id.toString() || ''
        },
        body: JSON.stringify({ paymentId })
      });

      const data = await response.json();
      if (data.success) {
        // 성공 시 목록 새로고침
        fetchPayments();
      } else {
        throw new Error(data.message || '삭제에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('결제 내역 삭제 실패:', error);
      throw error;
    }
  };

  // 사용자 포인트 내역 가져오기
  const fetchPoints = async () => {
    if (!user) return;

    setPointsLoading(true);
    try {
      const response = await fetch('/api/user/points', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-user-id': user.id.toString()
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTotalPoints(data.data.totalPoints || 0);
          setPointHistory(data.data.history || []);
          console.log('✅ [포인트] 로드 완료:', data.data.totalPoints, 'P');
        } else {
          throw new Error(data.message || '포인트 내역 조회 실패');
        }
      } else {
        throw new Error('포인트 내역 조회 요청 실패');
      }
    } catch (error) {
      console.error('포인트 내역 불러오기 오류:', error);
      toast.error('포인트 내역을 불러오는 중 오류가 발생했습니다.');
      setTotalPoints(0);
      setPointHistory([]);
    } finally {
      setPointsLoading(false);
    }
  };

  // 사용자 쿠폰 가져오기
  const fetchCoupons = async () => {
    if (!user) return;

    setCouponsLoading(true);
    try {
      const response = await fetch(`/api/coupons?userId=${user.id}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCoupons(data.data || []);
          console.log('✅ [쿠폰] 로드 완료:', data.data?.length || 0, '개');
        } else {
          throw new Error(data.message || '쿠폰 조회 실패');
        }
      } else {
        throw new Error('쿠폰 조회 요청 실패');
      }
    } catch (error) {
      console.error('쿠폰 불러오기 오류:', error);
      setCoupons([]);
    } finally {
      setCouponsLoading(false);
    }
  };

  // 쿠폰 등록
  const handleRegisterCoupon = async () => {
    if (!user) return;

    if (!couponCode.trim()) {
      toast.error('쿠폰 코드를 입력해주세요');
      return;
    }

    setCouponsLoading(true);
    try {
      const response = await fetch('/api/coupons/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({
          code: couponCode.toUpperCase(),
          userId: user.id
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || '쿠폰이 등록되었습니다');
        setCouponCode(''); // 입력 필드 초기화
        fetchCoupons(); // 쿠폰 목록 새로고침
      } else {
        toast.error(data.message || '쿠폰 등록에 실패했습니다');
      }
    } catch (error) {
      console.error('쿠폰 등록 오류:', error);
      toast.error('쿠폰 등록 중 오류가 발생했습니다');
    } finally {
      setCouponsLoading(false);
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

  // 주소 선택 핸들러 (마이페이지용 - 입력 필드만 업데이트)
  const handleAddressSelect = (addressData: {
    postalCode: string;
    address: string;
    detailAddress: string;
  }) => {
    setEditProfile(prev => ({
      ...prev,
      postalCode: addressData.postalCode,
      address: addressData.address,
      detailAddress: addressData.detailAddress
    }));
  };

  // 프로필 저장
  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      // 프로필 정보 저장 (이름, 전화번호, 주소 모두 포함)
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({
          name: editProfile.name,
          phone: editProfile.phone,
          postalCode: editProfile.postalCode || '',
          address: editProfile.address || '',
          detailAddress: editProfile.detailAddress || ''
        })
      });

      const result = await response.json();

      if (result.success) {
        // localStorage에도 저장 (백업)
        localStorage.setItem(`userProfile_${user.id}`, JSON.stringify(editProfile));

        setUserProfile(editProfile);
        setIsEditingProfile(false);
        toast.success('프로필이 업데이트되었습니다.');
      } else {
        throw new Error(result.error || '프로필 저장 실패');
      }
    } catch (error) {
      console.error('프로필 저장 오류:', error);
      toast.error(error instanceof Error ? error.message : '프로필 저장에 실패했습니다.');
    }
  };

  const handleCancelEdit = () => {
    setEditProfile(userProfile);
    setIsEditingProfile(false);
  };

  // 비밀번호 변경
  const handleChangePassword = async () => {
    if (!user) return;

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('모든 항목을 입력해주세요.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('새 비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('비밀번호가 변경되었습니다.');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setIsChangingPassword(false);
      } else {
        toast.error(result.error || '비밀번호 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('비밀번호 변경 오류:', error);
      toast.error(error instanceof Error ? error.message : '비밀번호 변경에 실패했습니다.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // 찜하기 토글
  const toggleFavorite = useCallback(async (listingId: number) => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    const isFavorited = favoriteIds.includes(listingId);

    try {
      if (isFavorited) {
        // 찜 해제
        const success = await api.removeFavorite(listingId, user.id);
        if (success) {
          setFavoriteIds(prev => prev.filter(id => id !== listingId));
          setFavorites(prev => prev.filter(item => item.id !== listingId));
          toast.success('찜 목록에서 제거되었습니다.');
        } else {
          throw new Error('찜 해제 실패');
        }
      } else {
        // 찜 추가
        const success = await api.addFavorite(listingId, user.id);
        if (success) {
          setFavoriteIds(prev => [...prev, listingId]);
          // 상품 정보 가져오기
          const listing = await api.getListing(listingId);
          if (listing) {
            setFavorites(prev => [...prev, listing]);
          }
          toast.success('찜 목록에 추가되었습니다.');
        } else {
          throw new Error('찜 추가 실패');
        }
      }
    } catch (error) {
      console.error('찜하기 토글 오류:', error);
      toast.error('오류가 발생했습니다.');
    }
  }, [user, favoriteIds]);

  // 설정 저장
  const handleSaveSettings = (newSettings: typeof settings) => {
    try {
      localStorage.setItem('userSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
      toast.success('설정이 저장되었습니다.');
    } catch (error) {
      console.error('설정 저장 오류:', error);
      toast.error('설정 저장에 실패했습니다.');
    }
  };


  // 계정 탈퇴
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== '계정삭제') {
      toast.error('"계정삭제"를 정확히 입력해주세요.');
      return;
    }

    if (!window.confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setDeleteLoading(true);
    try {
      // TODO: 실제 API 호출로 변경
      await new Promise(resolve => setTimeout(resolve, 1000)); // 시뮬레이션

      logout();
      toast.success('계정이 삭제되었습니다.');
      navigate('/');
    } catch (error) {
      console.error('계정 삭제 오류:', error);
      toast.error('계정 삭제에 실패했습니다.');
    } finally {
      setDeleteLoading(false);
      setShowDeleteDialog(false);
    }
  };

  // 리뷰 삭제
  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('리뷰를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await api.admin.deleteReview(Number(reviewId));
      if (response.success) {
        toast.success('리뷰가 삭제되었습니다.');
        // 리뷰 목록에서 제거
        setReviews(prev => prev.filter(review => review.id !== reviewId));
      } else {
        toast.error(response.error || '리뷰 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('리뷰 삭제 오류:', error);
      toast.error('리뷰 삭제 중 오류가 발생했습니다.');
    }
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

  // 예약 취소 함수
  const handleCancelBooking = async (bookingId: string, bookingDate: string, originalPrice: number) => {
    // ✅ 환불 정책은 백엔드 DB에서 계산하도록 변경
    // 사용자에게는 환불 정책 확인 후 진행하도록 안내
    const confirmMessage = `정말로 예약을 취소하시겠습니까?\n\n예약일: ${new Date(bookingDate).toLocaleDateString('ko-KR')}\n결제 금액: ${originalPrice.toLocaleString()}원\n\n⚠️ 환불 금액은 환불 정책에 따라 자동 계산됩니다.\n취소 시점에 따라 취소 수수료가 부과될 수 있습니다.\n\n계속하시려면 확인을 눌러주세요.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setCancellingBookingId(bookingId);
    try {
      // ✅ 더미 데이터 제거, 백엔드에서 모두 계산
      const response = await api.cancelBooking(bookingId.toString(), {
        cancellationFee: 0, // 백엔드에서 계산
        refundAmount: 0, // 백엔드에서 계산
        reason: '사용자 요청'
      });

      if (response.success) {
        // 예약 목록 새로고침
        await fetchUserData();

        // ✅ 백엔드에서 반환한 실제 환불 금액 표시
        const refundedBooking = response.data;
        const actualRefundAmount = refundedBooking?.refund_amount || 0;

        toast.success(`예약이 취소되었습니다. ${actualRefundAmount.toLocaleString()}원이 환불됩니다.`);
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
    <div className="min-h-screen bg-gray-50 mobile-safe-bottom">
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
                        <label className="text-sm font-medium mb-1 block">이메일</label>
                        <Input
                          value={editProfile.email}
                          readOnly
                          disabled
                          className="bg-gray-100"
                        />
                        <p className="text-xs text-gray-500 mt-1">이메일은 변경할 수 없습니다</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">전화번호</label>
                        <Input
                          value={editProfile.phone}
                          onChange={(e) => setEditProfile(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="010-0000-0000"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        배송지 주소
                      </label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={editProfile.postalCode}
                            readOnly
                            placeholder="우편번호"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            onClick={() => setIsAddressModalOpen(true)}
                            variant="outline"
                            size="sm"
                            className="whitespace-nowrap"
                          >
                            주소 검색
                          </Button>
                        </div>
                        <Input
                          value={editProfile.address}
                          readOnly
                          placeholder="주소"
                        />
                        <Input
                          value={editProfile.detailAddress}
                          onChange={(e) => setEditProfile(prev => ({
                            ...prev,
                            detailAddress: e.target.value
                          }))}
                          placeholder="상세주소"
                          maxLength={200}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={handleSaveProfile} size="sm" className="bg-[#8B5FBF] hover:bg-[#7A4FB5]">
                        <Save className="w-4 h-4 mr-1" />
                        저장
                      </Button>
                      <Button onClick={handleCancelEdit} variant="outline" size="sm">
                        <X className="w-4 h-4 mr-1" />
                        취소
                      </Button>
                      <Button
                        onClick={() => setIsChangingPassword(true)}
                        variant="outline"
                        size="sm"
                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                      >
                        <Key className="w-4 h-4 mr-1" />
                        비밀번호 변경
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
                        개인정보수정
                      </Button>
                    </div>
                    <p className="text-gray-600 mb-2">{userProfile.email}</p>
                    <p className="text-gray-600 mb-2">{userProfile.phone}</p>
                    {userProfile.address && (
                      <p className="text-gray-600 mb-2 flex items-start gap-1">
                        <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                        <span>
                          ({userProfile.postalCode}) {userProfile.address} {userProfile.detailAddress}
                        </span>
                      </p>
                    )}
                    <p className="text-gray-700">{userProfile.bio}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 주소 검색 모달 */}
        <AddressSearchModal
          isOpen={isAddressModalOpen}
          onClose={() => setIsAddressModalOpen(false)}
          onAddressSelected={handleAddressSelect}
          initialAddress={{
            postalCode: editProfile.postalCode,
            address: editProfile.address,
            detailAddress: editProfile.detailAddress
          }}
        />

        {/* 비밀번호 변경 Dialog */}
        <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>비밀번호 변경</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">현재 비밀번호</label>
                <Input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="현재 비밀번호를 입력하세요"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">새 비밀번호</label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="새 비밀번호 (최소 6자)"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">새 비밀번호 확인</label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="새 비밀번호를 다시 입력하세요"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                variant="outline"
                disabled={passwordLoading}
              >
                취소
              </Button>
              <Button
                onClick={handleChangePassword}
                className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    변경 중...
                  </>
                ) : (
                  '변경'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 탭 메뉴 - 모바일 최적화 */}
        <Tabs defaultValue="payments" className="space-y-6">
          <TabsList className="grid grid-cols-4 sm:grid-cols-6 w-full max-w-5xl gap-2">
            <TabsTrigger value="payments" className="text-xs sm:text-sm min-h-[44px] sm:min-h-[36px]">
              <Receipt className="w-4 h-4 sm:hidden mr-2" />
              <span className="hidden sm:inline">결제 내역</span>
              <span className="sm:hidden">결제</span>
            </TabsTrigger>
            <TabsTrigger value="points" className="text-xs sm:text-sm min-h-[44px] sm:min-h-[36px]">
              <Coins className="w-4 h-4 sm:hidden mr-2" />
              <span className="hidden sm:inline">포인트</span>
              <span className="sm:hidden">포인트</span>
            </TabsTrigger>
            <TabsTrigger value="coupons" className="text-xs sm:text-sm min-h-[44px] sm:min-h-[36px]">
              <Ticket className="w-4 h-4 sm:hidden mr-2" />
              <span className="hidden sm:inline">보유 쿠폰</span>
              <span className="sm:hidden">쿠폰</span>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="text-xs sm:text-sm min-h-[44px] sm:min-h-[36px]">
              <Heart className="w-4 h-4 sm:hidden mr-2" />
              <span className="hidden sm:inline">찜한 상품</span>
              <span className="sm:hidden">찜</span>
            </TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs sm:text-sm min-h-[44px] sm:min-h-[36px]">
              <MessageSquare className="w-4 h-4 sm:hidden mr-2" />
              <span className="hidden sm:inline">내 리뷰</span>
              <span className="sm:hidden">리뷰</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm min-h-[44px] sm:min-h-[36px]">
              <Settings className="w-4 h-4 sm:hidden mr-2" />
              <span className="hidden sm:inline">설정</span>
              <span className="sm:hidden">설정</span>
            </TabsTrigger>
          </TabsList>


          {/* 결제 내역 탭 */}
          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Receipt className="w-5 h-5 mr-2" />
                    결제 내역
                  </div>
                  {paymentsLoading && (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <span className="ml-2">결제 내역을 불러오는 중...</span>
                  </div>
                ) : payments.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">결제 내역이 없습니다</h3>
                    <p className="text-gray-600 mb-4">아직 결제한 내역이 없습니다.</p>
                    <Button onClick={() => navigate('/')} variant="outline">
                      상품 둘러보기
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {payments.map((payment) => (
                      <PaymentHistoryCard
                        key={payment.id}
                        payment={payment}
                        onRefund={handleRefund}
                        onDelete={handleDeletePayment}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 포인트 탭 */}
          <TabsContent value="points" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Coins className="w-5 h-5 mr-2" />
                    포인트
                  </div>
                  {pointsLoading && (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* 총 포인트 */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 mb-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">보유 포인트</p>
                    <div className="flex items-center justify-center gap-2">
                      <Coins className="w-8 h-8 text-purple-600" />
                      <span className="text-4xl font-bold text-purple-600">
                        {totalPoints.toLocaleString()}
                      </span>
                      <span className="text-2xl text-gray-500">P</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      결제 시 1P = 1원으로 사용 가능합니다
                    </p>
                  </div>
                </div>

                {/* 포인트 적립 안내 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-2">포인트 적립 안내</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>모든 결제 금액의 2%가 포인트로 적립됩니다 (배송비 제외)</li>
                        <li>포인트는 결제 완료 즉시 자동 적립됩니다</li>
                        <li>적립된 포인트는 1년간 유효합니다</li>
                        <li>최소 1,000P부터 결제 시 사용 가능합니다</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 포인트 내역 */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">포인트 내역</h3>
                  {pointsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      <span className="ml-2">포인트 내역을 불러오는 중...</span>
                    </div>
                  ) : pointHistory.length === 0 ? (
                    <div className="text-center py-12">
                      <Coins className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">포인트 내역이 없습니다</h3>
                      <p className="text-gray-600 mb-4">상품을 구매하고 포인트를 적립해보세요!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pointHistory.map((point) => {
                        const isEarn = point.point_type === 'earn';
                        const isExpire = point.point_type === 'expire';
                        const isRefund = point.point_type === 'refund';

                        return (
                          <div key={point.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    className={
                                      isEarn ? 'bg-green-100 text-green-800' :
                                      isExpire ? 'bg-gray-100 text-gray-800' :
                                      isRefund ? 'bg-orange-100 text-orange-800' :
                                      'bg-red-100 text-red-800'
                                    }
                                  >
                                    {point.point_type === 'earn' ? '적립' :
                                     point.point_type === 'use' ? '사용' :
                                     point.point_type === 'refund' ? '회수' :
                                     point.point_type === 'expire' ? '만료' : '관리자'}
                                  </Badge>
                                  <span className="text-sm text-gray-600">
                                    {new Date(point.created_at).toLocaleDateString('ko-KR', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 mb-1">{point.reason}</p>
                                {point.related_order_id && (
                                  <p className="text-xs text-gray-500">주문번호: {point.related_order_id}</p>
                                )}
                                {point.expires_at && new Date(point.expires_at) > new Date() && (
                                  <p className="text-xs text-orange-600 mt-1">
                                    만료일: {new Date(point.expires_at).toLocaleDateString('ko-KR')}
                                  </p>
                                )}
                              </div>
                              <div className="text-right ml-4">
                                <div className={`text-lg font-bold ${
                                  isEarn ? 'text-green-600' :
                                  isExpire ? 'text-gray-500' :
                                  isRefund ? 'text-orange-600' :
                                  'text-red-600'
                                }`}>
                                  {isEarn ? '+' : ''}{point.points.toLocaleString()}P
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  잔액: {point.balance_after.toLocaleString()}P
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 보유 쿠폰 탭 */}
          <TabsContent value="coupons" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Ticket className="w-5 h-5 mr-2" />
                  보유 쿠폰
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* 쿠폰 등록 입력 */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-purple-600" />
                    쿠폰 등록
                  </h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="쿠폰 코드를 입력하세요"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleRegisterCoupon();
                        }
                      }}
                      className="flex-1"
                      disabled={couponsLoading}
                    />
                    <Button
                      onClick={handleRegisterCoupon}
                      disabled={couponsLoading || !couponCode.trim()}
                      className="bg-[#8B5FBF] hover:bg-[#7A4FB5] whitespace-nowrap"
                    >
                      {couponsLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          등록 중...
                        </>
                      ) : (
                        '등록'
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    쿠폰 코드를 입력하여 보유 쿠폰에 추가하세요
                  </p>
                </div>

                {/* 보유 쿠폰 목록 */}
                {couponsLoading && coupons.length === 0 ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
                    <p className="mt-2 text-gray-500">쿠폰을 불러오는 중...</p>
                  </div>
                ) : coupons.length === 0 ? (
                  <div className="text-center py-12">
                    <Ticket className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">보유한 쿠폰이 없습니다</p>
                    <p className="text-sm text-gray-400 mt-2">위에서 쿠폰 코드를 입력하여 등록해보세요!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {coupons.map((coupon) => (
                      <div
                        key={coupon.id}
                        className="border rounded-lg p-4 hover:border-purple-300 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={coupon.discount_type === 'percentage' ? 'default' : 'secondary'}>
                                {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `${coupon.discount_value.toLocaleString()}원`}
                              </Badge>
                              <h3 className="font-semibold">{coupon.title}</h3>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{coupon.description}</p>
                            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                              {coupon.min_amount > 0 && (
                                <span className="bg-gray-100 px-2 py-1 rounded">
                                  최소 주문금액: {coupon.min_amount.toLocaleString()}원
                                </span>
                              )}
                              {coupon.valid_until && (
                                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                  {new Date(coupon.valid_until).toLocaleDateString('ko-KR')}까지
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(coupon.code);
                              toast.success('쿠폰 코드가 복사되었습니다');
                            }}
                          >
                            복사
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 찜한 상품 탭 */}
          <TabsContent value="favorites" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Heart className="w-5 h-5 mr-2" />
                    찜한 상품
                  </div>
                  {favoritesLoading && (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {favoritesLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
                    <p className="mt-2 text-gray-500">찜한 상품을 불러오는 중...</p>
                  </div>
                ) : favorites.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">찜한 상품이 없습니다</h3>
                    <p className="text-gray-600 mb-4">마음에 드는 상품을 찜해보세요!</p>
                    <Button onClick={() => navigate('/')} variant="outline">
                      상품 둘러보기
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {favorites.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex space-x-4">
                        <div
                          className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                          onClick={() => navigate(`/detail/${item.id}`)}
                        >
                          <ImageWithFallback
                            src={item.images?.[0] || 'https://via.placeholder.com/100'}
                            alt={item.title}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className="font-semibold line-clamp-2 cursor-pointer hover:text-purple-600"
                            onClick={() => navigate(`/detail/${item.id}`)}
                          >
                            {item.title}
                          </h3>
                          <div className="flex items-center text-gray-600 text-xs mt-1">
                            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{item.location || '위치 정보 없음'}</span>
                          </div>
                          <div className="flex items-center mt-2">
                            {Number(item.rating_avg || 0) > 0 && Number(item.rating_count || 0) > 0 ? (
                              <>
                                <div className="flex items-center">
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1" />
                                  <span className="text-sm">{Number(item.rating_avg || 0).toFixed(1)}</span>
                                </div>
                                <span className="text-sm text-gray-500 ml-2">({item.rating_count || 0})</span>
                              </>
                            ) : (
                              <div className="text-xs text-gray-500">리뷰 없음</div>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <Badge variant="outline" className="text-xs">{item.category}</Badge>
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-purple-600">
                                {item.price_from ? `₩${item.price_from.toLocaleString()}` : '가격 문의'}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleFavorite(item.id)}
                                className="h-8 w-8 p-0 hover:bg-red-50"
                              >
                                <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                              </Button>
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
                        <ImageWithFallback
                          src={review.image}
                          alt={review.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{review.title}</h3>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">{review.date}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteReview(review.id)}
                                className="h-8 w-8 p-0 hover:bg-red-50 text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
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
                  <Select
                    value={settings.language}
                    onValueChange={(value) => handleSaveSettings({ ...settings, language: value })}
                  >
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
                  <Select
                    value={settings.currency}
                    onValueChange={(value) => handleSaveSettings({ ...settings, currency: value })}
                  >
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
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <span className="text-sm">예약 확인 알림</span>
                      <input
                        type="checkbox"
                        checked={settings.notifications.booking}
                        onChange={(e) => handleSaveSettings({
                          ...settings,
                          notifications: { ...settings.notifications, booking: e.target.checked }
                        })}
                        className="rounded h-4 w-4"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <span className="text-sm">마케팅 정보 수신</span>
                      <input
                        type="checkbox"
                        checked={settings.notifications.marketing}
                        onChange={(e) => handleSaveSettings({
                          ...settings,
                          notifications: { ...settings.notifications, marketing: e.target.checked }
                        })}
                        className="rounded h-4 w-4"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <span className="text-sm">이벤트 정보 수신</span>
                      <input
                        type="checkbox"
                        checked={settings.notifications.events}
                        onChange={(e) => handleSaveSettings({
                          ...settings,
                          notifications: { ...settings.notifications, events: e.target.checked }
                        })}
                        className="rounded h-4 w-4"
                      />
                    </div>
                  </div>
                </div>

                {/* 계정 관리 */}
                <div>
                  <label className="text-sm font-medium mb-2 block">계정 관리</label>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => toast.info('결제 수단 관리 기능은 준비 중입니다.')}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      결제 수단 관리
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setIsChangingPassword(true)}
                    >
                      <Key className="w-4 h-4 mr-2" />
                      비밀번호 변경
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      계정 탈퇴
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 계정 탈퇴 다이얼로그 */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                <span className="text-red-600">계정 탈퇴</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-semibold mb-1">경고: 이 작업은 되돌릴 수 없습니다!</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>모든 예약 내역이 삭제됩니다</li>
                      <li>작성한 리뷰가 삭제됩니다</li>
                      <li>찜한 상품 목록이 삭제됩니다</li>
                      <li>계정 정보를 복구할 수 없습니다</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  계속하려면 <span className="text-red-600 font-bold">"계정삭제"</span>를 입력하세요
                </label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="계정삭제"
                  className="font-mono"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirmText('');
                }}
                disabled={deleteLoading}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirmText !== '계정삭제'}
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    삭제 중...
                  </>
                ) : (
                  '계정 삭제'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
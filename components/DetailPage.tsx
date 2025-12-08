import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
// Tabs removed - using scroll navigation instead
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Dialog, DialogContent } from './ui/dialog';
import {
  Star,
  MapPin,
  Clock,
  Share2,
  Heart,
  Calendar as CalendarIcon,
  X,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Shield,
  Award,
  ShoppingCart,
  Camera,
  Phone,
  AlertCircle,
  CheckCircle,
  Loader2,
  ExternalLink,
  ThumbsUp,
  RefreshCw
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { api, ExtendedReview } from '../utils/api';
import { toast } from 'sonner';
import { useCartStore } from '../hooks/useCartStore';
import { useAuth } from '../hooks/useAuth';
import { getGoogleMapsApiKey } from '../utils/env';

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

interface DetailItem {
  id: number;
  title: string;
  description: string;
  shortDescription: string;
  price: number;
  childPrice?: number;
  infantPrice?: number;
  location: string;
  address?: string;
  duration: string;
  category: string;
  category_id?: number;  // ✅ 팝업 판별용 (category_id === 1860)
  rating: number;
  reviewCount: number;
  images: string[];
  isPartner: boolean;
  isSponsor: boolean;
  partnerName: string;
  maxCapacity: number;
  features: string[];
  included: string[];
  excluded: string[];
  policies: {
    cancellation: string;
    refund: string;
    weather: string;
  };
  amenities?: string[];
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  language?: string[];
  minAge?: number;
  availableStartTimes?: string[];
  itinerary?: { time: string; activity: string; description?: string }[];
  packages?: { id: string; name: string; price: number; description?: string }[];

  // Accommodation-specific fields
  roomType?: string;
  maxGuests?: number;
  checkInTime?: string;
  checkOutTime?: string;
  bedType?: string;
  bathroomType?: string;
  roomSize?: number;
  wifiAvailable?: boolean;
  parkingAvailable?: boolean;
  breakfastIncluded?: boolean;

  // Rentcar-specific fields
  vehicleType?: string;
  brand?: string;
  model?: string;
  yearManufactured?: number;
  fuelType?: string;
  seatingCapacity?: number;
  transmission?: string;
  insuranceIncluded?: boolean;
  insuranceDetails?: string;
  mileageLimit?: number;
  depositAmount?: number;
  pickupLocation?: string;
  returnLocation?: string;
  ageRequirement?: number;
  licenseRequirement?: string;

  // Popup product-specific fields
  hasOptions?: boolean;
  minPurchase?: number;
  maxPurchase?: number;
  stockEnabled?: boolean;
  stock?: number;
  shippingFee?: number;
  is_refundable?: boolean;
}

interface BookingFormData {
  name: string;
  phone: string;
  email: string;
  requests: string;
  emergencyContact?: string;
  dietaryRestrictions?: string;
  specialNeeds?: string;
}

// ✅ 팝업 상품 판별 헬퍼 함수 (category_id === 1860 또는 category === 'popup')
const isPopupProduct = (item: DetailItem | null): boolean => {
  if (!item) return false;
  // category_id는 1860 (popup 카테고리 ID)
  return item.category_id === 1860 || item.category === '팝업' || item.category === 'popup';
};

export function DetailPage() {
  const { id: itemId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const { isLoggedIn, user } = useAuth();
  const [item, setItem] = useState<DetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [quantity, setQuantity] = useState(1); // 팝업 상품 수량
  const [startTime, setStartTime] = useState('');
  const [selectedPackages, setSelectedPackages] = useState<{[key: string]: number}>({});
  const [customGuestCount, setCustomGuestCount] = useState('');
  const [isCustomGuests, setIsCustomGuests] = useState(false);
  const [productOptions, setProductOptions] = useState<any[]>([]);
  const [selectedOption, setSelectedOption] = useState<any | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '', images: [] as string[] });
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [priceCalculation, setPriceCalculation] = useState({ basePrice: 0, taxes: 0, total: 0 });
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const galleryRef = useRef<HTMLDivElement>(null);

  const [bookingData, setBookingData] = useState<BookingFormData>({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    requests: '',
    emergencyContact: '',
    dietaryRestrictions: '',
    specialNeeds: ''
  });

  // Enhanced SEO metadata
  useEffect(() => {
    if (item) {
      document.title = `${item.title} - Travleap | 신안 여행`;
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', `${item.shortDescription} - 가격: ${item.price.toLocaleString()}원부터, 위치: ${item.location}, 리뷰: ${item.reviewCount}개`);
      }
    }
  }, [item]);

  useEffect(() => {
    if (itemId) {
      fetchItemDetails();
    }
  }, [itemId]);

  useEffect(() => {
    if (item?.id) {
      fetchReviews();
      fetchAvailableDates();
      checkFavoriteStatus();
    }
  }, [item?.id]);

  // Update price calculation when guests or options change
  useEffect(() => {
    if (!item) return;

    // 옵션이 있고 메뉴/좌석등급인 경우 옵션 가격 사용
    const useOptionPrice = selectedOption &&
      ['menu', 'seat_class'].includes(selectedOption.option_type) &&
      selectedOption.price > 0;

    const baseItemPrice = useOptionPrice ? selectedOption.price : item.price;

    // Calculate prices for each guest type (가격 미설정시 0원)
    const adultPrice = baseItemPrice * adults;
    const childPrice = (item.childPrice && item.childPrice > 0) ? item.childPrice * children : 0;
    const infantPrice = (item.infantPrice && item.infantPrice > 0) ? item.infantPrice * infants : 0;

    // Calculate package prices
    const packageTotal = Object.entries(selectedPackages).reduce((sum, [packageId, quantity]) => {
      const pkg = item.packages?.find(p => p.id === packageId);
      return sum + (pkg?.price || 0) * quantity;
    }, 0);

    // 시간대/패키지/추가옵션의 경우 추가 금액
    const optionExtraPrice = selectedOption &&
      ['time_slot', 'package', 'addon'].includes(selectedOption.option_type) &&
      selectedOption.price > 0
        ? selectedOption.price * (adults + children)
        : 0;

    const basePrice = adultPrice + childPrice + infantPrice + packageTotal + optionExtraPrice;
    const taxes = 0; // 세금 포함하지 않음
    const total = basePrice;
    setPriceCalculation({ basePrice, taxes, total });
  }, [adults, children, infants, item, selectedPackages, selectedOption]);

  // 스크롤 이동 함수
  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      const yOffset = -80; // 헤더 높이 고려
      const y = section.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveTab(sectionId);
    }
  };

  // 스크롤 위치에 따른 active 탭 감지
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['description', 'location', 'policy', 'reviews'];
      const scrollPosition = window.scrollY + 150; // 헤더 + 여유

      for (const sectionId of sections) {
        const section = document.getElementById(sectionId);
        if (section) {
          const { offsetTop, offsetHeight } = section;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveTab(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchItemDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getListingById(Number(itemId));
      if (response.success && response.data) {
        const data = response.data;

        // Fetch category-specific details from cloud database
        let categoryDetails: any = null;
        try {
          const category = data.category?.toLowerCase();
          if (category === 'accommodation' || category === 'stay') {
            const detailsResponse = await api.getListingAccommodation(data.id);
            if (detailsResponse.success) categoryDetails = detailsResponse.data;
          } else if (category === 'tour' || category === 'activity') {
            const detailsResponse = await api.getListingTour(data.id);
            if (detailsResponse.success) categoryDetails = detailsResponse.data;
          } else if (category === 'food' || category === 'restaurant') {
            const detailsResponse = await api.getListingFood(data.id);
            if (detailsResponse.success) categoryDetails = detailsResponse.data;
          } else if (category === 'event') {
            const detailsResponse = await api.getListingEvent(data.id);
            if (detailsResponse.success) categoryDetails = detailsResponse.data;
          } else if (category === 'rentcar' || category === 'rental') {
            const detailsResponse = await api.getListingRentcar(data.id);
            if (detailsResponse.success) categoryDetails = detailsResponse.data;
          }
        } catch (error) {
          console.log('Category-specific details not found or error:', error);
        }

        const processedItem: DetailItem = {
          id: data.id,
          title: data.title,
          description: data.description_md || '',
          shortDescription: data.short_description || '',
          price: data.price_from || 0,
          childPrice: data.child_price ? Number(data.child_price) : undefined,
          infantPrice: data.infant_price ? Number(data.infant_price) : undefined,
          location: data.location || '신안군',
          address: data.address || categoryDetails?.address || '',
          duration: data.duration || categoryDetails?.duration || '1시간',
          category: data.category || '투어',
          category_id: data.category_id,  // ✅ 팝업 판별용
          rating: data.rating_avg || 0,
          reviewCount: data.rating_count || 0,
          images: Array.isArray(data.images) && data.images.length > 0
            ? data.images
            : [getDefaultImage(data.category || 'tour')],
          isPartner: data.partner?.is_verified || false,
          isSponsor: data.partner?.tier === 'gold' || data.partner?.tier === 'platinum' || false,
          partnerName: data.partner?.business_name || '신안관광협회',
          maxCapacity: data.max_capacity || categoryDetails?.max_capacity || 10,
          features: data.features || categoryDetails?.features || ['전문 가이드 동행', '안전장비 제공', '기념품 포함', '사진 촬영 서비스'],
          included: data.included || categoryDetails?.included || ['가이드 서비스', '안전장비', '기념품', '보험'],
          excluded: data.excluded || categoryDetails?.excluded || ['개인 용품', '식사', '교통비'],
          policies: {
            cancellation: data.cancellation_policy || categoryDetails?.cancellation_policy || '여행 3일 전까지 무료 취소',
            refund: data.refund_policy || categoryDetails?.refund_policy || '부분 환불 가능',
            weather: data.weather_policy || categoryDetails?.weather_policy || '악천후 시 일정 변경 또는 취소'
          },
          amenities: data.amenities || categoryDetails?.amenities || [],
          tags: data.tags || categoryDetails?.tags || [],
          difficulty: (data.difficulty as 'easy' | 'medium' | 'hard') || 'easy',
          language: Array.isArray(data.language) ? data.language : [data.language || '한국어'],
          minAge: data.min_age || categoryDetails?.min_age || 0,

          // Accommodation-specific fields
          roomType: categoryDetails?.room_type,
          maxGuests: categoryDetails?.max_guests,
          checkInTime: categoryDetails?.check_in_time,
          checkOutTime: categoryDetails?.check_out_time,
          bedType: categoryDetails?.bed_type,
          bathroomType: categoryDetails?.bathroom_type,
          roomSize: categoryDetails?.room_size,
          wifiAvailable: categoryDetails?.wifi_available === 1,
          parkingAvailable: categoryDetails?.parking_available === 1,
          breakfastIncluded: categoryDetails?.breakfast_included === 1,

          // Rentcar-specific fields
          vehicleType: categoryDetails?.vehicle_type,
          brand: categoryDetails?.brand,
          model: categoryDetails?.model,
          yearManufactured: categoryDetails?.year_manufactured,
          fuelType: categoryDetails?.fuel_type,
          seatingCapacity: categoryDetails?.seating_capacity,
          transmission: categoryDetails?.transmission,
          insuranceIncluded: categoryDetails?.insurance_included === 1,
          insuranceDetails: categoryDetails?.insurance_details,
          mileageLimit: categoryDetails?.mileage_limit,
          depositAmount: categoryDetails?.deposit_amount,
          pickupLocation: categoryDetails?.pickup_location,
          returnLocation: categoryDetails?.return_location,
          ageRequirement: categoryDetails?.age_requirement,
          licenseRequirement: categoryDetails?.license_requirement,

          // Popup product-specific fields
          hasOptions: data.has_options === 1 || data.has_options === true,
          minPurchase: data.min_purchase,
          maxPurchase: data.max_purchase,
          stockEnabled: data.stock_enabled === 1 || data.stock_enabled === true,
          stock: data.stock,
          shippingFee: data.shipping_fee
        };
        console.log('🔍 상품 카테고리 확인:', processedItem.category, '| 상품명:', processedItem.title, '| hasOptions:', processedItem.hasOptions);
        setItem(processedItem);
        setRetryCount(0);
      } else {
        throw new Error(response.error || '상품 정보를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('Error fetching item details:', error);
      const errorMessage = error instanceof Error ? error.message : '데이터를 불러오는데 실패했습니다';
      setError(errorMessage);

      if (retryCount < 2) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchItemDetails(), 2000);
        return;
      }

      // 에러가 발생해도 기본 상품 정보로 표시
      const fallbackItem: DetailItem = {
        id: Number(itemId) || 1,
        title: '상품 정보를 불러오는 중입니다...',
        description: '상품 상세 정보를 준비 중입니다.',
        shortDescription: '잠시만 기다려주세요.',
        price: 0,
        location: '신안군',
        duration: '1시간',
        category: '투어',
        rating: 0,
        reviewCount: 0,
        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop'],
        isPartner: true,
        isSponsor: false,
        partnerName: '신안관광협회',
        maxCapacity: 10,
        features: ['전문 가이드 동행', '안전장비 제공'],
        included: ['가이드 서비스', '안전장비'],
        excluded: ['개인 용품', '식사'],
        policies: {
          cancellation: '여행 3일 전까지 무료 취소',
          refund: '부분 환불 가능',
          weather: '악천후 시 일정 변경 또는 취소'
        },
        amenities: [],
        tags: [],
        difficulty: 'easy',
        language: ['한국어'],
        minAge: 0
      };
      setItem(fallbackItem);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [itemId, retryCount]);

  const fetchAvailableDates = useCallback(async () => {
    if (!item?.id) return;
    try {
      const response = await api.getAvailableDates(item.id);
      if (response && Array.isArray(response)) {
        setAvailableDates(response);
      }
    } catch (error) {
      console.error('Error fetching available dates:', error);
    }
  }, [item?.id]);

  const checkFavoriteStatus = useCallback(async () => {
    if (!item?.id || !isLoggedIn) return;
    try {
      const response = await api.getFavorites();
      if (response && Array.isArray(response)) {
        setIsFavorite(response.some((fav: any) => fav.listing_id === item.id));
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  }, [item?.id, isLoggedIn]);

  const toggleFavorite = useCallback(async () => {
    if (!item?.id || !isLoggedIn) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    try {
      if (isFavorite) {
        await api.removeFavorite?.(item.id);
        setIsFavorite(false);
        toast.success('즐겨찾기에서 제거되었습니다.');
      } else {
        await api.addFavorite?.(item.id);
        setIsFavorite(true);
        toast.success('즐겨찾기에 추가되었습니다.');
      }
    } catch (error) {
      toast.error('오류가 발생했습니다.');
    }
  }, [item?.id, isLoggedIn, isFavorite]);

  const handleShare = useCallback(async () => {
    if (!item) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: item.shortDescription,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('링크가 복사되었습니다.');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [item]);

  const handleRetry = useCallback(() => {
    setRetryCount(0);
    setError(null);
    fetchItemDetails();
  }, [fetchItemDetails]);

  // Fetch product options if item has options enabled
  // 모든 카테고리에서 옵션 로드 (메뉴, 시간대, 좌석등급 등)
  useEffect(() => {
    const fetchProductOptions = async () => {
      if (!item?.id) return;

      // hasOptions가 true이거나, 투어/음식/관광지/체험/행사 카테고리인 경우 옵션 로드
      const shouldLoadOptions = item.hasOptions ||
        ['tour', 'food', 'tourist', 'experience', 'event', '여행/투어', '음식', '관광지', '체험', '행사'].includes(item.category);

      if (shouldLoadOptions) {
        try {
          const response = await fetch(`/api/listings/options?listing_id=${item.id}`);
          const result = await response.json();
          if (result.success && result.data && result.data.length > 0) {
            setProductOptions(result.data);
            // 기본 옵션이 있으면 선택
            const defaultOption = result.data.find((opt: any) => opt.is_default);
            if (defaultOption) {
              setSelectedOption(defaultOption);
            }
          }
        } catch (error) {
          console.error('Failed to fetch options:', error);
        }
      }
    };

    fetchProductOptions();
  }, [item]);

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

  const fetchReviews = useCallback(async () => {
    if (!item?.id) return;
    try {
      setReviewsLoading(true);
      const dbReviews = await api.getReviews(Number(item.id));

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
  }, [item?.id]);

  const validateBookingForm = useCallback(() => {
    // 팝업이 아닐 때만 날짜 검증
    if (!isPopupProduct(item) && !selectedDate) {
      toast.error('날짜를 선택해주세요.');
      return false;
    }
    if (!bookingData.name.trim()) {
      toast.error('이름을 입력해주세요.');
      return false;
    }
    if (!bookingData.phone.trim()) {
      toast.error('전화번호를 입력해주세요.');
      return false;
    }
    if (!bookingData.email.trim() || !/\S+@\S+\.\S+/.test(bookingData.email)) {
      toast.error('유효한 이메일을 입력해주세요.');
      return false;
    }

    // 팝업이 아닐 때만 인원 검증
    if (!isPopupProduct(item)) {
      const totalGuests = adults + children + infants;
      if (totalGuests < 1 || totalGuests > (item?.maxCapacity || 10)) {
        toast.error(`인원은 1명부터 ${item?.maxCapacity || 10}명까지 가능합니다.`);
        return false;
      }
      if (adults < 1 && children < 1) {
        toast.error('최소 1명 이상의 성인 또는 미성년자가 필요합니다.');
        return false;
      }
    } else {
      // 팝업일 때는 수량 검증
      if (quantity < 1) {
        toast.error('최소 1개 이상 선택해주세요.');
        return false;
      }
    }

    return true;
  }, [item?.category, selectedDate, bookingData, adults, children, infants, quantity, item?.maxCapacity]);

  const handleBooking = useCallback(async () => {
    // 상품 정보 검증
    if (!item || !item.id) {
      toast.error('상품 정보를 찾을 수 없습니다. 페이지를 새로고침 해주세요.');
      console.error('Item is null or missing ID:', item);
      return;
    }

    // 팝업이 아닐 때만 날짜 선택 검증
    if (!isPopupProduct(item) && !selectedDate) {
      toast.error('날짜를 선택해주세요.');
      return;
    }

    // 폼 검증
    if (!validateBookingForm()) {
      return;
    }

    try {
      setBookingLoading(true);
      const totalGuests = adults + children + infants;

      // 필수 필드 검증
      if (!bookingData.name.trim()) {
        toast.error('예약자 이름을 입력해주세요.');
        return;
      }
      if (!bookingData.phone.trim()) {
        toast.error('연락처를 입력해주세요.');
        return;
      }
      if (!bookingData.email.trim()) {
        toast.error('이메일을 입력해주세요.');
        return;
      }

      // ✅ 팝업 상품의 경우 옵션 가격 반영
      let finalAmount = isPopupProduct(item) ? (item.price || 0) * quantity : priceCalculation.total;
      if (isPopupProduct(item) && selectedOption) {
        // 옵션 추가금을 수량에 곱해서 반영
        finalAmount += selectedOption.price_adjustment * quantity;
      }

      const bookingRequest = {
        listing_id: Number(item.id),
        user_id: user?.id || 1,
        num_adults: isPopupProduct(item) ? quantity : adults,
        num_children: isPopupProduct(item) ? 0 : children,
        num_seniors: isPopupProduct(item) ? 0 : infants,
        start_time: startTime || '09:00',
        guest_name: bookingData.name.trim(),
        guest_phone: bookingData.phone.trim(),
        guest_email: bookingData.email.trim(),
        booking_date: isPopupProduct(item) ? new Date().toISOString().split('T')[0] : selectedDate.toISOString().split('T')[0],
        guest_count: isPopupProduct(item) ? quantity : totalGuests,
        special_requests: bookingData.requests.trim() || '',
        total_amount: finalAmount,
        emergency_contact: bookingData.emergencyContact?.trim() || '',
        dietary_restrictions: bookingData.dietaryRestrictions?.trim() || '',
        special_needs: bookingData.specialNeeds?.trim() || '',
        // ✅ 팝업 상품 옵션 정보 추가
        ...(isPopupProduct(item) && selectedOption && {
          selected_option: {
            id: selectedOption.id,
            name: selectedOption.option_name,
            value: selectedOption.option_value,
            priceAdjustment: selectedOption.price_adjustment
          }
        })
      };

      console.log('Creating booking with Lock Manager:', bookingRequest);

      // Lock Manager를 사용한 안전한 예약 생성
      const response = await api.createBookingWithLock(bookingRequest);

      if (!response.success) {
        // Lock 획득 실패 시 사용자 친화적 메시지
        throw new Error(response.error || '예약 처리 중 오류가 발생했습니다.');
      }

      if (response.data) {
        // HOLD 상태 예약 생성 성공
        toast.success('예약이 생성되었습니다! 10분 이내에 결제를 완료해주세요.', {
          duration: 5000
        });

        console.log('✅ 예약 생성 완료:', response.data);
        console.log('   - 예약번호:', response.data.booking_number);
        console.log('   - 만료시간:', response.data.hold_expires_at);

        // 결제 위젯 페이지로 이동 (결제 위젯 통합)
        const paymentParams = new URLSearchParams({
          bookingId: response.data.booking_id.toString(),
          bookingNumber: response.data.booking_number,
          amount: response.data.total_amount.toString(),
          title: item.title,
          date: isPopupProduct(item) ? new Date().toISOString().split('T')[0] : selectedDate.toISOString().split('T')[0],
          guests: isPopupProduct(item) ? quantity.toString() : totalGuests.toString(),
          customerName: response.data.guest_name,
          customerEmail: response.data.guest_email
        });
        navigate(`/payment?${paymentParams.toString()}`);
      } else {
        throw new Error('예약 데이터가 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      const errorMessage = error instanceof Error ? error.message : '예약 처리 중 오류가 발생했습니다.';
      toast.error(errorMessage);
    } finally {
      setBookingLoading(false);
    }
  }, [item, selectedDate, validateBookingForm, bookingData, adults, children, infants, quantity, startTime, priceCalculation.total, user?.id, navigate]);

  const handleReviewSubmit = useCallback(async () => {
    if (!newReview.comment.trim()) {
      toast.error('리뷰 내용을 입력해주세요.');
      return;
    }

    if (!isLoggedIn) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (!item) return;

    try {
      const reviewData = {
        listing_id: Number(item.id),
        user_id: user?.id || 1,
        rating: newReview.rating,
        title: `${item.title} 리뷰`,
        content: newReview.comment.trim(),
        images: newReview.images
      };

      const response = await api.createReview(reviewData);
      if (response.success) {
        toast.success('리뷰가 성공적으로 등록되었습니다.');
        setNewReview({ rating: 5, comment: '', images: [] });
        fetchReviews();

        // 실시간 데이터 갱신 알림 - AdminPage가 자동으로 새로고침됨
        // notifyDataChange는 객체이므로 메서드 호출이 필요함 (현재는 review 이벤트 없음)
      } else {
        throw new Error(response.error || '리뷰 등록 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      const errorMessage = error instanceof Error ? error.message : '리뷰 등록 중 오류가 발생했습니다.';
      toast.error(errorMessage);
    }
  }, [newReview, isLoggedIn, item, user?.id, navigate, fetchReviews]);

  const handleMarkHelpful = useCallback(async (reviewId: string) => {
    if (!user?.id) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    try {
      const response = await api.admin.markReviewHelpful(Number(reviewId), user.id);
      if (response.success) {
        toast.success(response.message || '좋아요');
        fetchReviews(); // 리뷰 목록 갱신
      } else {
        throw new Error(response.error || '좋아요 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error marking review helpful:', error);
      const errorMessage = error instanceof Error ? error.message : '좋아요 처리 중 오류가 발생했습니다.';
      toast.error(errorMessage);
    }
  }, [user?.id, fetchReviews]);

  const handleDeleteReview = useCallback(async (reviewId: string) => {
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
  }, [user?.id, fetchReviews]);

  const addToCartHandler = useCallback(async () => {
    if (!item) {
      toast.error('상품 정보를 불러올 수 없습니다.');
      return;
    }

    // 팝업이 아닐 때만 날짜 검증
    if (!isPopupProduct(item) && !selectedDate) {
      toast.error('날짜를 선택해주세요.');
      return;
    }

    const totalGuests = adults + children + infants;

    // 필수 필드 검증
    if (!item.id) {
      toast.error('상품 ID가 올바르지 않습니다.');
      console.error('Item missing ID:', item);
      return;
    }

    // 옵션 검증 (팝업 + 일반 카테고리 모두)
    if (productOptions.length > 0 && !selectedOption) {
      // 시간대 옵션이 있는 경우
      if (productOptions.some((opt: any) => opt.option_type === 'time_slot')) {
        toast.error('시간대를 선택해주세요.');
        return;
      }
      // 메뉴 옵션이 있는 경우 (음식)
      if (productOptions.some((opt: any) => opt.option_type === 'menu')) {
        toast.error('메뉴를 선택해주세요.');
        return;
      }
      // 좌석등급 옵션이 있는 경우 (행사)
      if (productOptions.some((opt: any) => opt.option_type === 'seat_class')) {
        toast.error('좌석 등급을 선택해주세요.');
        return;
      }
      // 기타 옵션
      toast.error('옵션을 선택해주세요.');
      return;
    }

    // 옵션 가격 계산
    const optionPrice = selectedOption ? (selectedOption.price_adjustment || 0) : 0;
    const basePrice = item.price || 0;
    // 🔒 CRITICAL FIX: 팝업 상품은 무조건 단가만 전달 (수량과 무관)
    const itemPrice = isPopupProduct(item) ? basePrice : (priceCalculation.basePrice || item.price || 0);

    const cartItem = {
      id: item.id,
      title: item.title || '상품',
      price: itemPrice,  // ✅ 무조건 단가 (팝업: basePrice, 예약: basePrice per person)
      quantity: isPopupProduct(item) ? quantity : 1,  // ✅ 팝업은 수량 전달, 예약은 1
      image: item.images?.[0] || '',
      category: item.category || '',
      category_id: item.category_id,  // ✅ 팝업 판별용
      location: item.location || '',
      date: isPopupProduct(item) ? '' : selectedDate!.toISOString().split('T')[0],
      guests: isPopupProduct(item) ? quantity : totalGuests,
      checkInTime: startTime || (selectedOption?.start_time?.slice(0, 5)) || undefined,  // ✅ 예약/체크인 시간 (옵션에서 가져옴)
      // ✅ 투어/음식/관광지/이벤트/체험 인원 정보
      adults: isPopupProduct(item) ? undefined : adults,
      children: isPopupProduct(item) ? undefined : children,
      infants: isPopupProduct(item) ? undefined : infants,
      // ✅ 연령대별 가격 정보
      adultPrice: isPopupProduct(item) ? undefined : (item.price || 0),
      childPrice: isPopupProduct(item) ? undefined : (item.childPrice || item.price * 0.7),
      infantPrice: isPopupProduct(item) ? undefined : (item.infantPrice || item.price * 0.3),
      // ✅ 옵션 정보 (팝업 + 일반 카테고리 모두)
      selectedOption: selectedOption ? {
        id: selectedOption.id,
        name: selectedOption.name || selectedOption.option_name,
        value: selectedOption.option_value || selectedOption.description,
        optionType: selectedOption.option_type,
        price: selectedOption.price || 0,
        priceAdjustment: selectedOption.price_adjustment || 0
      } : undefined,
      // ✅ 보험 정보 (렌트카 등에서 전달될 수 있음)
      selectedInsurance: undefined,  // 향후 렌트카 페이지에서 전달 가능
      insuranceFee: 0
    };

    console.log('🛒 [DetailPage] 장바구니 추가 시작:', cartItem);

    try {
      await addToCart(cartItem);
      toast.success('장바구니에 추가되었습니다.');
      console.log('✅ [DetailPage] 장바구니 추가 성공');
    } catch (error) {
      console.error('❌ [DetailPage] 장바구니 추가 실패:', error);
      toast.error(error instanceof Error ? error.message : '장바구니 추가에 실패했습니다.');
    }
  }, [item, selectedDate, adults, children, infants, quantity, priceCalculation.total, selectedOption, startTime, addToCart]);

  const averageRating = useMemo(() => {
    if (reviews.length > 0) {
      return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    }
    return Number(item?.rating || 0);
  }, [reviews, item?.rating]);

  const isDateDisabled = useCallback((date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today || (availableDates.length > 0 && !availableDates.includes(date.toISOString().split('T')[0]));
  }, [availableDates]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '초급';
      case 'medium': return '중급';
      case 'hard': return '고급';
      default: return '벤이직';
    }
  };

  // Enhanced loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50" role="main" aria-label="상품 상세 페이지">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            {/* Header skeleton */}
            <div className="flex items-center gap-4 mb-6">
              <div className="h-6 w-6 bg-gray-200 rounded"></div>
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
            </div>

            {/* Image gallery skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="h-96 bg-gray-200 rounded-lg"></div>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>

              {/* Booking form skeleton */}
              <div className="space-y-6">
                <div className="h-8 w-3/4 bg-gray-200 rounded"></div>
                <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                <div className="space-y-4">
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-12 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>

            {/* Content skeleton */}
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
              ))}
            </div>
          </div>

          {/* Loading indicator with retry count */}
          <div className="fixed bottom-8 right-8 bg-white p-4 rounded-lg shadow-lg border">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div>
                <p className="text-sm font-medium">상품 정보 로딩 중...</p>
                {retryCount > 0 && (
                  <p className="text-xs text-gray-500">재시도 {retryCount}/2</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced error states
  if (!itemId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" role="main">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">상품을 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-6">요청하신 상품 ID가 올바르지 않습니다.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate('/')} className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              홈으로 돌아가기
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)}>
              이전 페이지
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Error state with retry option
  if (error && !item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" role="main">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleRetry} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              다시 시도
            </Button>
            <Button variant="outline" onClick={() => navigate('/')}>
              홈으로 돌아가기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Ensure we have item data
  if (!item) {
    return null; // This shouldn't happen as we handle loading/error states above
  }

  const images = item.images || [getDefaultImage(item.category)];

  return (
    <div className="min-h-screen bg-gray-50 mobile-safe-bottom" role="main" aria-label="상품 상세 정보">
      <div className="container mx-auto px-4 py-4 md:py-6 lg:py-8">
        {/* Enhanced Navigation */}
        <nav className="flex items-center justify-between mb-6" aria-label="페이지 내비게이션">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="min-h-[44px] flex items-center gap-2 hover:bg-gray-100 transition-colors"
            aria-label="이전 페이지로 돌아가기"
          >
            <ChevronLeft className="h-4 w-4" />
            뒤로가기
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex items-center gap-2"
              aria-label="상품 공유"
            >
              <Share2 className="h-4 w-4" />
              공유
            </Button>
            <Button
              variant={isFavorite ? "default" : "outline"}
              size="sm"
              onClick={toggleFavorite}
              className={`flex items-center gap-2 transition-colors ${
                isFavorite ? 'bg-red-500 hover:bg-red-600 text-white' : 'hover:bg-red-50 hover:text-red-600'
              }`}
              aria-label={isFavorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              {isFavorite ? '좀음' : '즐겨찾기'}
            </Button>
          </div>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 lg:space-y-8">
            {/* Enhanced Image Gallery */}
            <Card className="overflow-hidden group">
              <div className="relative" ref={galleryRef}>
                <img
                  src={images[currentImageIndex]}
                  alt={`${item.title} - 이미지 ${currentImageIndex + 1}/${images.length}`}
                  className="w-full h-auto max-h-[550px] object-contain bg-gray-100"
                  style={{ imageRendering: 'auto' }}
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                {/* Image counter */}
                <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                  {currentImageIndex + 1} / {images.length}
                </div>

                {/* Fullscreen button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImageGallery(true)}
                  className="absolute bottom-4 right-4 bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm"
                  aria-label="전체 화면으로 보기"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  전체보기
                </Button>

                {/* Navigation buttons - 이미지가 2개 이상일 때만 표시, 항상 보임 */}
                {images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm min-w-[44px] min-h-[44px] z-10"
                      onClick={() => setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1)}
                      aria-label="이전 이미지"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm min-w-[44px] min-h-[44px] z-10"
                      onClick={() => setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1)}
                      aria-label="다음 이미지"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}

                {/* Enhanced Badges */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-blue-600 text-white shadow-lg backdrop-blur-sm">
                    {item.category}
                  </Badge>
                  {item.isPartner && (
                    <Badge variant="secondary" className="bg-green-600 text-white shadow-lg backdrop-blur-sm flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      인증업체
                    </Badge>
                  )}
                  {item.isSponsor && (
                    <Badge variant="secondary" className="bg-yellow-600 text-white shadow-lg backdrop-blur-sm flex items-center gap-1">
                      <Award className="h-3 w-3" />
                      스폰서
                    </Badge>
                  )}
                  {item.difficulty && (
                    <Badge className={`shadow-lg backdrop-blur-sm ${getDifficultyColor(item.difficulty)}`}>
                      {getDifficultyLabel(item.difficulty)}
                    </Badge>
                  )}
                </div>
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
                <div className="absolute top-2 md:top-4 right-2 md:right-4 flex gap-2">
                  <Button size="icon" variant="ghost" className="bg-white/80 hover:bg-white min-w-[40px] min-h-[40px] md:min-w-[36px] md:min-h-[36px] flex items-center justify-center">
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="bg-white/80 hover:bg-white min-w-[40px] min-h-[40px] md:min-w-[36px] md:min-h-[36px] flex items-center justify-center">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Image indicators */}
                {images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_image: string, index: number) => (
                      <button
                        key={index}
                        className={`w-3 h-3 md:w-2 md:h-2 rounded-full transition-colors min-w-[12px] min-h-[12px] ${
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
              <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4 space-y-4 md:space-y-0">
                <div className="flex-1">
                  <h1 className="text-xl md:text-2xl lg:text-3xl mb-2 font-semibold">{item.title}</h1>
                  {/* 팝업 상품이 아닐 때만 위치, 시간, 리뷰 정보 표시 */}
                  {!isPopupProduct(item) && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0 text-sm md:text-base text-gray-600">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span>{item.address || item.location}</span>
                      </div>
                      {item.duration && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          <span>{item.duration}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                        <span>{averageRating.toFixed(1)}</span>
                        <span className="text-gray-400">({reviews.length}개 리뷰)</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-left md:text-right flex-shrink-0">
                  {!isPopupProduct(item) && (
                    <div className="text-xs md:text-sm text-gray-500">부터</div>
                  )}
                  <div className="text-xl md:text-2xl lg:text-3xl text-blue-600 font-bold">{(item.price || 0).toLocaleString()}원</div>
                  {!isPopupProduct(item) && (
                    <div className="text-xs md:text-sm text-gray-500">/ 1인</div>
                  )}
                </div>
              </div>
            </div>

            {/* 예약 옵션 선택 - 팝업 카테고리가 아닐 때만 표시 */}
            {!isPopupProduct(item) && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>상품 옵션 선택</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* 성인 옵션 */}
                  <div className="p-4 border rounded-lg hover:border-blue-500 transition-colors cursor-pointer bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">성인</h3>
                        <p className="text-sm text-gray-600">만 13세 이상</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {(item.price || 0).toLocaleString()}원
                        </div>
                        <div className="text-xs text-gray-500">1인 기준</div>
                      </div>
                    </div>
                  </div>

                  {/* 아동 옵션 */}
                  {item.childPrice && item.childPrice > 0 && (
                    <div className="p-4 border rounded-lg hover:border-blue-500 transition-colors cursor-pointer bg-white">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">아동</h3>
                          <p className="text-sm text-gray-600">만 6세 ~ 12세</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {item.childPrice.toLocaleString()}원
                          </div>
                          <div className="text-xs text-gray-500">1인 기준</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 어린이 옵션 */}
                  {item.infantPrice && item.infantPrice > 0 && (
                    <div className="p-4 border rounded-lg hover:border-blue-500 transition-colors cursor-pointer bg-white">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">어린이</h3>
                          <p className="text-sm text-gray-600">만 0세 ~ 12세</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {item.infantPrice.toLocaleString()}원
                          </div>
                          <div className="text-xs text-gray-500">1인 기준</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 선택 안내 */}
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <CheckCircle className="inline h-4 w-4 mr-1" />
                      우측 결제하기에서 날짜와 인원을 선택하세요
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation Tabs (Sticky) */}
            <div className="sticky top-16 z-10 bg-white border-b shadow-sm mb-6 -mx-4 px-4">
              <div className={`grid w-full ${isPopupProduct(item) ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'} gap-1 max-w-6xl mx-auto`}>
                <button
                  onClick={() => scrollToSection('description')}
                  className={`py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 ${
                    activeTab === 'description'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  소개
                </button>
                {!isPopupProduct(item) && (
                  <button
                    onClick={() => scrollToSection('location')}
                    className={`py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 ${
                      activeTab === 'location'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    위치
                  </button>
                )}
                <button
                  onClick={() => scrollToSection('policy')}
                  className={`py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 ${
                    activeTab === 'policy'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  정책
                </button>
                <button
                  onClick={() => scrollToSection('reviews')}
                  className={`py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 col-span-2 md:col-span-1 ${
                    activeTab === 'reviews'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  리뷰 ({reviews.length})
                </button>
              </div>
            </div>

              <div id="description" className="space-y-6 scroll-mt-24">
                <Card>
                  <CardHeader>
                    <CardTitle>상품 소개</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* 상세 소개 - 이미지 또는 텍스트 */}
                    {(item as any).descriptionType === 'image' && (item as any).descriptionImageUrl ? (
                      <div className="my-6">
                        <ImageWithFallback
                          src={(item as any).descriptionImageUrl}
                          alt={`${item.title} 상세 소개`}
                          className="w-full rounded-lg"
                        />
                      </div>
                    ) : item.description ? (
                      <div className="my-6 prose max-w-none">
                        <div
                          className="text-gray-700 leading-relaxed whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: item.description }}
                        />
                      </div>
                    ) : null}

                    {/* 팝업 카테고리가 아닐 때만 특징 표시 */}
                    {!isPopupProduct(item) && (
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
                    )}
                  </CardContent>
                </Card>
              </div>


              {/* 팝업 카테고리가 아닐 때만 위치 섹션 표시 */}
              {!isPopupProduct(item) && (
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
                        <p className="text-gray-700">{item.address || item.location}</p>
                        {item.address && item.location && item.address !== item.location && (
                          <p className="text-gray-600 text-sm mt-1">({item.location})</p>
                        )}
                      </div>

                      {/* 향상된 구글 지도 */}
                      <div className="w-full">
                        <div className="w-full h-[300px] md:h-[400px] lg:h-[500px] bg-gray-200 rounded-lg overflow-hidden relative">
                          {getGoogleMapsApiKey() ? (
                            <>
                              <iframe
                                src={
                                  (item as any).coordinates
                                    ? `https://www.google.com/maps/embed/v1/place?key=${getGoogleMapsApiKey()}&q=${(item as any).coordinates}&zoom=15&maptype=roadmap&language=ko`
                                    : `https://www.google.com/maps/embed/v1/place?key=${getGoogleMapsApiKey()}&q=${encodeURIComponent((item.address || item.location) + ' 신안군')}&zoom=14&maptype=roadmap&language=ko`
                                }
                                className="w-full h-full border-0"
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title={`${item.title} 위치 지도`}
                                onError={() => {
                                  console.error('Google Maps iframe 로드 실패');
                                }}
                              />
                              {/* 지도 오버레이 버튼들 */}
                              <div className="absolute top-4 right-4 flex flex-col gap-2">
                                <Button
                                  size="sm"
                                  className="bg-white/90 text-gray-700 hover:bg-white shadow-lg"
                                  onClick={() => {
                                    const query = (item as any).coordinates || encodeURIComponent(item.location + ' 신안군');
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
                                    const destination = (item as any).coordinates || encodeURIComponent(item.location + ' 신안군');
                                    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
                                    window.open(directionsUrl, '_blank');
                                  }}
                                >
                                  <MapPin className="h-3 w-3 mr-1" />
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
                                      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location + ' 신안군')}`;
                                      window.open(mapUrl, '_blank');
                                    }}
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Google Maps에서 보기
                                  </Button>
                                  <p className="text-xs text-gray-400">주소: {item.location}</p>
                                </div>
                              </div>
                            </div>
                          )}
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
                </div>
              )}

              {/* 정책 섹션 - 모든 카테고리에 표시 (법적 필수) */}
              <div id="policy" className="space-y-6 scroll-mt-24">
                {/* 취소 및 환불 정책 - 카테고리별 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5" />
                      취소 및 환불 정책
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isPopupProduct(item) ? (
                      <>
                        {/* 팝업 스토어 상품 (배송형) */}
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                          <h4 className="font-semibold text-purple-900 mb-2">팝업 스토어 상품 (배송형)</h4>

                          {item.is_refundable === false ? (
                            /* 환불 불가 */
                            <div className="flex items-start gap-2 text-sm text-red-700">
                              <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <span><strong>환불 불가:</strong> 이 상품은 환불이 불가능합니다</span>
                            </div>
                          ) : (
                            /* 환불 가능 */
                            <ul className="space-y-2 text-sm text-gray-700">
                              <li className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span><strong>배송 전:</strong> 무료 취소 가능</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span><strong>배송 후:</strong> 상품 수령일로부터 7일 이내 반품 가능</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                <span><strong>단순 변심:</strong> 반품 배송비(3,000원) 고객 부담</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <span><strong>환불 불가:</strong> 제품 및 패키지 훼손, 구성품 누락, 사용 흔적이 있는 경우</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span><strong>제품 하자:</strong> 제품 하자 시 무료 반품/교환 가능</span>
                              </li>
                            </ul>
                          )}
                        </div>

                        {/* 교환/반품 주소 */}
                        {item.is_refundable !== false && (
                          <div className="space-y-2">
                            <h4 className="font-semibold">교환/반품 주소</h4>
                            <p className="text-sm text-gray-700">[21404] 인천광역시 부평구 세월천로6 A동 604호</p>
                            <p className="text-sm text-gray-600">담당자: 이재원 010-5720-8350</p>
                            <p className="text-sm text-amber-600 font-medium">⚠️ 반품 시 송장번호를 담당자에게 필수로 전달해주세요</p>
                          </div>
                        )}

                        {/* 배송 및 반품비 정책 */}
                        <div className="border-t pt-3 space-y-2">
                          <h4 className="font-semibold">배송 및 반품비 정책</h4>
                          <ul className="space-y-1 text-sm text-gray-700">
                            <li>• 배송사: CJ대한통운</li>
                            <li>• 기본 배송비: 3,000원</li>
                            <li>• 50,000원 이상 구매 시: 무료 배송</li>
                            <li>• 반품 배송비: 3,000원 편도 (단순 변심 시 고객 부담)</li>
                            <li>• 교환 배송비: 6,000원 왕복 (단순 변심 시 고객 부담)</li>
                            <li>• 제품 하자 시: 배송비 무료 (판매자 부담)</li>
                          </ul>
                        </div>

                        {/* 환불 처리 안내 */}
                        <div className="border-t pt-3 space-y-2">
                          <h4 className="font-semibold">환불 처리 안내</h4>
                          <ul className="space-y-1 text-sm text-gray-700">
                            <li>• 환불 요청 후 영업일 기준 3~5일 이내 처리</li>
                            <li>• 결제 수단별 처리 시점 상이</li>
                            <li className="ml-4">- 카드 결제: 카드사 정책에 따라 영업일 기준 3~7일</li>
                            <li className="ml-4">- 계좌 이체: 영업일 기준 1~3일</li>
                            <li>• 환불은 결제 시 사용한 동일 수단으로 진행됩니다</li>
                          </ul>
                        </div>

                        {/* 취소·환불 문의 */}
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <Phone className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="font-semibold text-blue-900 mb-1">취소·환불 문의</h4>
                              <p className="text-sm text-gray-700">고객센터: 0504-0811-1330</p>
                              <p className="text-sm text-gray-600">운영시간: 평일 09:00~18:00 (주말/공휴일 휴무)</p>
                            </div>
                          </div>
                        </div>

                        {/* 환불 지연 시 지연배상금 */}
                        <div className="border-t pt-3">
                          <h4 className="font-semibold mb-2">환불 지연 시 지연배상금</h4>
                          <p className="text-sm text-gray-700">
                            청약철회 후 판매자가 재화 등을 반환받은 날로부터 3영업일 이내 환급이 이루어지지 않을 경우,
                            지연 기간에 대해 연 15%의 지연배상금을 청구할 수 있습니다.
                          </p>
                        </div>
                      </>
                    ) : null}
                    {/*
                    ) : item?.category === '여행' ? (
                      <>
                        {/* 여행 상품 *\/}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-semibold text-blue-900 mb-2">여행 상품</h4>
                          <ul className="space-y-2 text-sm text-gray-700">
                            <li className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span><strong>출발 7일 전:</strong> 100% 환불 (수수료 없음)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                              <span><strong>출발 3-7일 전:</strong> 50% 환불 (취소 수수료 50%)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <span><strong>출발 3일 이내:</strong> 환불 불가</span>
                            </li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">주의사항</h4>
                          <ul className="space-y-1 text-sm text-gray-700">
                            <li>• 악천후 시 일정 변경 또는 전액 환불 가능</li>
                            <li>• 최소 출발 인원 미달 시 취소 및 전액 환불</li>
                            <li>• 안전상의 이유로 참여 제한 가능 (전액 환불)</li>
                          </ul>
                        </div>
                      </>
                    ) : item?.category === '숙박' ? (
                      <>
                        {/* 숙박 상품 *\/}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="font-semibold text-green-900 mb-2">숙박 상품</h4>
                          <ul className="space-y-2 text-sm text-gray-700">
                            <li className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span><strong>체크인 7일 전:</strong> 무료 취소 (100% 환불)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                              <span><strong>체크인 3-7일 전:</strong> 50% 환불 (취소 수수료 50%)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <span><strong>체크인 3일 이내:</strong> 환불 불가 (No-Show 포함)</span>
                            </li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">추가 안내</h4>
                          <ul className="space-y-1 text-sm text-gray-700">
                            <li>• 체크인 시간: 15:00 / 체크아웃: 11:00</li>
                            <li>• 조기 체크인/늦은 체크아웃은 숙소 문의</li>
                            <li>• 예약 변경은 취소 후 재예약 필요</li>
                          </ul>
                        </div>
                      </>
                    ) : item?.category === '렌트카' ? (
                      <>
                        {/* 렌트카 상품 *\/}
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                          <h4 className="font-semibold text-orange-900 mb-2">렌트카 상품</h4>
                          <ul className="space-y-2 text-sm text-gray-700">
                            <li className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span><strong>픽업 3일 전:</strong> 무료 취소 (100% 환불)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                              <span><strong>픽업 1-3일 전:</strong> 취소 수수료 30% 부과</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <span><strong>픽업 당일:</strong> 취소 수수료 50% 부과</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <span><strong>No-Show:</strong> 환불 불가</span>
                            </li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">보증금 안내</h4>
                          <ul className="space-y-1 text-sm text-gray-700">
                            <li>• 픽업 시 보증금 사전승인 (50,000원)</li>
                            <li>• 반납 후 이상 없을 시 자동 해제</li>
                            <li>• 차량 손상 시 수리비 청구 가능</li>
                          </ul>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* 기타 상품 *\/}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <ul className="space-y-2 text-sm text-gray-700">
                            <li className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span><strong>이용 7일 전:</strong> 무료 취소 가능</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                              <span><strong>이용 3-7일 전:</strong> 50% 환불</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <X className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <span><strong>이용 3일 이내:</strong> 환불 불가</span>
                            </li>
                          </ul>
                        </div>
                      </>
                    )}
                    */}

                    {/* 공통 환불 안내 - 팝업이 아닌 경우만 표시 */}
                    {!isPopupProduct(item) && (
                      <>
                        <div className="border-t pt-4">
                          <h4 className="font-semibold mb-2">환불 처리 안내</h4>
                          <ul className="space-y-1 text-sm text-gray-600">
                            <li>• 환불 요청 후 영업일 기준 3-5일 내 처리</li>
                            <li>• 결제 수단에 따라 환불 시점이 다를 수 있음</li>
                            <li>• 카드 결제: 카드사 정책에 따라 영업일 기준 3-7일</li>
                            <li>• 계좌 이체: 영업일 기준 1-3일</li>
                          </ul>
                        </div>

                        {/* 고객센터 안내 */}
                        <div className="bg-blue-50 rounded-lg p-4 mt-4">
                          <div className="flex items-start gap-3">
                            <Phone className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="font-semibold text-blue-900 mb-1">취소/환불 문의</h4>
                              <p className="text-sm text-gray-700">고객센터: 0504-0811-1330</p>
                              <p className="text-sm text-gray-600">평일 09:00 - 18:00 (주말/공휴일 휴무)</p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* 상품정보 제공고시 (법적 필수 - 전자상거래법) */}
                <Card>
                  <CardHeader>
                    <CardTitle>상품정보 제공고시</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="font-semibold text-gray-700">상품명:</span>
                        <span className="ml-2 text-gray-600">{item.title}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">판매가:</span>
                        <span className="ml-2 text-gray-600">{item.price?.toLocaleString()}원</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">판매자:</span>
                        <span className="ml-2 text-gray-600">{(item as any).partner?.business_name || '트래블립'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">카테고리:</span>
                        <span className="ml-2 text-gray-600">{item.category}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">제공지역:</span>
                        <span className="ml-2 text-gray-600">{item.location}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">이용기간:</span>
                        <span className="ml-2 text-gray-600">예약일로부터 1일</span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-semibold text-gray-700">취소/환불 조건:</span>
                        <span className="ml-2 text-gray-600">전자상거래 등에서의 소비자보호에 관한 법률 및 소비자분쟁해결기준에 따름</span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-semibold text-gray-700">소비자상담 관련 전화번호:</span>
                        <span className="ml-2 text-gray-600">{(item as any).partner?.contact_phone || '1588-0000'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 교환/반품 정보 (법적 필수 - 소비자보호법) */}
                <Card>
                  <CardHeader>
                    <CardTitle>교환 및 반품 정보</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-semibold mb-2">교환 및 반품이 가능한 경우</h4>
                      <ul className="space-y-1 text-gray-700">
                        <li>• 상품을 공급 받으신 날로부터 7일 이내</li>
                        <li>• 공급받으신 상품이 표시·광고 내용과 다르거나 계약내용과 다르게 이행된 경우</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">교환 및 반품이 불가능한 경우</h4>
                      <ul className="space-y-1 text-gray-700">
                        <li>• 시간의 경과에 의해 재판매가 곤란한 경우</li>
                        <li>• 복제가 가능한 상품의 포장을 훼손한 경우</li>
                        <li>• 소비자의 책임 있는 사유로 상품 등이 멸실 또는 훼손된 경우</li>
                        <li>• 소비자의 사용 또는 일부 소비에 의하여 상품의 가치가 현저히 감소한 경우</li>
                      </ul>
                    </div>
                    {/* 팝업 상품 배송비 정책 */}
                    {isPopupProduct(item) && (
                      <div>
                        <h4 className="font-semibold mb-2">배송비 정책</h4>
                        <ul className="space-y-1 text-gray-700">
                          <li>• <span className="font-medium">50,000원 이상 구매 시:</span> 무료 배송</li>
                          <li>• <span className="font-medium">50,000원 미만 구매 시:</span> 배송비 3,000원</li>
                          <li>• <span className="font-medium">반품 시:</span> 추가 배송비 3,000원 (고객 부담)</li>
                        </ul>
                      </div>
                    )}

                    <div>
                      <h4 className="font-semibold mb-2">반품 배송비</h4>
                      <p className="text-gray-700">
                        {isPopupProduct(item)
                          ? '제품 하자가 아닌 소비자의 단순 변심에 따른 반품 시 반품 배송비(3,000원)가 부과됩니다.'
                          : '제품 하자가 아닌 소비자의 단순 변심에 따른 반품 시 반품 배송비(3,000원)가 부과됩니다.'
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* 사업자 정보 (법적 필수) */}
                <Card>
                  <CardHeader>
                    <CardTitle>사업자 정보</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="font-semibold text-gray-700">상호명:</span>
                        <span className="ml-2 text-gray-600">{(item as any).partner?.business_name || 'travleap'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">대표자:</span>
                        <span className="ml-2 text-gray-600">{(item as any).partner?.representative_name || '함은비'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">사업자등록번호:</span>
                        <span className="ml-2 text-gray-600">{(item as any).partner?.business_registration_number || '268-87-01436'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">통신판매업 신고번호:</span>
                        <span className="ml-2 text-gray-600">{(item as any).partner?.online_business_registration_number || '2020-전남목포-0368'}</span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-semibold text-gray-700">사업장 소재지:</span>
                        <span className="ml-2 text-gray-600">{(item as any).partner?.address || '전라남도 목포시 원산중앙로 44 2층 (우: 58636)'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">대표 전화:</span>
                        <span className="ml-2 text-gray-600">{(item as any).partner?.contact_phone || '0504-0811-1330'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">이메일:</span>
                        <span className="ml-2 text-gray-600">{(item as any).partner?.contact_email || 'awesomeplan4606@naver.com'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* A/S 안내 및 제조국 정보 (법적 필수) */}
                <Card>
                  <CardHeader>
                    <CardTitle>A/S 안내</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="font-semibold text-gray-700">A/S 책임자:</span>
                        <span className="ml-2 text-gray-600">트래블립 고객센터</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">전화번호:</span>
                        <span className="ml-2 text-gray-600">0504-0811-1330</span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-semibold text-gray-700">이메일:</span>
                        <span className="ml-2 text-gray-600">awesomeplan4606@naver.com</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">제조국:</span>
                        <span className="ml-2 text-gray-600">대한민국</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">제조사:</span>
                        <span className="ml-2 text-gray-600">어썸플랜 (Awesome Plan)</span>
                      </div>
                    </div>
                    <div className="border-t pt-3 mt-3">
                      <h4 className="font-semibold text-gray-700 mb-2">품질보증 기준</h4>
                      <ul className="space-y-1 text-gray-700">
                        <li>• 본 상품은 공정거래위원회 고시 「소비자분쟁해결기준」에 따라 보상받을 수 있습니다.</li>
                        <li>• 제품 하자 발생 시 동일 상품으로 교환 또는 환불이 가능합니다.</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* 소비자 보호 정보 (법적 필수) */}
                <Card>
                  <CardHeader>
                    <CardTitle>소비자 피해보상 및 분쟁처리</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-gray-700">
                    <p>소비자분쟁해결기준(공정거래위원회 고시) 및 관계법령에 따릅니다.</p>
                    <div>
                      <h4 className="font-semibold mb-1">분쟁처리 기관</h4>
                      <ul className="space-y-1">
                        <li>• 한국소비자원: 국번없이 1372</li>
                        <li>• 공정거래위원회: 국번없이 1301</li>
                        <li>• 전자거래분쟁조정위원회: www.ecmc.or.kr</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">환불 지연 시 지연배상금</h4>
                      <p>
                        전자상거래 등에서의 소비자보호에 관한 법률에 따라 소비자의 청약철회 후
                        판매자가 재화 등을 반환받은 날로부터 3영업일 이내에 지급받은 대금의 환급을
                        정당한 사유 없이 지연하는 때에는 소비자는 지연기간에 대해서 연 15%의
                        지연배상금을 판매자에게 청구할 수 있습니다.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

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
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 lg:top-36 z-0">
              <Card>
                <CardHeader>
                  <CardTitle>결제하기</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!showBookingForm ? (
                    <>
                      {/* 팝업 카테고리: 옵션 + 수량 선택 */}
                      {isPopupProduct(item) ? (
                        <div className="space-y-4">
                          {/* 옵션 선택 */}
                          {productOptions.length > 0 && (
                            <div>
                              <label className="block text-sm font-medium mb-2">옵션 선택 *</label>
                              <select
                                value={selectedOption?.id || ''}
                                onChange={(e) => {
                                  const option = productOptions.find(opt => opt.id === parseInt(e.target.value));
                                  setSelectedOption(option || null);
                                }}
                                className="w-full border rounded-md px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">옵션을 선택하세요</option>
                                {productOptions.map((option: any) => (
                                  <option key={option.id} value={option.id} disabled={!option.is_available || (option.stock !== null && option.stock <= 0)}>
                                    {option.option_name}: {option.option_value}
                                    {option.price_adjustment > 0 && ` (+${option.price_adjustment.toLocaleString()}원)`}
                                    {option.price_adjustment < 0 && ` (${option.price_adjustment.toLocaleString()}원)`}
                                    {option.stock !== null && ` - 재고: ${option.stock}개`}
                                    {!option.is_available && ' (품절)'}
                                  </option>
                                ))}
                              </select>
                              {selectedOption && (
                                <div className="mt-2 text-sm text-gray-600">
                                  선택한 옵션: {selectedOption.option_name} - {selectedOption.option_value}
                                  {selectedOption.price_adjustment !== 0 && (
                                    <span className="ml-2 font-medium text-blue-600">
                                      ({selectedOption.price_adjustment > 0 ? '+' : ''}{selectedOption.price_adjustment.toLocaleString()}원)
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 수량 선택 */}
                          <div>
                            <label className="block text-sm font-medium mb-2">수량</label>
                            <div className="border rounded-md p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">상품 개수</div>
                                  <div className="text-xs text-gray-500">
                                    {(() => {
                                      // @ts-ignore
                                      const minPurchase = item.minPurchase || 1;
                                      // @ts-ignore
                                      const maxPurchase = item.maxPurchase;
                                      const optionStock = selectedOption?.stock;

                                      let text = `최소 ${minPurchase}개`;
                                      if (maxPurchase) text += `, 최대 ${maxPurchase}개`;
                                      if (optionStock !== null && optionStock !== undefined) {
                                        text += ` (재고: ${optionStock}개)`;
                                      }
                                      return text;
                                    })()}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      // @ts-ignore
                                      const minPurchase = item.minPurchase || 1;
                                      setQuantity(Math.max(minPurchase, quantity - 1));
                                    }}
                                    disabled={(() => {
                                      // @ts-ignore
                                      const minPurchase = item.minPurchase || 1;
                                      return quantity <= minPurchase;
                                    })()}
                                    className="h-9 w-9 p-0"
                                  >
                                    -
                                  </Button>
                                  <input
                                    type="number"
                                    min={
                                      // @ts-ignore
                                      item.minPurchase || 1
                                    }
                                    max={(() => {
                                      // @ts-ignore
                                      const maxPurchase = item.maxPurchase;
                                      const optionStock = selectedOption?.stock;

                                      let max = maxPurchase || 9999;
                                      if (optionStock !== null && optionStock !== undefined) {
                                        max = Math.min(max, optionStock);
                                      }
                                      return max;
                                    })()}
                                    value={quantity}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value) || 1;
                                      // @ts-ignore
                                      const minPurchase = item.minPurchase || 1;
                                      // @ts-ignore
                                      const maxPurchase = item.maxPurchase;
                                      const optionStock = selectedOption?.stock;

                                      let max = maxPurchase || 9999;
                                      if (optionStock !== null && optionStock !== undefined) {
                                        max = Math.min(max, optionStock);
                                      }

                                      setQuantity(Math.max(minPurchase, Math.min(max, value)));
                                    }}
                                    placeholder="수량 입력"
                                    className="w-28 text-center text-xl font-bold border-2 rounded-md px-3 py-2 focus:border-blue-500 focus:outline-none"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      // @ts-ignore
                                      const maxPurchase = item.maxPurchase;
                                      const optionStock = selectedOption?.stock;

                                      let max = maxPurchase || 9999;
                                      if (optionStock !== null && optionStock !== undefined) {
                                        max = Math.min(max, optionStock);
                                      }

                                      setQuantity(Math.min(max, quantity + 1));
                                    }}
                                    disabled={(() => {
                                      // @ts-ignore
                                      const maxPurchase = item.maxPurchase;
                                      const optionStock = selectedOption?.stock;

                                      let max = maxPurchase || 9999;
                                      if (optionStock !== null && optionStock !== undefined) {
                                        max = Math.min(max, optionStock);
                                      }

                                      return quantity >= max;
                                    })()}
                                    className="h-9 w-9 p-0"
                                  >
                                    +
                                  </Button>
                                </div>
                              </div>

                              {/* 빠른 수량 추가 버튼 */}
                              <div className="flex items-center gap-2 pt-2 border-t">
                                <span className="text-xs text-gray-600">빠른 추가:</span>
                                {[10, 50, 100, 500].map((amount) => {
                                  // @ts-ignore
                                  const maxPurchase = item.maxPurchase;
                                  const optionStock = selectedOption?.stock;
                                  let max = maxPurchase || 9999;
                                  if (optionStock !== null && optionStock !== undefined) {
                                    max = Math.min(max, optionStock);
                                  }
                                  const canAdd = quantity + amount <= max;

                                  return (
                                    <Button
                                      key={amount}
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setQuantity(Math.min(max, quantity + amount));
                                      }}
                                      disabled={!canAdd}
                                      className="h-7 px-3 text-xs"
                                    >
                                      +{amount}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* 일반 카테고리: 날짜 + 옵션 + 인원 선택 */}
                          <div>
                            <label className="block text-sm mb-2">날짜 선택</label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left min-h-[44px]"
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
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* 옵션 선택 (메뉴/시간대/좌석등급) - 옵션이 있는 경우만 표시 */}
                          {productOptions.length > 0 && (
                            <div className="space-y-3">
                              {/* 메뉴 옵션 (음식) */}
                              {productOptions.some((opt: any) => opt.option_type === 'menu') && (
                                <div>
                                  <label className="block text-sm font-medium mb-2">메뉴 선택</label>
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {productOptions
                                      .filter((opt: any) => opt.option_type === 'menu')
                                      .map((option: any) => (
                                        <div
                                          key={option.id}
                                          className={`border rounded-lg p-3 cursor-pointer transition-all ${
                                            selectedOption?.id === option.id
                                              ? 'border-blue-500 bg-blue-50'
                                              : 'border-gray-200 hover:border-gray-400'
                                          }`}
                                          onClick={() => setSelectedOption(option)}
                                        >
                                          <div className="flex justify-between items-start">
                                            <div>
                                              <div className="font-medium">{option.name}</div>
                                              {option.description && (
                                                <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                                              )}
                                            </div>
                                            <div className="text-right">
                                              <div className="font-semibold text-blue-600">
                                                {option.price?.toLocaleString()}원
                                              </div>
                                              {option.original_price && option.original_price > option.price && (
                                                <div className="text-xs text-gray-400 line-through">
                                                  {option.original_price.toLocaleString()}원
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}

                              {/* 시간대 옵션 (관광지/체험/행사) */}
                              {productOptions.some((opt: any) => opt.option_type === 'time_slot') && (
                                <div>
                                  <label className="block text-sm font-medium mb-2">시간 선택</label>
                                  <div className="grid grid-cols-3 gap-2">
                                    {productOptions
                                      .filter((opt: any) => opt.option_type === 'time_slot')
                                      .map((option: any) => (
                                        <Button
                                          key={option.id}
                                          type="button"
                                          variant={selectedOption?.id === option.id ? 'default' : 'outline'}
                                          className={`h-auto py-2 px-3 ${
                                            option.available_count !== null && option.available_count <= 0
                                              ? 'opacity-50 cursor-not-allowed'
                                              : ''
                                          }`}
                                          onClick={() => {
                                            if (option.available_count === null || option.available_count > 0) {
                                              setSelectedOption(option);
                                              if (option.start_time) {
                                                setStartTime(option.start_time);
                                              }
                                            }
                                          }}
                                          disabled={option.available_count !== null && option.available_count <= 0}
                                        >
                                          <div className="text-center">
                                            <div className="font-medium">
                                              {option.start_time?.slice(0, 5)}
                                              {option.end_time && ` - ${option.end_time.slice(0, 5)}`}
                                            </div>
                                            {option.available_count !== null && (
                                              <div className="text-xs text-gray-500">
                                                {option.available_count > 0 ? `${option.available_count}명 가능` : '마감'}
                                              </div>
                                            )}
                                            {option.price > 0 && (
                                              <div className="text-xs text-blue-600">
                                                +{option.price.toLocaleString()}원
                                              </div>
                                            )}
                                          </div>
                                        </Button>
                                      ))}
                                  </div>
                                </div>
                              )}

                              {/* 좌석등급 옵션 (행사) */}
                              {productOptions.some((opt: any) => opt.option_type === 'seat_class') && (
                                <div>
                                  <label className="block text-sm font-medium mb-2">좌석 등급</label>
                                  <div className="space-y-2">
                                    {productOptions
                                      .filter((opt: any) => opt.option_type === 'seat_class')
                                      .map((option: any) => (
                                        <div
                                          key={option.id}
                                          className={`border rounded-lg p-3 cursor-pointer transition-all ${
                                            selectedOption?.id === option.id
                                              ? 'border-blue-500 bg-blue-50'
                                              : 'border-gray-200 hover:border-gray-400'
                                          } ${
                                            option.available_count !== null && option.available_count <= 0
                                              ? 'opacity-50 cursor-not-allowed'
                                              : ''
                                          }`}
                                          onClick={() => {
                                            if (option.available_count === null || option.available_count > 0) {
                                              setSelectedOption(option);
                                            }
                                          }}
                                        >
                                          <div className="flex justify-between items-center">
                                            <div>
                                              <div className="font-medium">{option.name}</div>
                                              {option.description && (
                                                <div className="text-xs text-gray-500">{option.description}</div>
                                              )}
                                              {option.available_count !== null && (
                                                <div className="text-xs text-orange-500 mt-1">
                                                  {option.available_count > 0 ? `${option.available_count}석 남음` : '매진'}
                                                </div>
                                              )}
                                            </div>
                                            <div className="text-right">
                                              <div className="font-semibold text-blue-600">
                                                {option.price?.toLocaleString()}원
                                              </div>
                                              {option.original_price && option.original_price > option.price && (
                                                <div className="text-xs text-gray-400 line-through">
                                                  {option.original_price.toLocaleString()}원
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}

                              {/* 패키지/기타 옵션 */}
                              {productOptions.some((opt: any) => ['package', 'addon'].includes(opt.option_type)) && (
                                <div>
                                  <label className="block text-sm font-medium mb-2">옵션 선택</label>
                                  <div className="space-y-2">
                                    {productOptions
                                      .filter((opt: any) => ['package', 'addon'].includes(opt.option_type))
                                      .map((option: any) => (
                                        <div
                                          key={option.id}
                                          className={`border rounded-lg p-3 cursor-pointer transition-all ${
                                            selectedOption?.id === option.id
                                              ? 'border-blue-500 bg-blue-50'
                                              : 'border-gray-200 hover:border-gray-400'
                                          }`}
                                          onClick={() => setSelectedOption(option)}
                                        >
                                          <div className="flex justify-between items-center">
                                            <div>
                                              <div className="font-medium">{option.name}</div>
                                              {option.description && (
                                                <div className="text-xs text-gray-500">{option.description}</div>
                                              )}
                                            </div>
                                            <div className="font-semibold text-blue-600">
                                              {option.price > 0 ? `+${option.price.toLocaleString()}원` : '무료'}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}

                              {/* 선택된 옵션 요약 */}
                              {selectedOption && (
                                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-600">선택한 옵션:</span>
                                    <span className="font-medium">{selectedOption.name}</span>
                                  </div>
                                  {selectedOption.price > 0 && selectedOption.option_type !== 'menu' && selectedOption.option_type !== 'seat_class' && (
                                    <div className="flex justify-between items-center mt-1">
                                      <span className="text-gray-600">추가 금액:</span>
                                      <span className="font-medium text-blue-600">+{selectedOption.price.toLocaleString()}원</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="space-y-3">
                            <label className="block text-sm font-medium mb-2">인원</label>

                            {/* 성인 */}
                            <div className="flex items-center justify-between border rounded-md px-4 py-3">
                              <div>
                                <div className="font-medium">성인</div>
                                <div className="text-xs text-gray-500">18세 이상</div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setAdults(Math.max(0, adults - 1))}
                                  disabled={adults <= 0}
                                  className="h-8 w-8 p-0"
                                >
                                  -
                                </Button>
                                <span className="text-lg font-medium w-8 text-center">{adults}</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setAdults(adults + 1)}
                                  disabled={(adults + children + infants) >= (item?.maxCapacity || 100)}
                                  className="h-8 w-8 p-0"
                                >
                                  +
                                </Button>
                              </div>
                            </div>

                            {/* 미성년자 - 가격 설정된 경우만 표시 */}
                            {item.childPrice && item.childPrice > 0 && (
                              <div className="flex items-center justify-between border rounded-md px-4 py-3">
                                <div>
                                  <div className="font-medium">미성년자</div>
                                  <div className="text-xs text-gray-500">13-17세</div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setChildren(Math.max(0, children - 1))}
                                    disabled={children <= 0}
                                    className="h-8 w-8 p-0"
                                  >
                                    -
                                  </Button>
                                  <span className="text-lg font-medium w-8 text-center">{children}</span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setChildren(children + 1)}
                                    disabled={(adults + children + infants) >= (item?.maxCapacity || 100)}
                                    className="h-8 w-8 p-0"
                                  >
                                    +
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* 어린이 - 가격 설정된 경우만 표시 */}
                            {item.infantPrice && item.infantPrice > 0 && (
                              <div className="flex items-center justify-between border rounded-md px-4 py-3">
                                <div>
                                  <div className="font-medium">어린이</div>
                                  <div className="text-xs text-gray-500">0-12세</div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setInfants(Math.max(0, infants - 1))}
                                    disabled={infants <= 0}
                                    className="h-8 w-8 p-0"
                                  >
                                    -
                                  </Button>
                                  <span className="text-lg font-medium w-8 text-center">{infants}</span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setInfants(infants + 1)}
                                    disabled={(adults + children + infants) >= (item?.maxCapacity || 100)}
                                    className="h-8 w-8 p-0"
                                  >
                                    +
                                  </Button>
                                </div>
                              </div>
                            )}

                            <p className="text-xs text-gray-500">
                              최대 {item?.maxCapacity || 100}명 | 총 {adults + children + infants}명
                            </p>
                          </div>
                        </>
                      )}

                      <div className="border-t pt-4 space-y-2">
                        {isPopupProduct(item) ? (
                          <>
                            {/* 팝업: 수량 x 가격 */}
                            <div className="flex justify-between items-center text-sm">
                              <span>상품 기본 가격</span>
                              <span>{(item.price || 0).toLocaleString()}원</span>
                            </div>
                            {selectedOption && selectedOption.price_adjustment !== 0 && (
                              <div className="flex justify-between items-center text-sm">
                                <span>옵션 추가금</span>
                                <span className={selectedOption.price_adjustment > 0 ? 'text-blue-600' : 'text-green-600'}>
                                  {selectedOption.price_adjustment > 0 ? '+' : ''}{selectedOption.price_adjustment.toLocaleString()}원
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-sm">
                              <span>수량</span>
                              <span>x {quantity}개</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t text-lg font-semibold">
                              <span>총 금액</span>
                              <span className="text-blue-600">
                                {(((item.price || 0) + (selectedOption?.price_adjustment || 0)) * quantity).toLocaleString()}원
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* 일반: 인원별 가격 */}
                            {adults > 0 && (
                              <div className="flex justify-between items-center text-sm">
                                <span>성인</span>
                                <span>{(item.price || 0).toLocaleString()}원 x {adults}명</span>
                              </div>
                            )}
                            {children > 0 && item.childPrice && item.childPrice > 0 && (
                              <div className="flex justify-between items-center text-sm">
                                <span>미성년자</span>
                                <span>{item.childPrice.toLocaleString()}원 x {children}명</span>
                              </div>
                            )}
                            {infants > 0 && item.infantPrice && item.infantPrice > 0 && (
                              <div className="flex justify-between items-center text-sm">
                                <span>어린이</span>
                                <span>{item.infantPrice.toLocaleString()}원 x {infants}명</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center pt-2 border-t text-lg font-semibold">
                              <span>총 금액</span>
                              <span className="text-blue-600">{priceCalculation.total.toLocaleString()}원</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* 장바구니 추가 버튼 */}
                      <Button
                        variant="outline"
                        className="w-full min-h-[48px] text-sm md:text-base"
                        size="lg"
                        onClick={addToCartHandler}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        장바구니 담기
                      </Button>

                      <Button
                        className="w-full min-h-[48px] text-sm md:text-base"
                        size="lg"
                        onClick={() => {
                          if (!isLoggedIn) {
                            toast.error('로그인이 필요합니다');
                            navigate('/login');
                            return;
                          }

                          // 날짜 검증 (팝업 제외)
                          if (!isPopupProduct(item) && !selectedDate) {
                            toast.error('날짜를 선택해주세요.');
                            return;
                          }

                          // 옵션 검증 (옵션이 있는 경우 필수)
                          if (productOptions.length > 0 && !selectedOption) {
                            if (productOptions.some((opt: any) => opt.option_type === 'time_slot')) {
                              toast.error('시간대를 선택해주세요.');
                              return;
                            }
                            if (productOptions.some((opt: any) => opt.option_type === 'menu')) {
                              toast.error('메뉴를 선택해주세요.');
                              return;
                            }
                            if (productOptions.some((opt: any) => opt.option_type === 'seat_class')) {
                              toast.error('좌석 등급을 선택해주세요.');
                              return;
                            }
                            toast.error('옵션을 선택해주세요.');
                            return;
                          }

                          // ✅ 바로 PaymentPage로 이동
                          // 🔒 배송비 계산 (팝업 상품만)
                          const itemSubtotal = isPopupProduct(item)
                            ? (item.price || 0) * quantity + (selectedOption ? selectedOption.price_adjustment * quantity : 0)
                            : priceCalculation.total;

                          const isPopup = isPopupProduct(item);
                          const deliveryFee = isPopup ? (itemSubtotal >= 50000 ? 0 : 3000) : 0;
                          const totalWithDelivery = itemSubtotal + deliveryFee;

                          console.log('📦 [DetailPage] 배송비 계산:', {
                            category: item.category,
                            subtotal: itemSubtotal,
                            deliveryFee: deliveryFee,
                            total: totalWithDelivery
                          });

                          const orderData = {
                            items: [{
                              id: item.id,
                              title: item.title,
                              price: isPopupProduct(item) ? item.price : priceCalculation.basePrice,
                              quantity: isPopupProduct(item) ? quantity : 1,
                              image: Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : '',
                              category: item.category,
                              selectedDate: isPopupProduct(item) ? null : selectedDate?.toISOString().split('T')[0],
                              selectedTime: startTime || (selectedOption?.start_time?.slice(0, 5)) || null,
                              adults: isPopupProduct(item) ? quantity : adults,
                              children: isPopupProduct(item) ? 0 : children,
                              infants: isPopupProduct(item) ? 0 : infants,
                              // 일반 카테고리 + 팝업 모두 옵션 정보 포함
                              selectedOption: selectedOption ? {
                                id: selectedOption.id,
                                name: selectedOption.name || selectedOption.option_name,
                                value: selectedOption.option_value || selectedOption.description,
                                optionType: selectedOption.option_type,
                                price: selectedOption.price || 0,
                                priceAdjustment: selectedOption.price_adjustment || 0
                              } : null
                            }],
                            subtotal: itemSubtotal,
                            deliveryFee: deliveryFee,
                            total: totalWithDelivery,
                            // ✅ 쿠폰 정보 초기값 (PaymentPage에서 업데이트)
                            couponDiscount: 0,
                            couponCode: null
                          };

                          const paymentParams = new URLSearchParams({
                            title: item.title,
                            totalAmount: orderData.total.toString(),
                            customerName: user?.name || '',
                            customerEmail: user?.email || '',
                            orderData: JSON.stringify(orderData)
                          });

                          navigate(`/payment?${paymentParams.toString()}`);
                        }}
                        disabled={!isPopupProduct(item) && !selectedDate}
                      >
                        결제하기
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
                            className="min-h-[44px]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">연락처 *</label>
                          <Input
                            value={bookingData.phone}
                            onChange={(e) => setBookingData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="연락처를 입력하세요"
                            className="min-h-[44px]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">이메일</label>
                          <Input
                            type="email"
                            value={bookingData.email}
                            onChange={(e) => setBookingData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="이메일을 입력하세요"
                            className="min-h-[44px]"
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
                        <div className="text-sm text-gray-600 mb-4 space-y-1">
                          {isPopupProduct(item) ? (
                            <>
                              <div>수량: {quantity}개</div>
                              <div>총 금액: {((item.price || 0) * quantity).toLocaleString()}원</div>
                            </>
                          ) : (
                            <>
                              <div>날짜: {selectedDate && formatDate(selectedDate)}</div>
                              <div>인원: 성인 {adults}명{children > 0 ? `, 미성년자 ${children}명` : ''}{infants > 0 ? `, 어린이 ${infants}명` : ''}</div>
                              <div>총 금액: {priceCalculation.total.toLocaleString()}원</div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Button
                          className="w-full min-h-[48px] text-sm md:text-base"
                          size="lg"
                          onClick={handleBooking}
                        >
                          결제 확정
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full min-h-[48px] text-sm md:text-base"
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

        {/* Image Gallery Dialog */}
        {showImageGallery && (
          <Dialog open={showImageGallery} onOpenChange={setShowImageGallery}>
            <DialogContent className="max-w-7xl w-full h-[90vh] p-0">
              <button
                onClick={() => setShowImageGallery(false)}
                className="absolute top-4 right-4 z-50 bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm rounded-full p-2 transition-colors"
                aria-label="닫기"
              >
                <X className="h-6 w-6" />
              </button>
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <ImageWithFallback
                  src={images[currentImageIndex]}
                  alt={`${item.title} - 이미지 ${currentImageIndex + 1}/${images.length}`}
                  className="max-w-full max-h-full object-contain"
                />

                {/* Image counter */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
                  {currentImageIndex + 1} / {images.length}
                </div>

                {/* Navigation buttons */}
                {images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm w-12 h-12"
                      onClick={() => setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1)}
                      aria-label="이전 이미지"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 text-white hover:bg-black/80 backdrop-blur-sm w-12 h-12"
                      onClick={() => setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1)}
                      aria-label="다음 이미지"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}

                {/* Thumbnail strip */}
                {images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90%] overflow-x-auto px-4 py-2 bg-black/60 backdrop-blur-sm rounded-lg">
                    {images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          index === currentImageIndex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <ImageWithFallback
                          src={image}
                          alt={`썸네일 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
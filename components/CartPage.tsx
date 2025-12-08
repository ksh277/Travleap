import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import {
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  ArrowLeft,
  CreditCard,
  MapPin,
  Calendar,
  Users,
  Star,
  Gift,
  Percent,
  Heart,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Shield,
  Tag,
  Info,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { useCartStore } from '../hooks/useCartStore';
import { addToFavorites, removeFromFavorites, getFavorites } from '../utils/api';
import { ImageWithFallback } from './figma/ImageWithFallback';

// ✅ 팝업 상품 판별 헬퍼 함수
const isPopupProduct = (item: any): boolean => {
  return item.category_id === 1860 || item.category === '팝업' || item.category === 'popup';
};

interface CartItem {
  id: number;
  name?: string;
  title?: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  image: string;
  category: string;
  category_id?: number;
  location?: string;
  date?: string;
  guests?: number;
  // ✅ 투어/음식/관광지/이벤트/체험 인원 정보
  adults?: number;
  children?: number;
  infants?: number;
  seniors?: number;
  // ✅ 연령대별 가격 정보
  adultPrice?: number;
  childPrice?: number;
  infantPrice?: number;
  seniorPrice?: number;
  rating?: number;
  reviewCount?: number;
  isPartner?: boolean;
  discount?: number;
  maxQuantity?: number;
  inStock?: boolean;
  estimatedDelivery?: string;
  selectedOption?: {
    id: number;
    name: string;
    value: string;
    priceAdjustment: number;
  };
  insuranceFee?: number;  // ✅ 보험료
}

interface Coupon {
  code: string;
  discount: number;
  minAmount: number;
  description: string;
  type?: 'percentage' | 'fixed';
  expiresAt?: string;
  usageLimit?: number;
  usedCount?: number;
}

interface OrderSummary {
  items: CartItem[];
  subtotal: number;
  couponDiscount: number;
  couponCode: string | null;
  deliveryFee: number;
  insuranceFee?: number;  // ✅ 보험료 추가
  total: number;
}

export function CartPage() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const { cartItems, updateQuantity, updateAgeCounts, removeFromCart, clearCart } = useCartStore();

  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});

  // Load favorites on mount
  useEffect(() => {
    const loadFavorites = async () => {
      if (!isLoggedIn) return;

      setIsLoadingFavorites(true);
      try {
        const userFavorites = await getFavorites();
        setFavorites(userFavorites.map((fav: any) => fav.id));
      } catch (error) {
        console.error('Failed to load favorites:', error);
      } finally {
        setIsLoadingFavorites(false);
      }
    };

    loadFavorites();
  }, [isLoggedIn]);

  // 🔍 Priority 2 Improvement: Validate cart items on page load
  useEffect(() => {
    const validateCartOnLoad = async () => {
      if (!isLoggedIn || cartItems.length === 0) return;

      try {
        console.log('🔍 [장바구니 검증] 페이지 로드 시 검증 시작');

        // 서버에서 검증된 장바구니 데이터 다시 가져오기
        const response = await fetch(`/api/cart?userId=${user?.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });

        if (!response.ok) {
          console.error('❌ [장바구니 검증] API 호출 실패:', response.status);
          setIsValidating(false);
          return;
        }

        const result = await response.json();

        if (!result.success) {
          console.error('❌ [장바구니 검증] 실패:', result.error);
          return;
        }

        // 유효하지 않은 항목 찾기
        const invalidItems = result.data.filter((item: any) => item.validationStatus === 'invalid');

        if (invalidItems.length > 0) {
          console.log(`🗑️ [장바구니 검증] ${invalidItems.length}개 유효하지 않은 항목 발견`);

          // 사용자에게 알림
          const removedItemNames = invalidItems.map((item: any) =>
            `• ${item.title || '상품'} (${item.validationMessage})`
          ).join('\n');

          toast.error(
            `다음 상품이 장바구니에서 자동 제거되었습니다:\n\n${removedItemNames}`,
            {
              duration: 5000,
              style: { whiteSpace: 'pre-line' }
            }
          );

          // 유효하지 않은 항목 삭제
          for (const item of invalidItems) {
            await fetch(`/api/cart?itemId=${item.id}&userId=${user?.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              }
            });
          }

          // 장바구니 새로고침
          window.location.reload();
        } else {
          console.log('✅ [장바구니 검증] 모든 항목이 유효합니다');
        }
      } catch (error) {
        console.error('❌ [장바구니 검증] 오류:', error);
      }
    };

    // 페이지 로드 시 한 번만 실행
    validateCartOnLoad();
  }, [isLoggedIn, user?.id]); // cartItems를 의존성에서 제외하여 한 번만 실행

  // Validate cart items stock and availability (기존 로컬 검증)
  useEffect(() => {
    const validateItems = () => {
      const errors: Record<number, string> = {};

      cartItems.forEach(item => {
        if (item.inStock === false) {
          errors[item.id] = '품절된 상품입니다';
        } else if (item.maxQuantity && item.quantity > item.maxQuantity) {
          errors[item.id] = `최대 ${item.maxQuantity}개까지 구매 가능합니다`;
        }
      });

      setItemErrors(errors);
    };

    validateItems();
  }, [cartItems]);

  // Memoized calculations
  const calculations = useMemo(() => {
    // 🔧 CRITICAL FIX: 옵션 가격 포함 + 인원별 가격 계산
    const subtotal = cartItems.reduce((sum, item) => {
      let itemPrice = 0;

      // ✅ 투어/음식/관광지/이벤트/체험: 인원별 가격 계산
      if (item.adults !== undefined || item.children !== undefined || item.infants !== undefined) {
        itemPrice =
          ((item.adults || 0) * (item.adultPrice || 0)) +
          ((item.children || 0) * (item.childPrice || 0)) +
          ((item.infants || 0) * (item.infantPrice || 0));
      } else {
        // 팝업 스토어: 기본 가격 × 수량
        itemPrice = (item.price || 0) * item.quantity;
      }

      const optionPrice = item.selectedOption?.priceAdjustment || 0;
      return sum + itemPrice + (optionPrice * item.quantity);
    }, 0);

    // 🔧 팝업 상품만의 합계 계산 (배송비 판단용 - 포인트/쿠폰 차감 전 금액)
    // ✅ FIX: category 필드 없는 경우도 이름으로 감지
    const popupSubtotal = cartItems
      .filter(item =>
        isPopupProduct(item) ||
        isPopupProduct(item) ||
        (item.name || item.title || '').toLowerCase().includes('popup') ||
        (item.name || item.title || '').includes('팝업')
      )
      .reduce((sum, item) => {
        const itemPrice = item.price || 0;
        const optionPrice = item.selectedOption?.priceAdjustment || 0;
        return sum + (itemPrice + optionPrice) * item.quantity;
      }, 0);

    // 🔧 팝업 상품만의 합계가 50,000원 이상이면 배송비 무료 (혼합 주문 대응)
    // ✅ FIX: category 필드가 없는 경우 대비 (localStorage 기존 데이터)
    // popupSubtotal > 0이면 팝업 상품이 있다고 판단
    const hasPopupProduct = popupSubtotal > 0 || cartItems.some(item =>
      isPopupProduct(item) ||
      isPopupProduct(item) ||
      (item.name || item.title || '').toLowerCase().includes('popup') ||
      (item.name || item.title || '').includes('팝업')
    );
    const shippingFee = hasPopupProduct && popupSubtotal >= 50000 ? 0 : (hasPopupProduct ? 3000 : 0);

    const total = Math.max(0, subtotal + shippingFee);
    const savings = cartItems.reduce((sum, item) => {
      if (item.originalPrice && item.originalPrice > (item.price || 0)) {
        return sum + ((item.originalPrice - (item.price || 0)) * item.quantity);
      }
      return sum;
    }, 0);

    return { subtotal, shippingFee, total, savings };
  }, [cartItems]);

  const { subtotal, shippingFee, total, savings } = calculations;

  // Enhanced item removal with confirmation
  const removeItem = useCallback((id: number, itemName: string) => {
    try {
      removeFromCart(id);
      toast.success(`${itemName}이(가) 장바구니에서 제거되었습니다`);
    } catch (error) {
      toast.error('상품 제거 중 오류가 발생했습니다');
    }
  }, [removeFromCart]);

  // Enhanced quantity update with validation
  const handleQuantityUpdate = useCallback(async (id: number, change: number) => {
    const item = cartItems.find(item => item.id === id);
    if (!item) return;

    const newQuantity = item.quantity + change;

    if (newQuantity < 1) {
      toast.error('최소 1개 이상 선택해주세요');
      return;
    }

    if (item.maxQuantity && newQuantity > item.maxQuantity) {
      toast.error(`최대 ${item.maxQuantity}개까지 구매 가능합니다`);
      return;
    }

    try {
      updateQuantity(id, newQuantity);
    } catch (error) {
      toast.error('수량 변경 중 오류가 발생했습니다');
    }
  }, [cartItems, updateQuantity]);

  // 연령별 인원 수 업데이트
  const handleAgeCountUpdate = useCallback(async (
    id: number,
    ageType: 'adults' | 'children' | 'infants' | 'seniors',
    change: number
  ) => {
    const item = cartItems.find(item => item.id === id);
    if (!item) return;

    const currentCount = item[ageType] || 0;
    const newCount = currentCount + change;

    // 최소 0명
    if (newCount < 0) {
      toast.error('0명 미만으로 설정할 수 없습니다');
      return;
    }

    // 전체 인원이 최소 1명 이상이어야 함
    const totalCount =
      (ageType === 'adults' ? newCount : (item.adults || 0)) +
      (ageType === 'children' ? newCount : (item.children || 0)) +
      (ageType === 'infants' ? newCount : (item.infants || 0)) +
      (ageType === 'seniors' ? newCount : (item.seniors || 0));

    if (totalCount < 1) {
      toast.error('최소 1명 이상 선택해주세요');
      return;
    }

    try {
      await updateAgeCounts(id, { [ageType]: newCount });
      toast.success(`${ageType === 'adults' ? '성인' : ageType === 'children' ? '어린이' : '유아'} 인원이 변경되었습니다`);
    } catch (error) {
      toast.error('인원 변경 중 오류가 발생했습니다');
    }
  }, [cartItems, updateAgeCounts]);

  // Enhanced favorite toggle
  const toggleFavorite = useCallback(async (itemId: number, itemName: string) => {
    if (!isLoggedIn) {
      toast.error('로그인이 필요합니다');
      return;
    }

    try {
      const isFavorited = favorites.includes(itemId);

      if (isFavorited) {
        await removeFromFavorites(itemId);
        setFavorites(prev => prev.filter(id => id !== itemId));
        toast.success(`${itemName}이(가) 찜 목록에서 제거되었습니다`);
      } else {
        await addToFavorites(itemId);
        setFavorites(prev => [...prev, itemId]);
        toast.success(`${itemName}이(가) 찜 목록에 추가되었습니다`);
      }
    } catch (error) {
      toast.error('찜 목록 업데이트 중 오류가 발생했습니다');
    }
  }, [isLoggedIn, favorites]);

  // Clear cart with confirmation
  const handleClearCart = useCallback(() => {
    try {
      clearCart();
      toast.success('장바구니가 비워졌습니다');
    } catch (error) {
      toast.error('장바구니 비우기 중 오류가 발생했습니다');
    }
  }, [clearCart]);

  // Enhanced checkout with comprehensive validation
  const handleCheckout = useCallback(async () => {
    if (isProcessingCheckout) return;

    setIsProcessingCheckout(true);

    try {
      // Authentication check
      if (!isLoggedIn) {
        toast.error('로그인이 필요합니다');
        navigate('/login', { state: { from: '/cart' } });
        return;
      }

      // Cart validation
      if (cartItems.length === 0) {
        toast.error('장바구니가 비어있습니다');
        return;
      }

      // Check for out of stock items
      const outOfStockItems = cartItems.filter(item => item.inStock === false);
      if (outOfStockItems.length > 0) {
        toast.error('품절된 상품이 포함되어 있습니다. 장바구니를 확인해주세요');
        return;
      }

      // Check for quantity errors
      const hasErrors = Object.keys(itemErrors).length > 0;
      if (hasErrors) {
        toast.error('상품 수량을 확인해주세요');
        return;
      }


      // 🔒 CRITICAL: items를 먼저 매핑 (배송비 계산과 동일한 데이터 사용)
      const mappedItems = cartItems.map(item => {
        // category 강제 설정 (localStorage 오래된 데이터 대응)
        let category = item.category || 'general';
        const title = (item.title || item.name || '').toLowerCase();

        // category가 없거나 'general'이면 상품명으로 팝업 감지
        if (!category || category === 'general' || category === '') {
          if (title.includes('popup') || title.includes('팝업') || title.includes('pop') ||
              title.includes('퍼플아일랜드') || title.includes('purple island') || title.includes('purpleisland')) {
            category = '팝업';
          }
        }

        return {
          ...item,
          image: item.image || '/placeholder.jpg',
          category: category,
          name: item.name || item.title || 'Unknown Item'
        };
      });

      // 🔒 매핑된 items로 배송비 재계산 (서버와 동일한 로직)
      const popupItems = mappedItems.filter(item => isPopupProduct(item) || isPopupProduct(item));
      const finalPopupSubtotal = popupItems.reduce((sum, item) => {
        const itemPrice = item.price || 0;
        const optionPrice = item.selectedOption?.priceAdjustment || 0;
        return sum + (itemPrice + optionPrice) * item.quantity;
      }, 0);

      const finalHasPopupProduct = finalPopupSubtotal > 0;
      const finalShippingFee = finalHasPopupProduct && finalPopupSubtotal >= 50000 ? 0 : (finalHasPopupProduct ? 3000 : 0);
      // ✅ finalTotal은 할인 전 금액 (쿠폰/포인트는 결제 페이지에서 적용)
      const finalTotal = Number(subtotal) + Number(finalShippingFee);

      // 🔍 디버깅 로그
      console.log('📦 [CartPage] 배송비 계산:', {
        '전체 상품': mappedItems.length,
        '팝업 상품': popupItems.length,
        '팝업 상품 제목들': popupItems.map(i => i.title),
        '팝업 subtotal': finalPopupSubtotal,
        '배송비': finalShippingFee,
        '최종 total': finalTotal
      });

      // ✅ 보험료 합계 계산
      const totalInsuranceFee = mappedItems.reduce((sum, item) => {
        return sum + (item.insuranceFee || 0);
      }, 0);

      // ✅ Create comprehensive order summary (쿠폰/포인트는 결제 페이지에서 적용)
      const orderSummary: OrderSummary = {
        items: mappedItems,
        subtotal: Number(subtotal),
        couponDiscount: 0,  // 결제 페이지에서 쿠폰 적용
        couponCode: null,
        deliveryFee: Number(finalShippingFee),
        insuranceFee: totalInsuranceFee,  // ✅ 보험료 추가
        total: Math.floor(finalTotal + totalInsuranceFee)  // 보험료 포함
      };

      // Validate order summary (finalTotal 사용)
      console.log('🔍 [Checkout] 금액 검증:', {
        'calculations.total': total,
        'finalTotal': finalTotal,
        'finalShippingFee': finalShippingFee,
        'orderSummary.total': orderSummary.total
      });

      toast.success('결제 페이지로 이동합니다...');

      // Navigate to payment with order data
      const orderParams = new URLSearchParams({
        orderData: JSON.stringify(orderSummary),
        totalAmount: Math.floor(finalTotal + totalInsuranceFee).toString(),  // ✅ 보험료 포함
        userId: user?.id?.toString() || '',
        timestamp: Date.now().toString()
      });

      navigate(`/payment?${orderParams.toString()}`);

    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('결제 처리 중 오류가 발생했습니다. 다시 시도해주세요');
    } finally {
      setIsProcessingCheckout(false);
    }
  }, [isProcessingCheckout, isLoggedIn, cartItems, itemErrors, total, subtotal, user, navigate]);

  return (
    <>
      <Helmet>
        <title>{`장바구니 (${cartItems.length}개 상품) - Travleap`}</title>
        <meta name="description" content="선택하신 여행 상품을 확인하고 안전하게 결제하세요. 다양한 할인 쿠폰 혜택을 제공합니다." />
        <meta property="og:title" content="장바구니 - Travleap" />
        <meta property="og:description" content="선택하신 여행 상품을 확인하고 안전하게 결제하세요." />
        <link rel="canonical" href="https://travleap.com/cart" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Enhanced Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-[1200px] mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-gray-100 flex-shrink-0"
                  aria-label="이전 페이지로 돌아가기"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2 flex-wrap">
                  <ShoppingCart className="h-6 w-6 text-[#8B5FBF] flex-shrink-0" />
                  <h1 className="text-xl font-semibold text-gray-800 whitespace-nowrap">장바구니</h1>
                  <Badge variant="secondary" className="bg-[#8B5FBF]/10 text-[#8B5FBF] whitespace-nowrap">
                    {cartItems.length}개 상품
                  </Badge>
                  {savings > 0 && (
                    <Badge className="bg-green-100 text-green-700 ml-2">
                      <Tag className="h-3 w-3 mr-1" />
                      {savings.toLocaleString()}원 절약
                    </Badge>
                  )}
                </div>
              </div>

              {cartItems.length > 0 && (
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="text-sm text-gray-600 whitespace-nowrap">
                    총 {total.toLocaleString()}원
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 whitespace-nowrap">
                        <Trash2 className="h-4 w-4 mr-1" />
                        전체 삭제
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>장바구니 비우기</AlertDialogTitle>
                        <AlertDialogDescription>
                          장바구니의 모든 상품을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearCart} className="bg-red-600 hover:bg-red-700">
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="mt-4 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-green-600">
                  <Shield className="h-4 w-4" />
                  <span>SSL 보안 결제</span>
                </div>
                <div className="flex items-center gap-1 text-blue-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>즉시 예약 확정</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 py-6">
          {cartItems.length === 0 ? (
            // Enhanced empty cart state
            <div className="text-center py-16">
              <div className="relative">
                <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-xs text-red-600 font-medium">0</span>
                </div>
              </div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">장바구니가 비어있습니다</h3>
              <p className="text-gray-600 mb-6">원하는 여행 상품을 장바구니에 담아보세요!</p>

              <div className="space-y-4">
                <Button
                  onClick={() => navigate('/')}
                  className="bg-[#8B5FBF] hover:bg-[#7A4FB5] text-white mr-3"
                  size="lg"
                >
                  쇼핑 계속하기
                </Button>
                <Button
                  onClick={() => navigate('/categories')}
                  variant="outline"
                  size="lg"
                >
                  카테고리 둘러보기
                </Button>
              </div>

              {/* Popular categories suggestion */}
              <div className="mt-12 max-w-md mx-auto">
                <h4 className="text-sm font-medium text-gray-800 mb-4">인기 카테고리</h4>
                <div className="grid grid-cols-2 gap-3">
                  {['서울', '부산', '제주', '강원'].map((category) => (
                    <Button
                      key={category}
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/category/${category}`)}
                      className="border border-gray-200 hover:border-[#8B5FBF] hover:text-[#8B5FBF]"
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Enhanced cart items list */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-800">상품 목록</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>총 {cartItems.length}개 상품</span>
                    {Object.keys(itemErrors).length > 0 && (
                      <div className="flex items-center gap-1 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>{Object.keys(itemErrors).length}개 오류</span>
                      </div>
                    )}
                  </div>
                </div>

                {cartItems.map((item, index) => {
                  const itemName = item.name || item.title || 'Unknown Item';
                  const hasError = itemErrors[item.id];
                  const isFavorited = favorites.includes(item.id);

                  return (
                    <Card
                      key={item.id}
                      className={`overflow-hidden transition-all duration-200 ${
                        hasError ? 'border-red-200 bg-red-50/30' : 'hover:shadow-md'
                      }`}
                    >
                      <CardContent className="p-4">
                        {hasError && (
                          <div className="flex items-center gap-2 mb-3 p-2 bg-red-100 border border-red-200 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm text-red-700">{itemErrors[item.id]}</span>
                          </div>
                        )}

                        <div className="flex gap-4">
                          {/* Enhanced product info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    {item.category}
                                  </Badge>
                                  {item.isPartner && (
                                    <Badge className="bg-blue-100 text-blue-700 text-xs">
                                      파트너
                                    </Badge>
                                  )}
                                  {item.discount && (
                                    <Badge className="bg-red-100 text-red-700 text-xs">
                                      -{item.discount}%
                                    </Badge>
                                  )}
                                  {item.inStock === false && (
                                    <Badge className="bg-gray-100 text-gray-700 text-xs">
                                      품절
                                    </Badge>
                                  )}
                                </div>
                                <h3 className="font-medium text-gray-800 line-clamp-2 mb-1">
                                  {itemName}
                                </h3>
                              </div>

                              <div className="flex items-center gap-1 ml-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleFavorite(item.id, itemName)}
                                  className={`p-1 ${
                                    isFavorited
                                      ? 'text-red-500 hover:text-red-600'
                                      : 'text-gray-400 hover:text-red-500'
                                  }`}
                                  disabled={isLoadingFavorites}
                                  aria-label={isFavorited ? '찜 목록에서 제거' : '찜 목록에 추가'}
                                >
                                  <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-gray-400 hover:text-red-500 p-1"
                                      aria-label={`${itemName} 삭제`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>상품 제거</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        '{itemName}'을(를) 장바구니에서 제거하시겠습니까?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>취소</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => removeItem(item.id, itemName)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        제거
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>

                            {/* Enhanced product details */}
                            <div className="space-y-1 text-sm text-gray-600 mb-3">
                              {item.date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 flex-shrink-0" />
                                  <span>{item.date}</span>
                                </div>
                              )}
                              {/* ✅ 투어/음식/관광지/이벤트/체험: 인원별 상세 표시 + 수정 */}
                              {/* ⚠️ 팝업 상품은 인원이 아닌 수량으로 표시 */}
                              {!isPopupProduct(item) && (item.adults !== undefined || item.children !== undefined || item.infants !== undefined) ? (
                                <div className="space-y-3 mt-2">
                                  {/* 성인 */}
                                  {(item.adults !== undefined || item.adultPrice) && (
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 flex-1">
                                        <Users className="h-3 w-3 flex-shrink-0 text-blue-600" />
                                        <span className="text-xs font-medium">성인</span>
                                        {item.adultPrice !== undefined && item.adultPrice !== null && (
                                          <span className="text-xs text-gray-500">
                                            {item.adultPrice.toLocaleString()}원/명
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleAgeCountUpdate(item.id, 'adults', -1)}
                                          disabled={item.inStock === false}
                                          className="h-6 w-6 p-0 hover:bg-gray-100"
                                          aria-label="성인 감소"
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="w-8 text-center text-sm font-medium">{item.adults || 0}</span>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleAgeCountUpdate(item.id, 'adults', 1)}
                                          disabled={item.inStock === false}
                                          className="h-6 w-6 p-0 hover:bg-gray-100"
                                          aria-label="성인 증가"
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                  {/* 어린이 - 가격 설정된 경우만 표시 */}
                                  {item.childPrice && item.childPrice > 0 && (
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 flex-1">
                                        <Users className="h-3 w-3 flex-shrink-0 text-green-600" />
                                        <span className="text-xs font-medium">어린이</span>
                                        <span className="text-xs text-gray-500">
                                          {item.childPrice.toLocaleString()}원/명
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleAgeCountUpdate(item.id, 'children', -1)}
                                          disabled={item.inStock === false}
                                          className="h-6 w-6 p-0 hover:bg-gray-100"
                                          aria-label="어린이 감소"
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="w-8 text-center text-sm font-medium">{item.children || 0}</span>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleAgeCountUpdate(item.id, 'children', 1)}
                                          disabled={item.inStock === false}
                                          className="h-6 w-6 p-0 hover:bg-gray-100"
                                          aria-label="어린이 증가"
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                  {/* 유아 - 가격 설정된 경우만 표시 */}
                                  {item.infantPrice && item.infantPrice > 0 && (
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 flex-1">
                                        <Users className="h-3 w-3 flex-shrink-0 text-orange-600" />
                                        <span className="text-xs font-medium">유아</span>
                                        <span className="text-xs text-gray-500">
                                          {item.infantPrice.toLocaleString()}원/명
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleAgeCountUpdate(item.id, 'infants', -1)}
                                          disabled={item.inStock === false}
                                          className="h-6 w-6 p-0 hover:bg-gray-100"
                                          aria-label="유아 감소"
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="w-8 text-center text-sm font-medium">{item.infants || 0}</span>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleAgeCountUpdate(item.id, 'infants', 1)}
                                          disabled={item.inStock === false}
                                          className="h-6 w-6 p-0 hover:bg-gray-100"
                                          aria-label="유아 증가"
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                // ✅ 팝업 상품: 수량 표시 (quantity 사용)
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Package className="h-3 w-3 flex-shrink-0 text-blue-600" />
                                    <span className="text-sm font-medium">수량</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleQuantityUpdate(item.id, -1)}
                                      disabled={item.inStock === false || item.quantity <= 1}
                                      className="h-6 w-6 p-0 hover:bg-gray-100"
                                      aria-label="수량 감소"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="w-8 text-center text-sm font-medium">{item.quantity || 1}개</span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleQuantityUpdate(item.id, 1)}
                                      disabled={item.inStock === false}
                                      className="h-6 w-6 p-0 hover:bg-gray-100"
                                      aria-label="수량 증가"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                              {item.selectedOption && (
                                <div className="flex items-center gap-1">
                                  <Package className="h-3 w-3 flex-shrink-0 text-purple-600" />
                                  <span className="text-purple-700 font-medium">
                                    {item.selectedOption.name}: {item.selectedOption.value}
                                    {item.selectedOption.priceAdjustment !== 0 && (
                                      <span className="ml-1">
                                        ({item.selectedOption.priceAdjustment > 0 ? '+' : ''}{item.selectedOption.priceAdjustment.toLocaleString()}원)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}
                              {item.rating && item.rating > 0 && item.reviewCount !== undefined && item.reviewCount !== null && item.reviewCount > 0 && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                                  <span>{item.rating.toFixed(1)} ({item.reviewCount.toLocaleString()}개 리뷰)</span>
                                </div>
                              )}
                            </div>

                            {/* Enhanced pricing and quantity */}
                            <div className="flex items-end justify-between">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  {item.originalPrice && item.originalPrice > (item.price || 0) && (
                                    <span className="text-sm text-gray-400 line-through">
                                      {item.originalPrice.toLocaleString()}원
                                    </span>
                                  )}
                                  <span className="font-medium text-gray-800">
                                    {(() => {
                                      // ✅ 팝업 상품: quantity × price (개당 가격 표시)
                                      if (isPopupProduct(item)) {
                                        return (item.price || 0).toLocaleString();
                                      }
                                      // ✅ 투어/음식/관광지/이벤트/체험: 인원별 가격 합계
                                      if (item.adults !== undefined || item.children !== undefined || item.infants !== undefined || item.seniors !== undefined) {
                                        const total =
                                          ((item.adults || 0) * (item.adultPrice || 0)) +
                                          ((item.children || 0) * (item.childPrice || 0)) +
                                          ((item.infants || 0) * (item.infantPrice || 0)) +
                                          ((item.seniors || 0) * (item.seniorPrice || 0)) +
                                          ((item.selectedOption?.priceAdjustment || 0) * item.quantity);
                                        return total.toLocaleString();
                                      }
                                      // 기타: 기본 가격
                                      return (item.price || 0).toLocaleString();
                                    })()}원{isPopupProduct(item) ? '/개' : ''}
                                  </span>
                                </div>
                                {(item.quantity > 1 || item.selectedOption) && isPopupProduct(item) && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    총 {(((item.price || 0) + (item.selectedOption?.priceAdjustment || 0)) * item.quantity).toLocaleString()}원
                                  </div>
                                )}
                              </div>

                              {/* ⚠️ 수량 조절 버튼은 위쪽에서 이미 제공됨 (팝업/투어 모두 처리됨) */}
                              {false && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleQuantityUpdate(item.id, -1)}
                                    disabled={item.quantity <= 1 || item.inStock === false}
                                    className="h-8 w-8 p-0 hover:bg-gray-100"
                                    aria-label="수량 감소"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <div className="relative">
                                    <span className="w-12 text-center text-sm font-medium block">
                                      {item.quantity}
                                    </span>
                                    {item.maxQuantity && (
                                      <span className="text-xs text-gray-400 absolute -bottom-4 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                                        최대 {item.maxQuantity}
                                      </span>
                                    )}
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleQuantityUpdate(item.id, 1)}
                                    disabled={
                                      item.inStock === false ||
                                      (item.maxQuantity && item.quantity >= item.maxQuantity)
                                    }
                                    className="h-8 w-8 p-0 hover:bg-gray-100"
                                    aria-label="수량 증가"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Enhanced order summary */}
              <div className="space-y-4">
                {/* Enhanced payment summary */}
                <Card className="border-2 border-[#8B5FBF]/20">
                  <CardHeader className="pb-3 bg-gradient-to-r from-[#8B5FBF]/5 to-purple-50">
                    <CardTitle className="flex items-center justify-between text-base">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-[#8B5FBF]" />
                        결제 요약
                      </div>
                      <Badge className="bg-[#8B5FBF] text-white">
                        {cartItems.length}개 상품
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">상품 금액</span>
                        <span className="font-medium">{subtotal.toLocaleString()}원</span>
                      </div>

                      {savings > 0 && (
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3 text-red-500" />
                            <span className="text-gray-600">상품 할인</span>
                          </div>
                          <span className="font-medium text-red-600">-{savings.toLocaleString()}원</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3 text-blue-500" />
                          <span className="text-gray-600">배송비</span>
                          {shippingFee === 0 && (
                            <span className="text-xs text-blue-600">(50,000원 이상 무료)</span>
                          )}
                        </div>
                        <span className={`font-medium ${shippingFee === 0 ? 'text-blue-600' : 'text-gray-800'}`}>
                          {shippingFee === 0 ? '무료' : `+${shippingFee.toLocaleString()}원`}
                        </span>
                      </div>

                      <Separator className="my-3" />

                      <div className="flex justify-between items-center bg-[#8B5FBF]/5 p-3 rounded-lg">
                        <span className="font-semibold text-gray-800">총 결제 금액</span>
                        <div className="text-right">
                          <span className="text-xl font-bold text-[#8B5FBF]">
                            {total.toLocaleString()}원
                          </span>
                          {savings > 0 && (
                            <div className="text-xs text-green-600">
                              {savings.toLocaleString()}원 절약
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </CardContent>
                </Card>

                {/* Enhanced checkout button and security info */}
                <div className="space-y-3">
                  <Button
                    onClick={handleCheckout}
                    disabled={isProcessingCheckout || cartItems.length === 0 || Object.keys(itemErrors).length > 0}
                    className="w-full bg-[#8B5FBF] hover:bg-[#7A4FB5] disabled:bg-gray-400 text-white py-4 text-base font-semibold transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                    size="lg"
                  >
                    {isProcessingCheckout ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                        처리 중...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5 mr-2" />
                        {total.toLocaleString()}원 결제하기
                      </>
                    )}
                  </Button>

                  {/* Security and policy info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        <span>SSL 보안 결제</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        <span>개인정보 보호</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 text-center leading-relaxed">
                      결제 완료 후 취소/환불은 마이페이지에서 가능합니다.<br />
                      문의사항이 있으시면 고객센터(1588-1234)로 연락해주세요.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
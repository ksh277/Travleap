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
  Truck,
  Clock,
  Tag,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { useCartStore } from '../hooks/useCartStore';
import { addToFavorites, removeFromFavorites, getFavorites } from '../utils/api';

interface CartItem {
  id: number;
  name?: string;
  title?: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  image: string;
  category: string;
  location?: string;
  date?: string;
  guests?: number;
  rating?: number;
  reviewCount?: number;
  isPartner?: boolean;
  discount?: number;
  maxQuantity?: number;
  inStock?: boolean;
  estimatedDelivery?: string;
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
  deliveryFee: number;
  couponDiscount: number;
  couponCode: string | null;
  total: number;
  estimatedDelivery?: string;
}

export function CartPage() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const { cartItems, updateQuantity, removeFromCart, clearCart } = useCartStore();

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});
  const [showCouponDetails, setShowCouponDetails] = useState(false);

  const availableCoupons: Coupon[] = useMemo(() => [
    {
      code: 'WELCOME10',
      discount: 10,
      minAmount: 100000,
      description: '첫 방문 10% 할인',
      type: 'percentage',
      expiresAt: '2024-12-31'
    },
    {
      code: 'PARTNER20',
      discount: 20,
      minAmount: 200000,
      description: '파트너 전용 20% 할인',
      type: 'percentage',
      expiresAt: '2024-12-31'
    },
    {
      code: 'SINAN5000',
      discount: 5000,
      minAmount: 50000,
      description: '신안 여행 5천원 할인',
      type: 'fixed',
      expiresAt: '2024-12-31'
    },
    {
      code: 'SUMMER30',
      discount: 30,
      minAmount: 300000,
      description: '여름 휴가 30% 대할인',
      type: 'percentage',
      expiresAt: '2024-08-31'
    },
    {
      code: 'FIRST15',
      discount: 15,
      minAmount: 50000,
      description: '첫 구매 15% 할인',
      type: 'percentage',
      expiresAt: '2024-12-31'
    }
  ], []);

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

  // Validate cart items stock and availability
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
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = subtotal >= 100000 ? 0 : 3000;
    const couponDiscount = appliedCoupon
      ? appliedCoupon.type === 'fixed'
        ? appliedCoupon.discount
        : Math.floor(subtotal * appliedCoupon.discount / 100)
      : 0;
    const total = Math.max(0, subtotal + deliveryFee - couponDiscount);
    const savings = cartItems.reduce((sum, item) => {
      if (item.originalPrice && item.originalPrice > item.price) {
        return sum + ((item.originalPrice - item.price) * item.quantity);
      }
      return sum;
    }, 0);

    return { subtotal, deliveryFee, couponDiscount, total, savings };
  }, [cartItems, appliedCoupon]);

  const { subtotal, deliveryFee, couponDiscount, total, savings } = calculations;

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

  // Enhanced coupon application with validation and feedback
  const applyCoupon = useCallback(async () => {
    if (!couponCode.trim()) {
      toast.error('쿠폰 코드를 입력해주세요');
      return;
    }

    setIsApplyingCoupon(true);

    try {
      const coupon = availableCoupons.find(c => c.code === couponCode.toUpperCase());

      if (!coupon) {
        toast.error('유효하지 않은 쿠폰 코드입니다');
        return;
      }

      if (subtotal < coupon.minAmount) {
        toast.error(`최소 주문 금액 ${coupon.minAmount.toLocaleString()}원 이상이어야 사용 가능합니다`);
        return;
      }

      // Check if coupon is expired
      if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
        toast.error('만료된 쿠폰입니다');
        return;
      }

      // Check if coupon is already applied
      if (appliedCoupon?.code === coupon.code) {
        toast.error('이미 적용된 쿠폰입니다');
        return;
      }

      setAppliedCoupon(coupon);
      setCouponCode('');

      const discountAmount = coupon.type === 'fixed'
        ? coupon.discount
        : Math.floor(subtotal * coupon.discount / 100);

      toast.success(`쿠폰이 적용되었습니다! ${discountAmount.toLocaleString()}원 할인`);
    } catch (error) {
      toast.error('쿠폰 적용 중 오류가 발생했습니다');
    } finally {
      setIsApplyingCoupon(false);
    }
  }, [couponCode, availableCoupons, subtotal, appliedCoupon]);

  // Enhanced coupon removal
  const removeCoupon = useCallback(() => {
    if (appliedCoupon) {
      setAppliedCoupon(null);
      toast.success('쿠폰이 제거되었습니다');
    }
  }, [appliedCoupon]);

  // Auto-apply best coupon
  const autoApplyBestCoupon = useCallback(() => {
    if (appliedCoupon) return; // Don't override existing coupon

    const eligibleCoupons = availableCoupons.filter(coupon =>
      subtotal >= coupon.minAmount &&
      (!coupon.expiresAt || new Date() <= new Date(coupon.expiresAt))
    );

    if (eligibleCoupons.length === 0) return;

    // Find the coupon with highest discount value
    const bestCoupon = eligibleCoupons.reduce((best, current) => {
      const currentDiscount = current.type === 'fixed'
        ? current.discount
        : Math.floor(subtotal * current.discount / 100);
      const bestDiscount = best.type === 'fixed'
        ? best.discount
        : Math.floor(subtotal * best.discount / 100);

      return currentDiscount > bestDiscount ? current : best;
    });

    return bestCoupon;
  }, [availableCoupons, subtotal, appliedCoupon]);

  // Clear cart with confirmation
  const handleClearCart = useCallback(() => {
    try {
      clearCart();
      setAppliedCoupon(null);
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

      // Minimum order amount validation
      if (total < 10000) {
        toast.error('최소 주문 금액은 10,000원입니다');
        return;
      }

      // Create comprehensive order summary
      const orderSummary: OrderSummary = {
        items: cartItems.map(item => ({
          ...item,
          // Ensure we have clean data
          image: item.image || '/placeholder.jpg',
          category: item.category || 'general',
          name: item.name || item.title || 'Unknown Item',
          estimatedDelivery: item.estimatedDelivery || '3-5일'
        })),
        subtotal,
        deliveryFee,
        couponDiscount,
        couponCode: appliedCoupon?.code || null,
        total,
        estimatedDelivery: '3-5일'
      };

      // Validate order summary
      if (orderSummary.total !== total) {
        toast.error('주문 정보 오류가 발생했습니다. 다시 시도해주세요');
        return;
      }

      toast.success('결제 페이지로 이동합니다...');

      // Navigate to payment with order data
      const orderParams = new URLSearchParams({
        orderData: JSON.stringify(orderSummary),
        totalAmount: total.toString(),
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
  }, [isProcessingCheckout, isLoggedIn, cartItems, itemErrors, total, subtotal, deliveryFee, couponDiscount, appliedCoupon, user, navigate]);

  // Auto-suggest best coupon when subtotal changes
  useEffect(() => {
    const bestCoupon = autoApplyBestCoupon();
    if (bestCoupon && !appliedCoupon && subtotal > 0) {
      // Show suggestion toast
      toast.info(`${bestCoupon.code} 쿠폰으로 ${bestCoupon.type === 'fixed' ? bestCoupon.discount.toLocaleString() + '원' : bestCoupon.discount + '%'} 할인받으세요!`, {
        action: {
          label: '적용',
          onClick: () => {
            setAppliedCoupon(bestCoupon);
            toast.success('쿠폰이 자동 적용되었습니다!');
          }
        }
      });
    }
  }, [subtotal, autoApplyBestCoupon, appliedCoupon]);

  return (
    <>
      <Helmet>
        <title>{`장바구니 (${cartItems.length}개 상품) - Travleap`}</title>
        <meta name="description" content="선택하신 여행 상품을 확인하고 안전하게 결제하세요. 다양한 할인 쿠폰과 무료 배송 혜택을 제공합니다." />
        <meta property="og:title" content="장바구니 - Travleap" />
        <meta property="og:description" content="선택하신 여행 상품을 확인하고 안전하게 결제하세요." />
        <link rel="canonical" href="https://travleap.com/cart" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Enhanced Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-[1200px] mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-gray-100"
                  aria-label="이전 페이지로 돌아가기"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-6 w-6 text-[#8B5FBF]" />
                  <h1 className="text-xl font-semibold text-gray-800">장바구니</h1>
                  <Badge variant="secondary" className="bg-[#8B5FBF]/10 text-[#8B5FBF]">
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
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600">
                    총 {total.toLocaleString()}원
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
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
                  <Truck className="h-4 w-4" />
                  <span>{deliveryFee === 0 ? '무료 배송' : `배송비 ${deliveryFee.toLocaleString()}원`}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>3-5일 내 배송</span>
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
                          {/* Enhanced product image */}
                          <div className="flex-shrink-0 relative group">
                            <img
                              src={item.image}
                              alt={itemName}
                              className="w-24 h-24 object-cover rounded-lg transition-transform duration-200 group-hover:scale-105"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.src = '/images/placeholder.jpg';
                              }}
                            />
                            {item.discount && (
                              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                -{item.discount}%
                              </div>
                            )}
                            {item.inStock === false && (
                              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs font-medium">품절</span>
                              </div>
                            )}
                          </div>

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
                              {item.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{item.location}</span>
                                </div>
                              )}
                              {item.date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 flex-shrink-0" />
                                  <span>{item.date}</span>
                                </div>
                              )}
                              {item.guests && (
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3 flex-shrink-0" />
                                  <span>{item.guests}명</span>
                                </div>
                              )}
                              {item.rating && item.rating > 0 && item.reviewCount && item.reviewCount > 0 && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                                  <span>{item.rating.toFixed(1)} ({item.reviewCount.toLocaleString()}개 리뷰)</span>
                                </div>
                              )}
                              {item.estimatedDelivery && (
                                <div className="flex items-center gap-1">
                                  <Truck className="h-3 w-3 flex-shrink-0" />
                                  <span>예상 배송: {item.estimatedDelivery}</span>
                                </div>
                              )}
                            </div>

                            {/* Enhanced pricing and quantity */}
                            <div className="flex items-end justify-between">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  {item.originalPrice && item.originalPrice > item.price && (
                                    <span className="text-sm text-gray-400 line-through">
                                      {item.originalPrice.toLocaleString()}원
                                    </span>
                                  )}
                                  <span className="font-medium text-gray-800">
                                    {item.price.toLocaleString()}원
                                  </span>
                                </div>
                                {item.quantity > 1 && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    총 {(item.price * item.quantity).toLocaleString()}원
                                  </div>
                                )}
                              </div>

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
                {/* Enhanced coupon section */}
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Gift className="h-4 w-4 text-[#8B5FBF]" />
                        쿠폰 적용
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCouponDetails(!showCouponDetails)}
                        className="text-xs text-gray-600 hover:text-[#8B5FBF]"
                      >
                        <Info className="h-3 w-3 mr-1" />
                        사용가능 쿠폰
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="쿠폰 코드 입력 (예: WELCOME10)"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="flex-1"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            applyCoupon();
                          }
                        }}
                        disabled={isApplyingCoupon}
                      />
                      <Button
                        onClick={applyCoupon}
                        variant="outline"
                        size="sm"
                        disabled={!couponCode.trim() || isApplyingCoupon}
                        className="min-w-[60px]"
                      >
                        {isApplyingCoupon ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          '적용'
                        )}
                      </Button>
                    </div>

                    {appliedCoupon && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-1 bg-green-100 rounded-full">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-green-800">
                                  {appliedCoupon.code}
                                </span>
                                <Badge className="bg-green-600 text-white text-xs px-2 py-1">
                                  -{appliedCoupon.type === 'fixed'
                                    ? `${appliedCoupon.discount.toLocaleString()}원`
                                    : `${appliedCoupon.discount}%`
                                  }
                                </Badge>
                              </div>
                              <p className="text-sm text-green-700">
                                {appliedCoupon.description}
                              </p>
                              <p className="text-xs text-green-600 mt-1">
                                절약 금액: {couponDiscount.toLocaleString()}원
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={removeCoupon}
                            className="text-green-600 hover:text-green-800 p-2"
                            aria-label="쿠폰 제거"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {showCouponDetails && (
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="text-sm font-medium text-gray-800 mb-3">사용 가능한 쿠폰</h4>
                        <div className="space-y-2">
                          {availableCoupons.map(coupon => {
                            const isEligible = subtotal >= coupon.minAmount;
                            const isExpired = coupon.expiresAt && new Date() > new Date(coupon.expiresAt);
                            const isApplied = appliedCoupon?.code === coupon.code;

                            return (
                              <div
                                key={coupon.code}
                                className={`p-3 rounded-lg border ${
                                  isApplied
                                    ? 'border-green-200 bg-green-50'
                                    : isEligible && !isExpired
                                    ? 'border-blue-200 bg-blue-50 cursor-pointer hover:bg-blue-100'
                                    : 'border-gray-200 bg-gray-50'
                                }`}
                                onClick={() => {
                                  if (isEligible && !isExpired && !isApplied) {
                                    setCouponCode(coupon.code);
                                  }
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`text-sm font-medium ${
                                        isApplied ? 'text-green-700' : 'text-gray-800'
                                      }`}>
                                        {coupon.code}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className={`text-xs ${
                                          isApplied
                                            ? 'border-green-300 text-green-700'
                                            : 'border-gray-300 text-gray-600'
                                        }`}
                                      >
                                        {coupon.type === 'fixed'
                                          ? `${coupon.discount.toLocaleString()}원 할인`
                                          : `${coupon.discount}% 할인`
                                        }
                                      </Badge>
                                      {isApplied && (
                                        <Badge className="bg-green-600 text-white text-xs">
                                          적용중
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-600">
                                      {coupon.description}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      최소 주문: {coupon.minAmount.toLocaleString()}원
                                      {coupon.expiresAt && (
                                        <span className="ml-2">
                                          만료: {new Date(coupon.expiresAt).toLocaleDateString()}
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  <div className="ml-2">
                                    {isApplied ? (
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : isEligible && !isExpired ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCouponCode(coupon.code);
                                          applyCoupon();
                                        }}
                                        className="text-xs h-6 px-2"
                                      >
                                        선택
                                      </Button>
                                    ) : (
                                      <div className="text-xs text-gray-400">
                                        {isExpired ? '만료' : `${(coupon.minAmount - subtotal).toLocaleString()}원 부족`}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

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

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          <Truck className="h-3 w-3 text-gray-500" />
                          <span className="text-gray-600">배송비</span>
                        </div>
                        <span className={`font-medium ${
                          deliveryFee === 0 ? 'text-green-600' : 'text-gray-800'
                        }`}>
                          {deliveryFee === 0 ? '무료' : `${deliveryFee.toLocaleString()}원`}
                        </span>
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

                      {couponDiscount > 0 && (
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <Percent className="h-3 w-3 text-green-600" />
                            <span className="text-gray-600">쿠폰 할인</span>
                            <span className="text-xs text-green-600">({appliedCoupon?.code})</span>
                          </div>
                          <span className="font-medium text-green-600">-{couponDiscount.toLocaleString()}원</span>
                        </div>
                      )}

                      <Separator className="my-3" />

                      <div className="flex justify-between items-center bg-[#8B5FBF]/5 p-3 rounded-lg">
                        <span className="font-semibold text-gray-800">총 결제 금액</span>
                        <div className="text-right">
                          <span className="text-xl font-bold text-[#8B5FBF]">
                            {total.toLocaleString()}원
                          </span>
                          {(savings + couponDiscount) > 0 && (
                            <div className="text-xs text-green-600">
                              {(savings + couponDiscount).toLocaleString()}원 절약
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Free shipping progress */}
                    {subtotal < 100000 && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Truck className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-700">무료 배송까지</span>
                        </div>
                        <div className="relative">
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min((subtotal / 100000) * 100, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-blue-600">
                              {subtotal.toLocaleString()}원
                            </span>
                            <span className="text-xs text-blue-600 font-medium">
                              {(100000 - subtotal).toLocaleString()}원 더 구매하시면 무료!
                            </span>
                            <span className="text-xs text-blue-600">
                              100,000원
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
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
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
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
  Percent
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../utils/api';
import { useAuthStore } from '../hooks/useAuthStore';
import { useCartStore } from '../hooks/useCartStore';
import type { CartItem } from '../types/database';

export function CartPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthStore();
  const { cartItems, updateQuantity, removeFromCart, clearCart } = useCartStore();

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 쿠폰 목록
  const availableCoupons = [
    { code: 'WELCOME10', discount: 10, minAmount: 100000, description: '첫 방문 10% 할인' },
    { code: 'PARTNER20', discount: 20, minAmount: 200000, description: '파트너 전용 20% 할인' },
    { code: 'SINAN5000', discount: 5000, minAmount: 50000, description: '신안 여행 5천원 할인', type: 'fixed' }
  ];


  // 아이템 제거
  const removeItem = (id: string) => {
    removeFromCart(Number(id));
  };

  // 쿠폰 적용
  const applyCoupon = () => {
    const coupon = availableCoupons.find(c => c.code === couponCode.toUpperCase());
    if (coupon && subtotal >= coupon.minAmount) {
      setAppliedCoupon(coupon);
      setCouponCode('');
    } else {
      alert('유효하지 않은 쿠폰이거나 최소 주문 금액을 충족하지 않습니다.');
    }
  };

  // 쿠폰 제거
  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  // 계산
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = subtotal >= 100000 ? 0 : 3000;
  const couponDiscount = appliedCoupon 
    ? appliedCoupon.type === 'fixed' 
      ? appliedCoupon.discount 
      : Math.floor(subtotal * appliedCoupon.discount / 100)
    : 0;
  const total = subtotal + deliveryFee - couponDiscount;

  // 결제 페이지로 이동
  const handleCheckout = async () => {
    // 인증 확인
    if (!isLoggedIn) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    // 장바구니가 비어있는지 확인
    if (cartItems.length === 0) {
      toast.error('장바구니가 비어있습니다.');
      return;
    }

    // 주문 정보를 PaymentPage로 전달
    const orderSummary = {
      items: cartItems,
      subtotal,
      deliveryFee,
      couponDiscount,
      couponCode: appliedCoupon?.code || null,
      total
    };

    // URL에 주문 정보를 인코딩하여 전달
    const orderParams = new URLSearchParams({
      orderData: JSON.stringify(orderSummary),
      totalAmount: total.toString()
    });

    navigate(`/payment?${orderParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-[#8B5FBF]" />
              <h1 className="text-xl font-semibold text-gray-800">장바구니</h1>
              <Badge variant="secondary">{cartItems.length}개 상품</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 py-6">
        {cartItems.length === 0 ? (
          // 빈 장바구니
          <div className="text-center py-16">
            <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-800 mb-2">장바구니가 비어있습니다</h3>
            <p className="text-gray-600 mb-6">원하는 상품을 장바구니에 담아보세요!</p>
            <Button onClick={() => navigate('/')} className="bg-[#8B5FBF] hover:bg-[#7A4FB5] text-white">
              쇼핑 계속하기
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 장바구니 아이템 목록 */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-800">상품 목록</h2>
                <span className="text-sm text-gray-600">총 {cartItems.length}개 상품</span>
              </div>

              {cartItems.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* 상품 이미지 */}
                      <div className="flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name || item.title}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      </div>

                      {/* 상품 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
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
                            </div>
                            <h3 className="font-medium text-gray-800 line-clamp-1">
                              {item.name || item.title}
                            </h3>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeItem(item.id.toString())}
                            className="text-gray-400 hover:text-red-500 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* 상품 세부 정보 */}
                        <div className="space-y-1 text-sm text-gray-600 mb-3">
                          {item.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{item.location}</span>
                            </div>
                          )}
                          {item.date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{item.date}</span>
                            </div>
                          )}
                          {item.guests && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{item.guests}명</span>
                            </div>
                          )}
                          {item.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span>{item.rating} ({item.reviewCount})</span>
                            </div>
                          )}
                        </div>

                        {/* 가격 및 수량 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {item.originalPrice && (
                              <span className="text-sm text-gray-400 line-through">
                                {item.originalPrice.toLocaleString()}원
                              </span>
                            )}
                            <span className="font-medium text-gray-800">
                              {item.price.toLocaleString()}원
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(Number(item.id), -1)}
                              disabled={item.quantity <= 1}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(Number(item.id), 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 주문 요약 */}
            <div className="space-y-4">
              {/* 쿠폰 적용 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Gift className="h-4 w-4" />
                    쿠폰 적용
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="쿠폰 코드 입력"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={applyCoupon}
                      variant="outline"
                      size="sm"
                    >
                      적용
                    </Button>
                  </div>

                  {appliedCoupon && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Percent className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">
                            {appliedCoupon.description}
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={removeCoupon}
                          className="text-green-600 hover:text-green-800 p-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    <p>사용 가능한 쿠폰:</p>
                    <ul className="mt-1 space-y-1">
                      {availableCoupons.map(coupon => (
                        <li key={coupon.code} className="flex justify-between">
                          <span>{coupon.code}</span>
                          <span>{coupon.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* 결제 요약 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">결제 요약</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>상품 금액</span>
                      <span>{subtotal.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span>배송비</span>
                      <span>
                        {deliveryFee === 0 ? (
                          <span className="text-green-600">무료</span>
                        ) : (
                          `${deliveryFee.toLocaleString()}원`
                        )}
                      </span>
                    </div>
                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>쿠폰 할인</span>
                        <span>-{couponDiscount.toLocaleString()}원</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-2">
                      <div className="flex justify-between font-medium text-base">
                        <span>총 결제 금액</span>
                        <span className="text-[#8B5FBF]">{total.toLocaleString()}원</span>
                      </div>
                    </div>
                  </div>

                  {subtotal < 100000 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-700">
                        {(100000 - subtotal).toLocaleString()}원 더 구매하시면 배송비가 무료입니다!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 결제 버튼 */}
              <Button 
                onClick={handleCheckout}
                disabled={isLoading}
                className="w-full bg-[#8B5FBF] hover:bg-[#7A4FB5] text-white py-3"
                size="lg"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {isLoading ? '결제 중...' : `${total.toLocaleString()}원 결제하기`}
              </Button>

              <div className="text-xs text-gray-500 text-center">
                <p>안전한 결제를 위해 SSL 보안이 적용되었습니다.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  ArrowLeft,
  CreditCard,
  Shield,
  Calendar,
  Users,
  Clock,
  AlertCircle,
  Coins,
  Tag,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import PaymentWidget from './PaymentWidget';
import { AddressSearchModal } from './AddressSearchModal';

export function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoggedIn } = useAuth();

  const bookingId = searchParams.get('bookingId');
  const bookingNumber = searchParams.get('bookingNumber');
  const amount = searchParams.get('amount');
  const title = searchParams.get('title');
  const totalAmount = searchParams.get('totalAmount');
  const customerName = searchParams.get('customerName');
  const customerEmail = searchParams.get('customerEmail');
  const orderDataParam = searchParams.get('orderData');

  // Lock 기반 HOLD 예약인지 확인
  const isLockBasedBooking = Boolean(bookingNumber);

  // ✅ orderData를 state로 관리하여 쿠폰 정보 업데이트 가능하게 수정
  const [orderData, setOrderData] = useState<any>(null);

  // URL 파라미터에서 orderData 파싱 (초기 로드 시에만)
  useEffect(() => {
    if (orderDataParam) {
      try {
        const parsed = JSON.parse(orderDataParam);
        setOrderData(parsed);
      } catch (error) {
        console.error('Failed to parse order data:', error);
      }
    }
  }, [orderDataParam]);

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardInfo, setCardInfo] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });
  const [billingInfo, setBillingInfo] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    postalCode: '',
    address: '',
    detailAddress: ''
  });
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [preparedOrderNumber, setPreparedOrderNumber] = useState<string | null>(null);
  const [preparedAmount, setPreparedAmount] = useState<number>(0);
  const [preparedOrderName, setPreparedOrderName] = useState<string>('');
  const [totalPoints, setTotalPoints] = useState(0);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryFeeLoading, setDeliveryFeeLoading] = useState(false);

  // 쿠폰 관련 state
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<any | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);

  // 팝업 상품 여부 확인 (배송지 필요 여부 판단용)
  const hasPopupProducts =
    orderData?.items?.some((item: any) => item.category === '팝업') || // 장바구니 주문
    booking?.listing?.category === '팝업' || // 단일 상품 주문
    false;

  // 최종 결제 금액 계산 (배송비 + 쿠폰 할인 + 포인트 차감 후)
  const orderTotal = orderData ? orderData.total : parseInt(booking?.totalPrice || amount || totalAmount || '0');
  const totalWithDelivery = orderTotal + deliveryFee;
  const totalWithCoupon = Math.max(0, totalWithDelivery - couponDiscount);
  const finalAmount = Math.max(0, totalWithCoupon - pointsToUse);

  // 사용자 프로필 데이터 가져오기
  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;

    const fetchUserProfile = async () => {
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
            // 사용자 정보로 청구 정보 자동 채우기
            setBillingInfo({
              name: data.user.name || '',
              email: data.user.email || '',
              phone: data.user.phone || '',
              postalCode: data.user.postalCode || '',
              address: data.user.address || '',
              detailAddress: data.user.detailAddress || ''
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };

    fetchUserProfile();
    fetchPoints();
  }, [isLoggedIn, user?.id]);

  // 사용자 포인트 조회
  const fetchPoints = async () => {
    if (!user?.id) return;

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
        }
      }
    } catch (error) {
      console.error('Failed to fetch points:', error);
    } finally {
      setPointsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    // localStorage에서 숙박 예약 데이터 확인 (AccommodationDetailPage에서 전달)
    const bookingDataStr = localStorage.getItem('booking_data');
    if (bookingDataStr) {
      try {
        const bookingData = JSON.parse(bookingDataStr);
        setBooking(bookingData);
        setLoading(false);
        return;
      } catch (error) {
        console.error('Failed to parse booking_data:', error);
      }
    }

    // 장바구니 주문인 경우
    if (orderData) {
      setLoading(false);
      return;
    }

    // 단일 예약 주문인 경우
    if (!bookingId) {
      toast.error('결제 정보가 없습니다.');
      navigate('/');
      return;
    }

    loadBookingDetails();
  }, [bookingId, orderData, isLoggedIn]);

  // 배송비 계산 (팝업 상품이 있고 주소가 입력되었을 때)
  useEffect(() => {
    const calculateDeliveryFee = async () => {
      // 팝업 상품이 없으면 배송비 0
      if (!hasPopupProducts) {
        setDeliveryFee(0);
        return;
      }

      // 장바구니 주문이 아니면 배송비 계산 안 함 (단일 상품 주문은 별도 처리)
      if (!orderData?.items) {
        setDeliveryFee(0);
        return;
      }

      // 주소가 입력되지 않았으면 기본 배송비로 설정 (3,000원)
      if (!billingInfo.address) {
        setDeliveryFee(3000);
        return;
      }

      try {
        setDeliveryFeeLoading(true);
        const response = await fetch('/api/calculate-shipping', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            items: orderData.items,
            shippingAddress: billingInfo.address
          })
        });

        const result = await response.json();
        if (result.success) {
          setDeliveryFee(result.data.total_fee);
          console.log('✅ [PaymentPage] 배송비 계산:', result.data);
        } else {
          console.error('❌ [PaymentPage] 배송비 계산 실패:', result.error);
          setDeliveryFee(3000); // 기본 배송비
        }
      } catch (error) {
        console.error('❌ [PaymentPage] 배송비 계산 오류:', error);
        setDeliveryFee(3000); // 기본 배송비
      } finally {
        setDeliveryFeeLoading(false);
      }
    };

    calculateDeliveryFee();
  }, [hasPopupProducts, orderData?.items, billingInfo.address]);

  // 쿠폰 조회
  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;

    const fetchCoupons = async () => {
      try {
        const response = await fetch(`/api/coupons?userId=${user.id}`);
        const result = await response.json();

        if (result.success && result.data) {
          setAvailableCoupons(result.data);
          console.log('✅ [PaymentPage] 사용 가능한 쿠폰:', result.data.length);
        }
      } catch (error) {
        console.error('❌ [PaymentPage] 쿠폰 조회 실패:', error);
      }
    };

    fetchCoupons();
  }, [isLoggedIn, user?.id]);

  // 쿠폰 적용 함수
  const applyCoupon = async (code: string) => {
    if (!code) {
      toast.error('쿠폰 코드를 입력해주세요');
      return;
    }

    setCouponLoading(true);
    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          userId: user?.id,
          orderAmount: totalWithDelivery,
          category: orderData?.items?.[0]?.category
        })
      });

      const result = await response.json();

      if (result.success && result.data) {
        setSelectedCoupon(result.data);
        setCouponDiscount(result.data.discountAmount);
        setCouponCode(code);
        setShowCouponModal(false);

        // ✅ orderData에도 쿠폰 정보 업데이트
        if (orderData) {
          setOrderData({
            ...orderData,
            couponDiscount: result.data.discountAmount,
            couponCode: result.data.code
          });
        }

        toast.success(`쿠폰이 적용되었습니다! ${result.data.discountAmount.toLocaleString()}원 할인`);
      } else {
        toast.error(result.message || '쿠폰 적용에 실패했습니다');
      }
    } catch (error) {
      console.error('❌ [PaymentPage] 쿠폰 적용 실패:', error);
      toast.error('쿠폰 적용 중 오류가 발생했습니다');
    } finally {
      setCouponLoading(false);
    }
  };

  // 쿠폰 제거 함수
  const removeCoupon = () => {
    setSelectedCoupon(null);
    setCouponDiscount(0);
    setCouponCode('');

    // ✅ orderData에서도 쿠폰 정보 제거
    if (orderData) {
      setOrderData({
        ...orderData,
        couponDiscount: 0,
        couponCode: null
      });
    }

    toast.success('쿠폰이 제거되었습니다');
  };

  const loadBookingDetails = async () => {
    try {
      setLoading(true);
      // 실제 API에서는 bookingId로 상세 정보를 가져옴
      const response = await api.getBooking(Number(bookingId));
      if (response.success) {
        setBooking(response.data);
      } else {
        toast.error('예약 정보를 찾을 수 없습니다.');
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to load booking details:', error);
      toast.error('예약 정보를 불러올 수 없습니다.');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSave = async (addressData: {
    postalCode: string;
    address: string;
    detailAddress: string;
  }) => {
    try {
      const response = await fetch('/api/user/address', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-user-id': user?.id?.toString() || ''
        },
        body: JSON.stringify(addressData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBillingInfo(prev => ({
            ...prev,
            postalCode: addressData.postalCode,
            address: addressData.address,
            detailAddress: addressData.detailAddress
          }));
          toast.success('주소가 저장되었습니다.');
        }
      } else {
        throw new Error('주소 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to save address:', error);
      toast.error('주소 저장 중 오류가 발생했습니다.');
    }
  };

  const handlePreparePayment = async () => {
    // 팝업 상품이 있을 때만 배송지 주소 필수
    if (hasPopupProducts && (!billingInfo.address || !billingInfo.postalCode)) {
      toast.error('팝업 상품 배송을 위해 배송지 주소를 입력해주세요.');
      setIsAddressModalOpen(true);
      return;
    }

    if (!validatePaymentInfo()) {
      return;
    }

    setIsProcessing(true);
    try {
      if (orderData) {
        // 포인트 사용 검증
        if (pointsToUse > 0) {
          if (pointsToUse < 1000) {
            toast.error('최소 1,000P부터 사용 가능합니다.');
            setIsProcessing(false);
            return;
          }
          if (pointsToUse > totalPoints) {
            toast.error('보유 포인트를 초과하여 사용할 수 없습니다.');
            setIsProcessing(false);
            return;
          }
          // ✅ 쿠폰 할인 적용 후 금액으로 검증
          if (pointsToUse > totalWithCoupon) {
            toast.error('주문 금액을 초과하여 포인트를 사용할 수 없습니다.');
            setIsProcessing(false);
            return;
          }
        }

        // 장바구니 주문 생성 (Toss Payments로 넘기기 전 준비)
        // ✅ 팝업 상품이 있을 때만 배송 정보 포함 (PG사 심사 필수)
        const orderResponse = await api.createOrder({
          userId: Number(user?.id) || 1,
          items: orderData.items.map((item: any) => ({
            listingId: Number(item.id),
            quantity: item.quantity,
            price: item.price,
            // ✅ 옵션 가격 포함한 subtotal 계산
            subtotal: item.price * item.quantity + (item.selectedOption?.priceAdjustment || 0) * item.quantity,
            selectedOption: item.selectedOption, // 팝업 상품 옵션 정보
            // ✅ bookings 테이블에 저장할 필드 추가
            category: item.category,
            selectedDate: item.selectedDate,
            adults: item.adults,
            children: item.children,
            infants: item.infants
          })),
          subtotal: orderData.subtotal,
          deliveryFee: deliveryFee,
          couponDiscount: orderData.couponDiscount || 0,
          couponCode: orderData.couponCode || null,
          pointsUsed: pointsToUse,
          total: finalAmount,
          status: 'pending' as const,
          paymentMethod,
          // ✅ 팝업 상품이 있을 때만 배송 정보 전달
          ...(hasPopupProducts && {
            shippingInfo: {
              name: billingInfo.name,
              phone: billingInfo.phone,
              zipcode: billingInfo.postalCode,
              address: billingInfo.address,
              addressDetail: billingInfo.detailAddress,
              memo: '' // 추후 배송 메모 필드 추가 시 사용
            }
          })
        });

        if (orderResponse.success) {
          // 주문 생성 성공 - PaymentWidget에 필요한 정보 설정 (포인트 차감 후 금액)
          setPreparedOrderNumber(orderResponse.data.orderNumber);
          setPreparedAmount(finalAmount);
          setPreparedOrderName(`장바구니 주문 (${orderData.items.length}개 상품)`);

          if (pointsToUse > 0) {
            toast.success(`${pointsToUse.toLocaleString()}P가 차감되었습니다. 결제를 진행해주세요.`);
          } else {
            toast.success('주문이 생성되었습니다. 결제를 진행해주세요.');
          }
        } else {
          throw new Error(orderResponse.error || '주문 생성 중 오류가 발생했습니다.');
        }
      } else {
        toast.error('주문 정보가 없습니다.');
      }
    } catch (error) {
      console.error('Order preparation failed:', error);
      toast.error(error instanceof Error ? error.message : '주문 준비 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const validatePaymentInfo = () => {
    // PaymentWidget 사용 시 카드 정보는 Toss가 받으므로 검증 불필요
    // 청구/배송 정보만 검증
    if (!billingInfo.name || !billingInfo.email || !billingInfo.phone) {
      toast.error('청구 정보를 모두 입력해주세요.');
      return false;
    }

    if (!billingInfo.postalCode || !billingInfo.address) {
      toast.error('배송지 주소를 입력해주세요.');
      return false;
    }

    return true;
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B5FBF] mx-auto mb-4"></div>
          <p className="text-gray-600">결제 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

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
            <div>
              <h1 className="text-xl font-semibold text-gray-800">결제하기</h1>
              <p className="text-sm text-gray-600">{title}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 결제 정보 입력 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 결제 방법 선택 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  결제 방법
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="card"
                      name="paymentMethod"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <label htmlFor="card" className="text-sm font-medium">카드 결제</label>
                    <Badge variant="secondary">추천</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="transfer"
                      name="paymentMethod"
                      value="transfer"
                      checked={paymentMethod === 'transfer'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <label htmlFor="transfer" className="text-sm font-medium">계좌이체</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="kakaopay"
                      name="paymentMethod"
                      value="kakaopay"
                      checked={paymentMethod === 'kakaopay'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <label htmlFor="kakaopay" className="text-sm font-medium">카카오페이</label>
                  </div>
                </div>

                {/* 카드 정보 입력 */}
                {paymentMethod === 'card' && (
                  <div className="space-y-4 mt-4 pt-4 border-t">
                    <div>
                      <label className="block text-sm font-medium mb-2">카드번호</label>
                      <Input
                        placeholder="1234 5678 9012 3456"
                        value={cardInfo.number}
                        onChange={(e) => setCardInfo(prev => ({
                          ...prev,
                          number: formatCardNumber(e.target.value)
                        }))}
                        maxLength={19}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">유효기간</label>
                        <Input
                          placeholder="MM/YY"
                          value={cardInfo.expiry}
                          onChange={(e) => setCardInfo(prev => ({
                            ...prev,
                            expiry: formatExpiry(e.target.value)
                          }))}
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">CVV</label>
                        <Input
                          placeholder="123"
                          value={cardInfo.cvv}
                          onChange={(e) => setCardInfo(prev => ({
                            ...prev,
                            cvv: e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                          }))}
                          maxLength={4}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">카드 소유자명</label>
                      <Input
                        placeholder="홍길동"
                        value={cardInfo.name}
                        onChange={(e) => setCardInfo(prev => ({
                          ...prev,
                          name: e.target.value
                        }))}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 청구 정보 */}
            <Card>
              <CardHeader>
                <CardTitle>청구 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">이름</label>
                  <Input
                    value={billingInfo.name}
                    onChange={(e) => setBillingInfo(prev => ({
                      ...prev,
                      name: e.target.value
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">이메일</label>
                  <Input
                    type="email"
                    value={billingInfo.email}
                    onChange={(e) => setBillingInfo(prev => ({
                      ...prev,
                      email: e.target.value
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">전화번호</label>
                  <Input
                    value={billingInfo.phone}
                    onChange={(e) => setBillingInfo(prev => ({
                      ...prev,
                      phone: e.target.value
                    }))}
                  />
                </div>
                {/* 팝업 상품이 있을 때만 배송지 입력 표시 */}
                {hasPopupProducts && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      배송지 주소 <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={billingInfo.postalCode}
                          readOnly
                          placeholder="우편번호"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          onClick={() => setIsAddressModalOpen(true)}
                          variant="outline"
                          className="whitespace-nowrap"
                        >
                          주소 검색
                        </Button>
                      </div>
                      <Input
                        value={billingInfo.address}
                        readOnly
                        placeholder="주소"
                      />
                      <Input
                        value={billingInfo.detailAddress}
                        onChange={(e) => setBillingInfo(prev => ({
                          ...prev,
                          detailAddress: e.target.value
                        }))}
                        placeholder="상세주소"
                        maxLength={200}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      팝업 상품 배송을 위해 주소가 필요합니다.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 주문 요약 */}
          <div className="space-y-6">
            {/* 예약 정보 */}
            <Card>
              <CardHeader>
                <CardTitle>예약 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-800">{title}</h3>
                </div>

                {booking && (
                  <div className="space-y-2 text-sm text-gray-600">
                    {/* 날짜 정보 - 여러 형식 지원 */}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {booking.checkIn && booking.checkOut
                          ? `${booking.checkIn} ~ ${booking.checkOut}${booking.nights ? ` (${booking.nights}박)` : ''}`
                          : booking.pickupDate && booking.returnDate
                          ? `${booking.pickupDate} ${booking.pickupTime || ''} ~ ${booking.returnDate} ${booking.returnTime || ''}`
                          : booking.start_date || '날짜 정보 없음'}
                      </span>
                    </div>
                    {/* 렌트카 대여 시간 표시 */}
                    {booking.rentalHours && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          총 {Math.floor(booking.rentalHours)}시간
                          {booking.rentalHours % 1 !== 0 && ` ${Math.round((booking.rentalHours % 1) * 60)}분`}
                        </span>
                      </div>
                    )}
                    {/* 객실 타입 (숙박) */}
                    {booking.roomType && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{booking.roomType}</span>
                      </div>
                    )}
                    {/* 차량 정보 (렌트카) */}
                    {booking.vehicleName && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{booking.vehicleName}</span>
                      </div>
                    )}
                    {/* 인원 (투어/체험) */}
                    {booking.num_adults && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{booking.num_adults}명</span>
                      </div>
                    )}
                    {/* 예약번호 */}
                    {(bookingNumber || bookingId) && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>예약번호: {bookingNumber || (typeof bookingId === 'string' ? bookingId.slice(-8) : bookingId)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* HOLD 예약 시 만료 시간 표시 */}
                {isLockBasedBooking && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="text-xs text-yellow-700">
                        <p className="font-medium mb-1">예약 대기 중</p>
                        <p>10분 이내에 결제를 완료하지 않으면 예약이 자동 취소됩니다.</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 결제 요약 */}
            <Card>
              <CardHeader>
                <CardTitle>결제 요약</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {orderData ? (
                    <>
                      <div className="flex justify-between">
                        <span>상품 금액</span>
                        <span>{orderData.subtotal.toLocaleString()}원</span>
                      </div>
                      {orderData.couponDiscount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>쿠폰 할인</span>
                          <span>-{orderData.couponDiscount.toLocaleString()}원</span>
                        </div>
                      )}
                      {hasPopupProducts && (
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1">
                            배송비
                            {deliveryFeeLoading && <span className="text-xs text-gray-400">(계산 중...)</span>}
                          </span>
                          <span>{deliveryFee.toLocaleString()}원</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-medium text-lg">
                        <span>주문 금액</span>
                        <span className="text-gray-700">{totalWithDelivery.toLocaleString()}원</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span>상품 금액</span>
                        <span>{parseInt(booking?.totalPrice || amount || totalAmount || '0').toLocaleString()}원</span>
                      </div>
                      <div className="flex justify-between">
                        <span>수수료</span>
                        <span>0원</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium text-lg">
                        <span>주문 금액</span>
                        <span className="text-gray-700">{parseInt(booking?.totalPrice || amount || totalAmount || '0').toLocaleString()}원</span>
                      </div>
                    </>
                  )}
                </div>

                {/* 쿠폰 사용 */}
                {!preparedOrderNumber && (
                  <div className="border-t pt-4 mt-4">
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium flex items-center gap-1">
                          <Tag className="w-4 h-4 text-purple-600" />
                          쿠폰
                        </label>
                        <span className="text-xs text-gray-500">
                          사용 가능: {availableCoupons.length}개
                        </span>
                      </div>

                      {selectedCoupon ? (
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium text-sm">{selectedCoupon.code}</p>
                              <p className="text-xs text-gray-600">{selectedCoupon.description}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={removeCoupon}
                              className="h-8"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-sm font-medium text-purple-600">
                            -{selectedCoupon.discountAmount.toLocaleString()}원 할인
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => setShowCouponModal(true)}
                          >
                            쿠폰 선택하기
                          </Button>
                          <div className="flex gap-2">
                            <Input
                              placeholder="쿠폰 코드 입력"
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              onClick={() => applyCoupon(couponCode)}
                              disabled={couponLoading || !couponCode}
                              className="whitespace-nowrap"
                            >
                              적용
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {couponDiscount > 0 && (
                      <>
                        <Separator className="my-3" />
                        <div className="flex justify-between text-purple-600">
                          <span>쿠폰 할인</span>
                          <span>-{couponDiscount.toLocaleString()}원</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 포인트 사용 */}
                {!preparedOrderNumber && (
                  <div className="border-t pt-4 mt-4">
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium flex items-center gap-1">
                          <Coins className="w-4 h-4 text-purple-600" />
                          포인트 사용
                        </label>
                        <span className="text-xs text-gray-500">
                          보유: {totalPoints.toLocaleString()}P
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="0"
                          max={Math.min(totalPoints, totalWithDelivery)}
                          value={pointsToUse || ''}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            const maxUsable = Math.min(totalPoints, totalWithDelivery);
                            setPointsToUse(Math.min(value, maxUsable));
                          }}
                          placeholder="사용할 포인트 입력"
                          className="flex-1"
                          disabled={totalPoints < 1000}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const maxUsable = Math.min(totalPoints, totalWithDelivery);
                            setPointsToUse(maxUsable);
                          }}
                          disabled={totalPoints < 1000}
                          className="whitespace-nowrap"
                        >
                          전액 사용
                        </Button>
                      </div>
                      <div className="mt-2 space-y-1">
                        {totalPoints < 1000 && (
                          <p className="text-xs text-orange-600">최소 1,000P부터 사용 가능합니다</p>
                        )}
                        {pointsToUse > 0 && pointsToUse < 1000 && (
                          <p className="text-xs text-red-600">최소 1,000P 이상 사용해주세요</p>
                        )}
                        <p className="text-xs text-gray-500">1P = 1원으로 사용됩니다</p>
                      </div>
                    </div>

                    {pointsToUse > 0 && (
                      <>
                        <Separator className="my-3" />
                        <div className="flex justify-between text-green-600">
                          <span>포인트 차감</span>
                          <span>-{pointsToUse.toLocaleString()}원</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 최종 결제 금액 */}
                <Separator />
                <div className="flex justify-between font-bold text-xl">
                  <span>최종 결제 금액</span>
                  <span className="text-[#8B5FBF]">{finalAmount.toLocaleString()}원</span>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-xs text-blue-700">
                      <p className="font-medium mb-1">안전한 결제</p>
                      <p>SSL 암호화로 보호되는 안전한 결제입니다.</p>
                    </div>
                  </div>
                </div>

                {/* Toss Payments Widget 표시 조건:
                    1. Lock 기반 예약 (bookingNumber가 있는 경우)
                    2. 장바구니 주문이 준비된 경우 (preparedOrderNumber가 있는 경우)
                */}
                {(isLockBasedBooking && bookingId && bookingNumber) || preparedOrderNumber ? (
                  <div className="mt-4">
                    {pointsToUse > 0 && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2 text-sm text-purple-800">
                          <Coins className="w-4 h-4" />
                          <span className="font-medium">
                            {pointsToUse.toLocaleString()}P 차감 적용됨
                          </span>
                        </div>
                      </div>
                    )}
                    <PaymentWidget
                      bookingId={preparedOrderNumber ? 0 : parseInt(bookingId || '0')}
                      bookingNumber={preparedOrderNumber || bookingNumber || ''}
                      amount={preparedAmount || parseInt(amount || totalAmount || '0')}
                      orderName={preparedOrderName || title || '예약 결제'}
                      customerEmail={customerEmail || user?.email || ''}
                      customerName={customerName || user?.name || '고객'}
                      customerMobilePhone={billingInfo.phone}
                      shippingInfo={hasPopupProducts ? {
                        name: billingInfo.name,
                        phone: billingInfo.phone,
                        zipcode: billingInfo.postalCode,
                        address: billingInfo.address,
                        addressDetail: billingInfo.detailAddress
                      } : undefined}
                    />
                  </div>
                ) : (
                  <>
                    <Button
                      onClick={orderData ? handlePreparePayment : () => toast.error('결제 정보가 올바르지 않습니다.')}
                      disabled={isProcessing}
                      className="w-full bg-[#8B5FBF] hover:bg-[#7A4FB5] text-white py-3"
                      size="lg"
                    >
                      {isProcessing ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          결제 준비 중...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          {finalAmount.toLocaleString()}원 결제하기
                        </div>
                      )}
                    </Button>

                    <div className="text-xs text-gray-500 text-center">
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <AlertCircle className="h-3 w-3" />
                        <span>결제 시 유의사항</span>
                      </div>
                      <p>• 결제 완료 후 즉시 예약이 확정됩니다</p>
                      <p>• 취소 정책에 따라 수수료가 발생할 수 있습니다</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 쿠폰 선택 모달 */}
      {showCouponModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">쿠폰 선택</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCouponModal(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-4 space-y-3">
              {availableCoupons.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>사용 가능한 쿠폰이 없습니다</p>
                </div>
              ) : (
                availableCoupons.map((coupon) => (
                  <div
                    key={coupon.code}
                    className="p-4 border rounded-lg hover:border-purple-500 cursor-pointer transition"
                    onClick={() => applyCoupon(coupon.code)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Badge variant="secondary" className="mb-1">
                          {coupon.code}
                        </Badge>
                        <p className="text-sm text-gray-600">{coupon.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-purple-600">
                          {coupon.type === 'percentage'
                            ? `${coupon.discount}%`
                            : `${coupon.discount.toLocaleString()}원`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {coupon.minAmount > 0 && (
                        <span>최소 {coupon.minAmount.toLocaleString()}원</span>
                      )}
                      {coupon.expiresAt && (
                        <span>• {coupon.expiresAt}까지</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t p-4">
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="쿠폰 코드 직접 입력"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                />
                <Button
                  onClick={() => applyCoupon(couponCode)}
                  disabled={couponLoading || !couponCode}
                >
                  적용
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 주소 검색 모달 */}
      <AddressSearchModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onAddressSelected={handleAddressSave}
        initialAddress={{
          postalCode: billingInfo.postalCode,
          address: billingInfo.address,
          detailAddress: billingInfo.detailAddress
        }}
      />
    </div>
  );
}
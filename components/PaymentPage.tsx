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
  Check,
  Shield,
  Calendar,
  MapPin,
  Users,
  Clock,
  AlertCircle
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

  let orderData = null;
  if (orderDataParam) {
    try {
      orderData = JSON.parse(orderDataParam);
    } catch (error) {
      console.error('Failed to parse order data:', error);
    }
  }

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
  const [userProfile, setUserProfile] = useState<any>(null);

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
            setUserProfile(data.user);
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
  }, [isLoggedIn, user?.id]);

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

  const handlePayment = async () => {
    // 주소가 없으면 주소 입력 모달 표시
    if (!billingInfo.address || !billingInfo.postalCode) {
      toast.error('배송지 주소를 입력해주세요.');
      setIsAddressModalOpen(true);
      return;
    }

    if (!validatePaymentInfo()) {
      return;
    }

    setIsProcessing(true);
    try {
      if (orderData) {
        // 장바구니 주문 처리
        const cartPaymentData = {
          orderData,
          amount: parseFloat(totalAmount || '0'),
          paymentMethod,
          cardInfo: paymentMethod === 'card' ? cardInfo : null,
          billingInfo
        };

        // 장바구니 주문 생성 및 결제 처리
        const orderResponse = await api.createOrder({
          userId: Number(user?.id) || 1,
          items: orderData.items.map((item: any) => ({
            listingId: Number(item.id),
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity
          })),
          subtotal: orderData.subtotal,
          deliveryFee: 0,
          couponDiscount: orderData.couponDiscount,
          couponCode: orderData.couponCode,
          total: orderData.total,
          status: 'pending' as const,
          paymentMethod
        });

        if (orderResponse.success) {
          // 결제 처리
          const response = await api.processPayment({
            bookingId: orderResponse.data.id.toString(),
            amount: orderData.total,
            paymentMethod,
            cardInfo: paymentMethod === 'card' ? cardInfo : null,
            billingInfo
          });

          if (response.success) {
            toast.success('결제가 완료되었습니다!');
            navigate(`/payment-success?orderId=${orderResponse.data.id}`);
          } else {
            throw new Error(response.error || '결제 처리 중 오류가 발생했습니다.');
          }
        } else {
          throw new Error(orderResponse.error || '주문 생성 중 오류가 발생했습니다.');
        }
      } else {
        // 단일 예약 결제 처리
        const paymentData = {
          bookingId,
          amount: parseFloat(amount || '0'),
          paymentMethod,
          cardInfo: paymentMethod === 'card' ? cardInfo : null,
          billingInfo
        };

        const response = await api.processPayment(paymentData);

        if (response.success) {
          toast.success('결제가 완료되었습니다!');
          navigate(`/payment-success?bookingId=${bookingId}`);
        } else {
          throw new Error(response.error || '결제 처리 중 오류가 발생했습니다.');
        }
      }
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error(error instanceof Error ? error.message : '결제 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const validatePaymentInfo = () => {
    if (paymentMethod === 'card') {
      if (!cardInfo.number || !cardInfo.expiry || !cardInfo.cvv || !cardInfo.name) {
        toast.error('카드 정보를 모두 입력해주세요.');
        return false;
      }
      if (cardInfo.number.replace(/\s/g, '').length < 13) {
        toast.error('올바른 카드번호를 입력해주세요.');
        return false;
      }
    }

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
                </div>
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
                      <Separator />
                      <div className="flex justify-between font-medium text-lg">
                        <span>총 결제 금액</span>
                        <span className="text-[#8B5FBF]">{orderData.total.toLocaleString()}원</span>
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
                        <span>총 결제 금액</span>
                        <span className="text-[#8B5FBF]">{parseInt(booking?.totalPrice || amount || totalAmount || '0').toLocaleString()}원</span>
                      </div>
                    </>
                  )}
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

                {/* Lock 기반 예약이면 PaymentWidget 표시, 아니면 기존 결제 버튼 */}
                {isLockBasedBooking && bookingId && bookingNumber ? (
                  <div className="mt-4">
                    <PaymentWidget
                      bookingId={parseInt(bookingId)}
                      bookingNumber={bookingNumber}
                      amount={parseInt(amount || totalAmount || '0')}
                      orderName={title || '예약 결제'}
                      customerEmail={customerEmail || user?.email || ''}
                      customerName={customerName || user?.name || '고객'}
                    />
                  </div>
                ) : (
                  <>
                    <Button
                      onClick={handlePayment}
                      disabled={isProcessing}
                      className="w-full bg-[#8B5FBF] hover:bg-[#7A4FB5] text-white py-3"
                      size="lg"
                    >
                      {isProcessing ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          결제 처리 중...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          {orderData
                            ? `${orderData.total.toLocaleString()}원 결제하기`
                            : `${parseInt(booking?.totalPrice || amount || totalAmount || '0').toLocaleString()}원 결제하기`
                          }
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
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
  // ✅ FIX: 동기적으로 파싱하여 race condition 방지
  const [orderData, setOrderData] = useState<any>(() => {
    if (orderDataParam) {
      try {
        return JSON.parse(orderDataParam);
      } catch (error) {
        console.error('Failed to parse order data:', error);
        return null;
      }
    }
    return null;
  });

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
  // ✅ localStorage에서 저장된 청구정보 불러오기 (있으면 우선 사용)
  const [billingInfo, setBillingInfo] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        postalCode: user?.postal_code || '',
        address: user?.address || '',
        detailAddress: user?.detail_address || ''
      };
    }

    try {
      const saved = localStorage.getItem('billingInfo');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('✅ [청구정보] localStorage에서 불러옴:', parsed);
        return {
          name: parsed.name || user?.name || '',
          email: parsed.email || user?.email || '',
          phone: parsed.phone || user?.phone || '',
          postalCode: parsed.postalCode || user?.postal_code || '',
          address: parsed.address || user?.address || '',
          detailAddress: parsed.detailAddress || user?.detail_address || ''
        };
      }
    } catch (e) {
      console.warn('⚠️ [청구정보] localStorage 불러오기 실패:', e);
    }

    return {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      postalCode: user?.postal_code || '',
      address: user?.address || '',
      detailAddress: user?.detail_address || ''
    };
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
  const [availableInsurances, setAvailableInsurances] = useState<any[]>([]);
  const [selectedInsurance, setSelectedInsurance] = useState<any>(null);
  const [insurancesLoading, setInsurancesLoading] = useState(false);

  // 팝업 상품 여부 확인 (배송지 필요 여부 판단용)
  const hasPopupProducts =
    orderData?.items?.some((item: any) => item.category === '팝업') || // 장바구니 주문
    booking?.listing?.category === '팝업' || // 단일 상품 주문
    false;

  // 최종 결제 금액 계산 (배송비 + 보험료 + 포인트 차감 후)
  const orderTotal = orderData ? orderData.total : parseInt(booking?.totalPrice || amount || totalAmount || '0');
  // orderData.deliveryFee가 있으면 이미 orderData.total에 배송비 포함됨 (장바구니에서 온 경우)
  const totalWithDelivery = orderData?.deliveryFee !== undefined ? orderTotal : orderTotal + deliveryFee;
  const insuranceFee = selectedInsurance ? selectedInsurance.price : 0;
  const totalWithInsurance = totalWithDelivery + insuranceFee;
  const finalAmount = Math.max(0, totalWithInsurance - pointsToUse);

  // 🐛 디버깅 로그
  useEffect(() => {
    if (orderData) {
      console.log('💰 [PaymentPage] 금액 계산 디버깅:', {
        'orderData.subtotal': orderData.subtotal,
        'orderData.deliveryFee': orderData.deliveryFee,
        'orderData.total': orderData.total,
        'deliveryFee (state)': deliveryFee,
        'orderTotal': orderTotal,
        'totalWithDelivery': totalWithDelivery,
        'hasPopupProducts': hasPopupProducts
      });
    }
  }, [orderData, deliveryFee, totalWithDelivery, orderTotal, hasPopupProducts]);

  // ✅ 청구정보 변경 시 localStorage에 자동 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('billingInfo', JSON.stringify(billingInfo));
      console.log('💾 [청구정보] localStorage에 저장:', billingInfo);
    } catch (e) {
      console.warn('⚠️ [청구정보] localStorage 저장 실패:', e);
    }
  }, [billingInfo]);

  // 사용자 프로필 데이터 가져오기
  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          console.warn('⚠️ [Profile] 토큰 없음, 프로필 조회 건너뜀');
          return;
        }

        const response = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            console.log('✅ [Profile] 사용자 프로필 로드:', data.user);
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
        } else {
          console.error('❌ [Profile] 프로필 조회 실패:', response.status);
        }
      } catch (error) {
        console.error('❌ [Profile] 프로필 조회 오류:', error);
      }
    };

    fetchUserProfile();
    fetchPoints();
  }, [isLoggedIn]);

  // 사용자 포인트 조회
  const fetchPoints = async () => {
    if (!user?.id) return;

    setPointsLoading(true);
    try {
      const response = await fetch('/api/user/points', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
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

  // 카테고리별 보험 조회
  const fetchInsurances = async (category: string) => {
    setInsurancesLoading(true);
    try {
      const response = await fetch(`/api/insurance?category=${category}`);
      const data = await response.json();

      if (data.success) {
        setAvailableInsurances(data.data || []);
        console.log(`✅ ${category} 보험 조회 성공:`, data.data?.length || 0, '개');
      }
    } catch (error) {
      console.error('Failed to fetch insurances:', error);
    } finally {
      setInsurancesLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    // 장바구니 주문인 경우
    if (orderData) {
      setLoading(false);
      return;
    }

    // 렌트카 예약 (bookingNumber가 있는 경우)
    // URL 파라미터로 모든 정보가 전달되므로 DB 조회 불필요
    if (bookingNumber) {
      setLoading(false);
      return;
    }

    // 일반 단일 예약 (숙박 등 - bookingId만 있는 경우)
    if (bookingId) {
      loadBookingDetails();
      return;
    }

    // localStorage에서 숙박 예약 데이터 확인 (AccommodationDetailPage에서 전달)
    // ✅ 렌트카는 URL 파라미터로 전달되므로 localStorage는 숙박 전용
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

    // 결제 정보 없음
    toast.error('결제 정보가 없습니다.');
    navigate('/');
    return;
  }, [bookingId, orderData, isLoggedIn]);

  // 배송비 설정 (장바구니에서 이미 계산된 값 사용)
  useEffect(() => {
    if (orderData?.deliveryFee !== undefined) {
      // 장바구니에서 전달된 배송비 사용 (표시용, orderData.total에 이미 포함됨)
      setDeliveryFee(orderData.deliveryFee);
      setDeliveryFeeLoading(false);
    } else if (!hasPopupProducts) {
      // 팝업 상품이 없으면 배송비 0
      setDeliveryFee(0);
      setDeliveryFeeLoading(false);
    } else {
      // 팝업 상품인 경우 배송비 계산
      // 단일 팝업 상품: 5만원 미만이면 3,000원
      const productAmount = parseInt(booking?.totalPrice || amount || totalAmount || '0');

      if (productAmount < 50000) {
        setDeliveryFee(3000);
        console.log('✅ [PaymentPage] 배송비 계산: 5만원 미만 → 3,000원');
      } else {
        setDeliveryFee(0);
        console.log('✅ [PaymentPage] 배송비 계산: 5만원 이상 → 무료');
      }
      setDeliveryFeeLoading(false);
    }
  }, [hasPopupProducts, orderData?.deliveryFee, booking?.totalPrice, amount, totalAmount]);

  // 보험 조회 (예약 정보 로드 후 카테고리별 보험 조회)
  useEffect(() => {
    let category = null;

    // 장바구니 주문인 경우 첫 번째 상품의 카테고리 사용
    if (orderData?.items && orderData.items.length > 0) {
      category = orderData.items[0].category;
    }
    // 단일 예약인 경우
    else if (booking?.listing?.category) {
      category = booking.listing.category;
    }

    // 카테고리 매핑 (한글 → 영문)
    const categoryMap: { [key: string]: string } = {
      '여행': 'tour',
      '투어': 'tour',
      'tour': 'tour',
      '렌트카': 'rentcar',
      'rentcar': 'rentcar',
      '숙박': 'stay',
      'stay': 'stay',
      '체험': 'experience',
      'experience': 'experience',
      '맛집': 'food',
      'food': 'food'
    };

    if (category) {
      const mappedCategory = categoryMap[category] || category;
      console.log(`🏥 [보험] ${category} → ${mappedCategory} 보험 조회`);
      fetchInsurances(mappedCategory);
    }
  }, [booking, orderData]);

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
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
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
          // ✅ 배송비 포함 금액으로 검증
          if (pointsToUse > totalWithDelivery) {
            toast.error('주문 금액을 초과하여 포인트를 사용할 수 없습니다.');
            setIsProcessing(false);
            return;
          }
        }

        // 장바구니 주문 생성 (Toss Payments로 넘기기 전 준비)
        // ✅ 팝업 상품이 있을 때만 배송 정보 포함 (PG사 심사 필수)

        // 🔍 디버그: 주문 생성 전 item 데이터 확인
        console.log('📦 [주문 생성] orderData.items:', orderData.items);
        const mappedItems = orderData.items.map((item: any) => {
          const listingId = Number(item.listingId || item.id);
          console.log(`📦 [주문 생성] item mapping:`, {
            'item.id': item.id,
            'item.listingId': item.listingId,
            '→ listingId': listingId,
            name: item.name || item.title
          });
          return {
            listingId, // ✅ 실제 상품 ID 사용
            name: item.name || item.title, // ✅ 상품명 추가
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
          };
        });

        const orderResponse = await api.createOrder({
          userId: Number(user?.id) || 1,
          items: mappedItems,
          subtotal: orderData.subtotal,
          deliveryFee: orderData.deliveryFee || 0,
          couponDiscount: 0,
          couponCode: null,
          pointsUsed: pointsToUse,
          total: finalAmount,
          status: 'pending' as const,
          paymentMethod,
          // ✅ 보험 정보 전달
          insurance: selectedInsurance ? {
            id: selectedInsurance.id,
            name: selectedInsurance.name,
            price: selectedInsurance.price,
            coverage_amount: selectedInsurance.coverage_amount
          } : null,
          // ✅ 배송 정보 전달 (팝업 상품 배송용)
          shippingInfo: {
            name: billingInfo.name,
            email: billingInfo.email,
            phone: billingInfo.phone,
            zipcode: billingInfo.postalCode,
            address: billingInfo.address,
            addressDetail: billingInfo.detailAddress,
            memo: '' // 추후 배송 메모 필드 추가 시 사용
          },
          // ✅ 청구 정보 전달 (주문자 정보 - 관리자 페이지 표시용)
          billingInfo: {
            name: billingInfo.name,
            email: billingInfo.email,
            phone: billingInfo.phone
          }
        });

        if (orderResponse.success) {
          // 청구 정보 저장 (이름, 전화번호)
          try {
            await fetch('/api/user/profile', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                'x-user-id': user?.id?.toString() || ''
              },
              body: JSON.stringify({
                name: billingInfo.name,
                phone: billingInfo.phone
              })
            });
          } catch (profileError) {
            console.error('프로필 저장 실패:', profileError);
            // 프로필 저장 실패해도 주문은 계속 진행
          }

          // 주문 생성 성공 - PaymentWidget에 필요한 정보 설정 (포인트 차감 후 금액)
          setPreparedOrderNumber(orderResponse.data.orderNumber);
          setPreparedAmount(finalAmount);

          // 주문명: 첫 번째 상품명 + 나머지 개수
          const firstProductName = orderData.items[0]?.name || orderData.items[0]?.title || '상품';
          const remainingCount = orderData.items.length - 1;
          const orderName = remainingCount > 0
            ? `${firstProductName} 외 ${remainingCount}개`
            : firstProductName;
          console.log('🏷️ [주문명 설정]', { firstProductName, orderName, firstItem: orderData.items[0] });
          setPreparedOrderName(orderName);

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
      toast.error('이름, 이메일, 전화번호를 입력해주세요.');
      return false;
    }

    // 팝업 상품이 있을 때만 주소 필수 (이미 handlePreparePayment에서 체크했지만 이중 검증)
    if (hasPopupProducts && (!billingInfo.postalCode || !billingInfo.address)) {
      toast.error('팝업 상품 배송을 위해 배송지 주소를 입력해주세요.');
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
            {/* 청구 정보 */}
            <Card>
              <CardHeader>
                <CardTitle>청구 정보</CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  주문 확인 및 배송을 위해 <strong className="text-purple-700">실제 정보</strong>를 정확하게 입력해주세요.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 안내 메시지 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">실제 정보 입력 필수</p>
                    <ul className="text-xs space-y-0.5 text-blue-700">
                      <li>• 주문 확인 및 환불 처리를 위해 정확한 정보가 필요합니다</li>
                      <li>• 팝업 상품은 입력하신 주소로 배송됩니다</li>
                      <li>• 입력한 정보는 안전하게 보호됩니다</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    autoComplete="name"
                    value={billingInfo.name}
                    onChange={(e) => setBillingInfo(prev => ({
                      ...prev,
                      name: e.target.value
                    }))}
                    placeholder="실명을 입력하세요 (예: 홍길동)"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">주문 확인에 사용됩니다</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    이메일 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    autoComplete="email"
                    value={billingInfo.email}
                    onChange={(e) => setBillingInfo(prev => ({
                      ...prev,
                      email: e.target.value
                    }))}
                    placeholder="실제 이메일 주소 (예: example@email.com)"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">주문 확인 및 영수증 발송에 사용됩니다</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    전화번호 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    autoComplete="tel"
                    value={billingInfo.phone}
                    onChange={(e) => setBillingInfo(prev => ({
                      ...prev,
                      phone: e.target.value
                    }))}
                    placeholder="연락 가능한 전화번호 (예: 010-1234-5678)"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">주문 및 배송 관련 연락에 사용됩니다</p>
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
                  <h3 className="font-medium text-gray-800">
                    {orderData?.items?.[0]?.title || orderData?.items?.[0]?.name || booking?.listing?.title || title}
                  </h3>
                  {(orderData?.items?.[0]?.category || booking?.listing?.category) && (
                    <p className="text-sm text-gray-600 mt-1">
                      {(() => {
                        const category = orderData?.items?.[0]?.category || booking?.listing?.category;
                        if (category === '팝업' || category === 'popup') return '팝업 상품';
                        if (category === '숙박' || category === 'stay') return '숙박';
                        if (category === '투어' || category === 'tour') return '투어';
                        if (category === '렌트카' || category === 'rentcar') return '렌트카';
                        if (category === '음식' || category === 'food') return '음식';
                        if (category === '체험' || category === 'experience') return '체험';
                        if (category === '관광지' || category === 'tourist') return '관광지';
                        if (category === '행사' || category === 'event') return '행사';
                        return category;
                      })()}
                    </p>
                  )}
                </div>

                {/* 🔧 FIX: orderData가 있으면 orderData.items만 사용, booking 무시 */}
                {/* 팝업 상품이 아닐 때만 예약 세부 정보 표시 */}
                {!orderData && booking && booking.listing?.category !== '팝업' && booking.listing?.category !== 'popup' && (
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

                {/* 장바구니 주문(orderData)인 경우 각 상품 정보 표시 */}
                {orderData && orderData.items && orderData.items.length > 0 && (
                  <div className="space-y-2 text-sm text-gray-600">
                    {orderData.items.map((item: any, index: number) => (
                      <div key={index} className="flex items-start gap-2 py-1 border-b border-gray-100 last:border-0">
                        <span className="text-gray-400">•</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{item.name || item.title}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            {item.quantity > 1 && <span>{item.quantity}개</span>}
                            {item.selectedDate && (
                              <>
                                <Calendar className="h-3 w-3" />
                                <span>{item.selectedDate}</span>
                              </>
                            )}
                            {(item.adults || item.children || item.infants) && (
                              <>
                                <Users className="h-3 w-3" />
                                <span>
                                  {[
                                    item.adults && `성인 ${item.adults}`,
                                    item.children && `아동 ${item.children}`,
                                    item.infants && `유아 ${item.infants}`
                                  ].filter(Boolean).join(', ')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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

            {/* 보험 선택 */}
            {availableInsurances.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    보험 선택 (선택사항)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    여행 중 발생할 수 있는 다양한 위험에 대비하여 보험을 추가하실 수 있습니다.
                  </p>

                  {insurancesLoading ? (
                    <div className="text-center py-6 text-gray-500">보험 상품을 불러오는 중...</div>
                  ) : (
                    <div className="space-y-3">
                      {/* 보험 미선택 옵션 */}
                      <div
                        onClick={() => setSelectedInsurance(null)}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          !selectedInsurance
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">보험 미가입</p>
                            <p className="text-sm text-gray-500 mt-1">보험 없이 진행</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">0원</p>
                          </div>
                        </div>
                      </div>

                      {/* 보험 상품 목록 */}
                      {availableInsurances.map((insurance) => (
                        <div
                          key={insurance.id}
                          onClick={() => setSelectedInsurance(insurance)}
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                            selectedInsurance?.id === insurance.id
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 flex items-center gap-2">
                                <Shield className="h-4 w-4 text-blue-600" />
                                {insurance.name}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">{insurance.description}</p>

                              {/* 보장 내용 미리보기 */}
                              <div className="mt-2 text-xs text-gray-500 space-y-1">
                                {insurance.coverage_details.items.slice(0, 2).map((item: string, idx: number) => (
                                  <div key={idx} className="flex items-start gap-1">
                                    <span className="text-green-600">✓</span>
                                    <span>{item}</span>
                                  </div>
                                ))}
                                {insurance.coverage_details.items.length > 2 && (
                                  <div className="text-gray-400 ml-3">
                                    외 {insurance.coverage_details.items.length - 2}건의 보장
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className="font-semibold text-blue-600">{insurance.price.toLocaleString()}원</p>
                              <p className="text-xs text-gray-500 mt-1">
                                최대 {(insurance.coverage_amount / 10000).toLocaleString()}만원 보장
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
                      {orderData.deliveryFee !== undefined && orderData.deliveryFee > 0 && (
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1">
                            배송비
                            {deliveryFeeLoading && <span className="text-xs text-gray-400">(계산 중...)</span>}
                          </span>
                          <span>{orderData.deliveryFee.toLocaleString()}원</span>
                        </div>
                      )}
                      {selectedInsurance && (
                        <div className="flex justify-between text-blue-600">
                          <span className="flex items-center gap-1">
                            <Shield className="h-4 w-4" />
                            {selectedInsurance.name}
                          </span>
                          <span>+{selectedInsurance.price.toLocaleString()}원</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-medium text-lg">
                        <span>주문 금액</span>
                        <span className="text-gray-700">{(orderData.total + insuranceFee).toLocaleString()}원</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span>상품 금액</span>
                        <span>{parseInt(booking?.totalPrice || amount || totalAmount || '0').toLocaleString()}원</span>
                      </div>
                      {hasPopupProducts && (
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1">
                            배송비
                            {deliveryFeeLoading && <span className="text-xs text-gray-400">(계산 중...)</span>}
                          </span>
                          <span>
                            {deliveryFee > 0 ? `${deliveryFee.toLocaleString()}원` : <span className="text-green-600">무료</span>}
                          </span>
                        </div>
                      )}
                      {selectedInsurance && (
                        <div className="flex justify-between text-blue-600">
                          <span className="flex items-center gap-1">
                            <Shield className="h-4 w-4" />
                            {selectedInsurance.name}
                          </span>
                          <span>+{selectedInsurance.price.toLocaleString()}원</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-medium text-lg">
                        <span>주문 금액</span>
                        <span className="text-gray-700">{(parseInt(booking?.totalPrice || amount || totalAmount || '0') + deliveryFee + insuranceFee).toLocaleString()}원</span>
                      </div>
                    </>
                  )}
                </div>

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
                    1. Lock 기반 예약 (bookingNumber가 있는 경우 - 렌트카 등)
                    2. 장바구니 주문이 준비된 경우 (preparedOrderNumber가 있는 경우)
                */}
                {isLockBasedBooking || preparedOrderNumber ? (
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
                      customerEmail={billingInfo.email || user?.email || ''}
                      customerName={billingInfo.name || user?.name || '고객'}
                      customerMobilePhone={billingInfo.phone || ''}
                      shippingInfo={{
                        name: billingInfo.name,
                        phone: billingInfo.phone,
                        zipcode: billingInfo.postalCode,
                        address: billingInfo.address,
                        addressDetail: billingInfo.detailAddress
                      }}
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
/**
 * Toss Payments 결제 위젯 컴포넌트
 *
 * 예약 페이지에서 사용하는 결제 UI
 */

import { useState, useEffect } from 'react';
import { loadTossPaymentsWidget, generateOrderId } from '../utils/toss-payments';

export interface PaymentWidgetProps {
  bookingId: number;
  bookingNumber: string;
  amount: number;
  orderName: string;
  customerEmail?: string;
  customerName?: string;
  customerMobilePhone?: string;
  shippingInfo?: {
    name: string;
    phone: string;
    zipcode: string;
    address: string;
    addressDetail: string;
  };
  onSuccess?: (paymentKey: string, orderId: string, amount: number) => void;
  onFail?: (error: any) => void;
}

export default function PaymentWidget({
  bookingId,
  bookingNumber,
  amount,
  orderName,
  customerEmail,
  customerName,
  customerMobilePhone,
  shippingInfo,
  onSuccess,
  onFail
}: PaymentWidgetProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentWidget, setPaymentWidget] = useState<any>(null);

  useEffect(() => {
    initializePaymentWidget();
  }, []);

  async function initializePaymentWidget() {
    try {
      setIsLoading(true);
      setError(null);

      console.log('💳 Toss Payments 위젯 초기화 중...');

      // Payment Widget 로드
      const widget = await loadTossPaymentsWidget();

      // 결제 UI 렌더링
      await widget.renderPaymentMethods('#payment-method', {
        value: amount
      });

      // 약관 동의 UI 렌더링
      await widget.renderAgreement('#agreement');

      setPaymentWidget(widget);
      setIsLoading(false);

      console.log('✅ Toss Payments 위젯 초기화 완료');

    } catch (err: any) {
      console.error('❌ 위젯 초기화 실패:', err);
      setError('결제 위젯을 불러오는 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  }

  async function handlePayment() {
    if (!paymentWidget) {
      alert('결제 위젯이 초기화되지 않았습니다.');
      return;
    }

    try {
      console.log('💳 결제 요청:', { bookingNumber, amount, orderName });

      // successUrl 조건부 설정
      // bookingId가 0이면 장바구니 주문 → PaymentSuccessPage2 사용
      // bookingId가 있으면 단일 예약 → PaymentSuccessPage 사용
      const isCartOrder = bookingId === 0 || bookingNumber.startsWith('ORDER_');
      const successUrl = isCartOrder
        ? `${window.location.origin}/payment/success2`
        : `${window.location.origin}/payment/success?bookingId=${bookingId}`;
      const failUrl = isCartOrder
        ? `${window.location.origin}/payment/fail2`
        : `${window.location.origin}/payment/fail?bookingId=${bookingId}`;

      // 결제 요청 (배송 정보 포함)
      const paymentRequest: any = {
        orderId: bookingNumber,  // 우리 시스템의 booking_number 또는 ORDER_xxx
        orderName,
        customerEmail,
        customerName,
        successUrl,
        failUrl
      };

      // 고객 전화번호 추가 (있으면)
      if (customerMobilePhone) {
        paymentRequest.customerMobilePhone = customerMobilePhone;
      }

      // 배송 정보 추가 (있으면)
      if (shippingInfo) {
        paymentRequest.deliveryInformation = {
          receiverName: shippingInfo.name,
          receiverPhoneNumber: shippingInfo.phone,
          addressLine1: shippingInfo.address,
          addressLine2: shippingInfo.addressDetail,
          zipCode: shippingInfo.zipcode
        };
      }

      await paymentWidget.requestPayment(paymentRequest);

      // Toss Payments로 리다이렉트됨 (successUrl 또는 failUrl로 돌아옴)

    } catch (err: any) {
      console.error('❌ 결제 요청 실패:', err);
      alert(err.message || '결제 요청 중 오류가 발생했습니다.');

      if (onFail) {
        onFail(err);
      }
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">결제 위젯을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <p className="text-gray-800 font-semibold mb-2">결제 위젯 로드 실패</p>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <button
            onClick={initializePaymentWidget}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* 결제 정보 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">결제 정보</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">주문명</span>
            <span className="text-gray-900 font-medium">{orderName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">예약번호</span>
            <span className="text-gray-900 font-mono text-sm">{bookingNumber}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-200">
            <span className="text-gray-900 font-semibold">총 결제금액</span>
            <span className="text-blue-600 font-bold text-xl">
              {amount.toLocaleString()}원
            </span>
          </div>
        </div>
      </div>

      {/* 결제 수단 선택 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">결제 수단</h3>
        <div id="payment-method" className="min-h-[200px]"></div>
      </div>

      {/* 약관 동의 */}
      <div className="mb-6">
        <div id="agreement" className="min-h-[100px]"></div>
      </div>

      {/* 결제 버튼 */}
      <button
        onClick={handlePayment}
        className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors"
      >
        {amount.toLocaleString()}원 결제하기
      </button>

      {/* 안내 문구 */}
      <div className="mt-4 text-center text-sm text-gray-500">
        <p>결제는 안전하게 Toss Payments를 통해 처리됩니다.</p>
        <p className="mt-1">결제 후 10분 이내에 완료해주세요.</p>
      </div>
    </div>
  );
}

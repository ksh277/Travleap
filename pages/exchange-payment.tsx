/**
 * 교환 배송비 결제 페이지
 *
 * GET /exchange-payment?exchangeId=xxx
 *
 * 기능:
 * - 교환 정보 조회
 * - 왕복 배송비 6,000원 결제
 * - Toss Payments 연동
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { loadTossPayments } from '@tosspayments/payment-sdk';
import { toast } from 'sonner';

interface ExchangeInfo {
  id: string;
  originalOrderNumber: string;
  productName: string;
  exchangeReason: string;
  amount: number;
  paymentStatus: string;
  customerName: string;
  customerEmail: string;
  shippingAddress?: string;
}

export default function ExchangePaymentPage() {
  const router = useRouter();
  const { exchangeId } = router.query;

  const [exchangeInfo, setExchangeInfo] = useState<ExchangeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // 교환 정보 조회
  useEffect(() => {
    if (!exchangeId) return;

    const fetchExchangeInfo = async () => {
      try {
        const response = await fetch(`/api/exchange/${exchangeId}`);
        const data = await response.json();

        if (data.success) {
          setExchangeInfo(data.data);
        } else {
          toast.error(data.message || '교환 정보를 불러올 수 없습니다.');
          router.push('/');
        }
      } catch (error) {
        console.error('교환 정보 조회 실패:', error);
        toast.error('교환 정보를 불러오는 중 오류가 발생했습니다.');
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExchangeInfo();
  }, [exchangeId, router]);

  // 결제 진행
  const handlePayment = async () => {
    if (!exchangeInfo || isProcessing) return;

    // 이미 결제 완료된 경우
    if (exchangeInfo.paymentStatus === 'paid') {
      toast.error('이미 결제가 완료된 교환입니다.');
      return;
    }

    setIsProcessing(true);

    try {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) {
        throw new Error('Toss Payments 클라이언트 키가 설정되지 않았습니다.');
      }

      const tossPayments = await loadTossPayments(clientKey);

      // 결제 요청
      await tossPayments.requestPayment('카드', {
        amount: exchangeInfo.amount,
        orderId: `EXCHANGE_${exchangeInfo.id}`,
        orderName: `교환 배송비 (${exchangeInfo.productName})`,
        customerName: exchangeInfo.customerName,
        customerEmail: exchangeInfo.customerEmail,
        successUrl: `${window.location.origin}/api/exchange/payment-success`,
        failUrl: `${window.location.origin}/exchange-payment?exchangeId=${exchangeInfo.id}&status=fail`,
      });
    } catch (error) {
      console.error('결제 요청 실패:', error);
      toast.error('결제 요청 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">교환 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!exchangeInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">교환 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-8 text-white">
            <h1 className="text-2xl font-bold mb-2">🔄 상품 교환 배송비 결제</h1>
            <p className="text-yellow-100">교환 처리를 위해 왕복 배송비 결제가 필요합니다</p>
          </div>

          {/* 교환 정보 */}
          <div className="px-6 py-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">교환 정보</h2>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">주문번호</span>
                  <span className="font-semibold">{exchangeInfo.originalOrderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">상품명</span>
                  <span className="font-medium">{exchangeInfo.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">교환 사유</span>
                  <span className="text-sm">{exchangeInfo.exchangeReason}</span>
                </div>
                {exchangeInfo.shippingAddress && (
                  <div className="pt-3 border-t">
                    <span className="text-gray-600 block mb-1">배송지</span>
                    <span className="text-sm">{exchangeInfo.shippingAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 결제 금액 */}
            <div>
              <h2 className="text-lg font-semibold mb-4">결제 금액</h2>
              <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">왕복 배송비</span>
                  <span className="text-3xl font-bold text-orange-600">
                    ₩{exchangeInfo.amount.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 text-right">
                  (반품 배송비 3,000원 + 재발송 배송비 3,000원)
                </p>
              </div>
            </div>

            {/* 안내사항 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📌 교환 진행 절차</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>왕복 배송비 6,000원 결제</li>
                <li>기존 상품 반품 배송 (배송지 안내 문자 발송)</li>
                <li>새 상품 재발송</li>
                <li>교환 완료</li>
              </ol>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-2">⚠️ 안내사항</h3>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• 결제 후 반품 배송지 안내를 별도로 전달드립니다.</li>
                <li>• 상품에 하자가 있는 경우 배송비는 판매자 부담입니다.</li>
                <li>• 문의사항은 고객센터로 연락주세요.</li>
              </ul>
            </div>

            {/* 결제 버튼 */}
            {exchangeInfo.paymentStatus === 'paid' ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <div className="text-green-700 font-semibold text-lg mb-2">
                  ✅ 결제가 완료되었습니다
                </div>
                <p className="text-sm text-green-600">
                  교환 처리가 곧 시작됩니다.
                </p>
              </div>
            ) : (
              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isProcessing ? '결제 진행 중...' : `₩${exchangeInfo.amount.toLocaleString()} 결제하기`}
              </button>
            )}
          </div>
        </div>

        {/* 뒤로 가기 */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/')}
            className="text-gray-600 hover:text-gray-800 text-sm"
          >
            ← 홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

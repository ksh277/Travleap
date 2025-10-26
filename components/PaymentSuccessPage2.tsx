/**
 * 결제 성공 페이지 (신규 - Toss Payments 용)
 *
 * Toss Payments에서 결제 성공 후 리다이렉트되는 페이지
 * Query Params: paymentKey, orderId, amount
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function PaymentSuccessPage2() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    processPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function processPayment() {
    try {
      setIsProcessing(true);
      setError(null);

      // URL 파라미터 추출
      const paymentKey = searchParams.get('paymentKey');
      const orderId = searchParams.get('orderId');
      const amount = searchParams.get('amount');

      if (!paymentKey || !orderId || !amount) {
        throw new Error('결제 정보가 올바르지 않습니다.');
      }

      console.log('결제 확인 요청...', { paymentKey, orderId, amount });

      // 결제 확인 API 호출
      const resp = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount: parseInt(amount)
        })
      });
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.message || '결제 확인 요청 실패');
      }
      const result = await resp.json();

      if (!result.success) {
        throw new Error(result.message || '결제 처리에 실패했습니다.');
      }

      console.log('결제 확인 완료:', result);

      setBookingId(result.bookingId || null);
      setReceiptUrl(result.receiptUrl || null);

      // 장바구니 주문인 경우 장바구니 비우기
      if (orderId && orderId.startsWith('ORDER_')) {
        try {
          const userId = localStorage.getItem('userId');
          if (userId) {
            await fetch(`/api/cart/clear?userId=${userId}`, {
              method: 'DELETE'
            });
            console.log('✅ 장바구니 비우기 완료');
          }
        } catch (clearError) {
          console.error('장바구니 비우기 실패:', clearError);
          // 에러가 발생해도 계속 진행 (결제는 성공했으므로)
        }
      }

      setIsProcessing(false);

    } catch (err: any) {
      console.error('결제 처리 실패:', err);
      setError(err.message || '결제 처리 중 문제가 발생했습니다.');
      setIsProcessing(false);
    }
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">결제 처리 중...</h2>
          <p className="text-gray-600">결제를 최종 확인하고 있습니다. 잠시만 기다려 주세요.</p>
          <p className="text-sm text-gray-500 mt-4">영수증 페이지는 새 창에서 열릴 수 있습니다.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-6xl mb-6">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">결제 처리 실패</h2>
          <p className="text-gray-600 mb-6">{error}</p>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              홈으로 돌아가기
            </button>
            <button
              onClick={() => navigate('/mypage')}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              내 예약 보기
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">문제가 지속되면 고객센터에 문의해 주세요.</p>
          </div>
        </div>
      </div>
    );
  }

  // 결제 성공
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        {/* 완료 아이콘 */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">결제가 완료되었습니다</h2>
          <p className="text-gray-600">예약이 확정되었습니다.</p>
        </div>

        {/* 예약 정보 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
          {bookingId && (
            <div className="flex justify-between">
              <span className="text-gray-600">예약 번호</span>
              <span className="text-gray-900 font-semibold">#{bookingId}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">주문 번호</span>
            <span className="text-gray-900 font-mono text-sm">{searchParams.get('orderId')}</span>
          </div>
          <div className="flex justify-between pt-3 border-t border-gray-200">
            <span className="text-gray-900 font-semibold">결제 금액</span>
            <span className="text-blue-600 font-bold text-lg">
              {parseInt(searchParams.get('amount') || '0').toLocaleString()}원
            </span>
          </div>
        </div>

        {/* 영수증 링크 */}
        {receiptUrl && (
          <a
            href={receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 mb-3 bg-gray-100 text-gray-700 text-center rounded-lg hover:bg-gray-200 transition-colors"
          >
            영수증 보기
          </a>
        )}

        {/* 액션 버튼 */}
        <div className="space-y-3">
          <button
            onClick={() => navigate(`/mypage`)}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            내 예약 확인하러 가기
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>

        {/* 추가 안내 */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600 mb-2">예약 확인은 마이페이지에서 확인하실 수 있습니다.</p>
          <p className="text-xs text-gray-500">추가 문의 사항이 있으면 고객센터로 문의해 주세요.</p>
        </div>
      </div>
    </div>
  );
}


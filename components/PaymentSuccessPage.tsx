import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { approveTossPayment } from '../utils/toss-payment';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('결제를 처리하고 있습니다...');

  useEffect(() => {
    const processPayment = async () => {
      try {
        // URL에서 파라미터 추출
        const paymentKey = searchParams.get('paymentKey');
        const orderId = searchParams.get('orderId');
        const amount = searchParams.get('amount');
        const bookingId = searchParams.get('bookingId');

        if (!paymentKey || !orderId || !amount) {
          throw new Error('결제 정보가 올바르지 않습니다.');
        }

        // 1. 토스페이먼츠에 결제 승인 요청
        const paymentResult = await approveTossPayment(
          paymentKey,
          orderId,
          parseInt(amount)
        );

        console.log('결제 승인 완료:', paymentResult);

        // 2. DB에 결제 정보 저장
        if (bookingId) {
          await fetch('/api/rentcar/bookings/payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              bookingId: parseInt(bookingId),
              paymentKey: paymentResult.paymentKey,
              orderId: paymentResult.orderId,
              amount: paymentResult.totalAmount,
              method: paymentResult.method,
              status: paymentResult.status,
              approvedAt: paymentResult.approvedAt
            })
          });

          // 3. 예약 상태 업데이트 (confirmed) + 차량 예약 불가 처리
          await fetch(`/api/rentcar/bookings/${bookingId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              booking_status: 'confirmed',
              payment_status: 'completed'
            })
          });
        }

        setStatus('success');
        setMessage('결제가 완료되었습니다!');

        // 3초 후 마이페이지로 이동
        setTimeout(() => {
          navigate('/mypage');
        }, 3000);

      } catch (error: any) {
        console.error('결제 처리 오류:', error);
        setStatus('error');
        setMessage(error.message || '결제 처리 중 오류가 발생했습니다.');
      }
    };

    processPayment();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {status === 'processing' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">결제 처리 중</h2>
            <p className="text-gray-600">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">결제 완료!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">잠시 후 마이페이지로 이동합니다...</p>
            <button
              onClick={() => navigate('/mypage')}
              className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
            >
              마이페이지로 이동
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">결제 실패</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => navigate(-1)}
              className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

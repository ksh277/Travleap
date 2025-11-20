import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('결제를 처리하고 있습니다...');
  const [paymentData, setPaymentData] = useState<any>(null);
  const qrCodeRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const processPayment = async () => {
      try {
        // URL에서 파라미터 추출
        const paymentKey = searchParams.get('paymentKey');
        const orderId = searchParams.get('orderId');
        const amount = searchParams.get('amount');

        if (!paymentKey || !orderId || !amount) {
          throw new Error('결제 정보가 올바르지 않습니다.');
        }

        console.log('💳 결제 승인 중...', orderId);

        // ✅ 통합 결제 API 사용 (모든 카테고리 지원: 렌트카, 투어, 숙박, 관광지, 이벤트, 체험, 음식점, 팝업)
        const response = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: parseInt(amount)
          })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || result.error || '결제 승인에 실패했습니다.');
        }

        console.log('✅ 결제 승인 완료:', result);

        setStatus('success');
        setMessage('결제가 완료되었습니다!');
        setPaymentData({ orderId, ...result });

        // 3초 후 마이페이지로 이동
        setTimeout(() => {
          navigate('/mypage');
        }, 3000);

      } catch (error: any) {
        console.error('❌ 결제 처리 오류:', error);
        setStatus('error');
        setMessage(error.message || '결제 처리 중 오류가 발생했습니다.');
      }
    };

    processPayment();
  }, [searchParams, navigate]);

  // QR 코드 생성
  const generateQR = async (orderNumber: string) => {
    try {
      const canvas = qrCodeRef.current;
      if (canvas) {
        await QRCode.toCanvas(canvas, orderNumber, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      }
    } catch (error) {
      console.error('QR 생성 오류:', error);
    }
  };

  // QR 표시 여부 (결제 완료 페이지는 모든 주문에 표시)
  const shouldShowQR = paymentData?.orderId;

  // 결제 성공 시 QR 생성
  useEffect(() => {
    if (status === 'success' && shouldShowQR) {
      generateQR(paymentData.orderId);
    }
  }, [status, paymentData, shouldShowQR]);

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

            {/* QR 코드 표시 (렌트카/팝업 제외) */}
            {shouldShowQR && (
              <div className="my-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold text-gray-700 mb-3">주문 QR 코드</p>
                <div className="bg-white p-3 rounded-lg inline-block shadow-sm">
                  <canvas ref={qrCodeRef} />
                </div>
                <p className="text-xs text-gray-500 mt-3 px-4">
                  주문번호: <span className="font-mono">{paymentData?.orderId}</span>
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  이 QR 코드를 파트너사에 제시하세요
                </p>
              </div>
            )}

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

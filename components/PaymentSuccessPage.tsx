import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('결제를 처리하고 있습니다...');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [couponData, setCouponData] = useState<any>(null); // 발급된 쿠폰 정보
  const qrCodeRef = useRef<HTMLCanvasElement>(null);
  const couponQrRef = useRef<HTMLCanvasElement>(null); // 쿠폰 QR용

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

        // ✅ 결제 성공 시 쿠폰 사용 처리
        const pendingCouponStr = localStorage.getItem('pendingCoupon');
        if (pendingCouponStr) {
          try {
            const pendingCoupon = JSON.parse(pendingCouponStr);
            console.log('🎟️ 쿠폰 사용 처리 시작:', pendingCoupon);

            const couponUseResponse = await fetch('/api/coupons/use', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                code: pendingCoupon.code,
                userId: pendingCoupon.userId,
                orderId: orderId,
                discountAmount: pendingCoupon.discountAmount
              })
            });

            const couponUseResult = await couponUseResponse.json();
            if (couponUseResult.success) {
              console.log('✅ 쿠폰 사용 처리 완료:', pendingCoupon.code);
            } else {
              console.warn('⚠️ 쿠폰 사용 처리 실패:', couponUseResult);
            }
          } catch (couponError) {
            console.error('❌ 쿠폰 사용 처리 오류:', couponError);
          } finally {
            // 처리 후 localStorage에서 제거
            localStorage.removeItem('pendingCoupon');
          }
        }

        setStatus('success');
        setMessage('결제가 완료되었습니다!');
        setPaymentData({ orderId, ...result });

        // 쿠폰 정보가 있으면 저장
        if (result.coupon) {
          setCouponData(result.coupon);
          console.log('🎟️ 쿠폰 발급됨:', result.coupon);
        }

        // 쿠폰이 발급되면 자동 이동 취소, 아니면 3초 후 이동
        if (!result.coupon) {
          setTimeout(() => {
            navigate('/mypage');
          }, 3000);
        }

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

  // 쿠폰 QR 생성
  useEffect(() => {
    const generateCouponQR = async () => {
      if (couponData?.qr_url && couponQrRef.current) {
        try {
          await QRCode.toCanvas(couponQrRef.current, couponData.qr_url, {
            width: 180,
            margin: 2,
            color: {
              dark: '#059669', // emerald-600
              light: '#FFFFFF'
            }
          });
        } catch (error) {
          console.error('쿠폰 QR 생성 오류:', error);
        }
      }
    };
    generateCouponQR();
  }, [couponData]);

  // 쿠폰 이미지 저장 기능
  const saveCouponImage = () => {
    if (!couponQrRef.current) return;

    const link = document.createElement('a');
    link.download = `coupon_${couponData?.code || 'ticket'}.png`;
    link.href = couponQrRef.current.toDataURL('image/png');
    link.click();
  };

  // 쿠폰 코드 복사 기능
  const copyCouponCode = async () => {
    if (!couponData?.code) return;
    try {
      await navigator.clipboard.writeText(couponData.code);
      alert('쿠폰 코드가 복사되었습니다!');
    } catch (error) {
      console.error('복사 실패:', error);
    }
  };

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

            {/* 쿠폰이 발급된 경우 */}
            {couponData && (
              <div className="my-6 p-4 bg-emerald-50 rounded-lg border-2 border-emerald-200">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                  <p className="text-sm font-bold text-emerald-700">할인 쿠폰이 발급되었습니다!</p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <p className="font-bold text-gray-800 mb-1">{couponData.name}</p>
                  {couponData.region_name && (
                    <p className="text-xs text-gray-500 mb-3">{couponData.region_name} 지역 가맹점에서 사용</p>
                  )}

                  {/* 쿠폰 QR 코드 */}
                  <div className="bg-emerald-50 p-3 rounded-lg inline-block mb-3">
                    <canvas ref={couponQrRef} />
                  </div>

                  {/* 쿠폰 코드 */}
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="font-mono text-lg font-bold text-emerald-700">{couponData.code}</span>
                    <button
                      onClick={copyCouponCode}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded"
                      title="코드 복사"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>

                  {/* 가맹점별 할인 안내 */}
                  <p className="text-xs text-emerald-600 font-semibold mb-2">
                    할인율은 가맹점마다 다릅니다
                  </p>
                  <p className="text-xs text-gray-400">
                    유효기간: {new Date(couponData.expires_at).toLocaleDateString('ko-KR')}까지
                  </p>
                </div>

                {/* 버튼들 */}
                <div className="mt-4 space-y-2">
                  {/* QR 이미지 저장 */}
                  <button
                    onClick={saveCouponImage}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    쿠폰 이미지 저장
                  </button>

                  {/* 가맹점 보기 */}
                  <button
                    onClick={() => {
                      const region = couponData.region_name || '';
                      navigate(`/partners?coupon=${couponData.code}&region=${encodeURIComponent(region)}`);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-2.5 rounded-lg hover:bg-blue-600 transition text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {couponData.coupon_source === 'campaign' ? '사용 가능 가맹점 보기' : '주변 가맹점 보기'}
                  </button>
                </div>

                <p className="text-xs text-emerald-600 mt-3">
                  마이페이지 &gt; 쿠폰함에서도 확인 가능합니다
                </p>
              </div>
            )}

            {/* 주문 QR 코드 (쿠폰이 없을 때만 표시) */}
            {shouldShowQR && !couponData && (
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

            {!couponData && (
              <p className="text-sm text-gray-500">잠시 후 마이페이지로 이동합니다...</p>
            )}

            <button
              onClick={() => navigate(couponData ? '/mypage?tab=coupons' : '/mypage')}
              className="mt-6 w-full bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-800 transition"
            >
              {couponData ? '쿠폰함 확인하기' : '마이페이지로 이동'}
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

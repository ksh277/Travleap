/**
 * 결제 실패 페이지 (신규 - Toss Payments 용)
 *
 * Toss Payments에서 결제 실패 후 리다이렉트되는 페이지
 * Query Params: code, message, orderId
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function PaymentFailPage2() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    processFailure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function processFailure() {
    try {
      const orderId = searchParams.get('orderId');
      const code = searchParams.get('code');
      const message = searchParams.get('message');

      console.log('결제 실패:', { orderId, code, message });

      if (orderId) {
        // 예약 취소 처리
        await fetch('/api/payments/fail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, reason: message || '사유 없음' })
        }).catch(() => {});
        console.log('예약 취소 처리 완료');
      }

    } catch (error) {
      console.error('실패 처리 중 오류:', error);
    } finally {
      setIsProcessing(false);
    }
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-gray-400 mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-gray-900">처리 중...</h2>
        </div>
      </div>
    );
  }

  const errorCode = searchParams.get('code');
  const errorMessage = searchParams.get('message') || '결제 처리 중 문제가 발생했습니다.';
  const orderId = searchParams.get('orderId');

  // 에러 코드와 안내 메시지
  const getErrorDetails = (code: string | null, message: string) => {
    // ✅ 우리 API 에러 처리
    if (message.includes('재고 부족') || message.includes('STOCK')) {
      return {
        title: '재고 부족',
        description: '선택하신 상품의 재고가 부족합니다. 다른 상품을 선택해주세요.',
        icon: '📦❌',
        action: 'cart' // 장바구니로 이동
      };
    }
    if (message.includes('LISTING_NOT_FOUND') || message.includes('삭제된 상품')) {
      return {
        title: '상품을 찾을 수 없습니다',
        description: '장바구니에 삭제된 상품이 포함되어 있습니다. 장바구니를 새로고침해주세요.',
        icon: '🔍❌',
        action: 'cart'
      };
    }
    if (message.includes('금액이 조작') || message.includes('AMOUNT')) {
      return {
        title: '금액 오류',
        description: '결제 금액에 문제가 발생했습니다. 장바구니를 새로고침해주세요.',
        icon: '💰❌',
        action: 'cart'
      };
    }
    if (message.includes('쿠폰') || message.includes('COUPON')) {
      return {
        title: '쿠폰 오류',
        description: '쿠폰 사용에 문제가 발생했습니다. 쿠폰 없이 다시 시도해주세요.',
        icon: '🎟️❌',
        action: 'retry'
      };
    }
    if (message.includes('포인트') || message.includes('POINT')) {
      return {
        title: '포인트 오류',
        description: '포인트 사용에 문제가 발생했습니다. 포인트 없이 다시 시도해주세요.',
        icon: '⭐❌',
        action: 'retry'
      };
    }

    // ✅ Toss Payments 에러 처리
    switch (code) {
      case 'PAY_PROCESS_CANCELED':
        return {
          title: '결제가 취소되었습니다',
          description: '사용자가 결제를 취소했습니다.',
          icon: '🚫',
          action: 'retry'
        };
      case 'PAY_PROCESS_ABORTED':
        return {
          title: '결제가 중단되었습니다',
          description: '오류로 인해 결제 과정이 중단되었습니다.',
          icon: '⚠️',
          action: 'retry'
        };
      case 'REJECT_CARD_COMPANY':
        return {
          title: '카드 승인 거절',
          description: '카드사에서 결제가 거절되었습니다. 카드 한도를 확인하거나 다른 결제 수단을 시도해주세요.',
          icon: '💳❌',
          action: 'retry'
        };
      case 'INVALID_CARD_NUMBER':
        return {
          title: '잘못된 카드 번호',
          description: '카드 번호가 올바르지 않습니다. 다시 확인해주세요.',
          icon: '💳',
          action: 'retry'
        };
      case 'INVALID_CARD_EXPIRATION':
        return {
          title: '카드 유효기간 오류',
          description: '카드 유효기간이 만료되었거나 잘못 입력되었습니다.',
          icon: '📅❌',
          action: 'retry'
        };
      case 'INVALID_CARD_INSTALLMENT_PLAN':
        return {
          title: '할부 불가',
          description: '선택하신 할부 개월수는 사용할 수 없습니다.',
          icon: '💳',
          action: 'retry'
        };
      case 'NOT_ALLOWED_POINT_USE':
        return {
          title: '포인트 사용 불가',
          description: '해당 카드는 포인트 사용이 불가능합니다.',
          icon: '⭐❌',
          action: 'retry'
        };
      case 'EXCEED_MAX_CARD_INSTALLMENT_PLAN':
        return {
          title: '할부 한도 초과',
          description: '카드 할부 한도를 초과했습니다.',
          icon: '💳❌',
          action: 'retry'
        };
      default:
        return {
          title: '결제 실패',
          description: message || '결제 처리 중 문제가 발생했습니다.',
          icon: '❗',
          action: 'retry'
        };
    }
  };

  const errorDetails = getErrorDetails(errorCode, errorMessage);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        {/* 실패 아이콘 */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{errorDetails.icon}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{errorDetails.title}</h2>
          <p className="text-gray-600">{errorDetails.description}</p>
        </div>

        {/* 오류 정보 */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="space-y-2 text-sm">
            {errorCode && (
              <div className="flex justify-between">
                <span className="text-red-700 font-medium">오류 코드</span>
                <span className="text-red-900 font-mono">{errorCode}</span>
              </div>
            )}
            {orderId && (
              <div className="flex justify-between">
                <span className="text-red-700 font-medium">주문 번호</span>
                <span className="text-red-900 font-mono text-xs">{orderId}</span>
              </div>
            )}
            <div className="pt-2 border-t border-red-200">
              <p className="text-red-800 text-xs">{errorMessage}</p>
            </div>
          </div>
        </div>

        {/* 안내 사항 */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">다음 사항을 확인해 주세요</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>카드 한도가 충분한지 확인</li>
            <li>카드 정보가 정확한지 확인</li>
            <li>인터넷/카드 결제 상태 확인</li>
            <li>다른 결제 수단으로 시도</li>
          </ul>
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-3">
          {/* ✅ 에러 종류에 따라 다른 액션 */}
          {errorDetails.action === 'cart' ? (
            <>
              <button
                onClick={() => navigate('/cart')}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                🛒 장바구니로 이동
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                다른 상품 보러가기
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate(-1)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                다시 시도하기
              </button>
              <button
                onClick={() => navigate('/mypage')}
                className="w-full py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                내 주문 보기
              </button>
            </>
          )}
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            메인으로 돌아가기
          </button>
        </div>

        {/* 고객센터 안내 */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600 mb-2">문제가 계속되시나요?</p>
          <button
            onClick={() => navigate('/contact')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            고객센터에 문의하기 →
          </button>
        </div>
      </div>
    </div>
  );
}


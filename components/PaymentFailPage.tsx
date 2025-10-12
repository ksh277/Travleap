import { useSearchParams, useNavigate } from 'react-router-dom';

export default function PaymentFailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const code = searchParams.get('code');
  const message = searchParams.get('message');
  const bookingId = searchParams.get('bookingId');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">결제 실패</h2>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 font-medium">
              {message || '결제 중 오류가 발생했습니다.'}
            </p>
            {code && (
              <p className="text-xs text-red-600 mt-1">오류 코드: {code}</p>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate(-1)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
            >
              다시 시도
            </button>

            {bookingId && (
              <button
                onClick={() => navigate(`/booking/${bookingId}`)}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition"
              >
                예약 상세보기
              </button>
            )}

            <button
              onClick={() => navigate('/')}
              className="w-full text-gray-600 py-3 hover:text-gray-900 transition"
            >
              홈으로 돌아가기
            </button>
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">자주 발생하는 문제</h3>
            <ul className="text-sm text-gray-600 space-y-1 text-left">
              <li>• 카드 한도 초과</li>
              <li>• 비밀번호 오류</li>
              <li>• 결제 시간 초과</li>
              <li>• 카드사 일시적 오류</li>
            </ul>
            <p className="text-xs text-gray-500 mt-3">
              문제가 계속되면 고객센터로 문의해주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

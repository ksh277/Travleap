/**
 * 쿠폰 사용 진입점 페이지
 * /coupon/use?code=ABC123XY
 *
 * QR 스캔 시 이 페이지로 이동
 * - 파트너 로그인 상태 → 파트너 대시보드로 자동 이동 (금액 입력 화면)
 * - 파트너 로그인 X → 로그인 페이지로
 * - 일반 유저 → 에러 표시
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Loader2, AlertCircle, Store } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function CouponUsePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoggedIn, sessionRestored } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const code = searchParams.get('code');

  useEffect(() => {
    // 세션 복원 대기
    if (!sessionRestored) return;

    // 코드 없음
    if (!code) {
      setError('쿠폰 코드가 없습니다');
      return;
    }

    // 로그인 안됨 → 로그인 페이지로
    if (!isLoggedIn) {
      navigate(`/login?redirect=/coupon/use?code=${code}`);
      return;
    }

    // 파트너 계정 → 파트너 대시보드로 (코드와 함께)
    if (user?.role === 'partner') {
      navigate(`/partner/coupon?code=${code}`);
      return;
    }

    // 일반 유저 → 에러 (파트너만 사용 가능)
    setError('파트너 계정으로 로그인해주세요. 이 페이지는 가맹점 전용입니다.');

  }, [code, isLoggedIn, user, sessionRestored, navigate]);

  // 세션 복원 중
  if (!sessionRestored) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="flex flex-col items-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
            <p className="text-gray-600">처리 중...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="flex flex-col items-center py-12">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">오류</h2>
            <p className="text-gray-600 text-center mb-6">{error}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/')}>
                홈으로
              </Button>
              <Button onClick={() => navigate('/login?redirect=/partner/coupon')}>
                <Store className="h-4 w-4 mr-2" />
                파트너 로그인
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 로딩 중 (리다이렉트 대기)
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="flex flex-col items-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
          <p className="text-gray-600">쿠폰 처리 중...</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default CouponUsePage;

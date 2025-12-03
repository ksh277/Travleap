import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ArrowLeft, Copy, Ticket } from 'lucide-react';
import { toast } from 'sonner';

export function CouponQRPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  // QR 코드가 담을 URL (가맹점에서 스캔용)
  // 프로덕션에서는 실제 도메인 사용, 로컬에서는 현재 origin 사용
  const isProduction = window.location.hostname !== 'localhost';
  const siteUrl = isProduction
    ? window.location.origin  // 프로덕션: https://travleap.com 등
    : 'https://travleap.com';  // 로컬 개발 시 프로덕션 URL 사용
  const qrUrl = `${siteUrl}/partner/coupon?code=${code}`;

  const handleCopyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success('쿠폰 코드가 복사되었습니다');
    }
  };

  if (!code) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Ticket className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold mb-2">쿠폰 코드가 없습니다</h2>
            <Button onClick={() => navigate('/mypage')} variant="outline" className="mt-4">
              마이페이지로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="absolute left-4 top-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            뒤로
          </Button>
          <CardTitle className="flex items-center justify-center gap-2 pt-8">
            <Ticket className="w-6 h-6 text-purple-600" />
            쿠폰 QR 코드
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* QR 코드 */}
          <div className="flex justify-center p-4 bg-white rounded-lg border">
            <QRCodeSVG
              value={qrUrl}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>

          {/* 쿠폰 코드 */}
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-2">쿠폰 코드</div>
              <div className="font-mono text-2xl font-bold tracking-wider text-purple-600">
                {code}
              </div>
            </div>
          </div>

          {/* 안내 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 text-center">
              가맹점에서 이 QR 코드를 스캔하거나<br />
              쿠폰 코드를 보여주세요
            </p>
          </div>

          {/* 버튼들 */}
          <div className="flex gap-2">
            <Button
              onClick={handleCopyCode}
              variant="outline"
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              코드 복사
            </Button>
            <Button
              onClick={() => navigate('/mypage')}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              마이페이지
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CouponQRPage;

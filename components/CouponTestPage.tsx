/**
 * 쿠폰 시스템 테스트 페이지 (알림톡 없는 버전)
 *
 * 기능:
 * 1. 쿠폰 발급받기 (캠페인 코드 입력 → 개인 쿠폰 코드 발급)
 * 2. 내 쿠폰 QR 보기
 * 3. 쿠폰 사용 가능 가맹점 목록 보기
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Ticket,
  QrCode,
  Store,
  MapPin,
  ChevronRight,
  Loader2,
  Check,
  Copy,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { QRCodeSVG } from 'qrcode.react';

interface MyCoupon {
  user_coupon_id: number;
  coupon_code: string;
  coupon_name: string;
  coupon_description: string;
  status: string;
  expires_at: string;
  discount_type: string;
  discount_value: number;
  max_discount: number;
}

interface CouponPartner {
  id: number;
  business_name: string;
  address: string;
  business_address?: string;
  category: string;
  services?: string;
  discount_value: number;
  discount_type: string;
  is_coupon_partner?: boolean;
  coupon_discount_type?: string;
  coupon_discount_value?: number;
  coupon_max_discount?: number;
}

export function CouponTestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoggedIn } = useAuth();

  // 쿠폰 발급
  const [campaignCode, setCampaignCode] = useState(searchParams.get('code') || 'SHINAN2025');
  const [issuingCoupon, setIssuingCoupon] = useState(false);
  const [issuedCoupon, setIssuedCoupon] = useState<{
    coupon_code: string;
    coupon_name: string;
    qr_url: string;
  } | null>(null);

  // 내 쿠폰
  const [myCoupons, setMyCoupons] = useState<MyCoupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  // 쿠폰 가맹점
  const [couponPartners, setCouponPartners] = useState<CouponPartner[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);

  // 선택된 쿠폰 (QR 표시용)
  const [selectedCoupon, setSelectedCoupon] = useState<MyCoupon | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      loadMyCoupons();
      loadCouponPartners();
    }
  }, [isLoggedIn]);

  // 내 쿠폰 조회
  const loadMyCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/coupon/my', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.success) {
        setMyCoupons(data.data || []);
      }
    } catch (error) {
      console.error('내 쿠폰 조회 실패:', error);
    } finally {
      setLoadingCoupons(false);
    }
  };

  // 쿠폰 가맹점 조회
  const loadCouponPartners = async () => {
    setLoadingPartners(true);
    try {
      const response = await fetch('/api/partners?coupon_only=true');
      const data = await response.json();

      if (data.success) {
        setCouponPartners(data.data || []);
      }
    } catch (error) {
      console.error('쿠폰 가맹점 조회 실패:', error);
    } finally {
      setLoadingPartners(false);
    }
  };

  // 쿠폰 발급
  const handleIssueCoupon = async () => {
    if (!isLoggedIn) {
      toast.error('로그인이 필요합니다');
      navigate('/login?redirect=/coupon-test');
      return;
    }

    if (!campaignCode.trim()) {
      toast.error('쿠폰 코드를 입력해주세요');
      return;
    }

    setIssuingCoupon(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/coupon/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ coupon_code: campaignCode.toUpperCase() })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('쿠폰이 발급되었습니다!');
        setIssuedCoupon({
          coupon_code: data.data.coupon_code,
          coupon_name: data.data.coupon_name,
          qr_url: data.data.qr_url
        });
        loadMyCoupons();
      } else {
        toast.error(data.message || '쿠폰 발급에 실패했습니다');
      }
    } catch (error) {
      console.error('쿠폰 발급 실패:', error);
      toast.error('쿠폰 발급 중 오류가 발생했습니다');
    } finally {
      setIssuingCoupon(false);
    }
  };

  // 쿠폰 코드 복사
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('쿠폰 코드가 복사되었습니다');
  };

  // 상태 배지
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ISSUED':
        return <Badge className="bg-green-500">사용 가능</Badge>;
      case 'USED':
        return <Badge className="bg-gray-500">사용 완료</Badge>;
      case 'EXPIRED':
        return <Badge className="bg-red-500">만료됨</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            스마트 쿠폰 테스트
          </h1>
          <p className="text-gray-600">
            알림톡 없는 버전 - 웹에서 직접 쿠폰 발급 및 사용
          </p>
        </div>

        {/* 로그인 안내 */}
        {!isLoggedIn && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <p className="text-orange-800">
                  쿠폰을 발급받으려면 로그인이 필요합니다.
                </p>
                <Button
                  onClick={() => navigate('/login?redirect=/coupon-test')}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  로그인
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 1. 쿠폰 발급 섹션 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-purple-600" />
              쿠폰 발급받기
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={campaignCode}
                onChange={(e) => setCampaignCode(e.target.value.toUpperCase())}
                placeholder="쿠폰 코드 입력 (예: SHINAN2025)"
                className="flex-1"
              />
              <Button
                onClick={handleIssueCoupon}
                disabled={issuingCoupon || !isLoggedIn}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {issuingCoupon ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  '발급받기'
                )}
              </Button>
            </div>

            {/* 발급된 쿠폰 정보 */}
            {issuedCoupon && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800">쿠폰 발급 완료!</span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-700">
                    <strong>쿠폰명:</strong> {issuedCoupon.coupon_name}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-700">
                      <strong>내 쿠폰 코드:</strong>
                    </p>
                    <code className="bg-white px-2 py-1 rounded border font-mono">
                      {issuedCoupon.coupon_code}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyCode(issuedCoupon.coupon_code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* QR 코드 */}
                <div className="mt-4 flex flex-col items-center">
                  <p className="text-sm text-gray-600 mb-2">가맹점에서 이 QR을 보여주세요</p>
                  <div className="bg-white p-4 rounded-lg border">
                    <QRCodeSVG
                      value={issuedCoupon.qr_url || `${window.location.origin}/coupon/use?code=${issuedCoupon.coupon_code}`}
                      size={150}
                      level="H"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. 내 쿠폰 목록 */}
        {isLoggedIn && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-blue-600" />
                  내 쿠폰함
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={loadMyCoupons}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCoupons ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : myCoupons.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Ticket className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>발급받은 쿠폰이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myCoupons.map((coupon) => (
                    <div
                      key={coupon.user_coupon_id}
                      className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{coupon.coupon_name}</h3>
                            {getStatusBadge(coupon.status)}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {coupon.coupon_description}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-purple-600 font-medium">
                              {coupon.discount_type === 'PERCENT'
                                ? `${coupon.discount_value}% 할인`
                                : `${coupon.discount_value?.toLocaleString()}원 할인`}
                            </span>
                            {coupon.expires_at && (
                              <span className="text-gray-500">
                                ~{new Date(coupon.expires_at).toLocaleDateString('ko-KR')}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                              {coupon.coupon_code}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleCopyCode(coupon.coupon_code)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {coupon.status === 'ISSUED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCoupon(coupon)}
                          >
                            <QrCode className="h-4 w-4 mr-1" />
                            QR
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 3. 쿠폰 사용 가능 가맹점 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-green-600" />
                쿠폰 사용 가능 가맹점
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={loadCouponPartners}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingPartners ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : couponPartners.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Store className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>쿠폰 사용 가능한 가맹점이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {couponPartners.map((partner) => (
                  <div
                    key={partner.id}
                    className="border rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => navigate(`/partners/${partner.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{partner.business_name}</h3>
                          <Badge className="bg-purple-500 text-white text-xs">
                            🎫 쿠폰
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {partner.services || partner.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="h-3 w-3" />
                          <span>{partner.business_address || partner.address || '주소 미등록'}</span>
                        </div>
                        <div className="mt-2">
                          <Badge className="bg-purple-100 text-purple-700">
                            {(partner.coupon_discount_type || partner.discount_type) === 'PERCENT'
                              ? `${partner.coupon_discount_value || partner.discount_value}% 할인`
                              : `${(partner.coupon_discount_value || partner.discount_value)?.toLocaleString()}원 할인`}
                          </Badge>
                          {partner.coupon_max_discount && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              최대 {partner.coupon_max_discount.toLocaleString()}원
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR 모달 */}
        {selectedCoupon && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setSelectedCoupon(null)}
          >
            <Card className="max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle className="text-center">{selectedCoupon.coupon_name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <p className="text-sm text-gray-600 mb-4">가맹점에서 이 QR을 보여주세요</p>
                <div className="bg-white p-6 rounded-lg border mb-4">
                  <QRCodeSVG
                    value={`${window.location.origin}/coupon/use?code=${selectedCoupon.coupon_code}`}
                    size={200}
                    level="H"
                  />
                </div>
                <code className="bg-gray-100 px-4 py-2 rounded font-mono text-lg mb-4">
                  {selectedCoupon.coupon_code}
                </code>
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleCopyCode(selectedCoupon.coupon_code)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    코드 복사
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => setSelectedCoupon(null)}
                  >
                    닫기
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default CouponTestPage;

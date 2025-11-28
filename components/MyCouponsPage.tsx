/**
 * 마이페이지 쿠폰함
 * /my/coupons
 *
 * - 발급받은 쿠폰 목록 (사용가능/사용완료/만료)
 * - 각 쿠폰 QR 코드 표시
 * - 가맹점 찾기 링크
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import {
  Ticket,
  Loader2,
  ChevronDown,
  ChevronUp,
  Store,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

interface Coupon {
  id: number;
  coupon_code: string;
  status: 'ISSUED' | 'USED' | 'EXPIRED';
  issued_at: string;
  used_at: string | null;
  campaign_code: string;
  coupon_name: string;
  coupon_description: string;
  discount_type: string;
  discount_value: number;
  max_discount: number | null;
  valid_from: string | null;
  valid_until: string | null;
  target_type: string;
  target_categories: string | null;
  used_info: {
    partner_name: string;
    order_amount: number;
    discount_amount: number;
    final_amount: number;
  } | null;
  qr_url: string;
}

interface Stats {
  total: number;
  issued: number;
  used: number;
  expired: number;
}

type FilterType = 'all' | 'issued' | 'used' | 'expired';

export function MyCouponsPage() {
  const navigate = useNavigate();
  const { isLoggedIn, sessionRestored } = useAuth();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, issued: 0, used: 0, expired: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // 쿠폰 조회
  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/my/coupons?status=${filter}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCoupons(data.data || []);
        setStats(data.stats || { total: 0, issued: 0, used: 0, expired: 0 });
      } else {
        toast.error(data.message || '쿠폰 조회 실패');
      }
    } catch (error) {
      console.error('쿠폰 조회 오류:', error);
      toast.error('쿠폰을 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionRestored && isLoggedIn) {
      fetchCoupons();
    }
  }, [sessionRestored, isLoggedIn, filter]);

  // 세션 복원 중
  if (!sessionRestored) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // 로그인 필요
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <Ticket className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
            <p className="text-gray-600 mb-6">쿠폰함을 확인하려면 로그인해주세요</p>
            <Button
              onClick={() => navigate('/login?returnUrl=/my/coupons')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              로그인하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 쿠폰 코드 복사
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('쿠폰 코드가 복사되었습니다');
  };

  // 할인 표시
  const formatDiscount = (type: string, value: number, maxDiscount?: number | null) => {
    if (type === 'PERCENT' || type === 'percentage' || type === 'percent') {
      return maxDiscount
        ? `${value}% 할인 (최대 ${maxDiscount.toLocaleString()}원)`
        : `${value}% 할인`;
    }
    return `${value.toLocaleString()}원 할인`;
  };

  // 상태 배지
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ISSUED':
        return <Badge className="bg-green-500">사용가능</Badge>;
      case 'USED':
        return <Badge className="bg-gray-500">사용완료</Badge>;
      case 'EXPIRED':
        return <Badge className="bg-red-500">만료됨</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // 필터 버튼
  const filterButtons: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: '전체', count: stats.total },
    { key: 'issued', label: '사용가능', count: stats.issued },
    { key: 'used', label: '사용완료', count: stats.used },
    { key: 'expired', label: '만료', count: stats.expired }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="bg-purple-600 text-white py-6 px-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-purple-500 -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">내 쿠폰함</h1>
          </div>
          <p className="text-purple-200 text-sm ml-9">
            발급받은 쿠폰을 확인하고 사용하세요
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4">
        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-xs text-gray-500">사용가능</p>
              <p className="text-2xl font-bold text-green-600">{stats.issued}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-xs text-gray-500">사용완료</p>
              <p className="text-2xl font-bold text-gray-600">{stats.used}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-xs text-gray-500">만료</p>
              <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
            </CardContent>
          </Card>
        </div>

        {/* 필터 버튼 */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {filterButtons.map(({ key, label, count }) => (
            <Button
              key={key}
              variant={filter === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(key)}
              className={filter === key ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              {label} ({count})
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={fetchCoupons}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* 쿠폰 목록 */}
        <div className="mt-4 space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
              <p className="text-gray-500 mt-2">쿠폰을 불러오는 중...</p>
            </div>
          ) : coupons.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Ticket className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  {filter === 'all' ? '발급받은 쿠폰이 없습니다' : `${filterButtons.find(f => f.key === filter)?.label} 쿠폰이 없습니다`}
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/coupon/claim')}
                >
                  쿠폰 받으러 가기
                </Button>
              </CardContent>
            </Card>
          ) : (
            coupons.map((coupon) => (
              <Card
                key={coupon.id}
                className={`overflow-hidden ${
                  coupon.status === 'EXPIRED' ? 'opacity-60' : ''
                }`}
              >
                <CardContent className="p-4">
                  {/* 쿠폰 헤더 */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(coupon.status)}
                        <span className="text-xs text-gray-500">
                          {new Date(coupon.issued_at).toLocaleDateString('ko-KR')} 발급
                        </span>
                      </div>
                      <h3 className="font-bold text-lg">{coupon.coupon_name}</h3>
                      {coupon.coupon_description && (
                        <p className="text-sm text-gray-600 mt-1">{coupon.coupon_description}</p>
                      )}
                    </div>
                  </div>

                  {/* 할인 정보 */}
                  <div className="bg-purple-50 rounded-lg p-3 mb-3">
                    <p className="text-purple-700 font-bold text-lg">
                      {formatDiscount(coupon.discount_type, coupon.discount_value, coupon.max_discount)}
                    </p>
                    {coupon.valid_until && (
                      <p className="text-purple-600 text-sm flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(coupon.valid_until).toLocaleDateString('ko-KR')}까지
                      </p>
                    )}
                  </div>

                  {/* 쿠폰 코드 & QR 토글 */}
                  {coupon.status === 'ISSUED' ? (
                    <>
                      <button
                        onClick={() => setExpandedId(expandedId === coupon.id ? null : coupon.id)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-lg">{coupon.coupon_code}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyCode(coupon.coupon_code);
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        {expandedId === coupon.id ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </button>

                      {/* QR 코드 확장 */}
                      {expandedId === coupon.id && (
                        <div className="mt-4 text-center">
                          <div className="inline-block p-4 bg-white rounded-lg shadow-inner border">
                            <QRCodeSVG
                              value={coupon.qr_url}
                              size={180}
                              level="H"
                              includeMargin
                            />
                          </div>
                          <p className="text-sm text-gray-500 mt-3">
                            가맹점에서 이 QR을 보여주세요
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/partners?couponOnly=true')}
                            className="mt-3"
                          >
                            <Store className="h-4 w-4 mr-1" />
                            사용 가능 가맹점 보기
                          </Button>
                        </div>
                      )}
                    </>
                  ) : coupon.status === 'USED' && coupon.used_info ? (
                    // 사용 완료 정보
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-700 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="font-medium">{coupon.used_info.partner_name}에서 사용</span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span>결제 금액</span>
                          <span>{coupon.used_info.order_amount?.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between text-purple-600">
                          <span>할인 금액</span>
                          <span>-{coupon.used_info.discount_amount?.toLocaleString()}원</span>
                        </div>
                        <div className="flex justify-between font-bold pt-1 border-t">
                          <span>최종 결제</span>
                          <span>{coupon.used_info.final_amount?.toLocaleString()}원</span>
                        </div>
                      </div>
                      {coupon.used_at && (
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(coupon.used_at).toLocaleString('ko-KR')}
                        </p>
                      )}
                    </div>
                  ) : (
                    // 만료됨
                    <div className="flex items-center gap-2 text-gray-500 p-3 bg-gray-50 rounded-lg">
                      <XCircle className="h-4 w-4" />
                      <span>유효기간이 만료되었습니다</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="mt-6 space-y-3">
          <Button
            onClick={() => navigate('/coupon/claim')}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Ticket className="h-4 w-4 mr-2" />
            새 쿠폰 받기
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/partners?couponOnly=true')}
            className="w-full"
          >
            <Store className="h-4 w-4 mr-2" />
            쿠폰 사용 가능 가맹점 보기
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MyCouponsPage;

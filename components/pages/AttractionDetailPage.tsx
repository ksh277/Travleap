/**
 * 관광지 상세 페이지
 * Phase 7: 관광지 시스템
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import {
  MapPin, Phone, Clock, AlertTriangle, Ticket, Users, Car, Wheelchair, Baby,
  Loader2, Heart, Share2, ChevronLeft, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Attraction {
  id: number;
  name: string;
  description: string;
  type: string;
  category: string;
  address: string;
  phone: string;
  website: string;
  operating_hours: Record<string, string>;
  last_entry_time: string;
  admission_fee_adult: number;
  admission_fee_child: number;
  admission_fee_senior: number;
  admission_fee_infant: number;
  free_entry_days: string[];
  parking_available: boolean;
  parking_fee: number;
  wheelchair_accessible: boolean;
  stroller_friendly: boolean;
  pet_allowed: boolean;
  thumbnail_url: string;
  images: string[];
  estimated_visit_duration_minutes: number;
  highlights: string[];
  rating: number;
  review_count: number;
}

export function AttractionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [attraction, setAttraction] = useState<Attraction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [seniorCount, setSeniorCount] = useState(0);
  const [infantCount, setInfantCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/attractions/list?id=${id}`);
        const result = await response.json();

        if (result.success && result.attraction) {
          setAttraction(result.attraction);
        } else {
          setError('관광지 정보를 찾을 수 없습니다');
        }
      } catch (err) {
        setError('정보를 불러오는데 실패했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const calculateTotal = () => {
    if (!attraction) return 0;
    return (
      attraction.admission_fee_adult * adultCount +
      (attraction.admission_fee_child || 0) * childCount +
      (attraction.admission_fee_senior || 0) * seniorCount +
      attraction.admission_fee_infant * infantCount
    );
  };

  const handlePurchase = async () => {
    if (!attraction) return;

    const tickets = [];
    if (adultCount > 0) tickets.push({ type: 'adult', count: adultCount });
    if (childCount > 0) tickets.push({ type: 'child', count: childCount });
    if (seniorCount > 0) tickets.push({ type: 'senior', count: seniorCount });
    if (infantCount > 0) tickets.push({ type: 'infant', count: infantCount });

    if (tickets.length === 0) {
      toast.error('최소 1매 이상 선택해주세요');
      return;
    }

    try {
      // 주문 생성 API 호출
      const response = await fetch('/api/attractions/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          attraction_id: attraction.id,
          visit_date: visitDate,
          tickets
        })
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(result.message || '주문 생성에 실패했습니다');
        return;
      }

      // 결제 페이지로 이동
      const orderData = result.data;
      const totalAmount = orderData.total_amount;
      const userName = localStorage.getItem('user_name') || 'Guest';
      const userEmail = localStorage.getItem('user_email') || '';

      navigate(
        `/payment?` +
        `bookingId=${orderData.order_id}&` +
        `bookingNumber=${orderData.order_number}&` +
        `amount=${totalAmount}&` +
        `title=${encodeURIComponent(`${attraction.name} 입장권`)}&` +
        `customerName=${encodeURIComponent(userName)}&` +
        `customerEmail=${encodeURIComponent(userEmail)}&` +
        `category=attraction`
      );

      toast.success('주문이 생성되었습니다!');

    } catch (error) {
      console.error('티켓 구매 오류:', error);
      toast.error('티켓 구매 중 오류가 발생했습니다');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !attraction) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-gray-600">{error}</p>
        <Button onClick={() => navigate('/tourist')}>목록으로 돌아가기</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              뒤로
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setIsFavorite(!isFavorite)}>
                <Heart className={isFavorite ? 'fill-red-500 text-red-500' : ''} />
              </Button>
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-0">
                <ImageWithFallback
                  src={attraction.thumbnail_url}
                  alt={attraction.name}
                  className="w-full h-96 object-cover"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{attraction.name}</CardTitle>
                <div className="flex gap-2 mt-2">
                  <Badge>{attraction.type}</Badge>
                  <Badge variant="outline">{attraction.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">{attraction.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{attraction.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{attraction.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span>마지막 입장: {attraction.last_entry_time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span>평균 관람 시간: {attraction.estimated_visit_duration_minutes}분</span>
                  </div>
                </div>

                {/* 시설 정보 */}
                <div className="flex flex-wrap gap-3 pt-2">
                  {attraction.parking_available && (
                    <div className="flex items-center gap-1 text-sm">
                      <Car className="h-4 w-4 text-green-500" />
                      <span>주차 가능 ({attraction.parking_fee === 0 ? '무료' : `${attraction.parking_fee}원`})</span>
                    </div>
                  )}
                  {attraction.wheelchair_accessible && (
                    <div className="flex items-center gap-1 text-sm">
                      <Wheelchair className="h-4 w-4 text-blue-500" />
                      <span>휠체어 이용 가능</span>
                    </div>
                  )}
                  {attraction.stroller_friendly && (
                    <div className="flex items-center gap-1 text-sm">
                      <Baby className="h-4 w-4 text-purple-500" />
                      <span>유모차 이용 가능</span>
                    </div>
                  )}
                </div>

                {/* 주요 볼거리 */}
                {attraction.highlights.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">주요 볼거리</h4>
                    <div className="space-y-1">
                      {attraction.highlights.map((highlight, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {highlight}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 무료 입장일 */}
                {attraction.free_entry_days.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-sm font-medium text-green-800 mb-1">무료 입장일</div>
                    <div className="text-sm text-green-700">
                      {attraction.free_entry_days.join(', ')}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>입장권 구매</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 방문 날짜 */}
                <div>
                  <label className="text-sm font-medium mb-2 block">방문 날짜</label>
                  <input
                    type="date"
                    className="w-full border rounded-md p-2"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* 티켓 수량 */}
                <div className="space-y-3">
                  <label className="text-sm font-medium block">티켓 종류 및 수량</label>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">성인</span>
                      <div className="text-xs text-gray-500">{attraction.admission_fee_adult.toLocaleString()}원</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAdultCount(Math.max(0, adultCount - 1))}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center">{adultCount}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAdultCount(adultCount + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  {attraction.admission_fee_child > 0 && (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">어린이</span>
                        <div className="text-xs text-gray-500">{attraction.admission_fee_child.toLocaleString()}원</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setChildCount(Math.max(0, childCount - 1))}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{childCount}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setChildCount(childCount + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  )}

                  {attraction.admission_fee_senior > 0 && (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">경로</span>
                        <div className="text-xs text-gray-500">{attraction.admission_fee_senior.toLocaleString()}원</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSeniorCount(Math.max(0, seniorCount - 1))}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{seniorCount}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSeniorCount(seniorCount + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  )}

                  {attraction.admission_fee_infant === 0 && (
                    <div className="text-xs text-gray-500">
                      * 유아 무료 입장
                    </div>
                  )}
                </div>

                {/* 총 금액 */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">총 금액</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {calculateTotal().toLocaleString()}원
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    총 {adultCount + childCount + seniorCount + infantCount}매
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePurchase}
                  disabled={(adultCount + childCount + seniorCount + infantCount) === 0}
                >
                  입장권 구매
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  입장 시 QR 티켓을 제시해주세요
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

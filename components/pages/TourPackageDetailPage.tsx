/**
 * 투어 패키지 상세 페이지
 * Phase 3: 여행 시스템
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import {
  MapPin,
  Users,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Hotel,
  Utensils,
  Plane
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';

interface TourPackage {
  id: number;
  package_name: string;
  description: string;
  duration_days: number;
  duration_nights: number;
  itinerary: Array<{
    day: number;
    title: string;
    activities: string[];
  }>;
  included: string[];
  excluded: string[];
  meeting_point: string;
  meeting_time: string;
  departure_location: string;
  price_adult_krw: number;
  price_child_krw: number;
  price_infant_krw: number;
  thumbnail_url: string;
  images: string[];
  difficulty: 'easy' | 'moderate' | 'hard';
  tags: string[];
  listing_title: string;
  location: string;
  rating: number;
  review_count: number;
}

interface Schedule {
  id: number;
  departure_date: string;
  departure_time: string;
  guide_name: string;
  guide_language: string;
  max_participants: number;
  current_participants: number;
  status: string;
  price_adult_krw: number;
  price_child_krw: number;
}

export function TourPackageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 상태 관리
  const [packageData, setPackageData] = useState<TourPackage | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  // 예약 폼 상태
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [infantCount, setInfantCount] = useState(0);

  // 데이터 로드
  useEffect(() => {
    const fetchPackageData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/tour/packages/${id}`);
        const result = await response.json();

        if (result.success && result.data) {
          setPackageData(result.data.package);
          setSchedules(result.data.availableSchedules || []);
        } else {
          setError('패키지 정보를 찾을 수 없습니다');
        }
      } catch (err) {
        console.error('패키지 데이터 로드 오류:', err);
        setError('패키지 정보를 불러오는데 실패했습니다');
      } finally {
        setLoading(false);
      }
    };

    fetchPackageData();
  }, [id]);

  // 총 금액 계산
  const calculateTotalPrice = () => {
    if (!selectedSchedule) return 0;

    const adultPrice = (selectedSchedule.price_adult_krw || packageData?.price_adult_krw || 0) * adultCount;
    const childPrice = (selectedSchedule.price_child_krw || packageData?.price_child_krw || 0) * childCount;
    const infantPrice = (packageData?.price_infant_krw || 0) * infantCount;

    return adultPrice + childPrice + infantPrice;
  };

  // 예약하기
  const handleBooking = async () => {
    if (!selectedSchedule) {
      toast.error('출발 일정을 선택해주세요');
      return;
    }

    const totalParticipants = adultCount + childCount + infantCount;
    if (totalParticipants === 0) {
      toast.error('최소 1명 이상 선택해주세요');
      return;
    }

    // 참가자 정보 입력 페이지로 이동 (또는 모달 열기)
    navigate(`/tour/booking/${selectedSchedule.id}`, {
      state: {
        schedule: selectedSchedule,
        package: packageData,
        adultCount,
        childCount,
        infantCount,
        totalPrice: calculateTotalPrice()
      }
    });
  };

  // 난이도 배지 색상
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // 에러 상태
  if (error || !packageData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-gray-600">{error || '패키지를 찾을 수 없습니다'}</p>
        <Button onClick={() => navigate('/tour')}>목록으로 돌아가기</Button>
      </div>
    );
  }

  const images = packageData.images.length > 0 ? packageData.images : [packageData.thumbnail_url];
  const totalPrice = calculateTotalPrice();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
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
        {/* 이미지 갤러리 */}
        <Card className="mb-6">
          <CardContent className="p-0">
            <div className="relative h-96 bg-gray-200">
              <ImageWithFallback
                src={images[currentImageIndex]}
                alt={packageData.package_name}
                className="w-full h-full object-cover"
              />

              {images.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90"
                    onClick={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90"
                    onClick={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 패키지 정보 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 기본 정보 */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">{packageData.package_name}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {packageData.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {packageData.duration_nights}박 {packageData.duration_days}일
                      </div>
                      <div className="flex items-center gap-1">
                        <Globe className="h-4 w-4" />
                        {packageData.departure_location}
                      </div>
                    </div>
                  </div>
                  <Badge className={getDifficultyColor(packageData.difficulty)}>
                    {packageData.difficulty === 'easy' ? '쉬움' : packageData.difficulty === 'moderate' ? '보통' : '어려움'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-line">{packageData.description}</p>

                {packageData.tags.length > 0 && (
                  <div className="flex gap-2 mt-4 flex-wrap">
                    {packageData.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline">#{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 일정표 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  여행 일정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {packageData.itinerary.map((day, idx) => (
                  <div key={idx} className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold mb-2">Day {day.day}: {day.title}</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      {day.activities.map((activity, actIdx) => (
                        <li key={actIdx} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {activity}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 포함/불포함 사항 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    포함 사항
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {packageData.included.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    불포함 사항
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {packageData.excluded.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* 집결지 정보 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">집결 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <span>{packageData.meeting_point}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-gray-500 mt-0.5" />
                    <span>집합 시간: {packageData.meeting_time}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 오른쪽: 예약 폼 */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>예약하기</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 가격 */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">성인 1인 기준</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {packageData.price_adult_krw.toLocaleString()}원
                  </div>
                </div>

                <Separator />

                {/* 출발 일정 선택 */}
                <div>
                  <label className="text-sm font-medium mb-2 block">출발 날짜</label>
                  <select
                    className="w-full border rounded-md p-2"
                    value={selectedSchedule?.id || ''}
                    onChange={(e) => {
                      const schedule = schedules.find(s => s.id === Number(e.target.value));
                      setSelectedSchedule(schedule || null);
                    }}
                  >
                    <option value="">날짜를 선택하세요</option>
                    {schedules.map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {format(new Date(schedule.departure_date), 'yyyy년 M월 d일 (E)', { locale: ko })} -
                        {schedule.max_participants - schedule.current_participants}석 남음
                      </option>
                    ))}
                  </select>
                </div>

                {/* 인원 선택 */}
                <div className="space-y-3">
                  <label className="text-sm font-medium block">인원 선택</label>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">성인</span>
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

                  <div className="flex items-center justify-between">
                    <span className="text-sm">아동</span>
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

                  <div className="flex items-center justify-between">
                    <span className="text-sm">유아</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInfantCount(Math.max(0, infantCount - 1))}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center">{infantCount}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInfantCount(infantCount + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 총 금액 */}
                {totalPrice > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">총 {adultCount + childCount + infantCount}명</span>
                      <span className="text-xl font-bold">{totalPrice.toLocaleString()}원</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {adultCount > 0 && <div>성인 {adultCount}명: {((selectedSchedule?.price_adult_krw || packageData.price_adult_krw) * adultCount).toLocaleString()}원</div>}
                      {childCount > 0 && <div>아동 {childCount}명: {((selectedSchedule?.price_child_krw || packageData.price_child_krw || 0) * childCount).toLocaleString()}원</div>}
                      {infantCount > 0 && <div>유아 {infantCount}명: {((packageData.price_infant_krw || 0) * infantCount).toLocaleString()}원</div>}
                    </div>
                  </div>
                )}

                {/* 예약 버튼 */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleBooking}
                  disabled={!selectedSchedule || (adultCount + childCount + infantCount) === 0}
                >
                  예약하기
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  예약 후 24시간 내 입금하지 않으면 자동 취소됩니다
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 체험 프로그램 상세 페이지
 * Phase 5: 체험 시스템
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import {
  MapPin, Clock, Users, AlertTriangle, CheckCircle, XCircle,
  Loader2, Heart, Share2, ChevronLeft, Shield, Cloud
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';

interface Experience {
  id: number;
  name: string;
  description: string;
  type: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  min_age: number;
  max_age: number | null;
  min_height_cm: number | null;
  max_weight_kg: number | null;
  health_requirements: string;
  min_participants: number;
  max_participants: number;
  duration_minutes: number;
  safety_briefing_required: boolean;
  safety_video_url: string | null;
  waiver_required: boolean;
  weather_dependent: boolean;
  equipment_included: string[];
  equipment_rental_available: boolean;
  price_krw: number;
  equipment_rental_price_krw: number | null;
  thumbnail_url: string;
  images: string[];
  rating: number;
  review_count: number;
}

interface Slot {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  instructor_name: string;
  available_seats: number;
  weather_status: 'good' | 'caution' | 'canceled';
}

export function ExperienceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [experience, setExperience] = useState<Experience | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [equipmentRental, setEquipmentRental] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setLoading(true);

        // 체험 정보 조회
        const expResponse = await fetch(`/api/experience/list?id=${id}`);
        const expResult = await expResponse.json();

        if (expResult.success && expResult.experience) {
          setExperience(expResult.experience);

          // 슬롯 정보는 experience의 time_slots 필드 사용
          // 또는 별도 API가 있다면 호출
          if (expResult.experience.time_slots) {
            setSlots(expResult.experience.time_slots);
          }
        } else {
          setError('체험 정보를 찾을 수 없습니다');
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
    if (!experience) return 0;
    let total = experience.price_krw * participantCount;
    if (equipmentRental && experience.equipment_rental_price_krw) {
      total += experience.equipment_rental_price_krw * participantCount;
    }
    return total;
  };

  const handleBooking = () => {
    if (!selectedSlot) {
      toast.error('시간대를 선택해주세요');
      return;
    }

    navigate(`/experience/booking/${selectedSlot.id}`, {
      state: {
        experience,
        slot: selectedSlot,
        participantCount,
        equipmentRental,
        totalPrice: calculateTotal()
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !experience) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-gray-600">{error}</p>
        <Button onClick={() => navigate('/experience')}>목록으로 돌아가기</Button>
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
        <Card className="mb-6">
          <CardContent className="p-0">
            <ImageWithFallback
              src={experience.thumbnail_url}
              alt={experience.name}
              className="w-full h-96 object-cover"
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-2">{experience.name}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {experience.duration_minutes}분
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {experience.min_participants}-{experience.max_participants}명
                      </div>
                    </div>
                  </div>
                  <Badge>{experience.difficulty === 'easy' ? '쉬움' : experience.difficulty === 'medium' ? '보통' : '어려움'}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{experience.description}</p>
              </CardContent>
            </Card>

            {/* 참가 조건 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  참가 조건
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>• 연령: {experience.min_age}세 이상 {experience.max_age && `${experience.max_age}세 이하`}</div>
                {experience.min_height_cm && <div>• 최소 키: {experience.min_height_cm}cm</div>}
                {experience.max_weight_kg && <div>• 최대 몸무게: {experience.max_weight_kg}kg</div>}
                {experience.health_requirements && <div>• {experience.health_requirements}</div>}
              </CardContent>
            </Card>

            {/* 포함 장비 */}
            {experience.equipment_included.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    포함 장비
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {experience.equipment_included.map((item, idx) => (
                      <Badge key={idx} variant="outline">{item}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 안전 안내 */}
            {(experience.safety_briefing_required || experience.waiver_required) && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-800">
                    <Shield className="h-5 w-5" />
                    안전 안내
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-yellow-900">
                  {experience.safety_briefing_required && <div>• 체험 전 안전 교육 필수</div>}
                  {experience.waiver_required && <div>• 면책동의서 서명 필수</div>}
                  {experience.weather_dependent && (
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4" />
                      기상 상황에 따라 취소될 수 있습니다
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>예약하기</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">1인 기준</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {experience.price_krw.toLocaleString()}원
                  </div>
                </div>

                {/* 슬롯 선택 */}
                <div>
                  <label className="text-sm font-medium mb-2 block">날짜 및 시간</label>
                  <select
                    className="w-full border rounded-md p-2"
                    value={selectedSlot?.id || ''}
                    onChange={(e) => {
                      const slot = slots.find(s => s.id === Number(e.target.value));
                      setSelectedSlot(slot || null);
                    }}
                  >
                    <option value="">시간을 선택하세요</option>
                    {slots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {format(new Date(slot.date), 'M월 d일 (E)', { locale: ko })} {slot.start_time} - {slot.available_seats}석
                      </option>
                    ))}
                  </select>
                </div>

                {/* 인원 선택 */}
                <div>
                  <label className="text-sm font-medium mb-2 block">인원</label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setParticipantCount(Math.max(1, participantCount - 1))}
                    >
                      -
                    </Button>
                    <span className="w-12 text-center">{participantCount}</span>
                    <Button
                      variant="outline"
                      onClick={() => setParticipantCount(participantCount + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* 장비 대여 */}
                {experience.equipment_rental_available && experience.equipment_rental_price_krw && (
                  <div className="flex items-center justify-between">
                    <label className="text-sm">
                      장비 대여 (+{experience.equipment_rental_price_krw.toLocaleString()}원/인)
                    </label>
                    <input
                      type="checkbox"
                      checked={equipmentRental}
                      onChange={(e) => setEquipmentRental(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </div>
                )}

                {/* 총 금액 */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">총 {participantCount}명</span>
                    <span className="text-xl font-bold">{calculateTotal().toLocaleString()}원</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleBooking}
                  disabled={!selectedSlot}
                >
                  예약하기
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Slider } from './ui/slider';
import {
  Brain,
  Sparkles,
  MapPin,
  Clock,
  Users,
  Heart,
  Camera,
  Utensils,
  Bed,
  Car,
  Waves,
  Mountain,
  Star,
  Calendar,
  ArrowRight,
  Shuffle,
  Download,
  Share2,
  Play
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../utils/api';

interface TravelPreference {
  travelStyle: string[];
  budget: number[];
  duration: number;
  groupSize: number;
  interests: string[];
  accommodation: string[];
  transportation: string[];
  activities: string[];
  season: string;
  accessibility: string[];
}

interface RecommendationResult {
  id: string;
  title: string;
  description: string;
  matchPercentage: number;
  itinerary: DayPlan[];
  totalCost: number;
  highlights: string[];
  tips: string[];
  bestTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  images: string[];
  tags: string[];
}

interface DayPlan {
  day: number;
  title: string;
  location: string;
  activities: Activity[];
  meals: string[];
  accommodation?: string;
  transportation?: string;
  cost: number;
}

interface Activity {
  time: string;
  name: string;
  location: string;
  description: string;
  cost: number;
  duration: string;
  type: string;
}

const TRAVEL_STYLES = [
  { id: 'healing', name: '힐링/휴양', icon: '🧘‍♀️' },
  { id: 'adventure', name: '모험/체험', icon: '🏃‍♂️' },
  { id: 'culture', name: '문화/역사', icon: '🏛️' },
  { id: 'nature', name: '자연/생태', icon: '🌿' },
  { id: 'food', name: '맛집/미식', icon: '🍽️' },
  { id: 'photo', name: '사진/인스타', icon: '📸' },
  { id: 'family', name: '가족여행', icon: '👨‍👩‍👧‍👦' },
  { id: 'romantic', name: '로맨틱', icon: '💕' }
];

const INTERESTS = [
  { id: 'sea', name: '바다/해변', icon: Waves },
  { id: 'island', name: '섬 탐방', icon: Mountain },
  { id: 'food', name: '특산음식', icon: Utensils },
  { id: 'photo', name: '사진촬영', icon: Camera },
  { id: 'culture', name: '전통문화', icon: Heart },
  { id: 'activity', name: '체험활동', icon: Play },
  { id: 'salt', name: '염전', icon: Sparkles },
  { id: 'sunset', name: '일몰/일출', icon: Star }
];

const SAMPLE_RECOMMENDATIONS: RecommendationResult[] = [
  {
    id: '1',
    title: '증도 힐링 2박 3일 완벽 코스',
    description: 'UNESCO 생물권보전지역 증도에서 느리게 즐기는 힐링 여행',
    matchPercentage: 95,
    totalCost: 280000,
    highlights: ['슬로시티 체험', '염전 일몰', '갯벌 체험', '우전해변 산책'],
    tips: ['편안한 신발 착용', '선크림 필수', '염전 투어 사전예약'],
    bestTime: '4월-6월, 9월-11월',
    difficulty: 'easy',
    images: ['/api/placeholder/400/300', '/api/placeholder/400/301'],
    tags: ['힐링', '슬로시티', 'UNESCO', '염전'],
    itinerary: [
      {
        day: 1,
        title: '증도 도착 & 염전 투어',
        location: '증도면',
        cost: 80000,
        activities: [
          {
            time: '10:00',
            name: '증도 도착',
            location: '증도선착장',
            description: '목포에서 여객선으로 증도 도착',
            cost: 15000,
            duration: '1시간',
            type: 'transport'
          },
          {
            time: '11:30',
            name: '태평염전 투어',
            location: '태평염전',
            description: 'UNESCO 염전에서 전통 천일염 제조 과정 체험',
            cost: 25000,
            duration: '2시간',
            type: 'tour'
          },
          {
            time: '14:00',
            name: '점심식사',
            location: '증도식당',
            description: '신안 특산 젓갈정식',
            cost: 15000,
            duration: '1시간',
            type: 'meal'
          },
          {
            time: '16:00',
            name: '우전해변 산책',
            location: '우전해변',
            description: '깨끗한 해변에서 여유로운 산책',
            cost: 0,
            duration: '1.5시간',
            type: 'nature'
          }
        ],
        meals: ['증도 젓갈정식', '바다뷰 카페'],
        accommodation: '증도힐링펜션',
        transportation: '여객선'
      },
      {
        day: 2,
        title: '슬로시티 체험 & 갯벌 탐방',
        location: '증도면',
        cost: 120000,
        activities: [
          {
            time: '09:00',
            name: '슬로시티 투어',
            location: '증도 슬로시티',
            description: '아시아 최초 슬로시티에서 느린 여행 체험',
            cost: 30000,
            duration: '3시간',
            type: 'culture'
          },
          {
            time: '13:00',
            name: '갯벌 체험',
            location: '증도 갯벌',
            description: '갯벌에서 조개 캐기 체험',
            cost: 25000,
            duration: '2시간',
            type: 'activity'
          },
          {
            time: '18:00',
            name: '염전 일몰 감상',
            location: '태평염전',
            description: '염전 위로 지는 아름다운 일몰',
            cost: 0,
            duration: '1시간',
            type: 'photo'
          }
        ],
        meals: ['향토음식점', '해산물 바비큐'],
        accommodation: '증도힐링펜션'
      },
      {
        day: 3,
        title: '자전거 투어 & 귀가',
        location: '증도면',
        cost: 80000,
        activities: [
          {
            time: '09:00',
            name: '증도 자전거 투어',
            location: '증도 전역',
            description: '자전거로 증도 주요 명소 둘러보기',
            cost: 20000,
            duration: '3시간',
            type: 'activity'
          },
          {
            time: '13:00',
            name: '특산품 구매',
            location: '증도 특산품센터',
            description: '천일염, 젓갈 등 특산품 구매',
            cost: 50000,
            duration: '1시간',
            type: 'shopping'
          }
        ],
        meals: ['증도 전통음식'],
        transportation: '여객선 귀가'
      }
    ]
  },
  {
    id: '2',
    title: '신안 섬 호핑 3박 4일 모험 코스',
    description: '홍도, 흑산도, 가거도를 연결하는 섬 호핑 모험 여행',
    matchPercentage: 88,
    totalCost: 520000,
    highlights: ['홍도 절경', '흑산도 전복체험', '가거도 트레킹', '섬 간 크루즈'],
    tips: ['멀미약 준비', '방수 가방 필수', '편한 등산화 착용'],
    bestTime: '5월-10월',
    difficulty: 'medium',
    images: ['/api/placeholder/400/302', '/api/placeholder/400/303'],
    tags: ['모험', '섬호핑', '트레킹', '크루즈'],
    itinerary: [
      {
        day: 1,
        title: '홍도 도착 & 절경 투어',
        location: '홍도면',
        cost: 150000,
        activities: [
          {
            time: '08:00',
            name: '목포항 출발',
            location: '목포항',
            description: '홍도행 쾌속선 탑승',
            cost: 35000,
            duration: '2.5시간',
            type: 'transport'
          },
          {
            time: '11:00',
            name: '홍도 유람선 투어',
            location: '홍도 해안',
            description: '홍도 8경 해안 절경 감상',
            cost: 45000,
            duration: '2시간',
            type: 'tour'
          },
          {
            time: '15:00',
            name: '홍도 등대 트레킹',
            location: '홍도 등대',
            description: '홍도 최고봉에서 바라보는 서해 전망',
            cost: 0,
            duration: '2시간',
            type: 'trekking'
          }
        ],
        meals: ['홍도 해산물 정식'],
        accommodation: '홍도민박'
      }
      // ... 나머지 일정
    ]
  }
];

export function AIRecommendationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [preferences, setPreferences] = useState<TravelPreference>({
    travelStyle: [],
    budget: [200000],
    duration: 2,
    groupSize: 2,
    interests: [],
    accommodation: [],
    transportation: [],
    activities: [],
    season: '',
    accessibility: []
  });
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);

  const handleStyleChange = (styleId: string) => {
    setPreferences(prev => ({
      ...prev,
      travelStyle: prev.travelStyle.includes(styleId)
        ? prev.travelStyle.filter(id => id !== styleId)
        : [...prev.travelStyle, styleId]
    }));
  };

  const handleInterestChange = (interestId: string) => {
    setPreferences(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(id => id !== interestId)
        : [...prev.interests, interestId]
    }));
  };

  const generateRecommendations = async () => {
    setIsGenerating(true);

    try {
      // 백엔드 API 호출하여 AI 추천 생성
      const result = await api.getAIRecommendations(preferences);

      if (!result.success || !result.data || result.data.length === 0) {
        // API 실패 시 샘플 데이터 사용
        console.warn('AI API failed, using fallback recommendations');
        let filtered = [...SAMPLE_RECOMMENDATIONS];
        const budget = preferences.budget[0];
        filtered = filtered.filter(rec => rec.totalCost <= budget * 1.2);
        filtered = filtered.map(rec => ({
          ...rec,
          matchPercentage: Math.min(95, rec.matchPercentage + Math.random() * 10)
        })).sort((a, b) => b.matchPercentage - a.matchPercentage);
        setRecommendations(filtered);
      } else {
        // API 응답을 프론트엔드 형식으로 변환
        const apiRecommendations = result.data.map((course: any, idx: number) => {
          // 백엔드 추천 데이터를 프론트엔드 형식으로 변환
          const itinerary = course.recommendations?.map((rec: any) => ({
            day: rec.day || 1,
            title: rec.listing?.title || '여행 일정',
            location: rec.listing?.location || '신안',
            cost: rec.listing?.price_from || 0,
            activities: [{
              time: '10:00',
              name: rec.listing?.title || '활동',
              location: rec.listing?.location || '신안',
              description: rec.listing?.short_description || rec.reason || '',
              cost: rec.listing?.price_from || 0,
              duration: rec.listing?.duration || '2시간',
              type: rec.listing?.category?.toLowerCase() || 'activity'
            }],
            meals: ['현지 맛집'],
            accommodation: rec.day === 1 ? undefined : '신안 숙소'
          })) || [];

          return {
            id: course.id || `api-${idx}`,
            title: course.courseName || `신안 ${preferences.duration}일 여행`,
            description: course.description || '맞춤 추천 여행 코스',
            matchPercentage: course.matchPercentage || 90,
            totalCost: course.totalPrice || 0,
            highlights: course.recommendations?.slice(0, 4).map((r: any) => r.listing?.title || '추천 명소') || [],
            tips: course.tips || ['즐거운 여행 되세요!'],
            bestTime: '연중',
            difficulty: 'easy' as const,
            images: [],
            tags: [course.method === 'openai' ? 'AI 추천' : '스마트 추천'],
            itinerary
          };
        });

        setRecommendations(apiRecommendations);
      }

      setStep(3);
      toast.success('AI 맞춤 추천이 완성되었습니다!');
    } catch (error: any) {
      console.error('Failed to generate recommendations:', error);
      toast.error(`추천 생성에 실패했습니다: ${error.message || '알 수 없는 오류'}`);

      // 오류 발생 시에도 샘플 데이터 표시
      let filtered = [...SAMPLE_RECOMMENDATIONS];
      const budget = preferences.budget[0];
      filtered = filtered.filter(rec => rec.totalCost <= budget * 1.2);
      setRecommendations(filtered.slice(0, 2));
      setStep(3);
    } finally {
      setIsGenerating(false);
    }
  };

  const exportItinerary = (recommendation: RecommendationResult) => {
    const itineraryText = `
${recommendation.title}
${recommendation.description}

매칭도: ${recommendation.matchPercentage}%
총 예상 비용: ${recommendation.totalCost.toLocaleString()}원

=== 일정표 ===
${recommendation.itinerary.map(day => `
📅 Day ${day.day}: ${day.title}
📍 위치: ${day.location}
💰 비용: ${day.cost.toLocaleString()}원

🕐 세부 일정:
${day.activities.map(activity =>
  `${activity.time} - ${activity.name} (${activity.duration})\n   ${activity.description}`
).join('\n')}

🍽️ 식사: ${day.meals.join(', ')}
${day.accommodation ? `🏨 숙박: ${day.accommodation}` : ''}
`).join('\n')}

💡 여행 팁:
${recommendation.tips.map(tip => `• ${tip}`).join('\n')}
    `;

    const blob = new Blob([itineraryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recommendation.title}_여행계획.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('여행 일정표가 다운로드되었습니다!');
  };

  const shareRecommendation = async (recommendation: RecommendationResult) => {
    const shareData = {
      title: recommendation.title,
      text: `${recommendation.description}\n매칭도 ${recommendation.matchPercentage}%`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // 공유 취소됨
      }
    } else {
      navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
      toast.success('추천 내용이 클립보드에 복사되었습니다!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 섹션 */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="text-center">
            <div className="flex justify-center items-center mb-4">
              <Brain className="h-12 w-12 mr-3" />
              <h1 className="text-3xl md:text-5xl font-bold">AI 맞춤 추천</h1>
            </div>
            <p className="text-lg md:text-xl mb-6 opacity-90">
              개인의 취향에 맞는 최적의 여행 코스 추천
            </p>
            <p className="text-base md:text-lg opacity-80">
              AI가 분석한 당신만의 특별한 신안 여행 일정을 만나보세요
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 진행 단계 표시 */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step >= stepNum ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <ArrowRight className={`h-5 w-5 mx-2 ${
                    step > stepNum ? 'text-purple-600' : 'text-gray-400'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: 여행 스타일 선택 */}
        {step === 1 && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-center">
                <Sparkles className="h-6 w-6 inline mr-2" />
                어떤 여행을 원하시나요?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* 여행 스타일 */}
              <div>
                <h3 className="text-lg font-medium mb-4">여행 스타일 (복수 선택 가능)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {TRAVEL_STYLES.map(style => (
                    <Card
                      key={style.id}
                      className={`cursor-pointer transition-all ${
                        preferences.travelStyle.includes(style.id)
                          ? 'border-purple-500 bg-purple-50'
                          : 'hover:border-gray-300'
                      }`}
                      onClick={() => handleStyleChange(style.id)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl mb-2">{style.icon}</div>
                        <div className="font-medium">{style.name}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* 관심사 */}
              <div>
                <h3 className="text-lg font-medium mb-4">관심사 (복수 선택 가능)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {INTERESTS.map(interest => {
                    const Icon = interest.icon;
                    return (
                      <Card
                        key={interest.id}
                        className={`cursor-pointer transition-all ${
                          preferences.interests.includes(interest.id)
                            ? 'border-purple-500 bg-purple-50'
                            : 'hover:border-gray-300'
                        }`}
                        onClick={() => handleInterestChange(interest.id)}
                      >
                        <CardContent className="p-4 text-center">
                          <Icon className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                          <div className="font-medium">{interest.name}</div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={preferences.travelStyle.length === 0}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  다음 단계
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: 상세 설정 */}
        {step === 2 && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-center">
                <Users className="h-6 w-6 inline mr-2" />
                여행 상세 정보를 알려주세요
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 예산 */}
                <div>
                  <h3 className="text-lg font-medium mb-4">예산 (1인 기준)</h3>
                  <div className="space-y-4">
                    <Slider
                      value={preferences.budget}
                      onValueChange={(value) => setPreferences(prev => ({ ...prev, budget: value }))}
                      max={1000000}
                      min={100000}
                      step={50000}
                      className="w-full"
                    />
                    <div className="text-center text-lg font-medium text-purple-600">
                      {preferences.budget[0].toLocaleString()}원
                    </div>
                  </div>
                </div>

                {/* 여행 기간 */}
                <div>
                  <h3 className="text-lg font-medium mb-4">여행 기간</h3>
                  <Select
                    value={preferences.duration.toString()}
                    onValueChange={(value) => setPreferences(prev => ({ ...prev, duration: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">당일치기</SelectItem>
                      <SelectItem value="2">1박 2일</SelectItem>
                      <SelectItem value="3">2박 3일</SelectItem>
                      <SelectItem value="4">3박 4일</SelectItem>
                      <SelectItem value="5">4박 5일 이상</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 인원 수 */}
                <div>
                  <h3 className="text-lg font-medium mb-4">인원 수</h3>
                  <Select
                    value={preferences.groupSize.toString()}
                    onValueChange={(value) => setPreferences(prev => ({ ...prev, groupSize: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">혼자</SelectItem>
                      <SelectItem value="2">2명 (커플/친구)</SelectItem>
                      <SelectItem value="3">3-4명 (소그룹)</SelectItem>
                      <SelectItem value="5">5명 이상 (대그룹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 여행 시기 */}
                <div>
                  <h3 className="text-lg font-medium mb-4">선호 시기</h3>
                  <Select
                    value={preferences.season}
                    onValueChange={(value) => setPreferences(prev => ({ ...prev, season: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="시기 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spring">봄 (3-5월)</SelectItem>
                      <SelectItem value="summer">여름 (6-8월)</SelectItem>
                      <SelectItem value="autumn">가을 (9-11월)</SelectItem>
                      <SelectItem value="winter">겨울 (12-2월)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  이전 단계
                </Button>
                <Button
                  onClick={generateRecommendations}
                  disabled={!preferences.season}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  AI 추천 생성
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: 추천 결과 */}
        {step === 3 && (
          <div className="space-y-8">
            {isGenerating ? (
              <Card className="max-w-2xl mx-auto">
                <CardContent className="p-8 text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <h3 className="text-xl font-medium mb-2">AI가 맞춤 추천을 생성하고 있습니다</h3>
                  <p className="text-gray-600">당신의 취향을 분석하여 최적의 여행 코스를 만들고 있어요...</p>
                </CardContent>
              </Card>
            ) : (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-4">당신을 위한 맞춤 추천</h2>
                  <p className="text-gray-600">AI가 분석한 {recommendations.length}개의 추천 코스를 확인해보세요</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {recommendations.map(recommendation => (
                    <Card
                      key={recommendation.id}
                      className="group hover:shadow-lg transition-all duration-300"
                    >
                      <div className="relative">
                        <div className="w-full h-48 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 rounded-t-lg flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-4xl mb-2">🤖</div>
                            <div className="text-sm text-gray-600">AI 추천 이미지 준비중</div>
                          </div>
                        </div>
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-green-500 text-white text-lg font-bold">
                            매칭도 {recommendation.matchPercentage}%
                          </Badge>
                        </div>
                        <div className="absolute top-4 right-4">
                          <Badge className={`${
                            recommendation.difficulty === 'easy' ? 'bg-blue-500' :
                            recommendation.difficulty === 'medium' ? 'bg-yellow-500' :
                            'bg-red-500'
                          } text-white`}>
                            {recommendation.difficulty === 'easy' ? '쉬움' :
                             recommendation.difficulty === 'medium' ? '보통' : '어려움'}
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="p-6">
                        <h3 className="text-xl font-bold mb-2">{recommendation.title}</h3>
                        <p className="text-gray-600 mb-4">{recommendation.description}</p>

                        <div className="space-y-4">
                          {/* 비용 정보 */}
                          <div className="flex justify-between items-center">
                            <span className="font-medium">총 예상 비용</span>
                            <span className="text-xl font-bold text-purple-600">
                              {recommendation.totalCost.toLocaleString()}원
                            </span>
                          </div>

                          {/* 하이라이트 */}
                          <div>
                            <h4 className="font-medium mb-2">여행 하이라이트</h4>
                            <div className="flex flex-wrap gap-2">
                              {recommendation.highlights.map((highlight, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {highlight}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* 간단 일정 */}
                          <div>
                            <h4 className="font-medium mb-2">일정 미리보기</h4>
                            <div className="space-y-2">
                              {recommendation.itinerary.slice(0, 2).map(day => (
                                <div key={day.day} className="flex items-center text-sm text-gray-600">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Day {day.day}: {day.title}
                                </div>
                              ))}
                              {recommendation.itinerary.length > 2 && (
                                <div className="text-sm text-gray-500">
                                  +{recommendation.itinerary.length - 2}일 더보기
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 태그 */}
                          <div className="flex flex-wrap gap-2">
                            {recommendation.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          {/* 액션 버튼 */}
                          <div className="flex gap-2 pt-4">
                            <Button
                              className="flex-1 bg-purple-600 hover:bg-purple-700"
                              onClick={() => setSelectedRecommendation(
                                selectedRecommendation === recommendation.id ? null : recommendation.id
                              )}
                            >
                              {selectedRecommendation === recommendation.id ? '접기' : '상세보기'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => exportItinerary(recommendation)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => shareRecommendation(recommendation)}
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* 상세 일정 (펼쳐짐) */}
                        {selectedRecommendation === recommendation.id && (
                          <div className="mt-6 pt-6 border-t">
                            <h4 className="font-bold text-lg mb-4">상세 일정표</h4>
                            <div className="space-y-6">
                              {recommendation.itinerary.map(day => (
                                <div key={day.day} className="border rounded-lg p-4 bg-gray-50">
                                  <div className="flex justify-between items-start mb-4">
                                    <div>
                                      <h5 className="font-bold text-lg">Day {day.day}: {day.title}</h5>
                                      <div className="text-gray-600 flex items-center">
                                        <MapPin className="h-4 w-4 mr-1" />
                                        {day.location}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-medium text-purple-600">
                                        {day.cost.toLocaleString()}원
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    {day.activities.map((activity, index) => (
                                      <div key={index} className="flex gap-4">
                                        <div className="flex-shrink-0 w-16 text-sm font-medium text-gray-600">
                                          {activity.time}
                                        </div>
                                        <div className="flex-1">
                                          <div className="font-medium">{activity.name}</div>
                                          <div className="text-sm text-gray-600">{activity.description}</div>
                                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                            <span>📍 {activity.location}</span>
                                            <span>⏱️ {activity.duration}</span>
                                            <span>💰 {activity.cost.toLocaleString()}원</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="flex justify-between text-sm">
                                      <div>
                                        <span className="font-medium">식사: </span>
                                        {day.meals.join(', ')}
                                      </div>
                                      {day.accommodation && (
                                        <div>
                                          <span className="font-medium">숙박: </span>
                                          {day.accommodation}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* 여행 팁 */}
                            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                              <h5 className="font-bold mb-2">💡 여행 팁</h5>
                              <ul className="text-sm space-y-1">
                                {recommendation.tips.map((tip, index) => (
                                  <li key={index} className="flex items-start">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="text-center mt-8">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep(1);
                      setRecommendations([]);
                      setSelectedRecommendation(null);
                    }}
                    className="mr-4"
                  >
                    <Shuffle className="h-4 w-4 mr-2" />
                    다시 추천받기
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Brain,
  Sparkles,
  MapPin,
  ShoppingCart,
  Star,
  Calendar,
  Clock,
  DollarSign,
  Heart,
  Loader2,
  Save,
  FolderHeart
} from 'lucide-react';
import { toast } from 'sonner';

interface Listing {
  id: number;
  category: string;
  title: string;
  short_description: string;
  price_from: number;
  lat: number;
  lng: number;
  location: string;
  images: string[];
  rating_avg: number;
  booking_count: number;
  view_count: number;
}

interface Recommendation {
  id: string;
  courseName: string;
  description: string;
  totalDuration: string;
  totalPrice: number;
  recommendations: RecommendedListing[];
  tips: string[];
  matchPercentage: number;
  method: string;
}

interface RecommendedListing {
  listing_id: number;
  order: number;
  day: number;
  reason: string;
  listing: Listing;
}

const TRAVEL_STYLES = [
  { id: 'healing', name: '힐링/휴양', icon: '🧘‍♀️' },
  { id: 'adventure', name: '모험/체험', icon: '🏃‍♂️' },
  { id: 'culture', name: '문화/역사', icon: '🏛️' },
  { id: 'nature', name: '자연/생태', icon: '🌿' },
  { id: 'food', name: '맛집/미식', icon: '🍽️' },
  { id: 'photo', name: '사진/인스타', icon: '📸' }
];

const INTERESTS = [
  { id: 'sea', name: '바다/해변' },
  { id: 'island', name: '섬 탐방' },
  { id: 'food', name: '특산음식' },
  { id: 'photo', name: '사진촬영' },
  { id: 'culture', name: '전통문화' },
  { id: 'activity', name: '체험활동' }
];

export function AICoursePage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  const [step, setStep] = useState(1);
  const [preferences, setPreferences] = useState({
    travelStyle: [] as string[],
    budget: [300000],
    duration: 2,
    groupSize: 2,
    interests: [] as string[],
    season: ''
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Google Maps 초기화
  useEffect(() => {
    if (!recommendation || !mapRef.current) return;

    const initMap = () => {
      // 추천된 상품들의 중심점 계산
      const listings = recommendation.recommendations
        .map(r => r.listing)
        .filter(l => l && l.lat && l.lng);

      if (listings.length === 0) return;

      const avgLat = listings.reduce((sum, l) => sum + l.lat, 0) / listings.length;
      const avgLng = listings.reduce((sum, l) => sum + l.lng, 0) / listings.length;

      // 지도 생성
      const map = new google.maps.Map(mapRef.current!, {
        center: { lat: avgLat, lng: avgLng },
        zoom: 11,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      googleMapRef.current = map;

      // 기존 마커 및 폴리라인 제거
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }

      // 빨간색 마커 추가
      listings.forEach((listing, index) => {
        const marker = new google.maps.Marker({
          position: { lat: listing.lat, lng: listing.lng },
          map,
          title: listing.title,
          label: {
            text: `${index + 1}`,
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 20,
            fillColor: '#EF4444', // 빨간색
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3
          }
        });

        // 마커 클릭 시 정보창
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 10px; max-width: 200px;">
              <h3 style="font-weight: bold; margin-bottom: 5px;">${listing.title}</h3>
              <p style="color: #666; font-size: 13px; margin-bottom: 5px;">${listing.category}</p>
              <p style="color: #888; font-size: 12px;">${listing.location}</p>
              <p style="color: #EF4444; font-weight: bold; margin-top: 5px;">₩${listing.price_from.toLocaleString()}</p>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        markersRef.current.push(marker);
      });

      // 코스 연결 Polyline 추가 (구글 경로처럼 선으로 연결)
      const path = listings.map(l => ({ lat: l.lat, lng: l.lng }));

      const polyline = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#EF4444', // 빨간색 (마커와 동일)
        strokeOpacity: 0.8,
        strokeWeight: 4,
        icons: [{
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 3,
            strokeColor: '#EF4444',
            fillColor: '#EF4444',
            fillOpacity: 1
          },
          offset: '50%',
          repeat: '100px'
        }]
      });

      polyline.setMap(map);
      polylineRef.current = polyline;

      // 지도 범위 조정
      const bounds = new google.maps.LatLngBounds();
      listings.forEach(l => bounds.extend({ lat: l.lat, lng: l.lng }));
      map.fitBounds(bounds);
    };

    // Google Maps API 로드 확인
    if (window.google && window.google.maps) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}&libraries=places`;
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);
    }
  }, [recommendation]);

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
      const response = await fetch('/api/ai/recommend-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences })
      });

      if (!response.ok) {
        throw new Error('Failed to generate recommendations');
      }

      const data = await response.json();

      if (data.success && data.recommendations && data.recommendations.length > 0) {
        setRecommendation(data.recommendations[0]);
        setIsSaved(false); // 새 추천 시 저장 상태 초기화
        setStep(3);
        const methodName = data.recommendations[0].method === 'gemini' ? 'Gemini AI' :
                          data.recommendations[0].method === 'openai' ? 'OpenAI' : '스마트 필터링';
        toast.success(`AI 추천 완성! (${methodName})`);
      } else {
        throw new Error('No recommendations generated');
      }
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      toast.error('추천 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  const addAllToCart = async () => {
    if (!recommendation) return;

    // 로그인 확인
    if (!isLoggedIn) {
      toast.error('로그인이 필요합니다');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
      return;
    }

    setIsAddingToCart(true);

    try {
      const listings = recommendation.recommendations.map(r => r.listing).filter(Boolean);

      // JWT 토큰 가져오기 (useCartStore와 동일하게)
      const token = localStorage.getItem('auth_token');

      // 각 상품을 장바구니에 추가
      const addPromises = listings.map(async (listing) => {
        // 가격 계산: price_from 사용
        const basePrice = listing.price_from || 0;

        const response = await fetch('/api/cart/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            listing_id: listing.id,
            quantity: 1,
            selected_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            // 인원 정보 (성인/어린이/유아/시니어)
            num_adults: preferences.groupSize,
            num_children: 0,
            num_infants: 0,
            num_seniors: 0,
            // 가격 정보 (adult_price가 null일 수 있으므로 price_from 사용)
            adult_price: listing.adult_price || basePrice,
            child_price: listing.child_price || (basePrice * 0.7),
            infant_price: listing.infant_price || (basePrice * 0.3),
            price_snapshot: basePrice * preferences.groupSize,
            // 옵션/보험 정보 (선택 사항)
            selected_options: null,
            selected_insurance: null,
            insurance_fee: 0
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(`${listing.title}: ${errorData.message || errorData.error}`);
        }

        return response.json();
      });

      await Promise.all(addPromises);

      toast.success(`${listings.length}개 상품이 장바구니에 담겼습니다!`);

      // 장바구니로 이동
      setTimeout(() => {
        navigate('/cart');
      }, 1500);

    } catch (error: any) {
      console.error('Failed to add to cart:', error);
      toast.error(error.message || '장바구니 담기에 실패했습니다.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const saveCourse = async () => {
    if (!recommendation) return;

    // 로그인 확인
    if (!isLoggedIn) {
      toast.error('로그인이 필요합니다');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
      return;
    }

    setIsSavingCourse(true);

    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch('/api/my/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseName: recommendation.courseName,
          description: recommendation.description,
          travelStyle: preferences.travelStyle,
          budget: preferences.budget[0],
          duration: preferences.duration,
          groupSize: preferences.groupSize,
          totalPrice: recommendation.totalPrice,
          matchPercentage: recommendation.matchPercentage,
          tips: recommendation.tips,
          recommendations: recommendation.recommendations.map(rec => ({
            listing_id: rec.listing?.id || rec.listing_id,
            order: rec.order,
            day: rec.day,
            reason: rec.reason
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.message || errorData.error);
      }

      const data = await response.json();
      setIsSaved(true);
      toast.success('코스가 저장되었습니다!');

    } catch (error: any) {
      console.error('Failed to save course:', error);
      toast.error(error.message || '코스 저장에 실패했습니다.');
    } finally {
      setIsSavingCourse(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 text-white">
        <div className="max-w-content mx-auto px-4 md:px-10 lg:px-20 py-12">
          <div className="text-center">
            <div className="flex justify-center items-center mb-4">
              <Brain className="h-12 w-12 mr-3" />
              <h1 className="text-4xl font-bold">AI 코스 추천</h1>
            </div>
            <p className="text-xl opacity-90">
              인기순 · 좌표 기반 · 지도 표시
            </p>
            <p className="text-lg opacity-80 mt-2">
              좌표가 있는 상품들만 선택하여 지도에 빨간 핀으로 표시합니다
            </p>
            {isLoggedIn && (
              <Button
                variant="outline"
                className="mt-4 bg-white/20 border-white text-white hover:bg-white/30"
                onClick={() => navigate('/my/courses')}
              >
                <FolderHeart className="h-4 w-4 mr-2" />
                내 코스 보기
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-content mx-auto px-4 md:px-10 lg:px-20 py-8">
        {/* 진행 단계 */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step >= stepNum ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step > stepNum ? 'bg-red-500' : 'bg-gray-300'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: 여행 스타일 */}
        {step === 1 && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-center">
                <Sparkles className="h-6 w-6 inline mr-2" />
                어떤 여행을 원하시나요?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">여행 스타일 (복수 선택)</h3>
                <div className="grid grid-cols-3 gap-4">
                  {TRAVEL_STYLES.map(style => (
                    <Card
                      key={style.id}
                      className={`cursor-pointer transition-all ${
                        preferences.travelStyle.includes(style.id)
                          ? 'border-red-500 bg-red-50'
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

              <div>
                <h3 className="text-lg font-medium mb-4">관심사 (복수 선택)</h3>
                <div className="grid grid-cols-3 gap-4">
                  {INTERESTS.map(interest => (
                    <Card
                      key={interest.id}
                      className={`cursor-pointer transition-all ${
                        preferences.interests.includes(interest.id)
                          ? 'border-red-500 bg-red-50'
                          : 'hover:border-gray-300'
                      }`}
                      onClick={() => handleInterestChange(interest.id)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="font-medium">{interest.name}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={preferences.travelStyle.length === 0}
                  className="bg-red-500 hover:bg-red-600"
                >
                  다음 단계
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: 상세 설정 */}
        {step === 2 && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl text-center">여행 상세 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">예산 (1인 기준)</h3>
                  <Slider
                    value={preferences.budget}
                    onValueChange={(value) => setPreferences(prev => ({ ...prev, budget: value }))}
                    max={1000000}
                    min={100000}
                    step={50000}
                  />
                  <div className="text-center text-lg font-medium text-red-600 mt-2">
                    {preferences.budget[0].toLocaleString()}원
                  </div>
                </div>

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
                      <SelectItem value="5">4박 5일</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                      <SelectItem value="2">2명</SelectItem>
                      <SelectItem value="3">3-4명</SelectItem>
                      <SelectItem value="5">5명 이상</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">여행 시기</h3>
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
                <Button variant="outline" onClick={() => setStep(1)}>
                  이전
                </Button>
                <Button
                  onClick={generateRecommendations}
                  disabled={!preferences.season || isGenerating}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      AI 추천 생성
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: 추천 결과 + 지도 */}
        {step === 3 && recommendation && (
          <div className="space-y-6">
            {/* 추천 정보 카드 */}
            <Card className="max-w-4xl mx-auto">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{recommendation.courseName}</h2>
                    <p className="text-gray-600">{recommendation.description}</p>
                  </div>
                  <Badge className="bg-green-500 text-white text-lg">
                    매칭 {recommendation.matchPercentage}%
                  </Badge>
                </div>

                <div className="flex gap-6 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {recommendation.totalDuration}
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    총 {recommendation.totalPrice.toLocaleString()}원
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {recommendation.recommendations.length}개 장소
                  </div>
                </div>

                {/* 버튼 그룹 */}
                <div className="flex gap-3">
                  {/* 코스 저장 버튼 */}
                  <Button
                    onClick={saveCourse}
                    disabled={isSavingCourse || isSaved}
                    variant="outline"
                    className="flex-1 text-lg py-6 border-2"
                  >
                    {isSavingCourse ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        저장 중...
                      </>
                    ) : isSaved ? (
                      <>
                        <FolderHeart className="h-5 w-5 mr-2 text-green-600" />
                        저장 완료
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5 mr-2" />
                        코스 저장
                      </>
                    )}
                  </Button>

                  {/* 전체 장바구니 담기 버튼 */}
                  <Button
                    onClick={addAllToCart}
                    disabled={isAddingToCart}
                    className="flex-[2] bg-red-500 hover:bg-red-600 text-white text-lg py-6"
                  >
                    {isAddingToCart ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        장바구니에 담는 중...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        전체 장바구니 담기 ({recommendation.recommendations.length}개)
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 지도 */}
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-red-500" />
                  코스 지도 (빨간 핀 = 추천 장소)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  ref={mapRef}
                  className="w-full h-[500px] rounded-lg border border-gray-200"
                ></div>
              </CardContent>
            </Card>

            {/* 추천 상품 목록 */}
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle>추천 상품 상세</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recommendation.recommendations.map((rec, index) => {
                    const listing = rec.listing;
                    if (!listing) return null;

                    return (
                      <Card key={listing.id} className="border-2">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            <div className="flex-shrink-0">
                              <div className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center text-2xl font-bold">
                                {index + 1}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h3 className="text-lg font-bold">{listing.title}</h3>
                                  <Badge variant="secondary" className="mt-1">
                                    {listing.category}
                                  </Badge>
                                </div>
                                <div className="text-right">
                                  <div className="text-xl font-bold text-red-600">
                                    ₩{listing.price_from.toLocaleString()}
                                  </div>
                                  {listing.rating_avg > 0 && (
                                    <div className="flex items-center text-sm text-gray-600 mt-1">
                                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                                      {listing.rating_avg.toFixed(1)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{listing.short_description}</p>
                              <div className="flex items-center text-sm text-gray-500">
                                <MapPin className="h-4 w-4 mr-1" />
                                {listing.location}
                              </div>
                              <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                                💡 {rec.reason}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* 여행 팁 */}
                {recommendation.tips && recommendation.tips.length > 0 && (
                  <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-bold mb-2">💡 여행 팁</h4>
                    <ul className="text-sm space-y-1">
                      {recommendation.tips.map((tip, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-2"></span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 다시 추천받기 */}
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setRecommendation(null);
                }}
              >
                다시 추천받기
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

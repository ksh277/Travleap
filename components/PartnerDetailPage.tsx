import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import {
  MapPin,
  Clock,
  Users,
  Globe,
  Share2,
  Heart,
  Star,
  Phone,
  Mail,
  Camera,
} from 'lucide-react';
import { toast } from 'sonner';

interface Partner {
  id: number;
  name: string;
  category: string;
  address: string;
  promotion: string;
  description: string;
  business_hours: string;
  phone: string;
  email: string;
  images: string[];
  location: string;
  rating: number;
  review_count: number;
  discount_rate?: number;
  member_since: string;
  base_price?: number;
  duration?: number;
  min_age?: number;
  max_capacity?: number;
  language?: string;
  coordinates?: string;
  lat?: number;
  lng?: number;
}

export function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [nearbyPartners, setNearbyPartners] = useState<Partner[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  useEffect(() => {
    loadPartnerDetail();
  }, [id]);

  // 파트너가 로드되면 근처 파트너 로드
  useEffect(() => {
    if (partner && partner.lat && partner.lng) {
      loadNearbyPartners(partner.lat, partner.lng);
    }
  }, [partner]);

  // Google Map 초기화
  useEffect(() => {
    if (!partner) return;

    const initMap = () => {
      if (!(window as any).google || !(window as any).google.maps) {
        console.error('Google Maps API not loaded');
        return;
      }

      const container = document.getElementById('map');
      if (!container) return;

      // lat/lng가 있으면 바로 사용
      if (partner.lat && partner.lng) {
        const position = { lat: partner.lat, lng: partner.lng };

        const map = new google.maps.Map(container, {
          center: position,
          zoom: 15,
        });

        // 마커 표시
        const marker = new google.maps.Marker({
          map: map,
          position: position,
          title: partner.name,
        });

        // 인포윈도우 표시
        const infowindow = new google.maps.InfoWindow({
          content: `<div style="padding:10px;"><strong>${partner.name}</strong><br/>${partner.address}</div>`
        });
        infowindow.open(map, marker);

        marker.addListener('click', () => {
          infowindow.open(map, marker);
        });
      } else if (partner.coordinates) {
        const [lat, lng] = partner.coordinates.split(',').map(Number);
        const position = { lat, lng };

        const map = new google.maps.Map(container, {
          center: position,
          zoom: 15,
        });

        const marker = new google.maps.Marker({
          map: map,
          position: position,
          title: partner.name,
        });

        const infowindow = new google.maps.InfoWindow({
          content: `<div style="padding:10px;"><strong>${partner.name}</strong><br/>${partner.address}</div>`
        });
        infowindow.open(map, marker);

        marker.addListener('click', () => {
          infowindow.open(map, marker);
        });
      } else {
        // 주소도 좌표도 없으면 기본 위치 (신안군청)
        const defaultPosition = { lat: 34.8251, lng: 126.1042 };
        const map = new google.maps.Map(container, {
          center: defaultPosition,
          zoom: 11,
        });
      }
    };

    // Google Maps API 로드 확인
    if ((window as any).google && (window as any).google.maps) {
      initMap();
    } else {
      // Google Maps API 스크립트가 이미 PartnerPage에서 로드되었을 것으로 예상
      const checkGoogleMaps = setInterval(() => {
        if ((window as any).google && (window as any).google.maps) {
          clearInterval(checkGoogleMaps);
          initMap();
        }
      }, 100);

      // 10초 후 타임아웃
      setTimeout(() => {
        clearInterval(checkGoogleMaps);
      }, 10000);
    }
  }, [partner]);

  // 거리 계산 함수 (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // km
  };

  // 근처 파트너 로드
  const loadNearbyPartners = async (currentLat: number, currentLng: number) => {
    setNearbyLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_URL}/api/partners`);
      const result = await response.json();

      if (result.success && result.data) {
        // 현재 파트너를 제외하고 거리 계산
        const partnersWithDistance = result.data
          .filter((p: any) => p.id !== id && p.lat && p.lng) // 현재 파트너 제외 및 좌표 있는 것만
          .map((p: any) => {
            const distance = calculateDistance(
              currentLat,
              currentLng,
              parseFloat(p.lat),
              parseFloat(p.lng)
            );

            return {
              id: p.id,
              name: p.business_name,
              category: p.services?.split(',')[0] || '여행',
              address: p.business_address || p.location,
              promotion: '',
              description: p.description || '',
              business_hours: p.business_hours || '',
              phone: p.phone || '',
              email: p.email || '',
              images: p.images ? (typeof p.images === 'string' ? JSON.parse(p.images) : p.images) : [],
              location: p.location || '',
              rating: 0,
              review_count: 0,
              member_since: new Date(p.created_at).getFullYear().toString(),
              lat: parseFloat(p.lat),
              lng: parseFloat(p.lng),
              distance: distance
            };
          })
          .sort((a: any, b: any) => a.distance - b.distance) // 거리순 정렬
          .slice(0, 4); // 가장 가까운 4개만

        setNearbyPartners(partnersWithDistance);
      }
    } catch (error) {
      console.error('Failed to load nearby partners:', error);
    } finally {
      setNearbyLoading(false);
    }
  };

  const loadPartnerDetail = async () => {
    if (!id) return;

    setLoading(true);
    try {
      // API 호출 - 환경에 따라 자동으로 URL 설정
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_URL}/api/partners/${id}`);
      const result = await response.json();

      if (result.success && result.data) {
        const partnerData = result.data;
        setPartner({
          id: partnerData.id,
          name: partnerData.business_name || partnerData.name,
          category: partnerData.category,
          address: partnerData.address || partnerData.business_address,
          promotion: partnerData.promotion || '',
          description: partnerData.description || partnerData.services,
          business_hours: partnerData.business_hours || '매일 09:00-18:00',
          phone: partnerData.phone || partnerData.contact_phone,
          email: partnerData.email || partnerData.contact_email,
          images: partnerData.images ? (typeof partnerData.images === 'string' ? JSON.parse(partnerData.images) : partnerData.images) : ['/images/placeholder.jpg'],
          location: partnerData.location || '신안, 대한민국',
          rating: partnerData.avg_rating || partnerData.rating || 0,
          review_count: partnerData.review_count || 0,
          discount_rate: partnerData.discount_rate,
          member_since: partnerData.created_at ? new Date(partnerData.created_at).getFullYear().toString() : new Date().getFullYear().toString(),
          base_price: partnerData.base_price || 0,
          duration: partnerData.duration,
          min_age: partnerData.min_age,
          max_capacity: partnerData.max_capacity,
          language: partnerData.language,
          coordinates: partnerData.coordinates,
          lat: partnerData.lat ? Number(partnerData.lat) : undefined,
          lng: partnerData.lng ? Number(partnerData.lng) : undefined,
        });
      } else {
        throw new Error(result.message || '파트너 정보를 찾을 수 없습니다');
      }
    } catch (error) {
      console.error('Failed to load partner:', error);
      toast.error(error instanceof Error ? error.message : '가맹점 정보를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: partner?.name,
        text: partner?.promotion,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('링크가 복사되었습니다');
    }
  };

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
    toast.success(isFavorited ? '찜 목록에서 제거되었습니다' : '찜 목록에 추가되었습니다');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">가맹점을 찾을 수 없습니다</p>
          <Button onClick={() => navigate('/partners')}>목록으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{partner.name} - Travleap</title>
        <meta name="description" content={partner.description} />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Hero Image Section */}
        <div className="relative h-[400px] md:h-[500px] overflow-hidden">
          <img
            src={partner.images[currentImageIndex]}
            alt={partner.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '/images/placeholder.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40"></div>

          {/* Top Actions */}
          <div className="absolute top-4 right-4 flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full bg-white/90 hover:bg-white"
              onClick={handleShare}
            >
              <Share2 className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className={`rounded-full ${
                isFavorited ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white/90 hover:bg-white'
              }`}
              onClick={handleFavorite}
            >
              <Heart className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`} />
            </Button>
          </div>

          {/* Image Counter */}
          {partner.images.length > 1 && (
            <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
              <Camera className="h-4 w-4" />
              더 사진
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Title & Location */}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                  {partner.name}
                </h1>
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <MapPin className="h-5 w-5" />
                  <span className="text-sm">{partner.location}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{partner.rating || '지'}</span>
                    <span className="text-gray-600">평가</span>
                  </div>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600">{partner.review_count} 리뷰</span>
                </div>
              </div>

              {/* Overview Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">개요</h2>
                <div className="space-y-3 text-gray-700">
                  <div>
                    <span className="font-semibold">주소 :</span> {partner.address}
                  </div>
                  {partner.promotion && (
                    <div>
                      <span className="font-semibold">프로모션 :</span> {partner.promotion}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold">내용 :</span> {partner.description}
                  </div>
                  <div>
                    <span className="font-semibold">영업시간 :</span> {partner.business_hours}
                  </div>
                </div>
              </div>

              {/* Map Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">활동의 위치</h2>
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <MapPin className="h-5 w-5" />
                  <span className="text-sm">{partner.location}</span>
                </div>
                <div id="map" className="w-full h-[400px] bg-gray-100 rounded-lg"></div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 space-y-6">
                {/* Price Card */}
                <Card className="overflow-hidden">
                  <div className="bg-purple-600 text-white p-6">
                    <div className="text-sm mb-2">from</div>
                    <div className="text-4xl font-bold">
                      {partner.base_price && partner.base_price > 0
                        ? `₩${partner.base_price.toLocaleString()}`
                        : '무료'}
                    </div>
                    {partner.discount_rate && partner.base_price && partner.base_price > 0 && (
                      <Badge className="mt-2 bg-red-500">
                        {partner.discount_rate}% 할인
                      </Badge>
                    )}
                  </div>
                </Card>

                {/* Host Info Card */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold mb-4">주최</h3>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-bold">T</span>
                      </div>
                      <div>
                        <div className="font-semibold">{partner.name}</div>
                        <div className="text-sm text-gray-600">travleap</div>
                        <div className="text-xs text-gray-500">Member Since {partner.member_since}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4].map((star) => (
                        <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                      <Star className="h-4 w-4 text-gray-300" />
                    </div>
                    <div className="text-sm text-gray-600">{partner.review_count || 7} 리뷰</div>
                  </CardContent>
                </Card>

                {/* Contact Info Card */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold mb-4">연락처 정보</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-purple-600" />
                        <span className="text-sm">{partner.phone}</span>
                      </div>
                      {partner.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 text-purple-600" />
                          <span className="text-sm">{partner.email}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Nearby Partners Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">근처 제휴 프로모션 추천</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {nearbyLoading ? (
                <div className="text-center text-gray-500 col-span-full py-8">
                  근처 프로모션을 불러오는 중...
                </div>
              ) : nearbyPartners.length === 0 ? (
                <div className="text-center text-gray-500 col-span-full py-8">
                  주변에 제휴 프로모션이 없습니다.
                </div>
              ) : (
                nearbyPartners.map((nearbyPartner: any) => (
                  <Card
                    key={nearbyPartner.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/partners/${nearbyPartner.id}`)}
                  >
                    <div className="relative h-48">
                      <img
                        src={nearbyPartner.images && nearbyPartner.images.length > 0
                          ? nearbyPartner.images[0]
                          : 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'}
                        alt={nearbyPartner.name}
                        className="w-full h-full object-cover"
                      />
                      {nearbyPartner.distance !== undefined && (
                        <Badge className="absolute top-2 right-2 bg-blue-600 text-white">
                          {nearbyPartner.distance < 1
                            ? `${Math.round(nearbyPartner.distance * 1000)}m`
                            : `${nearbyPartner.distance.toFixed(1)}km`}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-1">{nearbyPartner.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <MapPin className="h-4 w-4" />
                        <span className="line-clamp-1">{nearbyPartner.location}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {nearbyPartner.category}
                      </Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

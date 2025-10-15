import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  MapPin,
  Calendar as CalendarIcon,
  Filter,
  Heart,
  Navigation,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getGoogleMapsApiKey } from '../utils/env';
import { api } from '../utils/api';

interface Partner {
  id: string;
  name: string;
  category: string;
  location: string;
  rating: number;
  reviewCount: number;
  price: string;
  image: string;
  description: string;
  position: {
    lat: number;
    lng: number;
  };
  featured?: boolean;
  distance?: number; // km 단위 거리
}

// 파트너 데이터 로딩 - partners 테이블에서 데이터 가져오기
const loadPartners = async (): Promise<Partner[]> => {
  try {
    // partners 테이블에서 파트너 데이터 로드
    const partnersResponse = await api.getPartners();
    const partnersList: Partner[] = [];

    if (partnersResponse.success && partnersResponse.data && partnersResponse.data.length > 0) {
      // 신안군 기본 좌표
      const defaultCoord = { lat: 34.9654, lng: 126.1234 };

      partnersResponse.data.forEach((partner: any) => {
        // 위치 정보 파싱 (있는 경우)
        let position = defaultCoord;
        if (partner.lat && partner.lng) {
          position = {
            lat: parseFloat(partner.lat),
            lng: parseFloat(partner.lng)
          };
        }

        // services를 카테고리로 사용 (첫 번째 서비스)
        const services = partner.services ? partner.services.split(',').map((s: string) => s.trim()) : ['여행'];
        const category = services[0] || '여행';

        const partnerCard: Partner = {
          id: partner.id.toString(),
          name: partner.business_name || '업체명 없음',
          category: category,
          location: partner.address || partner.phone || '신안군',
          rating: 0,
          reviewCount: 0,
          price: '가격 문의',
          image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
          description: partner.description || '신안의 아름다운 자연과 함께하는 특별한 체험',
          position: position,
          featured: partner.is_featured === 1
        };

        partnersList.push(partnerCard);
      });

      console.log(`✅ DB에서 ${partnersList.length}개 파트너 로드 완료`);
      return partnersList;
    }

    console.warn('⚠️  DB에 파트너 데이터가 없습니다');
    return [];

  } catch (error) {
    console.error('❌ 파트너 데이터 로드 실패:', error);
    return [];
  }
};

export function PartnerPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [showCalendar, setShowCalendar] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [moreOptions, setMoreOptions] = useState({
    attractions: false,
    partners: false,
    food: false,
    accommodation: false
  });
  const [filters, setFilters] = useState({
    category: '',
    priceRange: '',
    rating: '',
    sortBy: 'recommended' // 추천순, 최신순
  });
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapError, setMapError] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<Map<string, google.maps.InfoWindow>>(new Map());
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6); // 페이지당 6개 (3행 x 2열)

  // 날짜 포맷 함수
  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\./g, '/').replace(/\s/g, '');
  };

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

  // GPS 위치 가져오기
  const getCurrentLocation = () => {
    setGpsLoading(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('이 브라우저는 GPS를 지원하지 않습니다.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { lat: latitude, lng: longitude };
        setUserLocation(newLocation);
        
        // 지도 중심을 사용자 위치로 이동
        if (map) {
          map.setCenter(newLocation);
          map.setZoom(13);
          addUserMarker(newLocation);
        }

        // 제휴업체들과의 거리 계산
        const updatedPartners = partners.map(partner => ({
          ...partner,
          distance: calculateDistance(latitude, longitude, partner.position.lat, partner.position.lng)
        }));
        setPartners(updatedPartners);
        
        setGpsLoading(false);
      },
      (error) => {
        let errorMessage = '위치를 가져올 수 없습니다.';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '위치 액세스가 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '위치 정보를 사용할 수 없습니다.';
            break;
          case error.TIMEOUT:
            errorMessage = '위치 요청 시간이 초과되었습니다.';
            break;
        }
        setGpsError(errorMessage);
        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5분
      }
    );
  };

  // 사용자 위치 마커 추가
  const addUserMarker = (location: {lat: number, lng: number}) => {
    if (!map) return;

    // 기존 사용자 마커 제거
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    // 새 사용자 마커 추가
    const userMarker = new google.maps.Marker({
      position: location,
      map: map,
      title: '내 위치',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2300ff00"%3E%3Ccircle cx="12" cy="12" r="8"/%3E%3Ccircle cx="12" cy="12" r="3" fill="%23ffffff"/%3E%3C/svg%3E',
        scaledSize: new google.maps.Size(24, 24)
      }
    });

    userMarkerRef.current = userMarker;

    // 정보창
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="text-align: center; padding: 8px;">
          <h3 style="margin: 0; color: #00ff00; font-size: 16px;">📍 내 위치</h3>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">현재 계신 곳입니다</p>
        </div>
      `
    });

    userMarker.addListener('click', () => {
      infoWindow.open(map, userMarker);
    });
  };

  // 초기 데이터 로드
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        const partnerData = await loadPartners();
        setPartners(partnerData);
        setFilteredPartners(partnerData);
      } catch (error) {
        console.error('Failed to initialize partner data:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Google Maps 초기화
  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current) return;

      const newMap = new google.maps.Map(mapRef.current, {
        center: { lat: 34.9654, lng: 126.1234 }, // 신안군 중심
        zoom: 11,
        styles: [
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#a2daf2' }]
          }
        ]
      });

      setMap(newMap);

      // 마커 추가 (파트너 데이터가 로드된 후)
      if (filteredPartners.length > 0) {
        addMarkers(newMap, filteredPartners);
      }
    };

    // Google Maps API 로드
    if (!(window as any).google) {
      const apiKey = getGoogleMapsApiKey();
      
      if (!apiKey) {
        console.error('Google Maps API key is not configured');
        setMapError(true);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      script.onerror = () => {
        console.error('Failed to load Google Maps API');
        setMapError(true);
      };
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, []);

  // 마커 추가 함수
  const addMarkers = (map: google.maps.Map, partnersList: Partner[]) => {
    // 기존 마커 제거
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    infoWindowsRef.current.clear();

    partnersList.forEach(partner => {
      const marker = new google.maps.Marker({
        position: partner.position,
        map: map,
        title: partner.name,
        icon: {
          url: partner.featured ?
            'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ff6a3d"%3E%3Cpath d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/%3E%3C/svg%3E' :
            'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%234299e1"%3E%3Cpath d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/%3E%3C/svg%3E',
          scaledSize: new google.maps.Size(30, 30)
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="max-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px;">${partner.name}</h3>
            <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">${partner.category}</p>
            <p style="margin: 0 0 4px 0; color: #666; font-size: 12px;">${partner.location}</p>
            <p style="margin: 4px 0 0 0; font-weight: 600; color: #ff6a3d;">${partner.price}</p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
      infoWindowsRef.current.set(partner.name, infoWindow);
    });
  };

  // 필터링 및 정렬 함수
  useEffect(() => {
    let filtered = partners;

    if (searchQuery) {
      filtered = filtered.filter(partner =>
        partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        partner.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        partner.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(partner => partner.category === filters.category);
    }

    if (filters.rating && filters.rating !== 'all') {
      const minRating = parseFloat(filters.rating);
      filtered = filtered.filter(partner => partner.rating >= minRating);
    }

    // 정렬 적용
    if (filters.sortBy === 'recommended') {
      // 추천순: featured 우선, 그다음 평점 높은 순
      filtered = [...filtered].sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return b.rating - a.rating;
      });
    } else if (filters.sortBy === 'latest') {
      // 최신순: id 역순 (id가 클수록 최신)
      filtered = [...filtered].sort((a, b) => parseInt(b.id) - parseInt(a.id));
    }

    setFilteredPartners(filtered);
    setCurrentPage(1); // 필터링 시 첫 페이지로 리셋

    // 지도 마커 업데이트 (전체 결과로)
    if (map) {
      addMarkers(map, filtered);
    }
  }, [searchQuery, filters, partners, map, fromDate, toDate, moreOptions]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredPartners.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPartners = filteredPartners.slice(startIndex, endIndex);

  // 페이지 번호 생성 (최대 5개)
  const getVisiblePageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots.filter((page, index, array) => array.indexOf(page) === index);
  };

  const handleSearch = () => {
    // 검색 로직 실행
  };

  // 제휴업체 카드 클릭 핸들러 - 지도에 마커 표시 및 중심 이동
  const handlePartnerClick = (partner: Partner) => {
    if (map) {
      // 지도 중심을 해당 파트너 위치로 이동
      map.setCenter(partner.position);
      map.setZoom(15);

      // 해당 파트너의 InfoWindow를 찾아서 열기
      const infoWindow = infoWindowsRef.current.get(partner.name);
      const marker = markersRef.current.find(m => m.getTitle() === partner.name);
      if (infoWindow && marker) {
        infoWindow.open(map, marker);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 배너 헤더 */}
      <div
        className="relative h-[200px] bg-cover bg-center"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url("https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&h=300&fit=crop")'
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-4xl font-bold text-white">가맹점</h1>
        </div>
      </div>

      {/* 검색 바 - 배경 이미지 위에 반쯤 걸쳐진 박스 */}
      <div className="relative -mt-16 mb-6">
        <div className="max-w-[1200px] mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
          {/* GPS 에러 메시지 */}
          {gpsError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {gpsError}
            </div>
          )}

          {/* 현재 위치 정보 */}
          {userLocation && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center">
              <Navigation className="h-4 w-4 mr-2" />
              현재 위치가 설정되었습니다. 거리순 정렬이 가능합니다.
            </div>
          )}

          <div className="flex gap-4 items-center">
            {/* 목적지 */}
            <div className="flex-1">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="어디에 가시나요?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-sm"
                />
                <div className="absolute left-3 -top-2 bg-white px-1 text-xs text-gray-600">
                  목적지
                </div>
              </div>
            </div>

            {/* 구분선 */}
            <div className="h-12 w-px bg-gray-300"></div>

            {/* From - To 날짜 */}
            <div className="flex-1">
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <div className="relative cursor-pointer">
                    <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      type="text"
                      readOnly
                      placeholder="dd/mm/yyyy - dd/mm/yyyy"
                      value={fromDate && toDate ? `${formatDate(fromDate)} - ${formatDate(toDate)}` : ''}
                      className="pl-10 h-12 cursor-pointer text-sm"
                    />
                    <div className="absolute left-3 -top-2 bg-white px-1 text-xs text-gray-600">
                      From - To
                    </div>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-4 space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">시작일</label>
                      <Calendar
                        mode="single"
                        selected={fromDate}
                        onSelect={setFromDate}
                        initialFocus
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">종료일</label>
                      <Calendar
                        mode="single"
                        selected={toDate}
                        onSelect={setToDate}
                        disabled={(date) => fromDate ? date < fromDate : false}
                      />
                    </div>
                    <Button
                      onClick={() => setShowCalendar(false)}
                      className="w-full bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                    >
                      확인
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* 구분선 */}
            <div className="h-12 w-px bg-gray-300"></div>

            {/* 시간 (More 드롭다운) */}
            <div className="w-[180px]">
              <div className="relative">
                <Select
                  value=""
                  onValueChange={() => {}}
                >
                  <SelectTrigger className="h-12 text-sm">
                    <SelectValue placeholder="More" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">오전</SelectItem>
                    <SelectItem value="afternoon">오후</SelectItem>
                    <SelectItem value="evening">저녁</SelectItem>
                  </SelectContent>
                </Select>
                <div className="absolute left-3 -top-2 bg-white px-1 text-xs text-gray-600">
                  시간
                </div>
              </div>
            </div>

            {/* 검색 버튼 */}
            <Button onClick={handleSearch} className="bg-[#8B5FBF] hover:bg-[#7A4FB5] text-white px-12 h-12">
              검색
            </Button>
          </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* 왼쪽: 필터 + 리스트 */}
          <div className="flex-1 min-w-[400px]">
            {/* 필터 바 */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">필터:</span>
                </div>

                <Select
                  value={filters.category}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="카테고리" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="투어">투어</SelectItem>
                    <SelectItem value="숙박">숙박</SelectItem>
                    <SelectItem value="음식">음식</SelectItem>
                    <SelectItem value="렌트카">렌트카</SelectItem>
                  </SelectContent>
                </Select>

                {/* 거리순 정렬 버튼 */}
                {userLocation && (
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const sorted = [...filteredPartners].sort((a, b) => {
                        if (a.distance === undefined) return 1;
                        if (b.distance === undefined) return -1;
                        return a.distance - b.distance;
                      });
                      setFilteredPartners(sorted);
                    }}
                    className="text-sm"
                  >
                    <Navigation className="h-3 w-3 mr-1" />
                    거리순
                  </Button>
                )}

                <div className="ml-auto text-sm text-gray-600">
                  <span className="font-medium">{filteredPartners.length}</span>개 업체 발견
                </div>
              </div>
            </div>

            {/* 결과 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                총 {filteredPartners.length}개 업체 ({currentPage}/{totalPages} 페이지)
              </h2>
              <Select
                value={filters.sortBy}
                onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">추천순</SelectItem>
                  <SelectItem value="latest">최신순</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 업체 리스트 - 그리드 형태 (3행 2열) */}
            <div className="grid grid-cols-2 gap-4">
              {currentPartners.map((partner) => (
                <Card key={partner.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handlePartnerClick(partner)}>
                  <div className="flex flex-col">
                    {/* 이미지 */}
                    <div className="relative w-full h-48">
                      <img
                        src={partner.image}
                        alt={partner.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-white transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Heart className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>

                    {/* 정보 */}
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2 mb-2">
                        <h3 className="font-semibold text-base flex-1 line-clamp-1">{partner.name}</h3>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {partner.category}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1 mb-2">
                        <MapPin className="h-3 w-3 text-gray-500 flex-shrink-0" />
                        <span className="text-xs text-gray-600 line-clamp-1">{partner.location}</span>
                      </div>

                      {partner.distance !== undefined && (
                        <div className="text-xs text-blue-600 mb-2 bg-blue-50 px-2 py-1 rounded inline-block">
                          {partner.distance < 1
                            ? `${Math.round(partner.distance * 1000)}m`
                            : `${partner.distance.toFixed(1)}km`
                          }
                        </div>
                      )}

                      <p className="text-xs text-gray-600 mb-3 line-clamp-2">{partner.description}</p>

                      <div className="flex items-center justify-between">
                        <div className="text-base font-bold text-[#ff6a3d]">
                          {partner.price}
                        </div>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/detail/${partner.id}`);
                          }}
                          className="bg-[#8B5FBF] hover:bg-[#7A4FB5] text-white text-xs px-4"
                        >
                          상세보기
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center mt-8 space-x-2">
                {/* 이전 페이지 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  이전
                </Button>

                {/* 페이지 번호들 */}
                <div className="flex items-center space-x-1">
                  {getVisiblePageNumbers().map((pageNum, index) => (
                    <React.Fragment key={index}>
                      {pageNum === '...' ? (
                        <span className="px-2 py-1 text-gray-500">...</span>
                      ) : (
                        <Button
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum as number)}
                          className={`min-w-[40px] ${
                            currentPage === pageNum
                              ? "bg-[#8B5FBF] hover:bg-[#7A4FB5] text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {pageNum}
                        </Button>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* 다음 페이지 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center"
                >
                  다음
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            {/* 페이지 정보 */}
            {filteredPartners.length > 0 && (
              <div className="text-center mt-4 text-sm text-gray-600">
                {startIndex + 1}-{Math.min(endIndex, filteredPartners.length)} / {filteredPartners.length}개 업체 표시
              </div>
            )}
          </div>

          {/* 오른쪽: 지도 */}
          <div className="w-[800px] flex-shrink-0">
            <div className="sticky top-4">
              <Card className="overflow-hidden">
                {mapError ? (
                  <div className="w-full h-[900px] flex items-center justify-center bg-gray-100">
                    <div className="text-center p-8 max-w-sm">
                      <div className="text-gray-400 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">지도를 불러올 수 없습니다</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Google Maps API 키가 필요합니다.
                      </p>
                      <div className="text-xs text-gray-400 bg-gray-50 p-3 rounded border">
                        <p className="mb-2"><strong>설정 방법:</strong></p>
                        <p>1. Google Cloud Console에서 Maps JavaScript API 키 발급</p>
                        <p>2. 환경변수 GOOGLE_MAPS_API_KEY에 키 설정</p>
                        <p>3. 페이지 새로고침</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    ref={mapRef}
                    className="w-full h-[900px]"
                    style={{ minHeight: '900px' }}
                  />
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
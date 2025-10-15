import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import {
  Star,
  MapPin,
  Calendar as CalendarIcon,
  Filter,
  Search,
  Heart,
  ChevronDown,
  Navigation,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getGoogleMapsApiKey } from '../utils/env';
import { api, type TravelItem } from '../utils/api';
import { useRealTimeListings, useRealTimePartners } from '../hooks/useRealTimeData';

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
    // 파트너 데이터 로드
    const partnersResponse = await api.getPartners();
    const partnersList: Partner[] = [];

    if (partnersResponse.success && partnersResponse.data && partnersResponse.data.length > 0) {
      // 신안군 실제 좌표 배열 (각 카테고리별 대표 위치)
      const categoryCoordinates: { [key: string]: { lat: number; lng: number } } = {
        '여행': { lat: 34.8278, lng: 126.1063 }, // 증도면
        '렌트카': { lat: 34.7845, lng: 126.0932 }, // 임자면
        '숙박': { lat: 34.7123, lng: 125.9876 }, // 자은면
        '음식': { lat: 34.6834, lng: 126.0445 }, // 비금면
        '관광지': { lat: 34.7567, lng: 126.1234 }, // 도초면
        '팝업': { lat: 34.8597, lng: 126.1533 }, // 임자도
        '행사': { lat: 34.8194, lng: 126.3031 }, // 지도읍
        '체험': { lat: 34.8726, lng: 126.1094 }  // 증도 태평염전
      };

      partnersResponse.data.forEach((partner: any, index: number) => {
        // tier에 따라 카테고리 매핑
        const tierToCategoryMap: { [key: string]: string } = {
          'gold': '여행',
          'silver': '관광지',
          'bronze': '음식'
        };
        const category = tierToCategoryMap[partner.tier] || '체험';

        // 카테고리별 좌표 할당
        const coord = categoryCoordinates[category] || { lat: 34.8278, lng: 126.1063 };

        const partnerCard: Partner = {
          id: partner.id.toString(),
          name: partner.business_name,  // DB 필드명 수정
          category: category,
          location: partner.phone || '신안군',  // phone을 임시로 표시
          rating: 4.5,
          reviewCount: 0,
          price: partner.tier === 'gold' ? '50,000원~' : partner.tier === 'silver' ? '30,000원~' : '10,000원~',
          image: `https://images.unsplash.com/photo-${1506905925346 + index}?w=400&h=300&fit=crop`,
          description: partner.description || '신안의 아름다운 자연과 함께하는 특별한 체험',
          position: coord,
          featured: partner.is_featured === 1
        };

        partnersList.push(partnerCard);
      });
    }

    if (partnersList.length > 0) {
      return partnersList;
    }

  } catch (error) {
    console.error('파트너 데이터 로드 실패:', error);
  }

  // API 실패 시 샘플 파트너 데이터 (신안군 실제 좌표 사용)
  const samplePartners: Partner[] = [
    {
      id: '1',
      name: '신안 퍼플섬 투어',
      category: '투어',
      location: '신안군 안좌면',
      rating: 4.8,
      reviewCount: 156,
      price: '45,000원',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
      description: '보라색으로 물든 아름다운 퍼플섬에서의 특별한 투어 체험',
      position: { lat: 34.7856, lng: 126.2383 },
      featured: true
    },
    {
      id: '2',
      name: '임자도 대광해수욕장 리조트',
      category: '숙박',
      location: '신안군 임자면',
      rating: 4.7,
      reviewCount: 89,
      price: '180,000원',
      image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop',
      description: '12km 백사장이 펼쳐진 대광해수욕장의 프리미엄 리조트',
      position: { lat: 34.8597, lng: 126.1533 },
      featured: true
    },
    {
      id: '3',
      name: '신안 전통 젓갈 맛집',
      category: '음식',
      location: '신안군 지도읍',
      rating: 4.9,
      reviewCount: 234,
      price: '25,000원',
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
      description: '3대째 이어져 내려오는 전통 젓갈과 신선한 해산물 요리',
      position: { lat: 34.8194, lng: 126.3031 },
      featured: false
    },
    {
      id: '4',
      name: '흑산도 상라봉 트레킹',
      category: '투어',
      location: '신안군 흑산면',
      rating: 4.6,
      reviewCount: 112,
      price: '50,000원',
      image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop',
      description: '흑산도 최고봉에서 바라보는 서해의 장관과 트레킹의 즐거움',
      position: { lat: 34.6839, lng: 125.4367 },
      featured: true
    },
    {
      id: '5',
      name: '청산도 슬로우길',
      category: '투어',
      location: '신안군 청산면',
      rating: 4.9,
      reviewCount: 234,
      price: '30,000원',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
      description: '영화 촬영지로 유명한 청산도의 아름다운 슬로우길 트레킹',
      position: { lat: 34.1167, lng: 126.9333 },
      featured: true
    },
    {
      id: '6',
      name: '팔금도 해물탕집',
      category: '음식',
      location: '신안군 팔금면',
      rating: 4.7,
      reviewCount: 189,
      price: '35,000원',
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
      description: '팔금도 근해에서 잡은 신선한 해산물로 끓인 진짜 해물탕',
      position: { lat: 34.8403, lng: 126.2125 },
      featured: false
    },
    {
      id: '7',
      name: '증도 태평염전 체험관',
      category: '투어',
      location: '신안군 증도면',
      rating: 4.5,
      reviewCount: 98,
      price: '15,000원',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
      description: '세계 최대 염전에서 소금 만들기 체험과 염전 투어',
      position: { lat: 34.8726, lng: 126.1094 },
      featured: true
    },
    {
      id: '8',
      name: '자은도 백길해수욕장 펜션',
      category: '숙박',
      location: '신안군 자은면',
      rating: 4.4,
      reviewCount: 76,
      price: '120,000원',
      image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop',
      description: '아름다운 백길해수욕장 바로 앞 오션뷰 펜션',
      position: { lat: 34.7899, lng: 126.1756 },
      featured: false
    },
    {
      id: '9',
      name: '도초도 수국정원',
      category: '투어',
      location: '신안군 도초면',
      rating: 4.6,
      reviewCount: 142,
      price: '8,000원',
      image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400&h=300&fit=crop',
      description: '6월이면 만개하는 아름다운 수국으로 유명한 정원',
      position: { lat: 34.7394, lng: 126.2189 },
      featured: true
    },
    {
      id: '10',
      name: '비금도 원평해수욕장 캠핑장',
      category: '숙박',
      location: '신안군 비금면',
      rating: 4.3,
      reviewCount: 65,
      price: '35,000원',
      image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=300&fit=crop',
      description: '해변 바로 앞 오토캠핑장, 일출과 일몰을 모두 볼 수 있는 명소',
      position: { lat: 34.7547, lng: 126.1542 },
      featured: false
    },
    {
      id: '11',
      name: '압해도 천사대교 전망대',
      category: '투어',
      location: '신안군 압해읍',
      rating: 4.7,
      reviewCount: 203,
      price: '무료',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop',
      description: '천사대교의 아름다운 전경을 한눈에 볼 수 있는 전망대',
      position: { lat: 34.9654, lng: 126.1234 },
      featured: true
    },
    {
      id: '12',
      name: '신안군 해산물 직판장',
      category: '음식',
      location: '신안군 지도읍',
      rating: 4.8,
      reviewCount: 178,
      price: '40,000원',
      image: 'https://images.unsplash.com/photo-1559737558-2789262b9d50?w=400&h=300&fit=crop',
      description: '신안 어민들이 직접 잡은 신선한 해산물을 맛볼 수 있는 직판장',
      position: { lat: 34.8167, lng: 126.2956 },
      featured: false
    }
  ];

  // API 실패 시 샘플 데이터 사용
  return samplePartners;
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
    rating: ''
  });
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapError, setMapError] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6); // 페이지당 6개 (2행 x 3열)

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
            <p style="margin: 0 0 4px 0; color: #666; font-size: 14px;">${partner.category} • ${partner.location}</p>
            <div style="display: flex; align-items: center; margin: 4px 0;">
              <span style="color: #fbbf24;">★</span>
              <span style="margin-left: 4px; font-size: 14px;">${partner.rating} (${partner.reviewCount})</span>
            </div>
            <p style="margin: 4px 0 0 0; font-weight: 600; color: #ff6a3d;">${partner.price}</p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    });
  };

  // 필터링 함수
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

  // 제휴업체 카드 클릭 핸들러 - 모든 항목을 상세페이지로 이동
  const handlePartnerClick = (partner: Partner) => {
    // 모든 파트너 카드는 상품 데이터이므로 상세페이지로 이동
    navigate(`/detail/${partner.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 배너 헤더 */}
      <div
        className="relative h-[400px] bg-cover bg-center"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url("https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&h=300&fit=crop")'
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-4xl font-bold text-white">신안퍼플섬 투어 전체보기</h1>
        </div>
      </div>

      {/* 검색 바 - 배경 이미지 위에 반쯤 걸쳐진 박스 */}
      <div className="relative -mt-20 mb-6">
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

          <div className="flex flex-wrap gap-4 items-end">
            {/* 검색어 */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">검색어</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="업체명, 지역명 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* From - To 날짜 선택 */}
            <div className="min-w-[240px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">From - To</label>
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${
                      !fromDate && !toDate ? "text-muted-foreground" : ""
                    }`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate && toDate ? (
                      `${formatDate(fromDate)} - ${formatDate(toDate)}`
                    ) : fromDate ? (
                      `${formatDate(fromDate)} - To`
                    ) : toDate ? (
                      `From - ${formatDate(toDate)}`
                    ) : (
                      "dd/mm/yyyy - dd/mm/yyyy"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex">
                    <div className="p-3">
                      <div className="text-sm font-medium mb-2 text-center">From 날짜</div>
                      <Calendar
                        mode="single"
                        selected={fromDate}
                        onSelect={(date) => {
                          setFromDate(date);
                          if (date && toDate && date > toDate) {
                            setToDate(undefined);
                          }
                        }}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today || (toDate && date > toDate);
                        }}
                        initialFocus 
                      />
                    </div>
                    <div className="p-3 border-l">
                      <div className="text-sm font-medium mb-2 text-center">To 날짜</div>
                      <Calendar
                        mode="single"
                        selected={toDate}
                        onSelect={(date) => {
                          setToDate(date);
                        }}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today || (fromDate && date < fromDate);
                        }}
                      />
                    </div>
                  </div>
                  <div className="p-3 border-t flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setFromDate(undefined);
                        setToDate(undefined);
                      }}
                    >
                      초기화
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => setShowCalendar(false)}
                      className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                    >
                      확인
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* More 옵션 */}
            <div className="min-w-[100px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">More</label>
              <Popover open={showMoreOptions} onOpenChange={setShowMoreOptions}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    More
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="attractions"
                        checked={moreOptions.attractions}
                        onCheckedChange={(checked) =>
                          setMoreOptions(prev => ({ ...prev, attractions: checked as boolean }))
                        }
                      />
                      <label
                        htmlFor="attractions"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Attractions
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="partners"
                        checked={moreOptions.partners}
                        onCheckedChange={(checked) =>
                          setMoreOptions(prev => ({ ...prev, partners: checked as boolean }))
                        }
                      />
                      <label
                        htmlFor="partners"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        제휴업체
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="food"
                        checked={moreOptions.food}
                        onCheckedChange={(checked) =>
                          setMoreOptions(prev => ({ ...prev, food: checked as boolean }))
                        }
                      />
                      <label
                        htmlFor="food"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        음식점
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="accommodation"
                        checked={moreOptions.accommodation}
                        onCheckedChange={(checked) =>
                          setMoreOptions(prev => ({ ...prev, accommodation: checked as boolean }))
                        }
                      />
                      <label
                        htmlFor="accommodation"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        숙박업소
                      </label>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* GPS 버튼 */}
            <Button 
              onClick={getCurrentLocation} 
              disabled={gpsLoading}
              variant="outline"
              className="px-6"
            >
              {gpsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Navigation className="h-4 w-4 mr-2" />
              )}
              {gpsLoading ? '위치 찾는 중...' : '내 위치'}
            </Button>

            {/* 검색 버튼 */}
            <Button onClick={handleSearch} className="bg-[#8B5FBF] hover:bg-[#7A4FB5] text-white px-8">
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

                <Select 
                  value={filters.rating} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, rating: value }))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="평점" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 평점</SelectItem>
                    <SelectItem value="4.5">4.5★ 이상</SelectItem>
                    <SelectItem value="4.0">4.0★ 이상</SelectItem>
                    <SelectItem value="3.5">3.5★ 이상</SelectItem>
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
              <div className="text-sm text-gray-600">
                정렬: 추천순 | 페이지당 {itemsPerPage}개
              </div>
            </div>

            {/* 업체 리스트 - 그리드 형태 (2행 3열) */}
            <div className="grid grid-cols-3 gap-4">
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
                      {partner.featured && (
                        <Badge className="absolute top-2 left-2 bg-[#ff6a3d] text-white text-xs">
                          Featured
                        </Badge>
                      )}
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

                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="ml-1 text-sm font-medium">{partner.rating}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          ({partner.reviewCount}개)
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 mb-3 line-clamp-2">{partner.description}</p>

                      <div className="text-base font-bold text-[#ff6a3d]">
                        {partner.price}
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
          <div className="w-[500px] flex-shrink-0">
            <div className="sticky top-4">
              <Card className="overflow-hidden">
                {mapError ? (
                  <div className="w-full h-[600px] flex items-center justify-center bg-gray-100">
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
                    className="w-full h-[600px]"
                    style={{ minHeight: '600px' }}
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
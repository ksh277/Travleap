import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { MapPin, Star, Clock, Users, X } from 'lucide-react';
import { getGoogleMapsApiKey } from '../utils/env';

interface MapLocation {
  id: string;
  name: string;
  category: string;
  price: number;
  rating: number;
  location: string;
  lat: number;
  lng: number;
  image?: string;
  description?: string;
  duration?: string;
  maxCapacity?: number;
}

interface MapViewProps {
  locations: MapLocation[];
  onLocationSelect?: (location: MapLocation) => void;
  selectedLocation?: MapLocation | null;
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
}

export function MapView({
  locations,
  onLocationSelect,
  selectedLocation,
  center = { lat: 34.8118, lng: 126.3928 }, // 신안군 중심
  zoom = 11,
  className = "h-[500px] w-full"
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeMap();
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current) {
      updateMarkers();
    }
  }, [locations]);

  useEffect(() => {
    if (selectedLocation && mapInstanceRef.current) {
      const marker = markersRef.current.find(m =>
        (m as any).locationId === selectedLocation.id
      );
      if (marker) {
        mapInstanceRef.current.panTo(marker.getPosition() as google.maps.LatLng);
        mapInstanceRef.current.setZoom(15);
        showInfoWindow(marker, selectedLocation);
      }
    }
  }, [selectedLocation]);

  const initializeMap = async () => {
    const apiKey = getGoogleMapsApiKey();

    if (!apiKey) {
      setError('Google Maps API 키가 설정되지 않았습니다.');
      setIsLoading(false);
      return;
    }

    try {
      // Google Maps API 로드
      if (!window.google) {
        await loadGoogleMapsAPI(apiKey);
      }

      if (mapRef.current) {
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          styles: [
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#e9e9e9' }, { lightness: 17 }]
            },
            {
              featureType: 'landscape',
              elementType: 'geometry',
              stylers: [{ color: '#f5f5f5' }, { lightness: 20 }]
            }
          ]
        });

        mapInstanceRef.current = map;
        updateMarkers();
      }
    } catch (err) {
      setError('지도를 로드하는 중 오류가 발생했습니다.');
      console.error('Map initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGoogleMapsAPI = (apiKey: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google Maps API 로드 실패'));
      document.head.appendChild(script);
    });
  };

  const updateMarkers = () => {
    if (!mapInstanceRef.current) return;

    // 기존 마커들 제거
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // 새 마커들 생성
    locations.forEach(location => {
      const marker = new google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map: mapInstanceRef.current,
        title: location.name,
        icon: getMarkerIcon(location.category)
      });

      (marker as any).locationId = location.id;

      marker.addListener('click', () => {
        if (onLocationSelect) {
          onLocationSelect(location);
        }
        showInfoWindow(marker, location);
      });

      markersRef.current.push(marker);
    });
  };

  const getMarkerIcon = (category: string): google.maps.Icon => {
    const iconColors: { [key: string]: string } = {
      tour: '#3B82F6',          // 파란색
      accommodation: '#10B981', // 초록색
      food: '#F59E0B',          // 주황색
      rentcar: '#8B5CF6',       // 보라색
      package: '#EF4444',       // 빨간색
      event: '#F97316',         // 오렌지색
      attraction: '#06B6D4',    // 청록색
      experience: '#84CC16'     // 라임색
    };

    const color = iconColors[category] || '#6B7280';

    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 0.8,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 8
    };
  };

  const showInfoWindow = (marker: google.maps.Marker, location: MapLocation) => {
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }

    const content = `
      <div style="max-width: 250px; padding: 8px;">
        <div style="margin-bottom: 8px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: bold;">${location.name}</h3>
          <div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
            <span style="color: #F59E0B;">★</span>
            <span style="font-size: 14px;">${location.rating.toFixed(1)}</span>
            <span style="color: #6B7280; font-size: 12px;">• ${location.location}</span>
          </div>
        </div>

        <div style="margin-bottom: 8px; color: #374151; font-size: 14px;">
          ${location.description || ''}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-weight: bold; color: #1F2937;">
            ₩${location.price.toLocaleString()}
          </div>
          ${location.duration ? `
            <span style="font-size: 12px; color: #6B7280;">
              🕒 ${location.duration}
            </span>
          ` : ''}
        </div>
      </div>
    `;

    infoWindowRef.current = new google.maps.InfoWindow({
      content,
      maxWidth: 300
    });

    infoWindowRef.current.open(mapInstanceRef.current, marker);
  };

  const getCategoryLabel = (category: string): string => {
    const labels: { [key: string]: string } = {
      tour: '여행상품',
      accommodation: '숙박',
      food: '음식점',
      rentcar: '렌터카',
      package: '패키지',
      event: '행사',
      attraction: '관광지',
      experience: '체험'
    };
    return labels[category] || category;
  };

  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 rounded-lg`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">지도를 로드하는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 rounded-lg`}>
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <Button variant="outline" onClick={initializeMap}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={mapRef} className={className} />

      {/* 카테고리 범례 */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs">
        <h4 className="font-medium text-sm mb-2">카테고리</h4>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {Object.entries({
            tour: '여행상품',
            accommodation: '숙박',
            food: '음식점',
            event: '행사',
            attraction: '관광지',
            experience: '체험'
          }).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full border border-white"
                style={{ backgroundColor: {
                  tour: '#3B82F6',
                  accommodation: '#10B981',
                  food: '#F59E0B',
                  event: '#F97316',
                  attraction: '#06B6D4',
                  experience: '#84CC16'
                }[key] }}
              ></div>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 위치 정보 카드 */}
      {selectedLocation && (
        <Card className="absolute bottom-4 left-4 right-4 max-w-sm mx-auto">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold">{selectedLocation.name}</h3>
                <Badge variant="secondary" className="text-xs">
                  {getCategoryLabel(selectedLocation.category)}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLocationSelect?.(null as any)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500" />
                {selectedLocation.rating.toFixed(1)}
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {selectedLocation.location}
              </div>
              {selectedLocation.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {selectedLocation.duration}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">
                ₩{selectedLocation.price.toLocaleString()}
              </span>
              <Button size="sm" onClick={() => onLocationSelect?.(selectedLocation)}>
                상세보기
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
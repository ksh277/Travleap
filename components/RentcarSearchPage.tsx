/**
 * 렌트카 검색 페이지 - 쏘카 스타일
 * 왼쪽: 검색 결과 + 필터
 * 오른쪽: 지도 (픽업 위치 표시)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Search,
  Loader2,
  AlertCircle,
  Filter,
  SlidersHorizontal,
  Car,
  Fuel,
  Users,
  Settings,
  ChevronDown,
  ChevronUp,
  Map as MapIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { CarSearchRequest, CarSearchResult } from '../utils/rentcar/types';
import { toast } from 'sonner';
import { api } from '../utils/api';

interface RentcarSearchPageProps {
  selectedCurrency?: string;
}

// 실제 DB에서 렌트카 검색 (MVP API: 가용성 + 가격 계산 통합)
async function searchCarsAPI(request: CarSearchRequest): Promise<CarSearchResult[]> {
  try {
    // 새로운 MVP API 호출 (가용성 + 가격 계산 한 번에)
    const params = new URLSearchParams({
      pickup_at: request.pickupAt,
      return_at: request.dropoffAt,
      location_id: '1', // TODO: location code를 ID로 매핑 필요
    });

    if (request.driverAge) {
      params.append('driver_age', request.driverAge.toString());
    }

    const response = await fetch(`/api/rentals/search?${params.toString()}`);

    if (!response.ok) {
      console.error('Failed to search rentals');
      return [];
    }

    const data = await response.json();
    const vehicles = data.data?.vehicles || [];

    if (vehicles.length === 0) {
      return [];
    }

    // CarSearchResult 형식으로 변환
    const pickupLoc = LOCATIONS.find(l => l.code === request.pickupPlaceId) || LOCATIONS[0];
    const dropoffLoc = LOCATIONS.find(l => l.code === request.dropoffPlaceId) || LOCATIONS[0];

    return vehicles.map((vehicle: any): CarSearchResult => {
      const images = vehicle.images && Array.isArray(vehicle.images) && vehicle.images.length > 0
        ? vehicle.images
        : vehicle.thumbnail_url
          ? [vehicle.thumbnail_url]
          : ['https://images.unsplash.com/photo-1550355291-bbee04a92027?w=400'];

      // 연료 타입 매핑
      const fuelMap: Record<string, string> = {
        gasoline: 'Gasoline',
        diesel: 'Diesel',
        electric: 'Electric',
        hybrid: 'Hybrid'
      };

      // 변속기 매핑
      const transmissionMap: Record<string, string> = {
        automatic: 'Automatic',
        manual: 'Manual'
      };

      // MVP API에서 제공하는 pricing 정보 사용 (시간 기반 계산 포함)
      const pricing = vehicle.pricing || {};
      const baseAmount = pricing.base_amount || 0;
      const depositAmount = pricing.deposit_amount || 0;

      return {
        supplierId: `vendor_${vehicle.vendor_id}`,
        supplierName: vehicle.vendor?.business_name || '신안렌트카',
        vehicle: {
          acriss: vehicle.vehicle_code || 'ECMR',
          make: vehicle.brand || '현대',
          model: vehicle.model || vehicle.display_name,
          transmission: transmissionMap[vehicle.transmission] || 'Automatic',
          fuel: fuelMap[vehicle.fuel_type] || 'Gasoline',
          seats: vehicle.seating_capacity || 5,
          doors: vehicle.door_count || 4,
          luggage: {
            large: vehicle.large_bags || 2,
            small: vehicle.small_bags || 1
          },
          airConditioning: true,
          images: images,
          features: vehicle.features || []
        },
        price: {
          base: baseAmount,
          taxes: 0, // 세금 별도 계산 없음 (baseAmount에 포함)
          fees: [],
          total: baseAmount,
          currency: 'KRW',
          paymentType: 'PREPAID'
        },
        location: {
          pickup: {
            code: pickupLoc.code,
            type: 'AIRPORT',
            name: pickupLoc.name,
            lat: pickupLoc.lat,
            lng: pickupLoc.lng,
            openHours: '08:00',
            closeHours: '22:00'
          },
          dropoff: {
            code: dropoffLoc.code,
            type: 'AIRPORT',
            name: dropoffLoc.name,
            lat: dropoffLoc.lat,
            lng: dropoffLoc.lng
          }
        },
        policies: {
          mileage: vehicle.unlimited_mileage ? 'UNLIMITED' : `${vehicle.mileage_limit_per_day || 100}km/day`,
          fuel: 'FULL_TO_FULL',
          insurance: {
            cdw: true,
            scdw: false,
            tp: true,
            pai: false,
            excess: 300000,
            deposit: depositAmount
          },
          cancellation: {
            free: true,
            freeUntil: format(new Date(Date.now() + 86400000 * 3), "yyyy-MM-dd'T'HH:mm:ssXXX") // 3일 전까지 무료 취소
          },
          amendment: {
            allowed: true,
            fee: 10000
          },
          minDriverAge: vehicle.age_requirement || 21,
          youngDriverFee: 15000
        },
        extras: [
          { code: 'GPS', name: '내비게이션', price: 5000, per: 'DAY' },
          { code: 'CHILD_SEAT', name: '카시트', price: 8000, per: 'DAY' }
        ],
        rateKey: `rental_${vehicle.vehicle_id}_${Date.now()}`, // vehicle_id 사용
        expiresAt: format(new Date(Date.now() + 900000), "yyyy-MM-dd'T'HH:mm:ssXXX") // 15분 후
      };
    });
  } catch (error) {
    console.error('Failed to search rentcars:', error);
    return [];
  }
}

// 픽업 위치 옵션
const LOCATIONS = [
  { code: 'CJU', name: '제주국제공항', lat: 33.5066, lng: 126.4933 },
  { code: 'GMP', name: '김포국제공항', lat: 37.5583, lng: 126.7906 },
  { code: 'ICN', name: '인천국제공항', lat: 37.4602, lng: 126.4407 },
  { code: 'PUS', name: '김해국제공항', lat: 35.1795, lng: 128.9382 },
  { code: 'SINAN', name: '신안군청', lat: 34.8262, lng: 126.1064 },
];

export function RentcarSearchPage({ selectedCurrency = 'KRW' }: RentcarSearchPageProps) {
  const navigate = useNavigate();

  // 검색 폼 상태
  const [pickupLocation, setPickupLocation] = useState('CJU');
  const [dropoffLocation, setDropoffLocation] = useState('CJU');
  const [sameLocation, setSameLocation] = useState(true);
  const [pickupDate, setPickupDate] = useState<Date>();
  const [dropoffDate, setDropoffDate] = useState<Date>();
  const [pickupTime, setPickupTime] = useState('10:00');
  const [dropoffTime, setDropoffTime] = useState('10:00');
  const [driverAge, setDriverAge] = useState('26');

  // 검색 결과 상태
  const [results, setResults] = useState<CarSearchResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<CarSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // 필터 상태
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransmission, setSelectedTransmission] = useState<string>('all');
  const [selectedFuel, setSelectedFuel] = useState<string>('all');
  const [selectedSeats, setSelectedSeats] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [sortBy, setSortBy] = useState<'price' | 'rating'>('price');

  // 지도 상태
  const [showMap, setShowMap] = useState(true);
  const [mapCenter, setMapCenter] = useState({ lat: 33.5066, lng: 126.4933 });

  // 픽업 위치 변경 시 지도 중심 업데이트
  useEffect(() => {
    const location = LOCATIONS.find(loc => loc.code === pickupLocation);
    if (location) {
      setMapCenter({ lat: location.lat, lng: location.lng });
    }
  }, [pickupLocation]);

  // 필터링 적용
  useEffect(() => {
    let filtered = [...results];

    // 변속기 필터
    if (selectedTransmission !== 'all') {
      filtered = filtered.filter(car =>
        selectedTransmission === 'auto'
          ? car.vehicle.transmission === 'Automatic'
          : car.vehicle.transmission === 'Manual'
      );
    }

    // 연료 필터
    if (selectedFuel !== 'all') {
      filtered = filtered.filter(car =>
        car.vehicle.fuel.toLowerCase() === selectedFuel.toLowerCase()
      );
    }

    // 좌석 수 필터
    if (selectedSeats !== 'all') {
      const seats = parseInt(selectedSeats);
      filtered = filtered.filter(car => car.vehicle.seats >= seats);
    }

    // 가격 필터
    filtered = filtered.filter(car =>
      car.price.total >= priceRange[0] && car.price.total <= priceRange[1]
    );

    // 정렬
    filtered.sort((a, b) => {
      if (sortBy === 'price') {
        return a.price.total - b.price.total;
      } else {
        // Since we don't have rating in CarSearchResult, just keep order
        return 0;
      }
    });

    setFilteredResults(filtered);
  }, [results, selectedTransmission, selectedFuel, selectedSeats, priceRange, sortBy]);

  // 검색 실행
  const handleSearch = async () => {
    // 유효성 검사
    if (!pickupLocation) {
      toast.error('픽업 위치를 선택해주세요');
      return;
    }
    if (!pickupDate || !dropoffDate) {
      toast.error('날짜를 선택해주세요');
      return;
    }
    if (pickupDate >= dropoffDate) {
      toast.error('반납일은 픽업일 이후여야 합니다');
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const request: CarSearchRequest = {
        pickupPlaceId: pickupLocation,
        dropoffPlaceId: sameLocation ? pickupLocation : dropoffLocation,
        pickupAt: `${format(pickupDate, 'yyyy-MM-dd')}T${pickupTime}:00+09:00`,
        dropoffAt: `${format(dropoffDate, 'yyyy-MM-dd')}T${dropoffTime}:00+09:00`,
        driverAge: parseInt(driverAge),
        residentCountry: 'KR',
        currency: selectedCurrency
      };

      console.log('🚗 렌트카 검색 요청:', request);

      const results = await searchCarsAPI(request);
      setResults(results);

      if (results.length === 0) {
        toast.info('검색 결과가 없습니다. 다른 조건으로 시도해보세요.');
      } else {
        toast.success(`${results.length}개의 차량을 찾았습니다`);
      }
    } catch (err) {
      console.error('렌트카 검색 오류:', err);
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다');
      toast.error('검색에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 차량 예약 (검색 정보를 DetailPage로 전달)
  const handleBook = (car: CarSearchResult) => {
    // Extract vehicle ID from rateKey (format: rental_123_timestamp)
    const vehicleId = car.rateKey.split('_')[1];

    // 검색한 날짜/시간 정보를 query params로 전달
    const params = new URLSearchParams({
      category: 'rentcar',
      vehicleId: vehicleId,
      pickupDate: pickupDate ? format(pickupDate, 'yyyy-MM-dd') : '',
      dropoffDate: dropoffDate ? format(dropoffDate, 'yyyy-MM-dd') : '',
      pickupTime: pickupTime,
      dropoffTime: dropoffTime,
      pickupLocation: pickupLocation,
      dropoffLocation: sameLocation ? pickupLocation : dropoffLocation
    });

    // listing_id가 있으면 DetailPage로, 없으면 렌트카 전용 페이지로
    navigate(`/detail/${vehicleId}?${params.toString()}`);
  };

  // 필터 초기화
  const resetFilters = () => {
    setSelectedTransmission('all');
    setSelectedFuel('all');
    setSelectedSeats('all');
    setPriceRange([0, 500000]);
    setSortBy('price');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 + 검색 폼 */}
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">렌트카 검색</h1>
        </div>

        {/* 검색 박스 */}
        <div className="bg-white rounded-lg p-4 md:p-6 mb-6 md:mb-8 shadow-sm">
          <div className="flex flex-wrap gap-3">
            {/* 픽업 위치 */}
            <div className="flex-1 min-w-[150px]">
              <Label className="text-sm font-medium mb-1 block">픽업 장소</Label>
              <Select value={pickupLocation} onValueChange={setPickupLocation}>
                <SelectTrigger className="h-12">
                  <MapPin className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map(loc => (
                    <SelectItem key={loc.code} value={loc.code}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 픽업 날짜 */}
            <div className="flex-1 min-w-[180px]">
              <Label className="text-sm font-medium mb-1 block">픽업일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start h-12">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {pickupDate ? format(pickupDate, 'yyyy-MM-dd', { locale: ko }) : '날짜 선택'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <Calendar
                    mode="single"
                    selected={pickupDate}
                    onSelect={setPickupDate}
                    locale={ko}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* 반납 날짜 */}
            <div className="flex-1 min-w-[180px]">
              <Label className="text-sm font-medium mb-1 block">반납일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start h-12">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dropoffDate ? format(dropoffDate, 'yyyy-MM-dd', { locale: ko }) : '날짜 선택'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent>
                  <Calendar
                    mode="single"
                    selected={dropoffDate}
                    onSelect={setDropoffDate}
                    locale={ko}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* 검색 버튼 */}
            <div className="flex items-end">
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="px-8 h-12 bg-[#8B5FBF] hover:bg-[#7A4FB5]"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-2">검색</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠: 좌우 분할 (쏘카 스타일) */}
      {searched && (
        <div className="flex h-[calc(100vh-180px)]">
          {/* 왼쪽: 검색 결과 */}
          <div className={`${showMap ? 'w-1/2' : 'w-full'} overflow-y-auto transition-all duration-300`}>
            <div className="p-4 space-y-4">
              {/* 결과 헤더 + 필터/정렬 */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {filteredResults.length}대 찾음
                  </h2>
                  <p className="text-sm text-gray-600">
                    {pickupDate && format(pickupDate, 'MM.dd')} ~ {dropoffDate && format(dropoffDate, 'MM.dd')}
                  </p>
                </div>

                <div className="flex gap-2">
                  {/* 지도 토글 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMap(!showMap)}
                  >
                    <MapIcon className="h-4 w-4 mr-2" />
                    {showMap ? '지도 숨기기' : '지도 보기'}
                  </Button>

                  {/* 필터 버튼 */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    필터
                    {showFilters ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                  </Button>

                  {/* 정렬 */}
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price">낮은 가격순</SelectItem>
                      <SelectItem value="rating">높은 평점순</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 필터 패널 */}
              {showFilters && (
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* 변속기 */}
                      <div>
                        <Label className="text-xs text-gray-600 mb-2 block">변속기</Label>
                        <Select value={selectedTransmission} onValueChange={setSelectedTransmission}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">전체</SelectItem>
                            <SelectItem value="auto">자동</SelectItem>
                            <SelectItem value="manual">수동</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 연료 */}
                      <div>
                        <Label className="text-xs text-gray-600 mb-2 block">연료</Label>
                        <Select value={selectedFuel} onValueChange={setSelectedFuel}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">전체</SelectItem>
                            <SelectItem value="gasoline">휘발유</SelectItem>
                            <SelectItem value="diesel">디젤</SelectItem>
                            <SelectItem value="hybrid">하이브리드</SelectItem>
                            <SelectItem value="electric">전기</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 좌석 수 */}
                      <div>
                        <Label className="text-xs text-gray-600 mb-2 block">좌석 수</Label>
                        <Select value={selectedSeats} onValueChange={setSelectedSeats}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">전체</SelectItem>
                            <SelectItem value="4">4인승 이상</SelectItem>
                            <SelectItem value="5">5인승 이상</SelectItem>
                            <SelectItem value="7">7인승 이상</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 초기화 버튼 */}
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetFilters}
                          className="w-full"
                        >
                          초기화
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 로딩 상태 */}
              {loading && (
                <div className="text-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
                  <p className="text-gray-600">차량을 검색하는 중입니다...</p>
                </div>
              )}

              {/* 차량 목록 (쏘카 스타일 카드) */}
              {!loading && filteredResults.length > 0 && (
                <div className="space-y-3">
                  {filteredResults.map((car) => (
                    <Card
                      key={car.rateKey}
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleBook(car)}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {/* 차량 이미지 */}
                          <img
                            src={car.vehicle.images[0] || 'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=400'}
                            alt={car.vehicle.model}
                            className="w-32 h-24 object-cover rounded-lg"
                          />

                          {/* 차량 정보 */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-lg">{car.vehicle.model}</h3>
                                <p className="text-sm text-gray-600">{car.supplierName}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-blue-600">
                                  ₩{car.price.total.toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-600">/일</p>
                              </div>
                            </div>

                            {/* 차량 상세 */}
                            <div className="flex gap-4 text-sm text-gray-600 mb-2">
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {car.vehicle.seats}인승
                              </span>
                              <span className="flex items-center gap-1">
                                <Settings className="h-4 w-4" />
                                {car.vehicle.transmission === 'Automatic' ? '자동' : '수동'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Fuel className="h-4 w-4" />
                                {car.vehicle.fuel === 'Gasoline' ? '휘발유' : car.vehicle.fuel === 'Diesel' ? '디젤' : car.vehicle.fuel === 'Hybrid' ? '하이브리드' : '전기'}
                              </span>
                            </div>

                            {/* 특징 */}
                            <div className="flex gap-2 flex-wrap">
                              {car.vehicle.features?.map((feature: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* 결과 없음 */}
              {!loading && filteredResults.length === 0 && results.length > 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">필터 조건에 맞는 차량이 없습니다</h3>
                    <p className="text-gray-600 mb-4">필터를 조정해보세요</p>
                    <Button variant="outline" onClick={resetFilters}>
                      필터 초기화
                    </Button>
                  </CardContent>
                </Card>
              )}

              {!loading && results.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">검색 결과가 없습니다</h3>
                    <p className="text-gray-600">다른 날짜나 위치로 다시 검색해보세요</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* 오른쪽: 지도 */}
          {showMap && (
            <div className="w-1/2 bg-gray-200 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Google Maps Placeholder */}
                <div className="text-center">
                  <MapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">픽업 위치: {LOCATIONS.find(l => l.code === pickupLocation)?.name}</p>
                  <p className="text-sm text-gray-500">
                    위도: {mapCenter.lat.toFixed(4)}, 경도: {mapCenter.lng.toFixed(4)}
                  </p>
                  <p className="text-xs text-gray-400 mt-4">
                    Google Maps API 키를 설정하면 실제 지도가 표시됩니다
                  </p>
                </div>

                {/* TODO: Google Maps 실제 구현 */}
                {/*
                <GoogleMap
                  center={mapCenter}
                  zoom={14}
                  markers={[{ position: mapCenter, title: '픽업 위치' }]}
                />
                */}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 초기 화면 (검색 전) */}
      {!searched && (
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <Car className="h-24 w-24 text-blue-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">렌트카를 검색해보세요</h2>
          <p className="text-gray-600 mb-8">
            원하는 날짜와 위치를 선택하고 검색 버튼을 눌러주세요
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <Card>
              <CardContent className="p-6">
                <MapPin className="h-8 w-8 text-blue-500 mb-3" />
                <h3 className="font-semibold mb-2">다양한 픽업 위치</h3>
                <p className="text-sm text-gray-600">공항, 시내 등 편리한 위치에서 픽업</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Users className="h-8 w-8 text-green-500 mb-3" />
                <h3 className="font-semibold mb-2">다양한 차종</h3>
                <p className="text-sm text-gray-600">경차부터 SUV까지 원하는 차량 선택</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Settings className="h-8 w-8 text-purple-500 mb-3" />
                <h3 className="font-semibold mb-2">실시간 예약</h3>
                <p className="text-sm text-gray-600">즉시 확인되는 빠른 예약</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

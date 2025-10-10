/**
 * 렌트카 검색 페이지
 * 실시간 API 검색 및 결과 표시
 */

import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Badge } from './ui/badge';
import { RentcarCard } from './cards/RentcarCard';
import { Calendar as CalendarIcon, Clock, MapPin, Search, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { CarSearchRequest, CarSearchResult } from '../utils/rentcar/types';
import { toast } from 'sonner';

interface RentcarSearchPageProps {
  selectedCurrency?: string;
}

// Mock 검색 함수 (실제로는 utils/rentcar/api.ts의 searchCars 사용)
async function searchCarsAPI(request: CarSearchRequest): Promise<CarSearchResult[]> {
  // 실제 구현:
  // import { searchCars } from '../utils/rentcar/api';
  // return await searchCars(request);

  // Mock 데이터 반환 (개발용)
  await new Promise(resolve => setTimeout(resolve, 1500));
  return [];
}

export function RentcarSearchPage({ selectedCurrency = 'KRW' }: RentcarSearchPageProps) {
  // 검색 폼 상태
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [sameLocation, setSameLocation] = useState(true);
  const [pickupDate, setPickupDate] = useState<Date>();
  const [dropoffDate, setDropoffDate] = useState<Date>();
  const [pickupTime, setPickupTime] = useState('10:00');
  const [dropoffTime, setDropoffTime] = useState('10:00');
  const [driverAge, setDriverAge] = useState('26');

  // 검색 결과 상태
  const [results, setResults] = useState<CarSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // 상세 보기 모달 (추후 구현)
  const [selectedCar, setSelectedCar] = useState<CarSearchResult | null>(null);

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

  // 예약 처리
  const handleBook = (rateKey: string) => {
    console.log('예약 시작:', rateKey);
    toast.info('예약 페이지로 이동합니다...');
    // TODO: 예약 페이지로 이동 또는 모달 표시
  };

  // 상세 보기
  const handleShowDetails = (car: CarSearchResult) => {
    setSelectedCar(car);
    // TODO: 상세 모달 표시
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 페이지 헤더 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">렌트카 검색</h1>
          <p className="text-gray-600">원하는 차량을 실시간으로 검색하고 예약하세요</p>
        </div>

        {/* 검색 폼 */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 픽업 위치 */}
              <div className="space-y-2">
                <Label htmlFor="pickup-location">픽업 위치</Label>
                <Select value={pickupLocation} onValueChange={setPickupLocation}>
                  <SelectTrigger id="pickup-location">
                    <SelectValue placeholder="위치 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CJU">제주국제공항</SelectItem>
                    <SelectItem value="GMP">김포국제공항</SelectItem>
                    <SelectItem value="ICN">인천국제공항</SelectItem>
                    <SelectItem value="PUS">김해국제공항</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 반납 위치 */}
              <div className="space-y-2">
                <Label htmlFor="dropoff-location">반납 위치</Label>
                <Select
                  value={sameLocation ? pickupLocation : dropoffLocation}
                  onValueChange={(value) => {
                    setSameLocation(false);
                    setDropoffLocation(value);
                  }}
                  disabled={sameLocation}
                >
                  <SelectTrigger id="dropoff-location">
                    <SelectValue placeholder="위치 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CJU">제주국제공항</SelectItem>
                    <SelectItem value="GMP">김포국제공항</SelectItem>
                    <SelectItem value="ICN">인천국제공항</SelectItem>
                    <SelectItem value="PUS">김해국제공항</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="same-location"
                    checked={sameLocation}
                    onChange={(e) => setSameLocation(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="same-location" className="text-sm text-gray-600 cursor-pointer">
                    픽업 위치와 동일
                  </label>
                </div>
              </div>

              {/* 픽업 날짜 */}
              <div className="space-y-2">
                <Label>픽업 날짜 및 시간</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {pickupDate ? format(pickupDate, 'PPP', { locale: ko }) : '날짜 선택'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={pickupDate}
                      onSelect={setPickupDate}
                      locale={ko}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
                <Select value={pickupTime} onValueChange={setPickupTime}>
                  <SelectTrigger>
                    <Clock className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      return (
                        <SelectItem key={hour} value={`${hour}:00`}>
                          {hour}:00
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* 반납 날짜 */}
              <div className="space-y-2">
                <Label>반납 날짜 및 시간</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dropoffDate ? format(dropoffDate, 'PPP', { locale: ko }) : '날짜 선택'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dropoffDate}
                      onSelect={setDropoffDate}
                      locale={ko}
                      disabled={(date) => date < (pickupDate || new Date())}
                    />
                  </PopoverContent>
                </Popover>
                <Select value={dropoffTime} onValueChange={setDropoffTime}>
                  <SelectTrigger>
                    <Clock className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      return (
                        <SelectItem key={hour} value={`${hour}:00`}>
                          {hour}:00
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* 운전자 나이 */}
              <div className="space-y-2">
                <Label htmlFor="driver-age">운전자 나이</Label>
                <Select value={driverAge} onValueChange={setDriverAge}>
                  <SelectTrigger id="driver-age">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="21">21-25세</SelectItem>
                    <SelectItem value="26">26-65세</SelectItem>
                    <SelectItem value="66">66세 이상</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 검색 버튼 */}
            <div className="mt-6">
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="w-full md:w-auto px-8 h-12 text-base"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    검색 중...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-5 w-5" />
                    차량 검색
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 검색 결과 */}
        {searched && (
          <div>
            {/* 결과 헤더 */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  검색 결과 {results.length > 0 && `(${results.length}대)`}
                </h2>
                {results.length > 0 && (
                  <p className="text-sm text-gray-600">
                    {pickupDate && format(pickupDate, 'yyyy.MM.dd')} ~ {dropoffDate && format(dropoffDate, 'yyyy.MM.dd')}
                  </p>
                )}
              </div>
            </div>

            {/* 로딩 상태 */}
            {loading && (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
                <p className="text-gray-600">차량을 검색하는 중입니다...</p>
              </div>
            )}

            {/* 오류 상태 */}
            {error && !loading && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6 text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-red-900 mb-2">검색 실패</h3>
                  <p className="text-red-700 mb-4">{error}</p>
                  <Button onClick={handleSearch} variant="outline">
                    다시 시도
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* 결과 목록 */}
            {!loading && !error && results.length > 0 && (
              <div className="space-y-4">
                {results.map((car) => (
                  <RentcarCard
                    key={car.rateKey}
                    car={car}
                    onBook={handleBook}
                    onShowDetails={handleShowDetails}
                  />
                ))}
              </div>
            )}

            {/* 결과 없음 */}
            {!loading && !error && results.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    검색 결과가 없습니다
                  </h3>
                  <p className="text-gray-600 mb-6">
                    다른 날짜나 위치로 다시 검색해보세요.
                  </p>
                  <Button onClick={() => setSearched(false)} variant="outline">
                    검색 조건 변경
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 안내 정보 */}
        {!searched && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <MapPin className="h-8 w-8 text-blue-500 mb-3" />
                <h3 className="font-semibold mb-2">다양한 픽업 위치</h3>
                <p className="text-sm text-gray-600">
                  공항, 시내 등 원하는 위치에서 차량을 픽업하세요
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Search className="h-8 w-8 text-blue-500 mb-3" />
                <h3 className="font-semibold mb-2">실시간 가격 비교</h3>
                <p className="text-sm text-gray-600">
                  여러 렌트카 업체의 가격을 한눈에 비교하세요
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <CalendarIcon className="h-8 w-8 text-blue-500 mb-3" />
                <h3 className="font-semibold mb-2">무료 취소 가능</h3>
                <p className="text-sm text-gray-600">
                  대부분의 예약은 무료로 취소할 수 있습니다
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

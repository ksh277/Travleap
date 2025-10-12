'use client';

/**
 * 렌트카 검색 페이지
 * - 날짜/위치/차량 옵션 필터링
 * - 실시간 검색 결과
 * - 정렬 및 필터 옵션
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RentcarCard } from '@/components/cards/RentcarCard';
import { Search, MapPin, Calendar, Users, Filter, X, Loader2 } from 'lucide-react';
import type { CarSearchResult } from '@/utils/rentcar/types';

interface SearchFilters {
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  dropoffDate: string;
  pickupTime: string;
  dropoffTime: string;
  // Filters
  vehicleTypes: string[];
  transmission: string;
  fuelType: string;
  seats: number[];
  priceRange: [number, number];
  mileageType: string;
  airConditioning: boolean;
  // Sort
  sortBy: 'price' | 'rating' | 'popular';
}

export default function RentcarSearchPage() {
  const [filters, setFilters] = useState<SearchFilters>({
    pickupLocation: '',
    dropoffLocation: '',
    pickupDate: '',
    dropoffDate: '',
    pickupTime: '10:00',
    dropoffTime: '10:00',
    vehicleTypes: [],
    transmission: 'all',
    fuelType: 'all',
    seats: [],
    priceRange: [0, 500000],
    mileageType: 'all',
    airConditioning: false,
    sortBy: 'price',
  });

  const [results, setResults] = useState<CarSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  // 검색 실행
  const handleSearch = async () => {
    if (!filters.pickupDate || !filters.dropoffDate || !filters.pickupLocation) {
      alert('픽업 날짜, 반납 날짜, 픽업 위치를 모두 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: API 호출로 대체
      // const response = await fetch('/api/rentcar/search', {
      //   method: 'POST',
      //   body: JSON.stringify(filters)
      // });
      // const data = await response.json();

      // Mock data for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      setResults(generateMockResults());
      setTotalResults(15);
    } catch (error) {
      console.error('Search error:', error);
      alert('검색 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 필터 초기화
  const resetFilters = () => {
    setFilters({
      ...filters,
      vehicleTypes: [],
      transmission: 'all',
      fuelType: 'all',
      seats: [],
      priceRange: [0, 500000],
      mileageType: 'all',
      airConditioning: false,
    });
  };

  // 차량 타입 토글
  const toggleVehicleType = (type: string) => {
    setFilters(prev => ({
      ...prev,
      vehicleTypes: prev.vehicleTypes.includes(type)
        ? prev.vehicleTypes.filter(t => t !== type)
        : [...prev.vehicleTypes, type]
    }));
  };

  // 좌석 수 토글
  const toggleSeats = (count: number) => {
    setFilters(prev => ({
      ...prev,
      seats: prev.seats.includes(count)
        ? prev.seats.filter(s => s !== count)
        : [...prev.seats, count]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 검색 헤더 */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold mb-4">렌트카 검색</h1>

          {/* 검색 폼 */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 픽업 위치 */}
                <div>
                  <Label>픽업 위치</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="도시 또는 공항"
                      value={filters.pickupLocation}
                      onChange={(e) => setFilters({ ...filters, pickupLocation: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* 반납 위치 */}
                <div>
                  <Label>반납 위치</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="픽업 위치와 동일"
                      value={filters.dropoffLocation}
                      onChange={(e) => setFilters({ ...filters, dropoffLocation: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* 픽업 날짜/시간 */}
                <div>
                  <Label>픽업 날짜</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={filters.pickupDate}
                      onChange={(e) => setFilters({ ...filters, pickupDate: e.target.value })}
                    />
                    <Input
                      type="time"
                      value={filters.pickupTime}
                      onChange={(e) => setFilters({ ...filters, pickupTime: e.target.value })}
                      className="w-24"
                    />
                  </div>
                </div>

                {/* 반납 날짜/시간 */}
                <div>
                  <Label>반납 날짜</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={filters.dropoffDate}
                      onChange={(e) => setFilters({ ...filters, dropoffDate: e.target.value })}
                    />
                    <Input
                      type="time"
                      value={filters.dropoffTime}
                      onChange={(e) => setFilters({ ...filters, dropoffTime: e.target.value })}
                      className="w-24"
                    />
                  </div>
                </div>
              </div>

              {/* 검색 버튼 */}
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  필터 {filters.vehicleTypes.length + filters.seats.length > 0 &&
                    `(${filters.vehicleTypes.length + filters.seats.length})`}
                </Button>
                <Button size="lg" onClick={handleSearch} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      검색 중...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      검색
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* 사이드바 필터 */}
          {isFilterOpen && (
            <aside className="w-64 flex-shrink-0">
              <Card className="sticky top-32">
                <CardContent className="p-4 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">필터</h3>
                    <Button variant="ghost" size="sm" onClick={resetFilters}>
                      초기화
                    </Button>
                  </div>

                  {/* 차량 타입 */}
                  <div>
                    <Label className="mb-2 block">차량 타입</Label>
                    <div className="space-y-2">
                      {['경차', '소형', '중형', '대형', 'SUV', '승합'].map(type => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={filters.vehicleTypes.includes(type)}
                            onCheckedChange={() => toggleVehicleType(type)}
                          />
                          <span className="text-sm">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 좌석 수 */}
                  <div>
                    <Label className="mb-2 block">좌석 수</Label>
                    <div className="flex flex-wrap gap-2">
                      {[2, 4, 5, 7, 9].map(count => (
                        <Badge
                          key={count}
                          variant={filters.seats.includes(count) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleSeats(count)}
                        >
                          {count}인승
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* 변속기 */}
                  <div>
                    <Label className="mb-2 block">변속기</Label>
                    <Select
                      value={filters.transmission}
                      onValueChange={(value) => setFilters({ ...filters, transmission: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="automatic">자동</SelectItem>
                        <SelectItem value="manual">수동</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 연료 타입 */}
                  <div>
                    <Label className="mb-2 block">연료</Label>
                    <Select
                      value={filters.fuelType}
                      onValueChange={(value) => setFilters({ ...filters, fuelType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="gasoline">휘발유</SelectItem>
                        <SelectItem value="diesel">경유</SelectItem>
                        <SelectItem value="hybrid">하이브리드</SelectItem>
                        <SelectItem value="electric">전기</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 주행거리 */}
                  <div>
                    <Label className="mb-2 block">주행거리</Label>
                    <Select
                      value={filters.mileageType}
                      onValueChange={(value) => setFilters({ ...filters, mileageType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="unlimited">무제한</SelectItem>
                        <SelectItem value="limited">제한</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 가격 범위 */}
                  <div>
                    <Label className="mb-2 block">
                      가격 (₩{filters.priceRange[0].toLocaleString()} - ₩{filters.priceRange[1].toLocaleString()})
                    </Label>
                    <Slider
                      value={filters.priceRange}
                      onValueChange={(value) => setFilters({ ...filters, priceRange: value as [number, number] })}
                      min={0}
                      max={500000}
                      step={10000}
                      className="mt-2"
                    />
                  </div>

                  {/* 에어컨 */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filters.airConditioning}
                      onCheckedChange={(checked) => setFilters({ ...filters, airConditioning: !!checked })}
                    />
                    <span className="text-sm">에어컨 필수</span>
                  </label>
                </CardContent>
              </Card>
            </aside>
          )}

          {/* 검색 결과 */}
          <main className="flex-1">
            {/* 결과 헤더 */}
            {results.length > 0 && (
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-semibold">검색 결과 {totalResults}건</h2>
                  <p className="text-sm text-gray-600">
                    {filters.pickupDate} ~ {filters.dropoffDate}
                  </p>
                </div>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) => setFilters({ ...filters, sortBy: value as any })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price">가격 낮은순</SelectItem>
                    <SelectItem value="rating">평점 높은순</SelectItem>
                    <SelectItem value="popular">인기순</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 로딩 */}
            {isLoading && (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            )}

            {/* 결과 없음 */}
            {!isLoading && results.length === 0 && (
              <Card>
                <CardContent className="py-20 text-center">
                  <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">검색 조건에 맞는 차량이 없습니다.</p>
                  <p className="text-sm text-gray-500 mt-2">
                    필터를 조정하거나 날짜를 변경해보세요.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 검색 결과 리스트 */}
            <div className="space-y-4">
              {results.map((car) => (
                <RentcarCard
                  key={car.rateKey}
                  car={car}
                  onBook={(rateKey) => {
                    // TODO: 예약 프로세스로 이동
                    console.log('Book:', rateKey);
                  }}
                  onShowDetails={(car) => {
                    // TODO: 상세 모달 열기
                    console.log('Details:', car);
                  }}
                />
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// Mock 데이터 생성 함수
function generateMockResults(): CarSearchResult[] {
  const makes = ['현대', '기아', '쉐보레', '르노삼성', '쌍용'];
  const models = ['아반떼', '쏘나타', 'K3', 'K5', '말리부', 'SM6', '티볼리'];
  const transmissions = ['Automatic', 'Manual'] as const;
  const fuels = ['Gasoline', 'Diesel', 'Hybrid', 'Electric'] as const;

  return Array.from({ length: 5 }, (_, i) => ({
    rateKey: `RATE_${Date.now()}_${i}`,
    vehicle: {
      code: `VEH_${i}`,
      category: 'COMPACT',
      make: makes[Math.floor(Math.random() * makes.length)],
      model: models[Math.floor(Math.random() * models.length)],
      year: 2023,
      seats: [4, 5, 7][Math.floor(Math.random() * 3)],
      luggage: { large: 2, small: 1 },
      transmission: transmissions[Math.floor(Math.random() * 2)],
      fuel: fuels[Math.floor(Math.random() * 4)],
      airConditioning: true,
      images: ['https://images.unsplash.com/photo-1549317661-bd32c8ce0db2'],
    },
    price: {
      base: 50000 + Math.floor(Math.random() * 150000),
      taxes: 10000,
      fees: [{ name: '공항세', amount: 5000 }],
      total: 65000 + Math.floor(Math.random() * 150000),
      currency: 'KRW',
      paymentType: Math.random() > 0.5 ? 'PREPAID' : 'PAY_AT_LOCATION',
      depositRequired: Math.random() > 0.5 ? 300000 : null,
    },
    policies: {
      mileage: Math.random() > 0.5 ? 'UNLIMITED' : 'LIMITED',
      fuel: 'FULL_TO_FULL',
      cancellation: {
        free: Math.random() > 0.3,
        deadline: '2024-01-01T00:00:00Z',
        fee: 10000,
      },
      insurance: {
        included: true,
        type: 'CDW',
        excess: 300000,
        deposit: 500000,
      },
    },
    extras: [
      { code: 'GPS', name: 'GPS 내비게이션', price: 10000, required: false },
      { code: 'CHILD_SEAT', name: '어린이 카시트', price: 15000, required: false },
    ],
    vendor: {
      id: i + 1,
      code: `VENDOR_${i}`,
      name: `렌트카 업체 ${i + 1}`,
      rating: 4.0 + Math.random(),
    },
    location: {
      pickup: { name: '인천공항', address: '인천광역시 중구 공항로', lat: 37.4563, lng: 126.4414 },
      dropoff: { name: '인천공항', address: '인천광역시 중구 공항로', lat: 37.4563, lng: 126.4414 },
    },
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  }));
}

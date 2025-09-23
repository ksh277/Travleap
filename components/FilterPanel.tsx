import React from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon, Users, MapPin, Star } from 'lucide-react';

interface FilterPanelProps {
  onFilterChange: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

export interface FilterOptions {
  category?: string;
  location?: string;
  dateFrom?: Date;
  dateTo?: Date;
  guestCount?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: string;
}

export function FilterPanel({ onFilterChange, currentFilters }: FilterPanelProps) {
  const handleFilterUpdate = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...currentFilters, [key]: value };
    onFilterChange(newFilters);
  };

  const formatDate = (date: Date | undefined) => {
    return date ? date.toLocaleDateString('ko-KR') : '날짜 선택';
  };

  const locations = [
    '전체 지역',
    '증도면',
    '자은도',
    '흑산면',
    '도초도',
    '임자도',
    '신의도',
    '안좌도',
    '팔금도',
    '암태도'
  ];

  const categories = [
    { value: 'all', label: '전체' },
    { value: 'tour', label: '여행상품' },
    { value: 'accommodation', label: '숙박' },
    { value: 'food', label: '음식점' },
    { value: 'rentcar', label: '렌터카' },
    { value: 'package', label: '패키지' },
    { value: 'event', label: '행사' },
    { value: 'attraction', label: '관광지' },
    { value: 'experience', label: '체험' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
      <h3 className="font-semibold text-lg mb-4">상세 필터</h3>

      {/* 카테고리 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">카테고리</label>
        <Select
          value={currentFilters.category || 'all'}
          onValueChange={(value) => handleFilterUpdate('category', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="카테고리 선택" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 지역 */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          지역
        </label>
        <Select
          value={currentFilters.location || '전체 지역'}
          onValueChange={(value) => handleFilterUpdate('location', value === '전체 지역' ? undefined : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="지역 선택" />
          </SelectTrigger>
          <SelectContent>
            {locations.map(location => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 날짜 범위 */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-1">
          <CalendarIcon className="h-4 w-4" />
          날짜
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDate(currentFilters.dateFrom)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={currentFilters.dateFrom}
                onSelect={(date) => handleFilterUpdate('dateFrom', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDate(currentFilters.dateTo)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={currentFilters.dateTo}
                onSelect={(date) => handleFilterUpdate('dateTo', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* 인원수 */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-1">
          <Users className="h-4 w-4" />
          인원수
        </label>
        <Select
          value={currentFilters.guestCount?.toString() || '1'}
          onValueChange={(value) => handleFilterUpdate('guestCount', parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="인원 선택" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <SelectItem key={num} value={num.toString()}>
                {num}명
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 가격 범위 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">가격 범위</label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="최소 가격"
            value={currentFilters.minPrice || ''}
            onChange={(e) => handleFilterUpdate('minPrice', parseInt(e.target.value) || undefined)}
          />
          <Input
            type="number"
            placeholder="최대 가격"
            value={currentFilters.maxPrice || ''}
            onChange={(e) => handleFilterUpdate('maxPrice', parseInt(e.target.value) || undefined)}
          />
        </div>
      </div>

      {/* 평점 */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-1">
          <Star className="h-4 w-4" />
          최소 평점
        </label>
        <Select
          value={currentFilters.minRating?.toString() || '0'}
          onValueChange={(value) => handleFilterUpdate('minRating', parseFloat(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="평점 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">전체</SelectItem>
            <SelectItem value="3">⭐ 3점 이상</SelectItem>
            <SelectItem value="4">⭐ 4점 이상</SelectItem>
            <SelectItem value="4.5">⭐ 4.5점 이상</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 정렬 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">정렬 기준</label>
        <Select
          value={currentFilters.sortBy || 'recommended'}
          onValueChange={(value) => handleFilterUpdate('sortBy', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="정렬 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recommended">추천순</SelectItem>
            <SelectItem value="rating">평점순</SelectItem>
            <SelectItem value="price_low">가격 낮은 순</SelectItem>
            <SelectItem value="price_high">가격 높은 순</SelectItem>
            <SelectItem value="newest">최신순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 초기화 버튼 */}
      <Button
        variant="outline"
        className="w-full mt-4"
        onClick={() => onFilterChange({})}
      >
        필터 초기화
      </Button>
    </div>
  );
}
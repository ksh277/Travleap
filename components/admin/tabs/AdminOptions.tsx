/**
 * 관리자 옵션 관리 탭
 *
 * 기능:
 * - 모든 카테고리 상품의 시간대/메뉴/좌석등급 관리
 * - 팝업, 렌트카, 숙박 제외
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import TimeSlotManager from '../../vendor/TimeSlotManager';
import ListingOptionsManager from '../../vendor/ListingOptionsManager';

interface Listing {
  id: number;
  title: string;
  category: string;
  category_id: number;
}

// 옵션 관리가 필요한 카테고리 (팝업, 렌트카, 숙박 제외)
const OPTION_CATEGORIES = [
  { id: 1855, slug: 'tour', name: '여행/투어' },
  { id: 1858, slug: 'food', name: '음식' },
  { id: 1859, slug: 'tourist', name: '관광지' },
  { id: 1861, slug: 'event', name: '행사' },
  { id: 1862, slug: 'experience', name: '체험' },
];

export function AdminOptions() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);

  // 카테고리별 상품 로드
  useEffect(() => {
    if (!selectedCategory) {
      setListings([]);
      return;
    }

    const fetchListings = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/listings?category=${selectedCategory}&limit=100`);
        const result = await response.json();

        if (result.success && result.data) {
          setListings(result.data.map((item: any) => ({
            id: item.id,
            title: item.title,
            category: item.category,
            category_id: item.category_id
          })));
        }
      } catch (error) {
        console.error('Failed to fetch listings:', error);
        toast.error('상품 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [selectedCategory]);

  const getCategoryConfig = () => {
    switch (selectedCategory) {
      case 'food':
        return {
          showTimeSlot: true,
          showMenu: true,
          showSeatClass: false,
          timeSlotLabel: '예약 시간대',
          timeSlotCapacity: 5,
          menuLabel: '메뉴',
        };
      case 'tourist':
      case 'experience':
        return {
          showTimeSlot: true,
          showMenu: false,
          showSeatClass: false,
          timeSlotLabel: '입장/체험 시간대',
          timeSlotCapacity: 20,
        };
      case 'event':
        return {
          showTimeSlot: true,
          showMenu: false,
          showSeatClass: true,
          timeSlotLabel: '공연 시간대',
          timeSlotCapacity: 50,
          seatClassLabel: '좌석 등급',
        };
      case 'tour':
        return {
          showTimeSlot: true,
          showMenu: false,
          showSeatClass: false,
          timeSlotLabel: '투어 시간대',
          timeSlotCapacity: 10,
          showPackage: true,
          packageLabel: '패키지/옵션',
        };
      default:
        return null;
    }
  };

  const config = getCategoryConfig();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>상품 옵션 관리</CardTitle>
          <CardDescription>
            카테고리를 선택하여 해당 상품들의 시간대, 메뉴, 좌석 등급을 관리하세요.
            <br />
            <span className="text-orange-600">* 팝업, 렌트카, 숙박은 별도 시스템으로 관리됩니다.</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <label className="block text-sm font-medium mb-2">카테고리 선택</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="관리할 카테고리를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {OPTION_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </CardContent>
        </Card>
      ) : selectedCategory && config ? (
        <div className="space-y-6">
          {/* 시간대 관리 */}
          {config.showTimeSlot && (
            <TimeSlotManager
              listings={listings.map(l => ({ id: l.id, title: l.title, category: l.category }))}
              categoryLabel={config.timeSlotLabel}
              defaultCapacity={config.timeSlotCapacity}
            />
          )}

          {/* 메뉴 관리 (음식점) */}
          {config.showMenu && (
            <ListingOptionsManager
              listings={listings.map(l => ({ id: l.id, title: l.title, category: l.category }))}
              defaultOptionType="menu"
              categoryLabel={config.menuLabel}
            />
          )}

          {/* 좌석 등급 관리 (행사) */}
          {config.showSeatClass && (
            <ListingOptionsManager
              listings={listings.map(l => ({ id: l.id, title: l.title, category: l.category }))}
              defaultOptionType="seat_class"
              categoryLabel={config.seatClassLabel}
            />
          )}

          {/* 패키지/옵션 관리 (투어) */}
          {config.showPackage && (
            <ListingOptionsManager
              listings={listings.map(l => ({ id: l.id, title: l.title, category: l.category }))}
              defaultOptionType="package"
              categoryLabel={config.packageLabel}
            />
          )}
        </div>
      ) : selectedCategory ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            해당 카테고리에 등록된 상품이 없습니다.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

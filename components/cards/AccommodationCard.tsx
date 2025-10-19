/**
 * 숙박 전용 상품 카드
 * PMS 데이터 (객실 타입, 요금) 표시
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Star, MapPin, Users, Bed, Wifi, Coffee, Heart } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import type { TravelItem } from '../../utils/api';

interface AccommodationCardProps {
  listing: TravelItem;
  selectedCurrency?: string;
  onFavorite?: () => void;
  isFavorite?: boolean;
  onNavigate?: () => void;
}

export function AccommodationCard({
  listing,
  selectedCurrency = 'KRW',
  onFavorite,
  isFavorite,
  onNavigate
}: AccommodationCardProps) {
  const navigate = useNavigate();

  // PMS 데이터가 있는지 확인
  const hasPMSData = listing.amenities && listing.amenities.length > 0;

  // 객실 타입 파싱 (highlights에 저장된 형식: "Deluxe Double - 120,000원 (최대 2명)")
  const roomTypes = listing.highlights?.filter(h => h.includes('원')) || [];
  const minPrice = listing.price_from || 0;
  const maxPrice = listing.price_to || minPrice;

  const handleClick = () => {
    if (onNavigate) {
      onNavigate();
    } else {
      navigate(`/accommodation/${listing.id}`);
    }
  };

  return (
    <Card
      className="group hover:shadow-lg transition-all cursor-pointer overflow-hidden h-[450px] flex flex-col"
      onClick={handleClick}
    >
      <div className="flex flex-col h-full">
        {/* 이미지 */}
        <div className="relative w-full h-52 flex-shrink-0 overflow-hidden">
          <ImageWithFallback
            src={listing.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945'}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

        {/* 우측 상단 뱃지들 */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {listing.partner?.is_verified && (
            <Badge className="bg-blue-500 text-white">인증</Badge>
          )}
          {hasPMSData && (
            <Badge className="bg-green-500 text-white">실시간 예약</Badge>
          )}
        </div>

        {/* 좌측 상단 찜 버튼 */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 left-3 bg-white/80 hover:bg-white"
          onClick={(e) => {
            e.stopPropagation();
            onFavorite?.();
          }}
        >
          <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
        </Button>
        </div>

        {/* 정보 */}
        <CardContent className="p-4 flex flex-col flex-1 justify-between">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <h3 className="font-semibold text-base flex-1 line-clamp-2 min-h-[2.5rem]">{listing.title}</h3>
              {listing.partner?.is_verified && (
                <Badge variant="outline" className="text-xs flex-shrink-0 bg-blue-500 text-white">
                  인증
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-gray-500 flex-shrink-0" />
              <span className="text-xs text-gray-600 line-clamp-1">{listing.location || '위치 정보 없음'}</span>
            </div>

            {/* 객실 타입 미리보기 (축약) */}
            {roomTypes.length > 0 ? (
              <div className="text-xs text-gray-600 line-clamp-2">
                {roomTypes.slice(0, 1).map(r => r.split(' - ')[0]).join(', ')}
                {roomTypes.length > 1 && ` 외 ${roomTypes.length - 1}개`}
              </div>
            ) : (
              <p className="text-xs text-gray-600 line-clamp-2">{listing.short_description || listing.description_md || ''}</p>
            )}
          </div>

          <div className="flex items-center justify-between mt-auto pt-2">
            {Number(listing.rating_avg || 0) > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs">{Number(listing.rating_avg || 0).toFixed(1)}</span>
                <span className="text-xs text-gray-500">({listing.rating_count || 0})</span>
              </div>
            )}
            <div className="text-base font-bold text-[#ff6a3d]">
              ₩{minPrice.toLocaleString()}
              <span className="text-xs font-normal text-gray-500">/박</span>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

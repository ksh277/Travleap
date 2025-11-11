/**
 * 호텔 카드 컴포넌트
 * 숙박 카테고리에서 호텔명으로 그룹핑하여 표시
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Star, MapPin, Bed } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface HotelCardProps {
  hotel: {
    partner_id: number;
    business_name: string;
    room_count: number;
    min_price: number;
    max_price: number;
    images: string[];
    locations: string;
    avg_rating: string | null;
    total_reviews: number;
    is_verified: boolean;
    tier: string;
  };
}

export function HotelCard({ hotel }: HotelCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/accommodation/${hotel.partner_id}`);
  };

  return (
    <Card
      className="group hover:shadow-lg transition-all cursor-pointer overflow-hidden h-[450px] flex flex-col"
      onClick={handleClick}
    >
      <div className="flex flex-col h-full">
        {/* 이미지 */}
        <div className="relative w-full h-40 md:h-52 flex-shrink-0 overflow-hidden">
          <ImageWithFallback
            src={hotel.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945'}
            alt={hotel.business_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* 우측 상단 뱃지들 */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            {hotel.is_verified && (
              <Badge className="bg-blue-500 text-white">인증</Badge>
            )}
            {hotel.tier === 'premium' && (
              <Badge className="bg-yellow-500 text-white">프리미엄</Badge>
            )}
          </div>
        </div>

        {/* 정보 */}
        <CardContent className="p-3 md:p-4 flex flex-col flex-1 justify-between">
          <div className="space-y-1.5 md:space-y-2">
            <div className="flex items-start gap-2">
              <h3 className="font-semibold text-base flex-1 line-clamp-2 min-h-[2.5rem]">
                {hotel.business_name}
              </h3>
            </div>

            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-gray-500 flex-shrink-0" />
              <span className="text-xs text-gray-600 line-clamp-1">
                {hotel.locations || '위치 정보 없음'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Bed className="h-3 w-3 text-gray-500 flex-shrink-0" />
              <span className="text-xs text-gray-600">
                {hotel.room_count}개 객실 타입
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-auto pt-2">
            {hotel.avg_rating && parseFloat(hotel.avg_rating) > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs">{parseFloat(hotel.avg_rating).toFixed(1)}</span>
                <span className="text-xs text-gray-500">({hotel.total_reviews})</span>
              </div>
            )}
            <div className="text-sm font-bold text-[#ff6a3d]">
              {hotel.min_price != null ? (
                Number(hotel.min_price) === 0 ? (
                  <span className="text-sm font-bold text-green-600">무료</span>
                ) : (
                  <>
                    ₩{Number(hotel.min_price).toLocaleString()}
                    {hotel.max_price != null && Number(hotel.max_price) > Number(hotel.min_price) && (
                      <span className="text-xs font-normal text-gray-500">
                        ~ ₩{Number(hotel.max_price).toLocaleString()}
                      </span>
                    )}
                    <div className="text-xs font-normal text-gray-500">/박</div>
                  </>
                )
              ) : (
                <span className="text-xs text-gray-500">가격 문의</span>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

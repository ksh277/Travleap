/**
 * 호텔 상세 페이지
 * 선택한 호텔의 모든 객실 타입 표시
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ArrowLeft, Star, MapPin, Users, Wifi, Coffee, Heart } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface Room {
  id: number;
  title: string;
  short_description: string;
  images: string[];
  price_from: number;
  price_to: number;
  location: string;
  amenities: string[];
  highlights: string[];
  available_spots: number;
  rating_avg: number;
  rating_count: number;
  is_featured: boolean;
}

interface HotelData {
  partner: {
    id: number;
    business_name: string;
    contact_name: string;
    phone: string;
    email: string;
    tier: string;
    is_verified: boolean;
  };
  rooms: Room[];
  total_rooms: number;
}

export function HotelDetailPage() {
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const [hotelData, setHotelData] = useState<HotelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHotelData = async () => {
      try {
        const response = await fetch(`/api/accommodations/${partnerId}`);
        const result = await response.json();

        if (result.success) {
          setHotelData(result.data);
        } else {
          setError(result.error || '데이터를 불러올 수 없습니다.');
        }
      } catch (err: any) {
        setError(err.message || '오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchHotelData();
  }, [partnerId]);

  if (loading) {
    return <div className="container mx-auto px-4 py-8">로딩 중...</div>;
  }

  if (error || !hotelData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-500">{error || '호텔 정보를 찾을 수 없습니다.'}</p>
        <Button onClick={() => navigate('/stay')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/stay')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로 가기
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{hotelData.partner.business_name}</h1>
            {hotelData.partner.is_verified && (
              <Badge className="bg-blue-500 text-white">인증된 파트너</Badge>
            )}
            {hotelData.partner.tier === 'premium' && (
              <Badge className="bg-yellow-500 text-white ml-2">프리미엄</Badge>
            )}
          </div>
        </div>

        <p className="text-gray-600 mt-4">
          총 {hotelData.total_rooms}개 객실 타입 제공
        </p>
      </div>

      {/* 객실 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hotelData.rooms.map((room) => (
          <Card
            key={room.id}
            className="group hover:shadow-lg transition-all cursor-pointer overflow-hidden h-[450px] flex flex-col"
            onClick={() => navigate(`/detail/${room.id}`)}
          >
            <div className="flex flex-col h-full">
              {/* 객실 이미지 */}
              <div className="relative w-full h-52 flex-shrink-0 overflow-hidden">
                <ImageWithFallback
                  src={room.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945'}
                  alt={room.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* 우측 상단 뱃지 */}
                {room.is_featured && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-green-500 text-white">추천</Badge>
                  </div>
                )}
              </div>

              {/* 객실 정보 */}
              <CardContent className="p-4 flex flex-col flex-1 justify-between">
                <div className="space-y-2">
                  <h3 className="font-semibold text-base line-clamp-2 min-h-[2.5rem]">
                    {room.title}
                  </h3>

                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-gray-500 flex-shrink-0" />
                    <span className="text-xs text-gray-600 line-clamp-1">
                      {room.location || '위치 정보 없음'}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 line-clamp-2">
                    {room.short_description || room.highlights?.[0] || ''}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-auto pt-2">
                  {room.rating_avg > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs">{room.rating_avg.toFixed(1)}</span>
                      <span className="text-xs text-gray-500">({room.rating_count})</span>
                    </div>
                  )}
                  <div className="text-base font-bold text-[#ff6a3d]">
                    ₩{room.price_from.toLocaleString()}
                    <span className="text-xs font-normal text-gray-500">/박</span>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>

      {hotelData.rooms.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">현재 예약 가능한 객실이 없습니다.</p>
        </div>
      )}
    </div>
  );
}

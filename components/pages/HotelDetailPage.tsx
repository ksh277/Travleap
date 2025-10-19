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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 헤더 */}
      <Button
        variant="ghost"
        onClick={() => navigate('/stay')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        뒤로 가기
      </Button>

      {/* 호텔 대표 이미지 */}
      {hotelData.rooms[0]?.images?.[0] && (
        <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden mb-6">
          <ImageWithFallback
            src={hotelData.rooms[0].images[0]}
            alt={hotelData.partner.business_name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* 호텔 정보 */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{hotelData.partner.business_name}</h1>
            <div className="flex gap-2">
              {hotelData.partner.is_verified && (
                <Badge className="bg-blue-500 text-white">인증된 파트너</Badge>
              )}
              {hotelData.partner.tier === 'premium' && (
                <Badge className="bg-yellow-500 text-white">프리미엄</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 객실 목록 - 세로 나열 (야놀자 스타일) */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">객실 선택 ({hotelData.total_rooms}개)</h2>
        <div className="space-y-4">
          {hotelData.rooms.map((room) => (
            <Card
              key={room.id}
              className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
              onClick={() => navigate(`/detail/${room.id}`)}
            >
              <div className="flex gap-4">
                {/* 객실 이미지 - 왼쪽 */}
                <div className="relative w-32 h-32 md:w-40 md:h-40 flex-shrink-0">
                  <ImageWithFallback
                    src={room.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945'}
                    alt={room.title}
                    className="w-full h-full object-cover"
                  />
                  {room.is_featured && (
                    <Badge className="absolute top-2 left-2 bg-green-500 text-white text-xs">추천</Badge>
                  )}
                </div>

                {/* 객실 정보 - 오른쪽 */}
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base mb-1 line-clamp-1">
                      {room.title}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                      {room.short_description || room.highlights?.[0] || ''}
                    </p>
                  </div>

                  <div className="flex items-end justify-between">
                    {room.rating_avg > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-semibold">{room.rating_avg.toFixed(1)}</span>
                        <span className="text-xs text-gray-500">({room.rating_count})</span>
                      </div>
                    )}
                    <div className="text-right">
                      <div className="text-xl font-bold text-[#ff6a3d]">
                        ₩{room.price_from.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">/박</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 호텔 설명 */}
      <div className="mb-8 border-t pt-6">
        <h2 className="text-xl font-bold mb-4">호텔 정보</h2>
        <div className="space-y-2 text-gray-700">
          <p><strong>업체명:</strong> {hotelData.partner.business_name}</p>
          <p><strong>담당자:</strong> {hotelData.partner.contact_name}</p>
          <p><strong>전화:</strong> {hotelData.partner.phone}</p>
          <p><strong>이메일:</strong> {hotelData.partner.email}</p>
        </div>
      </div>

      {/* 예약 버튼 (하단 고정) */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t p-4 -mx-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex gap-3">
          <Button variant="outline" className="flex-1">
            <Heart className="mr-2 h-4 w-4" />
            찜하기
          </Button>
          <Button className="flex-1 bg-[#ff6a3d] hover:bg-[#e5612f]">
            예약하기
          </Button>
        </div>
      </div>

      {hotelData.rooms.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">현재 예약 가능한 객실이 없습니다.</p>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

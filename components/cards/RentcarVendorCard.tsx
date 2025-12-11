/**
 * 렌트카 업체 카드 컴포넌트
 * 렌트카 카테고리에서 업체명으로 그룹핑하여 표시
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Car } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface RentcarVendorCardProps {
  vendor: {
    vendor_id: number;
    vendor_code: string;
    vendor_name: string;
    vehicle_count: number;
    min_price: number;
    max_price: number;
    images: string[];
    vehicle_classes: string;
  };
}

export function RentcarVendorCard({ vendor }: RentcarVendorCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/rentcar/${vendor.vendor_id}`);
  };

  return (
    <Card
      className="group hover:shadow-lg transition-all cursor-pointer overflow-hidden h-[450px] flex flex-col"
      onClick={handleClick}
    >
      <div className="flex flex-col h-full">
        {/* 이미지 - 업체 로고/이미지가 없으면 기본 이미지 */}
        <div className="relative w-full h-40 md:h-52 flex-shrink-0 overflow-hidden">
          {vendor.images && vendor.images.length > 0 ? (
            <ImageWithFallback
              src={vendor.images[0]}
              alt={vendor.vendor_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100 group-hover:scale-105 transition-transform duration-300">
              <span className="text-4xl md:text-6xl">🚗</span>
            </div>
          )}

          {/* 우측 상단 뱃지 */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            {vendor.vendor_code.includes('TURO') && (
              <Badge className="bg-purple-500 text-white">Turo 파트너</Badge>
            )}
          </div>
        </div>

        {/* 정보 */}
        <CardContent className="p-3 md:p-4 flex flex-col flex-1 justify-between">
          <div className="space-y-1.5 md:space-y-2">
            <div className="flex items-start gap-2">
              <h3 className="font-semibold text-base flex-1 line-clamp-2 min-h-[2.5rem]">
                {vendor.vendor_name}
              </h3>
            </div>

            <div className="flex items-center gap-1">
              <Car className="h-3 w-3 text-gray-500 flex-shrink-0" />
              <span className="text-xs text-gray-600">
                {vendor.vehicle_count}대 차량 보유
              </span>
            </div>

            {vendor.vehicle_classes && (
              <div className="text-xs text-gray-600 line-clamp-2">
                차량 클래스: {vendor.vehicle_classes}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-auto pt-2">
            <div className="text-xs text-gray-500">
              일일 렌탈
            </div>
            <div className="text-sm font-bold text-[#ff6a3d]">
              ₩{vendor.min_price?.toLocaleString()}
              {vendor.max_price > vendor.min_price && (
                <span className="text-xs font-normal text-gray-500">
                  ~ ₩{vendor.max_price?.toLocaleString()}
                </span>
              )}
              <div className="text-xs font-normal text-gray-500">/일</div>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

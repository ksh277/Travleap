/**
 * 렌트카 검색 결과 카드
 * 실시간 API 데이터 (차량, 가격, 정책) 표시
 */

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Users, Briefcase, Fuel, Settings, Check, Info } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import type { CarSearchResult } from '../../utils/rentcar/types';

interface RentcarCardProps {
  car: CarSearchResult;
  onBook?: (rateKey: string) => void;
  onShowDetails?: (car: CarSearchResult) => void;
}

export function RentcarCard({ car, onBook, onShowDetails }: RentcarCardProps) {
  const { vehicle, price, policies, extras } = car;

  return (
    <Card className="group hover:shadow-lg transition-all overflow-hidden">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 좌측: 차량 이미지 & 정보 */}
          <div className="md:col-span-1">
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden mb-3">
              <ImageWithFallback
                src={vehicle.images[0] || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2'}
                alt={vehicle.model}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {vehicle.airConditioning && (
                <Badge className="absolute top-2 right-2 bg-blue-500">에어컨</Badge>
              )}
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">{vehicle.make || '차량'}</div>
              <h3 className="font-semibold text-lg mb-1">{vehicle.model}</h3>
              <div className="text-xs text-gray-600">또는 동급</div>
            </div>
          </div>

          {/* 중앙: 차량 스펙 & 정책 */}
          <div className="md:col-span-1 space-y-3">
            {/* 차량 스펙 */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span>{vehicle.seats}인승</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-gray-500" />
                <span>
                  {vehicle.luggage?.large || 2}개 / {vehicle.luggage?.small || 1}개
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-500" />
                <span>{vehicle.transmission === 'Automatic' ? '자동' : '수동'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Fuel className="h-4 w-4 text-gray-500" />
                <span>
                  {vehicle.fuel === 'Gasoline' ? '휘발유' :
                   vehicle.fuel === 'Diesel' ? '경유' :
                   vehicle.fuel === 'Hybrid' ? '하이브리드' : '전기'}
                </span>
              </div>
            </div>

            {/* 정책 요약 */}
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-4 w-4" />
                <span>{policies.mileage === 'UNLIMITED' ? '무제한 주행' : '주행거리 제한'}</span>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-4 w-4" />
                <span>{policies.fuel === 'FULL_TO_FULL' ? '만유 → 만유' : policies.fuel}</span>
              </div>
              {policies.cancellation.free && (
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-4 w-4" />
                  <span>무료 취소 가능</span>
                </div>
              )}
            </div>

            {/* 보험 정보 */}
            <div className="p-2 bg-gray-50 rounded text-xs">
              <div className="font-semibold mb-1">보험 & 면책금</div>
              <div className="text-gray-600">
                면책금: ₩{policies.insurance.excess.toLocaleString()}
              </div>
              <div className="text-gray-600">
                보증금: ₩{policies.insurance.deposit.toLocaleString()}
              </div>
            </div>

            {/* 추가 옵션 */}
            {extras.length > 0 && (
              <div>
                <div className="text-xs font-semibold mb-1">추가 옵션</div>
                <div className="flex flex-wrap gap-1">
                  {extras.slice(0, 3).map((extra) => (
                    <Badge key={extra.code} variant="outline" className="text-xs">
                      {extra.name} +₩{extra.price.toLocaleString()}
                    </Badge>
                  ))}
                  {extras.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{extras.length - 3}개
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 우측: 가격 & 예약 버튼 */}
          <div className="md:col-span-1 flex flex-col justify-between">
            {/* 가격 상세 */}
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>기본 요금</span>
                  <span>₩{price.base.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>세금</span>
                  <span>₩{price.taxes.toLocaleString()}</span>
                </div>
                {price.fees.map((fee, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{fee.name}</span>
                    <span>₩{fee.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-2">
                <div className="flex justify-between items-end">
                  <span className="text-sm text-gray-600">총 요금</span>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      ₩{price.total.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {price.paymentType === 'PREPAID' ? '선불' : '현장 결제'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 보증금 안내 */}
              {price.depositRequired && (
                <div className="flex items-start gap-1 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
                  <Info className="h-4 w-4 mt-0.5" />
                  <span>
                    보증금 ₩{price.depositRequired.toLocaleString()} 필요
                  </span>
                </div>
              )}
            </div>

            {/* 버튼 */}
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onShowDetails?.(car)}
              >
                상세 정보
              </Button>
              <Button
                variant="default"
                size="lg"
                className="w-full"
                onClick={() => onBook?.(car.rateKey)}
              >
                예약하기
              </Button>

              {/* 만료 시간 표시 */}
              <div className="text-xs text-center text-gray-500">
                이 요금은 {new Date(car.expiresAt).toLocaleTimeString()}까지 유효
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

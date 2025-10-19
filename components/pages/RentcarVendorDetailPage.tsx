/**
 * 렌트카 업체 상세 페이지
 * 선택한 업체의 모든 차량 표시
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ArrowLeft, Car, Users, Fuel, Settings } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface Vehicle {
  id: number;
  vehicle_class: string;
  brand: string;
  model: string;
  year: number;
  display_name: string;
  transmission: string;
  fuel_type: string;
  seating_capacity: number;
  large_bags: number;
  small_bags: number;
  daily_rate_krw: number;
  images: string[];
  features: string[];
  is_active: boolean;
  is_featured: boolean;
  average_rating: number;
  total_bookings: number;
}

interface VendorData {
  vendor: {
    id: number;
    vendor_code: string;
    vendor_name: string;
  };
  vehicles: Vehicle[];
  total_vehicles: number;
}

export function RentcarVendorDetailPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const [vendorData, setVendorData] = useState<VendorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        const response = await fetch(`/api/rentcars/${vendorId}`);
        const result = await response.json();

        if (result.success) {
          setVendorData(result.data);
        } else {
          setError(result.error || '데이터를 불러올 수 없습니다.');
        }
      } catch (err: any) {
        setError(err.message || '오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [vendorId]);

  if (loading) {
    return <div className="container mx-auto px-4 py-8">로딩 중...</div>;
  }

  if (error || !vendorData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-500">{error || '업체 정보를 찾을 수 없습니다.'}</p>
        <Button onClick={() => navigate('/rentcar')} className="mt-4">
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
          onClick={() => navigate('/rentcar')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로 가기
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{vendorData.vendor.vendor_name}</h1>
            {vendorData.vendor.vendor_code.includes('TURO') && (
              <Badge className="bg-purple-500 text-white">Turo 공식 파트너</Badge>
            )}
          </div>
        </div>

        <p className="text-gray-600 mt-4">
          총 {vendorData.total_vehicles}대 차량 보유
        </p>
      </div>

      {/* 차량 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendorData.vehicles.map((vehicle) => (
          <Card
            key={vehicle.id}
            className="group hover:shadow-lg transition-all overflow-hidden h-[450px] flex flex-col"
          >
            <div className="flex flex-col h-full">
              {/* 차량 이미지 */}
              <div className="relative w-full h-52 flex-shrink-0 overflow-hidden">
                <ImageWithFallback
                  src={vehicle.images?.[0] || 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d'}
                  alt={vehicle.display_name || `${vehicle.brand} ${vehicle.model}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* 우측 상단 뱃지 */}
                <div className="absolute top-3 right-3">
                  <Badge className="bg-gray-700 text-white">{vehicle.vehicle_class}</Badge>
                </div>
              </div>

              {/* 차량 정보 */}
              <CardContent className="p-4 flex flex-col flex-1 justify-between">
                <div className="space-y-2">
                  <h3 className="font-semibold text-base line-clamp-2 min-h-[2.5rem]">
                    {vehicle.display_name || `${vehicle.year} ${vehicle.brand} ${vehicle.model}`}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{vehicle.seating_capacity}인승</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Settings className="h-3 w-3" />
                      <span>{vehicle.transmission}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Fuel className="h-3 w-3" />
                      <span>{vehicle.fuel_type}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      <span>짐: {vehicle.large_bags}개</span>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">일일</span>
                    <span className="text-base font-bold text-[#ff6a3d]">
                      ₩{vehicle.daily_rate_krw.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>

      {vendorData.vehicles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">현재 대여 가능한 차량이 없습니다.</p>
        </div>
      )}
    </div>
  );
}

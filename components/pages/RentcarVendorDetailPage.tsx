/**
 * 렌트카 업체 상세 페이지
 * 선택한 업체의 모든 차량 표시 (야놀자 스타일)
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ArrowLeft, Car, Users, Fuel, Settings, Heart } from 'lucide-react';
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
    business_name?: string;
    contact_name?: string;
    phone?: string;
    email?: string;
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 헤더 */}
      <Button
        variant="ghost"
        onClick={() => navigate('/rentcar')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        뒤로 가기
      </Button>

      {/* 업체 대표 이미지 */}
      {vendorData.vehicles[0]?.images?.[0] && (
        <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden mb-6">
          <ImageWithFallback
            src={vendorData.vehicles[0].images[0]}
            alt={vendorData.vendor.vendor_name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* 업체 정보 */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{vendorData.vendor.vendor_name}</h1>
            <div className="flex gap-2">
              {vendorData.vendor.vendor_code.includes('TURO') && (
                <Badge className="bg-purple-500 text-white">Turo 공식 파트너</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 차량 목록 - 가로 스크롤 (야놀자 스타일) */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">차량 선택 ({vendorData.total_vehicles}대)</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          {vendorData.vehicles.map((vehicle) => (
            <Card
              key={vehicle.id}
              className="flex-shrink-0 w-72 hover:shadow-lg transition-shadow"
            >
              {/* 차량 이미지 */}
              <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
                <ImageWithFallback
                  src={vehicle.images?.[0] || 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d'}
                  alt={vehicle.display_name || `${vehicle.brand} ${vehicle.model}`}
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-2 right-2 bg-gray-700 text-white">
                  {vehicle.vehicle_class}
                </Badge>
              </div>

              {/* 차량 정보 */}
              <CardContent className="p-4">
                <h3 className="font-semibold text-base mb-2 line-clamp-1">
                  {vehicle.display_name || `${vehicle.year} ${vehicle.brand} ${vehicle.model}`}
                </h3>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
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

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">일일</span>
                  <span className="text-lg font-bold text-[#ff6a3d]">
                    ₩{vehicle.daily_rate_krw.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 업체 설명 */}
      <div className="mb-8 border-t pt-6">
        <h2 className="text-xl font-bold mb-4">업체 정보</h2>
        <div className="space-y-2 text-gray-700">
          <p><strong>업체명:</strong> {vendorData.vendor.business_name || vendorData.vendor.vendor_name}</p>
          {vendorData.vendor.contact_name && (
            <p><strong>담당자:</strong> {vendorData.vendor.contact_name}</p>
          )}
          {vendorData.vendor.phone && (
            <p><strong>전화:</strong> {vendorData.vendor.phone}</p>
          )}
          {vendorData.vendor.email && (
            <p><strong>이메일:</strong> {vendorData.vendor.email}</p>
          )}
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

      {vendorData.vehicles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">현재 대여 가능한 차량이 없습니다.</p>
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

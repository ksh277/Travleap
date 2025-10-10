/**
 * PMS 연동 모달 - 숙박 카테고리 상품 추가 시 사용
 *
 * 기능:
 * 1. PMS API 정보 입력 (vendor, hotelId, apiKey)
 * 2. PMS에서 데이터 불러오기 버튼
 * 3. 불러온 객실 정보 표시 및 자동 폼 채우기
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Loader2, Download, CheckCircle, AlertCircle, Info } from 'lucide-react';
import type { PMSVendor } from '../../utils/pms/types';
import {
  fetchHotelDataFromPMS,
  convertPMSDataToFormData,
  type PMSConnectionConfig,
  type HotelDataFromPMS,
  type AdminProductFormData,
} from '../../utils/pms/admin-integration';

interface PMSIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (formData: AdminProductFormData) => void;
}

export function PMSIntegrationModal({
  isOpen,
  onClose,
  onDataLoaded,
}: PMSIntegrationModalProps) {
  const [vendor, setVendor] = useState<PMSVendor>('cloudbeds');
  const [hotelId, setHotelId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pmsData, setPmsData] = useState<HotelDataFromPMS | null>(null);

  // 테스트용 Mock 데이터 불러오기
  const handleLoadMockData = () => {
    const mockData: HotelDataFromPMS = {
      hotelId: 'test_hotel_001',
      hotelName: '신안 비치 호텔',
      location: '전라남도 신안군 압해읍',
      description: '아름다운 바다 전망과 함께 편안한 휴식을 즐길 수 있는 신안 대표 호텔입니다.',
      images: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'
      ],
      roomTypes: [
        {
          roomTypeId: 'deluxe_double',
          roomTypeName: 'Deluxe Double',
          description: '퀸 사이즈 침대와 바다 전망이 있는 디럭스 객실',
          maxOccupancy: 2,
          bedType: 'Queen',
          amenities: ['WiFi', '에어컨', 'TV', '미니바', '헤어드라이어'],
          images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600'],
          averagePrice: 120000,
          currency: 'KRW',
          currentInventory: 8,
          totalRooms: 10
        },
        {
          roomTypeId: 'family_suite',
          roomTypeName: 'Family Suite',
          description: '가족 단위 투숙객을 위한 넓은 스위트 객실',
          maxOccupancy: 4,
          bedType: 'King + Twin',
          amenities: ['WiFi', '에어컨', 'TV', '주방', '세탁기'],
          images: ['https://images.unsplash.com/photo-1591088398332-8a7791972843?w=600'],
          averagePrice: 250000,
          currency: 'KRW',
          currentInventory: 3,
          totalRooms: 5
        },
        {
          roomTypeId: 'standard_twin',
          roomTypeName: 'Standard Twin',
          description: '2인 투숙객을 위한 트윈 베드 객실',
          maxOccupancy: 2,
          bedType: 'Twin',
          amenities: ['WiFi', '에어컨', 'TV'],
          images: ['https://images.unsplash.com/photo-1598928636135-d146006ff4be?w=600'],
          averagePrice: 90000,
          currency: 'KRW',
          currentInventory: 12,
          totalRooms: 15
        }
      ]
    };

    setPmsData(mockData);
    toast.success('✅ 테스트 데이터가 로드되었습니다!');
  };

  // PMS에서 데이터 불러오기
  const handleFetchData = async () => {
    if (!hotelId || !apiKey) {
      toast.error('호텔 ID와 API Key를 모두 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const config: PMSConnectionConfig = {
        vendor,
        hotelId,
        apiKey,
      };

      toast.info('PMS에서 데이터를 불러오는 중...');
      const result = await fetchHotelDataFromPMS(config);

      if (result.success && result.data) {
        setPmsData(result.data);
        toast.success(
          `✅ ${result.data.roomTypes.length}개 객실 정보를 불러왔습니다!`
        );
      } else {
        toast.error(result.error || 'PMS 연동 실패');
      }
    } catch (error) {
      console.error('PMS 연동 에러:', error);
      toast.error('PMS 연동 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 데이터를 폼에 채우기
  const handleApplyData = () => {
    if (!pmsData) {
      toast.error('먼저 PMS 데이터를 불러와주세요.');
      return;
    }

    const formData = convertPMSDataToFormData(pmsData, vendor);
    onDataLoaded(formData);
    toast.success('✅ 상품 폼에 데이터가 자동으로 입력되었습니다!');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>PMS 연동 - 숙박 정보 불러오기</DialogTitle>
          <DialogDescription>
            PMS(Property Management System)에서 객실 정보, 재고, 요금을 자동으로 가져옵니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 1단계: PMS 연동 정보 입력 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-sm">
                1
              </span>
              PMS 연동 정보 입력
            </h3>

            <div className="grid grid-cols-1 gap-4 pl-8">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  PMS 공급업체 *
                </label>
                <Select value={vendor} onValueChange={(v) => setVendor(v as PMSVendor)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cloudbeds">CloudBeds</SelectItem>
                    <SelectItem value="opera">Opera PMS</SelectItem>
                    <SelectItem value="stayntouch">StayNTouch</SelectItem>
                    <SelectItem value="mews">Mews</SelectItem>
                    <SelectItem value="custom">기타 (Custom)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  호텔 ID *
                </label>
                <Input
                  value={hotelId}
                  onChange={(e) => setHotelId(e.target.value)}
                  placeholder="예: hotel_123456"
                />
                <p className="text-xs text-gray-500 mt-1">
                  PMS에서 발급받은 호텔 고유 ID를 입력하세요.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  API Key *
                </label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="PMS API Key"
                />
                <p className="text-xs text-gray-500 mt-1">
                  PMS 관리자 페이지에서 발급받은 API Key를 입력하세요.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleFetchData}
                  disabled={isLoading || !hotelId || !apiKey}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      데이터 불러오는 중...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      PMS에서 데이터 불러오기
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleLoadMockData}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1"
                >
                  <Info className="mr-2 h-4 w-4" />
                  테스트 데이터 사용
                </Button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                💡 실제 PMS 연동 전에 "테스트 데이터 사용" 버튼으로 기능을 먼저 테스트해보세요
              </p>
            </div>
          </div>

          {/* 2단계: 불러온 데이터 미리보기 */}
          {pmsData && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm">
                  2
                </span>
                불러온 데이터 확인
              </h3>

              <div className="pl-8 space-y-4">
                {/* 호텔 기본 정보 */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-3">호텔 정보</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      <span className="font-medium min-w-24">호텔명:</span>
                      <span>{pmsData.hotelName}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium min-w-24">위치:</span>
                      <span>{pmsData.location}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium min-w-24">객실 타입:</span>
                      <span>{pmsData.roomTypes.length}개</span>
                    </div>
                  </div>
                </div>

                {/* 객실 타입 목록 */}
                <div className="space-y-3">
                  <h4 className="font-medium">객실 타입 ({pmsData.roomTypes.length}개)</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {pmsData.roomTypes.map((room, index) => (
                      <div
                        key={room.roomTypeId}
                        className="border rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="font-medium">{room.roomTypeName}</span>
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>
                                💰 평균 요금: {room.averagePrice.toLocaleString()} {room.currency}
                              </div>
                              <div>
                                🛏️ 침대 타입: {room.bedType} | 최대 인원: {room.maxOccupancy}명
                              </div>
                              <div>
                                📦 현재 재고: {room.currentInventory} / {room.totalRooms}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 안내 메시지 */}
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">다음 단계</p>
                    <p>
                      "폼에 적용하기" 버튼을 클릭하면 위 정보가 자동으로 상품 추가 폼에
                      입력됩니다. 필요시 수정 후 저장하세요.
                    </p>
                  </div>
                </div>

                {/* 적용 버튼 */}
                <Button onClick={handleApplyData} className="w-full" size="lg">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  폼에 적용하기
                </Button>
              </div>
            </div>
          )}

          {/* 에러 상태 */}
          {!isLoading && !pmsData && hotelId && apiKey && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div className="text-sm text-yellow-700">
                <p className="font-medium mb-1">데이터를 불러오지 못했습니다</p>
                <p>
                  PMS 연동 정보를 확인하고 "데이터 불러오기" 버튼을 클릭하세요.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

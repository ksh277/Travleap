import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { X, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface AddressSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddressSelected: (data: {
    postalCode: string;
    address: string;
    detailAddress: string;
  }) => void;
  initialAddress?: {
    postalCode?: string;
    address?: string;
    detailAddress?: string;
  };
}

declare global {
  interface Window {
    daum: any;
  }
}

export function AddressSearchModal({
  isOpen,
  onClose,
  onAddressSelected,
  initialAddress
}: AddressSearchModalProps) {
  const [detailAddress, setDetailAddress] = useState(initialAddress?.detailAddress || '');
  const [selectedAddress, setSelectedAddress] = useState({
    postalCode: initialAddress?.postalCode || '',
    address: initialAddress?.address || ''
  });

  useEffect(() => {
    if (initialAddress) {
      setSelectedAddress({
        postalCode: initialAddress.postalCode || '',
        address: initialAddress.address || ''
      });
      setDetailAddress(initialAddress.detailAddress || '');
    }
  }, [initialAddress]);

  const handleAddressSearch = () => {
    if (!window.daum) {
      toast.error('주소 검색 서비스를 불러올 수 없습니다.');
      return;
    }

    new window.daum.Postcode({
      oncomplete: function (data: any) {
        // 도로명 주소 우선, 없으면 지번 주소 사용
        const fullAddress = data.roadAddress || data.jibunAddress;
        const postalCode = data.zonecode;

        setSelectedAddress({
          postalCode,
          address: fullAddress
        });

        toast.success('주소가 선택되었습니다. 상세주소를 입력해주세요.');
      }
    }).open();
  };

  const handleSave = () => {
    if (!selectedAddress.postalCode || !selectedAddress.address) {
      toast.error('주소를 먼저 검색해주세요.');
      return;
    }

    if (!detailAddress.trim()) {
      toast.error('상세주소를 입력해주세요.');
      return;
    }

    onAddressSelected({
      postalCode: selectedAddress.postalCode,
      address: selectedAddress.address,
      detailAddress: detailAddress.trim()
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            배송지 주소 입력
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">우편번호</label>
            <div className="flex gap-2">
              <Input
                value={selectedAddress.postalCode}
                readOnly
                placeholder="우편번호"
                className="flex-1"
              />
              <Button
                onClick={handleAddressSearch}
                variant="outline"
                className="whitespace-nowrap"
              >
                주소 검색
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">주소</label>
            <Input
              value={selectedAddress.address}
              readOnly
              placeholder="주소 검색 버튼을 클릭하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              상세주소 <span className="text-red-500">*</span>
            </label>
            <Input
              value={detailAddress}
              onChange={(e) => setDetailAddress(e.target.value)}
              placeholder="상세주소를 입력하세요 (예: 101동 202호)"
              maxLength={200}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-[#8B5FBF] hover:bg-[#7A4FB5]"
            >
              저장
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

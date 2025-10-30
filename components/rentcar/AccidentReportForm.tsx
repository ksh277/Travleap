/**
 * 렌트카 사고 신고 폼
 * - 사고 타입 선택 (접촉사고/차량 고장/도난 등)
 * - 위치 자동 감지 (GPS)
 * - 사진/동영상 업로드 (최대 10장)
 * - 사고 경위 작성
 * - 상대방 정보 입력 (선택)
 */

import { useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Loader2, MapPin, Camera, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface AccidentReportFormProps {
  bookingId: number;
  vehicleId: number;
  vendorId: number;
  userId: number;
  bookingNumber: string;
  vehicleName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AccidentReportForm({
  bookingId,
  vehicleId,
  vendorId,
  userId,
  bookingNumber,
  vehicleName,
  isOpen,
  onClose
}: AccidentReportFormProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // 폼 데이터
  const [formData, setFormData] = useState({
    accident_type: 'collision' as 'collision' | 'scratch' | 'breakdown' | 'theft' | 'other',
    severity: 'minor' as 'minor' | 'moderate' | 'severe',
    accident_datetime: new Date().toISOString().slice(0, 16),
    location_address: '',
    location_lat: null as number | null,
    location_lng: null as number | null,
    description: '',
    other_party_name: '',
    other_party_phone: '',
    other_party_vehicle: '',
    police_report_filed: false,
    police_report_number: '',
    photos: [] as string[],
    videos: [] as string[]
  });

  // GPS 위치 가져오기
  const handleGetLocation = () => {
    setIsGettingLocation(true);

    if (!navigator.geolocation) {
      toast.error('이 브라우저는 위치 서비스를 지원하지 않습니다.');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        setFormData(prev => ({
          ...prev,
          location_lat: latitude,
          location_lng: longitude
        }));

        // 역지오코딩으로 주소 가져오기 (선택 사항)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ko`
          );
          const data = await response.json();
          if (data.display_name) {
            setFormData(prev => ({
              ...prev,
              location_address: data.display_name
            }));
          }
        } catch (error) {
          console.error('주소 가져오기 실패:', error);
        }

        toast.success('현재 위치가 설정되었습니다.');
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('위치 가져오기 오류:', error);
        toast.error('위치를 가져올 수 없습니다. 위치 권한을 확인해주세요.');
        setIsGettingLocation(false);
      }
    );
  };

  // 사고 신고 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      toast.error('사고 경위를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/rentcar/accident/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          vehicle_id: vehicleId,
          vendor_id: vendorId,
          user_id: userId,
          ...formData
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`사고 신고가 접수되었습니다.\n신고번호: ${result.data.report_number}`);
        onClose();
        // 사고 신고 상세 페이지로 이동
        navigate(`/rentcar/accident/${result.data.id}`);
      } else {
        toast.error(result.error || '사고 신고 접수에 실패했습니다.');
      }
    } catch (error) {
      console.error('사고 신고 오류:', error);
      toast.error('사고 신고 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-6 w-6" />
            사고 신고
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            예약번호: {bookingNumber} | 차량: {vehicleName}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 사고 타입 */}
          <div>
            <Label className="text-base font-semibold">사고 유형 *</Label>
            <RadioGroup
              value={formData.accident_type}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, accident_type: value }))}
              className="mt-2 space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="collision" id="collision" />
                <Label htmlFor="collision" className="cursor-pointer">접촉 사고 (다른 차량과 충돌)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="scratch" id="scratch" />
                <Label htmlFor="scratch" className="cursor-pointer">긁힘/찍힘 (단독 사고)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="breakdown" id="breakdown" />
                <Label htmlFor="breakdown" className="cursor-pointer">차량 고장</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="theft" id="theft" />
                <Label htmlFor="theft" className="cursor-pointer">도난/분실</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other" className="cursor-pointer">기타</Label>
              </div>
            </RadioGroup>
          </div>

          {/* 심각도 */}
          <div>
            <Label className="text-base font-semibold">심각도 *</Label>
            <RadioGroup
              value={formData.severity}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, severity: value }))}
              className="mt-2 space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="minor" id="minor" />
                <Label htmlFor="minor" className="cursor-pointer">경미 (작은 긁힘, 가벼운 접촉)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="moderate" id="moderate" />
                <Label htmlFor="moderate" className="cursor-pointer">보통 (범퍼 파손, 깨진 유리)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="severe" id="severe" />
                <Label htmlFor="severe" className="cursor-pointer">심각 (주행 불가, 인명 피해)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* 사고 일시 */}
          <div>
            <Label htmlFor="accident_datetime" className="text-base font-semibold">사고 발생 일시 *</Label>
            <Input
              id="accident_datetime"
              type="datetime-local"
              value={formData.accident_datetime}
              onChange={(e) => setFormData(prev => ({ ...prev, accident_datetime: e.target.value }))}
              required
              className="mt-2"
            />
          </div>

          {/* 위치 정보 */}
          <div>
            <Label className="text-base font-semibold">사고 장소</Label>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleGetLocation}
                disabled={isGettingLocation}
                className="w-full"
              >
                {isGettingLocation ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="mr-2 h-4 w-4" />
                )}
                현재 위치 가져오기
              </Button>
            </div>
            <Input
              placeholder="수동으로 주소 입력 (예: 서울시 강남구 테헤란로 123)"
              value={formData.location_address}
              onChange={(e) => setFormData(prev => ({ ...prev, location_address: e.target.value }))}
              className="mt-2"
            />
            {formData.location_lat && formData.location_lng && (
              <p className="text-xs text-muted-foreground mt-1">
                GPS: {formData.location_lat.toFixed(6)}, {formData.location_lng.toFixed(6)}
              </p>
            )}
          </div>

          {/* 사고 경위 */}
          <div>
            <Label htmlFor="description" className="text-base font-semibold">사고 경위 *</Label>
            <Textarea
              id="description"
              placeholder="사고가 어떻게 발생했는지 자세히 적어주세요.&#10;예: 주차장에서 후진 중 뒤 차량과 접촉했습니다."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              required
              className="mt-2"
            />
          </div>

          {/* 상대방 정보 (접촉 사고인 경우) */}
          {formData.accident_type === 'collision' && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <h3 className="font-semibold">상대방 정보 (선택)</h3>
              <div>
                <Label htmlFor="other_party_name">상대방 이름</Label>
                <Input
                  id="other_party_name"
                  placeholder="예: 홍길동"
                  value={formData.other_party_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, other_party_name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="other_party_phone">상대방 전화번호</Label>
                <Input
                  id="other_party_phone"
                  type="tel"
                  placeholder="010-1234-5678"
                  value={formData.other_party_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, other_party_phone: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="other_party_vehicle">상대방 차량 번호</Label>
                <Input
                  id="other_party_vehicle"
                  placeholder="예: 12가 3456"
                  value={formData.other_party_vehicle}
                  onChange={(e) => setFormData(prev => ({ ...prev, other_party_vehicle: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* 경찰 신고 여부 */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="police_report_filed"
              checked={formData.police_report_filed}
              onChange={(e) => setFormData(prev => ({ ...prev, police_report_filed: e.target.checked }))}
              className="h-4 w-4"
            />
            <Label htmlFor="police_report_filed" className="cursor-pointer">경찰에 신고했습니다</Label>
          </div>

          {formData.police_report_filed && (
            <div>
              <Label htmlFor="police_report_number">경찰 신고 번호</Label>
              <Input
                id="police_report_number"
                placeholder="접수번호 입력"
                value={formData.police_report_number}
                onChange={(e) => setFormData(prev => ({ ...prev, police_report_number: e.target.value }))}
                className="mt-1"
              />
            </div>
          )}

          {/* 사진 업로드 안내 */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <div className="flex items-start gap-2">
              <Camera className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-900">사진/동영상 증거 안내</p>
                <p className="text-blue-700 mt-1">
                  사고 현장, 차량 손상 부위, 블랙박스 영상 등을 촬영해주세요.
                  <br />
                  신고 후 마이페이지에서 추가 업로드가 가능합니다.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              취소
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  신고 접수 중...
                </>
              ) : (
                '사고 신고 접수'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

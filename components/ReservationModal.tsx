/**
 * 공통 예약 모달 컴포넌트
 * 날짜, 시간, 인원 선택 후 예약
 */

import { useState } from 'react';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarIcon, Clock, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: number | string;
  vendorName: string;
  serviceName: string;
  category: 'hotel' | 'restaurant' | 'attraction' | 'experience' | 'event' | 'rentcar';
  requiresEndDate?: boolean; // 숙박 등 종료일이 필요한 경우
  availableTimeSlots?: string[]; // 가능한 시간대 (없으면 입력형)
}

export function ReservationModal({
  isOpen,
  onClose,
  vendorId,
  vendorName,
  serviceName,
  category,
  requiresEndDate = false,
  availableTimeSlots
}: ReservationModalProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [numAdults, setNumAdults] = useState(2);
  const [numChildren, setNumChildren] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 기본 시간대 (옵션이 없을 경우)
  const defaultTimeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00'
  ];

  const timeSlots = availableTimeSlots || defaultTimeSlots;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate) {
      toast.error('예약 날짜를 선택해주세요');
      return;
    }

    if (requiresEndDate && !endDate) {
      toast.error('종료 날짜를 선택해주세요');
      return;
    }

    if (!customerName || !customerPhone) {
      toast.error('예약자 정보를 입력해주세요');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          category,
          vendor_name: vendorName,
          service_name: serviceName,
          reservation_date: format(startDate, 'yyyy-MM-dd'),
          reservation_time: selectedTime || null,
          end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
          party_size: partySize,
          num_adults: numAdults,
          num_children: numChildren,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          special_requests: specialRequests
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('예약이 완료되었습니다!', {
          description: '가맹점 확인 후 연락드립니다.'
        });
        onClose();
        // 폼 초기화
        setStartDate(undefined);
        setEndDate(undefined);
        setSelectedTime('');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setSpecialRequests('');
      } else {
        toast.error(result.message || '예약에 실패했습니다');
      }
    } catch (error) {
      console.error('예약 오류:', error);
      toast.error('예약 처리 중 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>예약하기</DialogTitle>
          <DialogDescription>
            {vendorName} - {serviceName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 날짜 선택 */}
          <div className="space-y-4">
            <div>
              <Label>예약 날짜 *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP', { locale: ko }) : '날짜 선택'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {requiresEndDate && (
              <div>
                <Label>종료 날짜 *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP', { locale: ko }) : '날짜 선택'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => !startDate || date <= startDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* 시간 선택 */}
          <div>
            <Label>예약 시간</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <Clock className="mr-2 h-4 w-4" />
                <SelectValue placeholder="시간 선택 (선택사항)" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 인원 선택 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>성인 *</Label>
              <Select
                value={numAdults.toString()}
                onValueChange={(val) => {
                  setNumAdults(parseInt(val));
                  setPartySize(parseInt(val) + numChildren);
                }}
              >
                <SelectTrigger>
                  <Users className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}명
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>어린이</Label>
              <Select
                value={numChildren.toString()}
                onValueChange={(val) => {
                  setNumChildren(parseInt(val));
                  setPartySize(numAdults + parseInt(val));
                }}
              >
                <SelectTrigger>
                  <Users className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}명
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 예약자 정보 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="customerName">예약자명 *</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="홍길동"
                required
              />
            </div>

            <div>
              <Label htmlFor="customerPhone">연락처 *</Label>
              <Input
                id="customerPhone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="010-1234-5678"
                required
              />
            </div>

            <div>
              <Label htmlFor="customerEmail">이메일</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="example@email.com"
              />
            </div>
          </div>

          {/* 요청사항 */}
          <div>
            <Label htmlFor="specialRequests">요청사항</Label>
            <Textarea
              id="specialRequests"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="특별한 요청사항이 있으시면 입력해주세요"
              rows={3}
            />
          </div>

          {/* 안내사항 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-semibold mb-2">안내사항</p>
            <ul className="list-disc list-inside space-y-1">
              <li>예약 신청 후 가맹점 확인이 필요합니다</li>
              <li>가맹점에서 확인 후 연락드립니다</li>
              <li>예약 변경/취소는 고객센터로 문의해주세요</li>
            </ul>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  예약 중...
                </>
              ) : (
                '예약하기'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

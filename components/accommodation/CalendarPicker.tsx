/**
 * 숙박 체크인/체크아웃 날짜 선택 컴포넌트
 * - 예약 불가능한 날짜 비활성화
 * - 가격 표시
 * - 최소 숙박일 적용
 */

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { DayPicker, DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import 'react-day-picker/dist/style.css';

interface CalendarPickerProps {
  roomId: number;
  onDateSelect: (checkin: Date, checkout: Date, totalPrice: number, nights: number) => void;
  minStayNights?: number;
}

interface DayAvailability {
  date: string;
  available_rooms: number;
  price_krw: number;
  is_available: boolean;
  availability_status: 'available' | 'limited' | 'soldout' | 'closed';
}

export default function CalendarPicker({
  roomId,
  onDateSelect,
  minStayNights = 1
}: CalendarPickerProps) {
  const [range, setRange] = useState<DateRange | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [availability, setAvailability] = useState<{
    is_available: boolean;
    total_price_krw: number;
    nights: number;
  } | null>(null);
  const [calendarData, setCalendarData] = useState<DayAvailability[]>([]);

  const today = new Date();
  const maxDate = addDays(today, 365); // 1년 후까지

  useEffect(() => {
    if (roomId) {
      fetchCalendarData();
    }
  }, [roomId]);

  useEffect(() => {
    if (range?.from && range?.to) {
      checkAvailability();
    } else {
      setAvailability(null);
    }
  }, [range]);

  // 캘린더 데이터 가져오기 (현재 월 + 다음 월)
  const fetchCalendarData = async () => {
    try {
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;

      const response = await fetch(
        `/api/accommodation/calendar/${roomId}?year=${currentYear}&month=${currentMonth}`
      );
      const result = await response.json();

      if (result.success) {
        setCalendarData(result.data.calendar.dates);
      }
    } catch (error) {
      console.error('캘린더 데이터 가져오기 오류:', error);
    }
  };

  // 예약 가능 여부 확인
  const checkAvailability = async () => {
    if (!range?.from || !range?.to) return;

    setIsLoading(true);

    try {
      const checkinStr = format(range.from, 'yyyy-MM-dd');
      const checkoutStr = format(range.to, 'yyyy-MM-dd');

      const response = await fetch(
        `/api/accommodation/availability?room_id=${roomId}&checkin_date=${checkinStr}&checkout_date=${checkoutStr}`
      );
      const result = await response.json();

      if (result.success) {
        const { availability: avail } = result.data;

        setAvailability({
          is_available: avail.is_available,
          total_price_krw: avail.total_price_krw,
          nights: avail.nights
        });

        if (!avail.is_available) {
          toast.error(avail.unavailable_reason || '예약할 수 없는 날짜입니다.');
        }
      } else {
        toast.error(result.error || '가격 조회에 실패했습니다.');
        setAvailability(null);
      }
    } catch (error) {
      console.error('가격 조회 오류:', error);
      toast.error('가격 조회 중 오류가 발생했습니다.');
      setAvailability(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 비활성화할 날짜 판단
  const disabledDays = (date: Date) => {
    // 과거 날짜
    if (date < today) return true;

    // 1년 이후
    if (date > maxDate) return true;

    // 재고 없는 날짜
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayData = calendarData.find(d => d.date === dateStr);

    if (dayData) {
      return !dayData.is_available || dayData.availability_status === 'soldout';
    }

    return false;
  };

  // 날짜 선택 핸들러
  const handleSelect = (selectedRange: DateRange | undefined) => {
    if (!selectedRange) {
      setRange(undefined);
      return;
    }

    const { from, to } = selectedRange;

    if (from && to) {
      const nights = differenceInDays(to, from);

      if (nights < minStayNights) {
        toast.error(`최소 ${minStayNights}박 이상 선택해주세요.`);
        setRange(undefined);
        return;
      }
    }

    setRange(selectedRange);
  };

  // 예약 진행
  const handleProceed = () => {
    if (!range?.from || !range?.to || !availability?.is_available) {
      toast.error('날짜를 선택하고 예약 가능 여부를 확인해주세요.');
      return;
    }

    onDateSelect(
      range.from,
      range.to,
      availability.total_price_krw,
      availability.nights
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          날짜 선택
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 캘린더 */}
          <div className="flex justify-center">
            <DayPicker
              mode="range"
              selected={range}
              onSelect={handleSelect}
              locale={ko}
              disabled={disabledDays}
              numberOfMonths={2}
              className="border rounded-lg p-4"
            />
          </div>

          {/* 선택된 날짜 정보 */}
          {range?.from && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">체크인</p>
                  <p className="font-medium">
                    {format(range.from, 'yyyy년 M월 d일 (E)', { locale: ko })}
                  </p>
                </div>
                {range.to && (
                  <div>
                    <p className="text-sm text-muted-foreground">체크아웃</p>
                    <p className="font-medium">
                      {format(range.to, 'yyyy년 M월 d일 (E)', { locale: ko })}
                    </p>
                  </div>
                )}
              </div>

              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">가격 조회 중...</span>
                </div>
              )}

              {availability && !isLoading && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {availability.nights}박 총 요금
                      </p>
                      <p className="text-2xl font-bold text-primary">
                        {availability.total_price_krw.toLocaleString()}원
                      </p>
                      <p className="text-xs text-muted-foreground">
                        1박 평균: {Math.round(availability.total_price_krw / availability.nights).toLocaleString()}원
                      </p>
                    </div>
                    {availability.is_available ? (
                      <Badge className="bg-green-100 text-green-800">예약 가능</Badge>
                    ) : (
                      <Badge variant="destructive">예약 불가</Badge>
                    )}
                  </div>

                  {availability.is_available && (
                    <Button onClick={handleProceed} className="w-full mt-4">
                      예약 진행
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 안내 */}
          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-blue-50 rounded">
            <p>• 체크인: 15:00 이후</p>
            <p>• 체크아웃: 11:00 이전</p>
            <p>• 최소 숙박: {minStayNights}박</p>
            <p>• 회색 날짜는 예약할 수 없습니다</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

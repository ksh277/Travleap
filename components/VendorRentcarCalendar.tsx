/**
 * 벤더 렌트카 예약 캘린더
 *
 * 기능:
 * - 차량별 예약 현황 시각화
 * - 예약/반납/차단 상태 색상 구분
 * - 클릭하여 예약 상세 정보 확인
 * - 차량 차단 등록 기능
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Car, Lock, Clock, User, Phone, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface Vehicle {
  id: number;
  display_name: string;
  vehicle_code: string;
}

interface Booking {
  id: number;
  booking_number: string;
  vehicle_id: number;
  customer_name: string;
  pickup_at: string;
  return_at: string;
  status: 'pending' | 'confirmed' | 'picked_up' | 'returned' | 'completed' | 'canceled';
}

interface VehicleBlock {
  id: number;
  vehicle_id: number;
  starts_at: string;
  ends_at: string;
  block_reason: string;
  notes?: string;
}

interface CalendarDay {
  date: Date;
  isToday: boolean;
  isCurrentMonth: boolean;
  bookings: Booking[];
  blocks: VehicleBlock[];
}

export function VendorRentcarCalendar() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocks, setBlocks] = useState<VehicleBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  // 월 시작/종료 날짜 계산
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDay = new Date(firstDayOfMonth);
  startDay.setDate(startDay.getDate() - startDay.getDay()); // 주 시작일(일요일)로 이동

  // 캘린더 데이터 생성
  const generateCalendarDays = (): CalendarDay[] => {
    const days: CalendarDay[] = [];
    const current = new Date(startDay);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 6주 (42일) 표시
    for (let i = 0; i < 42; i++) {
      const dayBookings = bookings.filter(b => {
        const pickupDate = new Date(b.pickup_at);
        const returnDate = new Date(b.return_at);
        pickupDate.setHours(0, 0, 0, 0);
        returnDate.setHours(0, 0, 0, 0);
        const checkDate = new Date(current);
        checkDate.setHours(0, 0, 0, 0);

        return checkDate >= pickupDate && checkDate <= returnDate;
      });

      const dayBlocks = blocks.filter(b => {
        const startDate = new Date(b.starts_at);
        const endDate = new Date(b.ends_at);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        const checkDate = new Date(current);
        checkDate.setHours(0, 0, 0, 0);

        return checkDate >= startDate && checkDate <= endDate;
      });

      days.push({
        date: new Date(current),
        isToday: current.getTime() === today.getTime(),
        isCurrentMonth: current.getMonth() === currentDate.getMonth(),
        bookings: dayBookings,
        blocks: dayBlocks
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  // 차량 목록 로드
  useEffect(() => {
    loadVehicles();
  }, []);

  // 예약 및 차단 데이터 로드
  useEffect(() => {
    if (selectedVehicle) {
      loadBookings();
      loadBlocks();
    }
  }, [selectedVehicle, currentDate]);

  const loadVehicles = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/vendor/vehicles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        setVehicles(data.data || []);
        if (data.data && data.data.length > 0 && !selectedVehicle) {
          setSelectedVehicle(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load vehicles:', error);
      toast.error('차량 목록을 불러오지 못했습니다');
    }
  };

  const loadBookings = async () => {
    if (!selectedVehicle) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const startDate = firstDayOfMonth.toISOString().split('T')[0];
      const endDate = lastDayOfMonth.toISOString().split('T')[0];

      const response = await fetch(
        `/api/rentcar/bookings?vehicle_id=${selectedVehicle}&start_date=${startDate}&end_date=${endDate}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();

      if (data.success) {
        setBookings(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBlocks = async () => {
    if (!selectedVehicle) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `/api/rentcar/vehicle-blocks?vehicle_id=${selectedVehicle}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();

      if (data.success) {
        setBlocks(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load blocks:', error);
    }
  };

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'confirmed': { label: '예약확정', color: 'bg-blue-500' },
      'picked_up': { label: '대여중', color: 'bg-green-500' },
      'returned': { label: '반납완료', color: 'bg-gray-500' },
      'completed': { label: '완료', color: 'bg-gray-400' },
      'canceled': { label: '취소', color: 'bg-red-500' },
      'pending': { label: '대기중', color: 'bg-yellow-500' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge className={`${config.color} text-white text-xs`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              차량 예약 캘린더
            </CardTitle>
            <Select
              value={selectedVehicle?.toString()}
              onValueChange={(value) => setSelectedVehicle(parseInt(value))}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="차량 선택" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      {vehicle.display_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              오늘
            </Button>
            <Button variant="outline" size="icon" onClick={goToPrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[150px] text-center font-semibold">
              {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
            </div>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        ) : (
          <>
            {/* 캘린더 헤더 */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                <div
                  key={day}
                  className={`text-center text-sm font-semibold py-2 ${
                    idx === 0 ? 'text-red-600' : idx === 6 ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 캘린더 바디 */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (day.bookings.length > 0 || day.blocks.length > 0) {
                      setSelectedDay(day);
                    }
                  }}
                  className={`
                    min-h-[100px] p-2 border rounded-lg
                    ${day.isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                    ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                    hover:border-blue-300 cursor-pointer transition-colors
                  `}
                >
                  {/* 날짜 */}
                  <div className={`text-sm font-medium mb-1 ${
                    day.date.getDay() === 0 ? 'text-red-600' :
                    day.date.getDay() === 6 ? 'text-blue-600' :
                    'text-gray-900'
                  }`}>
                    {day.date.getDate()}
                  </div>

                  {/* 차단 표시 */}
                  {day.blocks.length > 0 && (
                    <div className="mb-1">
                      {day.blocks.map(block => (
                        <div
                          key={block.id}
                          className="text-xs bg-gray-600 text-white px-1 py-0.5 rounded mb-1 flex items-center gap-1"
                        >
                          <Lock className="h-3 w-3" />
                          <span className="truncate">{block.block_reason}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 예약 표시 */}
                  {day.bookings.length > 0 && (
                    <div className="space-y-1">
                      {day.bookings.slice(0, 2).map(booking => (
                        <div
                          key={booking.id}
                          className={`
                            text-xs px-1 py-0.5 rounded truncate
                            ${booking.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                              booking.status === 'picked_up' ? 'bg-green-100 text-green-700' :
                              booking.status === 'canceled' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'}
                          `}
                          title={`${booking.customer_name} - ${booking.booking_number}`}
                        >
                          {booking.customer_name}
                        </div>
                      ))}
                      {day.bookings.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{day.bookings.length - 2}건 더
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 범례 */}
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                <span>예약 확정</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span>대여 중</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-600 text-white rounded flex items-center justify-center">
                  <Lock className="h-3 w-3" />
                </div>
                <span>차량 차단</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 rounded"></div>
                <span>오늘</span>
              </div>
            </div>
          </>
        )}

        {/* 날짜 상세 모달 */}
        <Dialog open={selectedDay !== null} onOpenChange={(open) => !open && setSelectedDay(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                📅 {selectedDay?.date.toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* 예약 목록 */}
              {selectedDay && selectedDay.bookings.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Car className="h-5 w-5 text-blue-600" />
                    예약 현황 ({selectedDay.bookings.length}건)
                  </h3>
                  <div className="space-y-3">
                    {selectedDay.bookings.map((booking) => (
                      <Card key={booking.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-semibold text-lg">{booking.customer_name}</div>
                                <div className="text-sm text-gray-500">예약번호: {booking.booking_number}</div>
                              </div>
                            </div>
                            <Badge className={`
                              ${booking.status === 'confirmed' ? 'bg-blue-500' :
                                booking.status === 'picked_up' ? 'bg-green-500' :
                                booking.status === 'returned' ? 'bg-purple-500' :
                                booking.status === 'completed' ? 'bg-gray-500' :
                                booking.status === 'canceled' ? 'bg-red-500' :
                                'bg-yellow-500'}
                            `}>
                              {booking.status === 'confirmed' ? '예약 확정' :
                               booking.status === 'picked_up' ? '대여 중' :
                               booking.status === 'returned' ? '반납 완료' :
                               booking.status === 'completed' ? '완료' :
                               booking.status === 'canceled' ? '취소됨' :
                               '대기 중'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-gray-700">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <div>
                                <div className="font-medium">픽업 시간</div>
                                <div>{new Date(booking.pickup_at).toLocaleString('ko-KR', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-gray-700">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <div>
                                <div className="font-medium">반납 시간</div>
                                <div>{new Date(booking.return_at).toLocaleString('ko-KR', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}</div>
                              </div>
                            </div>
                          </div>

                          {booking.status === 'picked_up' && (
                            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                                <CreditCard className="h-4 w-4" />
                                현재 대여 중인 차량입니다
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* 차량 차단 목록 */}
              {selectedDay && selectedDay.blocks.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Lock className="h-5 w-5 text-gray-600" />
                    차량 차단 ({selectedDay.blocks.length}건)
                  </h3>
                  <div className="space-y-3">
                    {selectedDay.blocks.map((block) => (
                      <Card key={block.id} className="bg-gray-50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Lock className="h-4 w-4 text-gray-600" />
                            <span className="font-medium">{block.block_reason}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(block.starts_at).toLocaleString('ko-KR')} ~ {new Date(block.ends_at).toLocaleString('ko-KR')}
                          </div>
                          {block.notes && (
                            <div className="mt-2 text-sm text-gray-500">
                              메모: {block.notes}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* 예약/차단 둘 다 없을 때 */}
              {selectedDay && selectedDay.bookings.length === 0 && selectedDay.blocks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  이 날짜에는 예약이나 차단이 없습니다.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

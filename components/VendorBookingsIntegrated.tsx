/**
 * 통합 예약 관리 컴포넌트
 * - 검색/필터
 * - 예약 캘린더
 * - 예약 목록
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Search, Calendar as CalendarIcon } from 'lucide-react';
import { VendorRentcarCalendar } from './VendorRentcarCalendar';

interface Booking {
  id: number;
  booking_number: string;
  vehicle_name: string;
  customer_name: string;
  customer_phone: string;
  pickup_date: string;
  dropoff_date: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface Vehicle {
  id: number;
  display_name: string;
}

interface Props {
  bookings: Booking[];
  vehicles: Vehicle[];
  filteredBookings: Booking[];
  setFilteredBookings: (bookings: Booking[]) => void;
}

export function VendorBookingsIntegrated({
  bookings,
  vehicles,
  filteredBookings,
  setFilteredBookings
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    filterBookings(term, statusFilter);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    filterBookings(searchTerm, status);
  };

  const filterBookings = (term: string, status: string) => {
    let filtered = bookings;

    if (term) {
      filtered = filtered.filter(b =>
        b.customer_name.toLowerCase().includes(term.toLowerCase()) ||
        b.booking_number.toLowerCase().includes(term.toLowerCase()) ||
        b.vehicle_name.toLowerCase().includes(term.toLowerCase())
      );
    }

    if (status !== 'all') {
      filtered = filtered.filter(b => b.status === status);
    }

    setFilteredBookings(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: '확정', color: 'bg-blue-100 text-blue-800' },
      picked_up: { label: '대여중', color: 'bg-green-100 text-green-800' },
      returned: { label: '반납완료', color: 'bg-purple-100 text-purple-800' },
      completed: { label: '완료', color: 'bg-gray-100 text-gray-800' },
      canceled: { label: '취소됨', color: 'bg-red-100 text-red-800' },
    };

    const { label, color } = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return <Badge className={color}>{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* 검색 및 필터 */}
      <Card>
        <CardHeader>
          <CardTitle>예약 검색 및 필터</CardTitle>
          <CardDescription>예약을 검색하고 필터링하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="고객명, 예약번호, 차량명으로 검색..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="confirmed">확정</SelectItem>
                <SelectItem value="picked_up">대여중</SelectItem>
                <SelectItem value="returned">반납완료</SelectItem>
                <SelectItem value="completed">완료</SelectItem>
                <SelectItem value="canceled">취소됨</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 예약 캘린더 */}
      <VendorRentcarCalendar />

      {/* 예약 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            예약 목록 ({filteredBookings.length}건)
          </CardTitle>
          <CardDescription>
            {statusFilter !== 'all' && `${statusFilter} 상태의 `}
            {searchTerm && `"${searchTerm}" 검색 결과`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">{booking.customer_name}</span>
                          {getStatusBadge(booking.status)}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>예약번호: <span className="font-mono">{booking.booking_number}</span></div>
                          <div>차량: {booking.vehicle_name}</div>
                          <div>연락처: {booking.customer_phone}</div>
                          <div className="flex items-center gap-4">
                            <span>픽업: {new Date(booking.pickup_date).toLocaleString('ko-KR')}</span>
                            <span>반납: {new Date(booking.dropoff_date).toLocaleString('ko-KR')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          ₩{booking.total_amount.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(booking.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

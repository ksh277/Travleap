/**
 * 관리자용 숙박 재고 관리 컴포넌트
 * - 캘린더 형태로 재고/가격 표시
 * - 드래그로 기간 선택 → 가격/재고 일괄 수정
 * - 판매 중지/재개
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Calendar as CalendarIcon, Loader2, Edit, Ban, Play, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ko } from 'date-fns/locale';

interface RoomInventory {
  id: number;
  room_id: number;
  room_name: string;
  room_type: string;
  partner_name: string;
  date: string;
  total_rooms: number;
  available_rooms: number;
  booked_rooms: number;
  blocked_rooms: number;
  base_price_krw: number;
  weekend_price_krw: number;
  holiday_price_krw: number;
  special_price_krw: number;
  min_stay_nights: number;
  is_available: boolean;
  close_out_reason: string;
}

export default function AccommodationInventoryManager() {
  const [rooms, setRooms] = useState<{ id: number; name: string }[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [inventory, setInventory] = useState<RoomInventory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 일괄 수정 모달
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState({
    start_date: '',
    end_date: '',
    base_price_krw: '',
    weekend_price_krw: '',
    special_price_krw: '',
    min_stay_nights: '1'
  });

  // 판매 중지 모달
  const [isCloseOutOpen, setIsCloseOutOpen] = useState(false);
  const [closeOutForm, setCloseOutForm] = useState({
    start_date: '',
    end_date: '',
    action: 'close' as 'close' | 'open',
    close_out_reason: ''
  });

  // 재고 초기화 모달
  const [isInitOpen, setIsInitOpen] = useState(false);
  const [initForm, setInitForm] = useState({
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 365), 'yyyy-MM-dd'),
    total_rooms: '',
    base_price_krw: ''
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (selectedRoomId) {
      fetchInventory();
    }
  }, [selectedRoomId, currentMonth]);

  const fetchRooms = async () => {
    try {
      // 객실 목록 조회 (실제로는 rooms API 호출)
      // 임시로 빈 배열
      setRooms([]);
    } catch (error) {
      console.error('객실 목록 조회 오류:', error);
    }
  };

  const fetchInventory = async () => {
    if (!selectedRoomId) return;

    setIsLoading(true);

    try {
      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      const response = await fetch(
        `/api/admin/accommodation/inventory?room_id=${selectedRoomId}&start_date=${startDate}&end_date=${endDate}`
      );
      const result = await response.json();

      if (result.success) {
        setInventory(result.data);
      } else {
        toast.error('재고 조회 실패');
      }
    } catch (error) {
      console.error('재고 조회 오류:', error);
      toast.error('재고 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 재고 초기화
  const handleInit = async () => {
    if (!selectedRoomId) {
      toast.error('객실을 선택해주세요.');
      return;
    }

    if (!initForm.total_rooms || !initForm.base_price_krw) {
      toast.error('총 객실 수와 기본 가격을 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/admin/accommodation/init-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: selectedRoomId,
          start_date: initForm.start_date,
          end_date: initForm.end_date,
          total_rooms: parseInt(initForm.total_rooms),
          base_price_krw: parseInt(initForm.base_price_krw)
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        setIsInitOpen(false);
        fetchInventory();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('재고 초기화 오류:', error);
      toast.error('재고 초기화 중 오류가 발생했습니다.');
    }
  };

  // 일괄 가격 수정
  const handleBulkEdit = async () => {
    if (!selectedRoomId) return;

    if (!bulkEditForm.start_date || !bulkEditForm.end_date) {
      toast.error('시작일과 종료일을 선택해주세요.');
      return;
    }

    const updates: any = {};
    if (bulkEditForm.base_price_krw) {
      updates.base_price_krw = parseInt(bulkEditForm.base_price_krw);
    }
    if (bulkEditForm.weekend_price_krw) {
      updates.weekend_price_krw = parseInt(bulkEditForm.weekend_price_krw);
    }
    if (bulkEditForm.special_price_krw) {
      updates.special_price_krw = parseInt(bulkEditForm.special_price_krw);
    }
    if (bulkEditForm.min_stay_nights) {
      updates.min_stay_nights = parseInt(bulkEditForm.min_stay_nights);
    }

    if (Object.keys(updates).length === 0) {
      toast.error('변경할 항목을 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/admin/accommodation/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: selectedRoomId,
          start_date: bulkEditForm.start_date,
          end_date: bulkEditForm.end_date,
          updates
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        setIsBulkEditOpen(false);
        fetchInventory();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('일괄 수정 오류:', error);
      toast.error('일괄 수정 중 오류가 발생했습니다.');
    }
  };

  // 판매 중지/재개
  const handleCloseOut = async () => {
    if (!selectedRoomId) return;

    if (!closeOutForm.start_date || !closeOutForm.end_date) {
      toast.error('시작일과 종료일을 선택해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/admin/accommodation/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: selectedRoomId,
          start_date: closeOutForm.start_date,
          end_date: closeOutForm.end_date,
          action: closeOutForm.action,
          close_out_reason: closeOutForm.close_out_reason
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        setIsCloseOutOpen(false);
        fetchInventory();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('판매 중지/재개 오류:', error);
      toast.error('처리 중 오류가 발생했습니다.');
    }
  };

  const getAvailabilityBadge = (item: RoomInventory) => {
    if (!item.is_available) {
      return <Badge variant="destructive">중지</Badge>;
    }
    if (item.available_rooms === 0) {
      return <Badge variant="secondary">매진</Badge>;
    }
    if (item.available_rooms <= 2) {
      return <Badge className="bg-yellow-100 text-yellow-800">잔여{item.available_rooms}</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">가능</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">재고 관리</h2>
        <div className="flex gap-2">
          <Button onClick={() => setIsInitOpen(true)} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            재고 초기화
          </Button>
          <Button onClick={() => setIsBulkEditOpen(true)} variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            일괄 수정
          </Button>
          <Button onClick={() => setIsCloseOutOpen(true)} variant="outline">
            <Ban className="mr-2 h-4 w-4" />
            판매 관리
          </Button>
        </div>
      </div>

      {/* 객실 선택 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>객실 선택</Label>
              <Select
                value={selectedRoomId?.toString()}
                onValueChange={(val) => setSelectedRoomId(parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="객실을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map(room => (
                    <SelectItem key={room.id} value={room.id.toString()}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>월 선택</Label>
              <Input
                type="month"
                value={format(currentMonth, 'yyyy-MM')}
                onChange={(e) => setCurrentMonth(new Date(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 재고 캘린더 */}
      {selectedRoomId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(currentMonth, 'yyyy년 M월', { locale: ko })} 재고 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : inventory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>재고 데이터가 없습니다.</p>
                <p className="text-sm mt-2">"재고 초기화" 버튼을 클릭하여 재고를 생성하세요.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">날짜</th>
                      <th className="text-center py-2">재고</th>
                      <th className="text-right py-2">기본가</th>
                      <th className="text-right py-2">주말가</th>
                      <th className="text-right py-2">특가</th>
                      <th className="text-center py-2">최소박</th>
                      <th className="text-center py-2">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-muted/50">
                        <td className="py-2">
                          {format(new Date(item.date), 'M/d (E)', { locale: ko })}
                        </td>
                        <td className="text-center">
                          <div className="text-xs text-muted-foreground">
                            {item.available_rooms}/{item.total_rooms}
                          </div>
                          {item.booked_rooms > 0 && (
                            <div className="text-xs text-blue-600">예약{item.booked_rooms}</div>
                          )}
                        </td>
                        <td className="text-right">
                          {item.base_price_krw.toLocaleString()}원
                        </td>
                        <td className="text-right">
                          {item.weekend_price_krw?.toLocaleString() || '-'}
                        </td>
                        <td className="text-right text-red-600 font-medium">
                          {item.special_price_krw?.toLocaleString() || '-'}
                        </td>
                        <td className="text-center">{item.min_stay_nights}박</td>
                        <td className="text-center">{getAvailabilityBadge(item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 재고 초기화 모달 */}
      <Dialog open={isInitOpen} onOpenChange={setIsInitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>재고 초기화</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>시작일</Label>
                <Input
                  type="date"
                  value={initForm.start_date}
                  onChange={(e) => setInitForm(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>종료일</Label>
                <Input
                  type="date"
                  value={initForm.end_date}
                  onChange={(e) => setInitForm(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>총 객실 수</Label>
              <Input
                type="number"
                placeholder="10"
                value={initForm.total_rooms}
                onChange={(e) => setInitForm(prev => ({ ...prev, total_rooms: e.target.value }))}
              />
            </div>
            <div>
              <Label>기본 가격 (원)</Label>
              <Input
                type="number"
                placeholder="100000"
                value={initForm.base_price_krw}
                onChange={(e) => setInitForm(prev => ({ ...prev, base_price_krw: e.target.value }))}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              * 주말 가격은 기본 가격의 130%로 자동 설정됩니다.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInitOpen(false)}>취소</Button>
            <Button onClick={handleInit}>초기화</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 일괄 수정 모달 */}
      <Dialog open={isBulkEditOpen} onOpenChange={setIsBulkEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>가격/재고 일괄 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>시작일</Label>
                <Input
                  type="date"
                  value={bulkEditForm.start_date}
                  onChange={(e) => setBulkEditForm(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>종료일</Label>
                <Input
                  type="date"
                  value={bulkEditForm.end_date}
                  onChange={(e) => setBulkEditForm(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>기본 가격 (변경하지 않으려면 비워두세요)</Label>
              <Input
                type="number"
                placeholder="100000"
                value={bulkEditForm.base_price_krw}
                onChange={(e) => setBulkEditForm(prev => ({ ...prev, base_price_krw: e.target.value }))}
              />
            </div>
            <div>
              <Label>주말 가격</Label>
              <Input
                type="number"
                placeholder="130000"
                value={bulkEditForm.weekend_price_krw}
                onChange={(e) => setBulkEditForm(prev => ({ ...prev, weekend_price_krw: e.target.value }))}
              />
            </div>
            <div>
              <Label>특가</Label>
              <Input
                type="number"
                placeholder="80000"
                value={bulkEditForm.special_price_krw}
                onChange={(e) => setBulkEditForm(prev => ({ ...prev, special_price_krw: e.target.value }))}
              />
            </div>
            <div>
              <Label>최소 숙박일</Label>
              <Input
                type="number"
                value={bulkEditForm.min_stay_nights}
                onChange={(e) => setBulkEditForm(prev => ({ ...prev, min_stay_nights: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkEditOpen(false)}>취소</Button>
            <Button onClick={handleBulkEdit}>적용</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 판매 중지/재개 모달 */}
      <Dialog open={isCloseOutOpen} onOpenChange={setIsCloseOutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>판매 중지/재개</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>작업</Label>
              <Select
                value={closeOutForm.action}
                onValueChange={(val: 'close' | 'open') => setCloseOutForm(prev => ({ ...prev, action: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="close">판매 중지</SelectItem>
                  <SelectItem value="open">판매 재개</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>시작일</Label>
                <Input
                  type="date"
                  value={closeOutForm.start_date}
                  onChange={(e) => setCloseOutForm(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>종료일</Label>
                <Input
                  type="date"
                  value={closeOutForm.end_date}
                  onChange={(e) => setCloseOutForm(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>
            {closeOutForm.action === 'close' && (
              <div>
                <Label>중지 사유</Label>
                <Input
                  placeholder="예: 객실 수리 공사"
                  value={closeOutForm.close_out_reason}
                  onChange={(e) => setCloseOutForm(prev => ({ ...prev, close_out_reason: e.target.value }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloseOutOpen(false)}>취소</Button>
            <Button onClick={handleCloseOut} variant={closeOutForm.action === 'close' ? 'destructive' : 'default'}>
              {closeOutForm.action === 'close' ? '중지' : '재개'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

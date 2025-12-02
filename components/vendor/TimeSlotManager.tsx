/**
 * 시간대 관리 컴포넌트
 *
 * 음식점, 관광지, 체험, 행사 등에서 시간대별 예약 가능 인원을 관리
 * - 시간대 추가/수정/삭제
 * - 시간대별 수용 인원(재고) 설정
 * - 기본 재고 5개
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Clock,
  Users,
  Loader2,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';

interface TimeSlot {
  id?: number;
  listing_id: number;
  option_type: 'time_slot';
  name: string;
  description?: string;
  price: number;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  max_capacity: number;
  available_count: number;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
}

interface Listing {
  id: number;
  title: string;
  category?: string;
}

interface TimeSlotManagerProps {
  listings: Listing[];
  categoryLabel?: string;
  defaultCapacity?: number;
}

// 일반적인 식당 영업 시간대
const DEFAULT_TIME_SLOTS = [
  { start: '11:00', end: '12:00', name: '점심 11시' },
  { start: '12:00', end: '13:00', name: '점심 12시' },
  { start: '13:00', end: '14:00', name: '점심 1시' },
  { start: '17:00', end: '18:00', name: '저녁 5시' },
  { start: '18:00', end: '19:00', name: '저녁 6시' },
  { start: '19:00', end: '20:00', name: '저녁 7시' },
  { start: '20:00', end: '21:00', name: '저녁 8시' },
];

export default function TimeSlotManager({
  listings,
  categoryLabel = '시간대',
  defaultCapacity = 5
}: TimeSlotManagerProps) {
  const [selectedListing, setSelectedListing] = useState<number | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // 새 시간대 기본값
  const getEmptyTimeSlot = (): Partial<TimeSlot> => ({
    listing_id: selectedListing || 0,
    option_type: 'time_slot',
    name: '',
    description: '',
    price: 0,
    start_time: '12:00',
    end_time: '13:00',
    duration_minutes: 60,
    max_capacity: defaultCapacity,
    available_count: defaultCapacity,
    is_active: true,
    is_default: false,
    sort_order: timeSlots.length
  });

  const [newSlot, setNewSlot] = useState<Partial<TimeSlot>>(getEmptyTimeSlot());

  // 시간대 목록 조회
  const fetchTimeSlots = useCallback(async () => {
    if (!selectedListing) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/listings/options?listing_id=${selectedListing}&option_type=time_slot`);
      const result = await response.json();

      if (result.success) {
        setTimeSlots(result.data || []);
      } else {
        toast.error('시간대 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to fetch time slots:', error);
      toast.error('시간대 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [selectedListing]);

  useEffect(() => {
    if (selectedListing) {
      fetchTimeSlots();
    } else {
      setTimeSlots([]);
    }
  }, [selectedListing, fetchTimeSlots]);

  // 시간대 추가
  const handleAddTimeSlot = async () => {
    if (!selectedListing || !newSlot.start_time) {
      toast.error('상품과 시작 시간을 선택해주세요.');
      return;
    }

    // 이름 자동 생성
    const name = newSlot.name || `${newSlot.start_time?.slice(0, 5)} 예약`;

    setLoading(true);
    try {
      const response = await fetch('/api/listings/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSlot,
          name,
          listing_id: selectedListing,
          option_type: 'time_slot',
          price_type: 'fixed'
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('시간대가 추가되었습니다.');
        setNewSlot(getEmptyTimeSlot());
        setIsAddingNew(false);
        fetchTimeSlots();
      } else {
        toast.error(result.error || '시간대 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to add time slot:', error);
      toast.error('시간대 추가에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 기본 시간대 일괄 추가
  const handleAddDefaultSlots = async () => {
    if (!selectedListing) {
      toast.error('상품을 먼저 선택해주세요.');
      return;
    }

    if (!confirm(`기본 시간대 ${DEFAULT_TIME_SLOTS.length}개를 추가하시겠습니까?`)) return;

    setLoading(true);
    try {
      for (let i = 0; i < DEFAULT_TIME_SLOTS.length; i++) {
        const slot = DEFAULT_TIME_SLOTS[i];
        await fetch('/api/listings/options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listing_id: selectedListing,
            option_type: 'time_slot',
            name: slot.name,
            start_time: slot.start,
            end_time: slot.end,
            duration_minutes: 60,
            max_capacity: defaultCapacity,
            available_count: defaultCapacity,
            price: 0,
            price_type: 'fixed',
            is_active: true,
            is_default: i === 0,
            sort_order: i
          })
        });
      }

      toast.success(`기본 시간대 ${DEFAULT_TIME_SLOTS.length}개가 추가되었습니다.`);
      fetchTimeSlots();
    } catch (error) {
      console.error('Failed to add default slots:', error);
      toast.error('기본 시간대 추가에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 시간대 수정
  const handleUpdateTimeSlot = async () => {
    if (!editingSlot?.id) return;

    setLoading(true);
    try {
      const response = await fetch('/api/listings/options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSlot)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('시간대가 수정되었습니다.');
        setEditingSlot(null);
        fetchTimeSlots();
      } else {
        toast.error(result.error || '시간대 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update time slot:', error);
      toast.error('시간대 수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 시간대 삭제
  const handleDeleteTimeSlot = async (slotId: number) => {
    if (!confirm('이 시간대를 삭제하시겠습니까?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/listings/options?id=${slotId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        toast.success('시간대가 삭제되었습니다.');
        fetchTimeSlots();
      } else {
        toast.error(result.error || '시간대 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete time slot:', error);
      toast.error('시간대 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 재고 빠른 수정
  const handleQuickUpdateStock = async (slotId: number, newCount: number) => {
    try {
      const response = await fetch('/api/listings/options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: slotId,
          available_count: Math.max(0, newCount)
        })
      });

      const result = await response.json();

      if (result.success) {
        // 로컬 상태 즉시 업데이트
        setTimeSlots(prev => prev.map(slot =>
          slot.id === slotId ? { ...slot, available_count: Math.max(0, newCount) } : slot
        ));
      }
    } catch (error) {
      console.error('Failed to update stock:', error);
    }
  };

  // 시간대 입력 폼
  const renderTimeSlotForm = (
    slot: Partial<TimeSlot>,
    onChange: (field: string, value: any) => void,
    onSave: () => void,
    onCancel: () => void
  ) => (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 이름 */}
        <div>
          <label className="block text-sm font-medium mb-1">시간대 이름</label>
          <Input
            value={slot.name || ''}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="예: 점심 12시, 저녁 6시"
          />
        </div>

        {/* 추가 요금 */}
        <div>
          <label className="block text-sm font-medium mb-1">추가 요금</label>
          <Input
            type="number"
            value={slot.price || 0}
            onChange={(e) => onChange('price', parseInt(e.target.value) || 0)}
            placeholder="0"
          />
          <p className="text-xs text-gray-500 mt-1">시간대별 추가 요금 (없으면 0)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* 시작 시간 */}
        <div>
          <label className="block text-sm font-medium mb-1">시작 시간 *</label>
          <Input
            type="time"
            value={slot.start_time || '12:00'}
            onChange={(e) => onChange('start_time', e.target.value)}
          />
        </div>

        {/* 종료 시간 */}
        <div>
          <label className="block text-sm font-medium mb-1">종료 시간</label>
          <Input
            type="time"
            value={slot.end_time || ''}
            onChange={(e) => onChange('end_time', e.target.value)}
          />
        </div>

        {/* 최대 수용 인원 */}
        <div>
          <label className="block text-sm font-medium mb-1">최대 인원</label>
          <Input
            type="number"
            value={slot.max_capacity || defaultCapacity}
            onChange={(e) => {
              const val = parseInt(e.target.value) || defaultCapacity;
              onChange('max_capacity', val);
              // available_count도 함께 업데이트
              if (!slot.id) {
                onChange('available_count', val);
              }
            }}
            min={1}
          />
        </div>

        {/* 현재 가능 인원 */}
        <div>
          <label className="block text-sm font-medium mb-1">현재 가능 인원</label>
          <Input
            type="number"
            value={slot.available_count ?? slot.max_capacity ?? defaultCapacity}
            onChange={(e) => onChange('available_count', parseInt(e.target.value) || 0)}
            min={0}
            max={slot.max_capacity || 999}
          />
        </div>
      </div>

      {/* 기타 설정 */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={slot.is_default || false}
            onChange={(e) => onChange('is_default', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">기본 선택</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={slot.is_active !== false}
            onChange={(e) => onChange('is_active', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">활성화</span>
        </label>
      </div>

      {/* 버튼 */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" />
          취소
        </Button>
        <Button onClick={onSave} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          저장
        </Button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {categoryLabel} 관리
        </CardTitle>
        <CardDescription>
          예약 가능한 시간대와 수용 인원을 설정하세요 (기본 {defaultCapacity}명)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 상품 선택 */}
        <div>
          <label className="block text-sm font-medium mb-2">상품 선택</label>
          <Select
            value={selectedListing?.toString() || ''}
            onValueChange={(value) => {
              setSelectedListing(parseInt(value));
              setIsAddingNew(false);
              setEditingSlot(null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="시간대를 관리할 상품을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {listings.map((listing) => (
                <SelectItem key={listing.id} value={listing.id.toString()}>
                  {listing.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedListing && (
          <>
            {/* 버튼 그룹 */}
            {!isAddingNew && (
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => {
                  setIsAddingNew(true);
                  setNewSlot(getEmptyTimeSlot());
                }}>
                  <Plus className="h-4 w-4 mr-1" />
                  시간대 추가
                </Button>
                {timeSlots.length === 0 && (
                  <Button variant="outline" onClick={handleAddDefaultSlots}>
                    <Copy className="h-4 w-4 mr-1" />
                    기본 시간대 일괄 추가
                  </Button>
                )}
              </div>
            )}

            {/* 새 시간대 추가 폼 */}
            {isAddingNew && renderTimeSlotForm(
              newSlot,
              (field, value) => setNewSlot(prev => ({ ...prev, [field]: value })),
              handleAddTimeSlot,
              () => setIsAddingNew(false)
            )}

            {/* 시간대 목록 */}
            {loading && !isAddingNew ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                등록된 시간대가 없습니다.<br />
                <span className="text-sm">시간대를 추가하거나 기본 시간대를 일괄 추가하세요.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {/* 헤더 */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-600">
                  <div className="col-span-3">시간대</div>
                  <div className="col-span-2">이름</div>
                  <div className="col-span-2 text-center">추가요금</div>
                  <div className="col-span-3 text-center">가능 인원 / 최대</div>
                  <div className="col-span-2 text-center">관리</div>
                </div>

                {timeSlots.map((slot) => (
                  <div key={slot.id}>
                    {editingSlot?.id === slot.id ? (
                      renderTimeSlotForm(
                        editingSlot,
                        (field, value) => setEditingSlot(prev => prev ? { ...prev, [field]: value } : null),
                        handleUpdateTimeSlot,
                        () => setEditingSlot(null)
                      )
                    ) : (
                      <div className={`grid grid-cols-12 gap-2 items-center p-4 border rounded-lg ${
                        slot.is_active === false ? 'bg-gray-100 opacity-60' : 'hover:bg-gray-50'
                      }`}>
                        {/* 시간 */}
                        <div className="col-span-3 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {slot.start_time?.slice(0, 5)}
                            {slot.end_time && ` - ${slot.end_time.slice(0, 5)}`}
                          </span>
                        </div>

                        {/* 이름 */}
                        <div className="col-span-2">
                          <span className="text-sm">{slot.name}</span>
                          {slot.is_default && (
                            <Badge variant="secondary" className="ml-1 text-xs">기본</Badge>
                          )}
                        </div>

                        {/* 추가요금 */}
                        <div className="col-span-2 text-center">
                          {slot.price > 0 ? (
                            <span className="text-blue-600 font-medium">+{slot.price.toLocaleString()}원</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>

                        {/* 가능 인원 (빠른 수정) */}
                        <div className="col-span-3 flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleQuickUpdateStock(slot.id!, slot.available_count - 1)}
                            disabled={slot.available_count <= 0}
                          >
                            -
                          </Button>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={slot.available_count}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val)) {
                                  handleQuickUpdateStock(slot.id!, val);
                                }
                              }}
                              className="w-16 h-8 text-center"
                              min={0}
                              max={slot.max_capacity}
                            />
                            <span className="text-gray-400">/</span>
                            <span className="text-gray-600">{slot.max_capacity}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleQuickUpdateStock(slot.id!, slot.available_count + 1)}
                            disabled={slot.available_count >= slot.max_capacity}
                          >
                            +
                          </Button>
                        </div>

                        {/* 관리 버튼 */}
                        <div className="col-span-2 flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingSlot(slot)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTimeSlot(slot.id!)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* 재고 초기화 버튼 */}
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!confirm('모든 시간대의 가능 인원을 최대 인원으로 초기화하시겠습니까?')) return;

                      setLoading(true);
                      try {
                        for (const slot of timeSlots) {
                          await fetch('/api/listings/options', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              id: slot.id,
                              available_count: slot.max_capacity
                            })
                          });
                        }
                        toast.success('모든 시간대 재고가 초기화되었습니다.');
                        fetchTimeSlots();
                      } catch (error) {
                        toast.error('재고 초기화에 실패했습니다.');
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    전체 재고 초기화
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

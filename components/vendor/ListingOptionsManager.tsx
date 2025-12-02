/**
 * 상품 옵션 관리 컴포넌트
 *
 * 기능:
 * - 메뉴 관리 (음식점)
 * - 시간대 관리 (관광지/체험/행사)
 * - 좌석 등급 관리 (행사)
 * - 패키지/추가 옵션 관리
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Clock,
  DollarSign,
  Users,
  Package,
  UtensilsCrossed,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface ListingOption {
  id?: number;
  listing_id: number;
  option_type: 'menu' | 'time_slot' | 'seat_class' | 'package' | 'addon';
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  price_type: 'fixed' | 'per_person' | 'per_group';
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  max_capacity?: number;
  available_count?: number;
  min_quantity?: number;
  max_quantity?: number;
  sort_order?: number;
  is_active?: boolean;
  is_default?: boolean;
}

interface Listing {
  id: number;
  title: string;
  category?: string;
}

interface ListingOptionsManagerProps {
  listings: Listing[];
  defaultOptionType?: 'menu' | 'time_slot' | 'seat_class' | 'package' | 'addon';
  categoryLabel?: string;
}

const OPTION_TYPE_LABELS: Record<string, string> = {
  menu: '메뉴',
  time_slot: '시간대',
  seat_class: '좌석 등급',
  package: '패키지',
  addon: '추가 옵션'
};

const PRICE_TYPE_LABELS: Record<string, string> = {
  fixed: '고정 가격',
  per_person: '1인당',
  per_group: '그룹당'
};

export default function ListingOptionsManager({
  listings,
  defaultOptionType = 'menu',
  categoryLabel = '옵션'
}: ListingOptionsManagerProps) {
  const [selectedListing, setSelectedListing] = useState<number | null>(null);
  const [options, setOptions] = useState<ListingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingOption, setEditingOption] = useState<ListingOption | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // 새 옵션 기본 양식
  const getEmptyOption = (): Partial<ListingOption> => ({
    listing_id: selectedListing || 0,
    option_type: defaultOptionType,
    name: '',
    description: '',
    price: 0,
    original_price: undefined,
    price_type: 'per_person',
    start_time: undefined,
    end_time: undefined,
    duration_minutes: undefined,
    max_capacity: undefined,
    available_count: undefined,
    min_quantity: 1,
    max_quantity: 10,
    sort_order: options.length,
    is_active: true,
    is_default: false
  });

  const [newOption, setNewOption] = useState<Partial<ListingOption>>(getEmptyOption());

  // 옵션 목록 조회
  const fetchOptions = useCallback(async () => {
    if (!selectedListing) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/listings/options?listing_id=${selectedListing}`);
      const result = await response.json();

      if (result.success) {
        setOptions(result.data || []);
      } else {
        toast.error('옵션 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to fetch options:', error);
      toast.error('옵션 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [selectedListing]);

  useEffect(() => {
    if (selectedListing) {
      fetchOptions();
    } else {
      setOptions([]);
    }
  }, [selectedListing, fetchOptions]);

  // 옵션 추가
  const handleAddOption = async () => {
    if (!selectedListing || !newOption.name) {
      toast.error('상품과 옵션명을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/listings/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newOption,
          listing_id: selectedListing
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('옵션이 추가되었습니다.');
        setNewOption(getEmptyOption());
        setIsAddingNew(false);
        fetchOptions();
      } else {
        toast.error(result.error || '옵션 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to add option:', error);
      toast.error('옵션 추가에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 옵션 수정
  const handleUpdateOption = async () => {
    if (!editingOption?.id) return;

    setLoading(true);
    try {
      const response = await fetch('/api/listings/options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingOption)
      });

      const result = await response.json();

      if (result.success) {
        toast.success('옵션이 수정되었습니다.');
        setEditingOption(null);
        fetchOptions();
      } else {
        toast.error(result.error || '옵션 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update option:', error);
      toast.error('옵션 수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 옵션 삭제
  const handleDeleteOption = async (optionId: number) => {
    if (!confirm('이 옵션을 삭제하시겠습니까?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/listings/options?id=${optionId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        toast.success('옵션이 삭제되었습니다.');
        fetchOptions();
      } else {
        toast.error(result.error || '옵션 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete option:', error);
      toast.error('옵션 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 옵션 타입 아이콘
  const getOptionTypeIcon = (type: string) => {
    switch (type) {
      case 'menu': return <UtensilsCrossed className="h-4 w-4" />;
      case 'time_slot': return <Clock className="h-4 w-4" />;
      case 'seat_class': return <Users className="h-4 w-4" />;
      case 'package': return <Package className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  // 옵션 입력 폼
  const renderOptionForm = (
    option: Partial<ListingOption>,
    onChange: (field: string, value: any) => void,
    onSave: () => void,
    onCancel: () => void
  ) => (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 옵션 타입 */}
        <div>
          <label className="block text-sm font-medium mb-1">옵션 유형</label>
          <Select
            value={option.option_type}
            onValueChange={(value) => onChange('option_type', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="옵션 유형 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="menu">메뉴</SelectItem>
              <SelectItem value="time_slot">시간대</SelectItem>
              <SelectItem value="seat_class">좌석 등급</SelectItem>
              <SelectItem value="package">패키지</SelectItem>
              <SelectItem value="addon">추가 옵션</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 옵션명 */}
        <div>
          <label className="block text-sm font-medium mb-1">옵션명 *</label>
          <Input
            value={option.name || ''}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="예: 한정식 코스, 오전 10시, VIP석"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">설명</label>
        <Textarea
          value={option.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="옵션에 대한 상세 설명"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 가격 */}
        <div>
          <label className="block text-sm font-medium mb-1">가격 *</label>
          <Input
            type="number"
            value={option.price || 0}
            onChange={(e) => onChange('price', parseInt(e.target.value) || 0)}
            placeholder="0"
          />
        </div>

        {/* 원래 가격 (할인 표시용) */}
        <div>
          <label className="block text-sm font-medium mb-1">원가 (할인전)</label>
          <Input
            type="number"
            value={option.original_price || ''}
            onChange={(e) => onChange('original_price', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="할인전 가격"
          />
        </div>

        {/* 가격 타입 */}
        <div>
          <label className="block text-sm font-medium mb-1">가격 유형</label>
          <Select
            value={option.price_type || 'per_person'}
            onValueChange={(value) => onChange('price_type', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">고정 가격</SelectItem>
              <SelectItem value="per_person">1인당</SelectItem>
              <SelectItem value="per_group">그룹당</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 시간대 옵션 */}
      {option.option_type === 'time_slot' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">시작 시간</label>
            <Input
              type="time"
              value={option.start_time || ''}
              onChange={(e) => onChange('start_time', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">종료 시간</label>
            <Input
              type="time"
              value={option.end_time || ''}
              onChange={(e) => onChange('end_time', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">소요 시간 (분)</label>
            <Input
              type="number"
              value={option.duration_minutes || ''}
              onChange={(e) => onChange('duration_minutes', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="예: 60"
            />
          </div>
        </div>
      )}

      {/* 수량/인원 제한 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">최대 인원</label>
          <Input
            type="number"
            value={option.max_capacity || ''}
            onChange={(e) => onChange('max_capacity', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="무제한"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">남은 수량</label>
          <Input
            type="number"
            value={option.available_count || ''}
            onChange={(e) => onChange('available_count', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="무제한"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">최소 주문</label>
          <Input
            type="number"
            value={option.min_quantity || 1}
            onChange={(e) => onChange('min_quantity', parseInt(e.target.value) || 1)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">최대 주문</label>
          <Input
            type="number"
            value={option.max_quantity || 10}
            onChange={(e) => onChange('max_quantity', parseInt(e.target.value) || 10)}
          />
        </div>
      </div>

      {/* 기타 설정 */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={option.is_default || false}
            onChange={(e) => onChange('is_default', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">기본 선택</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={option.is_active !== false}
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
          {getOptionTypeIcon(defaultOptionType)}
          {categoryLabel} 관리
        </CardTitle>
        <CardDescription>
          상품별 {categoryLabel}을(를) 추가하고 관리하세요
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
              setEditingOption(null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="옵션을 관리할 상품을 선택하세요" />
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
            {/* 옵션 추가 버튼 */}
            {!isAddingNew && (
              <Button onClick={() => {
                setIsAddingNew(true);
                setNewOption(getEmptyOption());
              }}>
                <Plus className="h-4 w-4 mr-1" />
                {categoryLabel} 추가
              </Button>
            )}

            {/* 새 옵션 추가 폼 */}
            {isAddingNew && renderOptionForm(
              newOption,
              (field, value) => setNewOption(prev => ({ ...prev, [field]: value })),
              handleAddOption,
              () => setIsAddingNew(false)
            )}

            {/* 옵션 목록 */}
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : options.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                등록된 {categoryLabel}이(가) 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {options.map((option) => (
                  <div key={option.id}>
                    {editingOption?.id === option.id ? (
                      renderOptionForm(
                        editingOption,
                        (field, value) => setEditingOption(prev => prev ? { ...prev, [field]: value } : null),
                        handleUpdateOption,
                        () => setEditingOption(null)
                      )
                    ) : (
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          {getOptionTypeIcon(option.option_type)}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{option.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {OPTION_TYPE_LABELS[option.option_type]}
                              </Badge>
                              {option.is_default && (
                                <Badge variant="secondary" className="text-xs">기본</Badge>
                              )}
                              {option.is_active === false && (
                                <Badge variant="destructive" className="text-xs">비활성</Badge>
                              )}
                            </div>
                            {option.description && (
                              <p className="text-sm text-gray-500">{option.description}</p>
                            )}
                            {option.start_time && (
                              <p className="text-sm text-gray-500">
                                {option.start_time.slice(0, 5)}
                                {option.end_time && ` - ${option.end_time.slice(0, 5)}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-semibold text-blue-600">
                              {option.price?.toLocaleString()}원
                            </div>
                            {option.original_price && option.original_price > option.price && (
                              <div className="text-xs text-gray-400 line-through">
                                {option.original_price.toLocaleString()}원
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              {PRICE_TYPE_LABELS[option.price_type]}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingOption(option)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteOption(option.id!)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

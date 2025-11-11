import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import {
  Plus,
  Edit2,
  Trash2,
  Shield,
  DollarSign,
  FileText,
  CheckCircle2,
  XCircle,
  Search,
  Filter
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Textarea } from '../../ui/textarea';

interface Insurance {
  id: number;
  name: string;
  category: string;
  price: number;
  pricing_unit: 'fixed' | 'hourly' | 'daily';
  coverage_amount: number;
  vendor_id: number | null;
  vehicle_id: number | null;
  description: string;
  coverage_details: {
    items: string[];
    exclusions?: string[];
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: 'all', label: '전체 카테고리' },
  { value: 'tour', label: '투어/여행' },
  { value: 'rentcar', label: '렌트카' },
  { value: 'stay', label: '숙박' },
  { value: 'experience', label: '체험' },
  { value: 'food', label: '맛집' },
  { value: 'attractions', label: '관광명소' },
];

export function AdminInsurance() {
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState<Insurance | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'tour',
    price: 0,
    pricing_unit: 'fixed' as 'fixed' | 'hourly' | 'daily',
    coverage_amount: 0,
    vendor_id: '',
    vehicle_id: '',
    description: '',
    coverage_items: '',
    coverage_exclusions: '',
    is_active: true
  });

  useEffect(() => {
    fetchInsurances();
  }, []);

  const fetchInsurances = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/admin/insurance', {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      const data = await response.json();

      if (data.success) {
        setInsurances(data.data || []);
      } else {
        console.error('Failed to fetch insurances:', data.message || data.error);
        alert('보험 목록 조회 실패: ' + (data.message || data.error));
      }
    } catch (error) {
      console.error('Error fetching insurances:', error instanceof Error ? error.message : String(error));
      alert('보험 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (insurance?: Insurance) => {
    if (insurance) {
      setEditingInsurance(insurance);
      setFormData({
        name: insurance.name,
        category: insurance.category,
        price: insurance.price,
        pricing_unit: insurance.pricing_unit || 'fixed',
        coverage_amount: insurance.coverage_amount,
        vendor_id: insurance.vendor_id?.toString() || '',
        vehicle_id: insurance.vehicle_id?.toString() || '',
        description: insurance.description,
        coverage_items: (insurance.coverage_details?.items || []).join('\n'),
        coverage_exclusions: (insurance.coverage_details?.exclusions || []).join('\n'),
        is_active: insurance.is_active
      });
    } else {
      setEditingInsurance(null);
      setFormData({
        name: '',
        category: 'tour',
        price: 0,
        pricing_unit: 'fixed',
        coverage_amount: 0,
        vendor_id: '',
        vehicle_id: '',
        description: '',
        coverage_items: '',
        coverage_exclusions: '',
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingInsurance(null);
  };

  const handleSubmit = async () => {
    try {
      const insuranceData = {
        name: formData.name,
        category: formData.category,
        price: Number(formData.price),
        pricing_unit: formData.pricing_unit,
        coverage_amount: Number(formData.coverage_amount),
        vendor_id: formData.vendor_id ? Number(formData.vendor_id) : null,
        vehicle_id: formData.vehicle_id ? Number(formData.vehicle_id) : null,
        description: formData.description,
        coverage_details: {
          items: formData.coverage_items.split('\n').filter(item => item.trim()),
          exclusions: formData.coverage_exclusions.split('\n').filter(item => item.trim())
        },
        is_active: formData.is_active
      };

      const url = editingInsurance
        ? `/api/admin/insurance/${editingInsurance.id}`
        : '/api/admin/insurance';

      const method = editingInsurance ? 'PUT' : 'POST';

      const token = localStorage.getItem('auth_token');
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(insuranceData)
      });

      const data = await response.json();

      if (data.success) {
        alert(editingInsurance ? '보험이 수정되었습니다.' : '보험이 추가되었습니다.');
        handleCloseModal();
        fetchInsurances();
      } else {
        alert('오류: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving insurance:', error);
      alert('보험 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 이 보험을 삭제하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/insurance/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      const data = await response.json();

      if (data.success) {
        alert('보험이 삭제되었습니다.');
        fetchInsurances();
      } else {
        alert('오류: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting insurance:', error);
      alert('보험 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleToggleActive = async (insurance: Insurance) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/insurance/${insurance.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ ...insurance, is_active: !insurance.is_active })
      });

      const data = await response.json();

      if (data.success) {
        fetchInsurances();
      } else {
        alert('오류: ' + (data.message || data.error));
      }
    } catch (error) {
      console.error('Error toggling active status:', error);
      alert('보험 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const filteredInsurances = insurances.filter(insurance => {
    const matchesSearch = insurance.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         insurance.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || insurance.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.label || category;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">보험 목록을 불러오는 중...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-600" />
                보험 관리
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                여행, 렌트카, 숙박 등 다양한 카테고리의 보험 상품을 관리합니다
              </p>
            </div>
            <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              보험 추가
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="보험명 또는 설명으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insurance List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInsurances.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                등록된 보험이 없습니다. 새로운 보험을 추가해보세요.
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredInsurances.map(insurance => (
            <Card key={insurance.id} className={`relative ${!insurance.is_active ? 'opacity-60' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      {insurance.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{getCategoryLabel(insurance.category)}</Badge>
                      {insurance.is_active ? (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          활성화
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          비활성화
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">{insurance.description}</p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">보험료:</span>
                    <span className="font-semibold text-blue-600">
                      {insurance.price.toLocaleString()}원
                      {insurance.pricing_unit === 'hourly' && '/시간'}
                      {insurance.pricing_unit === 'daily' && '/일'}
                      {insurance.pricing_unit === 'fixed' && ' (고정)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">최대 보장액:</span>
                    <span className="font-semibold">
                      {insurance.coverage_amount.toLocaleString()}원
                    </span>
                  </div>
                  {(insurance.vendor_id || insurance.vehicle_id) && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">적용 대상:</span>
                      <span className="text-xs">
                        {insurance.vendor_id && `벤더:${insurance.vendor_id}`}
                        {insurance.vehicle_id && ` 차량:${insurance.vehicle_id}`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-3">
                  <div className="text-sm font-semibold text-gray-700 mb-2">보장 내용:</div>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {(insurance.coverage_details?.items || []).slice(0, 3).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                    {(insurance.coverage_details?.items?.length || 0) > 3 && (
                      <li className="text-gray-400">...외 {(insurance.coverage_details?.items?.length || 0) - 3}건</li>
                    )}
                  </ul>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenModal(insurance)}
                    className="flex-1"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    수정
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(insurance)}
                    className={insurance.is_active ? 'text-orange-600' : 'text-green-600'}
                  >
                    {insurance.is_active ? '비활성화' : '활성화'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(insurance.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              {editingInsurance ? '보험 수정' : '새 보험 추가'}
            </DialogTitle>
            <DialogDescription>
              {editingInsurance ? '보험 정보를 수정합니다.' : '새로운 보험 상품을 추가합니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">보험명 *</Label>
                <Input
                  id="name"
                  placeholder="여행자 보험"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">카테고리 *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter(c => c.value !== 'all').map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">보험료 (원) *</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="10000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricing_unit">가격 단위 *</Label>
                <Select value={formData.pricing_unit} onValueChange={(value) => setFormData({ ...formData, pricing_unit: value as 'fixed' | 'hourly' | 'daily' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">고정 (1회)</SelectItem>
                    <SelectItem value="hourly">시간당</SelectItem>
                    <SelectItem value="daily">일당</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  렌트카: hourly/daily, 투어: fixed
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coverage_amount">최대 보장액 (원)</Label>
                <Input
                  id="coverage_amount"
                  type="number"
                  placeholder="10000000"
                  value={formData.coverage_amount}
                  onChange={(e) => setFormData({ ...formData, coverage_amount: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor_id">벤더 ID (선택)</Label>
                <Input
                  id="vendor_id"
                  type="number"
                  placeholder="특정 벤더 전용인 경우"
                  value={formData.vendor_id}
                  onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                />
                <p className="text-xs text-gray-500">
                  비워두면 모든 벤더 공용
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle_id">차량 ID (선택)</Label>
                <Input
                  id="vehicle_id"
                  type="number"
                  placeholder="특정 차량 전용인 경우"
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                />
                <p className="text-xs text-gray-500">
                  비워두면 벤더 전체 차량 적용
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">보험 설명 *</Label>
              <Textarea
                id="description"
                placeholder="보험에 대한 간단한 설명을 입력하세요"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverage_items">보장 내용 (줄바꿈으로 구분) *</Label>
              <Textarea
                id="coverage_items"
                placeholder="여행 중 상해 보장&#10;질병 치료비 보장&#10;휴대품 손해 보장"
                value={formData.coverage_items}
                onChange={(e) => setFormData({ ...formData, coverage_items: e.target.value })}
                rows={5}
              />
              <p className="text-xs text-gray-500">각 항목을 줄바꿈으로 구분하여 입력하세요</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverage_exclusions">보장 제외 항목 (선택사항)</Label>
              <Textarea
                id="coverage_exclusions"
                placeholder="전쟁, 내란으로 인한 손해&#10;고의적인 사고&#10;음주 운전"
                value={formData.coverage_exclusions}
                onChange={(e) => setFormData({ ...formData, coverage_exclusions: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="is_active">활성화</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              취소
            </Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
              {editingInsurance ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

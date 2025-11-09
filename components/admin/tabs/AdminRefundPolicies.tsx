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
  FileText,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Calendar
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

interface RefundPolicy {
  id: number;
  policy_name: string;
  category: string | null;
  listing_id: number | null;
  is_refundable: boolean;
  refund_policy_json: {
    rules: {
      days_before: number;
      fee_rate: number;
      description: string;
    }[];
    past_booking_refundable: boolean;
    notes?: string[];
  };
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: 'all', label: '전체 카테고리' },
  { value: 'null', label: '공통 정책' },
  { value: 'tour', label: '투어/여행' },
  { value: 'rentcar', label: '렌트카' },
  { value: 'stay', label: '숙박' },
  { value: 'experience', label: '체험' },
  { value: 'food', label: '맛집' },
  { value: 'attractions', label: '관광명소' },
  { value: 'popup', label: '팝업' },
];

export function AdminRefundPolicies() {
  const [policies, setPolicies] = useState<RefundPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<RefundPolicy | null>(null);
  const [formData, setFormData] = useState({
    policy_name: '',
    category: '',
    is_refundable: true,
    rules: '',
    notes: '',
    priority: 10
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/admin/refund-policies', {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      const data = await response.json();

      if (data.success) {
        setPolicies(data.data || []);
      } else {
        console.error('Failed to fetch policies:', data.error);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (policy?: RefundPolicy) => {
    if (policy) {
      setEditingPolicy(policy);
      setFormData({
        policy_name: policy.policy_name,
        category: policy.category || '',
        is_refundable: policy.is_refundable,
        rules: policy.refund_policy_json.rules
          .map(r => `${r.days_before}일 전|${r.fee_rate * 100}%|${r.description}`)
          .join('\n'),
        notes: policy.refund_policy_json.notes?.join('\n') || '',
        priority: policy.priority
      });
    } else {
      setEditingPolicy(null);
      setFormData({
        policy_name: '',
        category: 'tour',
        is_refundable: true,
        rules: '7|0|무료 취소\n3|50|50% 환불\n0|100|환불 불가',
        notes: '',
        priority: 10
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPolicy(null);
  };

  const handleSubmit = async () => {
    try {
      // 규칙 파싱
      const parsedRules = formData.rules.split('\n').filter(line => line.trim()).map(line => {
        const parts = line.split('|').map(p => p.trim());
        return {
          days_before: parseInt(parts[0]),
          fee_rate: parseFloat(parts[1]) / 100,
          description: parts[2]
        };
      });

      // 노트 파싱
      const parsedNotes = formData.notes.split('\n').filter(line => line.trim());

      const policyData = {
        policy_name: formData.policy_name,
        category: formData.category || null,
        is_refundable: formData.is_refundable,
        refund_policy_json: {
          rules: parsedRules,
          past_booking_refundable: false,
          notes: parsedNotes
        },
        priority: formData.priority
      };

      const url = editingPolicy
        ? `/api/admin/refund-policies/${editingPolicy.id}`
        : '/api/admin/refund-policies';

      const method = editingPolicy ? 'PUT' : 'POST';

      const token = localStorage.getItem('auth_token');
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(policyData)
      });

      const data = await response.json();

      if (data.success) {
        alert(editingPolicy ? '환불 정책이 수정되었습니다.' : '환불 정책이 추가되었습니다.');
        handleCloseModal();
        fetchPolicies();
      } else {
        alert('오류: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving policy:', error);
      alert('환불 정책 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 이 환불 정책을 삭제하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/refund-policies/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      const data = await response.json();

      if (data.success) {
        alert('환불 정책이 삭제되었습니다.');
        fetchPolicies();
      } else {
        alert('오류: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting policy:', error);
      alert('환불 정책 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleToggleActive = async (policy: RefundPolicy) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/refund-policies/${policy.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ ...policy, is_active: !policy.is_active })
      });

      const data = await response.json();

      if (data.success) {
        fetchPolicies();
      } else {
        alert('오류: ' + data.error);
      }
    } catch (error) {
      console.error('Error toggling active status:', error);
    }
  };

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = policy.policy_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' ||
                           (filterCategory === 'null' && !policy.category) ||
                           policy.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (category: string | null) => {
    if (!category) return '공통';
    return CATEGORIES.find(c => c.value === category)?.label || category;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">환불 정책 목록을 불러오는 중...</div>
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
                <FileText className="h-6 w-6 text-blue-600" />
                환불 정책 관리
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                카테고리별 환불 정책을 관리하고, 상품에 적용할 수 있습니다
              </p>
            </div>
            <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              정책 추가
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
                placeholder="정책명으로 검색..."
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

      {/* Policy List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPolicies.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                등록된 환불 정책이 없습니다. 새로운 정책을 추가해보세요.
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredPolicies.map(policy => (
            <Card key={policy.id} className={`relative ${!policy.is_active ? 'opacity-60' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      {policy.policy_name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{getCategoryLabel(policy.category)}</Badge>
                      {policy.is_refundable ? (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          환불 가능
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          환불 불가
                        </Badge>
                      )}
                      {policy.is_active ? (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-300">활성</Badge>
                      ) : (
                        <Badge variant="secondary">비활성</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-gray-700">환불 규칙:</div>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {policy.refund_policy_json.rules.slice(0, 3).map((rule, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <Calendar className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong>{rule.days_before}일 전:</strong>{' '}
                          {rule.fee_rate === 0 ? '무료 취소' :
                           rule.fee_rate === 1 ? '환불 불가' :
                           `${(1 - rule.fee_rate) * 100}% 환불`}
                        </span>
                      </li>
                    ))}
                    {policy.refund_policy_json.rules.length > 3 && (
                      <li className="text-gray-400">...외 {policy.refund_policy_json.rules.length - 3}건</li>
                    )}
                  </ul>
                </div>

                {policy.refund_policy_json.notes && policy.refund_policy_json.notes.length > 0 && (
                  <div className="border-t pt-3">
                    <div className="text-sm font-semibold text-gray-700 mb-1">참고사항:</div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {policy.refund_policy_json.notes.slice(0, 2).map((note, idx) => (
                        <li key={idx}>• {note}</li>
                      ))}
                      {policy.refund_policy_json.notes.length > 2 && (
                        <li className="text-gray-400">...외 {policy.refund_policy_json.notes.length - 2}건</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenModal(policy)}
                    className="flex-1"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    수정
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(policy)}
                    className={policy.is_active ? 'text-orange-600' : 'text-green-600'}
                  >
                    {policy.is_active ? '비활성화' : '활성화'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(policy.id)}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              {editingPolicy ? '환불 정책 수정' : '새 환불 정책 추가'}
            </DialogTitle>
            <DialogDescription>
              {editingPolicy ? '환불 정책 정보를 수정합니다.' : '새로운 환불 정책을 추가합니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="policy_name">정책명 *</Label>
                <Input
                  id="policy_name"
                  placeholder="여행/투어 기본 정책"
                  value={formData.policy_name}
                  onChange={(e) => setFormData({ ...formData, policy_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">카테고리</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">공통 정책</SelectItem>
                    {CATEGORIES.filter(c => c.value !== 'all' && c.value !== 'null').map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="is_refundable">환불 가능 여부</Label>
              <Select value={formData.is_refundable ? 'true' : 'false'} onValueChange={(value) => setFormData({ ...formData, is_refundable: value === 'true' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">환불 가능</SelectItem>
                  <SelectItem value="false">환불 불가</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">우선순위 (높을수록 우선)</Label>
              <Input
                id="priority"
                type="number"
                placeholder="10"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rules">환불 규칙 (한 줄에 하나씩) *</Label>
              <Textarea
                id="rules"
                placeholder="7|0|7일 전까지 무료 취소&#10;3|50|3-7일 전 50% 환불&#10;0|100|3일 이내 환불 불가"
                value={formData.rules}
                onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                rows={6}
              />
              <p className="text-xs text-gray-500">
                형식: 일수|수수료율(%)|설명 (예: "7|0|7일 전까지 무료 취소")
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">참고사항 (한 줄에 하나씩)</Label>
              <Textarea
                id="notes"
                placeholder="악천후 시 일정 변경 또는 전액 환불 가능&#10;최소 출발 인원 미달 시 취소 및 전액 환불"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              취소
            </Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
              {editingPolicy ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

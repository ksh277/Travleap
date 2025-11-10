/**
 * 벤더 렌트카 옵션 관리 페이지
 *
 * 벤더가 자신의 렌트카 추가 옵션(GPS, 카시트, 보험 등)을 관리
 */

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

interface Extra {
  id: number;
  vendor_id: number;
  name: string;
  description: string;
  category: string;
  price_krw: number;
  price_type: string;
  has_inventory: boolean;
  current_stock: number;
  max_quantity: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function VendorRentcarExtrasPage() {
  const [extras, setExtras] = useState<Extra[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'equipment',
    price_krw: '',
    price_type: 'per_rental',
    has_inventory: false,
    current_stock: '0',
    max_quantity: '10',
    display_order: '0',
    is_active: true
  });

  useEffect(() => {
    loadExtras();
  }, []);

  async function loadExtras() {
    try {
      setIsLoading(true);

      // JWT 토큰 가져오기
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];

      if (!token) {
        alert('로그인이 필요합니다');
        return;
      }

      const response = await fetch('/api/vendor/rentcar/extras', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();

      if (result.success) {
        setExtras(result.data.extras);
      } else {
        alert('옵션 목록을 불러오지 못했습니다');
      }
    } catch (error) {
      console.error('옵션 로드 실패:', error);
      alert('옵션 목록을 불러오는 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      category: 'equipment',
      price_krw: '',
      price_type: 'per_rental',
      has_inventory: false,
      current_stock: '0',
      max_quantity: '10',
      display_order: '0',
      is_active: true
    });
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(extra: Extra) {
    setFormData({
      name: extra.name,
      description: extra.description || '',
      category: extra.category,
      price_krw: extra.price_krw.toString(),
      price_type: extra.price_type,
      has_inventory: extra.has_inventory,
      current_stock: extra.current_stock.toString(),
      max_quantity: extra.max_quantity.toString(),
      display_order: extra.display_order.toString(),
      is_active: extra.is_active
    });
    setEditingId(extra.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name || !formData.price_krw) {
      alert('이름과 가격은 필수입니다');
      return;
    }

    try {
      // JWT 토큰 가져오기
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];

      if (!token) {
        alert('로그인이 필요합니다');
        return;
      }

      const method = editingId ? 'PUT' : 'POST';

      const payload: any = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price_krw: parseInt(formData.price_krw),
        price_type: formData.price_type,
        has_inventory: formData.has_inventory,
        current_stock: parseInt(formData.current_stock),
        max_quantity: parseInt(formData.max_quantity),
        display_order: parseInt(formData.display_order),
        is_active: formData.is_active
      };

      if (editingId) {
        payload.id = editingId;
      }

      const response = await fetch('/api/vendor/rentcar/extras', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        alert(editingId ? '옵션이 수정되었습니다' : '옵션이 추가되었습니다');
        resetForm();
        loadExtras();
      } else {
        alert(result.error || result.message || '작업 실패');
      }
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장 중 오류가 발생했습니다');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      // JWT 토큰 가져오기
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];

      if (!token) {
        alert('로그인이 필요합니다');
        return;
      }

      const response = await fetch(`/api/vendor/rentcar/extras?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        alert('삭제되었습니다');
        loadExtras();
      } else {
        alert(result.error || result.message || '삭제 실패');
      }
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다');
    }
  }

  const categoryLabels: Record<string, string> = {
    equipment: '장비',
    service: '서비스',
    driver: '운전자',
    insurance: '보험',
    misc: '기타'
  };

  const priceTypeLabels: Record<string, string> = {
    per_rental: '예약당',
    per_day: '일당',
    per_hour: '시간당',
    per_item: '개당'
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">렌트카 추가 옵션 관리</h1>
          <p className="text-gray-600">고객이 선택할 수 있는 추가 옵션을 관리하세요 (GPS, 카시트, 보험 등)</p>
        </div>

        {/* 추가 버튼 */}
        <div className="mb-6">
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            + 새 옵션 추가
          </Button>
        </div>

        {/* 폼 */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? '옵션 수정' : '새 옵션 추가'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">옵션 이름 *</label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="예: GPS 내비게이션"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">카테고리</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="equipment">장비</option>
                    <option value="service">서비스</option>
                    <option value="driver">운전자</option>
                    <option value="insurance">보험</option>
                    <option value="misc">기타</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">가격 (원) *</label>
                  <Input
                    type="number"
                    value={formData.price_krw}
                    onChange={(e) => setFormData({ ...formData, price_krw: e.target.value })}
                    placeholder="10000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">가격 유형</label>
                  <select
                    value={formData.price_type}
                    onChange={(e) => setFormData({ ...formData, price_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="per_rental">예약당</option>
                    <option value="per_day">일당</option>
                    <option value="per_hour">시간당</option>
                    <option value="per_item">개당</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">최대 수량</label>
                  <Input
                    type="number"
                    value={formData.max_quantity}
                    onChange={(e) => setFormData({ ...formData, max_quantity: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">표시 순서</label>
                  <Input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">설명</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="옵션에 대한 설명을 입력하세요"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.has_inventory}
                    onChange={(e) => setFormData({ ...formData, has_inventory: e.target.checked })}
                  />
                  <span className="text-sm">재고 관리</span>
                </label>

                {formData.has_inventory && (
                  <div className="flex-1">
                    <Input
                      type="number"
                      value={formData.current_stock}
                      onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                      placeholder="현재 재고"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span className="text-sm">활성화</span>
                </label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  {editingId ? '수정' : '추가'}
                </Button>
                <Button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700"
                >
                  취소
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* 목록 */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">등록된 옵션 ({extras.length}개)</h2>
          </div>

          {extras.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              등록된 옵션이 없습니다. 새 옵션을 추가해보세요.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {extras.map((extra) => (
                <div key={extra.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{extra.name}</h3>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          {categoryLabels[extra.category] || extra.category}
                        </span>
                        {!extra.is_active && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded">
                            비활성
                          </span>
                        )}
                      </div>
                      {extra.description && (
                        <p className="text-sm text-gray-600 mb-2">{extra.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="font-medium text-blue-600">
                          ₩{extra.price_krw.toLocaleString()} ({priceTypeLabels[extra.price_type]})
                        </span>
                        <span>최대 {extra.max_quantity}개</span>
                        {extra.has_inventory && (
                          <span>재고: {extra.current_stock}개</span>
                        )}
                        <span className="text-xs text-gray-400">순서: {extra.display_order}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={() => handleEdit(extra)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-3 py-1"
                      >
                        수정
                      </Button>
                      <Button
                        onClick={() => handleDelete(extra.id)}
                        className="bg-red-100 hover:bg-red-200 text-red-700 text-sm px-3 py-1"
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

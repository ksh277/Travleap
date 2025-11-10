import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface PricingPolicy {
  id?: number;
  policy_type: 'duration_discount' | 'day_of_week' | 'season' | 'early_bird';
  min_days?: number;
  max_days?: number;
  discount_percentage?: number;
  day_of_week?: string;
  price_multiplier?: number;
  season_name?: string;
  start_date?: string;
  end_date?: string;
  season_multiplier?: number;
  days_before_pickup?: number;
  early_bird_discount?: number;
  is_active: boolean;
}

interface InsuranceProduct {
  id?: number;
  insurance_name: string;
  insurance_type: 'basic' | 'cdw' | 'super_cdw' | 'full_coverage';
  description: string;
  coverage_limit: number;
  deductible: number;
  daily_price: number;
  is_included: boolean;
  is_active: boolean;
  display_order: number;
}

interface AdditionalOption {
  id?: number;
  option_name: string;
  option_type: 'navigation' | 'child_seat' | 'wifi' | 'snow_tire' | 'ski_rack' | 'other';
  description: string;
  daily_price: number;
  one_time_price: number;
  quantity_available: number;
  is_active: boolean;
  display_order: number;
}

export function VendorPricingSettings() {
  const [activeTab, setActiveTab] = useState<'discount' | 'insurance' | 'options'>('discount');

  // 요금 정책
  const [pricingPolicies, setPricingPolicies] = useState<PricingPolicy[]>([]);
  const [newPolicy, setNewPolicy] = useState<Partial<PricingPolicy>>({
    policy_type: 'duration_discount',
    is_active: true
  });

  // 보험 상품
  const [insurances, setInsurances] = useState<InsuranceProduct[]>([]);
  const [newInsurance, setNewInsurance] = useState<Partial<InsuranceProduct>>({
    insurance_type: 'basic',
    is_included: false,
    is_active: true,
    display_order: 0
  });

  // 추가 옵션
  const [options, setOptions] = useState<AdditionalOption[]>([]);
  const [newOption, setNewOption] = useState<Partial<AdditionalOption>>({
    option_type: 'navigation',
    quantity_available: 999,
    is_active: true,
    display_order: 0
  });

  useEffect(() => {
    loadPricingPolicies();
    loadInsurances();
    loadOptions();
  }, []);

  // 요금 정책 로드
  const loadPricingPolicies = async () => {
    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];

      if (!token) {
        toast.error('로그인이 필요합니다');
        return;
      }

      const response = await fetch('/api/vendor/pricing/policies', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();

      if (result.success) {
        setPricingPolicies(result.data);
      } else {
        throw new Error(result.message || '요금 정책 로드 실패');
      }
    } catch (error) {
      console.error('요금 정책 로드 실패:', error);
      toast.error(error instanceof Error ? error.message : '요금 정책 로드 실패');
    }
  };

  // 보험 상품 로드
  const loadInsurances = async () => {
    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];

      if (!token) {
        toast.error('로그인이 필요합니다');
        return;
      }

      const response = await fetch('/api/vendor/insurance', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();

      if (result.success) {
        setInsurances(result.data);
      } else {
        throw new Error(result.message || '보험 상품 로드 실패');
      }
    } catch (error) {
      console.error('보험 상품 로드 실패:', error);
      toast.error(error instanceof Error ? error.message : '보험 상품 로드 실패');
    }
  };

  // 추가 옵션 로드
  const loadOptions = async () => {
    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];

      if (!token) {
        toast.error('로그인이 필요합니다');
        return;
      }

      const response = await fetch('/api/vendor/options', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();

      if (result.success) {
        setOptions(result.data);
      } else {
        throw new Error(result.message || '추가 옵션 로드 실패');
      }
    } catch (error) {
      console.error('추가 옵션 로드 실패:', error);
      toast.error(error instanceof Error ? error.message : '추가 옵션 로드 실패');
    }
  };

  // 요금 정책 추가
  const addPricingPolicy = async () => {
    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];

      if (!token) {
        toast.error('로그인이 필요합니다');
        return;
      }

      const response = await fetch('/api/vendor/pricing/policies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newPolicy)
      });
      const result = await response.json();

      if (result.success) {
        toast.success('요금 정책이 추가되었습니다!');
        loadPricingPolicies();
        setNewPolicy({ policy_type: 'duration_discount', is_active: true });
      } else {
        throw new Error(result.message || '추가 실패');
      }
    } catch (error) {
      console.error('요금 정책 추가 실패:', error);
      toast.error(error instanceof Error ? error.message : '추가 실패');
    }
  };

  // 보험 상품 추가
  const addInsurance = async () => {
    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];

      if (!token) {
        toast.error('로그인이 필요합니다');
        return;
      }

      const response = await fetch('/api/vendor/insurance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newInsurance)
      });
      const result = await response.json();

      if (result.success) {
        toast.success('보험 상품이 추가되었습니다!');
        loadInsurances();
        setNewInsurance({
          insurance_type: 'basic',
          is_included: false,
          is_active: true,
          display_order: 0
        });
      } else {
        throw new Error(result.message || '추가 실패');
      }
    } catch (error) {
      console.error('보험 상품 추가 실패:', error);
      toast.error(error instanceof Error ? error.message : '추가 실패');
    }
  };

  // 추가 옵션 추가
  const addOption = async () => {
    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];

      if (!token) {
        toast.error('로그인이 필요합니다');
        return;
      }

      const response = await fetch('/api/vendor/options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newOption)
      });
      const result = await response.json();

      if (result.success) {
        toast.success('추가 옵션이 등록되었습니다!');
        loadOptions();
        setNewOption({
          option_type: 'navigation',
          quantity_available: 999,
          is_active: true,
          display_order: 0
        });
      } else {
        throw new Error(result.message || '등록 실패');
      }
    } catch (error) {
      console.error('추가 옵션 등록 실패:', error);
      toast.error(error instanceof Error ? error.message : '등록 실패');
    }
  };

  // 활성화/비활성화 토글
  const togglePolicyActive = async (id: number, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];

      if (!token) {
        toast.error('로그인이 필요합니다');
        return;
      }

      const response = await fetch(`/api/vendor/pricing/policies/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      const result = await response.json();

      if (result.success) {
        loadPricingPolicies();
      } else {
        throw new Error(result.message || '상태 변경 실패');
      }
    } catch (error) {
      console.error('상태 변경 실패:', error);
      toast.error(error instanceof Error ? error.message : '상태 변경 실패');
    }
  };

  const toggleInsuranceActive = async (id: number, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];

      if (!token) {
        toast.error('로그인이 필요합니다');
        return;
      }

      const response = await fetch(`/api/vendor/insurance/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      const result = await response.json();

      if (result.success) {
        loadInsurances();
      } else {
        throw new Error(result.message || '상태 변경 실패');
      }
    } catch (error) {
      console.error('상태 변경 실패:', error);
      toast.error(error instanceof Error ? error.message : '상태 변경 실패');
    }
  };

  const toggleOptionActive = async (id: number, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];

      if (!token) {
        toast.error('로그인이 필요합니다');
        return;
      }

      const response = await fetch(`/api/vendor/options/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      const result = await response.json();

      if (result.success) {
        loadOptions();
      } else {
        throw new Error(result.message || '상태 변경 실패');
      }
    } catch (error) {
      console.error('상태 변경 실패:', error);
      toast.error(error instanceof Error ? error.message : '상태 변경 실패');
    }
  };

  // 삭제
  const deletePolicy = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];

      if (!token) {
        toast.error('로그인이 필요합니다');
        return;
      }

      const response = await fetch(`/api/vendor/pricing/policies/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();

      if (result.success) {
        toast.success('삭제되었습니다');
        loadPricingPolicies();
      } else {
        throw new Error(result.message || '삭제 실패');
      }
    } catch (error) {
      console.error('삭제 실패:', error);
      toast.error(error instanceof Error ? error.message : '삭제 실패');
    }
  };

  const deleteInsurance = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];

      if (!token) {
        toast.error('로그인이 필요합니다');
        return;
      }

      const response = await fetch(`/api/vendor/insurance/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();

      if (result.success) {
        toast.success('삭제되었습니다');
        loadInsurances();
      } else {
        throw new Error(result.message || '삭제 실패');
      }
    } catch (error) {
      console.error('삭제 실패:', error);
      toast.error(error instanceof Error ? error.message : '삭제 실패');
    }
  };

  const deleteOption = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];

      if (!token) {
        toast.error('로그인이 필요합니다');
        return;
      }

      const response = await fetch(`/api/vendor/options/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();

      if (result.success) {
        toast.success('삭제되었습니다');
        loadOptions();
      } else {
        throw new Error(result.message || '삭제 실패');
      }
    } catch (error) {
      console.error('삭제 실패:', error);
      toast.error(error instanceof Error ? error.message : '삭제 실패');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">💰 요금 및 상품 관리</h1>

      {/* 탭 네비게이션 */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('discount')}
          className={`px-6 py-3 font-semibold ${
            activeTab === 'discount'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600'
          }`}
        >
          요금 정책
        </button>
        <button
          onClick={() => setActiveTab('insurance')}
          className={`px-6 py-3 font-semibold ${
            activeTab === 'insurance'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600'
          }`}
        >
          보험 상품
        </button>
        <button
          onClick={() => setActiveTab('options')}
          className={`px-6 py-3 font-semibold ${
            activeTab === 'options'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600'
          }`}
        >
          추가 옵션
        </button>
      </div>

      {/* 요금 정책 탭 */}
      {activeTab === 'discount' && (
        <div>
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">새 요금 정책 추가</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2">정책 유형</label>
                <select
                  value={newPolicy.policy_type}
                  onChange={(e) =>
                    setNewPolicy({ ...newPolicy, policy_type: e.target.value as any })
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value="duration_discount">기간별 할인</option>
                  <option value="day_of_week">요일별 요금</option>
                  <option value="season">시즌별 요금</option>
                  <option value="early_bird">얼리버드 할인</option>
                </select>
              </div>

              {newPolicy.policy_type === 'duration_discount' && (
                <>
                  <div>
                    <label className="block mb-2">최소 일수</label>
                    <input
                      type="number"
                      value={newPolicy.min_days || ''}
                      onChange={(e) =>
                        setNewPolicy({ ...newPolicy, min_days: parseInt(e.target.value) })
                      }
                      className="w-full p-2 border rounded"
                      placeholder="예: 3"
                    />
                  </div>
                  <div>
                    <label className="block mb-2">최대 일수</label>
                    <input
                      type="number"
                      value={newPolicy.max_days || ''}
                      onChange={(e) =>
                        setNewPolicy({ ...newPolicy, max_days: parseInt(e.target.value) })
                      }
                      className="w-full p-2 border rounded"
                      placeholder="예: 6"
                    />
                  </div>
                  <div>
                    <label className="block mb-2">할인율 (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newPolicy.discount_percentage || ''}
                      onChange={(e) =>
                        setNewPolicy({
                          ...newPolicy,
                          discount_percentage: parseFloat(e.target.value)
                        })
                      }
                      className="w-full p-2 border rounded"
                      placeholder="예: 10"
                    />
                  </div>
                </>
              )}

              {newPolicy.policy_type === 'day_of_week' && (
                <>
                  <div>
                    <label className="block mb-2">요일</label>
                    <select
                      value={newPolicy.day_of_week || ''}
                      onChange={(e) =>
                        setNewPolicy({ ...newPolicy, day_of_week: e.target.value })
                      }
                      className="w-full p-2 border rounded"
                    >
                      <option value="">선택</option>
                      <option value="monday">월요일</option>
                      <option value="tuesday">화요일</option>
                      <option value="wednesday">수요일</option>
                      <option value="thursday">목요일</option>
                      <option value="friday">금요일</option>
                      <option value="saturday">토요일</option>
                      <option value="sunday">일요일</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2">가격 배율</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newPolicy.price_multiplier || ''}
                      onChange={(e) =>
                        setNewPolicy({
                          ...newPolicy,
                          price_multiplier: parseFloat(e.target.value)
                        })
                      }
                      className="w-full p-2 border rounded"
                      placeholder="1.0 = 정상가, 1.4 = +40%"
                    />
                  </div>
                </>
              )}

              {newPolicy.policy_type === 'season' && (
                <>
                  <div>
                    <label className="block mb-2">시즌명</label>
                    <input
                      type="text"
                      value={newPolicy.season_name || ''}
                      onChange={(e) =>
                        setNewPolicy({ ...newPolicy, season_name: e.target.value })
                      }
                      className="w-full p-2 border rounded"
                      placeholder="예: 여름 성수기"
                    />
                  </div>
                  <div>
                    <label className="block mb-2">시작일</label>
                    <input
                      type="date"
                      value={newPolicy.start_date || ''}
                      onChange={(e) =>
                        setNewPolicy({ ...newPolicy, start_date: e.target.value })
                      }
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block mb-2">종료일</label>
                    <input
                      type="date"
                      value={newPolicy.end_date || ''}
                      onChange={(e) =>
                        setNewPolicy({ ...newPolicy, end_date: e.target.value })
                      }
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block mb-2">가격 배율</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newPolicy.season_multiplier || ''}
                      onChange={(e) =>
                        setNewPolicy({
                          ...newPolicy,
                          season_multiplier: parseFloat(e.target.value)
                        })
                      }
                      className="w-full p-2 border rounded"
                      placeholder="1.3 = +30%, 0.8 = -20%"
                    />
                  </div>
                </>
              )}

              {newPolicy.policy_type === 'early_bird' && (
                <>
                  <div>
                    <label className="block mb-2">예약 기한 (며칠 전)</label>
                    <input
                      type="number"
                      value={newPolicy.days_before_pickup || ''}
                      onChange={(e) =>
                        setNewPolicy({
                          ...newPolicy,
                          days_before_pickup: parseInt(e.target.value)
                        })
                      }
                      className="w-full p-2 border rounded"
                      placeholder="예: 14 (2주 전)"
                    />
                  </div>
                  <div>
                    <label className="block mb-2">할인율 (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newPolicy.early_bird_discount || ''}
                      onChange={(e) =>
                        setNewPolicy({
                          ...newPolicy,
                          early_bird_discount: parseFloat(e.target.value)
                        })
                      }
                      className="w-full p-2 border rounded"
                      placeholder="예: 15"
                    />
                  </div>
                </>
              )}
            </div>

            <button
              onClick={addPricingPolicy}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              정책 추가
            </button>
          </div>

          {/* 등록된 요금 정책 목록 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">등록된 요금 정책</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">유형</th>
                    <th className="text-left p-2">조건</th>
                    <th className="text-left p-2">할인/배율</th>
                    <th className="text-left p-2">상태</th>
                    <th className="text-left p-2">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingPolicies.map((policy) => (
                    <tr key={policy.id} className="border-b">
                      <td className="p-2">
                        {policy.policy_type === 'duration_discount' && '기간별 할인'}
                        {policy.policy_type === 'day_of_week' && '요일별 요금'}
                        {policy.policy_type === 'season' && '시즌별 요금'}
                        {policy.policy_type === 'early_bird' && '얼리버드'}
                      </td>
                      <td className="p-2">
                        {policy.policy_type === 'duration_discount' &&
                          `${policy.min_days}~${policy.max_days}일`}
                        {policy.policy_type === 'day_of_week' && policy.day_of_week}
                        {policy.policy_type === 'season' &&
                          `${policy.season_name} (${policy.start_date} ~ ${policy.end_date})`}
                        {policy.policy_type === 'early_bird' &&
                          `${policy.days_before_pickup}일 전 예약`}
                      </td>
                      <td className="p-2">
                        {policy.discount_percentage && `${policy.discount_percentage}% 할인`}
                        {policy.price_multiplier && `x${policy.price_multiplier}`}
                        {policy.season_multiplier && `x${policy.season_multiplier}`}
                        {policy.early_bird_discount && `${policy.early_bird_discount}% 할인`}
                      </td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            policy.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {policy.is_active ? '활성화' : '비활성화'}
                        </span>
                      </td>
                      <td className="p-2">
                        <button
                          onClick={() => togglePolicyActive(policy.id!, policy.is_active)}
                          className="text-blue-600 hover:underline mr-2"
                        >
                          {policy.is_active ? '비활성화' : '활성화'}
                        </button>
                        <button
                          onClick={() => deletePolicy(policy.id!)}
                          className="text-red-600 hover:underline"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 보험 상품 탭 */}
      {activeTab === 'insurance' && (
        <div>
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">새 보험 상품 추가</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2">보험명</label>
                <input
                  type="text"
                  value={newInsurance.insurance_name || ''}
                  onChange={(e) =>
                    setNewInsurance({ ...newInsurance, insurance_name: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  placeholder="예: CDW 자차손해면책"
                />
              </div>
              <div>
                <label className="block mb-2">보험 유형</label>
                <select
                  value={newInsurance.insurance_type}
                  onChange={(e) =>
                    setNewInsurance({ ...newInsurance, insurance_type: e.target.value as any })
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value="basic">기본 보험</option>
                  <option value="cdw">CDW</option>
                  <option value="super_cdw">슈퍼 CDW</option>
                  <option value="full_coverage">풀커버리지</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block mb-2">설명</label>
                <textarea
                  value={newInsurance.description || ''}
                  onChange={(e) =>
                    setNewInsurance({ ...newInsurance, description: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  rows={2}
                  placeholder="보험 내용 설명"
                />
              </div>
              <div>
                <label className="block mb-2">보상 한도 (원)</label>
                <input
                  type="number"
                  value={newInsurance.coverage_limit || ''}
                  onChange={(e) =>
                    setNewInsurance({
                      ...newInsurance,
                      coverage_limit: parseInt(e.target.value)
                    })
                  }
                  className="w-full p-2 border rounded"
                  placeholder="예: 100000000"
                />
              </div>
              <div>
                <label className="block mb-2">자기부담금 (원)</label>
                <input
                  type="number"
                  value={newInsurance.deductible || ''}
                  onChange={(e) =>
                    setNewInsurance({
                      ...newInsurance,
                      deductible: parseInt(e.target.value)
                    })
                  }
                  className="w-full p-2 border rounded"
                  placeholder="예: 500000"
                />
              </div>
              <div>
                <label className="block mb-2">일일 가격 (원)</label>
                <input
                  type="number"
                  value={newInsurance.daily_price || ''}
                  onChange={(e) =>
                    setNewInsurance({
                      ...newInsurance,
                      daily_price: parseInt(e.target.value)
                    })
                  }
                  className="w-full p-2 border rounded"
                  placeholder="예: 10000"
                />
              </div>
              <div>
                <label className="block mb-2">표시 순서</label>
                <input
                  type="number"
                  value={newInsurance.display_order || 0}
                  onChange={(e) =>
                    setNewInsurance({
                      ...newInsurance,
                      display_order: parseInt(e.target.value)
                    })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newInsurance.is_included || false}
                    onChange={(e) =>
                      setNewInsurance({ ...newInsurance, is_included: e.target.checked })
                    }
                    className="mr-2"
                  />
                  기본 포함 (무료)
                </label>
              </div>
            </div>
            <button
              onClick={addInsurance}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              보험 추가
            </button>
          </div>

          {/* 보험 목록 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">등록된 보험 상품</h2>
            <div className="grid gap-4">
              {insurances.map((insurance) => (
                <div key={insurance.id} className="border rounded p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{insurance.insurance_name}</h3>
                      <p className="text-gray-600 text-sm">{insurance.description}</p>
                      <div className="mt-2 text-sm">
                        <p>보상 한도: {insurance.coverage_limit?.toLocaleString()}원</p>
                        <p>자기부담금: {insurance.deductible?.toLocaleString()}원</p>
                        <p className="font-semibold text-blue-600">
                          {insurance.is_included
                            ? '기본 포함'
                            : `+${insurance.daily_price?.toLocaleString()}원/일`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleInsuranceActive(insurance.id!, insurance.is_active)}
                        className="text-blue-600 hover:underline"
                      >
                        {insurance.is_active ? '비활성화' : '활성화'}
                      </button>
                      <button
                        onClick={() => deleteInsurance(insurance.id!)}
                        className="text-red-600 hover:underline"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 추가 옵션 탭 */}
      {activeTab === 'options' && (
        <div>
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">새 추가 옵션 등록</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2">옵션명</label>
                <input
                  type="text"
                  value={newOption.option_name || ''}
                  onChange={(e) =>
                    setNewOption({ ...newOption, option_name: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  placeholder="예: 네비게이션"
                />
              </div>
              <div>
                <label className="block mb-2">옵션 유형</label>
                <select
                  value={newOption.option_type}
                  onChange={(e) =>
                    setNewOption({ ...newOption, option_type: e.target.value as any })
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value="navigation">네비게이션</option>
                  <option value="child_seat">아동 카시트</option>
                  <option value="wifi">와이파이</option>
                  <option value="snow_tire">스노우 타이어</option>
                  <option value="ski_rack">스키 거치대</option>
                  <option value="other">기타</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block mb-2">설명</label>
                <textarea
                  value={newOption.description || ''}
                  onChange={(e) =>
                    setNewOption({ ...newOption, description: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  rows={2}
                  placeholder="옵션 설명"
                />
              </div>
              <div>
                <label className="block mb-2">일일 가격 (원)</label>
                <input
                  type="number"
                  value={newOption.daily_price || ''}
                  onChange={(e) =>
                    setNewOption({ ...newOption, daily_price: parseInt(e.target.value) })
                  }
                  className="w-full p-2 border rounded"
                  placeholder="예: 5000"
                />
              </div>
              <div>
                <label className="block mb-2">1회 가격 (원, 선택)</label>
                <input
                  type="number"
                  value={newOption.one_time_price || ''}
                  onChange={(e) =>
                    setNewOption({ ...newOption, one_time_price: parseInt(e.target.value) })
                  }
                  className="w-full p-2 border rounded"
                  placeholder="예: 10000 (설치비)"
                />
              </div>
              <div>
                <label className="block mb-2">이용 가능 수량</label>
                <input
                  type="number"
                  value={newOption.quantity_available || 999}
                  onChange={(e) =>
                    setNewOption({
                      ...newOption,
                      quantity_available: parseInt(e.target.value)
                    })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block mb-2">표시 순서</label>
                <input
                  type="number"
                  value={newOption.display_order || 0}
                  onChange={(e) =>
                    setNewOption({ ...newOption, display_order: parseInt(e.target.value) })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            <button
              onClick={addOption}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              옵션 추가
            </button>
          </div>

          {/* 옵션 목록 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">등록된 추가 옵션</h2>
            <div className="grid gap-4">
              {options.map((option) => (
                <div key={option.id} className="border rounded p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{option.option_name}</h3>
                      <p className="text-gray-600 text-sm">{option.description}</p>
                      <div className="mt-2 text-sm">
                        <p className="font-semibold text-blue-600">
                          +{option.daily_price?.toLocaleString()}원/일
                          {option.one_time_price && option.one_time_price > 0 && (
                            <span className="ml-2">
                              (1회 {option.one_time_price?.toLocaleString()}원)
                            </span>
                          )}
                        </p>
                        <p>이용 가능: {option.quantity_available}개</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleOptionActive(option.id!, option.is_active)}
                        className="text-blue-600 hover:underline"
                      >
                        {option.is_active ? '비활성화' : '활성화'}
                      </button>
                      <button
                        onClick={() => deleteOption(option.id!)}
                        className="text-red-600 hover:underline"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorPricingSettings;

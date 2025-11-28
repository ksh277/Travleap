import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import {
  Ticket,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Check,
  X,
  Calendar,
  Users,
  BarChart,
  BarChart3,
  Target,
  TrendingUp,
  Store,
  Wallet,
  Download,
  RefreshCw,
  Percent
} from 'lucide-react';
import { toast } from 'sonner';

interface Coupon {
  id: number;
  code: string;
  name: string;
  title: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_amount: number;
  max_discount_amount: number | null;
  target_category: string | null;
  target_type: 'ALL' | 'CATEGORY' | 'SPECIFIC';
  target_categories: string | null;
  default_discount_type: 'PERCENT' | 'AMOUNT';
  default_discount_value: number;
  default_max_discount: number | null;
  valid_from: string | null;
  valid_to: string | null;
  valid_until: string | null;
  is_active: boolean;
  usage_limit: number | null;
  current_usage: number;
  usage_per_user: number | null;
  max_issues_per_user: number | null;
  remaining: number | null;
  created_at: string;
}

interface OverallStats {
  total_issued: number;
  total_used: number;
  total_discount_amount: number;
  total_order_amount: number;
  active_partners: number;
  usage_rate: number;
}

interface CouponStat {
  id: number;
  code: string;
  name: string;
  default_discount_type: string;
  default_discount_value: number;
  is_active: boolean;
  issued_count: number;
  used_count: number;
  total_discount: number;
  total_orders: number;
}

interface PartnerStat {
  id: number;
  business_name: string;
  category: string;
  total_coupon_usage: number;
  total_discount_given: number;
  usage_count: number;
  discount_amount: number;
  order_amount: number;
}

interface DailyStat {
  date: string;
  usage_count: number;
  discount_amount: number;
  order_amount: number;
}

interface CategoryStat {
  category: string;
  usage_count: number;
  discount_amount: number;
  order_amount: number;
  partner_count: number;
}

interface RecentUsage {
  id: number;
  coupon_code: string;
  order_amount: number;
  discount_amount: number;
  final_amount: number;
  used_at: string;
  campaign_code: string;
  coupon_name: string;
  partner_name: string;
  partner_category: string;
}

export function AdminCoupons() {
  const [mainTab, setMainTab] = useState('manage');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    title: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    min_amount: 0,
    max_discount_amount: null as number | null,
    target_category: '',
    target_type: 'ALL' as 'ALL' | 'CATEGORY' | 'SPECIFIC',
    target_categories: [] as string[],
    default_discount_type: 'PERCENT' as 'PERCENT' | 'AMOUNT',
    default_discount_value: 10,
    default_max_discount: null as number | null,
    valid_from: '',
    valid_to: '',
    valid_until: '',
    usage_limit: null as number | null,
    usage_per_user: null as number | null,
    max_issues_per_user: 1,
    is_active: true
  });

  // 통계 상태
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsTab, setStatsTab] = useState('overview');
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [overall, setOverall] = useState<OverallStats | null>(null);
  const [couponStats, setCouponStats] = useState<CouponStat[]>([]);
  const [partnerStats, setPartnerStats] = useState<PartnerStat[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [recentUsage, setRecentUsage] = useState<RecentUsage[]>([]);

  useEffect(() => {
    fetchCoupons();
  }, []);

  useEffect(() => {
    if (mainTab === 'stats') {
      fetchStats();
    }
  }, [mainTab, period, categoryFilter]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/admin/coupons', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.success) {
        setCoupons(data.data || []);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('쿠폰 조회 오류:', error);
      toast.error('쿠폰 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const token = localStorage.getItem('auth_token');
      let url = `/api/admin/coupon-stats?period=${period}`;
      if (startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
      }
      if (categoryFilter !== 'all') {
        url += `&category=${categoryFilter}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();

      if (result.success) {
        setOverall(result.data.overall);
        setCouponStats(result.data.coupon_stats || []);
        setPartnerStats(result.data.partner_stats || []);
        setDailyStats(result.data.daily_stats || []);
        setCategoryStats(result.data.category_stats || []);
        setRecentUsage(result.data.recent_usage || []);
      } else {
        toast.error(result.message || '통계를 불러오는데 실패했습니다');
      }
    } catch (error) {
      console.error('통계 조회 오류:', error);
      toast.error('통계를 불러오는데 실패했습니다');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleExport = async (type: 'usage' | 'partners' | 'daily') => {
    try {
      const token = localStorage.getItem('auth_token');
      let url = `/api/admin/coupon-export?type=${type}`;
      if (startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('다운로드 실패');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `coupon_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('CSV 파일이 다운로드되었습니다');
    } catch (error) {
      console.error('CSV 내보내기 오류:', error);
      toast.error('CSV 다운로드에 실패했습니다');
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.code || !formData.default_discount_value) {
        toast.error('필수 항목을 입력해주세요');
        return;
      }

      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          valid_from: formData.valid_from || null,
          valid_to: formData.valid_to || formData.valid_until || null,
          valid_until: formData.valid_until || formData.valid_to || null,
          target_category: formData.target_category || null,
          target_categories: formData.target_categories.length > 0 ? formData.target_categories : null
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('쿠폰이 생성되었습니다');
        setIsCreateDialogOpen(false);
        resetForm();
        fetchCoupons();
      } else {
        toast.error(data.message || '쿠폰 생성에 실패했습니다');
      }
    } catch (error) {
      console.error('쿠폰 생성 오류:', error);
      toast.error('쿠폰 생성 중 오류가 발생했습니다');
    }
  };

  const handleEdit = async () => {
    try {
      if (!selectedCoupon) return;

      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/admin/coupons', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: selectedCoupon.id,
          ...formData,
          valid_from: formData.valid_from || null,
          valid_to: formData.valid_to || formData.valid_until || null,
          valid_until: formData.valid_until || formData.valid_to || null,
          target_category: formData.target_category || null,
          target_categories: formData.target_categories.length > 0 ? formData.target_categories : null
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('쿠폰이 수정되었습니다');
        setIsEditDialogOpen(false);
        setSelectedCoupon(null);
        resetForm();
        fetchCoupons();
      } else {
        toast.error(data.message || '쿠폰 수정에 실패했습니다');
      }
    } catch (error) {
      console.error('쿠폰 수정 오류:', error);
      toast.error('쿠폰 수정 중 오류가 발생했습니다');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 이 쿠폰을 삭제하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/coupons?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('쿠폰이 삭제되었습니다');
        fetchCoupons();
      } else {
        toast.error(data.message || '쿠폰 삭제에 실패했습니다');
      }
    } catch (error) {
      console.error('쿠폰 삭제 오류:', error);
      toast.error('쿠폰 삭제 중 오류가 발생했습니다');
    }
  };

  const openEditDialog = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    let parsedCategories: string[] = [];
    if (coupon.target_categories) {
      try {
        parsedCategories = typeof coupon.target_categories === 'string'
          ? JSON.parse(coupon.target_categories)
          : coupon.target_categories;
      } catch {
        parsedCategories = [];
      }
    }

    setFormData({
      code: coupon.code,
      name: coupon.name || coupon.title || '',
      title: coupon.title || '',
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_amount: coupon.min_amount || 0,
      max_discount_amount: coupon.max_discount_amount,
      target_category: coupon.target_category || '',
      target_type: coupon.target_type || 'ALL',
      target_categories: parsedCategories,
      default_discount_type: coupon.default_discount_type || 'PERCENT',
      default_discount_value: coupon.default_discount_value || 10,
      default_max_discount: coupon.default_max_discount,
      valid_from: coupon.valid_from ? coupon.valid_from.slice(0, 16) : '',
      valid_to: coupon.valid_to ? coupon.valid_to.slice(0, 16) : '',
      valid_until: coupon.valid_until ? coupon.valid_until.slice(0, 16) : '',
      usage_limit: coupon.usage_limit,
      usage_per_user: coupon.usage_per_user,
      max_issues_per_user: coupon.max_issues_per_user || 1,
      is_active: coupon.is_active
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      title: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      min_amount: 0,
      max_discount_amount: null,
      target_category: '',
      target_type: 'ALL',
      target_categories: [],
      default_discount_type: 'PERCENT',
      default_discount_value: 10,
      default_max_discount: null,
      valid_from: '',
      valid_to: '',
      valid_until: '',
      usage_limit: null,
      usage_per_user: null,
      max_issues_per_user: 1,
      is_active: true
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ko-KR');
  };

  const getTargetTypeLabel = (type: string) => {
    switch (type) {
      case 'ALL': return '전체 가맹점';
      case 'CATEGORY': return '카테고리 지정';
      case 'SPECIFIC': return '특정 가맹점';
      default: return type;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      food: '음식점',
      cafe: '카페',
      accommodation: '숙박',
      tour: '투어',
      experience: '체험',
      shopping: '쇼핑',
      transportation: '교통',
      unknown: '미분류'
    };
    return labels[category] || category;
  };

  return (
    <div className="space-y-6">
      {/* 메인 탭: 쿠폰 관리 / 쿠폰 통계 */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Ticket className="w-4 h-4" />
            쿠폰 관리
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            쿠폰 통계
          </TabsTrigger>
        </TabsList>

        {/* 쿠폰 관리 탭 */}
        <TabsContent value="manage" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Ticket className="w-5 h-5" />
                쿠폰 관리
              </CardTitle>
              <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                쿠폰 생성
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  <span className="ml-2">쿠폰을 불러오는 중...</span>
                </div>
              ) : coupons.length === 0 ? (
                <div className="text-center py-12">
                  <Ticket className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">등록된 쿠폰이 없습니다</p>
                  <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }} className="mt-4">
                    첫 쿠폰 만들기
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {coupons.map((coupon) => (
                    <div
                      key={coupon.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold">{coupon.code}</h3>
                            <Badge variant={coupon.default_discount_type === 'PERCENT' ? 'default' : 'secondary'}>
                              {coupon.default_discount_type === 'PERCENT'
                                ? `${coupon.default_discount_value}%`
                                : `${coupon.default_discount_value?.toLocaleString()}원`}
                            </Badge>
                            {coupon.is_active ? (
                              <Badge className="bg-green-100 text-green-800">
                                <Check className="w-3 h-3 mr-1" />
                                활성
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-500">
                                <X className="w-3 h-3 mr-1" />
                                비활성
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{coupon.name || coupon.title || coupon.description}</p>

                          <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              {getTargetTypeLabel(coupon.target_type || 'ALL')}
                            </span>
                            {coupon.min_amount > 0 && (
                              <span className="bg-gray-100 px-2 py-1 rounded">
                                최소 {coupon.min_amount?.toLocaleString()}원
                              </span>
                            )}
                            {coupon.default_max_discount && (
                              <span className="bg-gray-100 px-2 py-1 rounded">
                                최대 {coupon.default_max_discount?.toLocaleString()}원 할인
                              </span>
                            )}
                            {(coupon.valid_to || coupon.valid_until) && (
                              <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(coupon.valid_to || coupon.valid_until)}까지
                              </span>
                            )}
                            {coupon.usage_limit && (
                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
                                <BarChart className="w-3 h-3" />
                                {coupon.current_usage} / {coupon.usage_limit}건 발급
                              </span>
                            )}
                            {coupon.max_issues_per_user && (
                              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                1인당 {coupon.max_issues_per_user}회
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(coupon)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(coupon.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 쿠폰 통계 탭 */}
        <TabsContent value="stats" className="mt-6 space-y-6">
          {/* 필터 영역 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                쿠폰 통계
              </CardTitle>
              <CardDescription>전체 가맹점의 쿠폰 사용 데이터를 확인하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <Label>기간</Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">오늘</SelectItem>
                      <SelectItem value="week">이번 주</SelectItem>
                      <SelectItem value="month">이번 달</SelectItem>
                      <SelectItem value="year">올해</SelectItem>
                      <SelectItem value="all">전체</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>시작일</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-40"
                  />
                </div>

                <div>
                  <Label>종료일</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>

                <div>
                  <Label>카테고리</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="food">음식점</SelectItem>
                      <SelectItem value="cafe">카페</SelectItem>
                      <SelectItem value="accommodation">숙박</SelectItem>
                      <SelectItem value="tour">투어</SelectItem>
                      <SelectItem value="experience">체험</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={fetchStats} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  새로고침
                </Button>
              </div>
            </CardContent>
          </Card>

          {statsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <span className="ml-2">통계를 불러오는 중...</span>
            </div>
          ) : (
            <>
              {/* 전체 요약 */}
              {overall && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Ticket className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                      <p className="text-2xl font-bold">{overall.total_issued.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">전체 발급</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <TrendingUp className="w-8 h-8 mx-auto text-green-600 mb-2" />
                      <p className="text-2xl font-bold">{overall.total_used.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">전체 사용</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Percent className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                      <p className="text-2xl font-bold">{overall.usage_rate}%</p>
                      <p className="text-sm text-gray-500">사용률</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Wallet className="w-8 h-8 mx-auto text-orange-600 mb-2" />
                      <p className="text-2xl font-bold">{(overall.total_discount_amount / 10000).toFixed(0)}만</p>
                      <p className="text-sm text-gray-500">총 할인액</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <BarChart3 className="w-8 h-8 mx-auto text-indigo-600 mb-2" />
                      <p className="text-2xl font-bold">{(overall.total_order_amount / 10000).toFixed(0)}만</p>
                      <p className="text-sm text-gray-500">총 주문액</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Store className="w-8 h-8 mx-auto text-pink-600 mb-2" />
                      <p className="text-2xl font-bold">{overall.active_partners}</p>
                      <p className="text-sm text-gray-500">활성 가맹점</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 상세 탭 */}
              <Tabs value={statsTab} onValueChange={setStatsTab}>
                <TabsList className="grid grid-cols-5 w-full max-w-2xl">
                  <TabsTrigger value="overview">쿠폰별</TabsTrigger>
                  <TabsTrigger value="partners">가맹점별</TabsTrigger>
                  <TabsTrigger value="category">카테고리별</TabsTrigger>
                  <TabsTrigger value="daily">일별</TabsTrigger>
                  <TabsTrigger value="recent">최근 사용</TabsTrigger>
                </TabsList>

                {/* 쿠폰별 통계 */}
                <TabsContent value="overview" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>쿠폰(캠페인)별 통계</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {couponStats.length === 0 ? (
                          <p className="text-center text-gray-500 py-8">데이터가 없습니다</p>
                        ) : (
                          couponStats.map((stat) => (
                            <div key={stat.id} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-lg">{stat.code}</span>
                                  <Badge variant={stat.default_discount_type === 'PERCENT' ? 'default' : 'secondary'}>
                                    {stat.default_discount_type === 'PERCENT'
                                      ? `${stat.default_discount_value}%`
                                      : `${stat.default_discount_value?.toLocaleString()}원`}
                                  </Badge>
                                  {stat.is_active ? (
                                    <Badge className="bg-green-100 text-green-800">활성</Badge>
                                  ) : (
                                    <Badge variant="outline">비활성</Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mb-3">{stat.name}</p>
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div className="text-center p-2 bg-gray-50 rounded">
                                  <p className="text-gray-500">발급</p>
                                  <p className="font-bold">{stat.issued_count}건</p>
                                </div>
                                <div className="text-center p-2 bg-green-50 rounded">
                                  <p className="text-gray-500">사용</p>
                                  <p className="font-bold text-green-600">{stat.used_count}건</p>
                                </div>
                                <div className="text-center p-2 bg-purple-50 rounded">
                                  <p className="text-gray-500">할인액</p>
                                  <p className="font-bold text-purple-600">{stat.total_discount?.toLocaleString()}원</p>
                                </div>
                                <div className="text-center p-2 bg-blue-50 rounded">
                                  <p className="text-gray-500">주문액</p>
                                  <p className="font-bold text-blue-600">{stat.total_orders?.toLocaleString()}원</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* 가맹점별 통계 */}
                <TabsContent value="partners" className="mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>가맹점별 통계</CardTitle>
                      <Button variant="outline" size="sm" onClick={() => handleExport('partners')}>
                        <Download className="w-4 h-4 mr-2" />
                        CSV 다운로드
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">가맹점명</th>
                              <th className="text-left p-2">카테고리</th>
                              <th className="text-right p-2">사용 건수</th>
                              <th className="text-right p-2">할인 금액</th>
                              <th className="text-right p-2">주문 금액</th>
                            </tr>
                          </thead>
                          <tbody>
                            {partnerStats.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="text-center text-gray-500 py-8">데이터가 없습니다</td>
                              </tr>
                            ) : (
                              partnerStats.map((stat) => (
                                <tr key={stat.id} className="border-b hover:bg-gray-50">
                                  <td className="p-2 font-medium">{stat.business_name}</td>
                                  <td className="p-2">
                                    <Badge variant="outline">{getCategoryLabel(stat.category)}</Badge>
                                  </td>
                                  <td className="p-2 text-right">{stat.usage_count}건</td>
                                  <td className="p-2 text-right text-purple-600">{stat.discount_amount?.toLocaleString()}원</td>
                                  <td className="p-2 text-right text-blue-600">{stat.order_amount?.toLocaleString()}원</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* 카테고리별 통계 */}
                <TabsContent value="category" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>카테고리별 통계</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryStats.length === 0 ? (
                          <p className="text-center text-gray-500 py-8 col-span-full">데이터가 없습니다</p>
                        ) : (
                          categoryStats.map((stat, index) => (
                            <Card key={index} className="border-2">
                              <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-4">
                                  <h3 className="text-lg font-bold">{getCategoryLabel(stat.category)}</h3>
                                  <Badge>{stat.partner_count}개 가맹점</Badge>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">사용 건수</span>
                                    <span className="font-medium">{stat.usage_count}건</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">할인 금액</span>
                                    <span className="font-medium text-purple-600">{stat.discount_amount?.toLocaleString()}원</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">주문 금액</span>
                                    <span className="font-medium text-blue-600">{stat.order_amount?.toLocaleString()}원</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* 일별 통계 */}
                <TabsContent value="daily" className="mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>일별 통계 (최근 30일)</CardTitle>
                      <Button variant="outline" size="sm" onClick={() => handleExport('daily')}>
                        <Download className="w-4 h-4 mr-2" />
                        CSV 다운로드
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">날짜</th>
                              <th className="text-right p-2">사용 건수</th>
                              <th className="text-right p-2">할인 금액</th>
                              <th className="text-right p-2">주문 금액</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dailyStats.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="text-center text-gray-500 py-8">데이터가 없습니다</td>
                              </tr>
                            ) : (
                              dailyStats.map((stat, index) => (
                                <tr key={index} className="border-b hover:bg-gray-50">
                                  <td className="p-2">{formatDate(stat.date)}</td>
                                  <td className="p-2 text-right">{stat.usage_count}건</td>
                                  <td className="p-2 text-right text-purple-600">{stat.discount_amount?.toLocaleString()}원</td>
                                  <td className="p-2 text-right text-blue-600">{stat.order_amount?.toLocaleString()}원</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* 최근 사용 내역 */}
                <TabsContent value="recent" className="mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>최근 쿠폰 사용 내역</CardTitle>
                      <Button variant="outline" size="sm" onClick={() => handleExport('usage')}>
                        <Download className="w-4 h-4 mr-2" />
                        CSV 다운로드
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {recentUsage.length === 0 ? (
                          <p className="text-center text-gray-500 py-8">데이터가 없습니다</p>
                        ) : (
                          recentUsage.map((usage) => (
                            <div key={usage.id} className="p-3 border rounded-lg flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">{usage.coupon_code}</span>
                                  <span className="text-sm text-gray-500">{usage.campaign_code}</span>
                                </div>
                                <p className="text-sm">
                                  <span className="font-medium">{usage.partner_name}</span>
                                  <span className="text-gray-400 mx-2">|</span>
                                  <span className="text-gray-500">{getCategoryLabel(usage.partner_category)}</span>
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-green-600 font-medium">-{usage.discount_amount?.toLocaleString()}원</p>
                                <p className="text-xs text-gray-500">{formatDateTime(usage.used_at)}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* 쿠폰 생성 다이얼로그 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 쿠폰 생성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <CouponForm formData={formData} setFormData={setFormData} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreate}>생성</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 쿠폰 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>쿠폰 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <CouponForm formData={formData} setFormData={setFormData} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleEdit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CouponForm({ formData, setFormData }: any) {
  const categoryOptions = [
    { value: 'food', label: '음식점' },
    { value: 'cafe', label: '카페' },
    { value: 'accommodation', label: '숙박' },
    { value: 'tour', label: '투어' },
    { value: 'experience', label: '체험' },
    { value: 'shopping', label: '쇼핑' },
    { value: 'transportation', label: '교통' }
  ];

  const handleCategoryToggle = (category: string) => {
    const current = formData.target_categories || [];
    if (current.includes(category)) {
      setFormData({
        ...formData,
        target_categories: current.filter((c: string) => c !== category)
      });
    } else {
      setFormData({
        ...formData,
        target_categories: [...current, category]
      });
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label>쿠폰 코드 *</Label>
        <Input
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          placeholder="SHINAN2025"
        />
        <p className="text-xs text-gray-500 mt-1">사용자가 입력하는 코드 (대문자 자동 변환)</p>
      </div>

      <div className="col-span-2">
        <Label>쿠폰명</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="2025 신안 섬여행 할인 쿠폰"
        />
      </div>

      <div className="col-span-2">
        <Label>설명</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="신안 지역 가맹점에서 사용 가능한 할인 쿠폰입니다."
        />
      </div>

      <div className="col-span-2 p-4 bg-purple-50 rounded-lg">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" />
          사용 대상 설정
        </h4>
        <div className="space-y-3">
          <div>
            <Label>대상 타입</Label>
            <Select
              value={formData.target_type}
              onValueChange={(value) => setFormData({ ...formData, target_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 가맹점 (쿠폰 참여 ON인 모든 가맹점)</SelectItem>
                <SelectItem value="CATEGORY">카테고리 지정 (특정 업종만)</SelectItem>
                <SelectItem value="SPECIFIC">특정 가맹점 (개별 지정)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.target_type === 'CATEGORY' && (
            <div>
              <Label className="mb-2 block">대상 카테고리 선택</Label>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategoryToggle(cat.value)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      (formData.target_categories || []).includes(cat.value)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="col-span-2 p-4 bg-green-50 rounded-lg">
        <h4 className="font-medium mb-3">기본 할인 설정</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>할인 타입 *</Label>
            <Select
              value={formData.default_discount_type}
              onValueChange={(value: any) => setFormData({ ...formData, default_discount_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENT">퍼센트 (%)</SelectItem>
                <SelectItem value="AMOUNT">정액 (원)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>할인 값 *</Label>
            <Input
              type="number"
              value={formData.default_discount_value || ''}
              onChange={(e) => setFormData({ ...formData, default_discount_value: parseInt(e.target.value) || 0 })}
              placeholder={formData.default_discount_type === 'PERCENT' ? '15' : '5000'}
            />
          </div>

          <div>
            <Label>최소 주문금액</Label>
            <Input
              type="number"
              value={formData.min_amount || ''}
              onChange={(e) => setFormData({ ...formData, min_amount: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>

          <div>
            <Label>최대 할인금액</Label>
            <Input
              type="number"
              value={formData.default_max_discount || ''}
              onChange={(e) => setFormData({ ...formData, default_max_discount: parseInt(e.target.value) || null })}
              placeholder="무제한"
            />
          </div>
        </div>
      </div>

      <div>
        <Label>유효 시작일</Label>
        <Input
          type="datetime-local"
          value={formData.valid_from}
          onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
        />
      </div>

      <div>
        <Label>유효 종료일</Label>
        <Input
          type="datetime-local"
          value={formData.valid_to || formData.valid_until}
          onChange={(e) => setFormData({ ...formData, valid_to: e.target.value, valid_until: e.target.value })}
        />
      </div>

      <div>
        <Label>총 발급 수량 제한</Label>
        <Input
          type="number"
          value={formData.usage_limit || ''}
          onChange={(e) => setFormData({ ...formData, usage_limit: parseInt(e.target.value) || null })}
          placeholder="무제한"
        />
      </div>

      <div>
        <Label>1인당 발급 제한</Label>
        <Input
          type="number"
          value={formData.max_issues_per_user || ''}
          onChange={(e) => setFormData({ ...formData, max_issues_per_user: parseInt(e.target.value) || null })}
          placeholder="1"
        />
      </div>

      <div className="col-span-2 flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="w-4 h-4"
        />
        <Label htmlFor="is_active">활성 상태 (체크 시 사용자가 발급받을 수 있음)</Label>
      </div>
    </div>
  );
}

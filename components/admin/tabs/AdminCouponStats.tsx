import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import {
  BarChart3,
  TrendingUp,
  Ticket,
  Store,
  Wallet,
  Users,
  Download,
  RefreshCw,
  Loader2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Percent
} from 'lucide-react';
import { toast } from 'sonner';

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

export function AdminCouponStats() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
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
    fetchStats();
  }, [period, categoryFilter]);

  const fetchStats = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ko-KR');
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ko-KR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <span className="ml-2">통계를 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
            <CardHeader className="flex flex-row items-center justify-between">
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
    </div>
  );
}

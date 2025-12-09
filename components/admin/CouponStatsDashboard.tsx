/**
 * 쿠폰 사용 통계 대시보드
 *
 * Features:
 * - 전체 쿠폰 발급/사용 통계
 * - 일별 사용 추이 차트
 * - 가맹점별 사용 통계
 * - 쿠폰별 사용 통계
 * - 카테고리별 분포
 * - 최근 사용 내역
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Ticket,
  TrendingUp,
  TrendingDown,
  Store,
  Users,
  Calendar,
  RefreshCw,
  Download,
  Loader2,
  BarChart3,
  PieChartIcon,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle
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
  discount_type: string;
  discount_value: number;
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
  coupon_name: string;
  partner_name: string;
  partner_category: string;
}

interface StatsData {
  overall: OverallStats;
  coupon_stats: CouponStat[];
  partner_stats: PartnerStat[];
  daily_stats: DailyStat[];
  category_stats: CategoryStat[];
  recent_usage: RecentUsage[];
}

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899'];

const CATEGORY_MAP: Record<string, string> = {
  '음식점': '음식점',
  '카페': '카페',
  '숙소': '숙소',
  '체험': '체험',
  '기타': '기타',
  'unknown': '미분류'
};

export function CouponStatsDashboard() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('month');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadStats();
  }, [period]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/coupon-stats?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('통계 조회 실패');
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setLastUpdated(new Date());
      } else {
        throw new Error(result.message || '통계 조회 실패');
      }
    } catch (error) {
      console.error('Stats load error:', error);
      toast.error('통계 데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()}원`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-500">통계 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-500">데이터를 불러올 수 없습니다</p>
        <Button onClick={loadStats} className="mt-4">
          다시 시도
        </Button>
      </div>
    );
  }

  const { overall, coupon_stats, partner_stats, daily_stats, category_stats, recent_usage } = data;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">쿠폰 사용 통계</h2>
          <p className="text-sm text-gray-500 mt-1">
            마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
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
          <Button variant="outline" size="icon" onClick={loadStats} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">발급된 쿠폰</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatNumber(overall.total_issued)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Ticket className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">사용된 쿠폰</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(overall.total_used)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">사용률</p>
                <p className="text-2xl font-bold text-blue-600">
                  {overall.usage_rate}%
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">총 할인금액</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatNumber(overall.total_discount_amount)}원
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">참여 가맹점</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {overall.active_partners}곳
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-full">
                <Store className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 일별 사용 추이 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              일별 쿠폰 사용 추이
            </CardTitle>
          </CardHeader>
          <CardContent>
            {daily_stats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={daily_stats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'usage_count') return [value + '건', '사용 건수'];
                      return [formatCurrency(value), '할인 금액'];
                    }}
                    labelFormatter={(label) => formatDate(label)}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="usage_count"
                    name="사용 건수"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="discount_amount"
                    name="할인 금액"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* 카테고리별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-purple-600" />
              카테고리별 사용 분포
            </CardTitle>
          </CardHeader>
          <CardContent>
            {category_stats.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={category_stats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="usage_count"
                    nameKey="category"
                    label={({ category, percent }) =>
                      `${CATEGORY_MAP[category] || category} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {category_stats.map((entry, index) => (
                      <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value + '건', '사용 건수']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* 쿠폰별 사용 통계 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-purple-600" />
              쿠폰별 사용 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coupon_stats.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={coupon_stats.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={100}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'used_count') return [value + '건', '사용'];
                      return [value + '건', '발급'];
                    }}
                  />
                  <Bar dataKey="issued_count" name="발급" fill="#E9D5FF" />
                  <Bar dataKey="used_count" name="사용" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 가맹점별 통계 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5 text-purple-600" />
            가맹점별 쿠폰 사용 통계
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4">가맹점</th>
                  <th className="text-left py-3 px-4">카테고리</th>
                  <th className="text-right py-3 px-4">사용 건수</th>
                  <th className="text-right py-3 px-4">총 할인금액</th>
                  <th className="text-right py-3 px-4">총 주문금액</th>
                </tr>
              </thead>
              <tbody>
                {partner_stats.length > 0 ? (
                  partner_stats.slice(0, 10).map((partner) => (
                    <tr key={partner.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{partner.business_name}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">
                          {CATEGORY_MAP[partner.category] || partner.category || '미분류'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {(partner.usage_count || partner.total_coupon_usage || 0).toLocaleString()}건
                      </td>
                      <td className="py-3 px-4 text-right text-orange-600 font-medium">
                        {formatCurrency(partner.discount_amount || partner.total_discount_given || 0)}
                      </td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">
                        {formatCurrency(partner.order_amount || 0)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      데이터가 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 최근 사용 내역 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            최근 쿠폰 사용 내역
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4">시간</th>
                  <th className="text-left py-3 px-4">쿠폰</th>
                  <th className="text-left py-3 px-4">가맹점</th>
                  <th className="text-right py-3 px-4">주문금액</th>
                  <th className="text-right py-3 px-4">할인금액</th>
                  <th className="text-right py-3 px-4">결제금액</th>
                </tr>
              </thead>
              <tbody>
                {recent_usage.length > 0 ? (
                  recent_usage.slice(0, 10).map((usage) => (
                    <tr key={usage.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-500">
                        {formatDateTime(usage.used_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-medium">{usage.coupon_name || '-'}</span>
                          <span className="text-xs text-gray-400 ml-2">
                            ({usage.coupon_code})
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <span>{usage.partner_name || '-'}</span>
                          {usage.partner_category && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {CATEGORY_MAP[usage.partner_category] || usage.partner_category}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {formatCurrency(usage.order_amount || 0)}
                      </td>
                      <td className="py-3 px-4 text-right text-orange-600">
                        -{formatCurrency(usage.discount_amount || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-green-600">
                        {formatCurrency(usage.final_amount || 0)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      사용 내역이 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CouponStatsDashboard;

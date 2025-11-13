import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Package, Users, ShoppingCart, DollarSign, Briefcase, Star, FileText, MessageSquare, X, TrendingUp } from 'lucide-react';
import { useAdminData } from '../../../hooks/admin/useAdminData';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function AdminDashboard() {
  const { stats, isLoading } = useAdminData();
  const [showRevenueChart, setShowRevenueChart] = useState(false);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  // Load revenue chart data
  const loadRevenueChart = async () => {
    setLoadingChart(true);
    try {
      const response = await fetch('/api/admin/revenue-chart');
      const data = await response.json();

      if (data.success) {
        setRevenueData(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load revenue chart:', error);
    } finally {
      setLoadingChart(false);
    }
  };

  const handleRevenueCardClick = () => {
    setShowRevenueChart(true);
    if (revenueData.length === 0) {
      loadRevenueChart();
    }
  };

  const statCards = [
    {
      title: '총 상품',
      value: stats.totalProducts,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: '총 사용자',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: '총 주문',
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: '총 매출',
      value: `₩${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      clickable: true,
      onClick: handleRevenueCardClick,
    },
    {
      title: '총 파트너',
      value: stats.totalPartners,
      icon: Briefcase,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      title: '총 리뷰',
      value: stats.totalReviews,
      icon: Star,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: '총 블로그',
      value: stats.totalBlogs,
      icon: FileText,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
    },
    {
      title: '총 문의',
      value: stats.totalContacts,
      icon: MessageSquare,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">대시보드</h2>
        <p className="text-gray-600">시스템 전체 통계를 확인하세요</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className={`hover:shadow-lg transition-shadow ${stat.clickable ? 'cursor-pointer hover:scale-105' : ''}`}
              onClick={stat.onClick}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`h-8 w-8 ${stat.bgColor} rounded-full flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.clickable && (
                  <p className="text-xs text-gray-500 mt-1">클릭하여 차트 보기</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Charts or Tables can be added here */}
      <Card>
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">최근 활동 내역이 여기에 표시됩니다.</p>
        </CardContent>
      </Card>

      {/* Revenue Chart Modal */}
      {showRevenueChart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  매출 추이
                </h3>
                <p className="text-sm text-gray-500 mt-1">최근 30일간의 매출 데이터</p>
              </div>
              <button
                onClick={() => setShowRevenueChart(false)}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {loadingChart ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="ml-3 text-gray-600">차트 데이터를 불러오는 중...</p>
                </div>
              ) : revenueData.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">매출 데이터가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Line Chart */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">일별 매출 추이 (선 그래프)</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => `₩${value.toLocaleString()}`}
                          labelFormatter={(label) => `날짜: ${label}`}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#10b981"
                          strokeWidth={2}
                          name="매출"
                          dot={{ fill: '#10b981', r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="orders"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          name="주문 수"
                          dot={{ fill: '#3b82f6', r: 4 }}
                          yAxisId="right"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Bar Chart */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">일별 매출 (막대 그래프)</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => `₩${value.toLocaleString()}`}
                          labelFormatter={(label) => `날짜: ${label}`}
                        />
                        <Legend />
                        <Bar dataKey="revenue" fill="#10b981" name="매출" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm text-gray-500">총 매출</div>
                        <div className="text-2xl font-bold text-green-600">
                          ₩{revenueData.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm text-gray-500">평균 일매출</div>
                        <div className="text-2xl font-bold text-blue-600">
                          ₩{Math.round(revenueData.reduce((sum, d) => sum + d.revenue, 0) / revenueData.length).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm text-gray-500">총 주문 수</div>
                        <div className="text-2xl font-bold text-purple-600">
                          {revenueData.reduce((sum, d) => sum + d.orders, 0)}건
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Package, Users, ShoppingCart, DollarSign, Briefcase, Star, FileText, MessageSquare } from 'lucide-react';
import { useAdminData } from '../../../hooks/admin/useAdminData';

export function AdminDashboard() {
  const { stats, isLoading } = useAdminData();

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
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`h-8 w-8 ${stat.bgColor} rounded-full flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
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
    </div>
  );
}

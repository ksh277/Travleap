import React, { Suspense, lazy } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent } from './ui/card';
import { Loader2 } from 'lucide-react';

// Lazy load all admin tab components
const AdminDashboard = lazy(() => import('./admin/tabs/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminOrders = lazy(() => import('./admin/tabs/AdminOrders').then(m => ({ default: m.AdminOrders })));
const AdminContacts = lazy(() => import('./admin/tabs/AdminContacts').then(m => ({ default: m.AdminContacts })));
const AdminCoupons = lazy(() => import('./admin/tabs/AdminCoupons').then(m => ({ default: m.AdminCoupons })));

// Import existing external components (already optimized)
import { RentcarManagement } from './admin/RentcarManagement';
import { MediaManagement } from './admin/MediaManagement';
import { NotificationBell } from './admin/NotificationBell';

interface AdminPageOptimizedProps {
  selectedCurrency?: string;
}

// Loading fallback component
const LoadingFallback = () => (
  <Card>
    <CardContent className="flex items-center justify-center py-12">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600 mb-4" />
        <p className="text-gray-600">컴포넌트를 불러오는 중...</p>
      </div>
    </CardContent>
  </Card>
);

export function AdminPageOptimized({ selectedCurrency = 'KRW' }: AdminPageOptimizedProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
            <p className="text-gray-600 mt-2">시스템을 관리하고 모니터링하세요</p>
          </div>
          {/* ✅ 알림 벨 */}
          <NotificationBell />
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard">대시보드</TabsTrigger>
            <TabsTrigger value="orders">주문</TabsTrigger>
            <TabsTrigger value="coupons">쿠폰</TabsTrigger>
            <TabsTrigger value="contacts">문의</TabsTrigger>
            <TabsTrigger value="rentcar">렌트카</TabsTrigger>
            <TabsTrigger value="media">미디어</TabsTrigger>
          </TabsList>

          <Suspense fallback={<LoadingFallback />}>
            <TabsContent value="dashboard">
              <AdminDashboard />
            </TabsContent>
          </Suspense>

          <Suspense fallback={<LoadingFallback />}>
            <TabsContent value="orders">
              <AdminOrders />
            </TabsContent>
          </Suspense>

          <Suspense fallback={<LoadingFallback />}>
            <TabsContent value="coupons">
              <AdminCoupons />
            </TabsContent>
          </Suspense>

          <Suspense fallback={<LoadingFallback />}>
            <TabsContent value="contacts">
              <AdminContacts />
            </TabsContent>
          </Suspense>

          <TabsContent value="rentcar">
            <Suspense fallback={<LoadingFallback />}>
              <RentcarManagement />
            </Suspense>
          </TabsContent>

          <TabsContent value="media">
            <Suspense fallback={<LoadingFallback />}>
              <MediaManagement />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

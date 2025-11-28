import React, { Suspense, lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent } from './ui/card';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';

// Lazy load all admin tab components
const AdminDashboard = lazy(() => import('./admin/tabs/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminOrders = lazy(() => import('./admin/tabs/AdminOrders').then(m => ({ default: m.AdminOrders })));
const AdminContacts = lazy(() => import('./admin/tabs/AdminContacts').then(m => ({ default: m.AdminContacts })));
const AdminCoupons = lazy(() => import('./admin/tabs/AdminCoupons').then(m => ({ default: m.AdminCoupons })));
const AdminPartners = lazy(() => import('./admin/tabs/AdminPartners').then(m => ({ default: m.AdminPartners })));
const AdminInsurance = lazy(() => import('./admin/tabs/AdminInsurance').then(m => ({ default: m.AdminInsurance })));
const AdminRefundPolicies = lazy(() => import('./admin/tabs/AdminRefundPolicies').then(m => ({ default: m.AdminRefundPolicies })));
const AdminCouponSettlements = lazy(() => import('./admin/tabs/AdminCouponSettlements').then(m => ({ default: m.AdminCouponSettlements })));
const AdminCouponStats = lazy(() => import('./admin/tabs/AdminCouponStats').then(m => ({ default: m.AdminCouponStats })));

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
  const {
    isLoggedIn,
    isAdmin,
    isSuperAdmin,
    isMDAdmin,
    user,
    sessionRestored,
    canManagePayments,
    canManageSystem
  } = useAuth();

  // 세션 복원 중
  if (!sessionRestored) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
            <p className="text-gray-600 font-medium">세션을 확인하는 중...</p>
            <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 권한 없음 - 로그인하지 않았거나 MD 관리자 이상이 아님
  if (!isLoggedIn || !isMDAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">접근 권한 없음</h2>
            <p className="text-gray-600 text-center mb-6">
              이 페이지는 관리자만 접근할 수 있습니다.
            </p>
            <Navigate to="/login" replace />
          </CardContent>
        </Card>
      </div>
    );
  }

  // 역할 표시 텍스트
  const getRoleLabel = () => {
    if (isSuperAdmin) return '최고관리자';
    if (isMDAdmin) return 'MD 관리자';
    return '관리자';
  };

  // 관리자 권한 확인 완료 - 대시보드 표시
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
              <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                isSuperAdmin
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {getRoleLabel()}
              </span>
            </div>
            <p className="text-gray-600 mt-2">
              {isSuperAdmin
                ? '시스템 전체를 관리하고 모니터링하세요'
                : '가맹점, 쿠폰, 광고 등 운영 업무를 관리하세요'}
            </p>
          </div>
          {/* ✅ 알림 벨 */}
          <NotificationBell />
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          {/* 권한에 따라 탭 표시 */}
          {/* SUPER_ADMIN: 모든 탭 표시 */}
          {/* MD_ADMIN: 가맹점, 쿠폰, 문의, 미디어만 표시 */}
          <TabsList className={`grid w-full lg:w-auto lg:inline-grid ${
            isSuperAdmin ? 'grid-cols-11' : 'grid-cols-6'
          }`}>
            <TabsTrigger value="dashboard">대시보드</TabsTrigger>
            {/* 주문 - SUPER_ADMIN만 (결제 관련) */}
            {canManagePayments() && <TabsTrigger value="orders">주문</TabsTrigger>}
            {/* 가맹점 - MD 이상 */}
            <TabsTrigger value="partners">가맹점</TabsTrigger>
            {/* 쿠폰 - MD 이상 */}
            <TabsTrigger value="coupons">쿠폰</TabsTrigger>
            {/* 쿠폰통계 - MD 이상 */}
            <TabsTrigger value="coupon-stats">쿠폰통계</TabsTrigger>
            {/* 쿠폰정산 - SUPER_ADMIN만 (결제 관련) */}
            {canManagePayments() && <TabsTrigger value="coupon-settlements">쿠폰정산</TabsTrigger>}
            {/* 보험 - SUPER_ADMIN만 (시스템 설정) */}
            {canManageSystem() && <TabsTrigger value="insurance">보험</TabsTrigger>}
            {/* 환불정책 - SUPER_ADMIN만 (시스템 설정) */}
            {canManageSystem() && <TabsTrigger value="refund">환불정책</TabsTrigger>}
            {/* 문의 - MD 이상 */}
            <TabsTrigger value="contacts">문의</TabsTrigger>
            {/* 렌트카 - SUPER_ADMIN만 (시스템 관리) */}
            {canManageSystem() && <TabsTrigger value="rentcar">렌트카</TabsTrigger>}
            {/* 미디어/광고 - MD 이상 */}
            <TabsTrigger value="media">미디어</TabsTrigger>
          </TabsList>

          {/* 대시보드 - 모든 관리자 */}
          <Suspense fallback={<LoadingFallback />}>
            <TabsContent value="dashboard">
              <AdminDashboard />
            </TabsContent>
          </Suspense>

          {/* 주문 - SUPER_ADMIN만 */}
          {canManagePayments() && (
            <Suspense fallback={<LoadingFallback />}>
              <TabsContent value="orders">
                <AdminOrders />
              </TabsContent>
            </Suspense>
          )}

          {/* 가맹점 - MD 이상 */}
          <Suspense fallback={<LoadingFallback />}>
            <TabsContent value="partners">
              <AdminPartners />
            </TabsContent>
          </Suspense>

          {/* 쿠폰 - MD 이상 */}
          <Suspense fallback={<LoadingFallback />}>
            <TabsContent value="coupons">
              <AdminCoupons />
            </TabsContent>
          </Suspense>

          {/* 쿠폰통계 - MD 이상 */}
          <Suspense fallback={<LoadingFallback />}>
            <TabsContent value="coupon-stats">
              <AdminCouponStats />
            </TabsContent>
          </Suspense>

          {/* 쿠폰정산 - SUPER_ADMIN만 */}
          {canManagePayments() && (
            <Suspense fallback={<LoadingFallback />}>
              <TabsContent value="coupon-settlements">
                <AdminCouponSettlements />
              </TabsContent>
            </Suspense>
          )}

          {/* 보험 - SUPER_ADMIN만 */}
          {canManageSystem() && (
            <Suspense fallback={<LoadingFallback />}>
              <TabsContent value="insurance">
                <AdminInsurance />
              </TabsContent>
            </Suspense>
          )}

          {/* 환불정책 - SUPER_ADMIN만 */}
          {canManageSystem() && (
            <Suspense fallback={<LoadingFallback />}>
              <TabsContent value="refund">
                <AdminRefundPolicies />
              </TabsContent>
            </Suspense>
          )}

          {/* 문의 - MD 이상 */}
          <Suspense fallback={<LoadingFallback />}>
            <TabsContent value="contacts">
              <AdminContacts />
            </TabsContent>
          </Suspense>

          {/* 렌트카 - SUPER_ADMIN만 */}
          {canManageSystem() && (
            <TabsContent value="rentcar">
              <Suspense fallback={<LoadingFallback />}>
                <RentcarManagement />
              </Suspense>
            </TabsContent>
          )}

          {/* 미디어/광고 - MD 이상 */}
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

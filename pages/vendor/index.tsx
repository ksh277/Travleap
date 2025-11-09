/**
 * 통합 벤더 대시보드
 * /vendor
 * 모든 카테고리의 상품을 한 페이지에서 관리
 */

import { VendorDashboard } from '../../components/VendorDashboard';

export default function VendorDashboardPage() {
  return (
    <VendorDashboard
      categoryName="전체 상품 관리"
    />
  );
}

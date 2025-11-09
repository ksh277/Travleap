/**
 * 관광지 벤더 대시보드
 * /vendor/attractions
 */

import { VendorDashboard } from '../../../components/VendorDashboard';

export default function AttractionsVendorDashboard() {
  return (
    <VendorDashboard
      categoryFilter="관광지"
      categoryName="관광지 상품 관리"
    />
  );
}

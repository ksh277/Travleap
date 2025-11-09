/**
 * 이벤트 벤더 대시보드
 * /vendor/events
 */

import { VendorDashboard } from '../../../components/VendorDashboard';

export default function EventsVendorDashboard() {
  return (
    <VendorDashboard
      categoryFilter="이벤트"
      categoryName="이벤트 상품 관리"
    />
  );
}

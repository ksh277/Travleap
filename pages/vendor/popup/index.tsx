/**
 * 팝업 상품 벤더 대시보드
 * /vendor/popup
 */

import { VendorDashboard } from '../../../components/VendorDashboard';

export default function PopupVendorDashboard() {
  return (
    <VendorDashboard
      categoryFilter="팝업"
      categoryName="팝업 상품 관리"
    />
  );
}

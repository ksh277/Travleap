/**
 * 음식점 벤더 대시보드
 * /vendor/food
 */

import { VendorDashboard } from '../../../components/VendorDashboard';

export default function FoodVendorDashboard() {
  return (
    <VendorDashboard
      categoryFilter="음식점"
      categoryName="음식점 상품 관리"
    />
  );
}

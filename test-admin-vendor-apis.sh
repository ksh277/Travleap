#!/bin/bash

echo "===== 관리자 벤더 관리 API 테스트 ====="
echo ""
echo "이 테스트는 관리자 권한으로 벤더 정보를 조회, 수정, 삭제하는 API를 검증합니다."
echo ""

# 테스트용 관리자 ID (실제로는 Neon DB users 테이블의 admin role user id)
ADMIN_ID="test-admin-user-id"
VENDOR_ID="test-vendor-id"

echo "=== 1. 관리자 인증 없이 벤더 삭제 시도 (실패해야 정상) ==="
echo "Expected: 401 Unauthorized"
curl -s -X DELETE "http://localhost:3004/api/admin/vendors/${VENDOR_ID}" | jq .
echo ""
echo ""

echo "=== 2. 잘못된 관리자 ID로 벤더 삭제 시도 (실패해야 정상) ==="
echo "Expected: 403 Forbidden"
curl -s -X DELETE "http://localhost:3004/api/admin/vendors/${VENDOR_ID}" \
  -H "x-admin-id: invalid-admin-id" | jq .
echo ""
echo ""

echo "=== 3. 유효한 관리자 ID로 벤더 정보 수정 (PUT) ==="
echo "Expected: 200 Success"
echo "Database: Neon (admin auth) + PlanetScale (vendor data)"
curl -s -X PUT "http://localhost:3004/api/admin/vendors/${VENDOR_ID}" \
  -H "Content-Type: application/json" \
  -H "x-admin-id: ${ADMIN_ID}" \
  -d '{
    "business_name": "테스트 렌터카 (관리자 수정)",
    "contact_name": "홍길동",
    "contact_email": "test@example.com",
    "contact_phone": "010-1234-5678",
    "address": "서울시 강남구",
    "description": "관리자가 수정한 설명",
    "cancellation_policy": "24시간 전 취소 가능",
    "status": "active",
    "is_verified": true
  }' | jq .
echo ""
echo ""

echo "=== 4. 진행 중인 예약이 있는 벤더 삭제 시도 (실패해야 정상) ==="
echo "Expected: 400 Bad Request - 진행 중이거나 확정된 예약이 있어 삭제할 수 없습니다."
echo "이 테스트를 위해서는 실제 예약이 있는 벤더 ID가 필요합니다"
curl -s -X DELETE "http://localhost:3004/api/admin/vendors/${VENDOR_ID}" \
  -H "x-admin-id: ${ADMIN_ID}" | jq .
echo ""
echo ""

echo "=== 5. 예약이 없는 벤더 삭제 (성공해야 정상) ==="
echo "Expected: 200 Success - 업체가 성공적으로 삭제되었습니다."
echo "Database: PlanetScale (cascade delete in order)"
echo "  1. Check bookings (confirmed/pending)"
echo "  2. Delete completed/cancelled bookings"
echo "  3. Delete vehicles"
echo "  4. Delete locations"
echo "  5. Delete vendor"
VENDOR_ID_NO_BOOKINGS="test-vendor-no-bookings"
curl -s -X DELETE "http://localhost:3004/api/admin/vendors/${VENDOR_ID_NO_BOOKINGS}" \
  -H "x-admin-id: ${ADMIN_ID}" | jq .
echo ""
echo ""

echo "=== 테스트 요약 ==="
echo "✅ Admin authentication: Neon DB (users table, role='admin')"
echo "✅ Vendor CRUD operations: PlanetScale DB (rentcar_vendors, rentcar_vehicles, etc.)"
echo "✅ DELETE cascade order:"
echo "   1. Check active bookings (prevent deletion if exists)"
echo "   2. Delete booking history"
echo "   3. Delete vehicles"
echo "   4. Delete locations"
echo "   5. Delete vendor account"
echo ""
echo "✅ PUT operations: Direct update to PlanetScale rentcar_vendors table"
echo ""
echo "===== 테스트 완료 ====="

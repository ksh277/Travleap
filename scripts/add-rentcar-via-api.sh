#!/bin/bash

echo "🚗 렌트카 테스트 데이터 추가 (API 방식)"
echo ""

BASE_URL="http://localhost:3004"

# Note: rentcar vendor creation endpoint doesn't exist in server-api.ts
# We need to add data directly to database or create the endpoint first

echo "⚠️  렌트카 vendor 생성 API가 없어서 데이터를 직접 DB에 넣어야 합니다."
echo ""
echo "다음 SQL을 PlanetScale 콘솔에서 직접 실행해주세요:"
echo ""
echo "-- 업체 1: CSV용"
echo "INSERT INTO rentcar_vendors (vendor_code, business_name, brand_name, business_number, contact_name, contact_email, contact_phone, description, status, is_verified, commission_rate, api_enabled, total_vehicles, created_at, updated_at)"
echo "VALUES ('CSV_VENDOR_001', '신안 퍼플렌터카', '퍼플렌터카', '123-45-67890', '김렌트', 'purple@rentcar.com', '061-111-2222', '신안군 전 지역 렌터카 서비스', 'active', 1, 10.00, 0, 0, NOW(), NOW());"
echo ""
echo "-- 업체 2: API용"
echo "INSERT INTO rentcar_vendors (vendor_code, business_name, brand_name, business_number, contact_name, contact_email, contact_phone, description, status, is_verified, commission_rate, api_enabled, api_url, api_key, api_auth_type, total_vehicles, created_at, updated_at)"
echo "VALUES ('API_VENDOR_001', '증도 그린렌터카', '그린렌터카', '098-76-54321', '박자동', 'green@rentcar.com', '061-333-4444', '증도면 전문 렌터카', 'active', 1, 10.00, 1, 'http://localhost:3005/api/vehicles', 'test_api_key_12345', 'bearer', 0, NOW(), NOW());"

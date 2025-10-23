#!/bin/bash

echo "===== 벤더 대시보드 API 테스트 ====="
echo ""

# 테스트용 JWT 토큰 생성 (실제로는 로그인해서 받아야 함)
# 여기서는 vehicles API가 제대로 인증을 확인하는지 테스트
echo "1. 차량 목록 API 테스트 (인증 없음 - 실패해야 정상)"
curl -s -X GET http://localhost:3004/api/vendor/vehicles | jq .
echo ""
echo ""

echo "2. 차량 목록 API 테스트 (잘못된 토큰 - 실패해야 정상)"
curl -s -X GET http://localhost:3004/api/vendor/vehicles \
  -H "Authorization: Bearer invalid_token" | jq .
echo ""
echo ""

echo "3. 예약 목록 API 테스트 (인증 없음 - 실패해야 정상)"
curl -s -X GET http://localhost:3004/api/vendor/bookings | jq .
echo ""
echo ""

echo "4. 매출 API 테스트 (인증 없음 - 실패해야 정상)"
curl -s -X GET http://localhost:3004/api/vendor/revenue | jq .
echo ""
echo ""

echo "5. 차량 ENUM 매핑 테스트 (POST)"
echo "   - 한글 입력: 소형, 자동, LPG"
echo "   - DB 저장: compact, automatic, lpg"
curl -s -X POST http://localhost:3004/api/vendor/vehicles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_token" \
  -d '{
    "display_name": "테스트 차량",
    "vehicle_class": "소형",
    "transmission_type": "자동",
    "fuel_type": "LPG",
    "seating_capacity": 5,
    "daily_rate_krw": 50000
  }' | jq .
echo ""
echo ""

echo "===== 테스트 완료 ====="

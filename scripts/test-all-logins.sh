#!/bin/bash
echo "=== 전체 계정 로그인 테스트 ==="
echo ""

accounts=(
  "admin@test.com:admin123"
  "admin@shinan.com:admin123"
  "user@test.com:user123"
  "vendor@test.com:vendor123"
  "manager@shinan.com:ha1045"
)

for account in "${accounts[@]}"; do
  IFS=':' read -r email password <<< "$account"
  result=$(curl -s -X POST http://localhost:3004/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}" | grep -o '"success":[^,]*')
  echo "$email: $result"
done

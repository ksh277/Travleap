/**
 * Mock Rentcar API Server
 *
 * 렌트카 업체 API를 시뮬레이션하는 Mock 서버
 * API 연동 테스트용
 */

import express from 'express';

const app = express();
const PORT = 3005;

app.use(express.json());

// Mock 차량 데이터
const mockVehicles = [
  {
    vehicle_code: 'GRN001',
    brand: '현대',
    model: '아반떼',
    year: 2024,
    display_name: '현대 아반떼 2024',
    vehicle_class: 'compact',
    vehicle_type: '세단',
    fuel_type: 'gasoline',
    transmission: 'automatic',
    seating_capacity: 5,
    door_count: 4,
    large_bags: 2,
    small_bags: 2,
    daily_rate: 45000,
    deposit_amount: 100000,
    thumbnail_url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400',
    images: ['https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800'],
    features: ['블루투스', '후방카메라', '내비게이션'],
    age_requirement: 21,
    license_requirement: '1년 이상',
    mileage_limit: 200,
    unlimited_mileage: false,
    smoking_allowed: false
  },
  {
    vehicle_code: 'GRN002',
    brand: '기아',
    model: 'K5',
    year: 2024,
    display_name: '기아 K5 2024',
    vehicle_class: 'midsize',
    vehicle_type: '세단',
    fuel_type: 'gasoline',
    transmission: 'automatic',
    seating_capacity: 5,
    door_count: 4,
    large_bags: 3,
    small_bags: 2,
    daily_rate: 55000,
    deposit_amount: 120000,
    thumbnail_url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400',
    images: ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800'],
    features: ['스마트키', 'HUD', '어댑티브 크루즈 컨트롤'],
    age_requirement: 21,
    license_requirement: '1년 이상',
    mileage_limit: 200,
    unlimited_mileage: false,
    smoking_allowed: false
  },
  {
    vehicle_code: 'GRN003',
    brand: '현대',
    model: '팰리세이드',
    year: 2024,
    display_name: '현대 팰리세이드 2024',
    vehicle_class: 'suv',
    vehicle_type: 'SUV',
    fuel_type: 'diesel',
    transmission: 'automatic',
    seating_capacity: 7,
    door_count: 4,
    large_bags: 4,
    small_bags: 3,
    daily_rate: 85000,
    deposit_amount: 150000,
    thumbnail_url: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=400',
    images: ['https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800'],
    features: ['7인승', '파노라마 선루프', '전동 시트', '후방 모니터'],
    age_requirement: 23,
    license_requirement: '2년 이상',
    mileage_limit: 200,
    unlimited_mileage: false,
    smoking_allowed: false
  }
];

// GET /api/vehicles - 차량 목록 조회
app.get('/api/vehicles', (req, res) => {
  const apiKey = req.headers['authorization']?.replace('Bearer ', '');

  // API 키 검증
  if (!apiKey || apiKey !== 'test_api_key_12345') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key'
    });
  }

  console.log('✅ [Mock API] Vehicle data requested');
  console.log(`   Returning ${mockVehicles.length} vehicles\n`);

  // 표준 JSON 응답
  res.json({
    success: true,
    data: mockVehicles,
    total: mockVehicles.length
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mock Rentcar API Server is running' });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`\n🚗 ===== Mock Rentcar API Server =====`);
  console.log(`✅ Running on: http://localhost:${PORT}`);
  console.log(`✅ Endpoint: http://localhost:${PORT}/api/vehicles`);
  console.log(`✅ Health Check: http://localhost:${PORT}/health`);
  console.log(`\n📝 API Key: test_api_key_12345`);
  console.log(`\n📦 Mock Vehicles: ${mockVehicles.length} vehicles`);
  console.log(`   - 현대 아반떼 2024 (GRN001)`);
  console.log(`   - 기아 K5 2024 (GRN002)`);
  console.log(`   - 현대 팰리세이드 2024 (GRN003)`);
  console.log(`\n=====================================\n`);
});

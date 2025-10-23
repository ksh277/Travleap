import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const VERCEL_URL = 'https://travleap.vercel.app';

async function testFinal() {
  console.log('🧪 최종 완전 테스트...\n');

  // 1. 올바른 토큰 생성 (userId=21)
  const token = jwt.sign(
    {
      userId: 21,  // rentcar@vendor.com의 실제 ID
      email: 'rentcar@vendor.com',
      role: 'vendor',
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  console.log('✅ JWT 토큰 생성 (userId=21, role=vendor)\n');

  // 2. GET /api/vendor/vehicles
  console.log('=== TEST 1: GET /api/vendor/vehicles ===');
  const getRes = await fetch(`${VERCEL_URL}/api/vendor/vehicles`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  console.log('Status:', getRes.status);
  const getData = await getRes.json();
  console.log('Response:', getData);
  console.log('');

  if (getRes.status !== 200) {
    console.log('❌ GET 실패! 여기서 중단합니다.');
    return;
  }

  // 3. POST /api/vendor/vehicles
  console.log('=== TEST 2: POST /api/vendor/vehicles ===');
  const newVehicle = {
    display_name: '테스트차량 현대 아반떼',
    vehicle_class: '중형',
    seating_capacity: 5,
    transmission_type: '자동',
    fuel_type: '가솔린',
    daily_rate_krw: 50000,
    is_available: true,
    image_urls: []
  };

  const postRes = await fetch(`${VERCEL_URL}/api/vendor/vehicles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(newVehicle)
  });

  console.log('Status:', postRes.status);
  const postData = await postRes.json();
  console.log('Response:', postData);
  console.log('');

  if (postRes.status === 200 || postRes.status === 201) {
    console.log('✅ 차량 추가 성공!');

    // 4. 다시 GET으로 확인
    console.log('\n=== TEST 3: 추가된 차량 확인 ===');
    const verifyRes = await fetch(`${VERCEL_URL}/api/vendor/vehicles`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const verifyData = await verifyRes.json();
    console.log('현재 차량 수:', verifyData.data?.length || 0);
    if (verifyData.data && verifyData.data.length > 0) {
      console.log('최신 차량:', verifyData.data[0]);
    }
  } else {
    console.log('❌ 차량 추가 실패!');
  }
}

testFinal().catch(console.error);

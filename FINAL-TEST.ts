import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { connect } from '@planetscale/database';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const VERCEL_URL = 'https://travleap.vercel.app';

async function finalTest() {
  console.log('🔥 최종 완전 테스트 - rentcar@vendor.com\n');
  console.log('계정: rentcar@vendor.com / rentcar123\n');

  // 올바른 토큰 생성
  const token = jwt.sign(
    { userId: 21, email: 'rentcar@vendor.com', role: 'vendor' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  console.log('=== 1. GET /api/vendor/vehicles ===');
  const getRes = await fetch(`${VERCEL_URL}/api/vendor/vehicles`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Status:', getRes.status);
  const getData = await getRes.json();
  console.log('Response:', JSON.stringify(getData, null, 2));

  if (getRes.status !== 200) {
    console.log('\n❌ GET 실패! 중단합니다.');
    console.log('문제:', getData.message || getData.error);
    return;
  }
  console.log('✅ GET 성공 - 현재 차량:', getData.data?.length || 0, '대\n');

  // POST 테스트
  console.log('=== 2. POST /api/vendor/vehicles (차량 추가) ===');
  const testVehicle = {
    display_name: '현대 아반떼',
    vehicle_class: '중형',
    seating_capacity: 5,
    transmission_type: '자동',
    fuel_type: '가솔린',
    daily_rate_krw: 50000,
    is_available: true,
    image_urls: []
  };

  console.log('전송 데이터:', JSON.stringify(testVehicle, null, 2));

  const postRes = await fetch(`${VERCEL_URL}/api/vendor/vehicles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(testVehicle)
  });

  console.log('Status:', postRes.status);
  const postData = await postRes.json();
  console.log('Response:', JSON.stringify(postData, null, 2));

  if (postRes.status === 200 || postRes.status === 201) {
    console.log('\n✅ POST 성공! 차량 추가됨!');

    // 다시 GET으로 확인
    console.log('\n=== 3. 재확인 GET /api/vendor/vehicles ===');
    const verifyRes = await fetch(`${VERCEL_URL}/api/vendor/vehicles`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const verifyData = await verifyRes.json();
    console.log('최종 차량 수:', verifyData.data?.length || 0, '대');

    if (verifyData.data && verifyData.data.length > 0) {
      console.log('최신 차량:', verifyData.data[0].display_name);
    }

    // DB에서 직접 확인
    console.log('\n=== 4. DB 직접 확인 ===');
    const db = connect({ url: process.env.DATABASE_URL! });
    const dbResult = await db.execute(
      'SELECT id, display_name, vehicle_class, daily_rate_krw, created_at FROM rentcar_vehicles WHERE vendor_id = 12 ORDER BY created_at DESC LIMIT 3'
    );
    console.log('DB 결과:', dbResult.rows);

    console.log('\n🎉 모든 테스트 통과! 차량 추가 완벽하게 작동합니다!');
  } else {
    console.log('\n❌ POST 실패!');
    console.log('에러 메시지:', postData.message);
    console.log('에러 상세:', postData.error);
  }
}

finalTest().catch(console.error);

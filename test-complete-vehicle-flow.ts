import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { connect } from '@planetscale/database';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'travleap-secret-key-2024';
const VERCEL_URL = 'https://travleap.vercel.app';

async function testCompleteFlow() {
  console.log('🧪 차량 추가 전체 플로우 테스트 시작...\n');

  // 1. JWT 토큰 생성
  console.log('=== 1. JWT 토큰 생성 ===');
  const token = jwt.sign(
    {
      userId: 31,
      email: 'rentcar@vendor.com',
      role: 'vendor',
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET
  );
  console.log('✅ 토큰 생성 완료\n');

  // 2. GET /api/vendor/vehicles - 현재 차량 목록 조회
  console.log('=== 2. 차량 목록 조회 (GET /api/vendor/vehicles) ===');
  const getResponse = await fetch(`${VERCEL_URL}/api/vendor/vehicles`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const getStatus = getResponse.status;
  console.log('상태 코드:', getStatus);

  if (getStatus === 200) {
    const getData = await getResponse.json();
    console.log('✅ 성공:', getData);
    console.log('현재 차량 수:', getData.data?.length || 0);
  } else {
    const errorText = await getResponse.text();
    console.log('❌ 실패:', errorText);
    return;
  }

  // 3. POST /api/upload-image - 이미지 업로드 (base64)
  console.log('\n=== 3. 이미지 업로드 (POST /api/upload-image) ===');

  // 간단한 1x1 픽셀 PNG 이미지 (base64)
  const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const uploadResponse = await fetch(`${VERCEL_URL}/api/upload-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      image: testImageBase64,
      filename: 'test-car.png',
      category: 'rentcar'
    })
  });

  const uploadStatus = uploadResponse.status;
  console.log('상태 코드:', uploadStatus);

  let uploadedImageUrl = '';
  if (uploadStatus === 200) {
    const uploadData = await uploadResponse.json();
    console.log('✅ 업로드 성공:', uploadData);
    uploadedImageUrl = uploadData.url;
  } else {
    const errorText = await uploadResponse.text();
    console.log('⚠️ 업로드 실패 (테스트 계속):', errorText);
  }

  // 4. POST /api/vendor/vehicles - 새 차량 추가
  console.log('\n=== 4. 차량 추가 (POST /api/vendor/vehicles) ===');

  const newVehicle = {
    display_name: '테스트 차량 현대 아반떼',
    vehicle_class: '중형',
    seating_capacity: 5,
    transmission_type: '자동',
    fuel_type: '가솔린',
    daily_rate_krw: 50000,
    hourly_rate_krw: 7000,
    mileage_limit_km: 200,
    is_available: true,
    image_urls: uploadedImageUrl ? [uploadedImageUrl] : []
  };

  console.log('전송 데이터:', JSON.stringify(newVehicle, null, 2));

  const postResponse = await fetch(`${VERCEL_URL}/api/vendor/vehicles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(newVehicle)
  });

  const postStatus = postResponse.status;
  console.log('상태 코드:', postStatus);

  if (postStatus === 201 || postStatus === 200) {
    const postData = await postResponse.json();
    console.log('✅ 차량 추가 성공:', postData);

    const insertId = postData.data?.insertId;

    // 5. 다시 GET으로 확인
    console.log('\n=== 5. 추가된 차량 확인 (GET /api/vendor/vehicles) ===');
    const verifyResponse = await fetch(`${VERCEL_URL}/api/vendor/vehicles`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (verifyResponse.status === 200) {
      const verifyData = await verifyResponse.json();
      console.log('✅ 최종 차량 수:', verifyData.data?.length || 0);
      console.log('차량 목록:', verifyData.data);
    }

    // 6. DB에서 직접 확인
    console.log('\n=== 6. DB에서 직접 확인 ===');
    const connection = connect({ url: process.env.DATABASE_URL! });
    const dbResult = await connection.execute(
      'SELECT id, display_name, daily_rate_krw, vendor_id, created_at FROM rentcar_vehicles WHERE vendor_id = 12 ORDER BY created_at DESC LIMIT 5'
    );
    console.log('✅ DB 결과:', dbResult.rows);

  } else {
    const errorText = await getResponse.text();
    console.log('❌ 차량 추가 실패:', errorText);
  }

  console.log('\n🎉 테스트 완료!');
}

testCompleteFlow().catch(console.error);

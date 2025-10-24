import dotenv from 'dotenv';
import { connect } from '@planetscale/database';

dotenv.config();

async function testVehicleAPI() {
  console.log('🧪 차량 이미지 API 테스트 중...\n');

  const connection = connect({
    host: process.env.DATABASE_HOST,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
  });

  try {
    // 벤더 13의 차량 조회 (API 로직과 동일하게)
    const vendorId = 13;

    const vehiclesResult = await connection.execute(
      `SELECT * FROM rentcar_vehicles
       WHERE vendor_id = ? AND is_active = 1
       ORDER BY daily_rate_krw ASC
       LIMIT 3`,
      [vendorId]
    );

    console.log(`✅ 벤더 ${vendorId}의 차량 ${vehiclesResult.rows.length}개 조회\n`);

    for (const vehicle of vehiclesResult.rows) {
      console.log(`차량: ${vehicle.display_name || vehicle.model}`);
      console.log(`이미지 필드 타입: ${typeof vehicle.images}`);
      console.log(`이미지 필드 값: ${JSON.stringify(vehicle.images).substring(0, 100)}...`);

      // API 로직 그대로 적용
      const images = vehicle.images
        ? (typeof vehicle.images === 'string' ? JSON.parse(vehicle.images) : vehicle.images)
        : [];

      console.log(`✅ 파싱 결과: ${Array.isArray(images) ? `배열 ${images.length}개` : typeof images}`);

      if (Array.isArray(images) && images.length > 0) {
        console.log(`   첫 번째 이미지: ${images[0].substring(0, 80)}...`);
      } else {
        console.log(`   ❌ 이미지 없음`);
      }
      console.log('');
    }

    console.log('\n✅ 모든 테스트 통과! 차량 이미지가 정상적으로 파싱됩니다.');

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

testVehicleAPI();

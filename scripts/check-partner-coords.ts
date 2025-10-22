import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = connect({ url: process.env.DATABASE_URL });

async function checkCoordinates() {
  console.log('🔍 파트너 좌표 확인 중...\n');

  try {
    // 최근 추가된 신안 파트너 좌표 확인
    const result = await connection.execute(`
      SELECT id, business_name, business_address, lat, lng, coordinates
      FROM partners
      WHERE business_address LIKE '%신안군%'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`📍 최근 추가된 신안 파트너 좌표 (10개):\n`);

    result.rows.forEach((partner: any) => {
      console.log(`ID ${partner.id}: ${partner.business_name}`);
      console.log(`   주소: ${partner.business_address}`);
      console.log(`   좌표: lat=${partner.lat}, lng=${partner.lng}`);
      console.log(`   coordinates: ${partner.coordinates || 'null'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

checkCoordinates();

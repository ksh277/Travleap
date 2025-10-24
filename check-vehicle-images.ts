/**
 * 차량 이미지 데이터 확인
 */

import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = connect({
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
});

async function checkVehicleImages() {
  console.log('🔍 rentcar_vendors 테이블 스키마 확인 중...\n');

  try {
    // 테이블 스키마 확인
    const { rows: schema } = await connection.execute(`DESCRIBE rentcar_vendors`);

    console.log('✅ rentcar_vendors 컬럼:\n');
    for (const col of schema) {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    }

    // 벤더 확인
    const { rows: vendors } = await connection.execute(`
      SELECT id, brand_name, business_name, status, images, sample_images
      FROM rentcar_vendors
      WHERE status = 'active'
      ORDER BY id DESC
      LIMIT 3
    `);

    console.log(`\n✅ 활성 벤더 ${vendors.length}개:\n`);
    for (const vendor of vendors) {
      console.log(`  ${vendor.id}. ${vendor.brand_name || vendor.business_name}`);
      console.log(`     images: ${vendor.images || 'NULL'}`);
      console.log(`     sample_images 타입: ${typeof vendor.sample_images}`);
      if (vendor.sample_images) {
        const si = Array.isArray(vendor.sample_images) ? vendor.sample_images : JSON.parse(vendor.sample_images);
        console.log(`     sample_images: ${si.length}개`);
      }
      console.log('');
    }


  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

checkVehicleImages();

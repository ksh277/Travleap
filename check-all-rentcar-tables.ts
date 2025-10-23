import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = connect({ url: process.env.DATABASE_URL! });

async function checkAllTables() {
  console.log('🔍 모든 렌트카 관련 테이블 확인...\n');

  // 1. rentcar_vehicles 테이블
  console.log('=== 1. rentcar_vehicles 테이블 ===');
  const vehicles = await connection.execute('SELECT COUNT(*) as count FROM rentcar_vehicles');
  console.log('총 차량 수:', vehicles.rows[0]);

  const vehicleSample = await connection.execute('SELECT * FROM rentcar_vehicles LIMIT 1');
  if (vehicleSample.rows && vehicleSample.rows.length > 0) {
    console.log('컬럼:', Object.keys(vehicleSample.rows[0]));
    console.log('샘플:', vehicleSample.rows[0]);
  }

  // vendor_id=12의 차량들
  const vendor12Vehicles = await connection.execute(
    'SELECT id, vendor_id, display_name, brand, model FROM rentcar_vehicles WHERE vendor_id = 12 LIMIT 5'
  );
  console.log('\n📊 vendor_id=12의 차량들:', vendor12Vehicles.rows);

  // 2. rentcar_vendors 확인
  console.log('\n=== 2. rentcar_vendors 테이블 ===');
  const vendor12 = await connection.execute(
    'SELECT * FROM rentcar_vendors WHERE id = 12'
  );
  console.log('vendor_id=12:', vendor12.rows[0]);

  // 3. 모든 차량의 vendor_id 분포
  console.log('\n=== 3. 차량의 vendor_id 분포 ===');
  const vendorDistribution = await connection.execute(
    'SELECT vendor_id, COUNT(*) as count FROM rentcar_vehicles GROUP BY vendor_id ORDER BY count DESC'
  );
  console.log('Vendor별 차량 수:', vendorDistribution.rows);
}

checkAllTables().catch(console.error);

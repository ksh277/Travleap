import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkAllEnums() {
  const db = connect({ url: process.env.DATABASE_URL! });

  console.log('🔍 rentcar_vehicles 테이블의 모든 ENUM 컬럼 확인...\n');

  // 실제 데이터에서 고유값 추출
  const result = await db.execute('SELECT DISTINCT vehicle_class, fuel_type, transmission, vehicle_type FROM rentcar_vehicles LIMIT 50');

  const vehicleClasses = new Set();
  const fuelTypes = new Set();
  const transmissions = new Set();
  const vehicleTypes = new Set();

  result.rows?.forEach((row: any) => {
    if (row.vehicle_class) vehicleClasses.add(row.vehicle_class);
    if (row.fuel_type) fuelTypes.add(row.fuel_type);
    if (row.transmission) transmissions.add(row.transmission);
    if (row.vehicle_type) vehicleTypes.add(row.vehicle_type);
  });

  console.log('✅ vehicle_class 허용값:', Array.from(vehicleClasses));
  console.log('✅ fuel_type 허용값:', Array.from(fuelTypes));
  console.log('✅ transmission 허용값:', Array.from(transmissions));
  console.log('✅ vehicle_type 허용값:', Array.from(vehicleTypes));

  console.log('\n현재 매핑:');
  console.log('vehicle_class: 소형→compact, 중형→midsize, 대형→fullsize, 럭셔리→luxury, SUV→suv, 밴→van');
  console.log('fuel_type: 가솔린→gasoline, 디젤→diesel, 하이브리드→hybrid, 전기→electric');
  console.log('transmission: 자동→automatic, 수동→manual');
  console.log('vehicle_type: (현재 하드코딩: "세단")');
}

checkAllEnums().catch(console.error);

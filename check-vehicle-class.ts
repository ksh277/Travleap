import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkVehicleClass() {
  const db = connect({ url: process.env.DATABASE_URL! });

  const result = await db.execute('SELECT DISTINCT vehicle_class FROM rentcar_vehicles LIMIT 20');

  console.log('✅ vehicle_class 허용값:');
  result.rows?.forEach((row: any) => {
    console.log('  -', row.vehicle_class);
  });
}

checkVehicleClass().catch(console.error);

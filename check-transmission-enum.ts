import { connect } from '@planetscale/database';
import 'dotenv/config';

const connection = connect({ url: process.env.DATABASE_URL! });

async function main() {
  const result = await connection.execute('SHOW COLUMNS FROM rentcar_vehicles WHERE Field = "transmission"');
  console.log(JSON.stringify(result.rows, null, 2));

  // Also check what values we currently have
  const values = await connection.execute('SELECT DISTINCT transmission FROM rentcar_vehicles');
  console.log('\nCurrent transmission values:');
  values.rows.forEach((r: any) => console.log(`  - ${r.transmission}`));

  process.exit(0);
}

main();

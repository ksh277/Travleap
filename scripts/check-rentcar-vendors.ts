import { db } from '../utils/database.js';

async function checkRentcarVendors() {
  try {
    console.log('🔍 Checking rentcar_vendors table...\n');

    const vendors = await db.query('SELECT * FROM rentcar_vendors LIMIT 10');

    console.log(`Found ${vendors.length} vendors:\n`);
    console.log(JSON.stringify(vendors, null, 2));

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  } finally {
    process.exit(0);
  }
}

checkRentcarVendors();

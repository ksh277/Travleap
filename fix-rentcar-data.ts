/**
 * 렌트카 데이터 수정 스크립트
 * 1. ENUM 값 수정 (한글 → 영어, automatic → auto)
 * 2. 고아 차량 삭제
 */

import { connect } from '@planetscale/database';
import 'dotenv/config';

const connection = connect({ url: process.env.DATABASE_URL! });

async function checkSchema() {
  console.log('\n🔍 Checking rentcar_vendors schema...');
  const result = await connection.execute('DESCRIBE rentcar_vendors');
  console.log('Columns:');
  result.rows.forEach((row: any) => {
    console.log(`  - ${row.Field} (${row.Type})`);
  });
}

async function fixVehicleTypeENUMs() {
  console.log('\n🔧 Fixing vehicle_type ENUM values...');

  // 세단 → sedan
  const result1 = await connection.execute(
    `UPDATE rentcar_vehicles
    SET vehicle_type = 'sedan'
    WHERE vehicle_type = '세단'`
  );
  console.log(`✅ Updated ${result1.rowsAffected} vehicles: '세단' → 'sedan'`);
}

async function fixTransmissionENUMs() {
  console.log('\n🔧 Checking transmission ENUM values...');
  console.log('   ℹ️  DB uses ENUM(\'manual\',\'automatic\') - no changes needed');
  console.log('   ℹ️  API layer handles mapping automatic ↔ auto');
}

async function deleteOrphanedVehicles() {
  console.log('\n🗑️  Deleting orphaned vehicles...');

  // Find orphaned first
  const orphaned = await connection.execute(
    `SELECT rv.id, rv.brand, rv.model
    FROM rentcar_vehicles rv
    LEFT JOIN rentcar_vendors v ON rv.vendor_id = v.id
    WHERE v.id IS NULL`
  );

  console.log(`Found ${orphaned.rows.length} orphaned vehicles:`);
  orphaned.rows.forEach((v: any) => {
    console.log(`  - ID ${v.id}: ${v.brand} ${v.model}`);
  });

  if (orphaned.rows.length > 0) {
    const result = await connection.execute(
      `DELETE rv FROM rentcar_vehicles rv
      LEFT JOIN rentcar_vendors v ON rv.vendor_id = v.id
      WHERE v.id IS NULL`
    );
    console.log(`✅ Deleted ${result.rowsAffected} orphaned vehicles`);
  }
}

async function verifyFixes() {
  console.log('\n✅ Verifying fixes...');

  // Check vehicle_type
  const invalidTypes = await connection.execute(
    `SELECT DISTINCT vehicle_type
    FROM rentcar_vehicles
    WHERE vehicle_type NOT IN ('sedan', 'suv', 'van', 'truck', 'sports')
      AND vehicle_type IS NOT NULL`
  );

  if (invalidTypes.rows.length > 0) {
    console.log('⚠️  Still have invalid vehicle_types:');
    invalidTypes.rows.forEach((r: any) => console.log(`  - ${r.vehicle_type}`));
  } else {
    console.log('✅ All vehicle_types are valid');
  }

  // Check transmission
  const invalidTrans = await connection.execute(
    `SELECT DISTINCT transmission
    FROM rentcar_vehicles
    WHERE transmission NOT IN ('automatic', 'manual')
      AND transmission IS NOT NULL`
  );

  if (invalidTrans.rows.length > 0) {
    console.log('⚠️  Still have invalid transmissions:');
    invalidTrans.rows.forEach((r: any) => console.log(`  - ${r.transmission}`));
  } else {
    console.log('✅ All transmissions are valid');
  }

  // Check orphaned
  const orphaned = await connection.execute(
    `SELECT COUNT(*) as count
    FROM rentcar_vehicles rv
    LEFT JOIN rentcar_vendors v ON rv.vendor_id = v.id
    WHERE v.id IS NULL`
  );

  if (orphaned.rows[0].count > 0) {
    console.log(`⚠️  Still have ${orphaned.rows[0].count} orphaned vehicles`);
  } else {
    console.log('✅ No orphaned vehicles');
  }
}

async function main() {
  console.log('🚀 Starting rentcar data fixes...\n');

  await checkSchema();
  await fixVehicleTypeENUMs();
  await fixTransmissionENUMs();
  await deleteOrphanedVehicles();
  await verifyFixes();

  console.log('\n✅ All fixes completed!\n');
  process.exit(0);
}

main();

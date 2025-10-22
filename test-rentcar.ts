/**
 * 렌트카 시스템 전체 테스트 스크립트
 */

import { connect } from '@planetscale/database';
import 'dotenv/config';

const connection = connect({ url: process.env.DATABASE_URL! });

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  data?: any;
}

const results: TestResult[] = [];

async function testVendorList() {
  console.log('\n📋 TEST 1: Vendor List');
  try {
    const vendors = await connection.execute(
      `SELECT
        id, vendor_code, business_name, brand_name,
        (SELECT COUNT(*) FROM rentcar_vehicles WHERE vendor_id = rentcar_vendors.id) as vehicle_count
      FROM rentcar_vendors
      WHERE status = 'active'`
    );

    results.push({
      name: 'Vendor List Query',
      status: 'PASS',
      message: `Found ${vendors.rows.length} active vendors`,
      data: vendors.rows
    });

    console.log(`✅ Found ${vendors.rows.length} vendors`);
    vendors.rows.forEach((v: any) => {
      console.log(`   - ${v.business_name}: ${v.vehicle_count} vehicles`);
    });
  } catch (error: any) {
    results.push({
      name: 'Vendor List Query',
      status: 'FAIL',
      message: error.message
    });
    console.log(`❌ Failed: ${error.message}`);
  }
}

async function testVehicleList() {
  console.log('\n🚗 TEST 2: Vehicle List for PMS Vendor');
  try {
    const vehicles = await connection.execute(
      `SELECT
        id, vendor_id, brand, model, vehicle_class,
        daily_rate_krw, hourly_rate_krw, is_active
      FROM rentcar_vehicles
      WHERE vendor_id = 13
      LIMIT 10`
    );

    results.push({
      name: 'PMS Vehicle List',
      status: 'PASS',
      message: `Found ${vehicles.rows.length} vehicles for vendor 13`,
      data: vehicles.rows
    });

    console.log(`✅ Found vehicles for PMS vendor (showing first 10):`);
    vehicles.rows.forEach((v: any) => {
      console.log(`   - ${v.brand} ${v.model} (${v.vehicle_class})`);
      console.log(`     Daily: ₩${v.daily_rate_krw?.toLocaleString()}, Hourly: ₩${v.hourly_rate_krw?.toLocaleString()}`);
    });
  } catch (error: any) {
    results.push({
      name: 'PMS Vehicle List',
      status: 'FAIL',
      message: error.message
    });
    console.log(`❌ Failed: ${error.message}`);
  }
}

async function testHourlyRates() {
  console.log('\n⏱️  TEST 3: Hourly Rate Coverage');
  try {
    const stats = await connection.execute(
      `SELECT
        COUNT(*) as total_vehicles,
        SUM(CASE WHEN hourly_rate_krw IS NOT NULL THEN 1 ELSE 0 END) as with_hourly,
        SUM(CASE WHEN hourly_rate_krw IS NULL THEN 1 ELSE 0 END) as without_hourly,
        MIN(hourly_rate_krw) as min_hourly,
        MAX(hourly_rate_krw) as max_hourly,
        AVG(hourly_rate_krw) as avg_hourly
      FROM rentcar_vehicles
      WHERE vendor_id = 13`
    );

    const stat = stats.rows[0];
    const coverage = ((stat.with_hourly / stat.total_vehicles) * 100).toFixed(1);

    results.push({
      name: 'Hourly Rate Coverage',
      status: stat.with_hourly === stat.total_vehicles ? 'PASS' : 'WARN',
      message: `${coverage}% vehicles have hourly rates (${stat.with_hourly}/${stat.total_vehicles})`,
      data: stat
    });

    console.log(`✅ Hourly Rate Statistics:`);
    console.log(`   Total Vehicles: ${stat.total_vehicles}`);
    console.log(`   With Hourly Rate: ${stat.with_hourly} (${coverage}%)`);
    console.log(`   Without Hourly Rate: ${stat.without_hourly}`);
    console.log(`   Range: ₩${stat.min_hourly?.toLocaleString()} - ₩${stat.max_hourly?.toLocaleString()}`);
    console.log(`   Average: ₩${Math.round(stat.avg_hourly)?.toLocaleString()}`);
  } catch (error: any) {
    results.push({
      name: 'Hourly Rate Coverage',
      status: 'FAIL',
      message: error.message
    });
    console.log(`❌ Failed: ${error.message}`);
  }
}

async function testVehicleClasses() {
  console.log('\n📊 TEST 4: Vehicle Class Distribution');
  try {
    const classes = await connection.execute(
      `SELECT
        vehicle_class,
        COUNT(*) as count,
        MIN(daily_rate_krw) as min_daily,
        MAX(daily_rate_krw) as max_daily,
        AVG(hourly_rate_krw) as avg_hourly
      FROM rentcar_vehicles
      WHERE vendor_id = 13
      GROUP BY vehicle_class
      ORDER BY count DESC`
    );

    results.push({
      name: 'Vehicle Class Distribution',
      status: 'PASS',
      message: `Found ${classes.rows.length} vehicle classes`,
      data: classes.rows
    });

    console.log(`✅ Vehicle Classes:`);
    classes.rows.forEach((c: any) => {
      console.log(`   ${c.vehicle_class}: ${c.count} vehicles`);
      console.log(`     Daily: ₩${c.min_daily?.toLocaleString()} - ₩${c.max_daily?.toLocaleString()}`);
      console.log(`     Avg Hourly: ₩${Math.round(c.avg_hourly)?.toLocaleString()}`);
    });
  } catch (error: any) {
    results.push({
      name: 'Vehicle Class Distribution',
      status: 'FAIL',
      message: error.message
    });
    console.log(`❌ Failed: ${error.message}`);
  }
}

async function testENUMValues() {
  console.log('\n🔤 TEST 5: ENUM Value Validation');
  try {
    const enums = await connection.execute(
      `SELECT DISTINCT
        vehicle_class,
        vehicle_type,
        fuel_type,
        transmission
      FROM rentcar_vehicles
      WHERE vendor_id = 13
      LIMIT 20`
    );

    const validClasses = ['compact', 'midsize', 'fullsize', 'luxury', 'suv', 'van'];
    const validTypes = ['sedan', 'suv', 'van', 'truck', 'sports'];
    const validFuels = ['gasoline', 'diesel', 'electric', 'hybrid'];
    const validTransmissions = ['automatic', 'manual']; // DB uses 'automatic', not 'auto'

    let invalidCount = 0;
    enums.rows.forEach((e: any) => {
      if (e.vehicle_class && !validClasses.includes(e.vehicle_class)) {
        console.log(`   ⚠️  Invalid vehicle_class: ${e.vehicle_class}`);
        invalidCount++;
      }
      if (e.vehicle_type && !validTypes.includes(e.vehicle_type)) {
        console.log(`   ⚠️  Invalid vehicle_type: ${e.vehicle_type}`);
        invalidCount++;
      }
      if (e.fuel_type && !validFuels.includes(e.fuel_type)) {
        console.log(`   ⚠️  Invalid fuel_type: ${e.fuel_type}`);
        invalidCount++;
      }
      if (e.transmission && !validTransmissions.includes(e.transmission)) {
        console.log(`   ⚠️  Invalid transmission: ${e.transmission}`);
        invalidCount++;
      }
    });

    results.push({
      name: 'ENUM Value Validation',
      status: invalidCount === 0 ? 'PASS' : 'WARN',
      message: invalidCount === 0 ? 'All ENUM values are valid' : `Found ${invalidCount} invalid ENUM values`,
      data: { checked: enums.rows.length, invalid: invalidCount }
    });

    console.log(invalidCount === 0 ? '✅ All ENUM values are valid' : `⚠️  Found ${invalidCount} invalid values`);
  } catch (error: any) {
    results.push({
      name: 'ENUM Value Validation',
      status: 'FAIL',
      message: error.message
    });
    console.log(`❌ Failed: ${error.message}`);
  }
}

async function testVehicleImages() {
  console.log('\n🖼️  TEST 6: Vehicle Images');
  try {
    const images = await connection.execute(
      `SELECT
        id, brand, model,
        CASE
          WHEN images IS NULL OR images = '[]' OR images = '' THEN 0
          ELSE 1
        END as has_images,
        thumbnail_url
      FROM rentcar_vehicles
      WHERE vendor_id = 13
      LIMIT 50`
    );

    const withImages = images.rows.filter((v: any) => v.has_images === 1).length;
    const coverage = ((withImages / images.rows.length) * 100).toFixed(1);

    results.push({
      name: 'Vehicle Images Coverage',
      status: withImages > 0 ? 'PASS' : 'WARN',
      message: `${coverage}% vehicles have images (${withImages}/${images.rows.length})`,
      data: { total: images.rows.length, with_images: withImages }
    });

    console.log(`✅ Image Coverage: ${coverage}% (${withImages}/${images.rows.length})`);
  } catch (error: any) {
    results.push({
      name: 'Vehicle Images Coverage',
      status: 'FAIL',
      message: error.message
    });
    console.log(`❌ Failed: ${error.message}`);
  }
}

async function testVendorInfo() {
  console.log('\n🏢 TEST 7: Vendor Information Completeness');
  try {
    const vendor = await connection.execute(
      `SELECT
        id, vendor_code, business_name, brand_name,
        contact_name, contact_email, contact_phone,
        address, description, logo_url, images,
        status, is_verified, commission_rate,
        pms_provider, pms_api_key
      FROM rentcar_vendors
      WHERE id = 13`
    );

    if (vendor.rows.length === 0) {
      throw new Error('Vendor 13 not found');
    }

    const v = vendor.rows[0];
    const fields = {
      'Business Name': v.business_name,
      'Brand Name': v.brand_name,
      'Contact Name': v.contact_name,
      'Contact Email': v.contact_email,
      'Contact Phone': v.contact_phone,
      'Address': v.address,
      'PMS Provider': v.pms_provider,
      'PMS API Key': v.pms_api_key ? '***' : undefined
    };

    let missingFields: string[] = [];
    Object.entries(fields).forEach(([key, value]) => {
      if (!value || value === '') {
        missingFields.push(key);
      } else {
        console.log(`   ✅ ${key}: ${value}`);
      }
    });

    if (missingFields.length > 0) {
      console.log(`   ⚠️  Missing fields: ${missingFields.join(', ')}`);
    }

    results.push({
      name: 'Vendor Information Completeness',
      status: missingFields.length === 0 ? 'PASS' : 'WARN',
      message: missingFields.length === 0 ? 'All fields complete' : `Missing ${missingFields.length} fields`,
      data: { vendor: v, missing: missingFields }
    });
  } catch (error: any) {
    results.push({
      name: 'Vendor Information Completeness',
      status: 'FAIL',
      message: error.message
    });
    console.log(`❌ Failed: ${error.message}`);
  }
}

async function testDatabaseIntegrity() {
  console.log('\n🔍 TEST 8: Database Integrity');
  try {
    // Test 1: Orphaned vehicles (vendor doesn't exist)
    const orphaned = await connection.execute(
      `SELECT COUNT(*) as count
      FROM rentcar_vehicles rv
      LEFT JOIN rentcar_vendors v ON rv.vendor_id = v.id
      WHERE v.id IS NULL`
    );

    // Test 2: Vehicles with invalid rates
    const invalidRates = await connection.execute(
      `SELECT COUNT(*) as count
      FROM rentcar_vehicles
      WHERE daily_rate_krw <= 0 OR daily_rate_krw IS NULL`
    );

    // Test 3: Vehicles with hourly > daily rate
    const illogicalRates = await connection.execute(
      `SELECT COUNT(*) as count
      FROM rentcar_vehicles
      WHERE hourly_rate_krw * 24 > daily_rate_krw * 1.5`
    );

    const issues = [];
    if (orphaned.rows[0].count > 0) {
      issues.push(`${orphaned.rows[0].count} orphaned vehicles`);
      console.log(`   ⚠️  ${orphaned.rows[0].count} orphaned vehicles`);
    }
    if (invalidRates.rows[0].count > 0) {
      issues.push(`${invalidRates.rows[0].count} invalid rates`);
      console.log(`   ⚠️  ${invalidRates.rows[0].count} vehicles with invalid rates`);
    }
    if (illogicalRates.rows[0].count > 0) {
      issues.push(`${illogicalRates.rows[0].count} illogical hourly rates`);
      console.log(`   ⚠️  ${illogicalRates.rows[0].count} vehicles with illogical hourly rates`);
    }

    results.push({
      name: 'Database Integrity',
      status: issues.length === 0 ? 'PASS' : 'WARN',
      message: issues.length === 0 ? 'No integrity issues found' : issues.join(', '),
      data: {
        orphaned: orphaned.rows[0].count,
        invalid_rates: invalidRates.rows[0].count,
        illogical_rates: illogicalRates.rows[0].count
      }
    });

    if (issues.length === 0) {
      console.log('✅ No integrity issues found');
    }
  } catch (error: any) {
    results.push({
      name: 'Database Integrity',
      status: 'FAIL',
      message: error.message
    });
    console.log(`❌ Failed: ${error.message}`);
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'PASS').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️' : '❌';
    console.log(`${icon} ${r.name}: ${r.message}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(60));

  const successRate = ((passed / results.length) * 100).toFixed(1);
  console.log(`\n📈 Success Rate: ${successRate}%`);

  if (failed === 0 && warned === 0) {
    console.log('\n🎉 ALL TESTS PASSED! 🎉\n');
  } else if (failed === 0) {
    console.log('\n✅ All tests passed with warnings\n');
  } else {
    console.log('\n❌ Some tests failed. Please review.\n');
  }
}

async function runAllTests() {
  console.log('🚀 Starting Rentcar System Tests...\n');

  await testVendorList();
  await testVehicleList();
  await testHourlyRates();
  await testVehicleClasses();
  await testENUMValues();
  await testVehicleImages();
  await testVendorInfo();
  await testDatabaseIntegrity();

  await printSummary();

  process.exit(0);
}

runAllTests();

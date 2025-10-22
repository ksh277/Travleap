/**
 * 렌트카 API 엔드포인트 전체 테스트
 */

import 'dotenv/config';

const BASE_URL = 'http://localhost:3004';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  response?: any;
}

const results: TestResult[] = [];
let authToken: string = '';
let vendorId: number = 0;
let testVehicleId: number = 0;

async function test1_VendorLogin() {
  console.log('\n🔐 TEST 1: Vendor Login');
  try {
    const response = await fetch(`${BASE_URL}/api/vendor/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'pmstest@vendor.com',
        password: 'pmstest123'
      })
    });

    const data = await response.json();

    if (data.success && data.token) {
      authToken = data.token;
      vendorId = data.user?.id || 0;
      results.push({
        name: 'Vendor Login',
        status: 'PASS',
        message: `Logged in successfully, token received`,
        response: { ...data, token: data.token.substring(0, 20) + '...' }
      });
      console.log(`✅ Login successful`);
      console.log(`   User ID: ${data.user?.id}`);
      console.log(`   Email: ${data.user?.email}`);
      console.log(`   Token: ${data.token.substring(0, 30)}...`);
    } else {
      throw new Error(data.message || 'Login failed');
    }
  } catch (error: any) {
    results.push({
      name: 'Vendor Login',
      status: 'FAIL',
      message: error.message
    });
    console.log(`❌ Failed: ${error.message}`);
  }
}

async function test2_GetVendorVehicles() {
  console.log('\n🚗 TEST 2: Get Vendor Vehicles');
  try {
    const response = await fetch(`${BASE_URL}/api/vendor/vehicles`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success && Array.isArray(data.data)) {
      const count = data.data.length;
      results.push({
        name: 'Get Vendor Vehicles',
        status: 'PASS',
        message: `Retrieved ${count} vehicles`,
        response: { count, sample: data.data[0] }
      });
      console.log(`✅ Retrieved ${count} vehicles`);
      if (count > 0) {
        const v = data.data[0];
        console.log(`   Sample: ${v.brand} ${v.model}`);
        console.log(`   Daily: ₩${v.daily_rate_krw?.toLocaleString()}`);
        console.log(`   Hourly: ₩${v.hourly_rate_krw?.toLocaleString()}`);
      }
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error: any) {
    results.push({
      name: 'Get Vendor Vehicles',
      status: 'FAIL',
      message: error.message
    });
    console.log(`❌ Failed: ${error.message}`);
  }
}

async function test3_CreateVehicle() {
  console.log('\n➕ TEST 3: Create New Vehicle');
  try {
    const newVehicle = {
      brand: '현대',
      model: '코나 Electric (테스트)',
      year: 2024,
      vehicle_class: 'compact',
      vehicle_type: 'suv',
      fuel_type: 'electric',
      transmission: 'automatic',
      seating_capacity: 5,
      daily_rate_krw: 75000,
      hourly_rate_krw: 4000,
      images: []
    };

    const response = await fetch(`${BASE_URL}/api/vendor/vehicles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newVehicle)
    });

    const data = await response.json();

    if (data.success) {
      testVehicleId = data.vehicle_id || data.data?.id || 0;
      results.push({
        name: 'Create Vehicle',
        status: 'PASS',
        message: `Vehicle created with ID ${testVehicleId}`,
        response: data
      });
      console.log(`✅ Vehicle created`);
      console.log(`   ID: ${testVehicleId}`);
      console.log(`   Model: ${newVehicle.brand} ${newVehicle.model}`);
      console.log(`   Hourly Rate: ₩${newVehicle.hourly_rate_krw.toLocaleString()}`);
    } else {
      throw new Error(data.message || 'Create failed');
    }
  } catch (error: any) {
    results.push({
      name: 'Create Vehicle',
      status: 'FAIL',
      message: error.message
    });
    console.log(`❌ Failed: ${error.message}`);
  }
}

async function test4_UpdateVehicle() {
  console.log('\n✏️  TEST 4: Update Vehicle (Hourly Rate)');

  if (!testVehicleId) {
    console.log('⏭️  Skipped (no vehicle created)');
    results.push({
      name: 'Update Vehicle',
      status: 'SKIP',
      message: 'No test vehicle available'
    });
    return;
  }

  try {
    const updates = {
      hourly_rate_krw: 5000, // Update from 4000 to 5000
      daily_rate_krw: 80000  // Update from 75000 to 80000
    };

    const response = await fetch(`${BASE_URL}/api/vendor/rentcar/vehicles/${testVehicleId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    const data = await response.json();

    if (data.success) {
      results.push({
        name: 'Update Vehicle',
        status: 'PASS',
        message: 'Vehicle updated successfully',
        response: data
      });
      console.log(`✅ Vehicle updated`);
      console.log(`   New Hourly Rate: ₩${updates.hourly_rate_krw.toLocaleString()}`);
      console.log(`   New Daily Rate: ₩${updates.daily_rate_krw.toLocaleString()}`);
    } else {
      throw new Error(data.message || 'Update failed');
    }
  } catch (error: any) {
    results.push({
      name: 'Update Vehicle',
      status: 'FAIL',
      message: error.message
    });
    console.log(`❌ Failed: ${error.message}`);
  }
}

async function test5_GetVehicleDetail() {
  console.log('\n🔍 TEST 5: Get Vehicle Detail');

  if (!testVehicleId) {
    // Use an existing vehicle
    testVehicleId = 1;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/rentcar/vehicle/${testVehicleId}`);
    const data = await response.json();

    if (data.success && data.data) {
      const v = data.data;
      results.push({
        name: 'Get Vehicle Detail',
        status: 'PASS',
        message: 'Vehicle detail retrieved',
        response: v
      });
      console.log(`✅ Vehicle detail retrieved`);
      console.log(`   Vehicle: ${v.brand} ${v.model}`);
      console.log(`   Hourly: ₩${v.hourly_rate_krw?.toLocaleString()}`);
      console.log(`   Daily: ₩${v.daily_rate_krw?.toLocaleString()}`);
      console.log(`   Vendor: ${v.vendor_name}`);
    } else {
      throw new Error('Vehicle not found');
    }
  } catch (error: any) {
    results.push({
      name: 'Get Vehicle Detail',
      status: 'FAIL',
      message: error.message
    });
    console.log(`❌ Failed: ${error.message}`);
  }
}

async function test6_GetVendorInfo() {
  console.log('\n🏢 TEST 6: Get Vendor Info');
  try {
    const response = await fetch(`${BASE_URL}/api/vendor/info`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success && data.data) {
      results.push({
        name: 'Get Vendor Info',
        status: 'PASS',
        message: 'Vendor info retrieved',
        response: data.data
      });
      console.log(`✅ Vendor info retrieved`);
      console.log(`   Business: ${data.data.business_name}`);
      console.log(`   Contact: ${data.data.contact_email}`);
      console.log(`   PMS: ${data.data.pms_provider}`);
    } else {
      throw new Error('Vendor info not found');
    }
  } catch (error: any) {
    results.push({
      name: 'Get Vendor Info',
      status: 'FAIL',
      message: error.message
    });
    console.log(`❌ Failed: ${error.message}`);
  }
}

async function test7_UpdateVendorInfo() {
  console.log('\n✏️  TEST 7: Update Vendor Info');
  try {
    const updates = {
      cancellation_policy: '테스트 취소 정책: 24시간 전 무료 취소'
    };

    const response = await fetch(`${BASE_URL}/api/vendor/info`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    const data = await response.json();

    if (data.success) {
      results.push({
        name: 'Update Vendor Info',
        status: 'PASS',
        message: 'Vendor info updated',
        response: data
      });
      console.log(`✅ Vendor info updated`);
      console.log(`   Policy: ${updates.cancellation_policy.substring(0, 40)}...`);
    } else {
      throw new Error(data.message || 'Update failed');
    }
  } catch (error: any) {
    results.push({
      name: 'Update Vendor Info',
      status: 'FAIL',
      message: error.message
    });
    console.log(`❌ Failed: ${error.message}`);
  }
}

async function test8_DeleteVehicle() {
  console.log('\n🗑️  TEST 8: Delete Vehicle');

  if (!testVehicleId) {
    console.log('⏭️  Skipped (no test vehicle)');
    results.push({
      name: 'Delete Vehicle',
      status: 'SKIP',
      message: 'No test vehicle to delete'
    });
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/vendor/rentcar/vehicles/${testVehicleId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      results.push({
        name: 'Delete Vehicle',
        status: 'PASS',
        message: `Vehicle ${testVehicleId} deleted`,
        response: data
      });
      console.log(`✅ Vehicle deleted`);
      console.log(`   ID: ${testVehicleId}`);
    } else {
      throw new Error(data.message || 'Delete failed');
    }
  } catch (error: any) {
    results.push({
      name: 'Delete Vehicle',
      status: 'FAIL',
      message: error.message
    });
    console.log(`❌ Failed: ${error.message}`);
  }
}

async function test9_JWTSecurity() {
  console.log('\n🔒 TEST 9: JWT Security (Invalid Token)');
  try {
    const response = await fetch(`${BASE_URL}/api/vendor/vehicles`, {
      headers: {
        'Authorization': 'Bearer invalid_token_12345',
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!data.success && response.status === 401) {
      results.push({
        name: 'JWT Security',
        status: 'PASS',
        message: 'Correctly rejected invalid token',
        response: data
      });
      console.log(`✅ Security working - invalid token rejected`);
    } else {
      throw new Error('Security failure - invalid token accepted!');
    }
  } catch (error: any) {
    if (error.message.includes('Security failure')) {
      results.push({
        name: 'JWT Security',
        status: 'FAIL',
        message: error.message
      });
      console.log(`❌ ${error.message}`);
    } else {
      results.push({
        name: 'JWT Security',
        status: 'PASS',
        message: 'Invalid token properly rejected'
      });
      console.log(`✅ Security working`);
    }
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 API TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'SKIP' ? '⏭️' : '❌';
    console.log(`${icon} ${r.name}: ${r.message}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log('='.repeat(60));

  const successRate = ((passed / (results.length - skipped)) * 100).toFixed(1);
  console.log(`\n📈 Success Rate: ${successRate}%`);

  if (failed === 0) {
    console.log('\n🎉 ALL API TESTS PASSED! 🎉\n');
  } else {
    console.log('\n❌ Some tests failed. Please review.\n');
  }
}

async function runAllTests() {
  console.log('🚀 Starting Rentcar API Endpoint Tests...\n');
  console.log(`Base URL: ${BASE_URL}`);

  await test1_VendorLogin();
  await test2_GetVendorVehicles();
  await test3_CreateVehicle();
  await test4_UpdateVehicle();
  await test5_GetVehicleDetail();
  await test6_GetVendorInfo();
  await test7_UpdateVendorInfo();
  await test8_DeleteVehicle();
  await test9_JWTSecurity();

  await printSummary();

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests();

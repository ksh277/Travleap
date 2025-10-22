/**
 * 프론트엔드 작동 테스트
 * - 각 페이지 로딩 확인
 * - API 연동 확인
 * - 컴포넌트 렌더링 확인
 */

import 'dotenv/config';

const FRONTEND_URL = 'http://localhost:5176';
const API_URL = 'http://localhost:3004';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

async function testPageLoad(path: string, expectedText: string, testName: string) {
  try {
    const response = await fetch(`${FRONTEND_URL}${path}`);
    const html = await response.text();

    if (response.ok && html.includes(expectedText)) {
      results.push({
        name: testName,
        status: 'PASS',
        message: `Page loaded successfully`,
        details: { status: response.status, hasContent: true }
      });
      console.log(`✅ ${testName}`);
      return true;
    } else {
      throw new Error(`Expected text "${expectedText}" not found`);
    }
  } catch (error: any) {
    results.push({
      name: testName,
      status: 'FAIL',
      message: error.message
    });
    console.log(`❌ ${testName}: ${error.message}`);
    return false;
  }
}

async function testAPIEndpoint(path: string, testName: string, expectedField?: string) {
  try {
    const response = await fetch(`${API_URL}${path}`);
    const data = await response.json();

    if (data.success) {
      const hasExpectedData = !expectedField || (data.data && (
        Array.isArray(data.data) ? data.data.length > 0 : data.data[expectedField]
      ));

      if (hasExpectedData) {
        results.push({
          name: testName,
          status: 'PASS',
          message: 'API returned valid data',
          details: Array.isArray(data.data)
            ? { count: data.data.length }
            : { hasData: true }
        });
        console.log(`✅ ${testName}`);
        return data;
      } else {
        throw new Error('Missing expected data');
      }
    } else {
      throw new Error(data.message || 'API returned error');
    }
  } catch (error: any) {
    results.push({
      name: testName,
      status: 'FAIL',
      message: error.message
    });
    console.log(`❌ ${testName}: ${error.message}`);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting Frontend Tests...\n');
  console.log(`Frontend: ${FRONTEND_URL}`);
  console.log(`API: ${API_URL}\n`);

  // 1. 메인 페이지
  console.log('\n📱 TEST 1: Main Pages');
  await testPageLoad('/', 'Shinan Travel', 'Homepage Load');

  // 2. 렌트카 관련 API
  console.log('\n🚗 TEST 2: Rentcar API Endpoints');
  const vendors = await testAPIEndpoint('/api/rentcars', 'Rentcar Vendors API');

  if (vendors && vendors.data && vendors.data.length > 0) {
    const pmsVendor = vendors.data.find((v: any) => v.vehicle_count > 0);
    if (pmsVendor) {
      console.log(`   Found vendor with vehicles: ${pmsVendor.business_name} (${pmsVendor.vehicle_count} vehicles)`);
    }
  }

  // 3. 차량 상세 API 테스트
  console.log('\n🔍 TEST 3: Vehicle Detail API');
  // 차량 ID 1번으로 테스트
  await testAPIEndpoint('/api/rentcar/vehicle/1', 'Vehicle Detail API (ID:1)');

  // 4. 컴포넌트 파일 존재 확인
  console.log('\n📦 TEST 4: Component Files');
  const fs = await import('fs');
  const componentsToCheck = [
    { path: 'components/pages/RentcarVehicleDetailPage.tsx', name: 'Vehicle Detail Page Component' },
    { path: 'components/ui/ImageUploader.tsx', name: 'Image Uploader Component' },
    { path: 'components/VendorDashboardPageEnhanced.tsx', name: 'Vendor Dashboard Component' },
    { path: 'pages/api/upload-image.js', name: 'Image Upload API' },
    { path: 'pages/api/vendor/rentcar/vehicles/[id].js', name: 'Vehicle CRUD API' }
  ];

  for (const comp of componentsToCheck) {
    try {
      if (fs.existsSync(comp.path)) {
        results.push({
          name: comp.name,
          status: 'PASS',
          message: 'File exists'
        });
        console.log(`✅ ${comp.name}`);
      } else {
        throw new Error('File not found');
      }
    } catch (error: any) {
      results.push({
        name: comp.name,
        status: 'FAIL',
        message: error.message
      });
      console.log(`❌ ${comp.name}: ${error.message}`);
    }
  }

  // 5. 라우팅 설정 확인
  console.log('\n🛣️  TEST 5: Routing Configuration');
  try {
    const appTsx = fs.readFileSync('App.tsx', 'utf-8');

    const routes = [
      { path: '/rentcar/vehicle/:vehicleId', name: 'Vehicle Detail Route' },
      { path: 'RentcarVehicleDetailPage', name: 'Vehicle Detail Component Import' }
    ];

    for (const route of routes) {
      if (appTsx.includes(route.path)) {
        results.push({
          name: route.name,
          status: 'PASS',
          message: 'Route configured'
        });
        console.log(`✅ ${route.name}`);
      } else {
        results.push({
          name: route.name,
          status: 'FAIL',
          message: 'Route not found in App.tsx'
        });
        console.log(`❌ ${route.name}`);
      }
    }
  } catch (error: any) {
    console.log(`❌ Failed to read App.tsx: ${error.message}`);
  }

  // 6. 시간 요금 필드 확인
  console.log('\n⏱️  TEST 6: Hourly Rate Implementation');
  try {
    const dashboardFile = fs.readFileSync('components/VendorDashboardPageEnhanced.tsx', 'utf-8');

    const checks = [
      { text: 'hourly_rate_krw', name: 'Hourly Rate Field' },
      { text: '시간당 요금', name: 'Hourly Rate Label' },
      { text: 'calculatedHourly', name: 'Auto-calculation Logic' }
    ];

    for (const check of checks) {
      if (dashboardFile.includes(check.text)) {
        results.push({
          name: check.name,
          status: 'PASS',
          message: 'Implementation found'
        });
        console.log(`✅ ${check.name}`);
      } else {
        results.push({
          name: check.name,
          status: 'FAIL',
          message: 'Not found in dashboard'
        });
        console.log(`❌ ${check.name}`);
      }
    }
  } catch (error: any) {
    console.log(`❌ Failed to check dashboard: ${error.message}`);
  }

  // 7. 이미지 업로더 Vercel Blob 통합 확인
  console.log('\n🖼️  TEST 7: Image Upload System');
  try {
    const uploaderFile = fs.readFileSync('components/ui/ImageUploader.tsx', 'utf-8');
    const apiFile = fs.readFileSync('pages/api/upload-image.js', 'utf-8');

    const checks = [
      { file: uploaderFile, text: '/api/upload-image', name: 'API Endpoint Integration' },
      { file: uploaderFile, text: 'FormData', name: 'File Upload Logic' },
      { file: apiFile, text: 'formidable', name: 'File Parser (formidable)' },
      { file: apiFile, text: '@vercel/blob', name: 'Vercel Blob Import' },
      { file: apiFile, text: 'put(', name: 'Blob Upload Function' }
    ];

    for (const check of checks) {
      if (check.file.includes(check.text)) {
        results.push({
          name: check.name,
          status: 'PASS',
          message: 'Implementation verified'
        });
        console.log(`✅ ${check.name}`);
      } else {
        results.push({
          name: check.name,
          status: 'FAIL',
          message: 'Not found'
        });
        console.log(`❌ ${check.name}`);
      }
    }
  } catch (error: any) {
    console.log(`❌ Failed to check image upload: ${error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 FRONTEND TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${r.name}: ${r.message}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(60));

  const successRate = ((passed / results.length) * 100).toFixed(1);
  console.log(`\n📈 Success Rate: ${successRate}%`);

  if (failed === 0) {
    console.log('\n🎉 ALL FRONTEND TESTS PASSED! 🎉\n');
  } else {
    console.log('\n❌ Some tests failed. Please review.\n');
  }
}

runTests().catch(console.error);

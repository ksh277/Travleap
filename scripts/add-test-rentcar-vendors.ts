import { db } from '../utils/database.js';

async function addTestRentcarVendors() {
  try {
    console.log('🚗 Adding test rentcar vendors...\n');

    // 1. CSV 업로드 테스트용 업체
    console.log('1. Creating vendor for CSV upload testing...');
    const csvVendorResult = await db.execute(`
      INSERT INTO rentcar_vendors (
        vendor_code, business_name, brand_name, business_number,
        contact_name, contact_email, contact_phone,
        description, status, is_verified, commission_rate,
        api_enabled, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
      )
    `, [
      'CSV_VENDOR_001',
      '신안 퍼플렌터카',
      '퍼플렌터카',
      '123-45-67890',
      '김렌트',
      'purple@rentcar.com',
      '061-111-2222',
      '신안군 전 지역 렌터카 서비스 제공. CSV 업로드 방식으로 차량 관리.',
      'active',
      1,
      10.00,
      0  // API 연동 비활성화
    ]);

    console.log(`   ✅ CSV 테스트 업체 생성 완료 (ID: ${csvVendorResult.insertId})\n`);

    // 2. API 연동 테스트용 업체
    console.log('2. Creating vendor for API sync testing...');
    const apiVendorResult = await db.execute(`
      INSERT INTO rentcar_vendors (
        vendor_code, business_name, brand_name, business_number,
        contact_name, contact_email, contact_phone,
        description, status, is_verified, commission_rate,
        api_enabled, api_url, api_key, api_auth_type,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
      )
    `, [
      'API_VENDOR_001',
      '증도 그린렌터카',
      '그린렌터카',
      '098-76-54321',
      '박자동',
      'green@rentcar.com',
      '061-333-4444',
      '증도면 전문 렌터카. API 자동 동기화로 실시간 차량 관리.',
      'active',
      1,
      10.00,
      1,  // API 연동 활성화
      'http://localhost:3005/api/vehicles',  // Mock API URL
      'test_api_key_12345',
      'bearer'
    ]);

    console.log(`   ✅ API 테스트 업체 생성 완료 (ID: ${apiVendorResult.insertId})\n`);

    console.log('✅ Test rentcar vendors added successfully!\n');
    console.log('업체 정보:');
    console.log(`  1. 신안 퍼플렌터카 (ID: ${csvVendorResult.insertId}) - CSV 업로드 방식`);
    console.log(`  2. 증도 그린렌터카 (ID: ${apiVendorResult.insertId}) - API 자동 동기화`);
    console.log('\n다음 단계:');
    console.log('  - AdminPage > 렌터카 관리에서 업체 확인');
    console.log('  - CSV 업체: CSV 파일로 차량 대량 업로드 테스트');
    console.log('  - API 업체: Mock API 서버 실행 후 동기화 버튼 클릭');

  } catch (error) {
    console.error('❌ Error adding test vendors:', error);
  } finally {
    process.exit(0);
  }
}

addTestRentcarVendors();

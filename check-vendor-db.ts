import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = connect({ url: process.env.DATABASE_URL! });

async function checkVendor() {
  console.log('🔍 rentcar@vendor.com (userId: 31) 벤더 정보 확인...\n');

  // 1. rentcar_vendors 테이블에서 user_id=31 찾기
  const vendorResult = await connection.execute(
    'SELECT * FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
    [31]
  );

  console.log('📊 rentcar_vendors 결과:');
  console.log(vendorResult.rows);

  if (!vendorResult.rows || vendorResult.rows.length === 0) {
    console.log('\n❌ 문제 발견: user_id=31에 대한 벤더 정보가 rentcar_vendors 테이블에 없습니다!');
    console.log('💡 해결책: rentcar_vendors 테이블에 레코드를 추가해야 합니다.\n');

    // 벤더 추가
    console.log('🔧 벤더 정보 추가 중...');
    const insertResult = await connection.execute(
      `INSERT INTO rentcar_vendors (
        user_id,
        business_name,
        vendor_email,
        vendor_phone,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [31, 'Rentcar 테스트 업체', 'rentcar@vendor.com', '010-1234-5678', 'active']
    );

    console.log('✅ 벤더 정보 추가 완료!');
    console.log('새로운 vendor_id:', insertResult.insertId);

    // 다시 확인
    const verifyResult = await connection.execute(
      'SELECT * FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
      [31]
    );
    console.log('\n확인:', verifyResult.rows);
  } else {
    const vendor = vendorResult.rows[0];
    console.log('\n✅ 벤더 정보 존재:');
    console.log('  - vendor_id:', vendor.id);
    console.log('  - business_name:', vendor.business_name);
    console.log('  - status:', vendor.status);
  }
}

checkVendor().catch(console.error);

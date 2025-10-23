import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = connect({ url: process.env.DATABASE_URL! });

async function checkSchema() {
  console.log('🔍 rentcar_vendors 테이블 구조 확인...\n');

  // DESCRIBE 대신 샘플 레코드로 컬럼 확인
  const result = await connection.execute(
    'SELECT * FROM rentcar_vendors LIMIT 1'
  );

  if (result.rows && result.rows.length > 0) {
    console.log('📊 테이블 컬럼:', Object.keys(result.rows[0]));
    console.log('\n샘플 데이터:');
    console.log(result.rows[0]);
  } else {
    console.log('⚠️ 테이블이 비어있습니다');
  }

  // 모든 벤더 조회
  const allVendors = await connection.execute('SELECT * FROM rentcar_vendors');
  console.log('\n📊 전체 벤더 수:', allVendors.rows?.length);
  console.log('전체 벤더 목록:');
  allVendors.rows?.forEach((v: any) => {
    console.log(`  - ID: ${v.id}, user_id: ${v.user_id}, 이름: ${v.business_name || v.vendor_name}, status: ${v.status}`);
  });
}

checkSchema().catch(console.error);

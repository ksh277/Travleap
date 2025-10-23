import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = connect({ url: process.env.DATABASE_URL! });

async function fixVendorLink() {
  console.log('🔧 rentcar@vendor.com을 vendor_id=12에 연결...\n');

  // vendor_id=12 업데이트
  const updateResult = await connection.execute(
    'UPDATE rentcar_vendors SET user_id = ? WHERE id = ?',
    [31, 12]
  );

  console.log('✅ 업데이트 완료!');
  console.log('결과:', updateResult);

  // 확인
  const checkResult = await connection.execute(
    'SELECT id, business_name, user_id, contact_email, status FROM rentcar_vendors WHERE id = ?',
    [12]
  );

  console.log('\n📊 업데이트된 벤더 정보:');
  console.log(checkResult.rows[0]);
}

fixVendorLink().catch(console.error);

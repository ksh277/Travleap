import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = connect({ url: process.env.DATABASE_URL! });

async function fixUserIdLink() {
  console.log('🔧 vendor_id=12의 user_id를 31 → 21로 수정...\n');

  const updateResult = await connection.execute(
    'UPDATE rentcar_vendors SET user_id = ? WHERE id = ?',
    [21, 12]  // user_id=21 (rentcar@vendor.com의 실제 ID)
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

fixUserIdLink().catch(console.error);

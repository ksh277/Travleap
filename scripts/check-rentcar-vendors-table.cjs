const { connect } = require('@planetscale/database');
require('dotenv').config();

(async () => {
  const db = connect({ url: process.env.DATABASE_URL });

  console.log('🚗 rentcar_vendors 테이블 확인\n');

  const result = await db.execute(`
    SELECT *
    FROM rentcar_vendors
    ORDER BY created_at DESC
    LIMIT 1
  `);

  if (result.rows && result.rows.length > 0) {
    console.log('사용 가능한 컬럼:');
    console.log(Object.keys(result.rows[0]).join(', '));
    console.log('\n');
  }

  const allResult = await db.execute(`
    SELECT id, business_name, brand_name, vendor_code, status, created_at
    FROM rentcar_vendors
    ORDER BY created_at DESC
  `);

  console.log(`총 ${allResult.rows?.length || 0}개 업체:\n`);

  for (const v of allResult.rows || []) {
    console.log(`ID: ${v.id}`);
    console.log(`  - 업체명: ${v.business_name || v.brand_name || v.vendor_code}`);
    console.log(`  - vendor_code: ${v.vendor_code}`);
    console.log(`  - status: ${v.status}`);
    console.log(`  - 생성일: ${v.created_at}`);
    console.log('');
  }

  process.exit(0);
})();

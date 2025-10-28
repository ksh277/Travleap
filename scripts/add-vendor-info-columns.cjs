const { connect } = require('@planetscale/database');
require('dotenv').config();

async function addVendorInfoColumns() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🔧 [Migration] Adding missing columns to rentcar_vendors table...\n');

    // 컬럼 추가 (이미 있으면 에러가 발생하지만 무시)
    const columns = [
      {
        name: 'address_detail',
        sql: `ALTER TABLE rentcar_vendors ADD COLUMN address_detail VARCHAR(500) NULL COMMENT '상세주소' AFTER address`
      },
      {
        name: 'latitude',
        sql: `ALTER TABLE rentcar_vendors ADD COLUMN latitude DECIMAL(10, 7) NULL COMMENT '위도' AFTER address_detail`
      },
      {
        name: 'longitude',
        sql: `ALTER TABLE rentcar_vendors ADD COLUMN longitude DECIMAL(10, 7) NULL COMMENT '경도' AFTER latitude`
      },
      {
        name: 'check_in_time',
        sql: `ALTER TABLE rentcar_vendors ADD COLUMN check_in_time VARCHAR(10) NULL DEFAULT '14:00' COMMENT '체크인 시간' AFTER rental_guide`
      },
      {
        name: 'check_out_time',
        sql: `ALTER TABLE rentcar_vendors ADD COLUMN check_out_time VARCHAR(10) NULL DEFAULT '12:00' COMMENT '체크아웃 시간' AFTER check_in_time`
      }
    ];

    for (const column of columns) {
      try {
        console.log(`   Adding ${column.name}...`);
        await connection.execute(column.sql);
        console.log(`   ✅ ${column.name} added successfully`);
      } catch (error) {
        if (error.body?.message?.includes('Duplicate column name')) {
          console.log(`   ℹ️  ${column.name} already exists, skipping`);
        } else {
          console.error(`   ❌ Error adding ${column.name}:`, error.body?.message || error.message);
        }
      }
    }

    console.log('\n✅ [Migration] Column migration completed!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ [Migration] Fatal error:', error);
    process.exit(1);
  }
}

addVendorInfoColumns();

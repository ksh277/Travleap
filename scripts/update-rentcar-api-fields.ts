import { db } from '../utils/database.js';

async function updateRentcarApiFields() {
  try {
    console.log('🔧 Updating rentcar_vendors table - removing PMS fields, adding API fields...\n');

    // 1. PMS 필드 삭제
    console.log('1. Dropping PMS fields...');
    try {
      await db.execute('ALTER TABLE rentcar_vendors DROP COLUMN pms_provider');
      console.log('   ✅ Dropped pms_provider');
    } catch (e) {
      console.log('   ⚠️  pms_provider already dropped or does not exist');
    }

    try {
      await db.execute('ALTER TABLE rentcar_vendors DROP COLUMN pms_api_key');
      console.log('   ✅ Dropped pms_api_key');
    } catch (e) {
      console.log('   ⚠️  pms_api_key already dropped or does not exist');
    }

    try {
      await db.execute('ALTER TABLE rentcar_vendors DROP COLUMN pms_property_id');
      console.log('   ✅ Dropped pms_property_id');
    } catch (e) {
      console.log('   ⚠️  pms_property_id already dropped or does not exist');
    }

    // 2. API 연동 전용 필드 추가
    console.log('\n2. Adding API integration fields...');

    try {
      await db.execute(`
        ALTER TABLE rentcar_vendors
        ADD COLUMN api_url VARCHAR(500) NULL COMMENT '업체 API URL'
      `);
      console.log('   ✅ Added api_url');
    } catch (e) {
      console.log('   ⚠️  api_url already exists');
    }

    try {
      await db.execute(`
        ALTER TABLE rentcar_vendors
        ADD COLUMN api_key VARCHAR(500) NULL COMMENT 'API 인증 키'
      `);
      console.log('   ✅ Added api_key');
    } catch (e) {
      console.log('   ⚠️  api_key already exists');
    }

    try {
      await db.execute(`
        ALTER TABLE rentcar_vendors
        ADD COLUMN api_auth_type VARCHAR(50) DEFAULT 'bearer' COMMENT 'API 인증 방식 (bearer, apikey, basic)'
      `);
      console.log('   ✅ Added api_auth_type');
    } catch (e) {
      console.log('   ⚠️  api_auth_type already exists');
    }

    try {
      await db.execute(`
        ALTER TABLE rentcar_vendors
        ADD COLUMN api_enabled BOOLEAN DEFAULT FALSE COMMENT 'API 연동 활성화 여부'
      `);
      console.log('   ✅ Added api_enabled');
    } catch (e) {
      console.log('   ⚠️  api_enabled already exists');
    }

    console.log('\n✅ rentcar_vendors table update complete!');
    console.log('\n새 필드:');
    console.log('  - api_url: 업체 API URL');
    console.log('  - api_key: API 인증 키');
    console.log('  - api_auth_type: 인증 방식 (bearer, apikey, basic)');
    console.log('  - api_enabled: API 연동 활성화 여부');

  } catch (error) {
    console.error('❌ Error updating rentcar_vendors table:', error);
  } finally {
    process.exit(0);
  }
}

updateRentcarApiFields();

/**
 * rentcar_vendors 테이블 스키마 확인
 */

async function checkRentcarSchema() {
  try {
    console.log('🔍 Checking rentcar_vendors table schema...\n');

    const BASE_URL = 'http://localhost:3004';

    // DESCRIBE 쿼리로 테이블 구조 확인
    const response = await fetch(`${BASE_URL}/api/db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'query',
        sql: 'DESCRIBE rentcar_vendors',
        params: []
      })
    });

    const result = await response.json();

    if (result.success && result.data) {
      console.log('📋 Current columns:\n');

      const columns = result.data;
      const apiColumns = ['api_url', 'api_key', 'api_auth_type', 'api_enabled'];

      let hasAllApiColumns = true;

      for (const col of apiColumns) {
        const exists = columns.some((c: any) => c.Field === col);
        if (exists) {
          console.log(`   ✅ ${col} - EXISTS`);
        } else {
          console.log(`   ❌ ${col} - MISSING`);
          hasAllApiColumns = false;
        }
      }

      console.log('\n📊 All columns:');
      columns.forEach((col: any) => {
        console.log(`   - ${col.Field} (${col.Type})`);
      });

      if (hasAllApiColumns) {
        console.log('\n✅ All API columns exist! Ready to use API sync feature.');
      } else {
        console.log('\n⚠️  Some API columns are missing.');
        console.log('\nYou need to add them manually in PlanetScale console:');
        console.log('   1. Go to PlanetScale console');
        console.log('   2. Select database "travleap"');
        console.log('   3. Run these SQL commands:\n');
        console.log('   ALTER TABLE rentcar_vendors ADD COLUMN api_url VARCHAR(500) NULL;');
        console.log('   ALTER TABLE rentcar_vendors ADD COLUMN api_key VARCHAR(500) NULL;');
        console.log('   ALTER TABLE rentcar_vendors ADD COLUMN api_auth_type VARCHAR(50) DEFAULT "bearer";');
        console.log('   ALTER TABLE rentcar_vendors ADD COLUMN api_enabled BOOLEAN DEFAULT FALSE;');
      }

    } else {
      console.log('❌ Failed to get schema:', result.error);
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  } finally {
    process.exit(0);
  }
}

checkRentcarSchema();

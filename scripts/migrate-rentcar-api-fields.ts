/**
 * PlanetScale DB에 rentcar_vendors API 컬럼 추가
 */

async function migrateRentcarApiFields() {
  try {
    console.log('🔧 Adding API fields to rentcar_vendors table in PlanetScale...\n');

    const BASE_URL = 'http://localhost:3004';

    // /api/db 엔드포인트를 사용하여 DDL 실행
    const queries = [
      {
        name: 'api_url',
        sql: 'ALTER TABLE rentcar_vendors ADD COLUMN api_url VARCHAR(500) NULL COMMENT "업체 API URL"'
      },
      {
        name: 'api_key',
        sql: 'ALTER TABLE rentcar_vendors ADD COLUMN api_key VARCHAR(500) NULL COMMENT "API 인증 키"'
      },
      {
        name: 'api_auth_type',
        sql: 'ALTER TABLE rentcar_vendors ADD COLUMN api_auth_type VARCHAR(50) DEFAULT "bearer" COMMENT "API 인증 방식"'
      },
      {
        name: 'api_enabled',
        sql: 'ALTER TABLE rentcar_vendors ADD COLUMN api_enabled BOOLEAN DEFAULT FALSE COMMENT "API 연동 활성화"'
      }
    ];

    for (const q of queries) {
      console.log(`Adding column: ${q.name}...`);

      try {
        const response = await fetch(`${BASE_URL}/api/db`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'query',
            sql: q.sql,
            params: []
          })
        });

        const result = await response.json();

        if (result.success) {
          console.log(`   ✅ ${q.name} added successfully`);
        } else {
          console.log(`   ⚠️  ${q.name}: ${result.error || 'Already exists or error'}`);
        }
      } catch (error) {
        console.log(`   ⚠️  ${q.name}: ${error instanceof Error ? error.message : 'Error'}`);
      }
    }

    console.log('\n✅ Migration complete!');
    console.log('\n다음 단계:');
    console.log('  1. 증도 그린렌터카 업체(ID: 11) API 설정 업데이트');
    console.log('  2. API 동기화 버튼 클릭하여 테스트');

  } catch (error) {
    console.error('\n❌ Migration failed:', error instanceof Error ? error.message : String(error));
  } finally {
    process.exit(0);
  }
}

migrateRentcarApiFields();

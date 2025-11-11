const { connect } = require('@planetscale/database');
require('dotenv').config();

(async () => {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('📋 rentcar_vendors 테이블 상세 확인 (외래키 대상)\n');

  try {
    // 1. 테이블 존재 여부 확인
    console.log('1️⃣  테이블 존재 여부:');
    console.log('━'.repeat(80));

    try {
      const testResult = await connection.execute('SELECT COUNT(*) as cnt FROM rentcar_vendors');
      console.log(`   ✅ rentcar_vendors 테이블 존재 (${testResult.rows[0].cnt}건의 레코드)\n`);
    } catch (err) {
      console.log(`   ❌ rentcar_vendors 테이블 없음!`);
      console.log(`   → insurances.vendor_id 외래키 추가 불가\n`);
      process.exit(1);
    }

    // 2. 테이블 구조 확인 (특히 id 컬럼)
    console.log('\n2️⃣  테이블 구조 (id 컬럼 중심):');
    console.log('━'.repeat(80));

    const descResult = await connection.execute('DESCRIBE rentcar_vendors');
    const idColumn = descResult.rows.find(col => col.Field === 'id');

    if (idColumn) {
      console.log(`   ✅ id 컬럼 존재`);
      console.log(`   Type: ${idColumn.Type}`);
      console.log(`   Null: ${idColumn.Null}`);
      console.log(`   Key: ${idColumn.Key}`);
      console.log(`   Extra: ${idColumn.Extra}`);
      console.log('');
    } else {
      console.log(`   ❌ id 컬럼 없음! (외래키 불가)\n`);
      process.exit(1);
    }

    // 3. 현재 벤더 목록
    console.log('\n3️⃣  현재 등록된 벤더:');
    console.log('━'.repeat(80));

    // 먼저 컬럼 확인
    const columns = descResult.rows.map(col => col.Field);
    const hasIsActive = columns.includes('is_active');
    const hasStatus = columns.includes('status');

    let query = `SELECT id, business_name, brand_name`;
    if (hasIsActive) query += `, is_active`;
    if (hasStatus) query += `, status`;
    query += `, created_at FROM rentcar_vendors ORDER BY id`;

    const vendorsResult = await connection.execute(query);

    if (vendorsResult.rows.length > 0) {
      for (const vendor of vendorsResult.rows) {
        let statusText = '';
        if (hasIsActive) {
          statusText = vendor.is_active ? '✅ 활성' : '❌ 비활성';
        } else if (hasStatus) {
          statusText = vendor.status === 'active' ? '✅ 활성' : '❌ 비활성';
        }
        console.log(`   ${statusText} [${vendor.id}] ${vendor.business_name}`);
        console.log(`      Brand: ${vendor.brand_name || 'N/A'}`);
        console.log(`      Created: ${vendor.created_at}`);
        console.log('');
      }
    } else {
      console.log('   (등록된 벤더 없음)\n');
    }

    // 4. 벤더별 보험 상품 현황 (rentcar_insurance 기준)
    console.log('\n4️⃣  벤더별 보험 상품 현황 (rentcar_insurance):');
    console.log('━'.repeat(80));

    const insuranceResult = await connection.execute(`
      SELECT
        rv.id as vendor_id,
        rv.business_name,
        COUNT(ri.id) as insurance_count
      FROM rentcar_vendors rv
      LEFT JOIN rentcar_insurance ri ON rv.id = ri.vendor_id
      GROUP BY rv.id, rv.business_name
      ORDER BY insurance_count DESC, rv.id
    `);

    for (const row of insuranceResult.rows) {
      console.log(`   [${row.vendor_id}] ${row.business_name}: ${row.insurance_count}개 보험`);
    }

    // 5. 외래키 추가 가능 여부 판단
    console.log('\n\n5️⃣  외래키 추가 가능 여부:');
    console.log('━'.repeat(80));

    if (idColumn && idColumn.Type.includes('int') && idColumn.Key === 'PRI') {
      console.log('   ✅ insurances.vendor_id → rentcar_vendors.id 외래키 추가 가능');
      console.log(`   → rentcar_vendors.id는 ${idColumn.Type} PRIMARY KEY`);
      console.log('   → ON DELETE CASCADE 권장 (벤더 삭제 시 관련 보험도 삭제)');
    } else {
      console.log('   ⚠️  외래키 추가 시 주의 필요');
      console.log(`   → id 컬럼 타입: ${idColumn?.Type || 'unknown'}`);
      console.log(`   → id 컬럼 키: ${idColumn?.Key || 'none'}`);
    }

    // 6. 마이그레이션 시 고려사항
    console.log('\n\n6️⃣  마이그레이션 시 고려사항:');
    console.log('━'.repeat(80));

    console.log(`   1. insurances 테이블에 vendor_id BIGINT NULL 추가`);
    console.log(`   2. 외래키 제약조건 추가:`);
    console.log(`      FOREIGN KEY (vendor_id) REFERENCES rentcar_vendors(id)`);
    console.log(`      ON DELETE CASCADE`);
    console.log(`   3. vendor_id NULL = 전체 공통 보험`);
    console.log(`   4. vendor_id 값 = 특정 벤더 전용 보험`);

    console.log('━'.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
})();

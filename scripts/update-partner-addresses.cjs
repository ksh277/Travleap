/**
 * Partners 테이블의 주소 데이터 업데이트 스크립트
 * - business_address와 detailed_address 필드에 상세주소 추가
 */

const { connect } = require('@planetscale/database');

// 샘플 상세주소 데이터
const addressUpdates = [
  {
    name_pattern: '신안%', // LIKE 검색용
    business_address: '전남 신안군 지도읍 송도리 123',
    detailed_address: '지도읍 송도리 123'
  },
  {
    name_pattern: '증도%',
    business_address: '전남 신안군 증도면 대초리 456',
    detailed_address: '증도면 대초리 456'
  },
  {
    name_pattern: '홍도%',
    business_address: '전남 신안군 홍도면 1구 789',
    detailed_address: '홍도면 1구 789'
  },
  {
    name_pattern: '하의%',
    business_address: '전남 신안군 하의면 신안로 100',
    detailed_address: '하의면 신안로 100'
  },
  {
    name_pattern: '안좌%',
    business_address: '전남 신안군 안좌면 복호리 50',
    detailed_address: '안좌면 복호리 50'
  }
];

async function updatePartnerAddresses() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('=== Partners 주소 데이터 업데이트 시작 ===\n');

    // 1. 현재 상태 확인
    const currentState = await connection.execute(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN business_address IS NOT NULL AND business_address != '' THEN 1 END) as has_business_address,
        COUNT(CASE WHEN detailed_address IS NOT NULL AND detailed_address != '' THEN 1 END) as has_detailed_address
      FROM partners
      WHERE is_active = 1
    `);

    if (currentState.rows && currentState.rows.length > 0) {
      const stats = currentState.rows[0];
      console.log('현재 상태:');
      console.log(`  총 활성 파트너: ${stats.total}개`);
      console.log(`  business_address 있음: ${stats.has_business_address}개`);
      console.log(`  detailed_address 있음: ${stats.has_detailed_address}개`);
      console.log('');
    }

    // 2. 샘플 데이터가 있는지 확인
    const partners = await connection.execute(`
      SELECT id, business_name, location, business_address, detailed_address
      FROM partners
      WHERE is_active = 1
      LIMIT 10
    `);

    if (!partners.rows || partners.rows.length === 0) {
      console.log('⚠️  활성화된 파트너가 없습니다. 먼저 파트너 데이터를 추가하세요.');
      return;
    }

    console.log(`\n총 ${partners.rows.length}개 파트너 발견:\n`);
    partners.rows.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.business_name}`);
      console.log(`   location: ${p.location || '(없음)'}`);
      console.log(`   business_address: ${p.business_address || '(없음)'}`);
      console.log(`   detailed_address: ${p.detailed_address || '(없음)'}`);
      console.log('');
    });

    // 3. 업데이트할 파트너 찾기 및 업데이트
    console.log('=== 주소 업데이트 실행 ===\n');

    let updateCount = 0;

    for (const partner of partners.rows) {
      // business_address나 detailed_address가 비어있는 경우만 업데이트
      if ((!partner.business_address || partner.business_address.trim() === '') ||
          (!partner.detailed_address || partner.detailed_address.trim() === '')) {

        // 업데이트할 주소 정보 (간단하게 location에 상세주소 추가)
        const newBusinessAddress = partner.location
          ? `${partner.location} ${partner.business_name}`
          : `전남 신안군 ${partner.business_name}`;

        const newDetailedAddress = partner.business_name;

        const result = await connection.execute(
          `UPDATE partners
           SET business_address = ?,
               detailed_address = ?,
               updated_at = NOW()
           WHERE id = ?`,
          [newBusinessAddress, newDetailedAddress, partner.id]
        );

        console.log(`✅ 업데이트 완료: ${partner.business_name}`);
        console.log(`   새 business_address: ${newBusinessAddress}`);
        console.log(`   새 detailed_address: ${newDetailedAddress}`);
        console.log('');

        updateCount++;
      }
    }

    console.log(`\n=== 업데이트 완료: ${updateCount}개 파트너 ===`);

    // 4. 업데이트 후 상태 확인
    const afterState = await connection.execute(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN business_address IS NOT NULL AND business_address != '' THEN 1 END) as has_business_address,
        COUNT(CASE WHEN detailed_address IS NOT NULL AND detailed_address != '' THEN 1 END) as has_detailed_address
      FROM partners
      WHERE is_active = 1
    `);

    if (afterState.rows && afterState.rows.length > 0) {
      const stats = afterState.rows[0];
      console.log('\n업데이트 후 상태:');
      console.log(`  총 활성 파트너: ${stats.total}개`);
      console.log(`  business_address 있음: ${stats.has_business_address}개`);
      console.log(`  detailed_address 있음: ${stats.has_detailed_address}개`);
    }

    console.log('\n✅ 주소 데이터 업데이트가 완료되었습니다!');
    console.log('이제 PartnerPage에서 상세주소가 표시될 것입니다.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// 실행 모드 확인
const args = process.argv.slice(2);
if (args.includes('--run')) {
  updatePartnerAddresses().catch(console.error);
} else {
  console.log('=== Partners 주소 데이터 업데이트 스크립트 ===');
  console.log('');
  console.log('이 스크립트는 partners 테이블의 business_address와 detailed_address 필드를');
  console.log('업데이트하여 상세주소가 표시되도록 합니다.');
  console.log('');
  console.log('실행하려면: node scripts/update-partner-addresses.cjs --run');
  console.log('');
  console.log('⚠️  주의: 이 스크립트는 실제 DB 데이터를 수정합니다.');
}

/**
 * Partners 테이블의 주소 관련 필드 확인 스크립트
 */

const { connect } = require('@planetscale/database');

async function checkPartnerAddress() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('=== 1. Partners 테이블 구조 확인 ===\n');

    const structure = await connection.execute('DESCRIBE partners');
    console.log('테이블 필드 목록:');
    structure.rows.forEach(row => {
      const fieldName = row.Field;
      const fieldType = row.Type;
      const isNull = row.Null;
      console.log(`  - ${fieldName}: ${fieldType} (Null: ${isNull})`);
    });

    console.log('\n=== 2. 샘플 데이터 확인 (최대 3개) ===\n');

    const samples = await connection.execute(`
      SELECT
        id,
        business_name,
        location,
        business_address,
        detailed_address,
        description,
        phone,
        lat,
        lng
      FROM partners
      WHERE is_active = 1
      LIMIT 3
    `);

    if (samples.rows && samples.rows.length > 0) {
      samples.rows.forEach((partner, index) => {
        console.log(`\n--- Partner ${index + 1}: ${partner.business_name} ---`);
        console.log(`ID: ${partner.id}`);
        console.log(`location: ${partner.location || '(없음)'}`);
        console.log(`business_address: ${partner.business_address || '(없음)'}`);
        console.log(`detailed_address: ${partner.detailed_address || '(없음)'}`);
        console.log(`description: ${partner.description ? partner.description.substring(0, 100) + '...' : '(없음)'}`);
        console.log(`phone: ${partner.phone || '(없음)'}`);
        console.log(`lat: ${partner.lat || '(없음)'}`);
        console.log(`lng: ${partner.lng || '(없음)'}`);
      });
    } else {
      console.log('활성화된 파트너 데이터가 없습니다.');
    }

    console.log('\n=== 3. 주소 필드 분석 ===\n');

    const analysis = await connection.execute(`
      SELECT
        COUNT(*) as total,
        COUNT(location) as has_location,
        COUNT(business_address) as has_business_address,
        COUNT(detailed_address) as has_detailed_address,
        COUNT(CASE WHEN location IS NOT NULL AND location != '' THEN 1 END) as location_not_empty,
        COUNT(CASE WHEN business_address IS NOT NULL AND business_address != '' THEN 1 END) as business_address_not_empty,
        COUNT(CASE WHEN detailed_address IS NOT NULL AND detailed_address != '' THEN 1 END) as detailed_address_not_empty
      FROM partners
      WHERE is_active = 1
    `);

    if (analysis.rows && analysis.rows.length > 0) {
      const stats = analysis.rows[0];
      console.log(`총 활성 파트너: ${stats.total}개`);
      console.log(`location 필드가 있는 파트너: ${stats.has_location}개 (비어있지 않음: ${stats.location_not_empty}개)`);
      console.log(`business_address 필드가 있는 파트너: ${stats.has_business_address}개 (비어있지 않음: ${stats.business_address_not_empty}개)`);
      console.log(`detailed_address 필드가 있는 파트너: ${stats.has_detailed_address}개 (비어있지 않음: ${stats.detailed_address_not_empty}개)`);
    }

    console.log('\n=== 4. PartnerPage.tsx의 주소 표시 로직 분석 ===\n');
    console.log('현재 PartnerPage.tsx 109번 라인:');
    console.log('  location: partner.location || displayAddress');
    console.log('');
    console.log('- partner.location: DB의 location 필드 (예: "전남 신안군")');
    console.log('- displayAddress: description에서 정규식으로 추출한 주소 또는 phone');
    console.log('');
    console.log('문제: location 필드에 "전남 신안군"만 저장되어 있음');
    console.log('');

    console.log('\n=== 5. 해결 방안 ===\n');
    console.log('방안 1: business_address 또는 detailed_address 필드를 사용');
    console.log('  - 109번 라인을 다음과 같이 수정:');
    console.log('    location: partner.detailed_address || partner.business_address || partner.location || displayAddress');
    console.log('');
    console.log('방안 2: location 필드에 상세주소 업데이트');
    console.log('  - DB의 location 필드를 상세주소로 업데이트');
    console.log('');
    console.log('방안 3: API 응답에 모든 주소 필드 포함하고 프론트엔드에서 조합');
    console.log('  - detailed_address + business_address + location을 조합하여 표시');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkPartnerAddress().catch(console.error);

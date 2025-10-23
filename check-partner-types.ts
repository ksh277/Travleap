import { connect } from '@planetscale/database';

async function checkPartnerTypes() {
  const connection = connect({
    url: process.env.DATABASE_URL || ''
  });

  try {
    console.log('📊 파트너 데이터 확인 중...\n');

    // 모든 파트너 조회 (partner_type 포함)
    const allPartners = await connection.execute(`
      SELECT id, business_name, partner_type, status, is_active
      FROM partners
      ORDER BY created_at DESC
    `);

    console.log('=== 전체 파트너 목록 ===');
    console.log(`총 ${allPartners.rows.length}개 파트너\n`);

    allPartners.rows.forEach((partner: any) => {
      console.log(`ID: ${partner.id}`);
      console.log(`  이름: ${partner.business_name}`);
      console.log(`  타입: ${partner.partner_type || 'NULL'}`);
      console.log(`  상태: ${partner.status} (활성: ${partner.is_active ? 'YES' : 'NO'})`);
      console.log('');
    });

    // 현재 API 필터 조건으로 조회
    const filteredPartners = await connection.execute(`
      SELECT id, business_name, partner_type
      FROM partners
      WHERE (partner_type IS NULL OR partner_type != 'lodging')
      ORDER BY created_at DESC
    `);

    console.log('\n=== 현재 API 필터 조건 (숙박 제외) ===');
    console.log(`총 ${filteredPartners.rows.length}개 파트너\n`);

    filteredPartners.rows.forEach((partner: any) => {
      console.log(`- ${partner.business_name} (타입: ${partner.partner_type || 'NULL'})`);
    });

    // partner_type별 통계
    const typeStats = await connection.execute(`
      SELECT
        COALESCE(partner_type, 'NULL') as type,
        COUNT(*) as count
      FROM partners
      GROUP BY partner_type
    `);

    console.log('\n=== partner_type 통계 ===');
    typeStats.rows.forEach((stat: any) => {
      console.log(`${stat.type}: ${stat.count}개`);
    });

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

checkPartnerTypes();

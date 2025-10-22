import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = connect({ url: process.env.DATABASE_URL });

async function verifyPartners() {
  console.log('🔍 신안 제휴 파트너 데이터 검증 중...\n');

  try {
    // 전체 파트너 조회
    const allPartners = await connection.execute(
      'SELECT business_name, services, business_address, tier, partner_type FROM partners WHERE is_active = 1 ORDER BY created_at DESC'
    );

    console.log(`📊 전체 활성 파트너 수: ${allPartners.rows.length}개\n`);

    // 신안 파트너만 필터링
    const sinanPartners = allPartners.rows.filter((p: any) =>
      p.business_address && p.business_address.includes('신안군')
    );

    console.log(`🏝️  신안 제휴 파트너 수: ${sinanPartners.rows?.length || sinanPartners.length}개\n`);

    // 카테고리별 집계
    const lodging = sinanPartners.filter((p: any) => p.partner_type === 'lodging');
    const restaurants = sinanPartners.filter((p: any) => p.services && p.services.includes('음식'));
    const cafes = sinanPartners.filter((p: any) => p.services && p.services.includes('카페'));
    const tours = sinanPartners.filter((p: any) => p.services && (p.services.includes('투어') || p.services.includes('요트')));

    console.log('📋 카테고리별 현황:');
    console.log(`   - 숙박: ${lodging.length}개`);
    console.log(`   - 음식: ${restaurants.length}개`);
    console.log(`   - 카페: ${cafes.length}개`);
    console.log(`   - 투어: ${tours.length}개`);
    console.log('');

    // 티어별 집계
    const gold = sinanPartners.filter((p: any) => p.tier === 'gold');
    const silver = sinanPartners.filter((p: any) => p.tier === 'silver');
    const bronze = sinanPartners.filter((p: any) => p.tier === 'bronze');

    console.log('🏆 티어별 현황:');
    console.log(`   - Gold: ${gold.length}개`);
    console.log(`   - Silver: ${silver.length}개`);
    console.log(`   - Bronze: ${bronze.length}개`);
    console.log('');

    // 최근 추가된 파트너 목록
    console.log('✨ 최근 추가된 신안 파트너 (10개):');
    sinanPartners.slice(0, 10).forEach((p: any, idx: number) => {
      console.log(`   ${idx + 1}. ${p.business_name} (${p.services})`);
    });

    console.log('\n✅ 검증 완료!\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

verifyPartners();

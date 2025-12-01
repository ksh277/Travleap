/**
 * 파트너 카테고리 수정 스크립트
 * 잘못된 카테고리를 8개 정규 카테고리로 변환
 *
 * 정규 카테고리: 여행, 숙박, 음식, 렌트카, 관광지, 팝업, 행사, 체험
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

const connection = connect({ url: process.env.DATABASE_URL });

// 카테고리 매핑 (잘못된 값 → 정규 값)
const categoryMap = {
  // 음식 관련
  '카페': '음식',
  '맛집': '음식',
  '식당': '음식',
  '레스토랑': '음식',
  'restaurant': '음식',
  'cafe': '음식',
  'food': '음식',

  // 여행 관련
  '투어': '여행',
  'tour': '여행',
  'travel': '여행',

  // 숙박 관련
  '호텔': '숙박',
  '펜션': '숙박',
  '모텔': '숙박',
  '민박': '숙박',
  'accommodation': '숙박',
  'lodging': '숙박',
  'stay': '숙박',

  // 렌트카 관련
  '렌터카': '렌트카',
  'rentcar': '렌트카',
  'car': '렌트카',

  // 관광지 관련
  '관광': '관광지',
  'attraction': '관광지',
  'tourist': '관광지',

  // 체험 관련
  '액티비티': '체험',
  'activity': '체험',
  'experience': '체험',

  // 팝업 관련
  'popup': '팝업',

  // 행사 관련
  '이벤트': '행사',
  'event': '행사'
};

async function fixPartnerCategories() {
  console.log('🔧 파트너 카테고리 수정 시작...\n');

  try {
    // 1. 현재 파트너들의 카테고리 조회
    const result = await connection.execute(`
      SELECT id, business_name, services
      FROM partners
      WHERE services IS NOT NULL AND services != ''
    `);

    const partners = result.rows || [];
    console.log(`📋 총 ${partners.length}개 파트너 조회됨\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    // 정규 카테고리 목록
    const validCategories = ['여행', '숙박', '음식', '렌트카', '관광지', '팝업', '행사', '체험'];

    for (const partner of partners) {
      const currentCategory = (partner.services || '').trim();

      // 이미 정규 카테고리면 스킵
      if (validCategories.includes(currentCategory)) {
        skippedCount++;
        continue;
      }

      // 매핑된 카테고리 찾기
      const newCategory = categoryMap[currentCategory] || categoryMap[currentCategory.toLowerCase()];

      if (newCategory) {
        // 업데이트
        await connection.execute(`
          UPDATE partners SET services = ? WHERE id = ?
        `, [newCategory, partner.id]);

        console.log(`✅ [${partner.id}] ${partner.business_name}: "${currentCategory}" → "${newCategory}"`);
        updatedCount++;
      } else {
        console.log(`⚠️ [${partner.id}] ${partner.business_name}: "${currentCategory}" - 매핑 없음 (수동 확인 필요)`);
      }
    }

    console.log(`\n========================================`);
    console.log(`✅ 수정 완료: ${updatedCount}개`);
    console.log(`⏭️ 스킵 (이미 정상): ${skippedCount}개`);
    console.log(`========================================\n`);

    // 2. 수정 후 카테고리별 통계
    const statsResult = await connection.execute(`
      SELECT services, COUNT(*) as count
      FROM partners
      WHERE services IS NOT NULL AND services != ''
      GROUP BY services
      ORDER BY count DESC
    `);

    console.log('📊 카테고리별 파트너 수:');
    for (const row of statsResult.rows || []) {
      const isValid = validCategories.includes(row.services);
      console.log(`   ${isValid ? '✅' : '❌'} ${row.services}: ${row.count}개`);
    }

  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

fixPartnerCategories();

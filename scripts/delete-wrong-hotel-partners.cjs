/**
 * 잘못 추가된 호텔 파트너 삭제
 *
 * 삭제 대상:
 * - ID 229: 제주 오션뷰 호텔
 * - ID 230: 서울 시티 호텔
 * - ID 231: 부산 씨사이드 리조트
 * - ID 233: 제주 오션뷰 호텔 (중복)
 * - ID 238: 트래블립 호텔
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function deleteWrongHotels() {
  const conn = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🗑️  잘못 추가된 호텔 파트너 삭제 중...\n');

    const wrongHotelIds = [229, 230, 231, 233, 238];

    // 삭제 전 확인
    console.log('📋 삭제 대상 파트너:');
    for (const id of wrongHotelIds) {
      const result = await conn.execute('SELECT id, business_name, partner_type, created_at FROM partners WHERE id = ?', [id]);
      if (result.rows.length > 0) {
        const row = result.rows[0];
        console.log('  - ID: ' + row.id + ' | ' + row.business_name + ' | ' + row.created_at);
      }
    }

    console.log('\n⚠️  정말 삭제하시겠습니까? (5초 후 자동 진행)');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 삭제 실행
    console.log('\n🔥 삭제 중...');
    let deletedCount = 0;

    for (const id of wrongHotelIds) {
      try {
        await conn.execute('DELETE FROM partners WHERE id = ?', [id]);
        console.log('  ✅ ID ' + id + ' 삭제 완료');
        deletedCount++;
      } catch (error) {
        console.log('  ❌ ID ' + id + ' 삭제 실패: ' + error.message);
      }
    }

    console.log('\n✅ 총 ' + deletedCount + '개의 파트너 삭제 완료!');

    // 삭제 후 확인
    const total = await conn.execute('SELECT COUNT(*) as cnt FROM partners WHERE is_active = 1');
    const nonRentcar = await conn.execute("SELECT COUNT(*) as cnt FROM partners WHERE is_active = 1 AND partner_type != 'rentcar'");

    console.log('\n📊 삭제 후 현황:');
    console.log('  - 전체 활성 파트너: ' + total.rows[0].cnt + '개');
    console.log('  - 렌트카 제외: ' + nonRentcar.rows[0].cnt + '개 (목표: 28개)');

    if (nonRentcar.rows[0].cnt === 28) {
      console.log('\n🎉 성공! 가맹점 수가 정확히 28개입니다!');
    } else {
      console.log('\n⚠️  주의: 예상과 다른 개수입니다. 확인 필요.');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

deleteWrongHotels();

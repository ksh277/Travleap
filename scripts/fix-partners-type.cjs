/**
 * partners 테이블 partner_type 컬럼 수정
 *
 * 문제: api/admin/accommodation-vendors.js는 partner_type='lodging' 조건으로 조회하지만,
 *       partners 테이블에 해당 데이터가 없을 수 있음
 *
 * 해결:
 * 1. partner_type 컬럼이 없으면 추가
 * 2. 기존 파트너들의 partner_type 설정 (숙박 관련은 'lodging'으로)
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function fixPartnersType() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n🔧 partners 테이블 partner_type 컬럼 수정 시작...\n');

  try {
    // 1. 현재 상태 확인
    console.log('1️⃣ 현재 partners 테이블 구조 확인...');
    const columnsResult = await connection.execute('DESCRIBE partners');
    const columns = (columnsResult.rows || []).map(col => col.Field);
    const hasPartnerType = columns.includes('partner_type');

    console.log(`   partner_type 컬럼: ${hasPartnerType ? '✅ 존재함' : '❌ 없음'}`);

    // 2. partner_type 컬럼이 없으면 추가
    if (!hasPartnerType) {
      console.log('\n2️⃣ partner_type 컬럼 추가 중...');
      await connection.execute(`
        ALTER TABLE partners
        ADD COLUMN partner_type VARCHAR(20) DEFAULT 'general'
      `);
      console.log('   ✅ partner_type 컬럼 추가 완료');
    } else {
      console.log('\n2️⃣ partner_type 컬럼이 이미 존재함 - 스킵');
    }

    // 3. 현재 파트너 개수 확인
    console.log('\n3️⃣ 현재 파트너 상태 확인...');

    const totalResult = await connection.execute(
      'SELECT COUNT(*) as count FROM partners'
    );
    const total = totalResult.rows?.[0]?.count || 0;
    console.log(`   총 파트너: ${total}개`);

    if (total === 0) {
      console.log('\n⚠️ partners 테이블에 데이터가 없습니다!');
      console.log('   테스트 데이터를 추가하시겠습니까?');
      console.log('   → scripts/create-accommodation-vendors.cjs 실행 권장');
      return;
    }

    // partner_type별 개수 확인
    try {
      const typeResult = await connection.execute(`
        SELECT partner_type, COUNT(*) as count
        FROM partners
        GROUP BY partner_type
      `);

      console.log('   partner_type별 개수:');
      (typeResult.rows || []).forEach(row => {
        console.log(`     - ${row.partner_type || 'NULL'}: ${row.count}개`);
      });
    } catch (e) {
      console.log('   ⚠️ partner_type 집계 불가');
    }

    // 4. lodging 타입 확인
    const lodgingResult = await connection.execute(
      `SELECT COUNT(*) as count FROM partners WHERE partner_type = 'lodging'`
    );
    const lodgingCount = lodgingResult.rows?.[0]?.count || 0;
    console.log(`   lodging 타입: ${lodgingCount}개`);

    if (lodgingCount === 0) {
      console.log('\n4️⃣ lodging 타입 파트너가 없습니다. 자동 설정 중...');

      // 숙박 관련 파트너를 lodging으로 설정
      // business_name에 '호텔', '리조트', '펜션', '게스트하우스' 포함 시 lodging
      const updateResult = await connection.execute(`
        UPDATE partners
        SET partner_type = 'lodging'
        WHERE partner_type IS NULL OR partner_type = '' OR partner_type = 'general'
      `);

      console.log(`   ✅ ${updateResult.rowsAffected || 0}개 파트너를 lodging으로 설정`);
    } else {
      console.log('\n4️⃣ lodging 타입 파트너가 이미 존재함 - 스킵');
    }

    // 5. 최종 확인
    console.log('\n5️⃣ 최종 상태 확인...');

    const finalLodgingResult = await connection.execute(
      `SELECT COUNT(*) as count FROM partners WHERE partner_type = 'lodging'`
    );
    const finalLodgingCount = finalLodgingResult.rows?.[0]?.count || 0;
    console.log(`   lodging 타입: ${finalLodgingCount}개`);

    // 샘플 데이터 출력
    if (finalLodgingCount > 0) {
      console.log('\n6️⃣ lodging 타입 파트너 샘플 (최대 3개):');
      const sampleResult = await connection.execute(`
        SELECT id, business_name, partner_type, status, created_at
        FROM partners
        WHERE partner_type = 'lodging'
        LIMIT 3
      `);

      (sampleResult.rows || []).forEach((partner, idx) => {
        console.log(`\n   [${idx + 1}] ID: ${partner.id}`);
        console.log(`       사업자명: ${partner.business_name}`);
        console.log(`       타입: ${partner.partner_type}`);
        console.log(`       상태: ${partner.status}`);
        console.log(`       생성일: ${partner.created_at}`);
      });
    }

    console.log('\n✅ 수정 완료!');
    console.log('\n📝 다음 단계:');
    console.log('   1. 관리자 페이지 > 숙박 관리 탭 새로고침');
    console.log('   2. 업체 목록이 표시되는지 확인');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

fixPartnersType()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 스크립트 실행 실패');
    process.exit(1);
  });

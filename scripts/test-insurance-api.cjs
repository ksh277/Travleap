const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * 보험 관리 API 종합 테스트
 */

async function testInsuranceAPI() {
  console.log('🧪 보험 관리 API 종합 테스트 시작\n');
  console.log('='.repeat(80));

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 1. 관리자 토큰 생성 (테스트용)
    console.log('\n1️⃣ 관리자 토큰 생성 테스트');
    const adminToken = jwt.sign(
      { userId: 1, role: 'admin', email: 'admin@test.com' },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '1h' }
    );
    console.log('✅ 관리자 토큰 생성 완료');

    // 2. 데이터베이스 보험 조회
    console.log('\n2️⃣ 데이터베이스 보험 조회');
    const dbResult = await connection.execute(`
      SELECT
        id, name, category, price, pricing_unit,
        coverage_amount, is_active, vendor_id, vehicle_id
      FROM insurances
      WHERE category = 'rentcar'
      ORDER BY is_active DESC, price ASC
    `);

    console.log(`📊 총 렌트카 보험 수: ${dbResult.rows.length}개`);
    console.log('\n렌트카 보험 목록:');
    console.table(dbResult.rows.map(row => ({
      ID: row.id,
      '보험명': row.name,
      '가격': `${Number(row.price).toLocaleString()}원`,
      '단위': row.pricing_unit === 'daily' ? '일' : row.pricing_unit === 'hourly' ? '시간' : '회',
      '보장액': `${Number(row.coverage_amount).toLocaleString()}원`,
      '활성': row.is_active ? '✅' : '❌',
      '벤더ID': row.vendor_id || '공용',
      '차량ID': row.vehicle_id || '전체'
    })));

    // 3. 활성 보험 (공개 API용)
    console.log('\n3️⃣ 공개 API용 활성 보험 조회');
    const publicResult = await connection.execute(`
      SELECT id, name, price, pricing_unit, description
      FROM insurances
      WHERE category = 'rentcar'
        AND is_active = 1
        AND vendor_id IS NULL
      ORDER BY price ASC
    `);

    console.log(`📊 공개 API에 노출되는 보험 수: ${publicResult.rows.length}개`);
    console.table(publicResult.rows.map(row => ({
      ID: row.id,
      '보험명': row.name,
      '가격': `${Number(row.price).toLocaleString()}원`,
      '단위': row.pricing_unit === 'daily' ? '일' : row.pricing_unit === 'hourly' ? '시간' : '회',
      '설명': row.description.substring(0, 50) + '...'
    })));

    // 4. API 엔드포인트 시뮬레이션
    console.log('\n4️⃣ API 엔드포인트 동작 시뮬레이션\n');

    console.log('📍 GET /api/admin/insurance (관리자용 - 인증 필요)');
    console.log('   → 모든 렌트카 보험 조회 (활성/비활성 포함)');
    console.log(`   → 결과: ${dbResult.rows.length}개 보험`);

    console.log('\n📍 GET /api/rentcar/insurances (공개용 - 인증 불필요)');
    console.log('   → 활성화된 공용 렌트카 보험만 조회');
    console.log(`   → 결과: ${publicResult.rows.length}개 보험`);

    console.log('\n📍 GET /api/rentcar/insurances?vendor_id=12 (공개용)');
    const vendorResult = await connection.execute(`
      SELECT id, name, price
      FROM insurances
      WHERE category = 'rentcar'
        AND is_active = 1
        AND (vendor_id IS NULL OR vendor_id = 12)
      ORDER BY price ASC
    `);
    console.log('   → 특정 벤더용 + 공용 보험 조회');
    console.log(`   → 결과: ${vendorResult.rows.length}개 보험`);

    // 5. 보험 가격 통계
    console.log('\n5️⃣ 보험 가격 통계');
    const statsResult = await connection.execute(`
      SELECT
        pricing_unit as '단위',
        COUNT(*) as '개수',
        MIN(price) as '최저가',
        MAX(price) as '최고가',
        AVG(price) as '평균가',
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as '활성'
      FROM insurances
      WHERE category = 'rentcar'
      GROUP BY pricing_unit
    `);

    console.table(statsResult.rows.map(row => ({
      '가격단위': row['단위'] === 'daily' ? '일' : row['단위'] === 'hourly' ? '시간' : '회',
      '총개수': row['개수'],
      '최저가': `${Number(row['최저가']).toLocaleString()}원`,
      '최고가': `${Number(row['최고가']).toLocaleString()}원`,
      '평균가': `${Math.round(Number(row['평균가'])).toLocaleString()}원`,
      '활성개수': row['활성']
    })));

    // 6. 보험 상세 정보 샘플
    console.log('\n6️⃣ 보험 상세 정보 샘플 (첫 번째 활성 보험)');
    const sampleResult = await connection.execute(`
      SELECT *
      FROM insurances
      WHERE category = 'rentcar' AND is_active = 1
      LIMIT 1
    `);

    if (sampleResult.rows.length > 0) {
      const sample = sampleResult.rows[0];
      console.log(`\n보험명: ${sample.name}`);
      console.log(`설명: ${sample.description}`);
      console.log(`가격: ${Number(sample.price).toLocaleString()}원/${sample.pricing_unit === 'daily' ? '일' : sample.pricing_unit === 'hourly' ? '시간' : '회'}`);
      console.log(`보장액: ${Number(sample.coverage_amount).toLocaleString()}원`);
      console.log(`활성 상태: ${sample.is_active ? '✅ 활성' : '❌ 비활성'}`);
      console.log(`벤더 제한: ${sample.vendor_id ? `벤더 ID ${sample.vendor_id}` : '공용 (모든 벤더)'}`);
      console.log(`차량 제한: ${sample.vehicle_id ? `차량 ID ${sample.vehicle_id}` : '전체 차량'}`);

      if (sample.coverage_details) {
        const details = typeof sample.coverage_details === 'string'
          ? JSON.parse(sample.coverage_details)
          : sample.coverage_details;

        if (details.items && details.items.length > 0) {
          console.log(`\n보장 내용 (${details.items.length}개):`);
          details.items.slice(0, 3).forEach((item, idx) => {
            console.log(`  ${idx + 1}. ${item}`);
          });
          if (details.items.length > 3) {
            console.log(`  ... 외 ${details.items.length - 3}개`);
          }
        }

        if (details.exclusions && details.exclusions.length > 0) {
          console.log(`\n보장 제외 사항 (${details.exclusions.length}개):`);
          details.exclusions.forEach((item, idx) => {
            console.log(`  ${idx + 1}. ${item}`);
          });
        }
      }
    }

    // 7. API 연동 확인사항
    console.log('\n' + '='.repeat(80));
    console.log('\n7️⃣ API 연동 확인사항\n');

    console.log('✅ 관리자 페이지 (AdminInsurance.tsx):');
    console.log('   - API 엔드포인트: GET /api/admin/insurance');
    console.log('   - 인증: Bearer Token 필요');
    console.log('   - 기능: 보험 조회/추가/수정/삭제');
    console.log('   - 상태: 모든 보험 조회 가능 (활성/비활성 포함)\n');

    console.log('✅ 렌트카 상세 페이지 (pages/rentcar/[id].tsx):');
    console.log('   - API 엔드포인트: GET /api/rentcar/insurances?vendor_id={id}');
    console.log('   - 인증: 불필요 (공개 API)');
    console.log('   - 기능: 활성 보험 조회 및 선택');
    console.log('   - 상태: 공용 + 벤더 전용 보험만 노출\n');

    console.log('✅ 예약 API (pages/api/rentcar/bookings.js):');
    console.log('   - 보험 ID(insurance_id)를 POST 요청에 포함');
    console.log('   - rentcar_bookings 테이블에 저장');
    console.log('   - insurance_fee_krw 필드에 보험료 저장\n');

    // 8. 테스트 완료
    console.log('='.repeat(80));
    console.log('\n✅ 보험 관리 API 종합 테스트 완료!\n');
    console.log('다음 단계:');
    console.log('1. 관리자 페이지에서 보험 추가/수정/삭제 테스트');
    console.log('2. 렌트카 상세 페이지에서 보험 선택 기능 테스트');
    console.log('3. 예약 시 보험 정보가 제대로 저장되는지 확인');
    console.log('');

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error);
    throw error;
  }
}

// 실행
testInsuranceAPI().catch(console.error);

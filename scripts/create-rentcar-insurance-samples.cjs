const { connect } = require('@planetscale/database');
require('dotenv').config();

/**
 * 렌트카 보험 샘플 데이터 생성 스크립트
 *
 * 보험 종류:
 * 1. 자차손해면책제도 (CDW) - 차량 손해 보장
 * 2. 슈퍼자차 (Super CDW) - 자차 면책금 완전 면제
 * 3. 자손보험 (자손보) - 자기신체사고 보험
 * 4. 대물배상 추가 보험
 */

async function createRentcarInsurances() {
  console.log('🚗 렌트카 보험 샘플 데이터 생성 시작...\n');

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 기존 렌트카 보험 확인
    const existingResult = await connection.execute(
      `SELECT COUNT(*) as count FROM insurances WHERE category = 'rentcar'`
    );
    const existingCount = existingResult.rows[0]?.count || 0;
    console.log(`📊 기존 렌트카 보험 개수: ${existingCount}개\n`);

    // 렌트카 벤더 확인
    const vendorsResult = await connection.execute(
      `SELECT id, business_name FROM partners WHERE partner_type = 'rentcar' LIMIT 5`
    );
    const vendors = vendorsResult.rows || [];
    console.log(`🏢 렌트카 벤더 ${vendors.length}개 발견:`);
    vendors.forEach(v => console.log(`  - ID: ${v.id}, 이름: ${v.business_name}`));
    console.log('');

    // 공용 렌트카 보험 생성
    const insurances = [
      {
        name: '자차손해면책제도 (CDW)',
        category: 'rentcar',
        price: 15000,
        pricing_unit: 'daily',
        coverage_amount: 5000000,
        vendor_id: null, // 공용
        vehicle_id: null,
        description: '렌트카 사고 시 자차 수리비 부담을 최소화하는 기본 보험입니다. 면책금 50만원 이하로 감면됩니다.',
        coverage_details: JSON.stringify({
          items: [
            '자차 수리비 최대 500만원 보장',
            '면책금 50만원으로 감면',
            '사고 시 본인 부담금 대폭 감소',
            '24시간 긴급출동 서비스',
            '대차 차량 제공 서비스'
          ],
          exclusions: [
            '음주/무면허 운전',
            '고의적인 사고',
            '계약서상 운전자 외 운전',
            '약관에 명시된 면책 사항'
          ]
        }),
        is_active: 1
      },
      {
        name: '슈퍼자차 (Super CDW)',
        category: 'rentcar',
        price: 25000,
        pricing_unit: 'daily',
        coverage_amount: 10000000,
        vendor_id: null,
        vehicle_id: null,
        description: '자차 면책금을 완전히 면제하는 프리미엄 보험입니다. 사고 발생 시 본인 부담금이 0원입니다.',
        coverage_details: JSON.stringify({
          items: [
            '자차 면책금 완전 면제 (0원)',
            '자차 수리비 최대 1,000만원 보장',
            '영업손실금 면제',
            '사고 시 본인 부담금 0원',
            '휴차보상료 면제',
            '프리미엄 긴급출동 서비스',
            '우선 대차 차량 제공'
          ],
          exclusions: [
            '음주/무면허 운전',
            '고의적인 사고',
            '계약서상 운전자 외 운전'
          ]
        }),
        is_active: 1
      },
      {
        name: '자손보험 (자기신체사고)',
        category: 'rentcar',
        price: 5000,
        pricing_unit: 'daily',
        coverage_amount: 30000000,
        vendor_id: null,
        vehicle_id: null,
        description: '렌트카 이용 중 발생한 사고로 인한 운전자 및 동승자의 상해를 보장하는 보험입니다.',
        coverage_details: JSON.stringify({
          items: [
            '사망 시 최대 3,000만원 보장',
            '후유장해 최대 3,000만원 보장',
            '부상 치료비 최대 500만원',
            '운전자 및 동승자 모두 보장',
            '입원/통원 치료비 지원'
          ],
          exclusions: [
            '음주운전 중 사고',
            '기존 질병 및 상해',
            '고의적 자해',
            '전쟁, 내란, 폭동'
          ]
        }),
        is_active: 1
      },
      {
        name: '완전보험 (풀커버리지)',
        category: 'rentcar',
        price: 35000,
        pricing_unit: 'daily',
        coverage_amount: 50000000,
        vendor_id: null,
        vehicle_id: null,
        description: '모든 위험을 커버하는 올인원 프리미엄 보험 패키지입니다. 슈퍼자차 + 자손보 + 대물 추가 보장이 포함됩니다.',
        coverage_details: JSON.stringify({
          items: [
            '슈퍼자차 (면책금 0원)',
            '자손보험 (사망/상해 3,000만원)',
            '대물배상 최대 5,000만원 추가 보장',
            '휴차보상료 완전 면제',
            '영업손실금 면제',
            '긴급견인 및 수리 서비스',
            '24시간 프리미엄 상담',
            '사고처리 전담 직원 배정'
          ],
          exclusions: [
            '음주/무면허 운전',
            '고의적인 사고'
          ]
        }),
        is_active: 1
      },
      {
        name: '타이어/휠 특별보험',
        category: 'rentcar',
        price: 8000,
        pricing_unit: 'daily',
        coverage_amount: 2000000,
        vendor_id: null,
        vehicle_id: null,
        description: '제주도 특성상 자주 발생하는 타이어 및 휠 파손을 보장하는 특화 보험입니다.',
        coverage_details: JSON.stringify({
          items: [
            '타이어 파손 시 교체비 전액 보장',
            '휠 파손 시 수리/교체비 전액 보장',
            '최대 4개 타이어 동시 보장',
            '긴급 타이어 교체 서비스',
            '24시간 출동 서비스'
          ],
          exclusions: [
            '마모로 인한 정상 손실',
            '고의적 파손',
            '튜닝 타이어/휠'
          ]
        }),
        is_active: 1
      },
      {
        name: '시간제 보험 (12시간)',
        category: 'rentcar',
        price: 8000,
        pricing_unit: 'fixed',
        coverage_amount: 3000000,
        vendor_id: null,
        vehicle_id: null,
        description: '12시간 이하 단기 렌트 시 이용 가능한 경제적인 보험입니다. CDW 기본 보장이 포함됩니다.',
        coverage_details: JSON.stringify({
          items: [
            '12시간 보장',
            '자차 수리비 최대 300만원',
            '면책금 50만원',
            '긴급출동 서비스'
          ],
          exclusions: [
            '음주/무면허 운전',
            '12시간 초과 시 추가 비용 발생'
          ]
        }),
        is_active: 1
      }
    ];

    console.log('📝 보험 상품 추가 중...\n');

    for (const ins of insurances) {
      const result = await connection.execute(
        `INSERT INTO insurances (
          name, category, price, pricing_unit, coverage_amount,
          vendor_id, vehicle_id,
          description, coverage_details, is_active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          ins.name,
          ins.category,
          ins.price,
          ins.pricing_unit,
          ins.coverage_amount,
          ins.vendor_id,
          ins.vehicle_id,
          ins.description,
          ins.coverage_details,
          ins.is_active
        ]
      );

      console.log(`✅ ${ins.name} 추가 완료 (ID: ${result.insertId}, ${ins.price.toLocaleString()}원/${ins.pricing_unit === 'daily' ? '일' : ins.pricing_unit === 'hourly' ? '시간' : '회'})`);
    }

    // 특정 벤더 전용 보험 생성 (첫 번째 벤더용)
    if (vendors.length > 0) {
      const firstVendor = vendors[0];
      console.log(`\n🏢 ${firstVendor.business_name} 전용 보험 추가 중...`);

      const vendorInsurance = {
        name: `${firstVendor.business_name} 프리미엄 패키지`,
        category: 'rentcar',
        price: 30000,
        pricing_unit: 'daily',
        coverage_amount: 20000000,
        vendor_id: firstVendor.id,
        vehicle_id: null,
        description: `${firstVendor.business_name} 고객 전용 프리미엄 보험 패키지입니다. 슈퍼자차 + 자손보 + 특별 혜택이 포함됩니다.`,
        coverage_details: JSON.stringify({
          items: [
            '슈퍼자차 (면책금 0원)',
            '자손보험 포함',
            '업체 전용 특별 할인 적용',
            '무료 차량 업그레이드 (재고 있을 시)',
            '공항 픽업/드랍 무료',
            '24시간 프리미엄 상담'
          ],
          exclusions: [
            '음주/무면허 운전',
            '고의적인 사고'
          ]
        }),
        is_active: 1
      };

      const result = await connection.execute(
        `INSERT INTO insurances (
          name, category, price, pricing_unit, coverage_amount,
          vendor_id, vehicle_id,
          description, coverage_details, is_active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          vendorInsurance.name,
          vendorInsurance.category,
          vendorInsurance.price,
          vendorInsurance.pricing_unit,
          vendorInsurance.coverage_amount,
          vendorInsurance.vendor_id,
          vendorInsurance.vehicle_id,
          vendorInsurance.description,
          vendorInsurance.coverage_details,
          vendorInsurance.is_active
        ]
      );

      console.log(`✅ ${vendorInsurance.name} 추가 완료 (ID: ${result.insertId})`);
    }

    // 최종 확인
    console.log('\n📊 생성 완료! 최종 통계:\n');
    const finalResult = await connection.execute(
      `SELECT
        category,
        COUNT(*) as count,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count,
        MIN(price) as min_price,
        MAX(price) as max_price,
        AVG(price) as avg_price
      FROM insurances
      WHERE category = 'rentcar'
      GROUP BY category`
    );

    if (finalResult.rows && finalResult.rows.length > 0) {
      const stats = finalResult.rows[0];
      console.log(`카테고리: ${stats.category}`);
      console.log(`총 보험 상품 수: ${stats.count}개`);
      console.log(`활성 상품 수: ${stats.active_count}개`);
      console.log(`최저 가격: ${Number(stats.min_price).toLocaleString()}원`);
      console.log(`최고 가격: ${Number(stats.max_price).toLocaleString()}원`);
      console.log(`평균 가격: ${Number(stats.avg_price).toLocaleString()}원`);
    }

    console.log('\n✅ 렌트카 보험 샘플 데이터 생성 완료!');
    console.log('👉 관리자 페이지에서 보험 관리 메뉴를 확인하세요.');
    console.log('👉 렌트카 상세 페이지에서 보험 선택 기능을 테스트하세요.\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 실행
createRentcarInsurances().catch(console.error);

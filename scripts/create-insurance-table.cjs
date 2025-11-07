const { connect } = require('@planetscale/database');
require('dotenv').config();

(async () => {
  const db = connect({ url: process.env.DATABASE_URL });

  console.log('🏥 insurances 테이블 생성 중...\n');

  try {
    // insurances 테이블 생성
    await db.execute(`
      CREATE TABLE IF NOT EXISTS insurances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        coverage_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
        description TEXT,
        coverage_details JSON,
        is_active BOOLEAN DEFAULT true,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ insurances 테이블 생성 완료!');

    // 기본 보험 데이터 추가
    console.log('\n📋 기본 보험 데이터 추가 중...\n');

    const defaultInsurances = [
      {
        name: '여행자 보험 (기본)',
        category: 'tour',
        price: 15000,
        coverage_amount: 10000000,
        description: '여행 중 발생할 수 있는 상해 및 질병을 보장합니다.',
        coverage_details: {
          items: [
            '여행 중 상해 사망 및 후유장해 최대 1천만원',
            '여행 중 질병 치료비 최대 500만원',
            '휴대품 손해 최대 100만원',
            '여행 취소 및 중단 시 실비 보상'
          ],
          exclusions: [
            '전쟁, 내란으로 인한 손해',
            '고의적인 사고',
            '음주 운전',
            '기존 질병 악화'
          ]
        }
      },
      {
        name: '여행자 보험 (프리미엄)',
        category: 'tour',
        price: 30000,
        coverage_amount: 30000000,
        description: '더 넓은 범위의 보장과 높은 보상액을 제공하는 프리미엄 여행자 보험입니다.',
        coverage_details: {
          items: [
            '여행 중 상해 사망 및 후유장해 최대 3천만원',
            '여행 중 질병 치료비 최대 1천만원',
            '휴대품 손해 최대 300만원',
            '여행 취소 및 중단 시 실비 보상',
            '항공기 지연 보상',
            '수하물 지연 보상',
            '긴급 의료 이송 서비스'
          ],
          exclusions: [
            '전쟁, 내란으로 인한 손해',
            '고의적인 사고',
            '음주 운전',
            '기존 질병 악화'
          ]
        }
      },
      {
        name: '렌트카 자차보험 (일반)',
        category: 'rentcar',
        price: 10000,
        coverage_amount: 5000000,
        description: '렌터카 이용 중 발생하는 차량 손해를 보장합니다.',
        coverage_details: {
          items: [
            '자차 손해 최대 500만원 보장',
            '면책금 5만원',
            '차량 파손 시 수리비 보장',
            '도난 시 차량 가액 보장'
          ],
          exclusions: [
            '무면허 운전',
            '음주 운전',
            '고의적인 파손',
            '타이어 및 휠 단독 손해',
            '내부 장식품 손해'
          ]
        }
      },
      {
        name: '렌트카 자차보험 (완전자차)',
        category: 'rentcar',
        price: 20000,
        coverage_amount: 10000000,
        description: '면책금 없이 차량 손해를 전액 보장하는 완전자차 보험입니다.',
        coverage_details: {
          items: [
            '자차 손해 최대 1천만원 보장',
            '면책금 0원 (무면책)',
            '차량 파손 시 수리비 전액 보장',
            '도난 시 차량 가액 보장',
            '유리 단독 파손 보장',
            '24시간 긴급출동 서비스'
          ],
          exclusions: [
            '무면허 운전',
            '음주 운전',
            '고의적인 파손'
          ]
        }
      },
      {
        name: '숙박 취소 보험',
        category: 'stay',
        price: 5000,
        coverage_amount: 500000,
        description: '부득이한 사유로 숙박을 취소할 경우 취소 수수료를 보장합니다.',
        coverage_details: {
          items: [
            '예약자 및 동반자 질병/상해로 인한 취소 시 수수료 100% 환급',
            '직계가족 입원/사망으로 인한 취소 시 수수료 100% 환급',
            '자연재해로 인한 취소 시 수수료 100% 환급',
            '최대 50만원까지 보장'
          ],
          exclusions: [
            '단순 변심',
            '기존 질병 악화',
            '보험 가입 전 발생한 사유',
            '전쟁, 내란'
          ]
        }
      },
      {
        name: '체험활동 상해보험',
        category: 'experience',
        price: 8000,
        coverage_amount: 5000000,
        description: '체험 활동 중 발생할 수 있는 상해를 보장합니다.',
        coverage_details: {
          items: [
            '체험 중 상해 사망 및 후유장해 최대 500만원',
            '체험 중 상해 치료비 최대 200만원',
            '골절 시 특별 보상금 지급',
            '긴급 의료 이송 서비스'
          ],
          exclusions: [
            '고의적인 사고',
            '음주 상태에서의 사고',
            '안전 수칙 미준수로 인한 사고',
            '기존 질병 악화'
          ]
        }
      }
    ];

    for (const insurance of defaultInsurances) {
      try {
        await db.execute(`
          INSERT INTO insurances (name, category, price, coverage_amount, description, coverage_details, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          insurance.name,
          insurance.category,
          insurance.price,
          insurance.coverage_amount,
          insurance.description,
          JSON.stringify(insurance.coverage_details),
          1
        ]);
        console.log(`  ✅ ${insurance.name} - ${insurance.category} (${insurance.price.toLocaleString()}원)`);
      } catch (error) {
        console.log(`  ⚠️  ${insurance.name} - 이미 존재하거나 추가 실패`);
      }
    }

    console.log('\n✅ 모든 작업 완료!');
    console.log('\n📊 생성된 기본 보험:');
    console.log(`  • 여행자 보험: 2개 (기본, 프리미엄)`);
    console.log(`  • 렌트카 자차보험: 2개 (일반, 완전자차)`);
    console.log(`  • 숙박 취소 보험: 1개`);
    console.log(`  • 체험활동 상해보험: 1개`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
})();

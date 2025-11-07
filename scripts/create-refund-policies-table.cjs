const { connect } = require('@planetscale/database');
require('dotenv').config();

(async () => {
  const db = connect({ url: process.env.DATABASE_URL });

  console.log('📜 refund_policies 테이블 생성 중...\n');

  try {
    // refund_policies 테이블 생성
    await db.execute(`
      CREATE TABLE IF NOT EXISTS refund_policies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        policy_name VARCHAR(255) NOT NULL,
        category VARCHAR(50),
        listing_id INT,
        is_refundable BOOLEAN DEFAULT true,
        refund_policy_json JSON,
        priority INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_listing_id (listing_id),
        INDEX idx_is_active (is_active),
        INDEX idx_priority (priority)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ refund_policies 테이블 생성 완료!');

    // listings 테이블에 refund_policy 컬럼 추가 (이미 있으면 무시됨)
    try {
      await db.execute(`
        ALTER TABLE listings
        ADD COLUMN refund_policy JSON
      `);
      console.log('✅ listings 테이블에 refund_policy 컬럼 추가 완료!');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('⚠️  refund_policy 컬럼이 이미 존재합니다.');
      } else {
        console.error('❌ refund_policy 컬럼 추가 실패:', error.message);
      }
    }

    // 기본 환불 정책 데이터 추가
    console.log('\n📋 기본 환불 정책 데이터 추가 중...\n');

    const defaultPolicies = [
      {
        policy_name: '여행/투어 기본 정책',
        category: 'tour',
        is_refundable: true,
        refund_policy_json: {
          rules: [
            { days_before: 7, fee_rate: 0, description: '출발 7일 전까지 무료 취소 (100% 환불)' },
            { days_before: 3, fee_rate: 0.5, description: '출발 3-7일 전 50% 환불 (취소 수수료 50%)' },
            { days_before: 0, fee_rate: 1, description: '출발 3일 이내 환불 불가' }
          ],
          past_booking_refundable: false,
          notes: [
            '악천후 시 일정 변경 또는 전액 환불 가능',
            '최소 출발 인원 미달 시 취소 및 전액 환불',
            '안전상의 이유로 참여 제한 가능 (전액 환불)'
          ]
        },
        priority: 10
      },
      {
        policy_name: '숙박 기본 정책',
        category: 'stay',
        is_refundable: true,
        refund_policy_json: {
          rules: [
            { days_before: 7, fee_rate: 0, description: '체크인 7일 전까지 무료 취소 (100% 환불)' },
            { days_before: 3, fee_rate: 0.5, description: '체크인 3-7일 전 50% 환불 (취소 수수료 50%)' },
            { days_before: 0, fee_rate: 1, description: '체크인 3일 이내 환불 불가 (No-Show 포함)' }
          ],
          past_booking_refundable: false,
          notes: [
            '체크인 시간: 15:00 / 체크아웃: 11:00',
            '조기 체크인/늦은 체크아웃은 숙소 문의',
            '예약 변경은 취소 후 재예약 필요'
          ]
        },
        priority: 10
      },
      {
        policy_name: '렌트카 기본 정책',
        category: 'rentcar',
        is_refundable: true,
        refund_policy_json: {
          rules: [
            { days_before: 3, fee_rate: 0, description: '픽업 3일 전까지 무료 취소 (100% 환불)' },
            { days_before: 1, fee_rate: 0.3, description: '픽업 1-3일 전 취소 수수료 30%' },
            { days_before: 0, fee_rate: 0.5, description: '픽업 당일 취소 수수료 50%' }
          ],
          past_booking_refundable: false,
          notes: [
            '픽업 시 보증금 사전승인 (50,000원)',
            '반납 후 이상 없을 시 자동 해제',
            '차량 손상 시 수리비 청구 가능',
            'No-Show 시 환불 불가'
          ]
        },
        priority: 10
      },
      {
        policy_name: '체험활동 기본 정책',
        category: 'experience',
        is_refundable: true,
        refund_policy_json: {
          rules: [
            { days_before: 7, fee_rate: 0, description: '이용 7일 전까지 무료 취소' },
            { days_before: 3, fee_rate: 0.5, description: '이용 3-7일 전 50% 환불' },
            { days_before: 0, fee_rate: 1, description: '이용 3일 이내 환불 불가' }
          ],
          past_booking_refundable: false,
          notes: [
            '날씨 또는 안전상의 이유로 취소 시 전액 환불',
            '체험 당일 지각 시 환불 불가'
          ]
        },
        priority: 10
      },
      {
        policy_name: '맛집 기본 정책',
        category: 'food',
        is_refundable: true,
        refund_policy_json: {
          rules: [
            { days_before: 1, fee_rate: 0, description: '예약 1일 전까지 무료 취소' },
            { days_before: 0, fee_rate: 0.3, description: '예약 당일 취소 수수료 30%' }
          ],
          past_booking_refundable: false,
          notes: [
            '예약 시간 30분 이상 지각 시 자동 취소',
            'No-Show 시 다음 예약 제한 가능'
          ]
        },
        priority: 10
      },
      {
        policy_name: '관광명소 기본 정책',
        category: 'attractions',
        is_refundable: true,
        refund_policy_json: {
          rules: [
            { days_before: 3, fee_rate: 0, description: '이용 3일 전까지 무료 취소' },
            { days_before: 1, fee_rate: 0.3, description: '이용 1-3일 전 취소 수수료 30%' },
            { days_before: 0, fee_rate: 0.5, description: '이용 당일 취소 수수료 50%' }
          ],
          past_booking_refundable: false,
          notes: [
            '기상 악화로 인한 휴장 시 전액 환불',
            '티켓 사용 후 환불 불가'
          ]
        },
        priority: 10
      },
      {
        policy_name: '팝업 상품 기본 정책 (배송형)',
        category: 'popup',
        is_refundable: true,
        refund_policy_json: {
          rules: [
            { days_before: 999, fee_rate: 0, description: '배송 전 무료 취소 가능' }
          ],
          past_booking_refundable: true,
          notes: [
            '배송 후: 상품 수령일로부터 7일 이내 반품 가능',
            '단순 변심: 반품 배송비(3,000원) 고객 부담',
            '환불 불가: 상품 훼손, 포장 개봉, 사용 흔적이 있는 경우',
            '불량품/오배송: 무료 반품 및 전액 환불'
          ]
        },
        priority: 10
      },
      {
        policy_name: '환불 불가 정책',
        category: null,
        is_refundable: false,
        refund_policy_json: {
          rules: [],
          past_booking_refundable: false,
          notes: [
            '본 상품은 예약 후 환불이 불가능합니다.',
            '예약 전 신중히 확인해주세요.'
          ]
        },
        priority: 5
      }
    ];

    for (const policy of defaultPolicies) {
      try {
        await db.execute(`
          INSERT INTO refund_policies (
            policy_name, category, is_refundable, refund_policy_json, priority, is_active
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          policy.policy_name,
          policy.category,
          policy.is_refundable ? 1 : 0,
          JSON.stringify(policy.refund_policy_json),
          policy.priority,
          1
        ]);
        console.log(`  ✅ ${policy.policy_name} - ${policy.category || '공통'}`);
      } catch (error) {
        if (error.message.includes('Duplicate entry')) {
          console.log(`  ⚠️  ${policy.policy_name} - 이미 존재`);
        } else {
          console.log(`  ❌ ${policy.policy_name} - 추가 실패:`, error.message);
        }
      }
    }

    console.log('\n✅ 모든 작업 완료!');
    console.log('\n📊 생성된 기본 환불 정책:');
    console.log(`  • 여행/투어: 7일 전 무료, 3-7일 50%, 3일 이내 불가`);
    console.log(`  • 숙박: 7일 전 무료, 3-7일 50%, 3일 이내 불가`);
    console.log(`  • 렌트카: 3일 전 무료, 1-3일 30%, 당일 50%`);
    console.log(`  • 체험활동: 7일 전 무료, 3-7일 50%, 3일 이내 불가`);
    console.log(`  • 맛집: 1일 전 무료, 당일 30%`);
    console.log(`  • 관광명소: 3일 전 무료, 1-3일 30%, 당일 50%`);
    console.log(`  • 팝업 상품: 배송 전 무료, 배송 후 7일 이내 반품`);
    console.log(`  • 환불 불가 정책`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
})();

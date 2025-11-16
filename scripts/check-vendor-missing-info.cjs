const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(80));
console.log('벤더 대시보드 필수 정보 누락 점검');
console.log('업체가 확인해야 하는 중요한 정보들이 빠져있는지 확인');
console.log('='.repeat(80) + '\n');

/**
 * 업체가 대시보드에서 꼭 확인해야 할 정보들:
 *
 * 1. 주문/예약 관리
 *    - 고객 연락처 (이름, 전화번호, 이메일) ✅ 필수
 *    - 배송 주소 (팝업만 해당) ✅
 *    - 예약 날짜/시간 ✅
 *    - 상품/서비스 상세 정보 ✅
 *    - 결제 금액 및 결제 수단 ✅
 *    - 주문 상태 ✅
 *
 * 2. 정산 정보 ⚠️ 중요!
 *    - 매출 통계 (일별, 월별)
 *    - 수수료 정보
 *    - 정산 예정 금액
 *    - 정산 완료 내역
 *    - 정산 예정일
 *
 * 3. 리뷰/평점 관리
 *    - 고객 리뷰 목록
 *    - 평점 통계
 *    - 리뷰 답변 기능
 *
 * 4. 통계/분석
 *    - 조회수, 찜 수
 *    - 예약률
 *    - 취소율
 *    - 매출 추이
 *
 * 5. 상품/서비스 관리
 *    - 재고 관리 (재고 있는 상품)
 *    - 가격 수정
 *    - 이미지 관리
 *    - 활성화/비활성화
 *
 * 6. 고객 관리
 *    - 단골 고객 목록
 *    - 재방문 고객
 *    - VIP 고객
 *
 * 7. 알림/공지
 *    - 새 주문 알림
 *    - 취소 알림
 *    - 문의 알림
 */

const checkList = {
  '정산 정보': {
    importance: '🔴 필수',
    items: [
      '일별/월별 매출 통계',
      '플랫폼 수수료 내역',
      '정산 예정 금액',
      '정산 완료 내역',
      '다음 정산 예정일'
    ],
    apis: [
      'api/vendor/*/settlements',
      'api/vendor/*/revenue',
      'api/vendor/*/commission'
    ]
  },
  '리뷰 관리': {
    importance: '🟠 중요',
    items: [
      '고객 리뷰 목록',
      '리뷰 답변 기능',
      '평점 통계',
      '리뷰 신고 처리'
    ],
    apis: [
      'api/vendor/*/reviews',
      'api/vendor/*/reviews/reply'
    ]
  },
  '상품/서비스 등록 및 수정': {
    importance: '🟠 중요',
    items: [
      '신규 상품 등록',
      '기존 상품 수정',
      '가격 변경',
      '이미지 업로드',
      '재고 관리'
    ],
    apis: [
      'api/vendor/*/products (POST)',
      'api/vendor/*/products/{id} (PUT)',
      'api/vendor/*/products/{id}/images'
    ]
  },
  '통계 대시보드': {
    importance: '🟡 유용',
    items: [
      '오늘/이번 주/이번 달 매출',
      '조회수 추이',
      '예약/취소 통계',
      '인기 상품 순위',
      '시간대별 예약 분석'
    ],
    apis: [
      'api/vendor/*/analytics',
      'api/vendor/*/stats'
    ]
  },
  '고객 관리': {
    importance: '🟡 유용',
    items: [
      '단골 고객 목록',
      '재방문 고객',
      'VIP 고객',
      '고객 메모 기능'
    ],
    apis: [
      'api/vendor/*/customers',
      'api/vendor/*/customers/loyalty'
    ]
  },
  '알림 설정': {
    importance: '🟡 유용',
    items: [
      '새 주문 알림',
      '취소 알림',
      '리뷰 알림',
      '문의 알림',
      '정산 알림'
    ],
    apis: [
      'api/vendor/*/notifications',
      'api/vendor/*/notification-settings'
    ]
  },
  '문의 관리': {
    importance: '🟠 중요',
    items: [
      '고객 문의 목록',
      '문의 답변',
      'FAQ 관리'
    ],
    apis: [
      'api/vendor/*/inquiries',
      'api/vendor/*/inquiries/{id}/reply'
    ]
  },
  '정책 관리': {
    importance: '🟡 유용',
    items: [
      '취소/환불 정책 설정',
      '배송 정책 (팝업)',
      '이용 약관'
    ],
    apis: [
      'api/vendor/*/policies'
    ]
  },
  '업체 프로필': {
    importance: '🟠 중요',
    items: [
      '업체 정보 수정',
      '사업자 정보',
      '계좌 정보',
      '운영 시간',
      '연락처'
    ],
    apis: [
      'api/vendor/profile',
      'api/vendor/business-info'
    ]
  }
};

console.log('벤더 대시보드에 필요한 기능 체크리스트\n');

Object.keys(checkList).forEach((category, idx) => {
  const info = checkList[category];
  console.log(`${idx + 1}. ${category} ${info.importance}`);
  console.log('   항목:');
  info.items.forEach(item => {
    console.log(`      - ${item}`);
  });
  console.log('   필요 API:');
  info.apis.forEach(api => {
    console.log(`      - ${api}`);
  });
  console.log('');
});

// 각 대시보드 파일에서 이러한 기능이 구현되어 있는지 확인
console.log('='.repeat(80));
console.log('각 대시보드 구현 상태 확인\n');

const dashboards = [
  'components/RentcarVendorDashboard.tsx',
  'components/TourVendorDashboard.tsx',
  'components/FoodVendorDashboard.tsx',
  'components/AttractionsVendorDashboard.tsx',
  'components/EventsVendorDashboard.tsx',
  'components/ExperienceVendorDashboard.tsx',
  'components/PopupVendorDashboard.tsx'
];

const keywords = {
  '정산': ['settlement', 'revenue', 'commission', '정산', '수수료'],
  '리뷰': ['review', 'rating', '리뷰', '평점'],
  '통계': ['analytics', 'stats', 'chart', 'graph', '통계', '분석'],
  '고객관리': ['customer', 'loyalty', 'vip', '고객', '단골'],
  '알림': ['notification', 'alert', '알림'],
  '문의': ['inquiry', 'question', '문의'],
  '프로필': ['profile', 'business-info', '프로필', '업체정보']
};

dashboards.forEach(dashboard => {
  const name = dashboard.split('/')[1].replace('VendorDashboard.tsx', '');
  const filePath = path.join(process.cwd(), dashboard);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${name}: 파일 없음\n`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  console.log(`📋 ${name} 대시보드:`);

  Object.keys(keywords).forEach(feature => {
    const found = keywords[feature].some(keyword =>
      content.toLowerCase().includes(keyword.toLowerCase())
    );

    if (found) {
      console.log(`   ✅ ${feature} 관련 코드 발견`);
    } else {
      console.log(`   ❌ ${feature} 관련 코드 없음`);
    }
  });

  console.log('');
});

console.log('='.repeat(80));
console.log('권장 사항\n');

console.log('🔴 필수 추가 기능:');
console.log('   1. 정산 정보 대시보드 (매출, 수수료, 정산 내역)');
console.log('   2. 리뷰 관리 기능');
console.log('   3. 업체 프로필 관리\n');

console.log('🟠 중요 추가 기능:');
console.log('   1. 상품/서비스 등록 및 수정 기능');
console.log('   2. 고객 문의 관리');
console.log('   3. 통계 대시보드\n');

console.log('🟡 선택 추가 기능:');
console.log('   1. 고객 관리 (단골, VIP)');
console.log('   2. 알림 설정');
console.log('   3. 정책 관리\n');

console.log('='.repeat(80) + '\n');

process.exit(0);

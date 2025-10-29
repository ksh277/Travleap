/**
 * Toss Payments 가맹점 심사 요구사항 검증 스크립트
 *
 * 검증 항목:
 * 1. 필수 법적 페이지 존재 여부
 * 2. 사업자 정보 표시
 * 3. 결제/환불 시스템
 * 4. 고객 보호 정책
 * 5. 개인정보 처리
 */

const fs = require('fs');
const path = require('path');

// 체크리스트
const requirements = {
  "필수 법적 페이지": {
    items: [
      { name: "이용약관", path: "components/pages/TermsPage.tsx", required: true },
      { name: "개인정보처리방침", path: "components/pages/PrivacyPage.tsx", required: true },
      { name: "전자금융거래 이용약관", path: "components/pages/LegalPage.tsx", required: true },
      { name: "취소/환불 정책", path: "components/pages/RefundPolicyPage.tsx", required: true }
    ]
  },
  "필수 API": {
    items: [
      { name: "결제 승인", path: "api/payments/confirm.js", required: true },
      { name: "결제 환불", path: "api/payments/refund.js", required: true },
      { name: "결제 내역 조회", path: "api/user/payments.js", required: true }
    ]
  },
  "고객 서비스": {
    items: [
      { name: "고객센터/문의", path: "components/ContactPage.tsx", required: true },
      { name: "Footer 사업자 정보", path: "components/Footer.tsx", required: true }
    ]
  },
  "결제 플로우": {
    items: [
      { name: "결제 페이지", path: "components/PaymentPage.tsx", required: true },
      { name: "결제 성공 페이지", path: "components/PaymentSuccessPage.tsx", required: true },
      { name: "결제 실패 페이지", path: "components/PaymentFailPage.tsx", required: true }
    ]
  }
};

console.log('🔍 Toss Payments 가맹점 심사 요구사항 검증 시작...\n');
console.log('='.repeat(100));

let totalItems = 0;
let passedItems = 0;
let failedItems = 0;

for (const [category, data] of Object.entries(requirements)) {
  console.log(`\n📋 ${category}`);
  console.log('-'.repeat(100));

  for (const item of data.items) {
    totalItems++;
    const fullPath = path.join(process.cwd(), item.path);
    const exists = fs.existsSync(fullPath);

    if (exists) {
      passedItems++;
      const stats = fs.statSync(fullPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`  ✅ ${item.name.padEnd(30)} ${item.path.padEnd(50)} (${sizeKB} KB)`);
    } else {
      failedItems++;
      console.log(`  ❌ ${item.name.padEnd(30)} ${item.path.padEnd(50)} [누락]`);
    }
  }
}

console.log('\n' + '='.repeat(100));

// 사업자 정보 확인
console.log('\n🏢 사업자 정보 확인');
console.log('-'.repeat(100));

const footerPath = path.join(process.cwd(), 'components/Footer.tsx');
if (fs.existsSync(footerPath)) {
  const footerContent = fs.readFileSync(footerPath, 'utf-8');

  const businessInfo = {
    "상호": "어썸플랜",
    "대표": "함은비",
    "사업자등록번호": "268-87-01436",
    "통신판매업": "2020-전남목포-0368",
    "전화번호": "0504-0811-1330",
    "이메일": "awesomeplan4606@naver.com"
  };

  for (const [key, value] of Object.entries(businessInfo)) {
    if (footerContent.includes(value)) {
      console.log(`  ✅ ${key}: ${value}`);
    } else {
      console.log(`  ❌ ${key}: ${value} [누락]`);
      failedItems++;
    }
  }
}

// 결제 정책 확인
console.log('\n💳 결제/환불 정책 확인');
console.log('-'.repeat(100));

const refundPolicyPath = path.join(process.cwd(), 'components/pages/RefundPolicyPage.tsx');
if (fs.existsSync(refundPolicyPath)) {
  const refundContent = fs.readFileSync(refundPolicyPath, 'utf-8');

  const policies = [
    { name: "청약철회 기간 (7일)", keyword: "7일" },
    { name: "전자상거래법 명시", keyword: "전자상거래" },
    { name: "배송비 정책", keyword: "배송비" },
    { name: "환불 절차", keyword: "환불" }
  ];

  for (const policy of policies) {
    if (refundContent.includes(policy.keyword)) {
      console.log(`  ✅ ${policy.name}`);
    } else {
      console.log(`  ⚠️  ${policy.name} [확인 필요]`);
    }
  }
}

// 개인정보 보호
console.log('\n🔒 개인정보 보호 정책 확인');
console.log('-'.repeat(100));

const privacyPath = path.join(process.cwd(), 'components/pages/PrivacyPage.tsx');
if (fs.existsSync(privacyPath)) {
  const privacyContent = fs.readFileSync(privacyPath, 'utf-8');

  const privacyItems = [
    { name: "개인정보 수집 항목", keyword: "수집" },
    { name: "개인정보 이용 목적", keyword: "목적" },
    { name: "개인정보 보유 기간", keyword: "보유" },
    { name: "개인정보 제3자 제공", keyword: "제3자" },
    { name: "개인정보보호책임자", keyword: "책임자" }
  ];

  for (const item of privacyItems) {
    if (privacyContent.includes(item.keyword)) {
      console.log(`  ✅ ${item.name}`);
    } else {
      console.log(`  ⚠️  ${item.name} [확인 필요]`);
    }
  }
}

// 최종 결과
console.log('\n' + '='.repeat(100));
console.log('\n📊 검증 결과 요약');
console.log('-'.repeat(100));
console.log(`  총 항목: ${totalItems}개`);
console.log(`  ✅ 통과: ${passedItems}개`);
console.log(`  ❌ 실패: ${failedItems}개`);
console.log(`  성공률: ${((passedItems / totalItems) * 100).toFixed(1)}%`);

if (failedItems === 0) {
  console.log('\n🎉 모든 필수 요구사항이 충족되었습니다!');
  console.log('   Toss Payments 가맹점 심사를 진행할 수 있습니다.\n');
} else {
  console.log('\n⚠️  일부 항목이 누락되었습니다.');
  console.log('   누락된 항목을 보완한 후 심사를 진행하세요.\n');
}

console.log('='.repeat(100));
console.log('\n💡 추가 확인사항:');
console.log('   1. 실제 테스트 결제가 정상적으로 작동하는지 확인');
console.log('   2. 환불 프로세스가 정상적으로 작동하는지 확인');
console.log('   3. 모든 법적 페이지가 Footer에 링크되어 있는지 확인');
console.log('   4. 상품 상세 페이지에 필수 정보(가격, 배송비 등)가 표시되는지 확인');
console.log('   5. 고객센터 연락처가 명확하게 표시되어 있는지 확인\n');

process.exit(failedItems > 0 ? 1 : 0);

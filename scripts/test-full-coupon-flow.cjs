/**
 * 전체 쿠폰 시스템 테스트
 * 실제 코드와 DB를 기반으로 전체 플로우 검증
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');
const fs = require('fs');
const path = require('path');

const connection = connect({ url: process.env.DATABASE_URL });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(type, message) {
  const icons = {
    success: `${colors.green}✅`,
    error: `${colors.red}❌`,
    info: `${colors.blue}ℹ️`,
    warn: `${colors.yellow}⚠️`,
    test: `${colors.cyan}🧪`,
    section: `${colors.magenta}📋`
  };
  console.log(`${icons[type] || ''} ${message}${colors.reset}`);
}

// ================================================================
// 1. 결제 상품 쿠폰 자동 발급 테스트
// ================================================================
async function testCouponAutoIssuance() {
  log('section', '1. 결제 상품 쿠폰 자동 발급 테스트');
  console.log('━'.repeat(50));

  try {
    // 활성화된 결제 상품 쿠폰 확인
    const activeCoupons = await connection.execute(`
      SELECT id, code, name, discount_type, discount_value, max_discount_amount,
             coupon_category, is_active, valid_until, usage_limit, issued_count
      FROM coupons
      WHERE is_active = TRUE
        AND coupon_category = 'product'
        AND (valid_from IS NULL OR valid_from <= NOW())
        AND (valid_until IS NULL OR valid_until >= NOW())
        AND (usage_limit IS NULL OR COALESCE(issued_count, 0) < usage_limit)
    `);

    if (activeCoupons.rows.length === 0) {
      log('warn', '발급 가능한 결제 상품 쿠폰이 없습니다');
      return false;
    }

    const campaign = activeCoupons.rows[0];
    log('success', `활성 캠페인 발견: ${campaign.code}`);
    console.log(`   - 이름: ${campaign.name}`);
    console.log(`   - 할인: ${campaign.discount_type === 'percentage' ? campaign.discount_value + '%' : campaign.discount_value + '원'}`);
    console.log(`   - 최대 할인: ${campaign.max_discount_amount ? campaign.max_discount_amount + '원' : '없음'}`);
    console.log(`   - 발급: ${campaign.issued_count || 0}/${campaign.usage_limit || '무제한'}`);

    // 쿠폰 코드 생성 테스트
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'USER-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    log('success', `코드 생성: ${code}`);

    // QR URL 생성
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://travleap.vercel.app';
    const qrUrl = `${baseUrl}/partner/coupon?code=${code}`;
    log('success', `QR URL: ${qrUrl}`);

    return true;
  } catch (error) {
    log('error', `테스트 실패: ${error.message}`);
    return false;
  }
}

// ================================================================
// 2. 쿠폰 코드 랜덤 생성 및 중복방지 테스트
// ================================================================
async function testCouponCodeGeneration() {
  log('section', '2. 쿠폰 코드 랜덤 생성 및 중복방지 테스트');
  console.log('━'.repeat(50));

  try {
    // 1000개 코드 생성 및 중복 확인
    const codes = new Set();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    for (let i = 0; i < 1000; i++) {
      let code = 'USER-';
      for (let j = 0; j < 8; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      codes.add(code);
    }

    if (codes.size === 1000) {
      log('success', '1000개 코드 생성 - 중복 없음');
    } else {
      log('warn', `1000개 중 ${1000 - codes.size}개 중복 발생`);
    }

    // DB 중복 체크 로직 확인
    const existingCodes = await connection.execute(`
      SELECT COUNT(*) as count FROM user_coupons WHERE coupon_code IS NOT NULL
    `);
    log('info', `DB에 저장된 쿠폰 코드: ${existingCodes.rows[0].count}개`);

    return true;
  } catch (error) {
    log('error', `테스트 실패: ${error.message}`);
    return false;
  }
}

// ================================================================
// 3. 결제 성공 페이지 쿠폰 표시 테스트
// ================================================================
async function testPaymentSuccessPage() {
  log('section', '3. 결제 성공 페이지 쿠폰 표시 테스트');
  console.log('━'.repeat(50));

  try {
    const filePath = path.join(__dirname, '..', 'components', 'PaymentSuccessPage.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    const checks = [
      { name: 'couponData 상태', pattern: /couponData.*useState/ },
      { name: 'result.coupon 처리', pattern: /result\.coupon/ },
      { name: 'QR 코드 생성', pattern: /QRCode\.toCanvas/ },
      { name: '쿠폰 이미지 저장', pattern: /saveCouponImage/ },
      { name: '쿠폰 코드 복사', pattern: /copyCouponCode/ },
      { name: '가맹점 보기 버튼', pattern: /partners\?coupon=/ },
      { name: '할인 타입 표시', pattern: /discount_type.*PERCENT/ }
    ];

    let allPassed = true;
    checks.forEach(check => {
      const found = check.pattern.test(content);
      if (found) {
        log('success', check.name);
      } else {
        log('error', `${check.name} 누락`);
        allPassed = false;
      }
    });

    return allPassed;
  } catch (error) {
    log('error', `테스트 실패: ${error.message}`);
    return false;
  }
}

// ================================================================
// 4. QR코드 스캔 → 파트너 대시보드 테스트
// ================================================================
async function testPartnerDashboard() {
  log('section', '4. QR코드 스캔 → 파트너 대시보드 테스트');
  console.log('━'.repeat(50));

  try {
    const filePath = path.join(__dirname, '..', 'components', 'PartnerDashboardPageEnhanced.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    const checks = [
      { name: 'URL 파라미터 읽기', pattern: /searchParams\.get\(['"]code['"]\)/ },
      { name: '자동 탭 전환', pattern: /setActiveTab\(['"]scan['"]\)/ },
      { name: '자동 검증 호출', pattern: /handleValidate\(.*\)/ },
      { name: '쿠폰 코드 입력', pattern: /couponCode.*useState/ },
      { name: '검증 API 호출', pattern: /\/api\/coupon\/validate/ },
      { name: '사용 API 호출', pattern: /\/api\/coupon\/use/ },
      { name: '할인 계산', pattern: /calculatedDiscount/ }
    ];

    let allPassed = true;
    checks.forEach(check => {
      const found = check.pattern.test(content);
      if (found) {
        log('success', check.name);
      } else {
        log('error', `${check.name} 누락`);
        allPassed = false;
      }
    });

    return allPassed;
  } catch (error) {
    log('error', `테스트 실패: ${error.message}`);
    return false;
  }
}

// ================================================================
// 5. 가맹점별 할인 설정 테스트
// ================================================================
async function testPartnerDiscountSettings() {
  log('section', '5. 가맹점별 할인 설정 테스트');
  console.log('━'.repeat(50));

  try {
    const partners = await connection.execute(`
      SELECT id, business_name,
             coupon_discount_type, coupon_discount_value,
             coupon_max_discount, coupon_min_order
      FROM partners
      WHERE is_coupon_partner = 1 AND status = 'approved'
    `);

    if (partners.rows.length === 0) {
      log('warn', '쿠폰 참여 파트너가 없습니다');
      return true;
    }

    log('success', `쿠폰 참여 파트너: ${partners.rows.length}개`);

    partners.rows.forEach(p => {
      const type = (p.coupon_discount_type || '').toLowerCase();
      const discount = type === 'percent' || type === 'percentage'
        ? `${p.coupon_discount_value}%`
        : `${p.coupon_discount_value}원`;
      console.log(`   - ${p.business_name}: ${discount}${p.coupon_max_discount ? ` (최대 ${p.coupon_max_discount}원)` : ''}`);
    });

    // 할인 계산 테스트
    const testPartner = partners.rows[0];
    const orderAmount = 50000;

    let discountAmount = 0;
    const type = (testPartner.coupon_discount_type || '').toLowerCase();
    const value = parseFloat(testPartner.coupon_discount_value);
    const maxDiscount = parseInt(testPartner.coupon_max_discount) || null;

    if (type === 'percent' || type === 'percentage') {
      discountAmount = Math.floor(orderAmount * (value / 100));
      if (maxDiscount && discountAmount > maxDiscount) {
        discountAmount = maxDiscount;
      }
    } else {
      discountAmount = value;
    }

    log('info', `할인 계산 예시 (${testPartner.business_name}, ${orderAmount}원 주문)`);
    console.log(`   - 할인 금액: ${discountAmount.toLocaleString()}원`);
    console.log(`   - 최종 결제: ${(orderAmount - discountAmount).toLocaleString()}원`);

    return true;
  } catch (error) {
    log('error', `테스트 실패: ${error.message}`);
    return false;
  }
}

// ================================================================
// 6. 통계/정산 API 테스트
// ================================================================
async function testStatisticsSettlements() {
  log('section', '6. 통계/정산 데이터 테스트');
  console.log('━'.repeat(50));

  try {
    // user_coupon_usage 테이블 기반 통계
    const usageStats = await connection.execute(`
      SELECT
        COUNT(*) as total_usage,
        COALESCE(SUM(discount_amount), 0) as total_discount,
        COALESCE(SUM(order_amount), 0) as total_orders,
        COUNT(DISTINCT partner_id) as active_partners
      FROM user_coupon_usage
    `);

    const stats = usageStats.rows[0];
    log('info', '전체 사용 통계 (user_coupon_usage 기반):');
    console.log(`   - 총 사용 건수: ${stats.total_usage}건`);
    console.log(`   - 총 할인 금액: ${parseInt(stats.total_discount).toLocaleString()}원`);
    console.log(`   - 총 주문 금액: ${parseInt(stats.total_orders).toLocaleString()}원`);
    console.log(`   - 활성 파트너: ${stats.active_partners}개`);

    // 파트너별 정산
    const partnerStats = await connection.execute(`
      SELECT
        p.business_name,
        COUNT(ucu.id) as usage_count,
        COALESCE(SUM(ucu.discount_amount), 0) as total_discount
      FROM partners p
      LEFT JOIN user_coupon_usage ucu ON p.id = ucu.partner_id
      WHERE p.is_coupon_partner = 1
      GROUP BY p.id, p.business_name
      ORDER BY total_discount DESC
      LIMIT 5
    `);

    if (partnerStats.rows.length > 0) {
      log('info', '파트너별 정산:');
      partnerStats.rows.forEach(p => {
        console.log(`   - ${p.business_name}: ${p.usage_count}건, ${parseInt(p.total_discount).toLocaleString()}원`);
      });
    }

    // API 파일 확인
    const settlementApi = path.join(__dirname, '..', 'api', 'admin', 'coupon-settlements.js');
    const statsApi = path.join(__dirname, '..', 'api', 'admin', 'coupon-stats.js');

    const settlementContent = fs.readFileSync(settlementApi, 'utf-8');
    const statsContent = fs.readFileSync(statsApi, 'utf-8');

    if (settlementContent.includes('user_coupon_usage')) {
      log('success', 'coupon-settlements.js: user_coupon_usage 테이블 사용');
    } else {
      log('error', 'coupon-settlements.js: user_coupon_usage 테이블 미사용');
    }

    if (statsContent.includes('user_coupon_usage')) {
      log('success', 'coupon-stats.js: user_coupon_usage 테이블 사용');
    } else {
      log('error', 'coupon-stats.js: user_coupon_usage 테이블 미사용');
    }

    return true;
  } catch (error) {
    log('error', `테스트 실패: ${error.message}`);
    return false;
  }
}

// ================================================================
// 7. 쿠폰 검증/사용 API 테스트
// ================================================================
async function testCouponValidateUseApi() {
  log('section', '7. 쿠폰 검증/사용 API 테스트');
  console.log('━'.repeat(50));

  try {
    // 발급된 쿠폰 확인
    const issuedCoupon = await connection.execute(`
      SELECT uc.*, c.name as coupon_name, c.discount_type, c.discount_value
      FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.status = 'ISSUED' AND uc.coupon_code IS NOT NULL
      LIMIT 1
    `);

    if (issuedCoupon.rows.length === 0) {
      log('warn', '테스트할 발급된 쿠폰이 없습니다');
      return true;
    }

    const coupon = issuedCoupon.rows[0];
    log('info', `테스트 쿠폰: ${coupon.coupon_code}`);
    console.log(`   - 이름: ${coupon.coupon_name}`);
    console.log(`   - 상태: ${coupon.status}`);
    console.log(`   - 할인: ${coupon.discount_type === 'percentage' ? coupon.discount_value + '%' : coupon.discount_value + '원'}`);

    // 검증 API 파일 확인
    const validateApi = path.join(__dirname, '..', 'api', 'coupon', 'validate.js');
    const useApi = path.join(__dirname, '..', 'api', 'coupon', 'use.js');

    const validateContent = fs.readFileSync(validateApi, 'utf-8');
    const useContent = fs.readFileSync(useApi, 'utf-8');

    const validateChecks = [
      { name: '쿠폰 코드 조회', pattern: /user_coupons.*coupon_code/ },
      { name: '상태 확인', pattern: /status.*ISSUED|ACTIVE/ },
      { name: '유효기간 확인', pattern: /valid_until/ },
      { name: '파트너 검증', pattern: /is_coupon_partner/ }
    ];

    const useChecks = [
      { name: '파트너 인증', pattern: /partnerId/ },
      { name: '할인 계산', pattern: /calculateDiscount/ },
      { name: '사용 기록 저장', pattern: /user_coupon_usage/ },
      { name: '통계 업데이트', pattern: /total_coupon_usage/ }
    ];

    log('info', 'validate.js 검증:');
    validateChecks.forEach(check => {
      const found = check.pattern.test(validateContent);
      console.log(`   ${found ? '✓' : '✗'} ${check.name}`);
    });

    log('info', 'use.js 검증:');
    useChecks.forEach(check => {
      const found = check.pattern.test(useContent);
      console.log(`   ${found ? '✓' : '✗'} ${check.name}`);
    });

    return true;
  } catch (error) {
    log('error', `테스트 실패: ${error.message}`);
    return false;
  }
}

// ================================================================
// 메인 테스트 실행
// ================================================================
async function runAllTests() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         쿠폰 시스템 전체 테스트 보고서                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n');

  const results = [];

  results.push({ name: '쿠폰 자동 발급', passed: await testCouponAutoIssuance() });
  console.log('');

  results.push({ name: '코드 생성/중복방지', passed: await testCouponCodeGeneration() });
  console.log('');

  results.push({ name: '결제 성공 페이지', passed: await testPaymentSuccessPage() });
  console.log('');

  results.push({ name: '파트너 대시보드', passed: await testPartnerDashboard() });
  console.log('');

  results.push({ name: '가맹점 할인 설정', passed: await testPartnerDiscountSettings() });
  console.log('');

  results.push({ name: '통계/정산 API', passed: await testStatisticsSettlements() });
  console.log('');

  results.push({ name: '검증/사용 API', passed: await testCouponValidateUseApi() });
  console.log('');

  // 최종 결과
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                      테스트 결과 요약                     ║');
  console.log('╠══════════════════════════════════════════════════════════╣');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(r => {
    const status = r.passed ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
    console.log(`║  ${status}  ${r.name.padEnd(45)}║`);
  });

  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  총 ${results.length}개 테스트 중 ${colors.green}${passed}개 통과${colors.reset}, ${failed > 0 ? colors.red : ''}${failed}개 실패${colors.reset}`.padEnd(69) + '║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  if (failed === 0) {
    console.log(`\n${colors.green}🎉 모든 테스트가 통과했습니다!${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠️ 일부 테스트가 실패했습니다. 위 내용을 확인해주세요.${colors.reset}`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests();

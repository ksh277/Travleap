/**
 * 쿠폰 발급 문제 진단 스크립트
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

async function diagnose() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              쿠폰 발급 문제 진단                                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. 활성화된 product 쿠폰 확인
    console.log('=== 1. 활성화된 product 쿠폰 조회 ===');
    const coupons = await connection.execute(`
      SELECT id, code, name, coupon_category, is_active,
             valid_from, valid_until, usage_limit, issued_count,
             max_issues_per_user, created_at
      FROM coupons
      WHERE is_active = TRUE
        AND (coupon_category = 'product' OR coupon_category IS NULL)
      ORDER BY created_at DESC
    `);

    if (coupons.rows.length === 0) {
      console.log('❌ 활성화된 product 쿠폰이 없습니다!');
      return;
    }

    console.log(`✅ ${coupons.rows.length}개의 쿠폰 발견:`);
    coupons.rows.forEach(c => {
      console.log(`  - id=${c.id}, code=${c.code}`);
      console.log(`    name: ${c.name}`);
      console.log(`    coupon_category: ${c.coupon_category}`);
      console.log(`    is_active: ${c.is_active}`);
      console.log(`    valid_from: ${c.valid_from}`);
      console.log(`    valid_until: ${c.valid_until}`);
      console.log(`    usage_limit: ${c.usage_limit}, issued_count: ${c.issued_count}`);
      console.log(`    max_issues_per_user: ${c.max_issues_per_user}`);
    });

    // 2. 현재 시간 기준 유효성 체크
    console.log('\n=== 2. 유효기간 체크 ===');
    const now = new Date();
    console.log(`현재 시간: ${now.toISOString()}`);

    const validCoupons = await connection.execute(`
      SELECT id, code, valid_from, valid_until
      FROM coupons
      WHERE is_active = TRUE
        AND (coupon_category = 'product' OR coupon_category IS NULL)
        AND (valid_from IS NULL OR valid_from <= NOW())
        AND (valid_until IS NULL OR valid_until >= NOW())
        AND (usage_limit IS NULL OR issued_count < usage_limit)
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (validCoupons.rows.length === 0) {
      console.log('❌ 유효한 쿠폰이 없습니다! (유효기간 또는 발급 한도 초과)');

      // 어떤 조건에서 실패했는지 확인
      for (const c of coupons.rows) {
        console.log(`\n  쿠폰 ${c.code} 분석:`);

        if (c.valid_from) {
          const validFrom = new Date(c.valid_from);
          if (validFrom > now) {
            console.log(`    ❌ valid_from (${c.valid_from})이 미래입니다!`);
          } else {
            console.log(`    ✅ valid_from OK`);
          }
        }

        if (c.valid_until) {
          const validUntil = new Date(c.valid_until);
          if (validUntil < now) {
            console.log(`    ❌ valid_until (${c.valid_until})이 과거입니다!`);
          } else {
            console.log(`    ✅ valid_until OK`);
          }
        }

        if (c.usage_limit && c.issued_count >= c.usage_limit) {
          console.log(`    ❌ 발급 한도 초과 (${c.issued_count}/${c.usage_limit})`);
        }
      }
    } else {
      console.log(`✅ 유효한 쿠폰 발견: ${validCoupons.rows[0].code}`);
    }

    // 3. user_coupons 테이블 상태 확인
    console.log('\n=== 3. user_coupons 테이블 확인 ===');
    const userCoupons = await connection.execute(`
      SELECT COUNT(*) as count FROM user_coupons
    `);
    console.log(`총 user_coupons 레코드: ${userCoupons.rows[0].count}개`);

    const recentUserCoupons = await connection.execute(`
      SELECT uc.*, c.code as campaign_code
      FROM user_coupons uc
      LEFT JOIN coupons c ON uc.coupon_id = c.id
      ORDER BY uc.created_at DESC
      LIMIT 5
    `);

    if (recentUserCoupons.rows.length > 0) {
      console.log('\n최근 발급된 쿠폰:');
      recentUserCoupons.rows.forEach(uc => {
        console.log(`  - id=${uc.id}, user_id=${uc.user_id}`);
        console.log(`    coupon_code: ${uc.coupon_code}`);
        console.log(`    campaign_code: ${uc.campaign_code}`);
        console.log(`    status: ${uc.status}`);
        console.log(`    issued_at: ${uc.issued_at}`);
      });
    } else {
      console.log('  (발급된 쿠폰 없음)');
    }

    // 4. 최근 결제 확인
    console.log('\n=== 4. 최근 결제 확인 ===');
    const recentPayments = await connection.execute(`
      SELECT id, user_id, payment_status, amount, gateway_transaction_id, created_at
      FROM payments
      WHERE payment_status = 'paid'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('최근 성공 결제:');
    recentPayments.rows.forEach(p => {
      console.log(`  - id=${p.id}, user_id=${p.user_id}`);
      console.log(`    order_id: ${p.gateway_transaction_id}`);
      console.log(`    amount: ${p.amount}원`);
      console.log(`    created_at: ${p.created_at}`);
    });

    // 5. 테스트용 직접 쿠폰 발급 시뮬레이션
    console.log('\n=== 5. 쿠폰 발급 시뮬레이션 ===');
    if (validCoupons.rows.length > 0 && recentPayments.rows.length > 0) {
      const campaign = validCoupons.rows[0];
      const payment = recentPayments.rows[0];

      // 이미 발급 여부 확인
      const existing = await connection.execute(`
        SELECT id FROM user_coupons
        WHERE user_id = ? AND coupon_id = ?
      `, [payment.user_id, campaign.id]);

      if (existing.rows.length > 0) {
        console.log(`ℹ️  user_id=${payment.user_id}는 이미 coupon_id=${campaign.id} 발급받음`);
      } else {
        console.log(`✅ user_id=${payment.user_id}에게 coupon_id=${campaign.id} 발급 가능!`);
        console.log(`   쿠폰 발급이 가능한데 왜 발급되지 않았는지 코드 흐름 확인 필요`);
      }
    }

    // 6. user_coupons 테이블 구조 확인
    console.log('\n=== 6. user_coupons 테이블 구조 확인 ===');
    const columns = await connection.execute(`
      SHOW COLUMNS FROM user_coupons
    `);
    console.log('user_coupons 컬럼:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `default=${col.Default}` : ''}`);
    });

  } catch (error) {
    console.error('❌ 진단 실패:', error.message);
    console.error(error);
  }
}

diagnose();

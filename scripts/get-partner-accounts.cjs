const { connect } = require('@planetscale/database');
require('dotenv').config();

async function getPartnerAccounts() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 파트너 계정 조회 (쿠폰 테스트용)
    const result = await connection.execute(`
      SELECT
        id,
        user_id,
        business_name,
        partner_email,
        status,
        is_coupon_partner,
        coupon_discount_type,
        coupon_discount_value,
        coupon_max_discount
      FROM partners
      WHERE status = 'approved'
      ORDER BY id DESC
      LIMIT 10
    `);

    console.log('=== 테스트용 파트너(가맹점) 계정 ===\n');

    if (result.rows.length === 0) {
      console.log('승인된 파트너가 없습니다.');
      return;
    }

    result.rows.forEach((partner, idx) => {
      console.log(`${idx + 1}. ${partner.business_name}`);
      console.log(`   - Partner ID: ${partner.id}`);
      console.log(`   - User ID: ${partner.user_id}`);
      console.log(`   - 이메일: ${partner.partner_email || '미설정'}`);
      console.log(`   - 쿠폰 참여: ${partner.is_coupon_partner ? 'ON' : 'OFF'}`);
      if (partner.is_coupon_partner) {
        console.log(`   - 할인: ${partner.coupon_discount_type === 'percent' ? partner.coupon_discount_value + '%' : partner.coupon_discount_value + '원'}`);
        if (partner.coupon_max_discount) {
          console.log(`   - 최대할인: ${partner.coupon_max_discount}원`);
        }
      }
      console.log('');
    });

  } catch (error) {
    console.error('오류:', error.message);
  }
}

getPartnerAccounts();

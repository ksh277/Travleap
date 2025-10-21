// 대시보드 통계 API 테스트 스크립트
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

async function testAdminStats() {
  console.log('🔍 대시보드 통계 테스트 시작...\n');

  try {
    const conn = connect(config);

    // 1. 전체 회원 수
    console.log('📊 회원 통계:');
    const usersResult = await conn.execute('SELECT COUNT(*) as count FROM users');
    console.log(`  - 전체 회원: ${usersResult.rows[0]?.count || 0}명`);

    const todayUsersResult = await conn.execute(
      'SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURDATE()'
    );
    console.log(`  - 오늘 가입: ${todayUsersResult.rows[0]?.count || 0}명\n`);

    // 2. 파트너 통계
    console.log('🤝 파트너 통계:');
    const partnersResult = await conn.execute('SELECT COUNT(*) as count FROM partners WHERE status = "approved"');
    console.log(`  - 승인된 파트너: ${partnersResult.rows[0]?.count || 0}개`);

    const pendingPartnersResult = await conn.execute('SELECT COUNT(*) as count FROM partner_applications WHERE status = "pending"');
    console.log(`  - 대기 중 신청: ${pendingPartnersResult.rows[0]?.count || 0}개\n`);

    // 3. 상품 통계
    console.log('📦 상품 통계:');
    const productsResult = await conn.execute('SELECT COUNT(*) as count FROM listings');
    console.log(`  - 전체 상품: ${productsResult.rows[0]?.count || 0}개`);

    const activeProductsResult = await conn.execute('SELECT COUNT(*) as count FROM listings WHERE is_active = 1');
    console.log(`  - 활성 상품: ${activeProductsResult.rows[0]?.count || 0}개\n`);

    // 4. 주문 통계
    console.log('🛒 주문 통계:');
    const ordersResult = await conn.execute('SELECT COUNT(*) as count FROM orders');
    console.log(`  - 전체 주문: ${ordersResult.rows[0]?.count || 0}건`);

    const todayOrdersResult = await conn.execute(
      'SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURDATE()'
    );
    console.log(`  - 오늘 주문: ${todayOrdersResult.rows[0]?.count || 0}건\n`);

    // 5. 매출 통계
    console.log('💰 매출 통계:');
    const revenueResult = await conn.execute(
      'SELECT COALESCE(SUM(total_amount), 0) as revenue FROM orders WHERE status = "completed"'
    );
    const revenue = Number(revenueResult.rows[0]?.revenue || 0);
    const commission = revenue * 0.1;
    console.log(`  - 총 매출: ₩${revenue.toLocaleString()}`);
    console.log(`  - 수수료: ₩${commission.toLocaleString()}\n`);

    // 6. 리뷰 통계
    console.log('⭐ 리뷰 통계:');
    const avgRatingResult = await conn.execute(
      'SELECT COALESCE(AVG(rating), 0) as avgRating, COUNT(*) as totalReviews FROM reviews WHERE is_verified = 1'
    );
    const avgRating = Number(avgRatingResult.rows[0]?.avgRating || 0);
    const totalReviews = Number(avgRatingResult.rows[0]?.totalReviews || 0);
    console.log(`  - 평균 평점: ${avgRating.toFixed(1)} / 5.0`);
    console.log(`  - 총 리뷰: ${totalReviews}개\n`);

    // 7. 시스템 상태
    console.log('⚙️  시스템 상태:');
    const refundsResult = await conn.execute(
      'SELECT COUNT(*) as count FROM orders WHERE status = "refund_requested"'
    );
    console.log(`  - 환불 대기: ${refundsResult.rows[0]?.count || 0}건`);

    const inquiriesResult = await conn.execute(
      'SELECT COUNT(*) as count FROM contacts WHERE status = "pending"'
    );
    console.log(`  - 고객 문의: ${inquiriesResult.rows[0]?.count || 0}건\n`);

    console.log('✅ 테스트 완료!');

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

testAdminStats();

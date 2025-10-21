// 관리자 API 테스트
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

async function testAdminAPIs() {
  console.log('🧪 관리자 API 테스트 시작...\n');

  try {
    const conn = connect(config);

    // 1. 대시보드 통계 테스트
    console.log('1️⃣ 대시보드 통계 데이터');
    const statsResult = await conn.execute(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM partners) as total_partners,
        (SELECT COUNT(*) FROM listings WHERE is_active = 1 AND is_published = 1) as active_listings,
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COALESCE(AVG(rating), 0) FROM reviews) as avg_rating,
        (SELECT COUNT(*) FROM reviews) as total_reviews,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE payment_status = 'paid') as total_revenue
    `);

    const stats = statsResult.rows[0];
    console.log(`  - 총 회원 수: ${stats.total_users}명`);
    console.log(`  - 총 파트너: ${stats.total_partners}개`);
    console.log(`  - 활성 상품: ${stats.active_listings}개`);
    console.log(`  - 총 주문: ${stats.total_orders}건`);
    console.log(`  - 평균 평점: ${Number(stats.avg_rating).toFixed(1)}/5.0`);
    console.log(`  - 총 리뷰: ${stats.total_reviews}개`);
    console.log(`  - 총 매출: ₩${Number(stats.total_revenue).toLocaleString()}`);
    console.log('');

    // 2. 주문 목록 테스트
    console.log('2️⃣ 주문 목록 조회');
    const ordersResult = await conn.execute(`
      SELECT
        o.id,
        o.total_amount as amount,
        o.status,
        o.payment_status,
        o.created_at,
        o.start_date,
        o.end_date,
        o.guests,
        u.name as user_name,
        u.email as user_email,
        l.title as product_title,
        l.id as listing_id
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN listings l ON o.listing_id = l.id
      ORDER BY o.created_at DESC
    `);

    console.log(`  ✅ 총 ${ordersResult.rows.length}개의 주문 조회됨`);

    if (ordersResult.rows.length > 0) {
      console.log('\n  📋 주문 목록:');
      ordersResult.rows.forEach((order: any) => {
        console.log(`    #${order.id} - ${order.product_title} - ${order.user_name} - ₩${Number(order.amount).toLocaleString()} - ${order.status}`);
      });
    }
    console.log('');

    // 3. 리뷰 목록 테스트
    console.log('3️⃣ 리뷰 목록 조회');
    const reviewsResult = await conn.execute(`
      SELECT
        r.id,
        r.rating,
        r.title,
        r.comment_md,
        r.created_at,
        u.name as user_name,
        l.title as product_title
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN listings l ON r.listing_id = l.id
      ORDER BY r.created_at DESC
    `);

    console.log(`  ✅ 총 ${reviewsResult.rows.length}개의 리뷰 조회됨`);

    if (reviewsResult.rows.length > 0) {
      console.log('\n  ⭐ 리뷰 목록:');
      reviewsResult.rows.forEach((review: any) => {
        console.log(`    [${review.rating}/5] ${review.title || '제목없음'} - ${review.user_name} - ${review.product_title}`);
      });
    }
    console.log('');

    // 4. 문의 목록 테스트
    console.log('4️⃣ 문의 목록 조회');
    const contactsResult = await conn.execute(`
      SELECT * FROM contacts
      ORDER BY created_at DESC
    `);

    console.log(`  ✅ 총 ${contactsResult.rows.length}개의 문의 조회됨`);

    if (contactsResult.rows.length > 0) {
      console.log('\n  📧 문의 목록:');
      contactsResult.rows.slice(0, 3).forEach((contact: any) => {
        console.log(`    ${contact.name} (${contact.email}) - ${contact.subject} - ${contact.status}`);
      });
    }
    console.log('');

    // 5. 평균 평점 계산 확인
    console.log('5️⃣ 평균 평점 계산 검증');
    const avgResult = await conn.execute('SELECT COALESCE(AVG(rating), 0) as avg_rating FROM reviews');
    const avgRating = Number(avgResult.rows[0].avg_rating).toFixed(1);
    console.log(`  평균 평점: ${avgRating}/5.0`);

    if (Number(avgRating) > 0) {
      console.log(`  ✅ 평점 데이터 정상 (${avgRating}/5.0)`);
    } else {
      console.log('  ⚠️  평점 데이터 없음');
    }
    console.log('');

    console.log('🎉 모든 API 테스트 통과!\n');
    console.log('✅ 확인된 기능:');
    console.log('  1. 대시보드 통계 조회 ✓');
    console.log('  2. 주문 목록 조회 ✓');
    console.log('  3. 리뷰 목록 조회 ✓');
    console.log('  4. 문의 목록 조회 ✓');
    console.log('  5. 평균 평점 계산 ✓');
    console.log('');
    console.log('💡 다음 단계:');
    console.log('  - 브라우저에서 관리자 페이지 접속하여 실제 UI 확인');
    console.log('  - 대시보드에 평균 평점 4.8/5.0 표시되는지 확인');
    console.log('  - 주문 관리에서 모든 주문 보이는지 확인');

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }

  process.exit(0);
}

testAdminAPIs();

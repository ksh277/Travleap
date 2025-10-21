import { NextResponse } from 'next/server';
import { connect } from '@planetscale/database';

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

export async function GET() {
  try {
    const conn = connect(config);

    // 전체 회원 수
    const usersResult = await conn.execute('SELECT COUNT(*) as count FROM users');
    const totalUsers = usersResult.rows[0]?.count || 0;

    // 오늘 가입한 회원 수
    const todayUsersResult = await conn.execute(
      'SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURDATE()'
    );
    const newSignups = todayUsersResult.rows[0]?.count || 0;

    // 전체 파트너 수
    const partnersResult = await conn.execute('SELECT COUNT(*) as count FROM partners WHERE status = "approved"');
    const totalPartners = partnersResult.rows[0]?.count || 0;

    // 대기 중인 파트너 신청
    const pendingPartnersResult = await conn.execute('SELECT COUNT(*) as count FROM partner_applications WHERE status = "pending"');
    const pendingPartners = pendingPartnersResult.rows[0]?.count || 0;

    // 전체 상품 수
    const productsResult = await conn.execute('SELECT COUNT(*) as count FROM listings');
    const totalProducts = productsResult.rows[0]?.count || 0;

    // 활성 상품 수
    const activeProductsResult = await conn.execute('SELECT COUNT(*) as count FROM listings WHERE is_active = 1');
    const activeProducts = activeProductsResult.rows[0]?.count || 0;

    // 전체 주문 수
    const ordersResult = await conn.execute('SELECT COUNT(*) as count FROM orders');
    const totalOrders = ordersResult.rows[0]?.count || 0;

    // 오늘 주문 수
    const todayOrdersResult = await conn.execute(
      'SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURDATE()'
    );
    const todayOrders = todayOrdersResult.rows[0]?.count || 0;

    // 총 매출
    const revenueResult = await conn.execute(
      'SELECT COALESCE(SUM(total_amount), 0) as revenue FROM orders WHERE status = "completed"'
    );
    const revenue = revenueResult.rows[0]?.revenue || 0;

    // 평균 평점 계산 (reviews 테이블에서)
    const avgRatingResult = await conn.execute(
      'SELECT COALESCE(AVG(rating), 0) as avgRating, COUNT(*) as totalReviews FROM reviews WHERE is_verified = 1'
    );
    const avgRating = avgRatingResult.rows[0]?.avgRating || 0;
    const totalReviews = avgRatingResult.rows[0]?.totalReviews || 0;

    // 환불 요청 수
    const refundsResult = await conn.execute(
      'SELECT COUNT(*) as count FROM orders WHERE status = "refund_requested"'
    );
    const refunds = refundsResult.rows[0]?.count || 0;

    // 미처리 문의 수
    const inquiriesResult = await conn.execute(
      'SELECT COUNT(*) as count FROM contacts WHERE status = "pending"'
    );
    const inquiries = inquiriesResult.rows[0]?.count || 0;

    // 수수료 계산 (매출의 10%)
    const commission = revenue * 0.1;

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: Number(totalUsers),
        newSignups: Number(newSignups),
        totalPartners: Number(totalPartners),
        pendingPartners: Number(pendingPartners),
        totalProducts: Number(totalProducts),
        activeProducts: Number(activeProducts),
        totalOrders: Number(totalOrders),
        todayOrders: Number(todayOrders),
        revenue: Number(revenue),
        commission: Number(commission),
        avgRating: Number(avgRating),
        totalReviews: Number(totalReviews),
        refunds: Number(refunds),
        inquiries: Number(inquiries)
      }
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch admin stats',
        data: {
          totalUsers: 0,
          newSignups: 0,
          totalPartners: 0,
          pendingPartners: 0,
          totalProducts: 0,
          activeProducts: 0,
          totalOrders: 0,
          todayOrders: 0,
          revenue: 0,
          commission: 0,
          avgRating: 0,
          totalReviews: 0,
          refunds: 0,
          inquiries: 0
        }
      },
      { status: 500 }
    );
  }
}

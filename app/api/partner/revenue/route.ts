import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@planetscale/database';

/**
 * GET /api/partner/revenue
 * 파트너의 최근 7일 매출 통계 (현재는 더미 데이터 반환)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({
      success: false,
      message: 'userId is required'
    }, { status: 400 });
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL! });

    // 1. user_id로 partner_id 찾기
    const partnerResult = await connection.execute(`
      SELECT id FROM partners WHERE user_id = ? LIMIT 1
    `, [userId]);

    const partner = partnerResult.rows[0] as any;

    if (!partner) {
      return NextResponse.json({
        success: false,
        message: 'Partner not found for this user'
      }, { status: 404 });
    }

    // 2. 최근 7일 매출 통계 조회
    // TODO: bookings 테이블이 생성되면 실제 쿼리로 변경
    const revenueResult = await connection.execute(`
      SELECT
        DATE(b.created_at) as date,
        SUM(b.total_amount) as revenue
      FROM bookings b
      INNER JOIN listings l ON b.listing_id = l.id
      WHERE l.partner_id = ?
        AND l.category_id = 1857
        AND b.status IN ('confirmed', 'completed')
        AND b.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(b.created_at)
      ORDER BY date DESC
    `, [partner.id]).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      data: revenueResult.rows || []
    });
  } catch (error) {
    console.error('GET /api/partner/revenue error:', error);
    return NextResponse.json({
      success: true,
      data: [] // 예약 테이블이 없을 경우 빈 배열 반환
    });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@planetscale/database';

/**
 * GET /api/partner/bookings
 * 파트너의 예약 목록 조회 (현재는 더미 데이터 반환)
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

    // 2. 파트너의 예약 목록 조회
    // TODO: bookings 테이블이 생성되면 실제 쿼리로 변경
    // 현재는 빈 배열 반환
    const bookingsResult = await connection.execute(`
      SELECT
        b.id,
        b.listing_id,
        l.title as room_name,
        b.customer_name,
        b.customer_phone,
        b.check_in_date,
        b.check_out_date,
        b.total_amount,
        b.status,
        b.created_at
      FROM bookings b
      INNER JOIN listings l ON b.listing_id = l.id
      WHERE l.partner_id = ? AND l.category_id = 1857
      ORDER BY b.created_at DESC
    `, [partner.id]).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      data: bookingsResult.rows || []
    });
  } catch (error) {
    console.error('GET /api/partner/bookings error:', error);
    return NextResponse.json({
      success: true,
      data: [] // 예약 테이블이 없을 경우 빈 배열 반환
    });
  }
}

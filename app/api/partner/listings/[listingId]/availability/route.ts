import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@planetscale/database';

/**
 * PATCH /api/partner/listings/[listingId]/availability
 * 객실 예약 가능 여부 토글
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { listingId: string } }
) {
  try {
    const body = await request.json();
    const { userId, is_active } = body;
    const listingId = params.listingId;

    if (!userId || !listingId || is_active === undefined) {
      return NextResponse.json({
        success: false,
        message: 'userId, listingId, and is_active are required'
      }, { status: 400 });
    }

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

    // 2. 해당 객실이 이 파트너 소유인지 확인 후 상태 업데이트
    const updateResult = await connection.execute(`
      UPDATE listings
      SET is_active = ?, updated_at = NOW()
      WHERE id = ? AND partner_id = ?
    `, [is_active ? 1 : 0, listingId, partner.id]);

    if (updateResult.rowsAffected === 0) {
      return NextResponse.json({
        success: false,
        message: 'Listing not found or access denied'
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      message: 'Listing availability updated successfully'
    });
  } catch (error) {
    console.error('PATCH /api/partner/listings/[listingId]/availability error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update listing availability',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

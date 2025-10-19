import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@planetscale/database';

/**
 * GET /api/partner/info
 * 파트너 정보 조회
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

    // 1. user_id로 partners 테이블에서 파트너 찾기
    const partnerResult = await connection.execute(`
      SELECT
        p.id,
        p.business_name,
        p.contact_name,
        p.email as contact_email,
        p.phone as contact_phone,
        p.address,
        p.is_verified,
        COUNT(DISTINCT l.id) as room_count
      FROM partners p
      LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = 1857 AND l.is_active = 1
      WHERE p.user_id = ?
      GROUP BY p.id, p.business_name, p.contact_name, p.email, p.phone, p.address, p.is_verified
      LIMIT 1
    `, [userId]);

    const partner = partnerResult.rows[0];

    if (!partner) {
      return NextResponse.json({
        success: false,
        message: 'Partner not found for this user'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: partner
    });
  } catch (error) {
    console.error('GET /api/partner/info error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch partner info',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/partner/info
 * 파트너 정보 수정
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, business_name, contact_name, contact_email, contact_phone, address } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'userId is required'
      }, { status: 400 });
    }

    const connection = connect({ url: process.env.DATABASE_URL! });

    // 1. user_id로 파트너 찾기
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

    // 2. 파트너 정보 업데이트
    await connection.execute(`
      UPDATE partners
      SET
        business_name = ?,
        contact_name = ?,
        email = ?,
        phone = ?,
        address = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      business_name,
      contact_name,
      contact_email,
      contact_phone,
      address,
      partner.id
    ]);

    return NextResponse.json({
      success: true,
      message: 'Partner info updated successfully'
    });
  } catch (error) {
    console.error('PUT /api/partner/info error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update partner info',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

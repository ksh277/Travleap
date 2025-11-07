import { NextResponse } from 'next/server';
import { connect } from '@planetscale/database';

export async function GET() {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    // 파트너 목록 조회 (숙박/렌트카 제외 - 별도 관리 탭에서 관리)
    const result = await connection.execute(`
      SELECT
        p.id, p.user_id, p.business_name, p.contact_name, p.email, p.phone, p.mobile_phone,
        p.business_address, p.location, p.services, p.base_price, p.base_price_text,
        p.detailed_address, p.description, p.business_hours,
        p.duration, p.min_age, p.max_capacity, p.language,
        p.tier, p.partner_type, p.is_verified, p.is_featured,
        p.is_active, p.status, p.lat, p.lng, p.images, p.created_at, p.updated_at
      FROM partners p
      WHERE (p.partner_type NOT IN ('lodging', 'rentcar') OR p.partner_type IS NULL)
      ORDER BY p.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      data: result.rows || []
    });
  } catch (error) {
    console.error('Error in partners GET API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch partners'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });
    const partnerData = await request.json();

    // 이미지 배열을 JSON 문자열로 변환
    const imagesJson = Array.isArray(partnerData.images)
      ? JSON.stringify(partnerData.images)
      : '[]';

    const result = await connection.execute(
      `INSERT INTO partners (
        user_id, business_name, contact_name, email, phone, mobile_phone,
        business_address, location, services, base_price, base_price_text,
        detailed_address, description, images, business_hours,
        duration, min_age, max_capacity, language,
        lat, lng,
        status, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 1, NOW(), NOW())`,
      [
        1, // user_id (관리자가 생성하므로 1)
        partnerData.business_name,
        partnerData.contact_name,
        partnerData.email,
        partnerData.phone || null,
        partnerData.mobile_phone || null,
        partnerData.business_address,
        partnerData.location,
        partnerData.services,
        partnerData.base_price || 0,
        partnerData.base_price_text || null,
        partnerData.detailed_address || '',
        partnerData.description || '',
        imagesJson,
        partnerData.business_hours || '',
        partnerData.duration || null,
        partnerData.min_age || null,
        partnerData.max_capacity || null,
        partnerData.language || null,
        partnerData.lat || null,
        partnerData.lng || null
      ]
    );

    return NextResponse.json(
      {
        success: true,
        data: { id: (result as any).insertId },
        message: '파트너가 성공적으로 생성되었습니다.'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in partners POST API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create partner'
      },
      { status: 500 }
    );
  }
}

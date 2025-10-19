import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@planetscale/database';

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
};

function parseJsonField(field: any): any {
  if (!field) return null;
  if (typeof field === 'object') return field;
  try {
    return JSON.parse(field);
  } catch {
    return null;
  }
}

/**
 * GET /api/accommodations/[partnerId]
 * 특정 호텔의 모든 객실 목록
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { partnerId: string } }
) {
  try {
    const partnerId = parseInt(params.partnerId);

    if (isNaN(partnerId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid partner ID' },
        { status: 400 }
      );
    }

    const connection = connect(config);

    // 파트너 정보 조회
    const partnerResult = await connection.execute(
      'SELECT * FROM partners WHERE id = ?',
      [partnerId]
    );

    if (partnerResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }

    const partner = partnerResult.rows[0];

    // 해당 파트너의 모든 객실 조회
    const rooms = await connection.execute(`
      SELECT
        l.id,
        l.title,
        l.short_description,
        l.description_md,
        l.images,
        l.price_from,
        l.price_to,
        l.location,
        l.amenities,
        l.highlights,
        l.available_spots,
        l.rating_avg,
        l.rating_count,
        l.is_featured,
        c.slug as category_slug,
        c.name_ko as category_name
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE l.partner_id = ?
        AND l.category_id = 1857
        AND l.is_published = 1
        AND l.is_active = 1
      ORDER BY l.price_from ASC
    `, [partnerId]);

    // JSON 필드 파싱
    const parsedRooms = rooms.rows.map((room: any) => ({
      id: room.id,
      title: room.title,
      short_description: room.short_description,
      description_md: room.description_md,
      images: parseJsonField(room.images) || [],
      price_from: room.price_from,
      price_to: room.price_to,
      location: room.location,
      amenities: parseJsonField(room.amenities) || [],
      highlights: parseJsonField(room.highlights) || [],
      available_spots: room.available_spots,
      rating_avg: room.rating_avg,
      rating_count: room.rating_count,
      is_featured: room.is_featured,
      category_slug: room.category_slug,
      category_name: room.category_name,
    }));

    return NextResponse.json({
      success: true,
      data: {
        partner: {
          id: partner.id,
          business_name: partner.business_name,
          contact_name: partner.contact_name,
          phone: partner.phone,
          email: partner.email,
          tier: partner.tier,
          is_verified: partner.is_verified,
        },
        rooms: parsedRooms,
        total_rooms: parsedRooms.length,
      },
    });

  } catch (error: any) {
    console.error('Error fetching hotel rooms:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

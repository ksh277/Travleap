import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@planetscale/database';

/**
 * GET /api/partner/listings
 * 파트너의 객실 목록 조회
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

    // 2. 파트너의 객실 목록 조회 (category_id = 1857은 숙박)
    const listingsResult = await connection.execute(`
      SELECT
        id,
        partner_id,
        title,
        short_description,
        description_md,
        price_from,
        price_to,
        images,
        amenities,
        highlights,
        available_spots,
        rating_avg,
        rating_count,
        is_featured,
        is_published,
        is_active,
        location,
        created_at
      FROM listings
      WHERE partner_id = ? AND category_id = 1857
      ORDER BY created_at DESC
    `, [partner.id]);

    return NextResponse.json({
      success: true,
      data: listingsResult.rows
    });
  } catch (error) {
    console.error('GET /api/partner/listings error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch listings',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/partner/listings
 * 새 객실 등록
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      title,
      short_description,
      description_md,
      price_from,
      price_to,
      is_published,
      is_active,
      image_urls,
      amenities,
      highlights,
      available_spots,
      location
    } = body;

    if (!userId || !title) {
      return NextResponse.json({
        success: false,
        message: 'userId and title are required'
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

    // 2. 객실 등록
    const imagesJson = JSON.stringify(image_urls || []);
    const amenitiesJson = typeof amenities === 'string' ? amenities : JSON.stringify(amenities || []);
    const highlightsJson = typeof highlights === 'string' ? highlights : JSON.stringify(highlights || []);

    await connection.execute(`
      INSERT INTO listings (
        partner_id,
        category_id,
        title,
        short_description,
        description_md,
        price_from,
        price_to,
        images,
        amenities,
        highlights,
        available_spots,
        rating_avg,
        rating_count,
        is_featured,
        is_published,
        is_active,
        location,
        created_at,
        updated_at
      ) VALUES (?, 1857, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, NOW(), NOW())
    `, [
      partner.id,
      title,
      short_description || '',
      description_md || '',
      price_from,
      price_to,
      imagesJson,
      amenitiesJson,
      highlightsJson,
      available_spots || 2,
      is_published ? 1 : 0,
      is_active ? 1 : 0,
      location
    ]);

    return NextResponse.json({
      success: true,
      message: 'Listing created successfully'
    });
  } catch (error) {
    console.error('POST /api/partner/listings error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create listing',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@planetscale/database';

/**
 * PUT /api/partner/listings/[listingId]
 * 객실 정보 수정
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { listingId: string } }
) {
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

    const listingId = params.listingId;

    if (!userId || !listingId) {
      return NextResponse.json({
        success: false,
        message: 'userId and listingId are required'
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

    // 2. 해당 객실이 이 파트너 소유인지 확인
    const listingCheckResult = await connection.execute(`
      SELECT id FROM listings WHERE id = ? AND partner_id = ? LIMIT 1
    `, [listingId, partner.id]);

    if (listingCheckResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Listing not found or access denied'
      }, { status: 403 });
    }

    // 3. 객실 정보 업데이트
    const imagesJson = JSON.stringify(image_urls || []);
    const amenitiesJson = typeof amenities === 'string' ? amenities : JSON.stringify(amenities || []);
    const highlightsJson = typeof highlights === 'string' ? highlights : JSON.stringify(highlights || []);

    await connection.execute(`
      UPDATE listings
      SET
        title = ?,
        short_description = ?,
        description_md = ?,
        price_from = ?,
        price_to = ?,
        images = ?,
        amenities = ?,
        highlights = ?,
        available_spots = ?,
        is_published = ?,
        is_active = ?,
        location = ?,
        updated_at = NOW()
      WHERE id = ? AND partner_id = ?
    `, [
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
      location,
      listingId,
      partner.id
    ]);

    return NextResponse.json({
      success: true,
      message: 'Listing updated successfully'
    });
  } catch (error) {
    console.error('PUT /api/partner/listings/[listingId] error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update listing',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/partner/listings/[listingId]
 * 객실 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { listingId: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const listingId = params.listingId;

    if (!userId || !listingId) {
      return NextResponse.json({
        success: false,
        message: 'userId and listingId are required'
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

    // 2. 해당 객실이 이 파트너 소유인지 확인 후 삭제
    const deleteResult = await connection.execute(`
      DELETE FROM listings
      WHERE id = ? AND partner_id = ?
    `, [listingId, partner.id]);

    if (deleteResult.rowsAffected === 0) {
      return NextResponse.json({
        success: false,
        message: 'Listing not found or access denied'
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      message: 'Listing deleted successfully'
    });
  } catch (error) {
    console.error('DELETE /api/partner/listings/[listingId] error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete listing',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

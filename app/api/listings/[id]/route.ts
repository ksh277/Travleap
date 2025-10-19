import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@planetscale/database';

// PlanetScale connection
const getDbConnection = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return connect({ url });
};

// GET /api/listings/[id] - 상품 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listingId = parseInt(params.id);

    if (isNaN(listingId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid listing ID' },
        { status: 400 }
      );
    }

    console.log(`📡 API /listings/${listingId} called`);

    const conn = getDbConnection();

    const sql = `
      SELECT l.*, c.slug as category_slug, c.name_ko as category_name,
             p.business_name, p.contact_name, p.email, p.phone, p.tier, p.is_verified
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      LEFT JOIN partners p ON l.partner_id = p.id
      WHERE l.id = ? AND l.is_published = 1 AND l.is_active = 1
    `;

    const result = await conn.execute(sql, [listingId]);
    const listing = result.rows[0];

    if (!listing) {
      console.log(`❌ Listing ${listingId} not found`);
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Found listing: ${listing.title}`);

    // JSON 파싱
    const parseJsonField = (field: any): any => {
      if (!field) return [];
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          return [];
        }
      }
      return field;
    };

    const parsedListing = {
      ...listing,
      images: parseJsonField(listing.images),
      amenities: parseJsonField(listing.amenities),
      highlights: parseJsonField(listing.highlights),
      included: parseJsonField(listing.included),
      excluded: parseJsonField(listing.excluded),
      tags: parseJsonField(listing.tags),
      partner: listing.business_name ? {
        business_name: listing.business_name,
        contact_name: listing.contact_name,
        email: listing.email,
        phone: listing.phone,
        tier: listing.tier,
        is_verified: listing.is_verified
      } : null
    };

    return NextResponse.json({
      success: true,
      data: parsedListing
    });
  } catch (error) {
    console.error(`❌ API /listings/[id] error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch listing',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

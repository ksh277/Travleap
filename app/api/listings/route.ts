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

// GET /api/listings - 상품 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // 필터 파라미터
    const category = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'popular';
    const search = searchParams.get('search') || '';
    const minPrice = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : undefined;
    const rating = searchParams.get('rating') ? parseFloat(searchParams.get('rating')!) : undefined;

    const offset = (page - 1) * limit;

    console.log('📡 API /listings called with:', { category, page, limit, sortBy, search });

    // 기본 쿼리
    let sql = `
      SELECT l.*, c.slug as category_slug, c.name_ko as category_name,
             p.business_name, p.tier, p.is_verified
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      LEFT JOIN partners p ON l.partner_id = p.id
      WHERE l.is_published = 1 AND l.is_active = 1
    `;
    const params: any[] = [];

    // 카테고리 필터
    if (category && category !== 'all') {
      sql += ' AND c.slug = ?';
      params.push(category);
    }

    // 가격 필터
    if (minPrice !== undefined) {
      sql += ' AND l.price_from >= ?';
      params.push(minPrice);
    }
    if (maxPrice !== undefined) {
      sql += ' AND l.price_from <= ?';
      params.push(maxPrice);
    }

    // 평점 필터
    if (rating !== undefined) {
      sql += ' AND l.rating_avg >= ?';
      params.push(rating);
    }

    // 검색 필터
    if (search) {
      sql += ' AND (l.title LIKE ? OR l.description_md LIKE ? OR l.location LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // 정렬
    switch (sortBy) {
      case 'price_low':
        sql += ' ORDER BY l.price_from ASC';
        break;
      case 'price_high':
        sql += ' ORDER BY l.price_from DESC';
        break;
      case 'rating':
        sql += ' ORDER BY l.rating_avg DESC, l.rating_count DESC';
        break;
      case 'newest':
        sql += ' ORDER BY l.created_at DESC';
        break;
      case 'popular':
      default:
        sql += ' ORDER BY l.view_count DESC, l.booking_count DESC, l.rating_avg DESC';
        break;
    }

    const conn = getDbConnection();

    // 1. 전체 개수 조회 (pagination용)
    const countSql = sql.replace(
      /SELECT l\.\*, c\.slug as category_slug, c\.name_ko as category_name,\s*p\.business_name, p\.tier, p\.is_verified/,
      'SELECT COUNT(*) as total'
    );
    const countResult = await conn.execute(countSql, params);
    const totalCount = countResult.rows[0]?.total || 0;

    console.log(`📊 Found ${totalCount} total listings for category: ${category}`);

    // 2. 실제 데이터 조회 (pagination 적용)
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await conn.execute(sql, params);
    const listings = result.rows || [];

    console.log(`✅ Returning ${listings.length} listings`);

    // 이미지 JSON 파싱 (안전하게)
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

    const parsedListings = listings.map((listing: any) => ({
      ...listing,
      images: parseJsonField(listing.images),
      amenities: parseJsonField(listing.amenities),
      highlights: parseJsonField(listing.highlights),
      included: parseJsonField(listing.included),
      excluded: parseJsonField(listing.excluded),
      tags: parseJsonField(listing.tags),
      partner: listing.business_name ? {
        business_name: listing.business_name,
        tier: listing.tier,
        is_verified: listing.is_verified
      } : null
    }));

    return NextResponse.json({
      success: true,
      data: parsedListings,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('❌ API /listings error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch listings',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        data: []
      },
      { status: 500 }
    );
  }
}

import { connect } from '@planetscale/database';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = connect({ url: process.env.DATABASE_URL });

    // 좌표가 있고 활성화된 상품만 가져오기 (팝업 제외)
    const result = await db.execute(`
      SELECT
        id,
        category,
        title,
        description_md,
        short_description,
        price_from,
        price_to,
        currency,
        images,
        lat,
        lng,
        location,
        address,
        duration,
        rating_avg,
        rating_count,
        view_count,
        booking_count,
        tags,
        highlights,
        amenities
      FROM listings
      WHERE is_published = 1
        AND is_active = 1
        AND lat IS NOT NULL
        AND lng IS NOT NULL
        AND category != '팝업'
        AND category IS NOT NULL
      ORDER BY
        CASE
          WHEN booking_count > 0 THEN booking_count * 1000
          ELSE 0
        END +
        CASE
          WHEN view_count > 0 THEN view_count * 10
          ELSE 0
        END +
        CASE
          WHEN rating_avg > 0 THEN rating_avg * 100
          ELSE 0
        END DESC,
        created_at DESC
      LIMIT 100
    `);

    // 인기도 점수 계산
    const listings = result.rows.map(listing => {
      const popularityScore =
        (listing.booking_count || 0) * 1000 +
        (listing.view_count || 0) * 10 +
        (listing.rating_avg || 0) * 100;

      return {
        ...listing,
        popularityScore,
        // JSON 문자열 파싱
        images: typeof listing.images === 'string' ? JSON.parse(listing.images) : listing.images,
        tags: typeof listing.tags === 'string' ? JSON.parse(listing.tags) : listing.tags,
        highlights: typeof listing.highlights === 'string' ? JSON.parse(listing.highlights) : listing.highlights,
        amenities: typeof listing.amenities === 'string' ? JSON.parse(listing.amenities) : listing.amenities,
      };
    });

    console.log(`✅ Found ${listings.length} listings with coordinates (excluding 팝업)`);

    // 카테고리별 통계
    const stats = listings.reduce((acc, l) => {
      acc[l.category] = (acc[l.category] || 0) + 1;
      return acc;
    }, {});
    console.log('📊 Categories:', stats);

    return res.status(200).json({
      success: true,
      count: listings.length,
      listings,
      stats
    });

  } catch (error) {
    console.error('❌ Error fetching listings with coordinates:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

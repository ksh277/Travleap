const { connect } = require('@planetscale/database');

/**
 * 숙박 상세 정보 조회 API (listing ID 기준)
 * GET /api/accommodations/[id]
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // URL에서 ID 추출
    const urlParts = req.url.split('/');
    const id = urlParts[urlParts.length - 1].split('?')[0];

    if (!id || id === 'accommodations') {
      return res.status(400).json({
        success: false,
        error: 'Listing ID is required'
      });
    }

    // 숙박 카테고리 ID 조회
    const categoryResult = await connection.execute(
      `SELECT id FROM categories WHERE slug = 'stay' LIMIT 1`
    );

    const categoryId = categoryResult.rows?.[0]?.id;

    if (!categoryId) {
      return res.status(404).json({
        success: false,
        error: '숙박 카테고리를 찾을 수 없습니다.'
      });
    }

    // 숙박 상품 정보 조회
    const listingResult = await connection.execute(
      `SELECT
        l.*,
        p.business_name,
        p.contact_name,
        p.phone,
        p.email,
        p.logo_url,
        p.tier,
        p.status as partner_status
      FROM listings l
      LEFT JOIN partners p ON l.partner_id = p.id
      WHERE l.id = ? AND l.category_id = ?
      LIMIT 1`,
      [id, categoryId]
    );

    if (!listingResult.rows || listingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '숙박 상품을 찾을 수 없습니다.'
      });
    }

    const listing = listingResult.rows[0];

    // JSON 필드 파싱
    let images = [];
    let amenities = [];
    let highlights = [];

    try {
      if (listing.images) {
        images = typeof listing.images === 'string'
          ? JSON.parse(listing.images)
          : listing.images;
      }
    } catch (e) {
      console.error('Failed to parse images:', e);
    }

    try {
      if (listing.amenities) {
        amenities = typeof listing.amenities === 'string'
          ? JSON.parse(listing.amenities)
          : listing.amenities;
      }
    } catch (e) {
      console.error('Failed to parse amenities:', e);
    }

    try {
      if (listing.highlights) {
        highlights = typeof listing.highlights === 'string'
          ? JSON.parse(listing.highlights)
          : listing.highlights;
      }
    } catch (e) {
      console.error('Failed to parse highlights:', e);
    }

    // 응답 데이터 구성
    const response = {
      id: listing.id,
      title: listing.title,
      short_description: listing.short_description,
      description_md: listing.description_md,
      category: 'stay',
      category_id: listing.category_id,
      partner_id: listing.partner_id,
      location: listing.location,
      address: listing.address,
      price_from: listing.price_from,
      images: Array.isArray(images) ? images : [],
      amenities: Array.isArray(amenities) ? amenities : [],
      highlights: Array.isArray(highlights) ? highlights : [],
      is_active: listing.is_active,
      is_published: listing.is_published,
      rating: listing.rating || 0,
      review_count: listing.review_count || 0,
      partner: {
        business_name: listing.business_name,
        contact_name: listing.contact_name,
        phone: listing.phone,
        email: listing.email,
        logo_url: listing.logo_url,
        tier: listing.tier,
        is_verified: listing.partner_status === 'approved'
      }
    };

    return res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('❌ [숙박 상세 조회 오류]:', error);
    return res.status(500).json({
      success: false,
      error: '숙박 상품 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

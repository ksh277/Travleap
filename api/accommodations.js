const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    // Get stay category ID
    const categoryResult = await connection.execute(`
      SELECT id FROM categories WHERE slug = 'stay' LIMIT 1
    `);

    const categoryId = categoryResult.rows?.[0]?.id || 1857;

    const hotelsResult = await connection.execute(`
      SELECT
        p.id as partner_id,
        p.business_name,
        p.contact_name,
        p.phone,
        p.email,
        p.tier,
        p.status,
        p.is_featured,
        COUNT(DISTINCT l.id) as room_count,
        MIN(l.price_from) as min_price,
        MAX(l.price_from) as max_price,
        (SELECT images FROM listings WHERE partner_id = p.id AND category_id = ? AND is_published = 1 AND is_active = 1 LIMIT 1) as sample_images,
        GROUP_CONCAT(DISTINCT l.location SEPARATOR ', ') as locations,
        (
          SELECT AVG(r.rating)
          FROM reviews r
          INNER JOIN listings l2 ON r.listing_id = l2.id
          WHERE l2.partner_id = p.id AND r.is_hidden = 0
        ) as avg_rating,
        (
          SELECT COUNT(*)
          FROM reviews r
          INNER JOIN listings l2 ON r.listing_id = l2.id
          WHERE l2.partner_id = p.id AND r.is_hidden = 0
        ) as total_reviews
      FROM partners p
      LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = ? AND l.is_published = 1 AND l.is_active = 1
      WHERE p.is_active = 1 AND p.partner_type = 'lodging'
      GROUP BY p.id, p.business_name, p.contact_name, p.phone, p.email, p.tier, p.status, p.is_featured
      HAVING room_count > 0
      ORDER BY p.status = 'approved' DESC, p.is_featured DESC, avg_rating DESC
    `, [categoryId, categoryId]);

    const hotels = hotelsResult.rows || [];
    const parsedHotels = hotels.map((hotel) => {
      let images = [];
      try {
        if (hotel.sample_images) {
          const parsed = JSON.parse(hotel.sample_images);
          images = Array.isArray(parsed) ? parsed : [];
        }
      } catch (e) {
        // JSON 파싱 실패시 빈 배열
      }

      return {
        partner_id: hotel.partner_id,
        business_name: hotel.business_name,
        contact_name: hotel.contact_name,
        phone: hotel.phone,
        email: hotel.email,
        tier: hotel.tier,
        is_verified: hotel.status === 'approved',
        status: hotel.status,
        is_featured: hotel.is_featured,
        room_count: hotel.room_count,
        min_price: hotel.min_price,
        max_price: hotel.max_price,
        images: images,
        locations: hotel.locations,
        avg_rating: hotel.avg_rating ? parseFloat(hotel.avg_rating).toFixed(1) : '0.0',
        total_reviews: hotel.total_reviews || 0,
      };
    });

    return res.status(200).json({
      success: true,
      data: parsedHotels,
      total: parsedHotels.length,
    });
  } catch (error) {
    console.error('Error fetching accommodations:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

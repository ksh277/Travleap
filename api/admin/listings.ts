const { connect } = require('@planetscale/database');

// PlanetScale connection using DATABASE_URL
const getDbConnection = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return connect({ url });
};

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const conn = getDbConnection();

    // 관리자용 모든 상품 조회 (활성/비활성 모두 포함)
    const sql = `
      SELECT
        l.*,
        c.name_ko as category_name,
        c.slug as category_slug
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      ORDER BY l.created_at DESC
    `;

    const result = await conn.execute(sql);
    const listings = result.rows || [];

    // Parse JSON fields
    const parseJsonField = (field) => {
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

    const parsedListings = listings.map((listing) => ({
      ...listing,
      images: parseJsonField(listing.images),
      amenities: parseJsonField(listing.amenities),
      highlights: parseJsonField(listing.highlights),
      included: parseJsonField(listing.included),
      excluded: parseJsonField(listing.excluded),
      tags: parseJsonField(listing.tags)
    }));

    res.status(200).json({
      success: true,
      data: parsedListings
    });
  } catch (error) {
    console.error('API /admin/listings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin listings',
      errorMessage: error.message || 'Unknown error',
      data: []
    });
  }
};

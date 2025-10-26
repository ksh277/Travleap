module.exports = async function handler(req, res) {
  const { connect } = require('@planetscale/database');

  // PlanetScale connection using DATABASE_URL
  const getDbConnection = () => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    return connect({ url });
  };
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get listing ID from URL path
    const { id } = req.query;
    const listingId = parseInt(id);

    if (!listingId || isNaN(listingId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid listing ID'
      });
    }

    const conn = getDbConnection();

    // Query single listing with category information
    const sql = `
      SELECT l.*, c.slug, c.name_ko
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE l.id = ? AND l.is_published = 1 AND l.is_active = 1
      LIMIT 1
    `;

    const result = await conn.execute(sql, [listingId]);
    const listings = result || [];

    if (listings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found',
        data: null
      });
    }

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

    const listing = listings[0];
    const parsedListing = {
      ...listing,
      images: parseJsonField(listing.images),
      amenities: parseJsonField(listing.amenities),
      highlights: parseJsonField(listing.highlights),
      included: parseJsonField(listing.included),
      excluded: parseJsonField(listing.excluded),
      tags: parseJsonField(listing.tags)
    };

    res.status(200).json({
      success: true,
      data: parsedListing
    });
  } catch (error) {
    console.error('API /listings/[id] error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch listing',
      errorMessage: error.message || 'Unknown error',
      data: null
    });
  }
};

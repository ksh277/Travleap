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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const conn = getDbConnection();

    // 승인된 파트너만 조회 (pending, rejected 제외)
    const sql = `
      SELECT
        p.id,
        p.business_name,
        p.contact_name,
        p.email,
        p.phone,
        p.business_number,
        p.website,
        p.instagram,
        p.address,
        p.description,
        p.services,
        p.tier,
        p.is_verified,
        p.is_featured,
        p.status,
        p.lat,
        p.lng,
        p.created_at,
        p.updated_at
      FROM partners p
      WHERE p.status NOT IN ('pending', 'rejected')
      ORDER BY p.is_featured DESC, p.tier DESC, p.created_at DESC
    `;

    const result = await conn.execute(sql);
    const partners = result.rows || [];

    // Parse JSON fields if needed
    const parseJsonField = (field) => {
      if (!field) return [];
      if (typeof field === 'string') {
        try {
          return JSON.parse(field);
        } catch {
          // JSON 파싱 실패 시, 쉼표로 구분된 문자열인지 확인
          return field.split(',').map(s => s.trim()).filter(s => s);
        }
      }
      return field;
    };

    const parsedPartners = partners.map((partner) => ({
      ...partner,
      services: parseJsonField(partner.services)
    }));

    console.log('📊 Parsed partners count:', parsedPartners.length);
    console.log('📋 First partner sample:', parsedPartners[0]);

    res.status(200).json({
      success: true,
      data: parsedPartners
    });
  } catch (error) {
    console.error('API /partners error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch partners',
      errorMessage: error.message || 'Unknown error',
      data: []
    });
  }
};

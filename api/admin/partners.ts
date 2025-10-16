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

  const conn = getDbConnection();

  // POST - Create new partner
  if (req.method === 'POST') {
    try {
      const partnerData = req.body;

      const sql = `
        INSERT INTO partners (
          business_name, contact_name, email, phone, business_number,
          website, instagram, description, services, tier,
          is_verified, is_featured, status, lat, lng,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const result = await conn.execute(sql, [
        partnerData.business_name || '',
        partnerData.contact_name || '',
        partnerData.email || '',
        partnerData.phone || '',
        partnerData.business_number || '',
        partnerData.website || '',
        partnerData.instagram || '',
        partnerData.description || '',
        partnerData.services || '',
        partnerData.tier || 'bronze',
        partnerData.is_verified || false,
        partnerData.is_featured || false,
        partnerData.status || 'pending',
        partnerData.lat || null,
        partnerData.lng || null
      ]);

      res.status(201).json({
        success: true,
        data: { id: result.insertId, ...partnerData },
        message: '파트너가 생성되었습니다.'
      });
    } catch (error) {
      console.error('API POST /admin/partners error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create partner',
        errorMessage: error.message || 'Unknown error'
      });
    }
    return;
  }

  // GET - List partners
  if (req.method === 'GET') {
    try {
      // Query parameters for filtering
      const { status, tier, business_name, page = '1', limit = '20' } = req.query;

    let sql = `
      SELECT p.*, u.name as user_name, u.email as user_email
      FROM partners p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Apply filters
    if (status) {
      const statuses = status.split(',');
      sql += ` AND p.status IN (${statuses.map(() => '?').join(',')})`;
      params.push(...statuses);
    }

    if (tier) {
      const tiers = tier.split(',');
      sql += ` AND p.tier IN (${tiers.map(() => '?').join(',')})`;
      params.push(...tiers);
    }

    if (business_name) {
      sql += ' AND p.business_name LIKE ?';
      params.push(`%${business_name}%`);
    }

    sql += ' ORDER BY p.created_at DESC';

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const result = await conn.execute(sql, params);
    const partners = result.rows || [];

    res.status(200).json({
      success: true,
      data: partners,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: partners.length,
        total_pages: Math.ceil(partners.length / limitNum)
      }
    });
  } catch (error) {
    console.error('API /admin/partners error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch partners',
      errorMessage: error.message || 'Unknown error',
      data: [],
      pagination: { page: 1, limit: 20, total: 0, total_pages: 0 }
    });
  }
};

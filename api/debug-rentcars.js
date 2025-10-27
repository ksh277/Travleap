const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    const vendors = await connection.execute(`
      SELECT
        v.id as vendor_id,
        v.vendor_code,
        v.business_name,
        v.brand_name,
        v.average_rating,
        v.is_verified,
        v.images as vendor_images
      FROM rentcar_vendors v
      WHERE v.status = 'active'
      LIMIT 1
    `);

    return res.status(200).json({
      success: true,
      debug: {
        vendorsType: typeof vendors,
        vendorsIsArray: Array.isArray(vendors),
        vendorsKeys: vendors ? Object.keys(vendors) : null,
        vendorsConstructor: vendors ? vendors.constructor.name : null,
        rawVendors: vendors,
        firstItem: vendors && vendors[0] ? vendors[0] : null,
        rowsProperty: vendors && vendors.rows ? vendors.rows : null
      }
    });

  } catch (error) {
    console.error('[Debug Rentcars] ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
};

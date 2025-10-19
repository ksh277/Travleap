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

    const vendors = await connection.execute(`
      SELECT
        v.id as vendor_id,
        v.vendor_code,
        v.business_name,
        v.brand_name,
        v.average_rating,
        v.is_verified,
        COUNT(rv.id) as vehicle_count,
        MIN(rv.daily_rate_krw) as min_price,
        MAX(rv.daily_rate_krw) as max_price,
        MIN(rv.images) as sample_images,
        GROUP_CONCAT(DISTINCT rv.vehicle_class SEPARATOR ', ') as vehicle_classes
      FROM rentcar_vendors v
      LEFT JOIN rentcar_vehicles rv ON v.id = rv.vendor_id AND rv.is_active = 1
      WHERE v.status = 'active'
      GROUP BY v.id, v.vendor_code, v.business_name, v.brand_name, v.average_rating, v.is_verified
      ORDER BY v.is_verified DESC, v.business_name ASC
    `);

    const parsedVendors = vendors.rows.map((vendor) => {
      let images = [];
      try {
        if (vendor.sample_images) {
          const parsed = JSON.parse(vendor.sample_images);
          images = Array.isArray(parsed) ? parsed : [];
        }
      } catch (e) {
        // JSON 파싱 실패시 빈 배열
      }

      return {
        vendor_id: vendor.vendor_id,
        vendor_code: vendor.vendor_code,
        vendor_name: vendor.business_name || vendor.brand_name || vendor.vendor_code,
        business_name: vendor.business_name,
        brand_name: vendor.brand_name,
        average_rating: vendor.average_rating ? parseFloat(vendor.average_rating).toFixed(1) : '0.0',
        is_verified: vendor.is_verified,
        vehicle_count: vendor.vehicle_count,
        min_price: vendor.min_price,
        max_price: vendor.max_price,
        images: images,
        vehicle_classes: vendor.vehicle_classes,
      };
    });

    return res.status(200).json({
      success: true,
      data: parsedVendors,
      total: parsedVendors.length,
    });
  } catch (error) {
    console.error('Error fetching rentcar vendors:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

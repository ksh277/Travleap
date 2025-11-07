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

    const result = await connection.execute(`
      SELECT
        v.id as vendor_id,
        v.vendor_code,
        v.business_name,
        v.brand_name,
        v.average_rating,
        v.is_verified,
        v.images as vendor_images,
        COUNT(rv.id) as vehicle_count,
        MIN(rv.daily_rate_krw) as min_price,
        MAX(rv.daily_rate_krw) as max_price,
        MIN(rv.images) as sample_vehicle_images,
        GROUP_CONCAT(DISTINCT rv.vehicle_class SEPARATOR ', ') as vehicle_classes
      FROM rentcar_vendors v
      LEFT JOIN rentcar_vehicles rv ON v.id = rv.vendor_id AND rv.is_active = 1
      WHERE v.status = 'active'
      GROUP BY v.id, v.vendor_code, v.business_name, v.brand_name, v.average_rating, v.is_verified, v.images
      ORDER BY v.is_verified DESC, v.business_name ASC
    `);

    const vendors = result.rows || [];
    const parsedVendors = vendors.map((vendor) => {
      let images = [];

      // 1. vendor의 images 우선 사용
      try {
        if (vendor.vendor_images) {
          const parsed = typeof vendor.vendor_images === 'string'
            ? JSON.parse(vendor.vendor_images)
            : vendor.vendor_images;
          if (Array.isArray(parsed) && parsed.length > 0) {
            images = parsed;
          }
        }
      } catch (e) {
        // JSON 파싱 실패시 무시
      }

      // 2. vendor images가 없으면 차량 이미지 fallback
      if (images.length === 0 && vendor.sample_vehicle_images) {
        try {
          const parsed = typeof vendor.sample_vehicle_images === 'string'
            ? JSON.parse(vendor.sample_vehicle_images)
            : vendor.sample_vehicle_images;
          images = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          // JSON 파싱 실패시 빈 배열
        }
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

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    if (req.method === 'GET') {
      // status=active인 업체만 조회
      // total_vehicles는 stock 합계로 계산 (실제 보유 차량 대수)
      const vendors = await connection.execute(`
        SELECT
          v.*,
          COALESCE(vehicle_counts.total_stock, 0) as total_vehicles,
          COALESCE(vehicle_counts.vehicle_types, 0) as vehicle_types,
          COALESCE(booking_counts.total, 0) as total_bookings,
          COALESCE(booking_counts.confirmed, 0) as confirmed_bookings
        FROM rentcar_vendors v
        LEFT JOIN (
          SELECT vendor_id,
            COALESCE(SUM(stock), 0) as total_stock,
            COUNT(*) as vehicle_types
          FROM rentcar_vehicles
          WHERE is_active = 1
          GROUP BY vendor_id
        ) vehicle_counts ON v.id = vehicle_counts.vendor_id
        LEFT JOIN (
          SELECT vendor_id,
            COUNT(*) as total,
            SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed
          FROM rentcar_bookings
          WHERE status NOT IN ('cancelled', 'deleted', 'failed')
            AND payment_status = 'paid'
          GROUP BY vendor_id
        ) booking_counts ON v.id = booking_counts.vendor_id
        WHERE v.status = 'active'
        ORDER BY v.created_at DESC
      `);

      return res.status(200).json({
        success: true,
        data: vendors.rows || []
      });
    }

    if (req.method === 'POST') {
      const {
        vendor_code,
        business_name,
        brand_name,
        business_number,
        contact_name,
        contact_email,
        contact_phone,
        description,
        logo_url,
        pms_provider,
        pms_api_key,
        pms_property_id
      } = req.body;

      const result = await connection.execute(`
        INSERT INTO rentcar_vendors (
          vendor_code, business_name, brand_name, business_number,
          contact_name, contact_email, contact_phone, description, logo_url,
          pms_provider, pms_api_key, pms_property_id,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `, [
        vendor_code,
        business_name,
        brand_name || null,
        business_number || null,
        contact_name,
        contact_email,
        contact_phone,
        description || null,
        logo_url || null,
        pms_provider || null,
        pms_api_key || null,
        pms_property_id || null
      ]);

      return res.status(200).json({
        success: true,
        data: { id: result.insertId },
        message: '벤더가 성공적으로 등록되었습니다.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('Vendors API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

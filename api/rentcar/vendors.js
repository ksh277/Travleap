/**
 * 렌트카 벤더 API
 * GET /api/rentcar/vendors - 벤더 목록 조회
 * POST /api/rentcar/vendors - 벤더 생성
 */

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
    // GET - 벤더 목록 조회
    if (req.method === 'GET') {
      const vendors = await connection.execute(`
        SELECT
          v.*,
          COALESCE(vehicle_counts.total, 0) as total_vehicles,
          COALESCE(vehicle_counts.active, 0) as active_vehicles,
          COALESCE(booking_counts.total, 0) as total_bookings,
          COALESCE(booking_counts.confirmed, 0) as confirmed_bookings,
          COALESCE(review_stats.avg_rating, 0) as average_rating,
          COALESCE(review_stats.review_count, 0) as review_count
        FROM rentcar_vendors v
        LEFT JOIN (
          SELECT vendor_id,
            COUNT(*) as total,
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
          FROM rentcar_vehicles
          GROUP BY vendor_id
        ) vehicle_counts ON v.id = vehicle_counts.vendor_id
        LEFT JOIN (
          SELECT vendor_id,
            COUNT(*) as total,
            SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed
          FROM rentcar_bookings
          GROUP BY vendor_id
        ) booking_counts ON v.id = booking_counts.vendor_id
        LEFT JOIN (
          SELECT rentcar_vendor_id,
            AVG(rating) as avg_rating,
            COUNT(*) as review_count
          FROM reviews
          WHERE review_type = 'rentcar' AND rentcar_vendor_id IS NOT NULL
          GROUP BY rentcar_vendor_id
        ) review_stats ON v.id = review_stats.rentcar_vendor_id
        ORDER BY v.created_at DESC
      `);

      return res.status(200).json({
        success: true,
        data: vendors.rows || []
      });
    }

    // POST - 벤더 생성
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
        commission_rate
      } = req.body;

      const result = await connection.execute(`
        INSERT INTO rentcar_vendors (
          vendor_code, business_name, brand_name, business_number,
          contact_name, contact_email, contact_phone, description, logo_url,
          commission_rate, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
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
        commission_rate || 10.00
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

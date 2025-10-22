/**
 * 숙박 예약 관리 API
 * GET /api/admin/accommodation-bookings - 모든 예약 조회
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const result = await connection.execute(
      `SELECT
        b.*,
        v.business_name as vendor_name,
        r.room_name,
        u.name as customer_name
       FROM bookings b
       LEFT JOIN accommodation_vendors v ON b.accommodation_vendor_id = v.id
       LEFT JOIN accommodation_rooms r ON b.room_id = r.id
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.accommodation_vendor_id IS NOT NULL
       ORDER BY b.created_at DESC`
    );

    return res.status(200).json({
      success: true,
      data: result.rows || []
    });
  } catch (error) {
    console.error('Bookings API error:', error);
    return res.status(200).json({
      success: true,
      data: []
    });
  }
};
